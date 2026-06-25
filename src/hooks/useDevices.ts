import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { BackendHealth, Device } from '../lib/types';

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
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { devices, health, loading, error, refresh };
}
