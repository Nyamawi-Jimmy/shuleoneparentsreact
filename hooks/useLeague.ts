import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getLeague } from '../api/gamification';
import { LeagueBoard } from '../api/gamification.types';
import { ApiError } from '../config/api';

/** The signed-in student's weekly leaderboard (GET /api/learner/league). */
export function useLeague(top = 20) {
  const { accessToken } = useAuth();
  const [board, setBoard] = useState<LeagueBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setBoard(await getLeague(accessToken, top));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the leaderboard.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, top]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { board, loading, refreshing, error, refresh: () => load(true) };
}
