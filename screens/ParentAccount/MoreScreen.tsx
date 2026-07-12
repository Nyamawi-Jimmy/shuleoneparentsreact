import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useParentProfile } from '../../context/ParentProfileContext';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face';

interface Row {
  label: string;
  desc: string;
  icon: React.ReactNode;
  tint: keyof Pick<ColorPalette, 'primary' | 'info' | 'success' | 'warning' | 'purple' | 'danger'>;
  onPress: () => void;
}

export const MoreScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signOut } = useAuth();
  const { parent } = useParentProfile();

  const go = (path: string) => () => router.push(path as any);

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to log in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/chooser' as any);
        },
      },
    ]);
  };

  const forChild: Row[] = [
    {
      label: 'Academics', desc: 'Exam results, grades & report cards', tint: 'primary',
      icon: <Ionicons name="school-outline" size={20} color={colors.primary} />, onPress: go('/academics'),
    },
    {
      label: 'Attendance', desc: 'Daily presence & this term’s rate', tint: 'success',
      icon: <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />, onPress: go('/academics'),
    },
    {
      label: 'Transport', desc: 'Live bus tracking & pickup status', tint: 'info',
      icon: <MaterialCommunityIcons name="bus-school" size={20} color={colors.info} />, onPress: go('/transport'),
    },
    {
      label: 'Calendar', desc: 'Term dates, exams & live classes', tint: 'danger',
      icon: <Ionicons name="calendar-outline" size={20} color={colors.danger} />, onPress: go('/calendar'),
    },
    {
      label: 'Documents', desc: 'Fee statements & payment receipts', tint: 'warning',
      icon: <Ionicons name="folder-open-outline" size={20} color={colors.warning} />, onPress: go('/finance'),
    },
  ];

  const messages: Row[] = [
    {
      label: 'Messages', desc: 'Chat directly with teachers & staff', tint: 'purple',
      icon: <Ionicons name="chatbubbles-outline" size={20} color={colors.purple} />, onPress: go('/chat'),
    },
    {
      label: 'Announcements', desc: 'School news, notices & events', tint: 'primary',
      icon: <Ionicons name="megaphone-outline" size={20} color={colors.primary} />, onPress: go('/communication'),
    },
  ];

  const account: Row[] = [
    {
      label: 'Plans & subscriptions', desc: 'AI learning, coding & bus tracking', tint: 'purple',
      icon: <Ionicons name="sparkles-outline" size={20} color={colors.purple} />, onPress: go('/subscriptions'),
    },
    {
      label: 'Notifications', desc: 'Alerts & what you get notified about', tint: 'info',
      icon: <Ionicons name="notifications-outline" size={20} color={colors.info} />, onPress: go('/notifications'),
    },
    {
      label: 'Settings', desc: 'Profile, language, security & devices', tint: 'primary',
      icon: <Ionicons name="settings-outline" size={20} color={colors.primary} />, onPress: go('/settings'),
    },
  ];

  const displayName = [parent?.firstName, (parent as any)?.lastName].filter(Boolean).join(' ') || 'Parent';
  const subtitle = (parent as any)?.phone || (parent as any)?.email || 'Account & preferences';
  const photo = (parent as any)?.photoUrl || PLACEHOLDER;

  return (
    <View style={styles.root}>
      <ParentHeader title="More" rightIcon="none" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <TouchableOpacity style={styles.profile} activeOpacity={0.8} onPress={go('/settings')}>
          <Image source={{ uri: photo }} style={styles.profileImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileSub} numberOfLines={1}>{subtitle}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <Section title="For your child" rows={forChild} colors={colors} styles={styles} />
        <Section title="Messages & updates" rows={messages} colors={colors} styles={styles} />
        <Section title="Account" rows={account} colors={colors} styles={styles} />

        <TouchableOpacity style={styles.signOut} activeOpacity={0.8} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Shule One · Parent</Text>
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
};

const Section: React.FC<{ title: string; rows: Row[]; colors: ColorPalette; styles: any }> =
  ({ title, rows, colors, styles }) => (
  <>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>
      {rows.map((r, i) => (
        <TouchableOpacity key={r.label} style={[styles.row, i > 0 && styles.rowDivider]} activeOpacity={0.7} onPress={r.onPress}>
          <View style={[styles.rowIcon, { backgroundColor: softFor(colors, r.tint) }]}>{r.icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowDesc} numberOfLines={1}>{r.desc}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  </>
);

function softFor(c: ColorPalette, tint: string): string {
  switch (tint) {
    case 'primary': return c.primarySoft;
    case 'info': return c.infoSoft;
    case 'success': return c.successSoft;
    case 'warning': return c.warningSoft;
    case 'danger': return c.dangerSoft;
    case 'purple': return c.purpleLight;
    default: return c.backgroundAlt;
  }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    profile: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 20,
    },
    profileImg: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.backgroundAlt },
    profileName: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    profileSub: { fontSize: 12.5, color: c.textSecondary, marginTop: 2 },

    sectionTitle: {
      fontSize: 12.5, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.3,
      textTransform: 'uppercase', marginBottom: 10, marginLeft: 2,
    },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, marginBottom: 22,
    },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.border },
    rowIcon: {
      width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 13,
    },
    rowLabel: { fontSize: 14.5, fontWeight: '700', color: c.text, letterSpacing: -0.2 },
    rowDesc: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    signOut: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 14, paddingVertical: 15, marginTop: 2,
    },
    signOutText: { fontSize: 15, fontWeight: '800', color: c.danger },

    version: { textAlign: 'center', fontSize: 11.5, color: c.textTertiary, marginTop: 18 },
  });
}
