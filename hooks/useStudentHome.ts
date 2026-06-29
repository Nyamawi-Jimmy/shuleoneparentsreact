import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudentProfile, getStudentCalendar } from '../api/student';
import { getGamificationState } from '../api/gamification';
import { getLearnerProgress } from '../api/learner-progress';
import { StudentProfile, StudentCalendarItem } from '../api/student.types';
import { GamificationState, emptyGamification } from '../api/gamification.types';
import { ProgressReport, emptyProgress } from '../api/learner-progress.types';
import { ApiError } from '../config/api';

// =================================================================
// Combined home-screen data hook
// Pulls /api/student/me, /api/gamification/me, /api/learner/progress,
// and /api/student/calendar (today→+14days) in parallel.
// =================================================================

export interface StudentHomeData {
  profile: StudentProfile | null;
  gamification: GamificationState;
  progress: ProgressReport;
  calendar: StudentCalendarItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStudentHome(): StudentHomeData {
  const { accessToken } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [gamification, setGamification] = useState<GamificationState>(emptyGamification);
  const [progress, setProgress] = useState<ProgressReport>(emptyProgress);
  const [calendar, setCalendar] = useState<StudentCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (!isRefresh) setLoading(true);
    setError(null);

    const today = new Date();
    const fortnight = new Date(); fortnight.setDate(today.getDate() + 14);
    const fromDate = today.toISOString().slice(0, 10);
    const toDate = fortnight.toISOString().slice(0, 10);

    // Run all four in parallel - any one failure shouldn't block the others
    const results = await Promise.allSettled([
      getStudentProfile(accessToken),
      getGamificationState(accessToken),
      getLearnerProgress(accessToken),
      getStudentCalendar(accessToken, { from: fromDate, to: toDate }),
    ]);

    const [profileR, gamR, progR, calR] = results;

    if (profileR.status === 'fulfilled') setProfile(profileR.value);
    if (gamR.status === 'fulfilled') setGamification(gamR.value || emptyGamification);
    if (progR.status === 'fulfilled') setProgress(progR.value || emptyProgress);
    if (calR.status === 'fulfilled') setCalendar(calR.value || []);

    // Surface only the first hard error; partial data is fine
    const firstFail = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (firstFail) {
      const reason = firstFail.reason;
      setError(reason instanceof ApiError ? reason.message : 'Could not load some data.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  return { profile, gamification, progress, calendar, loading, refreshing, error, refresh };
}
