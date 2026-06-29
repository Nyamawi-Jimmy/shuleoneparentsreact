import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildAcademics, getChildAttendance } from '../api/academics';
import { AcademicReport, ChildAttendance } from '../api/academics.types';
import { ApiError } from '../config/api';

export function useChildAcademics() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [data, setData] = useState<AcademicReport | null>(null);
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
      const d = await getChildAcademics(accessToken, studentId);
      setData(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load academics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    data,
    exams: data?.exams ?? [],
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}

export function useChildAttendance(filters?: { from?: string; to?: string }) {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [data, setData] = useState<ChildAttendance | null>(null);
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
      const d = await getChildAttendance(accessToken, studentId, filters);
      setData(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load attendance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, studentId, filters?.from, filters?.to]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    data,
    summary: data?.summary ?? null,
    days: data?.summary?.days ?? [],
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}
