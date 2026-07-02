import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useSelectedChild } from '../../context/SelectedChildContext';

export const MoreScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { signOut, user } = useAuth();
  const { parent } = useParentProfile();
  const { children } = useSelectedChild();

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to log in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/chooser' as any);
      }},
    ]);
  };

  const items = [
    {
      icon: <Ionicons name="chatbubbles" size={18} color={colors.purple} />,
      bg: colors.purpleLight,
      label: 'Messages',
      desc: 'Direct chats with teachers and school staff',
      onPress: () => router.push('/chat' as any),
    },
    {
      icon: <Ionicons name="megaphone" size={18} color={colors.primary} />,
      bg: colors.primarySoft,
      label: 'Communication',
      desc: 'Announcements, live classes, term events',
      onPress: () => router.push('/communication' as any),
    },
    {
      icon: <MaterialCommunityIcons name="notebook-outline" size={18} color={colors.primary} />,
      bg: colors.primarySoft,
      label: 'School Diary',
      desc: "Weekly class plan and teacher's comments",
      onPress: () => router.push('/diary' as any),
    },
    {
      icon: <Feather name="calendar" size={18} color={colors.info} />,
      bg: colors.infoSoft,
      label: 'School Calendar',
      desc: 'Term dates, holidays and school events',
      onPress: () => router.push('/calendar' as any),
    },
    {
      icon: <MaterialCommunityIcons name="video-outline" size={18} color={colors.danger} />,
      bg: colors.dangerSoft,
      label: 'Live Classes',
      desc: 'Join your child’s scheduled online lessons',
      onPress: () => router.push('/live-classes' as any),
    },
    {
      icon: <MaterialCommunityIcons name="bus" size={18} color={colors.warning} />,
      bg: colors.warningSoft,
      label: 'Transport & Bus Tracking',
      desc: 'View route, live bus location, opt-outs',
      onPress: () => router.push('/transport' as any),
    },
    {
      icon: <Ionicons name="book" size={18} color={colors.info} />,
      bg: colors.infoSoft,
      label: 'Learning Progress',
      desc: "See how your child's learning is going",
      onPress: () => router.push('/(tabs)/academics' as any),
    },
    {
      icon: <MaterialCommunityIcons name="rocket-launch" size={18} color={colors.primary} />,
      bg: colors.primarySoft,
      label: 'Learn+ Subscription',
      desc: 'Premium revision and learning packages',
      onPress: () => router.push('/subscriptions' as any),
    },
    {
      icon: <Ionicons name="notifications" size={18} color={colors.purple} />,
      bg: colors.purpleLight,
      label: 'Notifications',
      desc: 'Inbox + push, SMS, email, WhatsApp preferences',
      onPress: () => router.push('/notifications' as any),
    },
    {
      icon: <Ionicons name="alarm" size={18} color={colors.primary} />,
      bg: colors.primarySoft,
      label: 'Reminders',
      desc: 'Get alerted before classes, exams and events',
      onPress: () => router.push('/reminders' as any),
    },
    {
      icon: <Ionicons name="settings" size={18} color={colors.textSecondary} />,
      bg: colors.scheme === 'dark' ? '#2A3744' : '#F1F1F4',
      label: 'Settings',
      desc: 'Profile, password, appearance, devices',
      onPress: () => router.push('/settings' as any),
    },
    {
      icon: <Ionicons name="people" size={18} color={colors.purple} />,
      bg: colors.purpleLight,
      label: 'Linked Children',
      desc: `${children.length} ${children.length === 1 ? 'child' : 'children'} active`,
      onPress: () => router.push('/choose-child' as any),
    },
    {
      icon: <Ionicons name="log-out" size={18} color={colors.danger} />,
      bg: colors.dangerSoft,
      label: 'Sign Out',
      desc: user ? `Logged in as ${user.username}` : undefined,
      onPress: handleSignOut,
      danger: true,
    },
  ];

  return (
    <View style={styles.safe}>
      <ParentHeader title="More" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/settings' as any)} style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{parent.initials || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {parent.name || `${parent.firstName} ${parent.lastName}`.trim() || 'Parent'}
            </Text>
            <Text style={styles.profilePhone}>{parent.phone || parent.email || '—'}</Text>
          </View>
          <Feather name="edit-2" size={15} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.menuGroup}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={item.onPress}
              style={[styles.menuRow, idx < items.length - 1 && styles.menuRowDivider]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, item.danger && { color: colors.danger }]}>{item.label}</Text>
                {item.desc && <Text style={styles.menuDesc}>{item.desc}</Text>}
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>ShuleOne by Educraft  •  v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    profileCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, padding: 14, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 4, elevation: 1,
    },
    profileAvatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    profileInitials: { color: c.primary, fontSize: 15, fontWeight: '900' },
    profileName: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    profilePhone: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    menuGroup: {
      marginTop: 16,
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 4, elevation: 1,
    },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    menuRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    menuIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    menuLabel: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    menuDesc: { fontSize: 11.5, color: c.textSecondary, marginTop: 1, fontWeight: '500' },
    versionText: { fontSize: 11.5, color: c.textTertiary, textAlign: 'center', marginTop: 28, fontWeight: '500' },
  });
}
