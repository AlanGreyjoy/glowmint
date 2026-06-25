use std::fs;
use std::process::{Command, Stdio};

use hidapi::HidApi;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::setup::{
    AppConfig, CheckSeverity, CheckStatus, InstallPackagesResult, SetupCheck, SetupEnvironment,
    SetupReport, SetupStatus,
};
use crate::drivers::corsair_lcd::device::{CORSAIR_VID, LCD_PID_ALT, LCD_PID_ELITE};
use crate::drivers::liquidctl;
use crate::drivers::openrgb;
use crate::drivers::setup_probe::{
    ckb_next_daemon_running, command_exists, detect_environment, has_aio_hardware, has_lcd_hardware,
    udev_rules_installed, DetectedEnvironment, PackageManager, UDEV_RULES_PATH,
};
use crate::drivers::usb;
use crate::stores::ConfigStore;

const UDEV_RULES_CONTENT: &str = include_str!("../../udev/99-glowmint-corsair.rules");

pub const OPENRGB_PPA: &str = "ppa:thopiekar/openrgb";
pub const OPENRGB_RELEASE_TAG: &str = "release_candidate_1.0rc2";
pub const OPENRGB_DEB_COMMIT: &str = "0fca93e";
pub const INSTALL_PACKAGES_CMD: &str =
    "sudo apt update && sudo apt install -y liquidctl ckb-next\n# OpenRGB: use Install in System checks (downloads official .deb)";
pub const CKB_NEXT_SERVICE_CMD: &str = "sudo systemctl enable --now ckb-next-daemon";
pub const OPENRGB_SERVER_CMD: &str = "openrgb --server --noautoconnect";

const INSTALL_PACKAGES_SCRIPT_TEMPLATE: &str = r#"
export DEBIAN_FRONTEND=noninteractive
set -e
apt-get update
apt-get install -y liquidctl ckb-next
set +e

bin_ready() {
  command -v "$1" >/dev/null 2>&1 && "$1" --version >/dev/null 2>&1
}

pkg_configured() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q '^install ok installed$'
}

openrgb_ready() {
  bin_ready openrgb && pkg_configured openrgb
}

if ! openrgb_ready; then
  if apt-cache show openrgb >/dev/null 2>&1; then
    apt-get install -y openrgb
  fi
fi

if ! openrgb_ready; then
  echo "Installing OpenRGB from official release .deb..."
  apt-get install -y curl ca-certificates \
    libhidapi-hidraw0 libqt5core5a libqt5gui5 libqt5widgets5 libqt5dbus5 libusb-1.0-0
  apt-get install -y libmbedtls14t64 libmbedx509-1t64 libmbedcrypto7t64 \
    || apt-get install -y libmbedtls14 libmbedx509-1 libmbedcrypto7
  DEB="/tmp/glowmint-openrgb.deb"
  curl -fsSL -o "$DEB" "__OPENRGB_DEB_URL__"
  dpkg -i "$DEB"
  apt-get install -f -y
  rm -f "$DEB"
fi

echo ""
echo "=== Glowmint install summary ==="
if bin_ready liquidctl; then echo "liquidctl: installed"; else echo "liquidctl: not installed"; fi
if bin_ready ckb-next; then echo "ckb-next: installed"; else echo "ckb-next: not installed"; fi
if openrgb_ready; then echo "openrgb: installed"; else echo "openrgb: not installed"; fi

bin_ready liquidctl && bin_ready ckb-next && openrgb_ready
"#;

pub struct SetupService {
    config: ConfigStore,
}

impl SetupService {
    pub fn new(config: ConfigStore) -> Result<Self> {
        Ok(Self { config })
    }

