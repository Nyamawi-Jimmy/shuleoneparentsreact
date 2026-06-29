import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { ParentHeader } from '../../components/ParentHeader';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';
import { useNotifications } from '../../hooks/useNotifications';
import { ParentNotification, NotificationPrefs, emptyPrefs } from '../../api/notifications.types';
import { getNotificationPrefs, setNotificationPrefs } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';

type Tab = 'inbox' | 'prefs';

const CATEGORIES: { key: string; label: string; icon: any; emoji: string }[] = [
  { key: 'FEES',           label: 'Fees & Payments',  icon: 'cash-outline',           emoji: '💳' },
  { key: 'ATTENDANCE',     label: 'Attendance',       icon: 'checkmark-circle-outline', emoji: '🚸' },
  { key: 'ACADEMICS',      label: 'Exam Results',     icon: 'school-outline',         emoji: '📊' },
  { key: 'COMMUNICATION',  label: 'School Notices',   icon: 'megaphone-outline',      emoji: '📣' },
  { key: 'TRANSPORT',      label: 'Bus & Transport',  icon: 'bus-outline',            emoji: '🚌' },
  { key: 'LEARNING',       label: 'Learning Progress',icon: 'book-outline',           emoji: '🧠' },
  { key: 'MARKETING',      label: 'Tips & Offers',    icon: 'sparkles-outline',       emoji: '✨' },
];

type Channel = 'push' | 'sms' | 'email' | 'whatsapp';
const CHANNELS: { key: Channel; label: string; icon: any; color: string }[] = [
  { key: 'push',     label: 'Push',     icon: 'notifications-outline', color: '#7c5cff' },
  { key: 'sms',      label: 'SMS',      icon: 'chatbox-outline',       color: '#15c98c' },
  { key: 'email',    label: 'Email',    icon: 'mail-outline',          color: '#3aa0ff' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',         color: '#25d366' },
];

export const NotificationsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('inbox');

  return (
    <View style={styles.safe}>
      <ParentHeader title="Notifications" showBack />

      {/* Tab switcher */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsRow}>
          {(['inbox', 'prefs'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              activeOpacity={0.85}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'inbox' ? 'Inbox' : 'Preferences'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'inbox' ? <InboxView /> : <PrefsView />}
    </View>
  );
};

// =================================================================
// Inbox tab
// =================================================================
const InboxView: React.FC = () => {
  const {
    items, unreadCount, loading, refreshing, refresh, error, markRead, readAll,
  } = useNotifications();

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadDot}>
            <Text style={styles.unreadDotText}>{unreadCount}</Text>
          </View>
          <Text style={styles.unreadText}>
            {unreadCount === 1 ? '1 unread notification' : `${unreadCount} unread notifications`}
          </Text>
          <TouchableOpacity onPress={readAll} hitSlop={6}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
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
            <Ionicons name="notifications-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptyText}>
            No notifications to show right now.
          </Text>
        </View>
      )}

      {items.map((n) => (
        <NotificationCard key={n.id ?? Math.random()} item={n} onPress={() => n.id && markRead(n.id)} />
      ))}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
};

const NotificationCard: React.FC<{ item: ParentNotification; onPress: () => void }> = ({ item, onPress }) => {
  const isUnread = !item.readAt;
  const category = (item.category ?? '').toUpperCase();
  const meta = CATEGORIES.find((c) => c.key === category);
  const iconName = meta?.icon ?? 'notifications-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, isUnread && styles.cardUnread]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, isUnread && styles.cardIconUnread]}>
          <Ionicons name={iconName} size={18} color={isUnread ? '#fff' : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title ?? 'Notification'}
            </Text>
            {isUnread && <View style={styles.unreadPip} />}
          </View>
          {!!item.body && (
            <Text style={styles.cardBody} numberOfLines={3}>{item.body}</Text>
          )}
          <Text style={styles.cardMeta}>
            {meta?.label ?? category} • {formatRelative(item.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// =================================================================
// Preferences tab
// =================================================================
const PrefsView: React.FC = () => {
  const { accessToken } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(emptyPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const p = await getNotificationPrefs(accessToken);
        setPrefs(p);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load preferences');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const toggle = (channel: Channel, category: string) => {
    setPrefs((prev) => {
      const current = prev[channel] || {};
      // Default to true for unset categories so toggling first time turns them OFF visually
      const cur = current[category] ?? true;
      return {
        ...prev,
        [channel]: { ...current, [category]: !cur },
      };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const updated = await setNotificationPrefs(accessToken, prefs);
      setPrefs(updated);
      setDirty(false);
      Alert.alert('Saved', 'Your notification preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.prefsIntro}>
          Choose which channels deliver each type of alert.
        </Text>

        <View style={styles.channelsLegend}>
          {CHANNELS.map((ch) => (
            <View key={ch.key} style={styles.legendItem}>
              <Ionicons name={ch.icon} size={13} color={ch.color} />
              <Text style={styles.legendText}>{ch.label}</Text>
            </View>
          ))}
        </View>

        {CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.catCard}>
            <View style={styles.catHeader}>
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catTitle}>{cat.label}</Text>
            </View>
            <View style={styles.channelsRow}>
              {CHANNELS.map((ch) => {
                const on = prefs[ch.key][cat.key] ?? true;
                return (
                  <View key={ch.key} style={styles.channelCell}>
                    <View style={[styles.channelIcon, on && { backgroundColor: ch.color }]}>
                      <Ionicons
                        name={ch.icon}
                        size={13}
                        color={on ? '#fff' : '#9b94c4'}
                      />
                    </View>
                    <Switch
                      value={on}
                      onValueChange={() => toggle(ch.key, cat.key)}
                      trackColor={{ false: '#e5e7eb', true: ch.color }}
                      thumbColor="#fff"
                      ios_backgroundColor="#e5e7eb"
                      style={styles.switch}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {dirty && (
        <View style={styles.saveBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={save}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

// =================================================================
// Helpers
// =================================================================
function formatRelative(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

// =================================================================
// Styles
// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundAlt },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  tabsWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9,
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  loadingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  emptyIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyText: { ...typography.caption, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.lg, marginBottom: spacing.md,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    minWidth: 22, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 99, alignItems: 'center', justifyContent: 'center',
  },
  unreadDotText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  unreadText: { flex: 1, fontSize: 12.5, color: colors.primary, fontWeight: '700' },
  markAllText: { color: colors.primary, fontSize: 12.5, fontWeight: '800' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerSoft, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
  },
  errorBannerText: { flex: 1, color: colors.danger, fontSize: 12.5, fontWeight: '700' },
  retryInline: { color: colors.danger, fontWeight: '800', fontSize: 13 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardUnread: { backgroundColor: '#FFF', borderColor: colors.primarySoft, borderLeftWidth: 3, borderLeftColor: colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardIcon: {
    width: 38, height: 38, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconUnread: { backgroundColor: colors.primary },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardTitle: { flex: 1, ...typography.bodyBold, color: colors.text },
  unreadPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 7 },
  cardBody: { ...typography.body, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  cardMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 6 },

  // Prefs tab
  prefsIntro: {
    ...typography.caption, color: colors.textSecondary,
    marginBottom: spacing.md, lineHeight: 18,
  },
  channelsLegend: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10.5, color: colors.textSecondary, fontWeight: '700' },

  catCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.card,
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: spacing.sm,
  },
  catEmoji: { fontSize: 22 },
  catTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  channelsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#f5f3fa',
  },
  channelCell: { alignItems: 'center', gap: 4 },
  channelIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f4f1ff',
    alignItems: 'center', justifyContent: 'center',
  },
  switch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },

  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 10,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
