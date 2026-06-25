use serde::{Deserialize, Serialize};

pub const LCD_SIZE: u32 = 480;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LcdContent {
    Static { path: String },
    Gif { path: String, fps: u32 },
    SystemStats { interval_secs: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LcdStatus {
    pub connected: bool,
    pub vendor_id: u16,
    pub product_id: u16,
    pub brightness: u8,
    pub current_content: Option<LcdContent>,
    pub looping: bool,
}

impl Default for LcdStatus {
    fn default() -> Self {
        Self {
            connected: false,
            vendor_id: 0x1b1c,
            product_id: 0x0c39,
            brightness: 100,
            current_content: None,
            looping: false,
        }
    }
}
