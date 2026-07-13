// Notifications — the inbox, matching the web bell exactly (the web has no
// preferences page, so neither does the app): unread banner with
// mark-all-read, category-tinted cards, tap marks read and follows the
// deep link.

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useNotifications } from '../../hooks/useNotifications';
import { ParentNotification } from '../../api/notifications.types';

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

      <InboxView styles={styles} colors={colors}
        items={items} unreadCount={unreadCount} loading={loading} refreshing={refreshing}
        refresh={refresh} error={error} markRead={markRead} readAll={readAll} />
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { padding: 44, alignItems: 'center', gap: 10 },


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

  });
}
