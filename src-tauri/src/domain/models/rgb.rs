use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl RgbColor {
    pub fn new(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b }
    }

    pub fn to_hex(&self) -> String {
        format!("#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbZone {
    pub index: usize,
    pub name: String,
    pub led_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbDevice {
    pub index: usize,
    pub name: String,
    pub zones: Vec<RgbZone>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LightingMode {
    Static,
    Breathing,
    Rainbow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingState {
    pub color: RgbColor,
    pub mode: LightingMode,
    pub brightness: u8,
}
