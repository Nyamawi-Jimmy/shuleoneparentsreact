import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../constants/theme';
import { GamificationState, Badge, xpToNextLevel, streakLabel, earnedBadges } from '../api/gamification.types';

interface Props {
  state: GamificationState | null;
  /** When true, shows large hero card (Stars screen). When false, shows compact bar (header). */
  compact?: boolean;
  /** Tap handler for the badges row when in hero mode. */
  onBadgesPress?: () => void;
}

export const GamificationBar: React.FC<Props> = ({ state, compact = false, onBadgesPress }) => {
  const xp = state?.totalXp ?? 0;
  const level = state?.level ?? 1;
  const streak = state?.streak ?? null;
  const badges = earnedBadges(state?.badges);
  const { current, needed, pct } = xpToNextLevel(xp);

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Stat icon="flash" tint="#f4a716" value={String(xp)} label="XP" />
        <Stat icon="trophy" tint={colors.primary} value={`Lv ${level}`} label="Level" />
        <Stat icon="flame" tint="#ef4444" value={String(streak?.current ?? 0)} label="Streak" />
      </View>
    );
  }

  return (
    <View>
      {/* Hero card with gradient */}
      <LinearGradient
        colors={['#fbbf24', '#f59e0b']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSubLabel}>TOTAL XP</Text>
            <View style={styles.heroValueRow}>
              <MaterialCommunityIcons name="flash" size={28} color="#fff" />
              <Text style={styles.heroValue}>{xp.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.heroLevelBadge}>
            <Text style={styles.heroLevelLabel}>LEVEL</Text>
            <Text style={styles.heroLevelValue}>{level}</Text>
          </View>
        </View>

        {/* XP progress bar */}
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.xpBarLabel}>{current} / {needed} XP to level {level + 1}</Text>
      </LinearGradient>

      {/* Streak chip */}
      {streak && (
        <View style={styles.streakCard}>
          <View style={styles.streakIcon}>
            <Ionicons name="flame" size={20} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{streakLabel(streak)}</Text>
            <Text style={styles.streakMeta}>
              Best: {streak.longest ?? 0} days{streak.dailyGoal ? `  •  Goal: ${streak.dailyGoal}` : ''}
            </Text>
          </View>
          {streak.goalMet && (
            <View style={styles.goalMetBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.badgesSection}>
          <View style={styles.badgesHeader}>
            <Text style={styles.badgesTitle}>BADGES EARNED</Text>
            {onBadgesPress && (
              <TouchableOpacity onPress={onBadgesPress} hitSlop={6}>
                <Text style={styles.badgesViewAll}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {badges.map((b, idx) => (
              <BadgeChip key={b.code ?? idx} badge={b} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const Stat: React.FC<{ icon: any; tint: string; value: string; label: string }> = ({ icon, tint, value, label }) => (
  <View style={styles.statBox}>
    <View style={[styles.statIcon, { backgroundColor: tint + '20' }]}>
      <Ionicons name={icon} size={14} color={tint} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const BadgeChip: React.FC<{ badge: Badge }> = ({ badge }) => (
  <View style={styles.badgeChip}>
    <Text style={styles.badgeEmoji}>{badge.icon ?? '🏆'}</Text>
    <Text style={styles.badgeName} numberOfLines={2}>
      {badge.title ?? 'Badge'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  // Compact horizontal stats (header strip)
  compactRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm,
    gap: 6,
    ...shadows.card,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { ...typography.bodyBold, color: colors.text },
  statLabel: { fontSize: 9.5, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 },

  // Hero
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heroSubLabel: { color: '#fff', opacity: 0.85, fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  heroValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
  heroLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.lg,
    alignItems: 'center', minWidth: 60,
  },
  heroLevelLabel: { color: '#fff', fontSize: 9.5, fontWeight: '800', letterSpacing: 1, opacity: 0.85 },
  heroLevelValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2 },

  xpBarTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  xpBarLabel: {
    color: '#fff', opacity: 0.9, fontSize: 11.5, fontWeight: '700',
    marginTop: 6,
  },

  // Streak
  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#fff5f5',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.xl,
    marginTop: spacing.md,
    borderWidth: 1, borderColor: '#ffe2e2',
  },
  streakIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  streakTitle: { ...typography.bodyBold, color: colors.text },
  streakMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  goalMetBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#15c98c',
    alignItems: 'center', justifyContent: 'center',
  },

  // Badges
  badgesSection: { marginTop: spacing.lg },
  badgesHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 2, marginBottom: spacing.sm,
  },
  badgesTitle: {
    fontSize: 11.5, fontWeight: '800', color: colors.primary,
    letterSpacing: 0.6,
  },
  badgesViewAll: { fontSize: 12, fontWeight: '700', color: colors.primary },
  badgesScroll: { gap: 8, paddingRight: 16 },
  badgeChip: {
    width: 84, alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 10, ...shadows.card,
  },
  badgeEmoji: { fontSize: 30, marginBottom: 4 },
  badgeName: {
    fontSize: 10.5, fontWeight: '700', color: colors.text,
    textAlign: 'center', minHeight: 26,
  },
});