    pub async fn run_checks(&self) -> Result<SetupReport> {
        let env = detect_environment();
        let install_cmd = install_packages_command(env.package_manager);
        let ckb_service_cmd = ckb_next_service_command(env.package_manager);

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
            fix_command: Some(install_cmd.clone()),
            can_auto_fix: package_check_can_auto_fix(!liquidctl_ok, &env),
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
                openrgb_missing_message(env.package_manager)
            },
            fix_command: Some(install_cmd.clone()),
            can_auto_fix: package_check_can_auto_fix(!openrgb_bin, &env),
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
        let ckb_installed = command_exists("ckb-next");
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
            fix_command: Some(ckb_service_cmd.clone()),
            can_auto_fix: !ckb_ok && ckb_installed && env.supports_systemd_auto_start(),
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
            can_auto_fix: !udev_ok && env.has_pkexec,
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
            platform: setup_environment_from_detected(&env),
            install_packages_command: install_cmd,
            ckb_next_service_command: ckb_service_cmd,
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

    pub async fn start_openrgb_server(&self) -> Result<()> {
        if !command_exists("openrgb") {
            return Err(GlowmintError::OpenRgbUnavailable(
                "openrgb binary not found".into(),
            ));
        }

        if !openrgb::is_available().await {
            Command::new("openrgb")
                .args(["--server", "--noautoconnect"])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|e| GlowmintError::OpenRgbUnavailable(e.to_string()))?;

            if !openrgb::wait_for_server(15_000).await {
                return Err(GlowmintError::OpenRgbUnavailable(
                    "OpenRGB server did not become reachable within 15 seconds".into(),
                ));
            }
        }

        openrgb::auto_configure_uninitialized_zones().await?;
        Ok(())
    }

    pub fn install_packages(&self) -> Result<InstallPackagesResult> {
        let env = detect_environment();
        if !env.supports_apt_auto_install() {
            return Err(GlowmintError::Other(
                "Auto-install is only supported on Debian/Ubuntu/Mint with polkit (pkexec)".into(),
            ));
        }

        let openrgb_url = openrgb_official_deb_url()?;
        verify_openrgb_deb_url(&openrgb_url)?;
        let script = build_install_packages_script(&openrgb_url);

        let output = Command::new("pkexec")
            .args(["sh", "-c", &script])
            .output()
            .map_err(|e| GlowmintError::Other(format!("pkexec failed: {e}")))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let log = format!("{stdout}\n{stderr}").trim().to_string();
        let success = install_succeeded(&log, output.status.success());
        let summary = parse_install_summary(&log, success);

        Ok(InstallPackagesResult {
            success,
            summary,
            log,
        })
    }

    pub fn start_ckb_next_daemon(&self) -> Result<()> {
        if !command_exists("ckb-next") {
            return Err(GlowmintError::Other(
                "ckb-next is not installed — install packages first".into(),
            ));
        }

        run_pkexec(&["systemctl", "enable", "--now", "ckb-next-daemon"]).map_err(|_| {
            GlowmintError::Other("ckb-next daemon start was cancelled or failed".into())
        })
    }
}

fn setup_environment_from_detected(env: &DetectedEnvironment) -> SetupEnvironment {
    SetupEnvironment {
        distro_label: env.distro_label.clone(),
        package_manager: env.package_manager.as_str().into(),
        supports_apt_auto_install: env.supports_apt_auto_install(),
        supports_systemd_auto_start: env.supports_systemd_auto_start(),
    }
}

fn package_check_can_auto_fix(binary_missing: bool, env: &DetectedEnvironment) -> bool {
    binary_missing && env.supports_apt_auto_install()
}

fn install_packages_command(pm: PackageManager) -> String {
    match pm {
        PackageManager::Apt => INSTALL_PACKAGES_CMD.into(),
        PackageManager::Dnf => {
            "sudo dnf install liquidctl ckb-next\n# OpenRGB: see https://openrgb.org (COPR or Flatpak)"
                .into()
        }
        PackageManager::Pacman => {
            "sudo pacman -S liquidctl\n# OpenRGB and ckb-next: often from AUR (yay -S openrgb ckb-next)"
                .into()
        }
        PackageManager::Unknown => "# Install from upstream:\n# liquidctl: https://github.com/liquidctl/liquidctl\n# OpenRGB: https://openrgb.org\n# ckb-next: https://github.com/ckb-next/ckb-next".into(),
    }
}

