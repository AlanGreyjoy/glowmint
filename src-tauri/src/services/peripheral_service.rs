use std::sync::Arc;

use crate::domain::error::Result;
use crate::domain::models::device::Device;
use crate::domain::models::rgb::RgbColor;
use crate::domain::traits::PeripheralController;

pub struct PeripheralService {
    controller: Arc<dyn PeripheralController>,
}

impl PeripheralService {
    pub fn new(controller: Arc<dyn PeripheralController>) -> Self {
        Self { controller }
    }

    pub async fn is_available(&self) -> bool {
        self.controller.is_available().await
    }

    pub async fn list_devices(&self) -> Result<Vec<Device>> {
        self.controller.list_devices().await
    }

    pub async fn set_rgb(&self, device_id: &str, color: RgbColor) -> Result<()> {
        self.controller.set_rgb(device_id, color).await
    }

    pub async fn set_dpi(&self, device_id: &str, dpi: u16) -> Result<()> {
        self.controller.set_dpi(device_id, dpi).await
    }

    pub async fn switch_profile(&self, device_id: &str, profile: u8) -> Result<()> {
        self.controller.switch_profile(device_id, profile).await
    }
}
