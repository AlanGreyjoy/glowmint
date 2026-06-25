use std::io::BufReader;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use async_trait::async_trait;
use hidapi::{HidApi, HidDevice};
use image::codecs::gif::GifDecoder;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{AnimationDecoder, DynamicImage};

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::lcd::{LcdContent, LcdStatus, LCD_SIZE};
use crate::domain::traits::LcdController;
use crate::drivers::corsair_lcd::protocol::{
    encode_packet, MAX_PACKET_LEN, OPCODE_IMAGE, PACKET_PAYLOAD_LEN,
};

pub const CORSAIR_VID: u16 = 0x1b1c;
pub const LCD_PID_ELITE: u16 = 0x0c39;
pub const LCD_PID_ALT: u16 = 0x0c33;
/// Static images must be re-sent periodically; firmware reverts to stats when streaming stops.
const STATIC_REFRESH_INTERVAL: Duration = Duration::from_millis(500);
/// While idle, re-check device presence on this cadence so `status()` stays fresh
/// without enumerating USB on every poll.
const IDLE_PROBE_INTERVAL: Duration = Duration::from_secs(3);
/// Upper bound on decoded GIF frames to cap memory and upload latency.
const MAX_GIF_FRAMES: usize = 300;

/// Commands sent to the long-lived display worker thread. A new command preempts
/// whatever is currently playing, so there is never more than one render loop.
enum LcdCommand {
    ShowStatic(Vec<u8>),
    PlayGif {
        frames: Vec<Vec<u8>>,
        frame_delay: Duration,
        looping: bool,
    },
    Stop,
    Shutdown,
}

pub struct CorsairLcdDriver {
    vendor_id: u16,
    product_ids: Vec<u16>,
    state: Mutex<LcdDriverState>,
    looping: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    tx: Sender<LcdCommand>,
    worker: Option<JoinHandle<()>>,
}

struct LcdDriverState {
    brightness: u8,
    current_content: Option<LcdContent>,
}

impl CorsairLcdDriver {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel();
        let looping = Arc::new(AtomicBool::new(false));
        let connected = Arc::new(AtomicBool::new(false));
        let product_ids = vec![LCD_PID_ELITE, LCD_PID_ALT];

        let worker = thread::Builder::new()
            .name("glowmint-lcd".to_string())
            .spawn({
                let looping = Arc::clone(&looping);
                let connected = Arc::clone(&connected);
                let product_ids = product_ids.clone();
                move || display_worker_loop(rx, looping, connected, CORSAIR_VID, product_ids)
            })
            .ok();

        Self {
            vendor_id: CORSAIR_VID,
            product_ids,
            state: Mutex::new(LcdDriverState {
                brightness: 100,
                current_content: None,
            }),
            looping,
            connected,
            tx,
            worker,
        }
    }

    fn send_command(&self, command: LcdCommand) -> Result<()> {
        self.tx
            .send(command)
            .map_err(|_| GlowmintError::LcdError("LCD display worker is not running".to_string()))
    }

    fn encode_jpeg(img: &DynamicImage, filter: FilterType) -> Result<Vec<u8>> {
        let resized = img.resize_exact(LCD_SIZE, LCD_SIZE, filter);
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

    /// Decode and JPEG-encode every GIF frame once, up front. Frames are streamed from the
    /// decoder one at a time (instead of collecting all raw RGBA frames into memory) and a
    /// cheaper resize filter is used since this runs per frame.
    fn decode_gif_frames(path: &str) -> Result<Vec<Vec<u8>>> {
        let file = BufReader::new(std::fs::File::open(path)?);
        let decoder = GifDecoder::new(file)
            .map_err(|e| GlowmintError::LcdError(format!("GIF decode failed: {e}")))?;

        let mut jpegs = Vec::new();
        for frame in decoder.into_frames().take(MAX_GIF_FRAMES) {
            let frame =
                frame.map_err(|e| GlowmintError::LcdError(format!("GIF frame error: {e}")))?;
            let img = DynamicImage::ImageRgba8(frame.into_buffer());
            jpegs.push(Self::encode_jpeg(&img, FilterType::Triangle)?);
        }

        if jpegs.is_empty() {
            return Err(GlowmintError::LcdError("GIF has no frames".to_string()));
        }
        Ok(jpegs)
    }
}

fn frame_delay_for_fps(fps: u32) -> Duration {
    Duration::from_millis((1000 / fps.max(1)).max(1) as u64)
}

/// Owns the HID handle and the reusable packet buffer for the worker thread.
struct DisplayWorker {
    vendor_id: u16,
    product_ids: Vec<u16>,
    api: Option<HidApi>,
    device: Option<HidDevice>,
    connected: Arc<AtomicBool>,
    packet_buf: [u8; MAX_PACKET_LEN],
}