fn ckb_next_service_command(pm: PackageManager) -> String {
    match pm {
        PackageManager::Apt | PackageManager::Dnf | PackageManager::Pacman => {
            CKB_NEXT_SERVICE_CMD.into()
        }
        PackageManager::Unknown => {
            "sudo systemctl enable --now ckb-next-daemon  # if using systemd".into()
        }
    }
}

fn openrgb_missing_message(pm: PackageManager) -> String {
    match pm {
        PackageManager::Apt => {
            "OpenRGB not found — Install downloads the official .deb from Codeberg when apt has no package"
                .into()
        }
        PackageManager::Dnf => {
            "OpenRGB not found — install via COPR or Flatpak; see https://openrgb.org".into()
        }
        PackageManager::Pacman => {
            "OpenRGB not found — often available from AUR (e.g. yay -S openrgb)".into()
        }
        PackageManager::Unknown => "OpenRGB not found — install from https://openrgb.org".into(),
    }
}

fn openrgb_official_deb_url() -> Result<String> {
    let arch = Command::new("dpkg")
        .args(["--print-architecture"])
        .output()
        .map_err(|e| GlowmintError::Other(format!("dpkg failed: {e}")))?;

    if !arch.status.success() {
        return Err(GlowmintError::Other(
            "could not detect CPU architecture for OpenRGB package".into(),
        ));
    }

    let deb_arch = match String::from_utf8_lossy(&arch.stdout)
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "amd64" => "amd64_bookworm",
        "arm64" => "arm64_bookworm",
        "armhf" => "armhf_bookworm",
        "i386" => "i386_bookworm",
        other => {
            return Err(GlowmintError::Other(format!(
                "unsupported architecture for OpenRGB auto-install: {other}"
            )));
        }
    };

    Ok(format!(
        "https://codeberg.org/OpenRGB/OpenRGB/releases/download/{OPENRGB_RELEASE_TAG}/openrgb_1.0rc2_{deb_arch}_{OPENRGB_DEB_COMMIT}.deb"
    ))
}

fn verify_openrgb_deb_url(url: &str) -> Result<()> {
    const PREFIX: &str = "https://codeberg.org/OpenRGB/OpenRGB/releases/download/";
    if !url.starts_with(PREFIX) || !url.ends_with(".deb") {
        return Err(GlowmintError::Other(
            "internal error: invalid OpenRGB download URL".into(),
        ));
    }
    Ok(())
}

fn build_install_packages_script(openrgb_deb_url: &str) -> String {
    INSTALL_PACKAGES_SCRIPT_TEMPLATE.replace("__OPENRGB_DEB_URL__", openrgb_deb_url)
}

fn extract_install_summary_block(log: &str) -> Option<String> {
    let start = log.find("=== Glowmint install summary ===")?;
    let lines: Vec<&str> = log[start..]
        .lines()
        .take_while(|line| {
            line.starts_with("===")
                || line.starts_with("liquidctl:")
                || line.starts_with("ckb-next:")
                || line.starts_with("openrgb:")
                || line.trim().is_empty()
        })
        .collect();
    Some(lines.join("\n"))
}

fn install_succeeded(log: &str, exit_ok: bool) -> bool {
    if !exit_ok {
        return false;
    }
    if log.contains("dependency problems prevent configuration")
        || log.contains("Errors were encountered while processing")
    {
        return false;
    }
    let Some(summary) = extract_install_summary_block(log) else {
        return false;
    };
    !summary.contains("not installed")
}

fn parse_install_summary(log: &str, success: bool) -> String {
    if let Some(summary) = extract_install_summary_block(log) {
        if success {
            format!("{summary}\n\nChecks updated — review pass/fail below.")
        } else {
            format!("Install did not complete successfully.\n\n{summary}")
        }
    } else if log.contains("Request dismissed") {
        "Authentication prompt was dismissed — nothing was installed.".into()
    } else if log.is_empty() {
        if success {
            "Install finished — hit Re-check to refresh status.".into()
        } else {
            "Install failed with no output — try copying the command into a terminal.".into()
        }
    } else {
        format!(
            "{}\n\n{}",
            if success {
                "Install finished."
            } else {
                "Install failed."
            },
            truncate_log(log, 800)
        )
    }
}

