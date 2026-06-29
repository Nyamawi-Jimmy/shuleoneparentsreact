import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../constants/theme';
import { useStudentProfile } from '../hooks/useStudent';
import { studentInitials, tierToFrontendTier } from '../api/student.types';

const TIER_THEMES: Record<string, { gradient: [string, string]; icon: string; label: string }> = {
  sprout:   { gradient: ['#fbcfe8', '#f9a8d4'], icon: '🌱', label: 'Sprout Tier'    },
  explorer: { gradient: ['#bae6fd', '#7dd3fc'], icon: '🧭', label: 'Explorer Tier'  },
  voyager:  { gradient: ['#c4b5fd', '#a78bfa'], icon: '🚀', label: 'Voyager Tier'   },
  scholar:  { gradient: ['#fca5a5', '#f87171'], icon: '🎓', label: 'Scholar Tier'   },
  campus:   { gradient: ['#86efac', '#4ade80'], icon: '🏛️', label: 'Campus Tier'    },
};

export const StudentDashboardCard: React.FC = () => {
  const { profile, loading } = useStudentProfile();

  if (loading && !profile) {
    return (
      <View style={[styles.card, { padding: spacing.lg, alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!profile) return null;

  const tier = tierToFrontendTier(profile.tier);
  const theme = TIER_THEMES[tier] ?? TIER_THEMES.voyager;

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{studentInitials(profile) || theme.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hi {profile.firstName ?? 'there'}!</Text>
          <View style={styles.metaRow}>
            <Text style={styles.classLabel} numberOfLines={1}>
              {[profile.className, profile.streamName].filter(Boolean).join(' • ') || 'Welcome back'}
            </Text>
          </View>
        </View>
        <View style={styles.tierPill}>
          <Text style={styles.tierEmoji}>{theme.icon}</Text>
          <Text style={styles.tierLabel} numberOfLines={1}>{theme.label}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.h2, color: colors.text, fontWeight: '900' },
  greeting: { ...typography.h2, color: colors.text, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  classLabel: { ...typography.caption, color: colors.text, fontWeight: '700', opacity: 0.85 },
  tierPill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99,
    alignItems: 'center',
    maxWidth: 110,
  },
  tierEmoji: { fontSize: 18 },
  tierLabel: { fontSize: 9.5, fontWeight: '800', color: colors.text, letterSpacing: 0.4 },
});
