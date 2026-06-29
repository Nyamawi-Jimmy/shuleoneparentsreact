import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getLearnerProgress, markLessonComplete } from '../api/learner-progress';
import { LessonProgress } from '../api/learner-progress.types';
import { ApiError } from '../config/api';

interface UseLearnerProgressArgs {
  subjectId?: number;
  grade?: number;
}

export function useLearnerProgress(args: UseLearnerProgressArgs = {}) {
  const { accessToken } = useAuth();

  const [items, setItems] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const list = await getLearnerProgress(accessToken, args);
      setItems(list ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load progress.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, args.subjectId, args.grade]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Mark a lesson complete. Optimistically updates the local item first,
   * then syncs with the server. Optionally passes a quizPercent.
   */
  const completeLesson = useCallback(async (lessonId: number, quizPercent?: number) => {
    if (!accessToken) throw new Error('Not signed in');

    // Optimistic: flip status to COMPLETED locally
    setItems((prev) => prev.map((p) => p.lessonId === lessonId
      ? {
          ...p,
          status: 'COMPLETED',
          quizPassed: quizPercent != null ? (quizPercent ?? 0) >= 50 : p.quizPassed,
          lastQuizPercent: quizPercent ?? p.lastQuizPercent,
        }
      : p,
    ));

    try {
      const updated = await markLessonComplete(accessToken, lessonId, quizPercent != null ? { quizPercent } : undefined);
      // Sync with server
      setItems((prev) => prev.map((p) =>
        p.lessonId === updated.lessonId ? updated : p,
      ));
      return updated;
    } catch (e) {
      // Rollback on failure - reload
      load();
      throw e;
    }
  }, [accessToken, load]);

  return {
    items,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    completeLesson,
  };
}
