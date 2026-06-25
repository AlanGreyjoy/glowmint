use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GlowmintError {
    #[error("device not found: {0}")]
    DeviceNotFound(String),

    #[error("OpenRGB unavailable: {0}")]
    OpenRgbUnavailable(String),

    #[error("liquidctl failed: {0}")]
    LiquidctlFailed(String),

    #[error("ckb-next unavailable: {0}")]
    CkbNextUnavailable(String),

    #[error("LCD error: {0}")]
    LcdError(String),

    #[error("profile error: {0}")]
    ProfileError(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

impl Serialize for GlowmintError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, GlowmintError>;
