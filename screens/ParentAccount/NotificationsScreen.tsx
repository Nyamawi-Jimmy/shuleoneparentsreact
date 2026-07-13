// Notifications — inbox + per-category routing preferences, matching the web:
//   Inbox        — the same feed the web bell shows: unread banner with
//                  mark-all-read, category-tinted cards, tap marks read and
//                  follows the deep link.
//   Preferences  — the backend's canonical per-category routing map
//                  ({ FEES: { inApp, push }, ... }): one row per category
//                  with In-app and Push switches, saved on toggle.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useNotifications } from '../../hooks/useNotifications';
import {
  ParentNotification, NotificationPrefs, PREF_CATEGORIES, defaultPrefs,
} from '../../api/notifications.types';
import { getNotificationPrefs, setNotificationPrefs } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';

type Tab = 'inbox' | 'prefs';

// Category metadata — the backend's stable set, in its render order.
const CATEGORY_META: Record<string, { label: string; desc: string; icon: any }> = {
  FEES:          { label: 'Fees & payments', desc: 'Balance changes, receipts & due dates', icon: 'wallet-outline' },
  ATTENDANCE:    { label: 'Attendance', desc: 'Sign-in/out and absence alerts', icon: 'checkmark-done-outline' },
  MESSAGES:      { label: 'Messages', desc: 'New chats from teachers & staff', icon: 'chatbubbles-outline' },
  ACADEMICS:     { label: 'Academics', desc: 'Exam results & report cards', icon: 'school-outline' },
  ANNOUNCEMENTS: { label: 'Announcements', desc: 'School notices & newsletters', icon: 'megaphone-outline' },
  DIARY:         { label: 'Class diary', desc: 'New weeks & teacher comments', icon: 'book-outline' },
  TRANSPORT:     { label: 'Transport', desc: 'Bus boarding, arrival & drop-off', icon: 'bus-outline' },
  CALENDAR:      { label: 'Calendar', desc: 'Events, exams & live classes', icon: 'calendar-outline' },
};

// Map a notification's web deep link (or its category) to an app route.
function toMobileRoute(link?: string | null, category?: string | null): string | null {
  const p = `${link || ''} ${category || ''}`.toLowerCase();
  if (/fee|finance|payment/.test(p)) return '/finance';
  if (/attendance/.test(p)) return '/academics?tab=attendance';
  if (/academic|exam|result/.test(p)) return '/academics';
  if (/transport|bus/.test(p)) return '/transport';
  if (/diary/.test(p)) return '/diary';
  if (/coding|robot/.test(p)) return '/coding';
  if (/learn|progress/.test(p)) return '/learning';
  if (/communication|announce|message|notice/.test(p)) return '/communication';
  if (/calendar|event|live/.test(p)) return '/calendar';
  return null;
}

