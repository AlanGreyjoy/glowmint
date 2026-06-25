use std::fs;
use std::io::Write;
use std::path::PathBuf;

use async_trait::async_trait;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::device::{Device, DeviceKind};
use crate::domain::models::rgb::RgbColor;
use crate::domain::traits::PeripheralController;

pub struct CkbNextDriver;

impl CkbNextDriver {
    pub fn new() -> Self {
        Self
    }

    fn ckb_root() -> PathBuf {
        PathBuf::from("/dev/input")
    }

    fn device_paths() -> Vec<PathBuf> {
        let root = Self::ckb_root();
        let mut paths = Vec::new();
        if let Ok(entries) = fs::read_dir(&root) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("ckb") && name != "ckb0" {
                    paths.push(entry.path());
                }
            }
        }
        paths.sort();
        paths
    }

    fn read_device_info(path: &PathBuf) -> Result<(String, DeviceKind)> {
        let name_path = path.join("name");
        let model_path = path.join("model");
        let name = fs::read_to_string(&name_path).unwrap_or_else(|_| "Corsair Device".to_string());
        let model = fs::read_to_string(&model_path).unwrap_or_default().to_lowercase();
        let kind = if model.contains("keyboard") || name.to_lowercase().contains("keyboard") {
            DeviceKind::Keyboard
        } else if model.contains("mouse") || name.to_lowercase().contains("mouse") {
            DeviceKind::Mouse
        } else if model.contains("headset") || name.to_lowercase().contains("headset") {
            DeviceKind::Headset
        } else {
            DeviceKind::UsbDevice
        };
        Ok((name.trim().to_string(), kind))
    }

    fn send_command(path: &PathBuf, command: &str) -> Result<()> {
        let cmd_path = path.join("cmd");
        if !cmd_path.exists() {
            return Err(GlowmintError::CkbNextUnavailable(format!(
                "cmd node missing at {}",
                cmd_path.display()
            )));
        }
        let mut file = fs::OpenOptions::new()
            .write(true)
            .open(&cmd_path)
            .map_err(|e| GlowmintError::CkbNextUnavailable(e.to_string()))?;
        writeln!(file, "{command}")
            .map_err(|e| GlowmintError::CkbNextUnavailable(e.to_string()))?;
        file.flush()
            .map_err(|e| GlowmintError::CkbNextUnavailable(e.to_string()))?;
        Ok(())
    }

    fn resolve_path(device_id: &str) -> Result<PathBuf> {
        if device_id.starts_with("ckb:") {
            let suffix = device_id.trim_start_matches("ckb:");
            return Ok(Self::ckb_root().join(suffix));
        }
        for path in Self::device_paths() {
            let id = format!("ckb:{}", path.file_name().unwrap().to_string_lossy());
            if id == device_id {
                return Ok(path);
            }
        }
        Err(GlowmintError::DeviceNotFound(device_id.to_string()))
    }
}

impl Default for CkbNextDriver {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PeripheralController for CkbNextDriver {
    async fn is_available(&self) -> bool {
        Self::ckb_root().join("ckb0").exists()
    }

    async fn list_devices(&self) -> Result<Vec<Device>> {
        let mut devices = Vec::new();
        for path in Self::device_paths() {
            let id = format!("ckb:{}", path.file_name().unwrap().to_string_lossy());
            let (name, kind) = Self::read_device_info(&path)?;
            let mut device = Device {
                id: id.clone(),
                name,
                kind,
                vendor_id: Some(0x1b1c),
                product_id: None,
                backend: "ckb-next".to_string(),
                status: "connected".to_string(),
                capabilities: vec!["rgb".to_string(), "profiles".to_string()],
            };
            if device.kind == DeviceKind::Mouse {
                device.capabilities.push("dpi".to_string());
            }
            devices.push(device);
        }
        Ok(devices)
    }

    async fn set_rgb(&self, device_id: &str, color: RgbColor) -> Result<()> {
        let path = Self::resolve_path(device_id)?;
        let hex = format!("{:02x}{:02x}{:02x}", color.r, color.g, color.b);
        Self::send_command(&path, &format!("rgb {hex}"))?;
        Ok(())
    }

    async fn set_dpi(&self, device_id: &str, dpi: u16) -> Result<()> {
        let path = Self::resolve_path(device_id)?;
        Self::send_command(&path, &format!("dpi {dpi}"))?;
        Ok(())
    }

    async fn switch_profile(&self, device_id: &str, profile: u8) -> Result<()> {
        let path = Self::resolve_path(device_id)?;
        Self::send_command(&path, &format!("switch {profile}"))?;
        Ok(())
    }
}

pub async fn is_available() -> bool {
    CkbNextDriver::new().is_available().await
}
