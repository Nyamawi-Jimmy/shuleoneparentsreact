import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { getPrefs, setPrefs as savePrefs } from '../../api/notifications';
import { NotificationPrefs } from '../../api/notifications.types';

type NotificationChannel = 'push' | 'sms' | 'email' | 'whatsapp';

interface Category {
  id: string;
  label: string;
  description: string;
  emoji: string;
  required: boolean;
  channels: Record<NotificationChannel, boolean>;
}

// Default categories shown when backend has none yet
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'attendance',  label: 'Attendance',           emoji: '🎒', required: true,  description: 'Daily check-in, late arrivals, absences',
    channels: { push: true, sms: true, email: false, whatsapp: false } },
  { id: 'fees',        label: 'Fees & Payments',      emoji: '💳', required: false, description: 'Receipts, balances, due-date reminders',
    channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'academic',    label: 'Academic Reports',     emoji: '📚', required: false, description: 'Exam results, term reports, teacher comments',
    channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'communication', label: 'School Announcements', emoji: '📢', required: false, description: 'Notices, newsletters, live class invites',
    channels: { push: true, sms: false, email: true, whatsapp: false } },
  { id: 'transport',   label: 'Transport',            emoji: '🚌', required: false, description: 'Bus arrival, route changes, opt-outs',
    channels: { push: true, sms: true, email: false, whatsapp: false } },
  { id: 'events',      label: 'Events & Reminders',   emoji: '📅', required: false, description: 'Term events, PTA meetings, school holidays',
    channels: { push: true, sms: false, email: true, whatsapp: false } },
];

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: any; color: string }> = {
  push:     { label: 'Push',     icon: 'notifications-outline', color: '#7c5cff' },
  sms:      { label: 'SMS',      icon: 'chatbox-outline',       color: '#15c98c' },
  email:    { label: 'Email',    icon: 'mail-outline',          color: '#3aa0ff' },
  whatsapp: { label: 'WhatsApp', icon: 'logo-whatsapp',         color: '#25d366' },
};
const CHANNELS: NotificationChannel[] = ['push', 'sms', 'email', 'whatsapp'];

export const NotificationPreferencesScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { accessToken } = useAuth();

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load real prefs ───
  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    (async () => {
      try {
        const prefs = await getPrefs(accessToken);
        const merged = mergeWithDefaults(DEFAULT_CATEGORIES, prefs);
        setCategories(merged);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load preferences.');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const toggle = (catId: string, channel: NotificationChannel) => {
    setCategories((prev) => prev.map((c) =>
      c.id === catId
        ? { ...c, channels: { ...c.channels, [channel]: !c.channels[channel] } }
        : c,
    ));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      const payload = categoriesToPrefs(categories);
      await savePrefs(accessToken, payload);
      setDirty(false);
      Alert.alert('Saved', 'Your notification preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <ParentHeader title="Notifications" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading preferences…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Choose what reaches you</Text>
            <Text style={styles.introSub}>
              Pick which channels deliver each type of alert. Required alerts (like attendance) can't be turned off completely.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color={colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.legend}>
            {CHANNELS.map((ch) => {
              const meta = CHANNEL_META[ch];
              return (
                <View key={ch} style={styles.legendItem}>
                  <Ionicons name={meta.icon} size={14} color={meta.color} />
                  <Text style={styles.legendText}>{meta.label}</Text>
                </View>
              );
            })}
          </View>

          {categories.map((cat) => (
            <View key={cat.id} style={styles.catCard}>
              <View style={styles.catHeader}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.catTitleRow}>
                    <Text style={styles.catTitle}>{cat.label}</Text>
                    {cat.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>REQUIRED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.catDesc}>{cat.description}</Text>
                </View>
              </View>

              <View style={styles.channelsRow}>
                {CHANNELS.map((ch) => {
                  const meta = CHANNEL_META[ch];
                  const on = cat.channels[ch];
                  return (
                    <View key={ch} style={styles.channelCell}>
                      <View style={[styles.channelIcon, on && { backgroundColor: meta.color }]}>
                        <Ionicons name={meta.icon} size={14} color={on ? '#fff' : colors.textTertiary} />
                      </View>
                      <Switch
                        value={on}
                        onValueChange={() => toggle(cat.id, ch)}
                        trackColor={{ false: colors.scheme === 'dark' ? '#374151' : '#e5e7eb', true: meta.color }}
                        thumbColor="#fff"
                        ios_backgroundColor={colors.scheme === 'dark' ? '#374151' : '#e5e7eb'}
                        style={styles.switch}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {dirty && (
        <View style={styles.saveBar}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleSave} disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// =================================================================
// Merge backend prefs into the default category structure
// Backend likely returns: { [categoryId]: { push, sms, email, whatsapp } }
// =================================================================
function mergeWithDefaults(defaults: Category[], prefs: NotificationPrefs | any): Category[] {
  if (!prefs || typeof prefs !== 'object') return defaults;
  return defaults.map((c) => {
    const remote = (prefs as any)[c.id];
    if (!remote || typeof remote !== 'object') return c;
    return {
      ...c,
      channels: {
        push:     remote.push     ?? c.channels.push,
        sms:      remote.sms      ?? c.channels.sms,
        email:    remote.email    ?? c.channels.email,
        whatsapp: remote.whatsapp ?? c.channels.whatsapp,
      },
    };
  });
}

function categoriesToPrefs(categories: Category[]): NotificationPrefs {
  const out: any = {};
  for (const c of categories) {
    out[c.id] = { ...c.channels };
  }
  return out as NotificationPrefs;
}

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    loadingText: { fontSize: 12.5, color: c.textSecondary, marginTop: 12, fontWeight: '500' },

    intro: { marginBottom: 12 },
    introTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    introSub: { fontSize: 11.5, color: c.textSecondary, marginTop: 4, lineHeight: 17, fontWeight: '500' },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },

    legend: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12, padding: 8,
      justifyContent: 'space-around',
      marginBottom: 16,
      borderWidth: 1, borderColor: c.border,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { fontSize: 11, color: c.textSecondary, fontWeight: '700' },

    catCard: {
      backgroundColor: c.card, borderRadius: 16,
      padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    catHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    catEmoji: { fontSize: 24, marginTop: 1 },
    catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catTitle: { fontSize: 13.5, fontWeight: '700', color: c.text },
    requiredBadge: { backgroundColor: c.dangerSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    requiredText: { color: c.danger, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },
    catDesc: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    channelsRow: {
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    channelCell: { alignItems: 'center', gap: 6 },
    channelIcon: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.scheme === 'dark' ? c.background : '#f4f1ff',
      alignItems: 'center', justifyContent: 'center',
    },
    switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },

    saveBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: c.card,
      paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20,
      borderTopWidth: 1, borderTopColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: c.scheme === 'dark' ? 0.5 : 0.06,
      shadowRadius: 10, elevation: 10,
    },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.primary,
      paddingVertical: 14, borderRadius: 14,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  });
}
