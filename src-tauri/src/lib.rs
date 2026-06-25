mod cache;
mod domain;
mod drivers;
mod services;
mod state;
mod stores;

use state::build_app_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = build_app_state().expect("failed to initialize Glowmint services");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            state::discover_devices,
            state::backend_health,
            state::lcd_status,
            state::lcd_set_image,
            state::lcd_set_gif,
            state::lcd_set_brightness,
            state::lcd_preview_data_url,
            state::lcd_stop_gif,
            state::cooling_initialize,
            state::cooling_status,
            state::set_pump_preset,
            state::set_pump_duty,
            state::set_fan_duty,
            state::set_fan_curve,
            state::list_rgb_devices,
            state::set_zone_color,
            state::set_device_mode,
            state::resize_rgb_zone,
            state::list_peripherals,
            state::set_peripheral_rgb,
            state::set_peripheral_dpi,
            state::switch_peripheral_profile,
            state::list_profiles,
            state::save_profile,
            state::load_profile,
            state::delete_profile,
            state::load_canvas_layout,
            state::save_canvas_layout,
            state::get_setup_status,
            state::run_setup_checks,
            state::complete_onboarding,
            state::reset_onboarding,
            state::install_udev_rules,
            state::start_openrgb_server,
            state::install_packages,
            state::start_ckb_next_daemon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Glowmint");
}
