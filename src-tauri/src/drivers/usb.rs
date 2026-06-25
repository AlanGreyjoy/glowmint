use std::process::Command;
use std::sync::OnceLock;

use regex::Regex;

use crate::domain::error::Result;
use crate::domain::models::device::{Device, UsbDeviceInfo};

fn lsusb_line_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"Bus (\d+) Device (\d+): ID ([0-9a-f]{4}):([0-9a-f]{4}) (.+)").unwrap()
    })
}

pub fn list_corsair_usb_devices() -> Result<Vec<UsbDeviceInfo>> {
    let output = Command::new("lsusb").arg("-d").arg("1b1c:").output()?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let re = lsusb_line_regex();
    let mut devices = Vec::new();

    for line in text.lines() {
        if let Some(caps) = re.captures(line) {
            devices.push(UsbDeviceInfo {
                bus: caps[1].to_string(),
                device: caps[2].to_string(),
                vendor_id: u16::from_str_radix(&caps[3], 16).unwrap_or(0x1b1c),
                product_id: u16::from_str_radix(&caps[4], 16).unwrap_or(0),
                description: caps[5].trim().to_string(),
            });
        }
    }

    Ok(devices)
}

pub fn usb_devices_as_domain() -> Result<Vec<Device>> {
    Ok(list_corsair_usb_devices()?
        .iter()
        .map(Device::from_usb)
        .collect())
}
