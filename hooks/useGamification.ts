import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getGamificationState, getBadgeCatalog } from '../api/gamification';
import { GamificationState, Badge } from '../api/gamification.types';
import { ApiError } from '../config/api';

export function useGamification() {
  const { accessToken } = useAuth();

  const [state, setState] = useState<GamificationState | null>(null);
  const [catalog, setCatalog] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        getGamificationState(accessToken),
        getBadgeCatalog(accessToken).catch(() => []),
      ]);
      setState(s);
      setCatalog(c ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load gamification.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Optimistic XP add (e.g., after completing a stage)
  const addXpOptimistic = useCallback((amount: number) => {
    setState((s) => s ? { ...s, totalXp: (s.totalXp ?? 0) + amount } : s);
  }, []);

  return {
    state,
    catalog,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    addXpOptimistic,
  };
}
