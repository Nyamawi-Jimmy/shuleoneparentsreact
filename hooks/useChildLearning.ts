import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildLearningReport, getChildInsights, ChildInsights } from '../api/guardian';
import { ProgressReport } from '../api/learner-progress.types';
import { ApiError } from '../config/api';

/**
 * Loads the selected child's learning report (+ optional AI insights) for the
 * parent Learning screen. Follows the app's useState + useFocusEffect pattern.
 */
export function useChildLearning() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [report, setReport] = useState<ProgressReport | null>(null);
  const [insights, setInsights] = useState<ChildInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const r = await getChildLearningReport(accessToken, studentId);
      setReport(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load learning progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // Insights are optional (Premium / may be inactive) — never block the screen.
    try {
      const i = await getChildInsights(accessToken, studentId);
      setInsights(i);
    } catch {
      setInsights(null);
    }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { report, insights, loading, refreshing, error, refresh: () => load(true) };
}
