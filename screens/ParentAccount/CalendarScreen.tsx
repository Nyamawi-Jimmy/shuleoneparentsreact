import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useChildEvents } from '../../hooks/useCalendar';
import { TermEvent } from '../../api/calendar.types';

export const CalendarScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild } = useSelectedChild();
  const { events, loading, refreshing, error, refresh } = useChildEvents();

  const { upcoming, earlier } = useMemo(() => splitByDate(events), [events]);

  if (!selectedChild) {
    return (
      <View style={styles.safe}>
        <ParentHeader title="School Calendar" showBack />
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="person-add-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>Pick a child from Home to view their school calendar.</Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.primaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ParentHeader title="School Calendar" showBack rightIcon="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.childCard}>
          <View style={styles.childAvatar}>
            <Text style={styles.childInitials}>{selectedChild.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{selectedChild.fullName}</Text>
            <Text style={styles.childMeta}>{selectedChild.schoolName || selectedChild.classLabel || 'School events & term dates'}</Text>
          </View>
          <Feather name="calendar" size={20} color={colors.primary} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading calendar…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {!loading && !error && events.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <Feather name="calendar" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>Your child's school hasn't published any calendar events.</Text>
          </View>
        )}

        {!loading && upcoming.length > 0 && (
          <SectionBlock title="Coming up" events={upcoming} colors={colors} styles={styles} highlight />
        )}
        {!loading && earlier.length > 0 && (
          <SectionBlock title="Earlier" events={earlier} colors={colors} styles={styles} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const SectionBlock: React.FC<{
  title: string; events: TermEvent[]; colors: ColorPalette; styles: any; highlight?: boolean;
}> = ({ title, events, colors, styles, highlight }) => (
  <View style={{ marginBottom: 8 }}>
    <Text style={styles.sectionHeading}>{title}</Text>
    {events.map((e, i) => (
      <EventCard key={e.id ?? `${title}-${i}`} event={e} colors={colors} styles={styles} highlight={highlight} />
    ))}
  </View>
);

const EventCard: React.FC<{ event: TermEvent; colors: ColorPalette; styles: any; highlight?: boolean }> = ({
  event, colors, styles, highlight,
}) => {
  const badge = dateBadge(event.startDate);
  const range = formatRange(event.startDate, event.endDate);
  const target = event.targetClass && event.targetClass.toLowerCase() !== 'all'
    ? event.targetClass
    : 'School-wide';

  return (
    <View style={styles.card}>
      <View style={[styles.dateBadge, highlight && styles.dateBadgeHi]}>
        <Text style={[styles.badgeMonth, highlight && styles.badgeMonthHi]}>{badge.month}</Text>
        <Text style={[styles.badgeDay, highlight && styles.badgeDayHi]}>{badge.day}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title || 'Untitled event'}</Text>
        {range && <Text style={styles.eventDate}>{range}</Text>}
        {event.description ? <Text style={styles.eventDesc} numberOfLines={3}>{event.description}</Text> : null}
        <View style={styles.targetChip}>
          <Ionicons name="people-outline" size={11} color={colors.primary} />
          <Text style={styles.targetText}>{target}</Text>
        </View>
      </View>
    </View>
  );
};

// ── date helpers ─────────────────────────────────────────────
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function splitByDate(events: TermEvent[]): { upcoming: TermEvent[]; earlier: TermEvent[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming: TermEvent[] = [];
  const earlier: TermEvent[] = [];
  for (const e of events) {
    const end = parse(e.endDate) ?? parse(e.startDate);
    if (end && end >= today) upcoming.push(e);
    else earlier.push(e);
  }
  const asc = (a: TermEvent, b: TermEvent) => (parse(a.startDate)?.getTime() ?? 0) - (parse(b.startDate)?.getTime() ?? 0);
  upcoming.sort(asc);
  earlier.sort((a, b) => -asc(a, b));
  return { upcoming, earlier };
}

function dateBadge(iso: string | null): { month: string; day: string } {
  const d = parse(iso);
  if (!d) return { month: '—', day: '—' };
  return { month: MONTHS[d.getMonth()], day: String(d.getDate()) };
}

function formatRange(startIso: string | null, endIso: string | null): string {
  const start = parse(startIso);
  if (!start) return '';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const startStr = start.toLocaleDateString('en-GB', opts);
  const end = parse(endIso);
  if (end && end.getTime() !== start.getTime()) {
    return `${startStr} – ${end.toLocaleDateString('en-GB', opts)}`;
  }
  return startStr;
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
    loadingText: { fontSize: 11.5, color: c.textSecondary, marginTop: 8, fontWeight: '500' },
    emptyIconCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 11.5, color: c.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
    primaryBtn: {
      marginTop: 16, backgroundColor: c.primary,
      paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    childCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, padding: 12, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 16,
    },
    childAvatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    childInitials: { color: c.primary, fontSize: 14, fontWeight: '800' },
    childName: { fontSize: 13.5, fontWeight: '700', color: c.text },
    childMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },

    sectionHeading: {
      fontSize: 11.5, fontWeight: '800', color: c.textSecondary,
      letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2,
    },

    card: {
      flexDirection: 'row', gap: 12,
      backgroundColor: c.card, padding: 12, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 10,
    },
    dateBadge: {
      width: 48, borderRadius: 12, paddingVertical: 6,
      backgroundColor: c.backgroundAlt, alignItems: 'center', justifyContent: 'center',
    },
    dateBadgeHi: { backgroundColor: c.primarySoft },
    badgeMonth: { fontSize: 10, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.5 },
    badgeMonthHi: { color: c.primary },
    badgeDay: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 1 },
    badgeDayHi: { color: c.primary },

    eventTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    eventDate: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '600' },
    eventDesc: { fontSize: 12.5, color: c.textSecondary, marginTop: 6, lineHeight: 18 },
    targetChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      backgroundColor: c.primarySoft, paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 99, marginTop: 8,
    },
    targetText: { color: c.primary, fontSize: 10.5, fontWeight: '700' },
  });
}
