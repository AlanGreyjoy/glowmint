use serde::{Deserialize, Serialize};

use super::fan_curve::FanCurve;
use super::lcd::LcdContent;
use super::rgb::{LightingState, RgbColor};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub lcd: Option<LcdContent>,
    pub pump_preset: Option<String>,
    pub fan_curve: Option<FanCurve>,
    pub rgb_zones: Vec<ZoneColor>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneColor {
    pub device_index: usize,
    pub zone_index: usize,
    pub color: RgbColor,
    pub lighting: Option<LightingState>,
}

impl Profile {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            lcd: None,
            pump_preset: None,
            fan_curve: None,
            rgb_zones: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
