use std::path::Path;
use std::process::Command;

pub const UDEV_RULES_PATH: &str = "/etc/udev/rules.d/99-glowmint-corsair.rules";
pub const CKB_NEXT_ROOT: &str = "/dev/input/ckb0";

pub const LCD_PRODUCT_IDS: [u16; 2] = [0x0c39, 0x0c33];
pub const AIO_PRODUCT_IDS: [u16; 2] = [0x0c1c, 0x0c32];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackageManager {
    Apt,
    Dnf,
    Pacman,
    Unknown,
}

impl PackageManager {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Apt => "apt",
            Self::Dnf => "dnf",
            Self::Pacman => "pacman",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DetectedEnvironment {
    pub distro_label: String,
    pub package_manager: PackageManager,
    pub has_pkexec: bool,
    pub has_systemd: bool,
}

impl DetectedEnvironment {
    pub fn supports_apt_auto_install(&self) -> bool {
        self.package_manager == PackageManager::Apt && self.has_pkexec
    }

    pub fn supports_systemd_auto_start(&self) -> bool {
        self.has_systemd && self.has_pkexec
    }
}

pub fn command_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn detect_package_manager() -> PackageManager {
    if command_exists("apt-get") {
        PackageManager::Apt
    } else if command_exists("dnf") {
        PackageManager::Dnf
    } else if command_exists("pacman") {
        PackageManager::Pacman
    } else {
        PackageManager::Unknown
    }
}

pub fn parse_distro_label(os_release: &str) -> String {
    for line in os_release.lines() {
        if let Some(value) = line.strip_prefix("PRETTY_NAME=") {
            return value.trim().trim_matches('"').to_string();
        }
    }
    "Linux".into()
}

pub fn read_distro_label() -> String {
    std::fs::read_to_string("/etc/os-release")
        .map(|content| parse_distro_label(&content))
        .unwrap_or_else(|_| "Linux".into())
}

pub fn detect_environment() -> DetectedEnvironment {
    DetectedEnvironment {
        distro_label: read_distro_label(),
        package_manager: detect_package_manager(),
        has_pkexec: command_exists("pkexec"),
        has_systemd: command_exists("systemctl"),
    }
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
    fn parses_pretty_name_from_os_release() {
        let content = r#"NAME="Linux Mint"
PRETTY_NAME="Linux Mint 22"
ID=linuxmint
"#;
        assert_eq!(parse_distro_label(content), "Linux Mint 22");
    }

    #[test]
    fn parse_distro_label_falls_back_to_linux() {
        assert_eq!(parse_distro_label("ID=arch\n"), "Linux");
    }

    #[test]
    fn package_manager_as_str() {
        assert_eq!(PackageManager::Apt.as_str(), "apt");
        assert_eq!(PackageManager::Unknown.as_str(), "unknown");
    }

    #[test]
    fn supports_apt_auto_install_requires_pkexec() {
        let env = DetectedEnvironment {
            distro_label: "Ubuntu".into(),
            package_manager: PackageManager::Apt,
            has_pkexec: false,
            has_systemd: true,
        };
        assert!(!env.supports_apt_auto_install());
    }

    #[test]
    fn supports_apt_auto_install_on_apt_with_pkexec() {
        let env = DetectedEnvironment {
            distro_label: "Linux Mint".into(),
            package_manager: PackageManager::Apt,
            has_pkexec: true,
            has_systemd: true,
        };
        assert!(env.supports_apt_auto_install());
    }

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
