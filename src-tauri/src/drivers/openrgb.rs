use async_trait::async_trait;
use openrgb2::{Color, OpenRgbClient};
use tokio::sync::Mutex;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::rgb::{
    AutoConfigureZonesReport, LightingMode, RgbColor, RgbDevice, RgbZone,
};
use crate::domain::traits::RgbController;

/// Run `op` against the cached OpenRGB connection, opening one lazily if needed.
/// On any error the connection is dropped so the next call reconnects, which keeps
/// a single long-lived TCP session per driver instead of one handshake per command.
macro_rules! with_conn {
    ($self:expr, |$client:ident| $body:expr) => {{
        let mut guard = $self.conn.lock().await;
        if guard.is_none() {
            *guard = Some(Self::connect_client().await?);
        }
        let outcome = {
            let $client = guard.as_ref().unwrap();
            $body.await
        };
        if outcome.is_err() {
            *guard = None;
        }
        outcome
    }};
}

pub struct OpenRgbDriver {
    conn: Mutex<Option<OpenRgbClient>>,
}

impl OpenRgbDriver {
    pub fn new() -> Self {
        Self {
            conn: Mutex::new(None),
        }
    }

    async fn connect_client() -> Result<OpenRgbClient> {
        OpenRgbClient::connect()
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))
    }

    fn to_openrgb_color(color: RgbColor) -> Color {
        Color::new(color.r, color.g, color.b)
    }

    fn map_zone(zone: openrgb2::Zone<'_>) -> RgbZone {
        let leds_min = zone.leds_min();
        let leds_max = zone.leds_max();
        RgbZone {
            index: zone.zone_id(),
            name: zone.name().to_string(),
            led_count: zone.num_leds(),
            resizable: zone_is_resizable(leds_min, leds_max),
            leds_min,
            leds_max,
        }
    }

    async fn save_sizes_profile(client: &OpenRgbClient) -> Result<()> {
        client
            .save_profile("sizes")
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))
    }

    async fn fetch_devices(client: &OpenRgbClient) -> Result<Vec<RgbDevice>> {
        let group = client
            .get_all_controllers()
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let devices = group
            .controllers()
            .iter()
            .map(|controller| {
                let zones = controller.get_all_zones().map(Self::map_zone).collect();
                RgbDevice {
                    index: controller.id(),
                    name: controller.name().to_string(),
                    zones,
                }
            })
            .collect();

        Ok(devices)
    }

    async fn apply_zone_color(
        client: &OpenRgbClient,
        device_index: usize,
        zone_index: usize,
        color: RgbColor,
    ) -> Result<()> {
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

    async fn apply_resize_zone(
        client: &OpenRgbClient,
        device_index: usize,
        zone_index: usize,
        led_count: usize,
    ) -> Result<()> {
        let controller = client
            .get_controller(device_index)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let zone = controller
            .get_zone(zone_index)
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        if !zone_is_resizable(zone.leds_min(), zone.leds_max()) {
            return Err(GlowmintError::OpenRgbUnavailable(format!(
                "Zone {} on {} is not configurable",
                zone.name(),
                controller.name()
            )));
        }

        if led_count < zone.leds_min() || led_count > zone.leds_max() {
            return Err(GlowmintError::OpenRgbUnavailable(format!(
                "LED count must be between {} and {} for {}",
                zone.leds_min(),
                zone.leds_max(),
                zone.name()
            )));
        }

        zone.resize(led_count)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        let mut controller = client
            .get_controller(device_index)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        controller
            .sync_controller_data()
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        Self::save_sizes_profile(client).await
    }

    async fn apply_device_mode(
        client: &OpenRgbClient,
        device_index: usize,
        mode: LightingMode,
    ) -> Result<()> {
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

    async fn do_save_profile(client: &OpenRgbClient, name: &str) -> Result<()> {
        client
            .save_profile(name)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))
    }

    async fn do_load_profile(client: &OpenRgbClient, name: &str) -> Result<()> {
        client
            .load_profile(name)
            .await
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))
    }
}

impl Default for OpenRgbDriver {
    fn default() -> Self {
        Self::new()
    }
}

