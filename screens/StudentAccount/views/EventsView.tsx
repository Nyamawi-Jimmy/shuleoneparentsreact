// Events — the student's unified schedule, ported from the web
// StudentCalendar: school events (/student/calendar, EVENT rows) + live
// classes (/student/live-classes, with a real join token). "Live now" on
// top, a tappable 7-day week strip with activity dots, then everything
// coming up in start order. Join mints a Jitsi URL and opens it.

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import {
  getStudentCalendar, getStudentLiveClasses, joinStudentLiveClass,
} from '../../../api/student';
import { StudentCalendarItem, StudentLiveClass } from '../../../api/student.types';

const EARLY_JOIN_MIN = 5;

const fmtWhen = (s: string | null | undefined) => {
  if (!s) return '';
  const hasTime = /[T ]\d{2}:\d{2}/.test(s);
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  if (isNaN(d.getTime())) return s;
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  return hasTime ? `${day} · ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}` : day;
};

type Item = (StudentCalendarItem | StudentLiveClass) & { _kind: 'EVENT' | 'CLASS' };
const startOf = (it: Item) => String((it as StudentCalendarItem).startsOn ?? (it as StudentLiveClass).startsAt ?? '');
const endOf = (it: Item) => String((it as StudentCalendarItem).endsOn ?? (it as StudentLiveClass).endsAt ?? '');
const rangeOf = (it: Item) => {
  const s = startOf(it); const e = endOf(it);
  return `${fmtWhen(s)}${e && e !== s ? ` – ${fmtWhen(e)}` : ''}`;
};

