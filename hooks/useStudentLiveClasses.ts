import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { getStudentLiveClasses, joinStudentLiveClass } from '../api/student';
import { StudentLiveClass } from '../api/student.types';
import { ApiError } from '../config/api';

/**
 * The signed-in student's live classes, plus a join action that mints the Jitsi
 * joinUrl on demand and opens it in an in-app browser tab.
 */
export function useStudentLiveClasses() {
  const { accessToken } = useAuth();
  const [classes, setClasses] = useState<StudentLiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const list = await getStudentLiveClasses(accessToken);
      setClasses(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load live classes.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = useCallback(async (id: number): Promise<string | null> => {
    if (!accessToken) return 'Please sign in again.';
    setJoiningId(id);
    try {
      const res = await joinStudentLiveClass(accessToken, id);
      if (res?.joinUrl) { await WebBrowser.openBrowserAsync(res.joinUrl); return null; }
      return 'This class isn’t open to join yet.';
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Could not join the class.';
    } finally { setJoiningId(null); }
  }, [accessToken]);

  return { classes, loading, refreshing, error, refresh: () => load(true), join, joiningId };
}