pub fn zone_is_resizable(leds_min: usize, leds_max: usize) -> bool {
    leds_max > leds_min
}

pub fn zone_needs_initialization(resizable: bool, led_count: usize) -> bool {
    resizable && led_count == 0
}

#[async_trait]
impl RgbController for OpenRgbDriver {
    async fn is_available(&self) -> bool {
        let mut guard = self.conn.lock().await;
        if guard.is_none() {
            match Self::connect_client().await {
                Ok(client) => *guard = Some(client),
                Err(_) => return false,
            }
        }
        // Probe with a cheap request so a server that died since we connected
        // is detected and the stale handle dropped.
        match guard.as_mut().unwrap().get_controller_count().await {
            Ok(_) => true,
            Err(_) => {
                *guard = None;
                false
            }
        }
    }

    async fn list_devices(&self) -> Result<Vec<RgbDevice>> {
        with_conn!(self, |client| Self::fetch_devices(client))
    }

    async fn set_zone_color(
        &self,
        device_index: usize,
        zone_index: usize,
        color: RgbColor,
    ) -> Result<()> {
        with_conn!(self, |client| Self::apply_zone_color(
            client,
            device_index,
            zone_index,
            color
        ))
    }

    async fn resize_zone(
        &self,
        device_index: usize,
        zone_index: usize,
        led_count: usize,
    ) -> Result<()> {
        with_conn!(self, |client| Self::apply_resize_zone(
            client,
            device_index,
            zone_index,
            led_count
        ))
    }

    async fn set_device_mode(&self, device_index: usize, mode: LightingMode) -> Result<()> {
        with_conn!(self, |client| Self::apply_device_mode(
            client,
            device_index,
            mode
        ))
    }

    async fn save_profile(&self, name: &str) -> Result<()> {
        with_conn!(self, |client| Self::do_save_profile(client, name))
    }

    async fn load_profile(&self, name: &str) -> Result<()> {
        with_conn!(self, |client| Self::do_load_profile(client, name))
    }
}

pub async fn is_available() -> bool {
    OpenRgbDriver::new().is_available().await
}

pub async fn auto_configure_uninitialized_zones() -> Result<AutoConfigureZonesReport> {
    let client = OpenRgbDriver::connect_client().await?;
    let group = client
        .get_all_controllers()
        .await
        .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

    let mut zone_labels = Vec::new();

    for controller in group.controllers() {
        let device_name = controller.name().to_string();
        let mut resized = false;

        for zone in controller.get_all_zones() {
            if !zone_needs_initialization(
                zone_is_resizable(zone.leds_min(), zone.leds_max()),
                zone.num_leds(),
            ) {
                continue;
            }

            zone.resize(zone.leds_min())
                .await
                .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
            zone_labels.push(format!("{device_name} / {}", zone.name()));
            resized = true;
        }

        if resized {
            let mut controller = client
                .get_controller(controller.id())
                .await
                .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
            controller
                .sync_controller_data()
                .await
                .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;
        }
    }

    if !zone_labels.is_empty() {
        OpenRgbDriver::save_sizes_profile(&client).await?;
    }

    Ok(AutoConfigureZonesReport {
        zones_configured: zone_labels.len(),
        zone_labels,
    })
}

pub async fn wait_for_server(max_wait_ms: u64) -> bool {
    const POLL_INTERVAL_MS: u64 = 500;
    let mut elapsed = 0_u64;

    while elapsed < max_wait_ms {
        if is_available().await {
            return true;
        }
        tokio::time::sleep(std::time::Duration::from_millis(POLL_INTERVAL_MS)).await;
        elapsed += POLL_INTERVAL_MS;
    }

    is_available().await
}

#[cfg(test)]
mod tests {
    use super::{zone_is_resizable, zone_needs_initialization};

    #[test]
    fn zone_is_resizable_when_max_exceeds_min() {
        assert!(zone_is_resizable(0, 120));
        assert!(!zone_is_resizable(10, 10));
    }

    #[test]
    fn zone_needs_initialization_when_resizable_and_zero_leds() {
        assert!(zone_needs_initialization(true, 0));
        assert!(!zone_needs_initialization(true, 10));
        assert!(!zone_needs_initialization(false, 0));
    }
}
