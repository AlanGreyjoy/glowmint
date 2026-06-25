use std::path::Path;
use std::process::Command;

pub const UDEV_RULES_PATH: &str = "/etc/udev/rules.d/99-glowmint-corsair.rules";
pub const CKB_NEXT_ROOT: &str = "/dev/input/ckb0";

pub const LCD_PRODUCT_IDS: [u16; 2] = [0x0c39, 0x0c33];
pub const AIO_PRODUCT_IDS: [u16; 2] = [0x0c1c, 0x0c32];

pub fn command_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn udev_rules_installed() -> bool {
    Path::new(UDEV_RULES_PATH).exists()
}

pub fn ckb_next_daemon_running() -> bool {
    Path::new(CKB_NEXT_ROOT).exists()
}

pub fn has_lcd_hardware(product_ids: &[u16]) -> bool {
    product_ids.iter().any(|id| LCD_PRODUCT_IDS.contains(id))
}

pub fn has_aio_hardware(product_ids: &[u16]) -> bool {
    product_ids.iter().any(|id| AIO_PRODUCT_IDS.contains(id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_lcd_product_ids() {
        assert!(has_lcd_hardware(&[0x0c39]));
        assert!(!has_lcd_hardware(&[0x0c1c]));
    }

    #[test]
    fn detects_aio_product_ids() {
        assert!(has_aio_hardware(&[0x0c32]));
        assert!(!has_aio_hardware(&[0x0c39]));
    }
}
