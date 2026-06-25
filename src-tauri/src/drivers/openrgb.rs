use async_trait::async_trait;
use openrgb2::{Color, OpenRgbClient};

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::rgb::{LightingMode, RgbColor, RgbDevice, RgbZone};
use crate::domain::traits::RgbController;

pub struct OpenRgbDriver;

impl OpenRgbDriver {
    pub fn new() -> Self {
        Self
    }

    async fn connect() -> Result<OpenRgbClient> {
        OpenRgbClient::connect()
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))
    }

    fn to_openrgb_color(color: RgbColor) -> Color {
        Color::new(color.r, color.g, color.b)
    }
}

impl Default for OpenRgbDriver {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl RgbController for OpenRgbDriver {
    async fn is_available(&self) -> bool {
        Self::connect().await.is_ok()
    }

    async fn list_devices(&self) -> Result<Vec<RgbDevice>> {
        let client = Self::connect().await?;
        let group = client
            .get_all_controllers()
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let devices = group
            .controllers()
            .iter()
            .map(|controller| {
                let zones = controller
                    .get_all_zones()
                    .map(|zone| RgbZone {
                        index: zone.zone_id(),
                        name: zone.name().to_string(),
                        led_count: zone.num_leds(),
                    })
                    .collect();
                RgbDevice {
                    index: controller.id(),
                    name: controller.name().to_string(),
                    zones,
                }
            })
            .collect();

        Ok(devices)
    }

    async fn set_zone_color(
        &self,
        device_index: usize,
        zone_index: usize,
        color: RgbColor,
    ) -> Result<()> {
        let client = Self::connect().await?;
        let controller = client
            .get_controller(device_index)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let zone = controller
            .get_zone(zone_index)
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let openrgb_color = Self::to_openrgb_color(color);
        let colors = vec![openrgb_color; zone.num_leds()];
        controller
            .set_zone_leds(zone_index, colors)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        Ok(())
    }

    async fn set_device_mode(&self, device_index: usize, mode: LightingMode) -> Result<()> {
        let client = Self::connect().await?;
        let controller = client
            .get_controller(device_index)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let mode_name = match mode {
            LightingMode::Static => "Static",
            LightingMode::Breathing => "Breathing",
            LightingMode::Rainbow => "Rainbow",
        };

        let selected = controller
            .mode_iter()
            .find(|m| m.name().eq_ignore_ascii_case(mode_name));

        if let Some(selected_mode) = selected {
            selected_mode
                .builder()
                .execute(&controller)
                .await
                .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        }

        Ok(())
    }

    async fn save_profile(&self, name: &str) -> Result<()> {
        let client = Self::connect().await?;
        client
            .save_profile(name)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        Ok(())
    }

    async fn load_profile(&self, name: &str) -> Result<()> {
        let client = Self::connect().await?;
        client
            .load_profile(name)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        Ok(())
    }
}

pub async fn is_available() -> bool {
    OpenRgbDriver::new().is_available().await
}
