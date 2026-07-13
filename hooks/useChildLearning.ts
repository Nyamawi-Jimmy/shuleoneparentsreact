import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import {
  getChildLearningReport, getChildQuests, getChildInsights,
  ChildInsights, QuestSummary,
} from '../api/guardian';
import { ProgressReport } from '../api/learner-progress.types';
import { ApiError } from '../config/api';

/**
 * Loads the selected child's learning report + quests (+ optional AI insights)
 * for the parent Learning screen. Follows the useState + useFocusEffect pattern.
 */
export function useChildLearning() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [report, setReport] = useState<ProgressReport | null>(null);
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [insights, setInsights] = useState<ChildInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightsRefreshing, setInsightsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    // Report + quests are the backbone — load together, tolerate quest failure.
    try {
      const [r, q] = await Promise.allSettled([
        getChildLearningReport(accessToken, studentId),
        getChildQuests(accessToken, studentId),
      ]);
      if (r.status === 'fulfilled') setReport(r.value);
      else throw r.reason;
      setQuests(q.status === 'fulfilled' && Array.isArray(q.value) ? q.value : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load learning progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // Insights are optional (Premium / may be inactive) — never block the screen.
    try {
      setInsights(await getChildInsights(accessToken, studentId));
    } catch {
      setInsights(null);
    }
  }, [accessToken, studentId]);

  const refreshInsights = useCallback(async () => {
    if (!accessToken || studentId == null || insightsRefreshing) return;
    setInsightsRefreshing(true);
    try {
      setInsights(await getChildInsights(accessToken, studentId, true));
    } catch {
      /* keep the cached insight on failure */
    } finally {
      setInsightsRefreshing(false);
    }
  }, [accessToken, studentId, insightsRefreshing]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    report, quests, insights, loading, refreshing, insightsRefreshing, error,
    refresh: () => load(true), refreshInsights, studentId,
  };
}