fn truncate_log(log: &str, max: usize) -> String {
    if log.len() <= max {
        log.to_string()
    } else {
        format!("…{}", &log[log.len().saturating_sub(max)..])
    }
}

fn run_pkexec(args: &[&str]) -> Result<()> {
    let output = Command::new("pkexec")
        .args(args)
        .output()
        .map_err(|e| GlowmintError::Other(format!("pkexec failed: {e}")))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(GlowmintError::Other(pkexec_failure_message(&output)))
    }
}

fn pkexec_failure_message(output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("Request dismissed") {
        return "Authentication prompt was dismissed".into();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{stdout}\n{stderr}").trim().to_string();
    if combined.is_empty() {
        "Privileged operation was cancelled or failed".into()
    } else {
        combined
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
            platform: SetupEnvironment {
                distro_label: "Linux Mint".into(),
                package_manager: "apt".into(),
                supports_apt_auto_install: true,
                supports_systemd_auto_start: true,
            },
            install_packages_command: String::new(),
            ckb_next_service_command: String::new(),
            openrgb_server_command: String::new(),
        }
    }

    #[test]
    fn package_check_can_auto_fix_false_on_unknown_package_manager() {
        let env = DetectedEnvironment {
            distro_label: "Unknown".into(),
            package_manager: PackageManager::Unknown,
            has_pkexec: true,
            has_systemd: true,
        };
        assert!(!package_check_can_auto_fix(true, &env));
    }

    #[test]
    fn package_check_can_auto_fix_true_on_apt_with_pkexec() {
        let env = DetectedEnvironment {
            distro_label: "Linux Mint".into(),
            package_manager: PackageManager::Apt,
            has_pkexec: true,
            has_systemd: true,
        };
        assert!(package_check_can_auto_fix(true, &env));
    }

    #[test]
    fn parse_install_summary_extracts_summary_block() {
        let log = "apt output\n\n=== Glowmint install summary ===\nliquidctl: installed\nopenrgb: not installed";
        let summary = parse_install_summary(log, true);
        assert!(summary.contains("liquidctl: installed"));
        assert!(summary.contains("Checks updated"));
    }

    #[test]
    fn parse_install_summary_handles_dismissed_prompt() {
        let summary = parse_install_summary("Error executing command: Request dismissed", false);
        assert!(summary.contains("dismissed"));
    }

    #[test]
    fn install_succeeded_false_when_summary_lists_not_installed() {
        let log = "=== Glowmint install summary ===\nliquidctl: installed\nopenrgb: not installed";
        assert!(!install_succeeded(log, true));
    }

    #[test]
    fn install_succeeded_false_on_dpkg_dependency_error() {
        let log = "dependency problems prevent configuration of openrgb:\n=== Glowmint install summary ===\nopenrgb: installed";
        assert!(!install_succeeded(log, true));
    }

    #[test]
    fn extract_install_summary_ignores_trailing_apt_errors() {
        let log = "=== Glowmint install summary ===\nopenrgb: installed\ndpkg: dependency problems prevent configuration";
        let summary = extract_install_summary_block(log).unwrap();
        assert!(summary.contains("openrgb: installed"));
        assert!(!summary.contains("dpkg:"));
    }

    #[test]
    fn verify_openrgb_deb_url_rejects_untrusted_host() {
        assert!(verify_openrgb_deb_url("https://evil.example/openrgb.deb").is_err());
    }

    #[test]
    fn build_install_packages_script_injects_deb_url() {
        let url = "https://codeberg.org/OpenRGB/OpenRGB/releases/download/release_candidate_1.0rc2/openrgb_1.0rc2_amd64_bookworm_0fca93e.deb";
        let script = build_install_packages_script(url);
        assert!(script.contains(url));
        assert!(!script.contains("__OPENRGB_DEB_URL__"));
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
