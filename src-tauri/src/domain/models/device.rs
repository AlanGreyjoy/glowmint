use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
#[serde(rename_all = "snake_case")]
pub enum DeviceKind {
    AioCooler,
    LcdScreen,
    RgbController,
    Keyboard,
    Mouse,
    Headset,
    UsbDevice,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BackendStatus {
    Available,
    Unavailable,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendHealth {
    pub openrgb: BackendStatus,
    pub liquidctl: BackendStatus,
    pub ckb_next: BackendStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub kind: DeviceKind,
    pub vendor_id: Option<u16>,
    pub product_id: Option<u16>,
    pub backend: String,
    pub status: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbDeviceInfo {
    pub bus: String,
    pub device: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub description: String,
}

impl Device {
    pub fn from_usb(info: &UsbDeviceInfo) -> Self {
        let kind = classify_corsair_product(info.product_id);
        let capabilities = capabilities_for_kind(&kind);
        Self {
            id: format!("usb:{:04x}:{:04x}", info.vendor_id, info.product_id),
            name: info.description.clone(),
            kind,
            vendor_id: Some(info.vendor_id),
            product_id: Some(info.product_id),
            backend: backend_for_kind(&kind),
            status: "detected".to_string(),
            capabilities,
        }
    }
}

pub fn classify_corsair_product(product_id: u16) -> DeviceKind {
    match product_id {
        0x0c1c | 0x0c32 => DeviceKind::AioCooler,
        0x0c39 | 0x0c33 => DeviceKind::LcdScreen,
        _ => DeviceKind::UsbDevice,
    }
}

fn backend_for_kind(kind: &DeviceKind) -> String {
    match kind {
        DeviceKind::AioCooler => "liquidctl".to_string(),
        DeviceKind::LcdScreen => "glowmint-lcd".to_string(),
        DeviceKind::RgbController => "openrgb".to_string(),
        DeviceKind::Keyboard | DeviceKind::Mouse | DeviceKind::Headset => "ckb-next".to_string(),
        _ => "unknown".to_string(),
    }
}

fn capabilities_for_kind(kind: &DeviceKind) -> Vec<String> {
    match kind {
        DeviceKind::AioCooler => vec![
            "cooling".to_string(),
            "temperature".to_string(),
            "fan_curve".to_string(),
        ],
        DeviceKind::LcdScreen => vec!["lcd_image".to_string(), "lcd_gif".to_string()],
        DeviceKind::RgbController => vec!["rgb".to_string(), "zones".to_string()],
        DeviceKind::Keyboard | DeviceKind::Mouse => {
            vec!["rgb".to_string(), "profiles".to_string(), "dpi".to_string()]
        }
        DeviceKind::Headset => vec!["rgb".to_string()],
        _ => vec![],
    }
}
