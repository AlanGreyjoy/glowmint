use std::path::PathBuf;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::canvas::CanvasLayout;

pub struct CanvasStore {
    path: PathBuf,
}

impl CanvasStore {
    pub fn new() -> Result<Self> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| GlowmintError::Other("no config dir".to_string()))?
            .join("glowmint");
        std::fs::create_dir_all(&config_dir)?;
        Ok(Self {
            path: config_dir.join("canvas_layout.json"),
        })
    }

    pub fn load(&self) -> Result<CanvasLayout> {
        if !self.path.exists() {
            return Ok(CanvasLayout::default());
        }
        let data = std::fs::read_to_string(&self.path)?;
        serde_json::from_str(&data).map_err(|e| GlowmintError::Other(e.to_string()))
    }

    pub fn save(&self, layout: &CanvasLayout) -> Result<()> {
        let json = serde_json::to_string_pretty(layout)
            .map_err(|e| GlowmintError::Other(e.to_string()))?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }
}
