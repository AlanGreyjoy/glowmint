import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { BackendHealth, Device } from '../lib/types';

function formatDeviceError(err: unknown) {
  const message = String(err);
  if (message.includes('invoke')) {
    return 'Glowmint could not reach the Tauri backend. Start the app with `npm run tauri dev`.';
  }
  return message;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [found, backend] = await Promise.all([api.discoverDevices(), api.backendHealth()]);
      setDevices(found);
      setHealth(backend);
    } catch (err) {
      setError(formatDeviceError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { devices, health, loading, error, refresh };
}