export const EventsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { accessToken } = useAuth();

  const [events, setEvents] = useState<StudentCalendarItem[] | null>(null);
  const [live, setLive] = useState<StudentLiveClass[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [joinErr, setJoinErr] = useState<Record<number, string | null>>({});
  const [dayPick, setDayPick] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    const [e, l] = await Promise.allSettled([
      getStudentCalendar(accessToken),
      getStudentLiveClasses(accessToken),
    ]);
    if (e.status === 'fulfilled' && Array.isArray(e.value)) {
      setEvents(e.value.filter((x) => x.kind !== 'CLASS'));
      setError(false);
    } else {
      setEvents((prev) => prev ?? []);
      setError(true);
    }
    setLive(l.status === 'fulfilled' && Array.isArray(l.value) ? l.value : []);
    setNowMs(Date.now());
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const canJoin = (c: StudentLiveClass) => {
    if (c.status === 'Finished') return false;
    if (c.status === 'Live') return true;
    const s = c.startsAt ? new Date(String(c.startsAt)).getTime() : NaN;
    if (isNaN(s)) return false;
    return Math.round((s - nowMs) / 60000) <= EARLY_JOIN_MIN;
  };

  const join = async (c: StudentLiveClass) => {
    if (!accessToken) return;
    setJoining(c.id);
    setJoinErr((m) => ({ ...m, [c.id]: null }));
    try {
      const res = await joinStudentLiveClass(accessToken, c.id);
      if (res?.joinUrl) await Linking.openURL(res.joinUrl);
      else setJoinErr((m) => ({ ...m, [c.id]: 'Could not open the class.' }));
    } catch (e: any) {
      setJoinErr((m) => ({ ...m, [c.id]: e?.message || 'Could not join right now.' }));
    } finally {
      setJoining(null);
    }
  };

  const title = pickByTier(tier, {
    base: '📅 Events',
    sprout: '📅 What’s Happening',
    explorer: '📅 What’s Happening',
  });

  if (events === null || live === null) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
        <Text style={styles.loadingText}>Checking the school calendar…</Text>
      </View>
    );
  }

  const classes = live.filter((c) => c.status !== 'Finished');
  const liveNow = classes.filter((c) => String(c.status).toLowerCase() === 'live');
  const coming: Item[] = [
    ...events.map((e) => ({ ...e, _kind: 'EVENT' as const })),
    ...classes.filter((c) => String(c.status).toLowerCase() !== 'live').map((c) => ({ ...c, _kind: 'CLASS' as const })),
  ].sort((a, b) => startOf(a).localeCompare(startOf(b)));

  // Week strip — the next 7 days; a dot marks days with something on.
  const dayKeyOf = (it: Item) => startOf(it).slice(0, 10);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowMs);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      dow: i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dom: d.getDate(),
      has: coming.some((it) => dayKeyOf(it) === key),
    };
  });
  const shown = dayPick ? coming.filter((it) => dayKeyOf(it) === dayPick) : coming;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />}
      >
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {error && (
          <Text style={styles.errNote}>⚠️ Couldn’t reach the school calendar — showing live classes only.</Text>
        )}

        {liveNow.length === 0 && coming.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🎈</Text>
            <Text style={styles.emptyTitle}>Nothing coming up</Text>
            <Text style={styles.emptyText}>
              Events and live classes will show here as your school schedules them. 👍
            </Text>
          </View>
        ) : (
          <>
            {/* Live now */}
            {liveNow.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionDot, { backgroundColor: '#e11d48' }]} />
                  <Text style={styles.sectionTitle}>Live now</Text>
                  <View style={styles.countBadge}><Text style={styles.countBadgeText}>{liveNow.length}</Text></View>
                </View>
                {liveNow.map((c) => (
                  <ClassCard key={`c${c.id}`} it={c} radius={tokens.radius}
                    joinable joining={joining === c.id} error={joinErr[c.id]} onJoin={() => join(c)} />
                ))}
              </View>
            )}

            {/* Week strip */}
            {coming.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setDayPick(null)}
                  style={[styles.dayChip, dayPick == null && { borderColor: 'transparent' }]}>
                  {dayPick == null ? (
                    <LinearGradient colors={[tokens.accent1, tokens.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dayOnFill}>
                      <Text style={[styles.dayDow, { color: '#fff' }]}>All</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.dayDow}>All</Text>
                  )}
                </TouchableOpacity>
                {week.map((d) => {
                  const on = dayPick === d.key;
                  return (
                    <TouchableOpacity key={d.key} activeOpacity={0.8}
                      onPress={() => setDayPick(on ? null : d.key)}
                      style={[styles.dayChip, on && { borderColor: 'transparent' }]}>
                      {on ? (
                        <LinearGradient colors={[tokens.accent1, tokens.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dayOnFill}>
                          <Text style={[styles.dayDow, { color: '#fff' }]}>{d.dow}</Text>
                          <Text style={[styles.dayDom, { color: '#fff' }]}>{d.dom}</Text>
                          {d.has && <View style={[styles.dayDot, { backgroundColor: '#fff' }]} />}
                        </LinearGradient>
                      ) : (
                        <>
                          <Text style={styles.dayDow}>{d.dow}</Text>
                          <Text style={styles.dayDom}>{d.dom}</Text>
                          {d.has && <View style={styles.dayDot} />}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Coming up */}
            {coming.length > 0 && (
              <View>
                <View style={styles.sectionHead}>
                  <View style={[styles.sectionDot, { backgroundColor: '#3aa0ff' }]} />
                  <Text style={styles.sectionTitle}>Coming up</Text>
                  <View style={styles.countBadge}><Text style={styles.countBadgeText}>{shown.length}</Text></View>
                </View>
                {shown.length === 0 && (
                  <Text style={styles.emptyText}>Nothing on this day.</Text>
                )}
                {shown.map((it, i) => (
                  it._kind === 'CLASS' ? (
                    <ClassCard key={`c${(it as StudentLiveClass).id}`} it={it as StudentLiveClass} radius={tokens.radius}
                      joinable={canJoin(it as StudentLiveClass)}
                      joining={joining === (it as StudentLiveClass).id}
                      error={joinErr[(it as StudentLiveClass).id]}
                      onJoin={() => join(it as StudentLiveClass)} />
                  ) : (
                    <EventCard key={`e${i}`} it={it as StudentCalendarItem} radius={tokens.radius} />
                  )
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// =================================================================
const EventCard: React.FC<{ it: StudentCalendarItem; radius: number }> = ({ it, radius }) => {
  const target = it.targetClass && String(it.targetClass).toLowerCase() !== 'all'
    ? `For ${it.targetClass}` : 'School-wide';
  return (
    <View style={[styles.card, { borderRadius: radius }]}>
      <View style={[styles.tile, { backgroundColor: '#e3f1ff' }]}>
        <Text style={{ fontSize: 19 }}>🎪</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{it.title ?? 'Event'}</Text>
        {!!it.description && <Text style={styles.cardMeta} numberOfLines={2}>{it.description}</Text>}
        <Text style={styles.cardWhen}>{rangeOf({ ...it, _kind: 'EVENT' })}</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: '#e3f1ff' }]}>
        <Text style={[styles.pillText, { color: '#2779c7' }]}>{target}</Text>
      </View>
    </View>
  );
};

const ClassCard: React.FC<{
  it: StudentLiveClass; radius: number; joinable: boolean;
  joining: boolean; error?: string | null; onJoin: () => void;
}> = ({ it, radius, joinable, joining, error, onJoin }) => {
  const isLive = String(it.status).toLowerCase() === 'live';
  return (
    <View style={[styles.card, { borderRadius: radius }, isLive && { borderColor: '#fda4af' }]}>
      <View style={[styles.tile, { backgroundColor: isLive ? '#ffe4e6' : '#efeaff' }]}>
        <Text style={{ fontSize: 19 }}>{isLive ? '🔴' : '🎥'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{it.title ?? 'Live class'}</Text>
        {!!it.subject && <Text style={styles.cardMeta} numberOfLines={1}>{String(it.subject)}</Text>}
        <Text style={styles.cardWhen}>{rangeOf({ ...it, _kind: 'CLASS' })}</Text>
        {!!error && <Text style={styles.joinErr}>{error}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[styles.pill, { backgroundColor: isLive ? '#ffe4e6' : '#efeaff' }]}>
          <Text style={[styles.pillText, { color: isLive ? '#e11d48' : '#5b45c9' }]}>
            {isLive ? 'Live' : 'Class'}
          </Text>
        </View>
        {joinable && (
          <TouchableOpacity activeOpacity={0.85} disabled={joining} onPress={onJoin}>
            <LinearGradient colors={isLive ? ['#e11d48', '#ff5e9c'] : ['#7c5cff', '#a78bfa']} style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>{joining ? 'Joining…' : (isLive ? 'Join now' : 'Join')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6f679c', marginTop: 14, fontWeight: '600' },
  scroll: { padding: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  errNote: {
    fontSize: 12, fontWeight: '700', color: '#b42318',
    backgroundColor: '#fff1f1', borderRadius: 12, padding: 10, marginBottom: 12, overflow: 'hidden',
  },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  countBadge: {
    minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 6,
    backgroundColor: '#e4defc', alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c5cff' },

  week: { gap: 7, paddingBottom: 14, paddingRight: 8 },
  dayChip: {
    minWidth: 54, borderRadius: 14, borderWidth: 1.5, borderColor: '#ece8fb',
    backgroundColor: '#fff', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  dayOnFill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  dayDow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, color: '#6f679c', textTransform: 'uppercase' },
  dayDom: { fontSize: 14.5, fontWeight: '800', color: '#2c2550', marginTop: 1 },
  dayDot: {
    position: 'absolute', top: 5, right: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff5e9c',
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 13, marginBottom: 9,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 7, elevation: 2,
  },
  tile: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  cardMeta: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 2, lineHeight: 16 },
  cardWhen: { fontSize: 10.5, color: '#9b94c4', fontWeight: '700', marginTop: 3 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontWeight: '800' },
  joinBtn: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },
  joinErr: { fontSize: 10.5, color: '#ef4444', fontWeight: '700', marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: '#2c2550', marginTop: 10 },
  emptyText: { fontSize: 12.5, color: '#6f679c', fontWeight: '600', marginTop: 4, textAlign: 'center', lineHeight: 18 },
});
