use std::process::Stdio;

use async_trait::async_trait;
use tokio::process::Command;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::fan_curve::{CoolingStatus, FanCurve, PumpPreset};
use crate::domain::traits::CoolingController;

/// ASCII case-insensitive substring check that avoids allocating a lowercased copy of each
/// status line. `needle` must be lowercase and non-empty.
fn contains_ci(haystack: &str, needle: &str) -> bool {
    let needle = needle.as_bytes();
    haystack
        .as_bytes()
        .windows(needle.len())
        .any(|window| window.eq_ignore_ascii_case(needle))
}

pub struct LiquidctlDriver;

impl LiquidctlDriver {
    pub fn new() -> Self {
        Self
    }

    async fn run(args: &[&str]) -> Result<String> {
        let output = Command::new("liquidctl")
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| GlowmintError::LiquidctlFailed(format!("liquidctl not found: {e}")))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            return Err(GlowmintError::LiquidctlFailed(if stderr.is_empty() {
                stdout
            } else {
                stderr
            }));
        }
        Ok(stdout)
    }

    fn parse_f32(line: &str, key: &str) -> Option<f32> {
        line.split_whitespace()
            .collect::<Vec<_>>()
            .windows(2)
            .find(|w| w[0].contains(key))
            .and_then(|w| w[1].trim_end_matches('°').parse().ok())
    }

    fn parse_u32(line: &str, key: &str) -> Option<u32> {
        line.split_whitespace()
            .collect::<Vec<_>>()
            .windows(2)
            .find(|w| w[0].contains(key))
            .and_then(|w| w[1].parse().ok())
    }

    fn parse_status(output: &str) -> CoolingStatus {
        let mut status = CoolingStatus {
            water_temp_c: None,
            probe_temp_c: None,
            pump_speed_rpm: None,
            pump_duty_percent: None,
            fan_speeds_rpm: Vec::new(),
            fan_duties_percent: Vec::new(),
        };

        for line in output.lines() {
            if contains_ci(line, "water") && contains_ci(line, "temp") {
                status.water_temp_c = Self::parse_f32(line, "temperature");
            } else if contains_ci(line, "probe") && contains_ci(line, "temp") {
                status.probe_temp_c = Self::parse_f32(line, "temperature");
            } else if contains_ci(line, "pump") && contains_ci(line, "speed") {
                status.pump_speed_rpm = Self::parse_u32(line, "speed");
            } else if contains_ci(line, "pump") && contains_ci(line, "duty") {
                status.pump_duty_percent = Self::parse_u32(line, "duty").map(|v| v as u8);
            } else if contains_ci(line, "fan") && contains_ci(line, "speed") {
                if let Some(rpm) = Self::parse_u32(line, "speed") {
                    status.fan_speeds_rpm.push(rpm);
                }
            } else if contains_ci(line, "fan") && contains_ci(line, "duty") {
                if let Some(duty) = Self::parse_u32(line, "duty") {
                    status.fan_duties_percent.push(duty as u8);
                }
            }
        }

        status
    }
}

impl Default for LiquidctlDriver {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl CoolingController for LiquidctlDriver {
    async fn initialize(&self) -> Result<()> {
        Self::run(&["initialize"]).await?;
        Ok(())
    }

    async fn status(&self) -> Result<CoolingStatus> {
        let output = Self::run(&["status"]).await?;
        Ok(Self::parse_status(&output))
    }

    async fn set_pump_duty(&self, duty: u8) -> Result<()> {
        Self::run(&["set", "pump", "speed", &duty.to_string()]).await?;
        Ok(())
    }

    async fn set_pump_preset(&self, preset: PumpPreset) -> Result<()> {
        self.set_pump_duty(preset.duty_percent()).await
    }

    async fn set_fan_duty(&self, fan_index: u8, duty: u8) -> Result<()> {
        Self::run(&[
            "set",
            "fan",
            &fan_index.to_string(),
            "speed",
            &duty.to_string(),
        ])
        .await?;
        Ok(())
    }

    async fn set_fan_curve(&self, fan_index: u8, curve: &FanCurve) -> Result<()> {
        curve.validate()?;
        let fan = fan_index.to_string();
        let curve_arg = curve
            .points
            .iter()
            .map(|point| format!("{}:{}", point.temperature_c as i32, point.duty_percent))
            .collect::<Vec<_>>()
            .join(",");
        Self::run(&["set", "fan", &fan, "curve", &curve_arg]).await?;
        Ok(())
    }
}

pub async fn is_available() -> bool {
    Command::new("liquidctl")
        .arg("--version")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub async fn list_devices() -> Result<String> {
    LiquidctlDriver::run(&["list"]).await
}
