export type DeviceKind =
  | 'aio_cooler'
  | 'lcd_screen'
  | 'rgb_controller'
  | 'keyboard'
  | 'mouse'
  | 'headset'
  | 'usb_device'
  | 'unknown';

export type BackendStatus = 'available' | 'unavailable' | 'partial';

export interface BackendHealth {
  openrgb: BackendStatus;
  liquidctl: BackendStatus;
  ckb_next: BackendStatus;
}

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  vendor_id?: number;
  product_id?: number;
  backend: string;
  status: string;
  capabilities: string[];
}

export interface LcdStatus {
  connected: boolean;
  vendor_id: number;
  product_id: number;
  brightness: number;
  current_content?: {
    type: 'static' | 'gif' | 'system_stats';
    path?: string;
    fps?: number;
    interval_secs?: number;
  };
  looping: boolean;
}

export interface FanCurvePoint {
  temperature_c: number;
  duty_percent: number;
}

export interface FanCurve {
  points: FanCurvePoint[];
}

export type PumpPreset = 'quiet' | 'balanced' | 'extreme';

export interface CoolingStatus {
  water_temp_c?: number;
  probe_temp_c?: number;
  pump_speed_rpm?: number;
  pump_duty_percent?: number;
  fan_speeds_rpm: number[];
  fan_duties_percent: number[];
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface RgbZone {
  index: number;
  name: string;
  led_count: number;
  resizable: boolean;
  leds_min: number;
  leds_max: number;
  color?: RgbColor;
}

export interface RgbDevice {
  index: number;
  name: string;
  zones: RgbZone[];
}

export type LightingMode = 'static' | 'breathing' | 'rainbow';

export type CanvasDeviceSource = 'open_rgb' | 'peripheral';

export type CanvasDeviceType =
  | 'fan'
  | 'ram'
  | 'aio'
  | 'gpu'
  | 'keyboard'
  | 'mouse'
  | 'controller'
  | 'strip'
  | 'unknown';

export interface CanvasDeviceLayout {
  device_key: string;
  source: CanvasDeviceSource;
  display_name: string;
  device_type: CanvasDeviceType;
  x: number;
  y: number;
  color: RgbColor;
  lighting_mode?: LightingMode;
  zone_index?: number;
}

export interface CanvasLayout {
  devices: CanvasDeviceLayout[];
}

export interface Profile {
  name: string;
  lcd?: unknown;
  pump_preset?: string;
  fan_curve?: FanCurve;
  rgb_zones: unknown[];
  created_at: string;
}

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'unknown';
export type CheckSeverity = 'required' | 'recommended' | 'optional';

export interface UsbDeviceInfo {
  bus: string;
  device: string;
  vendor_id: number;
  product_id: number;
  description: string;
}

export interface SetupCheck {
  id: string;
  label: string;
  status: CheckStatus;
  severity: CheckSeverity;
  message: string;
  fix_command: string | null;
  can_auto_fix: boolean;
}

export interface InstallPackagesResult {
  success: boolean;
  summary: string;
  log: string;
}

export interface SetupEnvironment {
  distro_label: string;
  package_manager: 'apt' | 'dnf' | 'pacman' | 'unknown';
  supports_apt_auto_install: boolean;
  supports_systemd_auto_start: boolean;
}

export interface SetupReport {
  checks: SetupCheck[];
  corsair_devices: UsbDeviceInfo[];
  has_lcd_hardware: boolean;
  has_aio_hardware: boolean;
  all_required_pass: boolean;
  platform: SetupEnvironment;
  install_packages_command: string;
  ckb_next_service_command: string;
  openrgb_server_command: string;
}

export interface SetupStatus {
  report: SetupReport;
  onboarding_complete: boolean;
  onboarding_skipped: boolean;
  needs_wizard: boolean;
}
