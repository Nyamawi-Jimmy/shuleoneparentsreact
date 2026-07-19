import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { useLeague } from '../../../hooks/useLeague';
import { LeagueEntry } from '../../../api/gamification.types';

// The DTO carries no avatar, so derive a stable, playful one from the name.
const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐧', '🦉', '🐸', '🐵', '🦄', '🐙', '🐢', '🐰', '🐷', '🐳'];
const GRADIENTS: [string, string][] = [
  ['#7c5cff', '#5b3df5'], ['#22c55e', '#16a34a'], ['#f59e0b', '#d97706'],
  ['#06b6d4', '#0891b2'], ['#ec4899', '#db2777'], ['#ef4444', '#dc2626'],
  ['#8b5cf6', '#6d28d9'], ['#14b8a6', '#0d9488'],
];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const avatarOf = (name: string) => AVATARS[hash(name) % AVATARS.length];
const colorOf = (name: string) => GRADIENTS[hash(name) % GRADIENTS.length];
const xpLabel = (xp: number) => `⚡ ${(xp ?? 0).toLocaleString()}`;

export const StarsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { board, loading, refreshing, error, refresh } = useLeague();

  const title = pickByTier(tier, {
    base: '🏆 Class Leaderboard',
    sprout: '🏆 Hall of Stars',
    explorer: '🏆 Hall of Stars',
    voyager: '🛡️ Weekly League',
    scholar: '🏆 Class Rank',
    campus: '🏆 Cohort Standing',
  });

  const top = board?.top ?? [];
  const [first, second, third] = top;
  const me = board?.me ?? null;
  const meInTop = me ? top.some((e) => e.me || e.rank === me.rank) : false;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#2c2550" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent1} />}
      >
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {!!board && (top.length > 0) && (
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="people" size={12} color="#6f679c" />
              <Text style={styles.metaChipText}>{board.totalPlayers} players</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time" size={12} color="#6f679c" />
              <Text style={styles.metaChipText}>Resets in {board.weekResetsInDays}d</Text>
            </View>
          </View>
        )}

        {loading && !board ? (
          <View style={styles.center}><ActivityIndicator size="large" color={tokens.accent1} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>Couldn’t load the leaderboard</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : top.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌟</Text>
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptyText}>Finish lessons and quests to earn XP — this week’s board fills up as you play!</Text>
          </View>
        ) : (
          <>
            {/* Podium (1st centered & elevated) */}
            <View style={styles.podium}>
              {second ? <PodiumCard place={second} medal="🥈" /> : <View style={{ flex: 1 }} />}
              {first ? <PodiumCard place={first} medal="👑" elevated /> : <View style={{ flex: 1 }} />}
              {third ? <PodiumCard place={third} medal="🥉" /> : <View style={{ flex: 1 }} />}
            </View>

            {/* Ranking list */}
            <View style={styles.rowList}>
              {top.map((r, idx) => (
                <RankRow key={`${r.rank}-${r.name}`} entry={r} last={idx === top.length - 1} />
              ))}
            </View>

            {/* Your rank pinned when outside the visible top */}
            {me && !meInTop && (
              <>
                <Text style={styles.yourRankLabel}>Your rank</Text>
                <View style={styles.rowList}>
                  <RankRow entry={{ ...me, me: true }} last />
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const PodiumCard: React.FC<{ place: LeagueEntry; medal: string; elevated?: boolean }> = ({ place, medal, elevated }) => (
  <View style={[styles.pod, elevated && styles.podElevated, place.me && styles.podMe]}>
    <Text style={styles.medal}>{medal}</Text>
    <LinearGradient colors={colorOf(place.name)} style={styles.podAv}>
      <Text style={{ fontSize: 26 }}>{avatarOf(place.name)}</Text>
    </LinearGradient>
    <Text style={styles.podName} numberOfLines={1}>{place.me ? 'You' : place.name}</Text>
    <Text style={styles.podStars}>{xpLabel(place.xp)}</Text>
  </View>
);

const RankRow: React.FC<{ entry: LeagueEntry; last: boolean }> = ({ entry, last }) => (
  <View style={[styles.lrow, entry.me && styles.lrowMe, !last && styles.divider]}>
    <View style={styles.rank}><Text style={styles.rankText}>{entry.rank}</Text></View>
    <LinearGradient colors={colorOf(entry.name)} style={styles.av}>
      <Text style={{ fontSize: 18 }}>{avatarOf(entry.name)}</Text>
    </LinearGradient>
    <Text style={[styles.nm, entry.me && { fontWeight: '800' }]} numberOfLines={1}>{entry.me ? 'You' : entry.name}</Text>
    {entry.me && <View style={styles.youTag}><Text style={styles.youTagText}>YOU</Text></View>}
    <Text style={styles.pts}>{xpLabel(entry.xp)}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#2c2550' },

  scroll: { padding: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  metaChipText: { fontSize: 11.5, color: '#6f679c', fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 54, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 20, lineHeight: 19 },
  retry: { color: '#7c5cff', fontWeight: '800', fontSize: 13, marginTop: 10 },

  podium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginBottom: 18 },
  pod: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 3,
  },
  podElevated: { transform: [{ translateY: -12 }] },
  podMe: { borderColor: '#f59e0b' },
  medal: { fontSize: 28 },
  podAv: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginVertical: 6, borderWidth: 3, borderColor: '#fff' },
  podName: { fontSize: 13, fontWeight: '800', color: '#2c2550', marginTop: 4, maxWidth: '100%' },
  podStars: { fontSize: 11, color: '#6f679c', fontWeight: '700', marginTop: 2 },

  rowList: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 3,
  },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lrowMe: { backgroundColor: '#fff3d6' },
  divider: { borderBottomWidth: 2, borderBottomColor: '#ece8fb' },
  rank: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#efeaff', alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#6f679c', fontWeight: '800', fontSize: 12 },
  av: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  nm: { flex: 1, fontWeight: '700', color: '#2c2550', fontSize: 13 },
  youTag: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  youTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  pts: { color: '#f59e0b', fontWeight: '800', fontSize: 13 },
  yourRankLabel: { fontSize: 12, fontWeight: '800', color: '#6f679c', marginTop: 18, marginBottom: 8, marginLeft: 4 },
});
