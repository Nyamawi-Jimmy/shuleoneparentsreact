import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTier, pickByTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockQuiz, mockGameTiles } from '../mockData';

const TILE_COLORS: Record<string, [string, string]> = {
  purple: [SHARED.purple1, SHARED.purple2],
  green: [SHARED.green1, SHARED.green2],
  orange: [SHARED.orange1, SHARED.orange2],
  blue: [SHARED.blue1, SHARED.blue2],
  pink: [SHARED.pink1, SHARED.pink2],
  amber: [SHARED.amber1, SHARED.amber2],
  teal: [SHARED.teal1, SHARED.teal2],
};

export const GamesView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [picked, setPicked] = useState<number | null>(null);

  const title = pickByTier(tier, {
    base: '🧠 Quizzes',
    sprout: '🧠 Brain Games',
    explorer: '🧠 Brain Games',
    scholar: '🧠 Revision & Practice',
    campus: '🧠 Assessments',
  });
  const pickHdr = pickByTier(tier, { base: 'Pick a topic', sprout: 'Pick a game', explorer: 'Pick a game' });
  const question = pickByTier(tier, { base: mockQuiz.questionBase, sprout: mockQuiz.question, explorer: mockQuiz.question });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Quiz card */}
        <View style={[styles.quiz, { borderRadius: tokens.radius }]}>
          <Text style={styles.qTop}>
            {mockQuiz.topic} · Question {mockQuiz.questionNum} of {mockQuiz.total} ·{' '}
            <Text style={{ color: '#f59e0b', fontWeight: '800' }}>⭐ {mockQuiz.starsEach} each</Text>
          </Text>
          <Text style={styles.qTitle}>{question}</Text>
          <View style={styles.opts}>
            {mockQuiz.options.map((o, i) => {
              const lbl = pickByTier(tier, { base: o.labelBase, sprout: o.label, explorer: o.label });
              const isPicked = picked === i;
              const isCorrect = isPicked && o.correct;
              const isWrong = isPicked && !o.correct;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => setPicked(i)}
                  style={[
                    styles.opt,
                    isCorrect && styles.optCorrect,
                    isWrong && styles.optWrong,
                  ]}
                >
                  <Text style={styles.optEm}>{o.emoji}</Text>
                  <Text style={styles.optText}>{lbl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pick a topic header */}
        <View style={[styles.secH, { marginTop: 18 }]}>
          <Text style={styles.secHTitle}>{pickHdr}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Game tiles */}
        <View style={styles.tiles}>
          {mockGameTiles.map((t) => {
            const colors = TILE_COLORS[t.color] || TILE_COLORS.purple;
            const ttl = pickByTier(tier, { base: t.titleBase, sprout: t.title, explorer: t.title });
            return (
              <TouchableOpacity key={t.id} activeOpacity={0.85} style={styles.tile}>
                <LinearGradient colors={colors} style={[styles.tileGrad, { borderRadius: tokens.radius }]}>
                  <Text style={styles.tileIcon}>{t.icon}</Text>
                  <Text style={styles.tileTitle}>{ttl}</Text>
                  <Text style={styles.tileSub}>{t.sub}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  quiz: {
    backgroundColor: '#fff',
    padding: 18,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  qTop: { color: '#6f679c', fontWeight: '700', fontSize: 11.5 },
  qTitle: { fontSize: 20, fontWeight: '800', color: '#2c2550', marginVertical: 12 },
  opts: { gap: 10 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#ece8fb',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  optCorrect: { borderColor: SHARED.green1, backgroundColor: '#eafef3' },
  optWrong: { borderColor: '#e2566f', backgroundColor: '#ffeef1' },
  optEm: { fontSize: 22 },
  optText: { fontSize: 14, fontWeight: '700', color: '#2c2550' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  tileGrad: {
    padding: 14,
    minHeight: 124,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  tileIcon: { fontSize: 32 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 10 },
  tileSub: { color: '#fff', fontSize: 11, fontWeight: '600', opacity: 0.92, marginTop: 4 },
});
