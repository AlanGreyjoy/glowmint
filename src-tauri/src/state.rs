use std::sync::Arc;

use crate::domain::models::canvas::CanvasLayout;
use crate::domain::models::device::{BackendHealth, Device};
use crate::domain::models::fan_curve::{CoolingStatus, FanCurve, PumpPreset};
use crate::domain::models::lcd::LcdStatus;
use crate::domain::models::profile::Profile;
use crate::domain::models::rgb::{LightingMode, RgbColor, RgbDevice};
use crate::domain::models::setup::{SetupReport, SetupStatus};
use crate::services::{
    AioService, CanvasService, DeviceService, LightingService, PeripheralService, ProfileService,
    SetupService,
};

pub struct AppState {
    pub devices: DeviceService,
    pub aio: AioService,
    pub lighting: LightingService,
    pub peripherals: PeripheralService,
    pub profiles: ProfileService,
    pub setup: SetupService,
    pub canvas: CanvasService,
}

impl AppState {
    pub fn new(
        devices: DeviceService,
        aio: AioService,
        lighting: LightingService,
        peripherals: PeripheralService,
        profiles: ProfileService,
        setup: SetupService,
        canvas: CanvasService,
    ) -> Self {
        Self {
            devices,
            aio,
            lighting,
            peripherals,
            profiles,
            setup,
            canvas,
        }
    }
}

pub fn build_app_state() -> Result<AppState, crate::domain::error::GlowmintError> {
    use crate::domain::traits::{
        CoolingController, LcdController, PeripheralController, RgbController,
    };
    use crate::drivers::{CkbNextDriver, CorsairLcdDriver, LiquidctlDriver, OpenRgbDriver};
    use crate::stores::{CanvasStore, ConfigStore, ProfileStore};

    let lcd: Arc<dyn LcdController> = Arc::new(CorsairLcdDriver::new());
    let cooling: Arc<dyn CoolingController> = Arc::new(LiquidctlDriver::new());

    // Single shared instances so the OpenRGB connection cache and ckb-next
    // device cache are reused by both discovery and the per-domain services.
    let rgb = Arc::new(OpenRgbDriver::new());
    let peripherals = Arc::new(CkbNextDriver::new());

    Ok(AppState::new(
        DeviceService::new(Arc::clone(&rgb), Arc::clone(&peripherals)),
        AioService::new(lcd, cooling),
        LightingService::new(Arc::clone(&rgb) as Arc<dyn RgbController>),
        PeripheralService::new(Arc::clone(&peripherals) as Arc<dyn PeripheralController>),
        ProfileService::new(ProfileStore::new()?)?,
        SetupService::new(ConfigStore::new()?)?,
        CanvasService::new(CanvasStore::new()?)?,
    ))
}

