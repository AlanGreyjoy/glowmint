use std::io::BufReader;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use async_trait::async_trait;
use hidapi::HidApi;
use image::codecs::gif::GifDecoder;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{AnimationDecoder, DynamicImage};

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::lcd::{LcdContent, LcdStatus, LCD_SIZE};
use crate::domain::traits::LcdController;
use crate::drivers::corsair_lcd::protocol::{make_commands, OPCODE_IMAGE, MAX_PACKET_LEN};

pub const CORSAIR_VID: u16 = 0x1b1c;
pub const LCD_PID_ELITE: u16 = 0x0c39;
pub const LCD_PID_ALT: u16 = 0x0c33;

pub struct CorsairLcdDriver {
    vendor_id: u16,
    product_ids: Vec<u16>,
    state: Mutex<LcdDriverState>,
    looping: Arc<AtomicBool>,
    gif_stop: Arc<AtomicBool>,
}

struct LcdDriverState {
    brightness: u8,
    current_content: Option<LcdContent>,
}

impl CorsairLcdDriver {
    pub fn new() -> Self {
        Self {
            vendor_id: CORSAIR_VID,
            product_ids: vec![LCD_PID_ELITE, LCD_PID_ALT],
            state: Mutex::new(LcdDriverState {
                brightness: 100,
                current_content: None,
            }),
            looping: Arc::new(AtomicBool::new(false)),
            gif_stop: Arc::new(AtomicBool::new(false)),
        }
    }

    fn find_device(api: &HidApi) -> Result<hidapi::HidDevice> {
        for pid in [LCD_PID_ELITE, LCD_PID_ALT] {
            match api.open(CORSAIR_VID, pid) {
                Ok(device) => return Ok(device),
                Err(_) => continue,
            }
        }
        Err(GlowmintError::LcdError(
            "Corsair Elite LCD not found (expected 1b1c:0c39 or 1b1c:0c33)".to_string(),
        ))
    }

    fn encode_jpeg(img: &DynamicImage) -> Result<Vec<u8>> {
        let resized = img.resize_exact(LCD_SIZE, LCD_SIZE, FilterType::Lanczos3);
        let rgb = resized.to_rgb8();
        let mut buf = Vec::new();
        let mut encoder = JpegEncoder::new_with_quality(&mut buf, 85);
        encoder
            .encode(&rgb, LCD_SIZE, LCD_SIZE, image::ExtendedColorType::Rgb8)
            .map_err(|e| GlowmintError::LcdError(format!("JPEG encode failed: {e}")))?;
        Ok(buf)
    }

    fn load_image(path: &str) -> Result<DynamicImage> {
        let path = Path::new(path);
        if !path.exists() {
            return Err(GlowmintError::InvalidInput(format!(
                "file not found: {}",
                path.display()
            )));
        }
        image::open(path).map_err(|e| GlowmintError::LcdError(format!("failed to open image: {e}")))
    }

    fn send_jpeg(jpeg: &[u8]) -> Result<()> {
        let api = HidApi::new().map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        let device = Self::find_device(&api)?;
        let commands = make_commands(jpeg, OPCODE_IMAGE, MAX_PACKET_LEN);
        for command in commands {
            let bytes = command.to_bytes();
            device
                .write(&bytes)
                .map_err(|e| GlowmintError::LcdError(format!("HID write failed: {e}")))?;
        }
        Ok(())
    }

    fn decode_gif_frames(path: &str) -> Result<Vec<Vec<u8>>> {
        let file = BufReader::new(std::fs::File::open(path)?);
        let decoder = GifDecoder::new(file)
            .map_err(|e| GlowmintError::LcdError(format!("GIF decode failed: {e}")))?;
        let frames = decoder
            .into_frames()
            .collect_frames()
            .map_err(|e| GlowmintError::LcdError(format!("GIF frame error: {e}")))?;
        let mut jpegs = Vec::new();
        for frame in frames {
            let img = DynamicImage::ImageRgba8(frame.into_buffer());
            jpegs.push(Self::encode_jpeg(&img)?);
        }
        if jpegs.is_empty() {
            return Err(GlowmintError::LcdError("GIF has no frames".to_string()));
        }
        Ok(jpegs)
    }

    fn spawn_gif_loop(&self, frames: Vec<Vec<u8>>, fps: u32, r#loop: bool) {
        self.gif_stop.store(false, Ordering::SeqCst);
        self.looping.store(r#loop, Ordering::SeqCst);
        let stop = Arc::clone(&self.gif_stop);
        let delay = Duration::from_millis((1000 / fps.max(1)) as u64);

        thread::spawn(move || {
            loop {
                for frame in &frames {
                    if stop.load(Ordering::SeqCst) {
                        return;
                    }
                    if let Err(e) = Self::send_jpeg(frame) {
                        eprintln!("LCD GIF frame error: {e}");
                    }
                    thread::sleep(delay);
                }
                if !r#loop || stop.load(Ordering::SeqCst) {
                    break;
                }
            }
        });
    }
}

impl Default for CorsairLcdDriver {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl LcdController for CorsairLcdDriver {
    async fn status(&self) -> Result<LcdStatus> {
        let connected = HidApi::new()
            .ok()
            .and_then(|api| Self::find_device(&api).ok())
            .is_some();
        let state = self.state.lock().map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        Ok(LcdStatus {
            connected,
            vendor_id: self.vendor_id,
            product_id: self.product_ids[0],
            brightness: state.brightness,
            current_content: state.current_content.clone(),
            looping: self.looping.load(Ordering::SeqCst),
        })
    }

    async fn set_image(&self, path: &str) -> Result<()> {
        self.gif_stop.store(true, Ordering::SeqCst);
        let img = Self::load_image(path)?;
        let jpeg = Self::encode_jpeg(&img)?;
        Self::send_jpeg(&jpeg)?;
        let mut state = self.state.lock().map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        state.current_content = Some(LcdContent::Static {
            path: path.to_string(),
        });
        Ok(())
    }

    async fn set_gif(&self, path: &str, fps: u32, r#loop: bool) -> Result<()> {
        self.gif_stop.store(true, Ordering::SeqCst);
        thread::sleep(Duration::from_millis(50));
        let frames = Self::decode_gif_frames(path)?;
        {
            let mut state = self.state.lock().map_err(|e| GlowmintError::LcdError(e.to_string()))?;
            state.current_content = Some(LcdContent::Gif {
                path: path.to_string(),
                fps,
            });
        }
        self.spawn_gif_loop(frames, fps, r#loop);
        Ok(())
    }

    async fn set_brightness(&self, brightness: u8) -> Result<()> {
        let mut state = self.state.lock().map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        state.brightness = brightness.min(100);
        Ok(())
    }

    async fn stop_gif(&self) -> Result<()> {
        self.gif_stop.store(true, Ordering::SeqCst);
        self.looping.store(false, Ordering::SeqCst);
        Ok(())
    }
}
