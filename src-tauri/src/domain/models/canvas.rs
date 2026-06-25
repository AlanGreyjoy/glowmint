use serde::{Deserialize, Serialize};

use super::rgb::{LightingMode, RgbColor};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CanvasDeviceSource {
    OpenRgb,
    Peripheral,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CanvasDeviceType {
    Fan,
    Ram,
    Aio,
    Gpu,
    Keyboard,
    Mouse,
    Controller,
    Strip,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasDeviceLayout {
    pub device_key: String,
    pub source: CanvasDeviceSource,
    pub display_name: String,
    pub device_type: CanvasDeviceType,
    pub x: f64,
    pub y: f64,
    pub color: RgbColor,
    pub lighting_mode: Option<LightingMode>,
    pub zone_index: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasLayout {
    pub devices: Vec<CanvasDeviceLayout>,
}

impl Default for CanvasLayout {
    fn default() -> Self {
        Self {
            devices: Vec::new(),
        }
    }
}
