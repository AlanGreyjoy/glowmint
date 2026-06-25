use std::path::PathBuf;

use crate::domain::error::{GlowmintError, Result};
use crate::domain::models::profile::Profile;

pub struct ProfileStore {
    root: PathBuf,
}

impl ProfileStore {
    pub fn new() -> Result<Self> {
        let root = dirs::config_dir()
            .ok_or_else(|| GlowmintError::ProfileError("no config dir".to_string()))?
            .join("glowmint")
            .join("profiles");
        std::fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    fn profile_path(&self, name: &str) -> PathBuf {
        self.root.join(format!("{name}.json"))
    }

    pub fn save(&self, profile: &Profile) -> Result<()> {
        let path = self.profile_path(&profile.name);
        let json = serde_json::to_string_pretty(profile)
            .map_err(|e| GlowmintError::ProfileError(e.to_string()))?;
        std::fs::write(path, json)?;
        Ok(())
    }

    pub fn load(&self, name: &str) -> Result<Profile> {
        let path = self.profile_path(name);
        let data = std::fs::read_to_string(path)
            .map_err(|e| GlowmintError::ProfileError(format!("profile not found: {e}")))?;
        serde_json::from_str(&data).map_err(|e| GlowmintError::ProfileError(e.to_string()))
    }

    pub fn list(&self) -> Result<Vec<String>> {
        let mut names = Vec::new();
        for entry in std::fs::read_dir(&self.root)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    names.push(stem.to_string());
                }
            }
        }
        names.sort();
        Ok(names)
    }

    pub fn delete(&self, name: &str) -> Result<()> {
        let path = self.profile_path(name);
        std::fs::remove_file(path)?;
        Ok(())
    }
}

impl Default for ProfileStore {
    fn default() -> Self {
        Self::new().expect("failed to create profile store")
    }
}
