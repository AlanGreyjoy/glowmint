use std::sync::Arc;
use std::time::Duration;

use crate::cache::TtlCache;
use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::device::{BackendHealth, BackendStatus, Device, DeviceKind};
use crate::domain::traits::PeripheralController;
use crate::domain::traits::RgbController;
use crate::drivers::ckb_next;
use crate::drivers::liquidctl;
use crate::drivers::usb;
use crate::drivers::{CkbNextDriver, OpenRgbDriver};

/// Device inventory and backend health change slowly; cache them so the dashboard's
/// initial load (and any refresh) does not re-run lsusb / re-probe every backend each time.
const INVENTORY_TTL: Duration = Duration::from_millis(2500);

pub struct DeviceService {
    rgb: Arc<OpenRgbDriver>,
    peripherals: Arc<CkbNextDriver>,
    discover_cache: TtlCache<Vec<Device>>,
    health_cache: TtlCache<BackendHealth>,
}

fn status_of(available: bool) -> BackendStatus {
    if available {
        BackendStatus::Available
    } else {
        BackendStatus::Unavailable
    }
}

impl DeviceService {
    pub fn new(rgb: Arc<OpenRgbDriver>, peripherals: Arc<CkbNextDriver>) -> Self {
        Self {
            rgb,
            peripherals,
            discover_cache: TtlCache::new(INVENTORY_TTL),
            health_cache: TtlCache::new(INVENTORY_TTL),
        }
    }

    pub async fn discover(&self) -> Result<Vec<Device>> {
        self.discover_cache
            .get_or_refresh(|| self.discover_uncached())
            .await
    }

    async fn discover_uncached(&self) -> Result<Vec<Device>> {
        // lsusb is a blocking subprocess; keep it off the async runtime.
        let mut devices = tokio::task::spawn_blocking(usb::usb_devices_as_domain)
            .await
            .map_err(|e| GlowmintError::Other(format!("usb scan task failed: {e}")))??;

        // Use a single OpenRGB session: skip the separate availability probe and treat a
        // failed listing as "no RGB devices" instead of opening two connections.
        if let Ok(rgb_devices) = self.rgb.list_devices().await {
            for rgb in rgb_devices {
                devices.push(Device {
                    id: format!("openrgb:{}", rgb.index),
                    name: rgb.name,
                    kind: DeviceKind::RgbController,
                    vendor_id: None,
                    product_id: None,
                    backend: "openrgb".to_string(),
                    status: "connected".to_string(),
                    capabilities: vec!["rgb".to_string(), "zones".to_string()],
                });
            }
        }

        if self.peripherals.is_available().await {
            devices.extend(self.peripherals.list_devices().await?);
        }

        Ok(devices)
    }

    pub async fn backend_health(&self) -> BackendHealth {
        self.health_cache
            .get_or_refresh(|| async { Ok(self.compute_backend_health().await) })
            .await
            .unwrap_or(BackendHealth {
                openrgb: BackendStatus::Unavailable,
                liquidctl: BackendStatus::Unavailable,
                ckb_next: BackendStatus::Unavailable,
            })
    }

    async fn compute_backend_health(&self) -> BackendHealth {
        BackendHealth {
            openrgb: status_of(self.rgb.is_available().await),
            liquidctl: status_of(liquidctl::is_available().await),
            ckb_next: status_of(ckb_next::is_available().await),
        }
    }
}
