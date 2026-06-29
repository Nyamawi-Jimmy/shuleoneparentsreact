import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockPodium, mockRanking } from '../mockData';

export const StarsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);

  const title = pickByTier(tier, {
    base: '🏆 Class Leaderboard',
    sprout: '🏆 Hall of Stars — Sunshine Group',
    explorer: '🏆 Hall of Stars — Sunshine Group',
    voyager: '🛡️ Sapphire League',
    scholar: '🏆 Class Rank',
    campus: '🏆 Cohort Standing',
  });

  // Reorder podium so 1st place renders in the middle and elevated
  const [second, first, third] = mockPodium;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      {/* Top bar with back button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#2c2550" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Podium */}
        <View style={styles.podium}>
          <PodiumCard place={second} medal="🥈" />
          <PodiumCard place={first} medal="👑" elevated />
          <PodiumCard place={third} medal="🥉" />
        </View>

        {/* Ranking list */}
        <View style={styles.rowList}>
          {mockRanking.map((r, idx) => (
            <View
              key={r.rank}
              style={[
                styles.lrow,
                r.me && styles.lrowMe,
                idx < mockRanking.length - 1 && styles.divider,
              ]}
            >
              <View style={styles.rank}>
                <Text style={styles.rankText}>{r.rank}</Text>
              </View>
              <LinearGradient colors={r.color as [string, string]} style={styles.av}>
                <Text style={{ fontSize: 18 }}>{r.avatar}</Text>
              </LinearGradient>
              <Text style={[styles.nm, r.me && { fontWeight: '800' }]}>{r.name}</Text>
              <Text style={styles.pts}>⭐ {r.stars}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const PodiumCard: React.FC<{ place: typeof mockPodium[0]; medal: string; elevated?: boolean }> = ({
  place,
  medal,
  elevated,
}) => (
  <View style={[styles.pod, elevated && styles.podElevated]}>
    <Text style={styles.medal}>{medal}</Text>
    <LinearGradient colors={place.color as [string, string]} style={styles.podAv}>
      <Text style={{ fontSize: 26 }}>{place.avatar}</Text>
    </LinearGradient>
    <Text style={styles.podName}>{place.name}</Text>
    <Text style={styles.podStars}>⭐ {place.stars}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#2c2550' },

  scroll: { padding: 16 },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  podium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginBottom: 18 },
  pod: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  podElevated: { transform: [{ translateY: -12 }] },
  medal: { fontSize: 28 },
  podAv: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  podName: { fontSize: 13, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  podStars: { fontSize: 11, color: '#6f679c', fontWeight: '700', marginTop: 2 },

  rowList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lrowMe: { backgroundColor: '#fff3d6' },
  divider: { borderBottomWidth: 2, borderBottomColor: '#ece8fb' },
  rank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#efeaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#6f679c', fontWeight: '800', fontSize: 12 },
  av: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nm: { flex: 1, fontWeight: '700', color: '#2c2550', fontSize: 13 },
  pts: { color: '#f59e0b', fontWeight: '800', fontSize: 13 },
});
