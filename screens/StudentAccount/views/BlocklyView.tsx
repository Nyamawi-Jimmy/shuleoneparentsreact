import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockBlocklyPuzzles, BlocklyPuzzle } from '../codeLabData';

export const BlocklyView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const done = mockBlocklyPuzzles.filter((p) => p.status === 'completed' || p.status === 'best').length;
  const best = mockBlocklyPuzzles.filter((p) => p.status === 'best').length;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title="🧩 Blockly Puzzles"
        subtitle={`${done}/${mockBlocklyPuzzles.length} solved · ${best} perfect`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#7c5cff', '#a78bfa']} style={[styles.hero, { borderRadius: tokens.radius }]}>
          <Text style={styles.heroEmoji}>🧩</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Solve puzzles, save blocks</Text>
            <Text style={styles.heroSub}>Earn 3 stars by using fewest blocks!</Text>
          </View>
        </LinearGradient>

        <View style={styles.secH}>
          <Text style={styles.secHTitle}>🎯 Puzzles</Text>
          <View style={styles.secHLine} />
        </View>

        <View style={styles.grid}>
          {mockBlocklyPuzzles.map((p) => (
            <PuzzleTile key={p.id} puzzle={p} />
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const PuzzleTile: React.FC<{ puzzle: BlocklyPuzzle }> = ({ puzzle: p }) => {
  const isLocked = p.status === 'locked';
  const isBest = p.status === 'best';
  const isCompleted = p.status === 'completed';
  const isAvail = p.status === 'available';

  // Compute stars earned (1-3)
  const stars = isBest ? 3 : isCompleted ? 2 : isAvail ? 0 : 0;

  return (
    <TouchableOpacity
      activeOpacity={isLocked ? 1 : 0.85}
      style={[
        styles.tile,
        isLocked && styles.tileLocked,
        isBest && styles.tileBest,
      ]}
    >
      <View style={styles.tileTop}>
        <Text style={[styles.tileNumber, isLocked && { color: '#9b94c4' }]}>
          {p.number}
        </Text>
        {isLocked ? (
          <Ionicons name="lock-closed" size={14} color="#9b94c4" />
        ) : (
          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[styles.star, s > stars && { opacity: 0.25 }]}>⭐</Text>
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.tileTitle, isLocked && { color: '#9b94c4' }]} numberOfLines={1}>
        {p.title}
      </Text>
      <Text style={[styles.tileDesc, isLocked && { color: '#cbc6e2' }]} numberOfLines={2}>
        {p.description}
      </Text>

      <View style={styles.tileBottom}>
        <View style={styles.diffPills}>
          {[1, 2, 3].map((d) => (
            <View
              key={d}
              style={[
                styles.diffPill,
                d <= p.difficulty && styles.diffPillOn,
              ]}
            />
          ))}
        </View>
        {p.bestBlocks !== undefined && (
          <Text style={styles.blocksText}>{p.bestBlocks} blocks</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14,
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  heroEmoji: { fontSize: 42 },
  heroTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.95 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 1,
  },
  tileLocked: { opacity: 0.6, backgroundColor: '#f7f5fd' },
  tileBest: { borderWidth: 2, borderColor: '#f4a716' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tileNumber: { fontSize: 22, fontWeight: '800', color: '#7c5cff' },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 13 },
  tileTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  tileDesc: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 3, minHeight: 28 },
  tileBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  diffPills: { flexDirection: 'row', gap: 3 },
  diffPill: { width: 16, height: 4, borderRadius: 2, backgroundColor: '#ece8fb' },
  diffPillOn: { backgroundColor: '#7c5cff' },
  blocksText: { fontSize: 10, color: '#6f679c', fontWeight: '800' },
});
