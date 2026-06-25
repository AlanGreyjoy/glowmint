use std::fs;
use std::process::Command;

use hidapi::HidApi;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::setup::{
    AppConfig, CheckSeverity, CheckStatus, SetupCheck, SetupReport, SetupStatus,
};
use crate::drivers::corsair_lcd::device::{CORSAIR_VID, LCD_PID_ALT, LCD_PID_ELITE};
use crate::drivers::liquidctl;
use crate::drivers::openrgb;
use crate::drivers::setup_probe::{
    ckb_next_daemon_running, command_exists, has_aio_hardware, has_lcd_hardware,
    udev_rules_installed, UDEV_RULES_PATH,
};
use crate::drivers::usb;
use crate::stores::ConfigStore;

const UDEV_RULES_CONTENT: &str = include_str!("../../udev/99-glowmint-corsair.rules");

pub const INSTALL_PACKAGES_CMD: &str = "sudo apt install openrgb liquidctl ckb-next";
pub const CKB_NEXT_SERVICE_CMD: &str = "sudo systemctl enable --now ckb-next-daemon";
pub const OPENRGB_SERVER_CMD: &str = "openrgb --startminimized --server";

pub struct SetupService {
    config: ConfigStore,
}

impl SetupService {
    pub fn new(config: ConfigStore) -> Result<Self> {
        Ok(Self { config })
    }

