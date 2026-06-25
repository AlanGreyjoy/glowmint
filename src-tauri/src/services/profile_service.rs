use crate::domain::error::Result;
use crate::domain::models::profile::Profile;
use crate::stores::ProfileStore;

pub struct ProfileService {
    store: ProfileStore,
}

impl ProfileService {
    pub fn new(store: ProfileStore) -> Result<Self> {
        Ok(Self { store })
    }

    pub fn list(&self) -> Result<Vec<String>> {
        self.store.list()
    }

    pub fn save(&self, profile: Profile) -> Result<()> {
        self.store.save(&profile)
    }

    pub fn load(&self, name: &str) -> Result<Profile> {
        self.store.load(name)
    }

    pub fn delete(&self, name: &str) -> Result<()> {
        self.store.delete(name)
    }
}
