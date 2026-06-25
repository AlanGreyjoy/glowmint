import { useCallback, useEffect, useState } from 'react';

import { Button, EmptyState, Input, ListItemCard, PageHeader, SectionCard } from '../components/ui';
import { SetupChecklist } from '../features/setup/SetupChecklist';
import { api } from '../lib/api';
import type { Profile, SetupReport } from '../lib/types';

interface SetupPageProps {
  onRerunWizard?: () => void;
}

export function SetupPage({ onRerunWizard }: SetupPageProps) {
  const [report, setReport] = useState<SetupReport | null>(null);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('default');
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshChecks = useCallback(async () => {
    setRefreshing(true);
    try {
      setReport(await api.runSetupChecks());
    } catch (err) {
      setMessage(String(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshProfiles = async () => {
    try {
      setProfiles(await api.listProfiles());
    } catch (err) {
      setMessage(String(err));
    }
  };

  useEffect(() => {
    void refreshChecks();
    void refreshProfiles();
  }, [refreshChecks]);

  const saveProfile = async () => {
    const profile: Profile = {
      name: profileName,
      rgb_zones: [],
      created_at: new Date().toISOString(),
    };
    try {
      await api.saveProfile(profile);
      setMessage(`Saved profile "${profileName}"`);
      await refreshProfiles();
    } catch (err) {
      setMessage(String(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Setup"
        description="System checks, permissions, and profiles"
        actions={
          onRerunWizard ? (
            <Button variant="secondary" onClick={onRerunWizard}>
              Run setup wizard again
            </Button>
          ) : undefined
        }
      />

      {report ? (
        <SetupChecklist
          report={report}
          message={message}
          onRefresh={refreshChecks}
          onMessage={setMessage}
          refreshing={refreshing}
        />
      ) : (
        <EmptyState message="" loading loadingMessage="Loading setup checks…" />
      )}

      <SectionCard title="Profiles">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="min-w-[200px] flex-1"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Profile name"
          />
          <Button onClick={() => void saveProfile()}>Save</Button>
        </div>
        {profiles.length === 0 ? (
          <EmptyState message="No profiles saved yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((name) => (
              <ListItemCard key={name} padding="xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{name}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void api
                        .loadProfile(name)
                        .then(() => setMessage(`Loaded profile ${name}`))
                        .catch((err) => setMessage(String(err)))
                    }
                  >
                    Load
                  </Button>
                </div>
              </ListItemCard>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
