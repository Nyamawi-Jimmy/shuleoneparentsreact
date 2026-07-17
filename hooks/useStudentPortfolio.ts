import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getStudentProfile, getStudentPortfolio } from '../api/student';
import { StudentPortfolio } from '../api/student.types';
import { ApiError } from '../config/api';

/**
 * The signed-in student's portfolio. The endpoint is keyed by studentId, so we
 * resolve it from the profile first (mirrors the web, which passes studentId in).
 */
export function useStudentPortfolio() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<StudentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const profile = await getStudentProfile(accessToken);
      const sid = profile?.studentId ?? null;
      if (sid == null) { setData({ stats: null, projects: [], skills: [] }); return; }
      setData(await getStudentPortfolio(accessToken, sid));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your portfolio.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    stats: data?.stats ?? null,
    projects: data?.projects ?? [],
    skills: data?.skills ?? [],
    loading, refreshing, error, refresh: () => load(true),
  };
}
