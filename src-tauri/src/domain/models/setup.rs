use serde::{Deserialize, Serialize};

use super::device::UsbDeviceInfo;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckStatus {
    Pass,
    Fail,
    Warn,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckSeverity {
    Required,
    Recommended,
    Optional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupCheck {
    pub id: String,
    pub label: String,
    pub status: CheckStatus,
    pub severity: CheckSeverity,
    pub message: String,
    pub fix_command: Option<String>,
    pub can_auto_fix: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupReport {
    pub checks: Vec<SetupCheck>,
    pub corsair_devices: Vec<UsbDeviceInfo>,
    pub has_lcd_hardware: bool,
    pub has_aio_hardware: bool,
    pub all_required_pass: bool,
    pub install_packages_command: String,
    pub ckb_next_service_command: String,
    pub openrgb_server_command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupStatus {
    pub report: SetupReport,
    pub onboarding_complete: bool,
    pub onboarding_skipped: bool,
    pub needs_wizard: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub onboarding_completed: bool,
    pub onboarding_skipped: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub onboarding_completed_at: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            onboarding_completed: false,
            onboarding_skipped: false,
            onboarding_completed_at: None,
        }
    }
}