#[tauri::command]
pub async fn discover_devices(state: tauri::State<'_, AppState>) -> Result<Vec<Device>, String> {
    state.devices.discover().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn backend_health(state: tauri::State<'_, AppState>) -> Result<BackendHealth, String> {
    Ok(state.devices.backend_health().await)
}

#[tauri::command]
pub async fn lcd_status(state: tauri::State<'_, AppState>) -> Result<LcdStatus, String> {
    state.aio.lcd_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lcd_set_image(state: tauri::State<'_, AppState>, path: String) -> Result<(), String> {
    state
        .aio
        .set_lcd_image(&path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lcd_set_gif(
    state: tauri::State<'_, AppState>,
    path: String,
    fps: u32,
    r#loop: bool,
) -> Result<(), String> {
    state
        .aio
        .set_lcd_gif(&path, fps, r#loop)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lcd_set_brightness(
    state: tauri::State<'_, AppState>,
    brightness: u8,
) -> Result<(), String> {
    state
        .aio
        .set_lcd_brightness(brightness)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lcd_preview_data_url(path: String) -> Result<String, String> {
    // Decode + downscale + encode is CPU-bound; keep it off the async runtime.
    tokio::task::spawn_blocking(move || {
        crate::drivers::corsair_lcd::lcd_file_preview_data_url(&path)
    })
    .await
    .map_err(|e| format!("preview task failed: {e}"))?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lcd_stop_gif(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.aio.stop_lcd_gif().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cooling_initialize(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .aio
        .initialize_cooling()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cooling_status(state: tauri::State<'_, AppState>) -> Result<CoolingStatus, String> {
    state.aio.cooling_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_pump_preset(
    state: tauri::State<'_, AppState>,
    preset: PumpPreset,
) -> Result<(), String> {
    state
        .aio
        .set_pump_preset(preset)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_pump_duty(state: tauri::State<'_, AppState>, duty: u8) -> Result<(), String> {
    state
        .aio
        .set_pump_duty(duty)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_fan_duty(
    state: tauri::State<'_, AppState>,
    fan_index: u8,
    duty: u8,
) -> Result<(), String> {
    state
        .aio
        .set_fan_duty(fan_index, duty)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_fan_curve(
    state: tauri::State<'_, AppState>,
    fan_index: u8,
    curve: FanCurve,
) -> Result<(), String> {
    state
        .aio
        .set_fan_curve(fan_index, curve)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_rgb_devices(state: tauri::State<'_, AppState>) -> Result<Vec<RgbDevice>, String> {
    state
        .lighting
        .list_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_zone_color(
    state: tauri::State<'_, AppState>,
    device_index: usize,
    zone_index: usize,
    color: RgbColor,
) -> Result<(), String> {
    state
        .lighting
        .set_zone_color(device_index, zone_index, color)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_device_mode(
    state: tauri::State<'_, AppState>,
    device_index: usize,
    mode: LightingMode,
) -> Result<(), String> {
    state
        .lighting
        .set_device_mode(device_index, mode)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_peripherals(state: tauri::State<'_, AppState>) -> Result<Vec<Device>, String> {
    state
        .peripherals
        .list_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_peripheral_rgb(
    state: tauri::State<'_, AppState>,
    device_id: String,
    color: RgbColor,
) -> Result<(), String> {
    state
        .peripherals
        .set_rgb(&device_id, color)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_peripheral_dpi(
    state: tauri::State<'_, AppState>,
    device_id: String,
    dpi: u16,
) -> Result<(), String> {
    state
        .peripherals
        .set_dpi(&device_id, dpi)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn switch_peripheral_profile(
    state: tauri::State<'_, AppState>,
    device_id: String,
    profile: u8,
) -> Result<(), String> {
    state
        .peripherals
        .switch_profile(&device_id, profile)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_profiles(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    state.profiles.list().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_profile(state: tauri::State<'_, AppState>, profile: Profile) -> Result<(), String> {
    state.profiles.save(profile).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_profile(state: tauri::State<'_, AppState>, name: String) -> Result<Profile, String> {
    state.profiles.load(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_profile(state: tauri::State<'_, AppState>, name: String) -> Result<(), String> {
    state.profiles.delete(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_canvas_layout(state: tauri::State<'_, AppState>) -> Result<CanvasLayout, String> {
    state.canvas.load_layout().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_canvas_layout(
    state: tauri::State<'_, AppState>,
    layout: CanvasLayout,
) -> Result<(), String> {
    state.canvas.save_layout(layout).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_setup_status(state: tauri::State<'_, AppState>) -> Result<SetupStatus, String> {
    state.setup.get_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_setup_checks(state: tauri::State<'_, AppState>) -> Result<SetupReport, String> {
    state.setup.run_checks().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn complete_onboarding(state: tauri::State<'_, AppState>, skipped: bool) -> Result<(), String> {
    state
        .setup
        .complete_onboarding(skipped)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_onboarding(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.setup.reset_onboarding().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_udev_rules(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.setup.install_udev_rules().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_openrgb_server(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .setup
        .start_openrgb_server()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resize_rgb_zone(
    state: tauri::State<'_, AppState>,
    device_index: usize,
    zone_index: usize,
    led_count: usize,
) -> Result<(), String> {
    state
        .lighting
        .resize_zone(device_index, zone_index, led_count)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn install_packages(
    state: tauri::State<'_, AppState>,
) -> Result<crate::domain::models::setup::InstallPackagesResult, String> {
    state.setup.install_packages().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_ckb_next_daemon(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .setup
        .start_ckb_next_daemon()
        .map_err(|e| e.to_string())
}