impl DisplayWorker {
    /// Open the LCD once and keep the handle; only reopen after a failure or disconnect.
    fn ensure_device(&mut self) -> Result<()> {
        if self.device.is_some() {
            return Ok(());
        }
        if self.api.is_none() {
            self.api = Some(HidApi::new().map_err(|e| GlowmintError::LcdError(e.to_string()))?);
        }
        let api = self.api.as_ref().unwrap();
        let mut opened = None;
        for &pid in &self.product_ids {
            if let Ok(device) = api.open(self.vendor_id, pid) {
                opened = Some(device);
                break;
            }
        }
        if opened.is_none() {
            return Err(GlowmintError::LcdError(
                "Corsair Elite LCD not found (expected 1b1c:0c39 or 1b1c:0c33)".to_string(),
            ));
        }
        self.device = opened;
        Ok(())
    }

    fn send(&mut self, jpeg: &[u8]) {
        if let Err(e) = self.ensure_device() {
            eprintln!("LCD connect error: {e}");
            self.connected.store(false, Ordering::Relaxed);
            return;
        }
        match write_image(self.device.as_ref().unwrap(), &mut self.packet_buf, jpeg) {
            Ok(()) => self.connected.store(true, Ordering::Relaxed),
            Err(e) => {
                eprintln!("LCD frame send error: {e}");
                // Drop the handle so the next send reopens a fresh one.
                self.device = None;
                self.connected.store(false, Ordering::Relaxed);
            }
        }
    }

    fn refresh_connection(&mut self) {
        let ok = self.ensure_device().is_ok();
        self.connected.store(ok, Ordering::Relaxed);
    }
}

/// Send one full image (JPEG) over HID by chunking it into packets, reusing `buf`.
fn write_image(device: &HidDevice, buf: &mut [u8], jpeg: &[u8]) -> Result<()> {
    let mut part_num: u16 = 0;
    let mut offset = 0;
    while offset < jpeg.len() {
        let end = (offset + PACKET_PAYLOAD_LEN).min(jpeg.len());
        let is_end = end == jpeg.len();
        encode_packet(buf, OPCODE_IMAGE, part_num, is_end, &jpeg[offset..end]);
        device
            .write(buf)
            .map_err(|e| GlowmintError::LcdError(format!("HID write failed: {e}")))?;
        offset = end;
        part_num = part_num.saturating_add(1);
    }
    Ok(())
}

/// Schedule the next frame deadline. When on time this is drift-free (`prev + interval`);
/// when we have fallen behind, pace from now instead of bursting to catch up.
fn schedule_next(prev_deadline: Instant, interval: Duration) -> Instant {
    let target = prev_deadline + interval;
    let now = Instant::now();
    if target > now {
        target
    } else {
        now + interval
    }
}

/// What the worker is currently rendering. Frame pacing uses `Instant` deadlines so the
/// time spent sending a frame is subtracted from the inter-frame delay.
enum Job {
    Idle,
    Static {
        jpeg: Vec<u8>,
        next: Instant,
    },
    Gif {
        frames: Vec<Vec<u8>>,
        frame_delay: Duration,
        looping: bool,
        idx: usize,
        next: Instant,
    },
}

impl Job {
    fn next_deadline(&self) -> Option<Instant> {
        match self {
            Job::Idle => None,
            Job::Static { next, .. } | Job::Gif { next, .. } => Some(*next),
        }
    }
}

fn display_worker_loop(
    rx: Receiver<LcdCommand>,
    looping: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    vendor_id: u16,
    product_ids: Vec<u16>,
) {
    let mut worker = DisplayWorker {
        vendor_id,
        product_ids,
        api: None,
        device: None,
        connected,
        packet_buf: [0u8; MAX_PACKET_LEN],
    };
    // Report presence immediately rather than waiting for the first command.
    worker.refresh_connection();

    let mut job = Job::Idle;

    loop {
        let wait = match job.next_deadline() {
            Some(deadline) => deadline.saturating_duration_since(Instant::now()),
            None => IDLE_PROBE_INTERVAL,
        };

        match rx.recv_timeout(wait) {
            Ok(LcdCommand::Shutdown) => break,
            Ok(LcdCommand::Stop) => {
                job = Job::Idle;
                looping.store(false, Ordering::Relaxed);
            }
            Ok(LcdCommand::ShowStatic(jpeg)) => {
                looping.store(true, Ordering::Relaxed);
                worker.send(&jpeg);
                job = Job::Static {
                    jpeg,
                    next: Instant::now() + STATIC_REFRESH_INTERVAL,
                };
            }
            Ok(LcdCommand::PlayGif {
                frames,
                frame_delay,
                looping: should_loop,
            }) => {
                if frames.is_empty() {
                    job = Job::Idle;
                    looping.store(false, Ordering::Relaxed);
                } else {
                    looping.store(should_loop, Ordering::Relaxed);
                    worker.send(&frames[0]);
                    job = Job::Gif {
                        frames,
                        frame_delay,
                        looping: should_loop,
                        idx: 1,
                        next: Instant::now() + frame_delay,
                    };
                }
            }
            Err(RecvTimeoutError::Disconnected) => break,
            Err(RecvTimeoutError::Timeout) => {
                let mut finished = false;
                match &mut job {
                    Job::Idle => worker.refresh_connection(),
                    Job::Static { jpeg, next } => {
                        worker.send(jpeg);
                        *next = schedule_next(*next, STATIC_REFRESH_INTERVAL);
                    }
                    Job::Gif {
                        frames,
                        frame_delay,
                        looping: should_loop,
                        idx,
                        next,
                    } => {
                        if *idx >= frames.len() {
                            *idx = 0;
                        }
                        worker.send(&frames[*idx]);
                        *idx += 1;
                        if *idx >= frames.len() && !*should_loop {
                            finished = true;
                        } else {
                            *next = schedule_next(*next, *frame_delay);
                        }
                    }
                }
                if finished {
                    job = Job::Idle;
                    looping.store(false, Ordering::Relaxed);
                }
            }
        }
    }
}

