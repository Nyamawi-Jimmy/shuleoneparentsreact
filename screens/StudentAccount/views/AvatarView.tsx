// My Profile ("My Backpack" for the play tiers) — real data end to end:
// identity from /student/me, level/XP/streak and the badge shelf from
// /gamification/me, and a redesigned account section with a proper
// sign-out flow.

import React, { useCallback, useState } from 'react';
import { useTheme } from '../../../theme/ThemeContext';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C } from '../studentTheme';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { getStudentProfile } from '../../../api/student';
import { getGamificationState } from '../../../api/gamification';
import { StudentProfile, initialsFor } from '../../../api/student.types';
import { GamificationState } from '../../../api/gamification.types';

const titleCase = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const fmtEarned = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const AvatarView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  // Also subscribes the scheme proxies; mode/setMode drive the Appearance picker.
  const { mode, setMode, scheme } = useTheme();
  const { signOut, user, accessToken } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [game, setGame] = useState<GamificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    const [p, g] = await Promise.allSettled([
      getStudentProfile(accessToken),
      getGamificationState(accessToken),
    ]);
    if (p.status === 'fulfilled') setProfile(p.value);
    if (g.status === 'fulfilled') setGame(g.value);
    setLoading(false);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const title = pickByTier(tier, {
    base: '🎒 My Profile',
    sprout: '🎒 My Backpack',
    explorer: '🎒 My Backpack',
    campus: '👤 My Profile',
  });
  const badgesTitle = pickByTier(tier, {
    base: '🏅 Achievements',
    sprout: '🏅 My Trophies',
    explorer: '🏅 My Trophies',
    scholar: '🏅 Certificates & badges',
    campus: '🏅 Certificates & badges',
  });

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      "You'll need to log in again to come back.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login' as any);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
      </View>
    );
  }

  const name = titleCase(profile?.fullName) || user?.username || 'Learner';
  const chips = [
    profile?.className ? `${profile.className}${profile.streamName ? ' · ' + profile.streamName : ''}` : null,
    profile?.admNo ? `ADM ${profile.admNo}` : null,
    profile?.tier ? titleCase(profile.tier) : null,
  ].filter(Boolean) as string[];

  const level = game?.level ?? 1;
  const xp = game?.totalXp ?? 0;
  const streak = game?.streak?.current ?? 0;
  const longest = game?.streak?.longest ?? 0;

  const badges = game?.badges ?? [];
  const earned = badges.filter((b) => b.earnedAt);
  const locked = badges.filter((b) => !b.earnedAt);

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />}
      >
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* ── Identity hero ─────────────────────────────────── */}
        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: tokens.radius }]}
        >
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(profile)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <View style={styles.chips}>
                {chips.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Stat band — real level / XP / streaks */}
          <View style={styles.statBand}>
            <HeroStat emoji="💎" value={`Lvl ${level}`} label="Level" />
            <View style={styles.statDivider} />
            <HeroStat emoji="⭐" value={String(xp)} label="Total XP" />
            <View style={styles.statDivider} />
            <HeroStat emoji="🔥" value={String(streak)} label="Streak" />
            <View style={styles.statDivider} />
            <HeroStat emoji="🏆" value={`${longest}d`} label="Best streak" />
          </View>
        </LinearGradient>

        {/* ── Achievements ──────────────────────────────────── */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{badgesTitle}</Text>
          <View style={styles.secHLine} />
          {badges.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{earned.length}/{badges.length}</Text>
            </View>
          )}
        </View>

        {badges.length === 0 ? (
          <View style={styles.emptyBadges}>
            <Text style={{ fontSize: 38 }}>🌱</Text>
            <Text style={styles.emptyTitle}>No trophies yet</Text>
            <Text style={styles.emptyText}>Finish lessons and quests to start your collection!</Text>
          </View>
        ) : (
          <View style={styles.badges}>
            {[...earned, ...locked].map((b, i) => (
              <View key={b.code ?? i} style={[styles.badge, !b.earnedAt && styles.badgeLocked]}>
                <Text style={[styles.badgeIcon, !b.earnedAt && { opacity: 0.35 }]}>{b.icon ?? '🏅'}</Text>
                <Text style={styles.badgeLabel} numberOfLines={2}>{b.title ?? 'Badge'}</Text>
                <Text style={styles.badgeSub} numberOfLines={1}>
                  {b.earnedAt ? (fmtEarned(b.earnedAt) ?? 'Earned ✓') : '🔒 Locked'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Account ───────────────────────────────────────── */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>⚙️ Account</Text>
          <View style={styles.secHLine} />
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <View style={[styles.rowIcon, { backgroundColor: C.ring }]}>
              <Ionicons name="person" size={17} color="#7c5cff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>Signed in as</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{user?.username ?? '—'}</Text>
            </View>
          </View>

          {!!profile?.className && (
            <View style={[styles.accountRow, styles.accountRowLine]}>
              <View style={[styles.rowIcon, { backgroundColor: C.infoSoft }]}>
                <Ionicons name="school" size={16} color="#3aa0ff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>My class</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {profile.className}{profile.streamName ? ` · Stream ${profile.streamName}` : ''}
                  {profile.admNo ? `  ·  ADM ${profile.admNo}` : ''}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Appearance ─────────────────────────────────────── */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{scheme === 'dark' ? '🌙 Appearance' : '☀️ Appearance'}</Text>
          <View style={styles.secHLine} />
        </View>
        <View style={styles.appearanceCard}>
          {([
            { key: 'light', emoji: '☀️', label: 'Light' },
            { key: 'dark', emoji: '🌙', label: 'Dark' },
            { key: 'system', emoji: '📱', label: 'System' },
          ] as const).map((opt) => {
            const on = mode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                onPress={() => setMode(opt.key)}
                style={[styles.modeChip, on && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}
              >
                <Text style={styles.modeChipIcon}>{opt.emoji}</Text>
                <Text style={[styles.modeChipText, on && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sign out — its own clear, deliberate card */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleSignOut}>
          <View style={styles.signOutCard}>
            <View style={styles.signOutIcon}>
              <Ionicons name="log-out-outline" size={19} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.signOutTitle}>Sign out</Text>
              <Text style={styles.signOutSub}>End your learning session on this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#fda4af" />
          </View>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const HeroStat: React.FC<{ emoji: string; value: string; label: string }> = ({ emoji, value, label }) => (
  <View style={styles.heroStat}>
    <Text style={{ fontSize: 15 }}>{emoji}</Text>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },
  countBadge: {
    backgroundColor: S.ringStrong, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#7c5cff' },

  hero: {
    padding: 16, marginBottom: 18,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 5,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 10.5 },

  statBand: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16, paddingVertical: 10, marginTop: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: '#fff', fontSize: 13.5, fontWeight: '800', marginTop: 2 },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 8.5, fontWeight: '700', marginTop: 1, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.25)' },

  emptyBadges: {
    backgroundColor: S.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: S.line,
    alignItems: 'center', paddingVertical: 26, marginBottom: 6,
  },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', color: S.ink, marginTop: 8 },
  emptyText: { fontSize: 12, color: S.inkSoft, fontWeight: '600', marginTop: 3, textAlign: 'center', paddingHorizontal: 30 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    flexBasis: '30%', flexGrow: 1, maxWidth: '48%',
    backgroundColor: S.card, padding: 13, borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: S.line,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  badgeLocked: { borderStyle: 'dashed', backgroundColor: S.soft },
  badgeIcon: { fontSize: 30 },
  badgeLabel: {
    fontSize: 10.5, fontWeight: '800', color: S.ink,
    marginTop: 6, textAlign: 'center', lineHeight: 14,
  },
  badgeSub: { fontSize: 9, fontWeight: '700', color: S.faint, marginTop: 3 },

  accountCard: {
    backgroundColor: S.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: S.line,
    paddingHorizontal: 14,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    marginBottom: 12,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  accountRowLine: { borderTopWidth: 1, borderTopColor: S.divider },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 10.5, fontWeight: '800', color: S.faint, letterSpacing: 0.3, textTransform: 'uppercase' },
  rowSub: { fontSize: 13, fontWeight: '700', color: S.ink, marginTop: 2 },

  appearanceCard: { flexDirection: 'row', gap: 9, marginBottom: 12 },
  modeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    borderRadius: 14, paddingVertical: 12,
  },
  modeChipIcon: { fontSize: 14 },
  modeChipText: { fontSize: 12.5, fontWeight: '800', color: S.inkSoft },

  signOutCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: S.card, padding: 14,
    borderRadius: 18,
    borderWidth: 1.5, borderColor: '#fecdd3',
  },
  signOutIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: S.badSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutTitle: { fontSize: 13.5, fontWeight: '800', color: '#e11d48' },
  signOutSub: { fontSize: 11, color: S.faint, fontWeight: '600', marginTop: 2 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

