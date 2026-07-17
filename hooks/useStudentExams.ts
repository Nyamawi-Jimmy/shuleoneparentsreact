import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getStudentAcademics } from '../api/student';
import { AcademicReport } from '../api/academics.types';
import { ApiError } from '../config/api';

/** The signed-in student's school exam results (GET /api/student/academics). */
export function useStudentExams() {
  const { accessToken } = useAuth();
  const [report, setReport] = useState<AcademicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      setReport(await getStudentAcademics(accessToken));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your exams.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { report, exams: report?.exams ?? [], loading, refreshing, error, refresh: () => load(true) };
}
