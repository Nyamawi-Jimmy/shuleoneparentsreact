import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import {
  listChildReminders,
  setReminder as apiSetReminder,
  cancelReminder as apiCancelReminder,
} from '../api/notifications';
import { ParentReminder, SetReminderRequest } from '../api/notifications.types';
import { ApiError } from '../config/api';

export function useChildReminders() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [items, setItems] = useState<ParentReminder[]>([]);
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
      const list = await listChildReminders(accessToken, studentId);
      setItems(list ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load reminders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setReminder = useCallback(async (body: SetReminderRequest) => {
    if (!accessToken || studentId == null) throw new Error('Not ready');
    const created = await apiSetReminder(accessToken, studentId, body);
    setItems((prev) => [created, ...prev.filter(
      (p) => !(p.sourceType === created.sourceType && p.sourceId === created.sourceId),
    )]);
    return created;
  }, [accessToken, studentId]);

  const cancelReminder = useCallback(async (sourceType: string, sourceId: string) => {
    if (!accessToken) return;
    // Optimistic remove
    setItems((prev) => prev.filter(
      (p) => !(p.sourceType === sourceType && p.sourceId === sourceId),
    ));
    try {
      await apiCancelReminder(accessToken, sourceType, sourceId);
    } catch {
      load();
    }
  }, [accessToken, load]);

  return {
    items,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    setReminder,
    cancelReminder,
  };
}
