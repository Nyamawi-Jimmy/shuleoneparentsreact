import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getParentHome, ParentHome } from '../api/home';
import { ApiError } from '../config/api';

/**
 * Parent "Today" feed — status line, needs-attention actions, timeline signals.
 * Parent-level (server aggregates the parent's children).
 */
export function useParentHome() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<ParentHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || user?.userType !== 'PARENT') {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const d = await getParentHome(accessToken);
      setData(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your home.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, user?.userType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { data, loading, refreshing, error, refresh: () => load(true) };
}
