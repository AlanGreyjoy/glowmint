import { invoke } from '@tauri-apps/api/core';

import type {
  BackendHealth,
  CoolingStatus,
  Device,
  FanCurve,
  LcdStatus,
  LightingMode,
  Profile,
  PumpPreset,
  RgbColor,
  RgbDevice,
  InstallPackagesResult,
  SetupReport,
  SetupStatus,
} from './types';

export const api = {
  discoverDevices: () => invoke<Device[]>('discover_devices'),
  backendHealth: () => invoke<BackendHealth>('backend_health'),

  lcdStatus: () => invoke<LcdStatus>('lcd_status'),
  lcdSetImage: (path: string) => invoke<void>('lcd_set_image', { path }),
  lcdSetGif: (path: string, fps: number, loop: boolean) =>
    invoke<void>('lcd_set_gif', { path, fps, loop }),
  lcdSetBrightness: (brightness: number) => invoke<void>('lcd_set_brightness', { brightness }),
  lcdStopGif: () => invoke<void>('lcd_stop_gif'),

  coolingInitialize: () => invoke<void>('cooling_initialize'),
  coolingStatus: () => invoke<CoolingStatus>('cooling_status'),
  setPumpPreset: (preset: PumpPreset) => invoke<void>('set_pump_preset', { preset }),
  setPumpDuty: (duty: number) => invoke<void>('set_pump_duty', { duty }),
  setFanDuty: (fanIndex: number, duty: number) => invoke<void>('set_fan_duty', { fanIndex, duty }),
  setFanCurve: (fanIndex: number, curve: FanCurve) =>
    invoke<void>('set_fan_curve', { fanIndex, curve }),

  listRgbDevices: () => invoke<RgbDevice[]>('list_rgb_devices'),
  setZoneColor: (deviceIndex: number, zoneIndex: number, color: RgbColor) =>
    invoke<void>('set_zone_color', { deviceIndex, zoneIndex, color }),
  setDeviceMode: (deviceIndex: number, mode: LightingMode) =>
    invoke<void>('set_device_mode', { deviceIndex, mode }),

  listPeripherals: () => invoke<Device[]>('list_peripherals'),
  setPeripheralRgb: (deviceId: string, color: RgbColor) =>
    invoke<void>('set_peripheral_rgb', { deviceId, color }),
  setPeripheralDpi: (deviceId: string, dpi: number) =>
    invoke<void>('set_peripheral_dpi', { deviceId, dpi }),
  switchPeripheralProfile: (deviceId: string, profile: number) =>
    invoke<void>('switch_peripheral_profile', { deviceId, profile }),

  listProfiles: () => invoke<string[]>('list_profiles'),
  saveProfile: (profile: Profile) => invoke<void>('save_profile', { profile }),
  loadProfile: (name: string) => invoke<Profile>('load_profile', { name }),
  deleteProfile: (name: string) => invoke<void>('delete_profile', { name }),

  getSetupStatus: () => invoke<SetupStatus>('get_setup_status'),
  runSetupChecks: () => invoke<SetupReport>('run_setup_checks'),
  completeOnboarding: (skipped: boolean) => invoke<void>('complete_onboarding', { skipped }),
  resetOnboarding: () => invoke<void>('reset_onboarding'),
  installUdevRules: () => invoke<void>('install_udev_rules'),
  startOpenrgbServer: () => invoke<void>('start_openrgb_server'),
  installPackages: () => invoke<InstallPackagesResult>('install_packages'),
  startCkbNextDaemon: () => invoke<void>('start_ckb_next_daemon'),
};
