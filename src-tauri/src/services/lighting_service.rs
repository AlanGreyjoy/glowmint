use std::sync::Arc;

use crate::domain::error::Result;
use crate::domain::models::rgb::{LightingMode, RgbColor, RgbDevice};
use crate::domain::traits::RgbController;

pub struct LightingService {
    rgb: Arc<dyn RgbController>,
}

impl LightingService {
    pub fn new(rgb: Arc<dyn RgbController>) -> Self {
        Self { rgb }
    }

    pub async fn is_available(&self) -> bool {
        self.rgb.is_available().await
    }

    pub async fn list_devices(&self) -> Result<Vec<RgbDevice>> {
        self.rgb.list_devices().await
    }

    pub async fn set_zone_color(
        &self,
        device_index: usize,
        zone_index: usize,
        color: RgbColor,
    ) -> Result<()> {
        self.rgb.set_zone_color(device_index, zone_index, color).await
    }

    pub async fn set_device_mode(&self, device_index: usize, mode: LightingMode) -> Result<()> {
        self.rgb.set_device_mode(device_index, mode).await
    }

    pub async fn resize_zone(
        &self,
        device_index: usize,
        zone_index: usize,
        led_count: usize,
    ) -> Result<()> {
        self.rgb
            .resize_zone(device_index, zone_index, led_count)
            .await
    }

    pub async fn save_openrgb_profile(&self, name: &str) -> Result<()> {
        self.rgb.save_profile(name).await
    }

    pub async fn load_openrgb_profile(&self, name: &str) -> Result<()> {
        self.rgb.load_profile(name).await
    }
}
