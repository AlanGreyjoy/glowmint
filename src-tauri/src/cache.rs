use std::time::{Duration, Instant};

use tokio::sync::Mutex;

use crate::domain::error::Result;

/// Coalescing time-to-live cache for an async, fallible computation.
///
/// A successful value is reused until `ttl` elapses; errors are never cached. Because the
/// `tokio` mutex is held across the refresh `await`, concurrent callers share a single
/// in-flight computation instead of each hitting the hardware/subprocess (which matters for
/// the dashboard/AIO pages that poll the same commands every few seconds).
pub struct TtlCache<T> {
    ttl: Duration,
    slot: Mutex<Option<(Instant, T)>>,
}

impl<T: Clone> TtlCache<T> {
    pub fn new(ttl: Duration) -> Self {
        Self {
            ttl,
            slot: Mutex::new(None),
        }
    }

    pub async fn get_or_refresh<F, Fut>(&self, refresh: F) -> Result<T>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T>>,
    {
        let mut slot = self.slot.lock().await;
        if let Some((stored_at, value)) = slot.as_ref() {
            if stored_at.elapsed() < self.ttl {
                return Ok(value.clone());
            }
        }
        let value = refresh().await?;
        *slot = Some((Instant::now(), value.clone()));
        Ok(value)
    }
}