    pub async fn run_checks(&self) -> Result<SetupReport> {
        let corsair_devices = usb::list_corsair_usb_devices().unwrap_or_default();
        let product_ids: Vec<u16> = corsair_devices.iter().map(|d| d.product_id).collect();
        let has_lcd = has_lcd_hardware(&product_ids);
        let has_aio = has_aio_hardware(&product_ids);

        let mut checks = Vec::new();

        let lsusb_ok = command_exists("lsusb");
        checks.push(SetupCheck {
            id: "lsusb_available".into(),
            label: "lsusb (USB detection)".into(),
            status: if lsusb_ok {
                CheckStatus::Pass
            } else {
                CheckStatus::Warn
            },
            severity: CheckSeverity::Optional,
            message: if lsusb_ok {
                "lsusb is available".into()
            } else {
                "Install usbutils: sudo apt install usbutils".into()
            },
            fix_command: Some("sudo apt install usbutils".into()),
            can_auto_fix: false,
        });

        let corsair_ok = !corsair_devices.is_empty();
        checks.push(SetupCheck {
            id: "corsair_usb".into(),
            label: "Corsair USB devices".into(),
            status: if corsair_ok {
                CheckStatus::Pass
            } else {
                CheckStatus::Warn
            },
            severity: CheckSeverity::Recommended,
            message: if corsair_ok {
                format!("Found {} Corsair device(s)", corsair_devices.len())
            } else {
                "No Corsair USB devices detected. Connect your hardware and re-check.".into()
            },
            fix_command: Some("lsusb -d 1b1c:".into()),
            can_auto_fix: false,
        });

        let liquidctl_ok = liquidctl::is_available().await;
        checks.push(SetupCheck {
            id: "liquidctl_binary".into(),
            label: "liquidctl (AIO pump/fans)".into(),
            status: if liquidctl_ok {
                CheckStatus::Pass
            } else if has_aio {
                CheckStatus::Fail
            } else {
                CheckStatus::Warn
            },
            severity: if has_aio {
                CheckSeverity::Required
            } else {
                CheckSeverity::Recommended
            },
            message: if liquidctl_ok {
                "liquidctl is installed".into()
            } else {
                "liquidctl not found — required for Commander Core cooling".into()
            },
            fix_command: Some(INSTALL_PACKAGES_CMD.into()),
            can_auto_fix: false,
        });

        let openrgb_bin = command_exists("openrgb");
        checks.push(SetupCheck {
            id: "openrgb_binary".into(),
            label: "OpenRGB (RGB lighting)".into(),
            status: if openrgb_bin {
                CheckStatus::Pass
            } else {
                CheckStatus::Fail
            },
            severity: CheckSeverity::Recommended,
            message: if openrgb_bin {
                "OpenRGB is installed".into()
            } else {
                "OpenRGB not found — install for RGB control".into()
            },
            fix_command: Some(INSTALL_PACKAGES_CMD.into()),
            can_auto_fix: false,
        });

        let openrgb_srv = openrgb::is_available().await;
        checks.push(SetupCheck {
            id: "openrgb_server".into(),
            label: "OpenRGB SDK server".into(),
            status: if openrgb_srv {
                CheckStatus::Pass
            } else if openrgb_bin {
                CheckStatus::Fail
            } else {
                CheckStatus::Unknown
            },
            severity: CheckSeverity::Recommended,
            message: if openrgb_srv {
                "OpenRGB SDK server is reachable".into()
            } else {
                "OpenRGB server not running on 127.0.0.1:6742".into()
            },
            fix_command: Some(OPENRGB_SERVER_CMD.into()),
            can_auto_fix: openrgb_bin,
        });

        let ckb_ok = ckb_next_daemon_running();
        checks.push(SetupCheck {
            id: "ckb_next_daemon".into(),
            label: "ckb-next daemon (keyboards/mice)".into(),
            status: if ckb_ok {
                CheckStatus::Pass
            } else {
                CheckStatus::Warn
            },
            severity: CheckSeverity::Recommended,
            message: if ckb_ok {
                "ckb-next daemon is running".into()
            } else {
                "ckb-next daemon not detected at /dev/input/ckb0".into()
            },
            fix_command: Some(CKB_NEXT_SERVICE_CMD.into()),
            can_auto_fix: false,
        });

        let udev_ok = udev_rules_installed();
        checks.push(SetupCheck {
            id: "udev_rules".into(),
            label: "USB permissions (udev rules)".into(),
            status: if udev_ok {
                CheckStatus::Pass
            } else if has_lcd {
                CheckStatus::Fail
            } else {
                CheckStatus::Warn
            },
            severity: if has_lcd {
                CheckSeverity::Required
            } else {
                CheckSeverity::Recommended
            },
            message: if udev_ok {
                format!("Rules installed at {UDEV_RULES_PATH}")
            } else {
                "Glowmint udev rules not installed — required for Elite LCD access".into()
            },
            fix_command: None,
            can_auto_fix: true,
        });

        let lcd_access = lcd_device_accessible();
        checks.push(SetupCheck {
            id: "lcd_access".into(),
            label: "Elite LCD HID access".into(),
            status: if lcd_access {
                CheckStatus::Pass
            } else if has_lcd {
                CheckStatus::Fail
            } else {
                CheckStatus::Unknown
            },
            severity: if has_lcd {
                CheckSeverity::Required
            } else {
                CheckSeverity::Optional
            },
            message: if lcd_access {
                "LCD device is accessible".into()
            } else if has_lcd {
                "Cannot open LCD device — install udev rules and replug USB".into()
            } else {
                "No Elite LCD detected".into()
            },
            fix_command: None,
            can_auto_fix: false,
        });

        let all_required_pass = checks.iter().all(|c| {
            c.severity != CheckSeverity::Required
                || c.status == CheckStatus::Pass
                || c.status == CheckStatus::Unknown
        });

        Ok(SetupReport {
            checks,
            corsair_devices,
            has_lcd_hardware: has_lcd,
            has_aio_hardware: has_aio,
            all_required_pass,
            install_packages_command: INSTALL_PACKAGES_CMD.into(),
            ckb_next_service_command: CKB_NEXT_SERVICE_CMD.into(),
            openrgb_server_command: OPENRGB_SERVER_CMD.into(),
        })
    }

    pub async fn get_status(&self) -> Result<SetupStatus> {
        let config = self.config.load()?;
        let report = self.run_checks().await?;
        let needs_wizard = compute_needs_wizard(&config, &report);
        Ok(SetupStatus {
            report,
            onboarding_complete: config.onboarding_completed,
            onboarding_skipped: config.onboarding_skipped,
            needs_wizard,
        })
    }

