import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getStudentMe, getStudentFees, getStudentCalendar } from '../api/student';
import { StudentProfile, StudentCalendarItem } from '../api/student.types';
import { FeeSummary } from '../api/fees.types';
import { ApiError } from '../config/api';

// =================================================================
// useStudentProfile - GET /api/student/me
// =================================================================
export function useStudentProfile() {
  const { accessToken, user } = useAuth();
  const isStudent = user?.userType === 'STUDENT';

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !isStudent) { setLoading(false); return; }
    setError(null);
    try {
      const p = await getStudentMe(accessToken);
      setProfile(p);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isStudent]);

  useEffect(() => { load(); }, [load]);

  return { profile, loading, error, refresh: load };
}

// =================================================================
// useStudentFees - GET /api/student/fees
// =================================================================
export function useStudentFees() {
  const { accessToken, user } = useAuth();
  const isStudent = user?.userType === 'STUDENT';

  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || !isStudent) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const f = await getStudentFees(accessToken);
      setFees(f);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load fees.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, isStudent]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { fees, loading, refreshing, error, refresh: () => load(true) };
}

// =================================================================
// useStudentCalendar - GET /api/student/calendar
// =================================================================
export function useStudentCalendar(filters?: { from?: string; to?: string }) {
  const { accessToken, user } = useAuth();
  const isStudent = user?.userType === 'STUDENT';

  const [items, setItems] = useState<StudentCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || !isStudent) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const list = await getStudentCalendar(accessToken, filters);
      setItems(list ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load calendar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, isStudent, filters?.from, filters?.to]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { items, loading, refreshing, error, refresh: () => load(true) };
}