/// Small JPEG data URL for the LCD editor preview (the WebView cannot load arbitrary paths
/// without asset scope). The source image — often a multi-MB GIF — is downscaled to the panel
/// size and re-encoded, so only tens of KB cross the IPC boundary instead of the whole file.
/// Animated GIFs preview as their first-frame thumbnail (the LCD itself still animates).
/// This decodes/encodes synchronously and is expected to run on a blocking thread.
pub fn lcd_file_preview_data_url(path: &str) -> Result<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let ext = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();
    if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
        return Err(GlowmintError::InvalidInput(
            "unsupported preview format (use png, jpg, webp, or gif)".to_string(),
        ));
    }

    let img = CorsairLcdDriver::load_image(path)?;
    // Match how the frame is actually rendered on the panel for an accurate preview.
    let jpeg = CorsairLcdDriver::encode_jpeg(&img, FilterType::Triangle)?;
    Ok(format!("data:image/jpeg;base64,{}", STANDARD.encode(&jpeg)))
}

impl Default for CorsairLcdDriver {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for CorsairLcdDriver {
    fn drop(&mut self) {
        let _ = self.tx.send(LcdCommand::Shutdown);
        if let Some(handle) = self.worker.take() {
            let _ = handle.join();
        }
    }
}

#[async_trait]
impl LcdController for CorsairLcdDriver {
    async fn status(&self) -> Result<LcdStatus> {
        let state = self
            .state
            .lock()
            .map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        Ok(LcdStatus {
            connected: self.connected.load(Ordering::Relaxed),
            vendor_id: self.vendor_id,
            product_id: self.product_ids[0],
            brightness: state.brightness,
            current_content: state.current_content.clone(),
            looping: self.looping.load(Ordering::Relaxed),
        })
    }

    async fn set_image(&self, path: &str) -> Result<()> {
        let path_owned = path.to_string();
        // Decode + resize + JPEG-encode is CPU heavy; keep it off the async runtime.
        let jpeg = tokio::task::spawn_blocking(move || {
            let img = Self::load_image(&path_owned)?;
            Self::encode_jpeg(&img, FilterType::Lanczos3)
        })
        .await
        .map_err(|e| GlowmintError::LcdError(format!("image task failed: {e}")))??;

        {
            let mut state = self
                .state
                .lock()
                .map_err(|e| GlowmintError::LcdError(e.to_string()))?;
            state.current_content = Some(LcdContent::Static {
                path: path.to_string(),
            });
        }
        self.send_command(LcdCommand::ShowStatic(jpeg))
    }

    async fn set_gif(&self, path: &str, fps: u32, r#loop: bool) -> Result<()> {
        let path_owned = path.to_string();
        let frames = tokio::task::spawn_blocking(move || Self::decode_gif_frames(&path_owned))
            .await
            .map_err(|e| GlowmintError::LcdError(format!("gif task failed: {e}")))??;

        {
            let mut state = self
                .state
                .lock()
                .map_err(|e| GlowmintError::LcdError(e.to_string()))?;
            state.current_content = Some(LcdContent::Gif {
                path: path.to_string(),
                fps,
            });
        }
        self.send_command(LcdCommand::PlayGif {
            frames,
            frame_delay: frame_delay_for_fps(fps),
            looping: r#loop,
        })
    }

    async fn set_brightness(&self, brightness: u8) -> Result<()> {
        let mut state = self
            .state
            .lock()
            .map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        state.brightness = brightness.min(100);
        Ok(())
    }

    async fn stop_gif(&self) -> Result<()> {
        self.send_command(LcdCommand::Stop)?;
        let mut state = self
            .state
            .lock()
            .map_err(|e| GlowmintError::LcdError(e.to_string()))?;
        state.current_content = None;
        Ok(())
    }
}
