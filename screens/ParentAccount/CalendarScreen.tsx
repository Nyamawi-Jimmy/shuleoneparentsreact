import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { useChildEvents } from '../../hooks/useCalendar';
import { useLiveClasses } from '../../hooks/useLiveClasses';
import { TermEvent, LiveClass } from '../../api/communication.types';
import { listChildReminders, setReminder, cancelReminder } from '../../api/notifications';

type Cat = 'all' | 'school' | 'live';
interface AgendaItem {
  id: string; kind: 'event' | 'live'; category: 'school' | 'live';
  title: string; desc: string; dateKey: string; time: string; isNow: boolean;
  live?: LiveClass;
}

const toKey = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '');
const localKey = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const todayKey = () => localKey(new Date());
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const timeLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const CalendarScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild } = useSelectedChild();
  const { accessToken } = useAuth();
  const { events, loading, refreshing, error, refresh } = useChildEvents();
  const { liveClasses, join, joiningId } = useLiveClasses();

  const [filter, setFilter] = useState<Cat>('all');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const studentId = selectedChild?.studentId ?? null;
  const TODAY = todayKey();

  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setReminders(new Set()); return; }
    listChildReminders(accessToken, studentId)
      .then((rows) => setReminders(new Set((rows ?? []).map((r) => `${r.sourceType}:${r.sourceId}`))))
      .catch(() => {});
  }, [accessToken, studentId]));

  const agenda: AgendaItem[] = useMemo(() => {
    const items: AgendaItem[] = [];
    (events ?? []).forEach((e: TermEvent) => {
      if (!e.startDate) return;
      items.push({
        id: `EV:${e.id}`, kind: 'event', category: 'school',
        title: e.title || 'School event', desc: e.className || 'School event',
        dateKey: toKey(e.startDate), time: 'All day', isNow: false,
      });
    });
    (liveClasses ?? []).forEach((c: LiveClass) => {
      const st = String(c.status || '').toUpperCase();
      if (st === 'ENDED') return;
      const now = st === 'LIVE';
      items.push({
        id: `LV:${c.id}`, kind: 'live', category: 'live',
        title: c.title || 'Live class', desc: c.className || 'Live class',
        dateKey: toKey(c.startsOn), time: now ? 'Now' : timeLabel(c.startsOn), isNow: now, live: c,
      });
    });
    return items;
  }, [events, liveClasses]);

  const filtered = filter === 'all' ? agenda : agenda.filter((i) => i.category === filter);
  const upcoming = useMemo(() =>
    filtered.filter((i) => i.dateKey && (i.dateKey >= TODAY || i.isNow))
      .sort((a, b) => (a.isNow === b.isNow ? a.dateKey.localeCompare(b.dateKey) || a.time.localeCompare(b.time) : a.isNow ? -1 : 1)),
    [filtered, TODAY]);

  const byDay = useMemo(() => {
    const m: Record<string, AgendaItem[]> = {};
    filtered.forEach((i) => { if (i.dateKey) (m[i.dateKey] = m[i.dateKey] || []).push(i); });
    return m;
  }, [filtered]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

  const toggleReminder = async (item: AgendaItem) => {
    if (!accessToken || studentId == null || !item.live?.id) return;
    const key = `LIVE_CLASS:${item.live.id}`;
    if (busyKey === key) return;
    setBusyKey(key);
    const isSet = reminders.has(key);
    setReminders((prev) => { const n = new Set(prev); isSet ? n.delete(key) : n.add(key); return n; });
    try {
      if (isSet) await cancelReminder(accessToken, 'LIVE_CLASS', String(item.live.id));
      else await setReminder(accessToken, studentId, {
        sourceType: 'LIVE_CLASS', sourceId: String(item.live.id),
        title: item.title, startsAt: item.live.startsOn || new Date().toISOString(),
      });
    } catch {
      setReminders((prev) => { const n = new Set(prev); isSet ? n.add(key) : n.delete(key); return n; });
    } finally { setBusyKey(null); }
  };

  const FILTERS: { id: Cat; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'school', label: 'School events', icon: 'calendar' },
    { id: 'live', label: 'Live classes', icon: 'radio' },
  ];

  if (!selectedChild) {
    return (
      <View style={styles.root}>
        <GradientAppBar title="Calendar" showBack />
        <View style={styles.center}>
          <Ionicons name="person-add-outline" size={30} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Pick a child from Home to view their calendar.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GradientAppBar title="Calendar" subtitle={`${selectedChild.firstName || selectedChild.fullName}’s schedule, events & live classes`} showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity key={f.id} style={[styles.filterChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]} activeOpacity={0.8} onPress={() => setFilter(f.id)}>
                <Ionicons name={f.icon} size={13} color={active ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.filterText, active && { color: '#FFF' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error && <View style={styles.errorBox}><Text style={styles.errorText}>Couldn’t load the calendar just now.</Text></View>}

        {/* Week at a glance */}
        <View style={styles.weekHead}>
          <Text style={styles.sectionTitle}>This week at a glance</Text>
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekStart(addDays(weekStart, -7))} hitSlop={6}><Ionicons name="chevron-back" size={16} color={colors.textSecondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setWeekStart(startOfWeek(new Date()))}><Text style={styles.weekLabel}>{weekLabel}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekStart(addDays(weekStart, 7))} hitSlop={6}><Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        </View>
        <View style={styles.weekGrid}>
          {weekDays.map((day) => {
            const key = localKey(day);
            const items = byDay[key] || [];
            const isToday = key === TODAY;
            return (
              <View key={key} style={[styles.dayCell, isToday && { borderColor: colors.primary, backgroundColor: colors.primarySofter }]}>
                <Text style={[styles.dayCellLabel, isToday && { color: colors.primary }]}>{day.toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
                <Text style={[styles.dayCellNum, isToday && { color: colors.primary }]}>{day.getDate()}</Text>
                <View style={styles.dayDots}>
                  {items.slice(0, 3).map((it, i) => <View key={i} style={[styles.dayDot, { backgroundColor: it.category === 'live' ? colors.primary : colors.info }]} />)}
                </View>
              </View>
            );
          })}
        </View>

        {/* Upcoming */}
        <Text style={styles.sectionTitle}>Upcoming events</Text>
        {loading && agenda.length === 0 ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={30} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nothing coming up</Text>
            <Text style={styles.emptyText}>School events, exams and live classes appear here as the school schedules them.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {upcoming.slice(0, 20).map((i) => {
              const d = new Date(i.dateKey + 'T00:00:00');
              const dateLabel = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const tone = i.category === 'live' ? colors.primary : colors.info;
              const reminded = i.live?.id ? reminders.has(`LIVE_CLASS:${i.live.id}`) : false;
              return (
                <View key={i.id} style={styles.eventCard}>
                  <View style={[styles.eventIcon, { backgroundColor: tone + '1A' }]}>
                    <Ionicons name={i.category === 'live' ? 'radio' : 'calendar'} size={18} color={tone} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{i.title}</Text>
                    <Text style={styles.eventDesc} numberOfLines={1}>{i.desc}</Text>
                    <View style={styles.eventMetaRow}>
                      <View style={[styles.eventChip, { backgroundColor: tone + '14' }]}><Text style={[styles.eventChipText, { color: tone }]}>{i.isNow ? 'Live now' : i.category === 'live' ? 'Live class' : 'School'}</Text></View>
                      <Text style={styles.eventDate}>{dateLabel}{i.time ? ` · ${i.time}` : ''}</Text>
                    </View>
                  </View>
                  {i.kind === 'live' && (
                    <View style={styles.eventActions}>
                      {(i.isNow || i.live?.status) && (
                        <TouchableOpacity style={[styles.joinBtn, i.isNow && { backgroundColor: colors.success }]} activeOpacity={0.85} disabled={joiningId === i.live?.id} onPress={() => i.live?.id && join(i.live.id)}>
                          {joiningId === i.live?.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.joinBtnText}>{i.isNow ? 'Join' : 'Open'}</Text>}
                        </TouchableOpacity>
                      )}
                      {!i.isNow && (
                        <TouchableOpacity style={styles.bellBtn} hitSlop={6} onPress={() => toggleReminder(i)}>
                          <Ionicons name={reminded ? 'notifications' : 'notifications-outline'} size={18} color={reminded ? colors.primary : colors.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { padding: 40, alignItems: 'center', gap: 12 },

    filterRow: { gap: 8, paddingBottom: 2, marginBottom: 18 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
    filterText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.textSecondary },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 14 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger },

    weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    weekNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    weekNavBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    weekLabel: { fontSize: 11.5, fontFamily: fonts.bold, color: c.text, paddingHorizontal: 6 },
    weekGrid: {
      flexDirection: 'row', gap: 5, marginBottom: 24,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 8,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    dayCell: { flex: 1, borderWidth: 1, borderColor: 'transparent', borderRadius: 11, paddingVertical: 8, alignItems: 'center', minHeight: 68, backgroundColor: c.backgroundAlt },
    dayCellLabel: { fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary },
    dayCellNum: { fontSize: 14, fontFamily: fonts.extrabold, color: c.text, marginTop: 2 },
    dayDots: { flexDirection: 'row', gap: 2, marginTop: 6, minHeight: 6 },
    dayDot: { width: 5, height: 5, borderRadius: 3 },

    sectionTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 30, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 13 },
    eventIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    eventDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 1 },
    eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    eventChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    eventChipText: { fontSize: 10, fontFamily: fonts.bold },
    eventDate: { fontSize: 11, fontFamily: fonts.medium, color: c.textTertiary },
    eventActions: { alignItems: 'center', gap: 6 },
    joinBtn: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
    joinBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },
    bellBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  });
}
