use serde::{Deserialize, Serialize};

use crate::domain::error::{GlowmintError, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FanCurvePoint {
    pub temperature_c: f32,
    pub duty_percent: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FanCurve {
    pub points: Vec<FanCurvePoint>,
}

impl FanCurve {
    pub fn validate(&self) -> Result<()> {
        if self.points.len() < 2 || self.points.len() > 7 {
            return Err(GlowmintError::InvalidInput(
                "fan curve must have 2-7 points".to_string(),
            ));
        }
        for point in &self.points {
            if point.duty_percent > 100 {
                return Err(GlowmintError::InvalidInput(
                    "duty percent must be 0-100".to_string(),
                ));
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoolingStatus {
    pub water_temp_c: Option<f32>,
    pub probe_temp_c: Option<f32>,
    pub pump_speed_rpm: Option<u32>,
    pub pump_duty_percent: Option<u8>,
    pub fan_speeds_rpm: Vec<u32>,
    pub fan_duties_percent: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PumpPreset {
    Quiet,
    Balanced,
    Extreme,
}

impl PumpPreset {
    pub fn duty_percent(&self) -> u8 {
        match self {
            PumpPreset::Quiet => 75,
            PumpPreset::Balanced => 84,
            PumpPreset::Extreme => 100,
        }
    }
}