const relTime = (iso?: string | null): string => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const NotificationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('inbox');
  const {
    items, unreadCount, loading, refreshing, refresh, error, markRead, readAll,
  } = useNotifications();

  return (
    <View style={styles.root}>
      <GradientAppBar
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        showBack
      />

      {/* Floating segmented control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {([
            { id: 'inbox', label: 'Inbox', icon: 'notifications-outline', count: unreadCount },
            { id: 'prefs', label: 'Preferences', icon: 'options-outline', count: 0 },
          ] as { id: Tab; label: string; icon: any; count: number }[]).map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                activeOpacity={0.8} onPress={() => setTab(t.id)}>
                <Ionicons name={t.icon} size={14} color={active ? colors.primary : colors.textTertiary} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                {t.count > 0 && (
                  <View style={styles.segmentBadge}>
                    <Text style={styles.segmentBadgeText}>{t.count > 99 ? '99+' : t.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'inbox' ? (
        <InboxView styles={styles} colors={colors}
          items={items} unreadCount={unreadCount} loading={loading} refreshing={refreshing}
          refresh={refresh} error={error} markRead={markRead} readAll={readAll} />
      ) : (
        <PrefsView styles={styles} colors={colors} />
      )}
    </View>
  );
};

// =================================================================
// Inbox
// =================================================================
const InboxView: React.FC<{
  styles: any; colors: ColorPalette;
  items: ParentNotification[]; unreadCount: number; loading: boolean; refreshing: boolean;
  refresh: () => void; error: string | null; markRead: (id: number) => void; readAll: () => void;
}> = ({ styles, colors, items, unreadCount, loading, refreshing, refresh, error, markRead, readAll }) => (
  <ScrollView
    contentContainerStyle={styles.scroll}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
  >
    {unreadCount > 0 && (
      <View style={styles.unreadBanner}>
        <View style={styles.unreadDot}><Text style={styles.unreadDotText}>{unreadCount}</Text></View>
        <Text style={styles.unreadText}>
          {unreadCount === 1 ? '1 unread notification' : `${unreadCount} unread notifications`}
        </Text>
        <TouchableOpacity onPress={readAll} hitSlop={6}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>
    )}

    {loading && (
      <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
    )}

    {!loading && error && (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={16} color={colors.danger} />
        <Text style={styles.errorBannerText}>{error}</Text>
        <TouchableOpacity onPress={refresh} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
      </View>
    )}

    {!loading && !error && items.length === 0 && (
      <View style={styles.center}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="notifications-outline" size={28} color={colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>You’re all caught up</Text>
        <Text style={styles.emptyText}>No notifications to show right now.</Text>
      </View>
    )}

    {items.map((n, idx) => {
      const isUnread = !n.readAt;
      const meta = CATEGORY_META[(n.category ?? '').toUpperCase()];
      return (
        <TouchableOpacity
          key={n.id ?? `n-${idx}`}
          activeOpacity={0.8}
          style={[styles.card, isUnread && styles.cardUnread]}
          onPress={() => {
            if (n.id) markRead(n.id);
            // Follow the notification's deep link, like the web bell does.
            const route = toMobileRoute(n.link, n.category);
            if (route) router.push(route as any);
          }}
        >
          <View style={[styles.cardIcon, isUnread && { backgroundColor: colors.primary }]}>
            <Ionicons name={meta?.icon ?? 'notifications-outline'} size={17}
              color={isUnread ? '#FFF' : colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.cardTopRow}>
              <Text style={[styles.cardTitle, isUnread && { fontFamily: fonts.extrabold }]} numberOfLines={2}>
                {n.title ?? 'Notification'}
              </Text>
              {isUnread && <View style={styles.unreadPip} />}
            </View>
            {!!n.body && <Text style={styles.cardBody} numberOfLines={3}>{n.body}</Text>}
            <Text style={styles.cardMeta}>
              {(meta?.label ?? n.category ?? 'General')} · {relTime(n.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}

    <View style={{ height: 32 }} />
  </ScrollView>
);

// =================================================================
// Preferences — per-category In-app / Push routing, saved on toggle
// =================================================================
const PrefsView: React.FC<{ styles: any; colors: ColorPalette }> = ({ styles, colors }) => {
  const { accessToken } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saveErr, setSaveErr] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!accessToken) return;
    getNotificationPrefs(accessToken).then(setPrefs).catch(() => setPrefs(defaultPrefs()));
  }, [accessToken]));

  const toggle = (cat: string, channel: 'inApp' | 'push', value: boolean) => {
    if (!prefs || !accessToken) return;
    const next: NotificationPrefs = { ...prefs, [cat]: { ...prefs[cat], [channel]: value } };
    setPrefs(next); // optimistic
    setSaveErr(false);
    setNotificationPrefs(accessToken, next)
      .then(setPrefs)
      .catch(() => { setPrefs(prefs); setSaveErr(true); });
  };

  if (!prefs) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.prefsIntro}>
        Choose where each kind of update reaches you. In-app fills the inbox here; push alerts your phone.
      </Text>
      {saveErr && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={styles.errorBannerText}>Could not save that change — it has been undone.</Text>
        </View>
      )}

      <View style={styles.prefsCard}>
        {/* Column legend */}
        <View style={styles.prefsLegend}>
          <View style={{ flex: 1 }} />
          <Text style={styles.legendText}>In-app</Text>
          <Text style={styles.legendText}>Push</Text>
        </View>

        {PREF_CATEGORIES.map((cat, i) => {
          const meta = CATEGORY_META[cat];
          const r = prefs[cat] ?? { inApp: true, push: true };
          return (
            <View key={cat} style={[styles.prefRow, i > 0 && styles.divider]}>
              <View style={[styles.prefIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={meta?.icon ?? 'notifications-outline'} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.prefLabel}>{meta?.label ?? cat}</Text>
                <Text style={styles.prefDesc} numberOfLines={1}>{meta?.desc ?? ''}</Text>
              </View>
              <View style={styles.switchCol}>
                <Switch
                  value={r.inApp}
                  onValueChange={(v) => toggle(cat, 'inApp', v)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={r.inApp ? colors.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.switchCol}>
                <Switch
                  value={r.push}
                  onValueChange={(v) => toggle(cat, 'push', v)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={r.push ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.prefsFoot}>
        Everything is on by default. Changes apply immediately — no save button needed.
      </Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { padding: 44, alignItems: 'center', gap: 10 },

    // Floating segmented control over the app bar edge
    segmentWrap: { paddingHorizontal: 16, marginTop: -20 },
    segment: {
      flexDirection: 'row', backgroundColor: c.card, borderRadius: 14, padding: 4,
      borderWidth: 1, borderColor: c.border,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    },
    segmentBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingVertical: 10, borderRadius: 11,
    },
    segmentBtnActive: { backgroundColor: c.primarySoft },
    segmentText: { fontSize: 12.5, fontFamily: fonts.semibold, color: c.textSecondary },
    segmentTextActive: { color: c.primary, fontFamily: fonts.bold },
    segmentBadge: {
      minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },
    segmentBadgeText: { fontSize: 9.5, fontFamily: fonts.extrabold, color: '#FFF' },

    unreadBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.primarySofter, borderWidth: 1, borderColor: c.primary + '26',
      borderRadius: 13, padding: 12, marginBottom: 12,
    },
    unreadDot: {
      minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },
    unreadDotText: { color: '#FFF', fontSize: 11, fontFamily: fonts.extrabold },
    unreadText: { flex: 1, fontSize: 12.5, fontFamily: fonts.semibold, color: c.text },
    markAllText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontFamily: fonts.semibold },
    retryInline: { color: c.danger, fontFamily: fonts.extrabold, fontSize: 13 },

    emptyIconCircle: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: c.text },
    emptyText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 18 },

    card: {
      flexDirection: 'row', gap: 12,
      backgroundColor: c.card, borderRadius: 15, borderWidth: 1, borderColor: c.border,
      padding: 13, marginBottom: 9,
    },
    cardUnread: { borderColor: c.primary + '44', backgroundColor: c.primarySofter },
    cardIcon: {
      width: 38, height: 38, borderRadius: 12, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    cardTitle: { flex: 1, fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, lineHeight: 18 },
    unreadPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 4 },
    cardBody: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3, lineHeight: 18 },
    cardMeta: { fontSize: 10.5, fontFamily: fonts.medium, color: c.textTertiary, marginTop: 6 },

    // Preferences
    prefsIntro: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18, marginBottom: 12 },
    prefsCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, overflow: 'hidden',
    },
    prefsLegend: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    legendText: { width: 56, textAlign: 'center', fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
    prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    prefIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    prefLabel: { fontSize: 13, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    prefDesc: { fontSize: 10.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    switchCol: { width: 56, alignItems: 'center' },
    prefsFoot: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 12, lineHeight: 16 },
  });
}
