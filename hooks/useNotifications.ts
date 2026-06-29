import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from '../api/notifications';
import { ParentNotification } from '../api/notifications.types';
import { ApiError } from '../config/api';

export function useNotifications() {
  const { accessToken } = useAuth();

  const [items, setItems] = useState<ParentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        listNotifications(accessToken),
        getUnreadCount(accessToken).catch(() => 0 as any),
      ]);
      setItems(list ?? []);
      // Backend may return { count: N } or just a number
      setUnreadCount(typeof count === 'number' ? count : count?.count ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = useCallback(async (id: number) => {
    if (!accessToken) return;
    // Optimistic update
    setItems((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(accessToken, id);
    } catch {
      // Rollback on failure
      load();
    }
  }, [accessToken, load]);

  const readAll = useCallback(async () => {
    if (!accessToken) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => n.readAt ? n : { ...n, readAt: now }));
    setUnreadCount(0);
    try {
      await markAllRead(accessToken);
    } catch {
      load();
    }
  }, [accessToken, load]);

  return {
    items,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    markRead,
    readAll,
  };
}
