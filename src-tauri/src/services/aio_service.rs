use std::sync::Arc;

use crate::domain::error::Result;
use crate::domain::models::fan_curve::{CoolingStatus, FanCurve, PumpPreset};
use crate::domain::models::lcd::LcdStatus;
use crate::domain::traits::{CoolingController, LcdController};

pub struct AioService {
    lcd: Arc<dyn LcdController>,
    cooling: Arc<dyn CoolingController>,
}

impl AioService {
    pub fn new(lcd: Arc<dyn LcdController>, cooling: Arc<dyn CoolingController>) -> Self {
        Self { lcd, cooling }
    }

    pub async fn lcd_status(&self) -> Result<LcdStatus> {
        self.lcd.status().await
    }

    pub async fn set_lcd_image(&self, path: &str) -> Result<()> {
        self.lcd.set_image(path).await
    }

    pub async fn set_lcd_gif(&self, path: &str, fps: u32, r#loop: bool) -> Result<()> {
        self.lcd.set_gif(path, fps, r#loop).await
    }

    pub async fn set_lcd_brightness(&self, brightness: u8) -> Result<()> {
        self.lcd.set_brightness(brightness).await
    }

    pub async fn stop_lcd_gif(&self) -> Result<()> {
        self.lcd.stop_gif().await
    }

    pub async fn initialize_cooling(&self) -> Result<()> {
        self.cooling.initialize().await
    }

    pub async fn cooling_status(&self) -> Result<CoolingStatus> {
        self.cooling.status().await
    }

    pub async fn set_pump_preset(&self, preset: PumpPreset) -> Result<()> {
        self.cooling.set_pump_preset(preset).await
    }

    pub async fn set_pump_duty(&self, duty: u8) -> Result<()> {
        self.cooling.set_pump_duty(duty).await
    }

    pub async fn set_fan_duty(&self, fan_index: u8, duty: u8) -> Result<()> {
        self.cooling.set_fan_duty(fan_index, duty).await
    }

    pub async fn set_fan_curve(&self, fan_index: u8, curve: FanCurve) -> Result<()> {
        self.cooling.set_fan_curve(fan_index, &curve).await
    }
}
