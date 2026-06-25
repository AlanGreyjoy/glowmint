use crate::domain::error::Result;
use crate::domain::models::canvas::CanvasLayout;
use crate::stores::CanvasStore;

pub struct CanvasService {
    store: CanvasStore,
}

impl CanvasService {
    pub fn new(store: CanvasStore) -> Result<Self> {
        Ok(Self { store })
    }

    pub fn load_layout(&self) -> Result<CanvasLayout> {
        self.store.load()
    }

    pub fn save_layout(&self, layout: CanvasLayout) -> Result<()> {
        self.store.save(&layout)
    }
}
