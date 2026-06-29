import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import {
  getTransportChildren, listOptOuts, createOptOut, deleteOptOut,
} from '../api/transport';
import { ChildTransport, OptOut, OptOutRequest } from '../api/transport.types';
import { ApiError } from '../config/api';

export function useTransport() {
  const { accessToken } = useAuth();

  const [children, setChildren] = useState<ChildTransport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const list = await getTransportChildren(accessToken);
      setChildren(list ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load transport.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    children, loading, refreshing, error,
    refresh: () => load(true),
  };
}

export function useOptOuts() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [items, setItems] = useState<OptOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    setError(null);
    try {
      const list = await listOptOuts(accessToken, studentId);
      setItems(list ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load opt-outs.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submitOptOut = useCallback(async (body: OptOutRequest) => {
    if (!accessToken || studentId == null) throw new Error('Not ready');
    const created = await createOptOut(accessToken, studentId, body);
    setItems((prev) => [created, ...prev]);
    return created;
  }, [accessToken, studentId]);

  const removeOptOut = useCallback(async (optOutId: number) => {
    if (!accessToken || studentId == null) return;
    setItems((prev) => prev.filter((o) => o.id !== optOutId));
    try { await deleteOptOut(accessToken, studentId, optOutId); }
    catch { load(); }
  }, [accessToken, studentId, load]);

  return { items, loading, error, refresh: load, submitOptOut, removeOptOut };
}
