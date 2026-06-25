use async_trait::async_trait;

use crate::domain::error::Result;
use crate::domain::models::device::Device;
use crate::domain::models::fan_curve::{CoolingStatus, FanCurve, PumpPreset};
use crate::domain::models::lcd::LcdStatus;
use crate::domain::models::rgb::{LightingMode, RgbColor, RgbDevice};

#[async_trait]
pub trait LcdController: Send + Sync {
    async fn status(&self) -> Result<LcdStatus>;
    async fn set_image(&self, path: &str) -> Result<()>;
    async fn set_gif(&self, path: &str, fps: u32, r#loop: bool) -> Result<()>;
    async fn set_brightness(&self, brightness: u8) -> Result<()>;
    async fn stop_gif(&self) -> Result<()>;
}

#[async_trait]
pub trait CoolingController: Send + Sync {
    async fn initialize(&self) -> Result<()>;
    async fn status(&self) -> Result<CoolingStatus>;
    async fn set_pump_duty(&self, duty: u8) -> Result<()>;
    async fn set_pump_preset(&self, preset: PumpPreset) -> Result<()>;
    async fn set_fan_duty(&self, fan_index: u8, duty: u8) -> Result<()>;
    async fn set_fan_curve(&self, fan_index: u8, curve: &FanCurve) -> Result<()>;
}

#[async_trait]
pub trait RgbController: Send + Sync {
    async fn is_available(&self) -> bool;
    async fn list_devices(&self) -> Result<Vec<RgbDevice>>;
    async fn set_zone_color(&self, device_index: usize, zone_index: usize, color: RgbColor) -> Result<()>;
    async fn resize_zone(
        &self,
        device_index: usize,
        zone_index: usize,
        led_count: usize,
    ) -> Result<()>;
    async fn set_device_mode(&self, device_index: usize, mode: LightingMode) -> Result<()>;
    async fn save_profile(&self, name: &str) -> Result<()>;
    async fn load_profile(&self, name: &str) -> Result<()>;
}

#[async_trait]
pub trait PeripheralController: Send + Sync {
    async fn is_available(&self) -> bool;
    async fn list_devices(&self) -> Result<Vec<Device>>;
    async fn set_rgb(&self, device_id: &str, color: RgbColor) -> Result<()>;
    async fn set_dpi(&self, device_id: &str, dpi: u16) -> Result<()>;
    async fn switch_profile(&self, device_id: &str, profile: u8) -> Result<()>;
}
