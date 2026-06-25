use std::sync::Arc;

use crate::domain::error::Result;
use crate::domain::models::device::{BackendHealth, BackendStatus, Device};
use crate::drivers::ckb_next;
use crate::drivers::liquidctl;
use crate::drivers::openrgb;
use crate::drivers::usb;
use crate::drivers::{CkbNextDriver, OpenRgbDriver};
use crate::domain::traits::PeripheralController;
use crate::domain::traits::RgbController;

pub struct DeviceService {
    rgb: Arc<OpenRgbDriver>,
    peripherals: Arc<CkbNextDriver>,
}

impl DeviceService {
    pub fn new(rgb: Arc<OpenRgbDriver>, peripherals: Arc<CkbNextDriver>) -> Self {
        Self { rgb, peripherals }
    }

    pub async fn discover(&self) -> Result<Vec<Device>> {
        let mut devices = usb::usb_devices_as_domain()?;

        if self.rgb.is_available().await {
            if let Ok(rgb_devices) = self.rgb.list_devices().await {
                for rgb in rgb_devices {
                    devices.push(Device {
                        id: format!("openrgb:{}", rgb.index),
                        name: rgb.name,
                        kind: crate::domain::models::device::DeviceKind::RgbController,
                        vendor_id: None,
                        product_id: None,
                        backend: "openrgb".to_string(),
                        status: "connected".to_string(),
                        capabilities: vec!["rgb".to_string(), "zones".to_string()],
                    });
                }
            }
        }

        if self.peripherals.is_available().await {
            devices.extend(self.peripherals.list_devices().await?);
        }

        Ok(devices)
    }

    pub async fn backend_health(&self) -> BackendHealth {
        BackendHealth {
            openrgb: if openrgb::is_available().await {
                BackendStatus::Available
            } else {
                BackendStatus::Unavailable
            },
            liquidctl: if liquidctl::is_available().await {
                BackendStatus::Available
            } else {
                BackendStatus::Unavailable
            },
            ckb_next: if ckb_next::is_available().await {
                BackendStatus::Available
            } else {
                BackendStatus::Unavailable
            },
        }
    }
}
