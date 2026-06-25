use std::path::PathBuf;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::setup::AppConfig;

pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn new() -> Result<Self> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| GlowmintError::Other("no config dir".to_string()))?
            .join("glowmint");
        std::fs::create_dir_all(&config_dir)?;
        Ok(Self {
            path: config_dir.join("config.json"),
        })
    }

    pub fn load(&self) -> Result<AppConfig> {
        if !self.path.exists() {
            return Ok(AppConfig::default());
        }
        let data = std::fs::read_to_string(&self.path)?;
        serde_json::from_str(&data).map_err(|e| GlowmintError::Other(e.to_string()))
    }

    pub fn save(&self, config: &AppConfig) -> Result<()> {
        let json = serde_json::to_string_pretty(config)
            .map_err(|e| GlowmintError::Other(e.to_string()))?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }

    pub fn is_onboarding_complete(&self) -> Result<bool> {
        Ok(self.load()?.onboarding_completed)
    }

    pub fn mark_onboarding_complete(&self, skipped: bool) -> Result<()> {
        let mut config = self.load()?;
        config.onboarding_completed = true;
        config.onboarding_skipped = skipped;
        config.onboarding_completed_at = Some(chrono::Utc::now().to_rfc3339());
        self.save(&config)
    }

    pub fn reset_onboarding(&self) -> Result<()> {
        self.save(&AppConfig::default())
    }

    pub fn is_onboarding_skipped(&self) -> Result<bool> {
        Ok(self.load()?.onboarding_skipped)
    }
}
