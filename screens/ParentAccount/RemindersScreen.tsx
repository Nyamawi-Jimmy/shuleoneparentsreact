import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useChildReminders } from '../../hooks/useChildReminders';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { ParentReminder } from '../../api/notifications.types';

const SOURCE_META: Record<string, { icon: any; bg: string; color: string; label: string }> = {
  LIVE_CLASS:  { icon: 'videocam',         bg: colors.purpleLight, color: colors.purple,  label: 'Live Class' },
  EVENT:       { icon: 'calendar',         bg: colors.infoSoft,    color: colors.info,    label: 'Event' },
  DIARY:       { icon: 'book',             bg: colors.primarySoft, color: colors.primary, label: 'Diary' },
  FEE_DUE:     { icon: 'wallet',           bg: colors.warningSoft, color: colors.warning, label: 'Fee Due' },
  ASSIGNMENT:  { icon: 'document-text',    bg: colors.successSoft, color: colors.success, label: 'Assignment' },
  EXAM:        { icon: 'school',           bg: colors.dangerSoft,  color: colors.danger,  label: 'Exam' },
};

export const RemindersScreen: React.FC = () => {
  const { selectedChild } = useSelectedChild();
  const { items, loading, refreshing, refresh, error, cancelReminder } = useChildReminders();

  // Group: upcoming (notifyAt in future) vs past (firedAt set or notifyAt past)
  const now = Date.now();
  const upcoming = items.filter((r) => {
    const t = r.notifyAt ? new Date(r.notifyAt).getTime() : 0;
    return !r.firedAt && t >= now;
  }).sort((a, b) => compareNotifyAsc(a, b));
  const past = items.filter((r) => {
    const t = r.notifyAt ? new Date(r.notifyAt).getTime() : 0;
    return !!r.firedAt || t < now;
  }).sort((a, b) => -compareNotifyAsc(a, b));

  const handleCancel = (r: ParentReminder) => {
    if (!r.sourceType || !r.sourceId) return;
    Alert.alert(
      'Cancel reminder?',
      `You won't be reminded about "${r.title ?? 'this'}" anymore.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel reminder',
          style: 'destructive',
          onPress: () => cancelReminder(r.sourceType!, r.sourceId!),
        },
      ],
    );
  };

  return (
    <View style={styles.safe}>
      <ParentHeader title="Reminders" showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {selectedChild && (
          <View style={styles.childCard}>
            <View style={styles.childAvatar}>
              <Text style={styles.childInitials}>{selectedChild.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{selectedChild.fullName}</Text>
              <Text style={styles.childMeta}>{selectedChild.classLabel || 'Selected child'}</Text>
            </View>
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.primary} />
          </View>
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh} hitSlop={6}>
              <Text style={styles.retryInline}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && items.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="alarm-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No reminders set</Text>
            <Text style={styles.emptyText}>
              Tap "Set reminder" on a live class, event, or assignment to be alerted before it starts.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryBtn}
              onPress={() => router.push('/communication' as any)}
            >
              <Text style={styles.primaryBtnText}>Browse Communication</Text>
            </TouchableOpacity>
          </View>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.map((r) => (
              <ReminderCard key={r.id ?? Math.random()} item={r} onCancel={() => handleCancel(r)} />
            ))}
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Past" count={past.length}>
            {past.map((r) => (
              <ReminderCard key={r.id ?? Math.random()} item={r} muted onCancel={() => handleCancel(r)} />
            ))}
          </Section>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
// Reminder card
// =================================================================
const ReminderCard: React.FC<{
  item: ParentReminder; muted?: boolean; onCancel: () => void;
}> = ({ item, muted, onCancel }) => {
  const meta = SOURCE_META[(item.sourceType ?? '').toUpperCase()] ?? {
    icon: 'notifications', bg: colors.primarySoft, color: colors.primary, label: item.sourceType ?? 'Reminder',
  };

  return (
    <View style={[styles.card, muted && { opacity: 0.6 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.typePill, { color: meta.color, backgroundColor: meta.bg }]}>
              {meta.label.toUpperCase()}
            </Text>
            {item.firedAt && (
              <View style={styles.firedPill}>
                <Ionicons name="checkmark" size={10} color={colors.success} />
                <Text style={styles.firedPillText}>FIRED</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title ?? 'Reminder'}
          </Text>
          <View style={styles.timeRow}>
            <Feather name="clock" size={12} color={colors.textSecondary} />
            <Text style={styles.cardMeta}>
              {formatWhen(item.startsAt, item.notifyAt, item.leadMinutes)}
            </Text>
          </View>
        </View>
        <TouchableOpacity hitSlop={8} onPress={onCancel} style={styles.cancelBtn}>
          <Feather name="x" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =================================================================
// Section
// =================================================================
const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
    {children}
  </View>
);

// =================================================================
// Helpers
// =================================================================
function compareNotifyAsc(a: ParentReminder, b: ParentReminder): number {
  const tA = a.notifyAt ? new Date(a.notifyAt).getTime() : 0;
  const tB = b.notifyAt ? new Date(b.notifyAt).getTime() : 0;
  return tA - tB;
}

function formatWhen(startsAt: string | null, notifyAt: string | null, lead: number | null): string {
  if (!startsAt) return '—';
  try {
    const s = new Date(startsAt);
    if (isNaN(s.getTime())) return startsAt;
    const dateStr = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const leadPart = lead ? ` · alert ${lead}m before` : '';
    return `${dateStr} · ${time}${leadPart}`;
  } catch { return startsAt; }
}

// =================================================================
// Styles
// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundAlt },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  childCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg, ...shadows.card,
  },
  childAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  childInitials: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  childName: { ...typography.bodyBold, color: colors.text },
  childMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyText: { ...typography.caption, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  primaryBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingVertical: 11, borderRadius: radius.lg,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerSoft, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
  },
  errorBannerText: { flex: 1, color: colors.danger, fontSize: 12.5, fontWeight: '700' },
  retryInline: { color: colors.danger, fontWeight: '800', fontSize: 13 },

  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: spacing.sm, marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 11.5, fontWeight: '800', color: colors.primary,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  sectionCount: {
    backgroundColor: colors.primarySoft,
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 99, alignItems: 'center', justifyContent: 'center',
  },
  sectionCountText: { color: colors.primary, fontSize: 10.5, fontWeight: '800' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardIcon: {
    width: 40, height: 40, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  typePill: {
    fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99, overflow: 'hidden',
  },
  firedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
  },
  firedPillText: { fontSize: 9, fontWeight: '800', color: colors.success, letterSpacing: 0.4 },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  cancelBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center', justifyContent: 'center',
  },
});