    pub async fn needs_onboarding(&self) -> Result<bool> {
        Ok(self.get_status().await?.needs_wizard)
    }

    pub fn complete_onboarding(&self, skipped: bool) -> Result<()> {
        self.config.mark_onboarding_complete(skipped)
    }

    pub fn reset_onboarding(&self) -> Result<()> {
        self.config.reset_onboarding()
    }

    pub fn install_udev_rules(&self) -> Result<()> {
        let temp_dir = dirs::config_dir()
            .ok_or_else(|| GlowmintError::Other("no config dir".to_string()))?
            .join("glowmint");
        fs::create_dir_all(&temp_dir)?;
        let temp_rules = temp_dir.join("99-glowmint-corsair.rules");
        fs::write(&temp_rules, UDEV_RULES_CONTENT)?;

        let script = format!(
            "install -m 0644 '{}' '{}' && udevadm control --reload-rules && udevadm trigger",
            temp_rules.display(),
            UDEV_RULES_PATH
        );

        let status = Command::new("pkexec")
            .args(["sh", "-c", &script])
            .status()
            .map_err(|e| GlowmintError::Other(format!("pkexec failed: {e}")))?;

        if status.success() {
            Ok(())
        } else {
            Err(GlowmintError::Other(
                "udev rules installation was cancelled or failed".into(),
            ))
        }
    }

    pub fn start_openrgb_server(&self) -> Result<()> {
        if !command_exists("openrgb") {
            return Err(GlowmintError::OpenRgbUnavailable(
                "openrgb binary not found".into(),
            ));
        }

        Command::new("openrgb")
            .args(["--startminimized", "--server"])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

        Ok(())
    }
}

fn lcd_device_accessible() -> bool {
    HidApi::new()
        .ok()
        .and_then(|api| {
            for pid in [LCD_PID_ELITE, LCD_PID_ALT] {
                if api.open(CORSAIR_VID, pid).is_ok() {
                    return Some(());
                }
            }
            None
        })
        .is_some()
}

fn compute_needs_wizard(config: &AppConfig, report: &SetupReport) -> bool {
    if !config.onboarding_completed {
        return true;
    }
    if config.onboarding_skipped {
        return false;
    }
    if !report.all_required_pass && has_actionable_hardware(report) {
        return true;
    }
    false
}

fn has_actionable_hardware(report: &SetupReport) -> bool {
    report.has_lcd_hardware
        || report.has_aio_hardware
        || !report.corsair_devices.is_empty()
}

pub fn setup_incomplete_for_banner(status: &SetupStatus) -> bool {
    status.onboarding_skipped && !status.report.all_required_pass
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::models::device::UsbDeviceInfo;

    fn sample_report(all_pass: bool) -> SetupReport {
        SetupReport {
            checks: vec![],
            corsair_devices: vec![UsbDeviceInfo {
                bus: "1".into(),
                device: "2".into(),
                vendor_id: 0x1b1c,
                product_id: 0x0c39,
                description: "LCD".into(),
            }],
            has_lcd_hardware: true,
            has_aio_hardware: false,
            all_required_pass: all_pass,
            install_packages_command: String::new(),
            ckb_next_service_command: String::new(),
            openrgb_server_command: String::new(),
        }
    }

    #[test]
    fn needs_wizard_when_onboarding_not_complete() {
        let config = AppConfig::default();
        assert!(compute_needs_wizard(&config, &sample_report(true)));
    }

    #[test]
    fn no_wizard_when_skipped_even_if_checks_fail() {
        let config = AppConfig {
            onboarding_completed: true,
            onboarding_skipped: true,
            onboarding_completed_at: None,
        };
        assert!(!compute_needs_wizard(&config, &sample_report(false)));
    }

    #[test]
    fn needs_wizard_when_completed_but_required_fails() {
        let config = AppConfig {
            onboarding_completed: true,
            onboarding_skipped: false,
            onboarding_completed_at: None,
        };
        assert!(compute_needs_wizard(&config, &sample_report(false)));
    }
}
