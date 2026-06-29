import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import {
  getAnnouncements,
  getChildLiveClasses,
  getChildEvents,
} from '../api/communication';
import {
  Announcement,
  LiveClass,
  TermEvent,
} from '../api/communication.types';
import { ApiError } from '../config/api';

export interface UseCommunicationResult {
  announcements: Announcement[];
  liveClasses: LiveClass[];
  events: TermEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the three Communication feeds in parallel.
 *
 * - Announcements: parent-wide (not child-scoped)
 * - Live Classes: scoped to selected child
 * - Term Events: scoped to selected child
 *
 * Auto-refetches on focus and when the selected child changes.
 */
export function useCommunication(): UseCommunicationResult {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [events, setEvents] = useState<TermEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentId = selectedChild?.studentId ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [ann, lc, ev] = await Promise.all([
        getAnnouncements(accessToken),
        studentId != null
          ? getChildLiveClasses(accessToken, studentId)
          : Promise.resolve([] as LiveClass[]),
        studentId != null
          ? getChildEvents(accessToken, studentId)
          : Promise.resolve([] as TermEvent[]),
      ]);
      setAnnouncements(ann ?? []);
      setLiveClasses(lc ?? []);
      setEvents(ev ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load communication.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return {
    announcements,
    liveClasses,
    events,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}
