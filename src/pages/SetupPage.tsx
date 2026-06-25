import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core';

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
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Setup</Title>
          <Text size="sm" c="dimmed">
            System checks, permissions, and profiles
          </Text>
        </div>
        {onRerunWizard ? (
          <Button variant="light" onClick={onRerunWizard}>
            Run setup wizard again
          </Button>
        ) : null}
      </Group>

      {report ? (
        <SetupChecklist
          report={report}
          message={message}
          onRefresh={() => void refreshChecks()}
          onMessage={setMessage}
          refreshing={refreshing}
        />
      ) : (
        <Text size="sm" c="dimmed">
          Loading setup checks…
        </Text>
      )}

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          Profiles
        </Title>
        <Group mb="md">
          <TextInput
            flex={1}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Profile name"
          />
          <Button onClick={() => void saveProfile()}>Save</Button>
        </Group>
        {profiles.length === 0 ? (
          <Text size="sm" c="dimmed">
            No profiles saved yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {profiles.map((name) => (
              <Group
                key={name}
                justify="space-between"
                p="xs"
                bg="dark.8"
                style={{ borderRadius: 8 }}
              >
                <Text size="sm">{name}</Text>
                <Button
                  variant="light"
                  size="compact-sm"
                  onClick={() =>
                    void api
                      .loadProfile(name)
                      .then(() => setMessage(`Loaded profile ${name}`))
                      .catch((err) => setMessage(String(err)))
                  }
                >
                  Load
                </Button>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
