import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSelectedChild } from '../context/SelectedChildContext';
import { getChildEvents, getChildLiveClasses } from '../api/communication';

export interface UpcomingItem {
  key: string;
  title: string;
  date: string;      // yyyy-MM-dd
  time?: string;     // HH:mm for live classes
  isLive?: boolean;  // live right now
  kind: 'event' | 'live';
}

function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

/** Merged, date-sorted upcoming school events + live classes for the selected child. */
export function useChildUpcoming() {
  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const studentId = selectedChild?.studentId ?? null;

  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    let events: Awaited<ReturnType<typeof getChildEvents>> = [];
    let live: Awaited<ReturnType<typeof getChildLiveClasses>> = [];
    try { events = (await getChildEvents(accessToken, studentId)) ?? []; } catch { events = []; }
    try { live = (await getChildLiveClasses(accessToken, studentId)) ?? []; } catch { live = []; }

    const evUp: UpcomingItem[] = (events ?? [])
      .filter((e) => e.startDate && new Date(`${String(e.startDate).slice(0, 10)}T00:00:00`) >= todayStart)
      .map((e) => ({ key: `ev-${e.id}`, title: e.title || 'Event', date: String(e.startDate).slice(0, 10), kind: 'event' as const }));

    const liveUp: UpcomingItem[] = (live ?? [])
      .filter((c) => c.status === 'Live' || c.status === 'Upcoming')
      .map((c) => ({
        key: `lv-${c.id}`, title: c.title || 'Live class',
        date: String(c.startsOn || '').slice(0, 10), time: fmtTime(c.startsOn),
        isLive: c.status === 'Live', kind: 'live' as const,
      }));

    const merged = [...liveUp, ...evUp]
      .sort((a, b) => {
        const d = String(a.date).localeCompare(String(b.date));
        if (d !== 0) return d;
        return a.kind === b.kind ? 0 : a.kind === 'live' ? -1 : 1;
      })
      .slice(0, 5);

    setItems(merged);
    setLoading(false);
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { items, loading };
}
