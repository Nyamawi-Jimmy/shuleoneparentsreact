import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockTests, filterByTier, MockTest } from '../learningData';

const TYPE_META: Record<MockTest['type'], { label: string; color: [string, string]; icon: string }> = {
  weekly: { label: 'Weekly', color: ['#3aa0ff', '#7fc4ff'], icon: '📅' },
  topic: { label: 'Topic', color: ['#15c98c', '#74e6b4'], icon: '🎯' },
  mock: { label: 'Mock Exam', color: ['#7c3aed', '#0ea5a8'], icon: '📋' },
  cat: { label: 'CAT', color: ['#ff9d2e', '#ff5e9c'], icon: '✏️' },
};

type Filter = 'all' | MockTest['type'];

export const TestsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [filter, setFilter] = useState<Filter>('all');

  const all = filterByTier(mockTests, tier);
  const tests = filter === 'all' ? all : all.filter((t) => t.type === filter);
  const completed = all.filter((t) => t.status === 'completed').length;

  const title = pickByTier(tier, {
    base: '📋 Tests & Mock Exams',
    sprout: '📋 Try a Test',
    explorer: '📋 Tests & Practice',
  });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title={title}
        subtitle={`${completed} of ${all.length} completed`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} tokens={tokens} />
          {(Object.keys(TYPE_META) as MockTest['type'][]).map((k) => (
            <FilterChip
              key={k}
              label={TYPE_META[k].label}
              active={filter === k}
              onPress={() => setFilter(k)}
              tokens={tokens}
            />
          ))}
        </ScrollView>

        {tests.map((t) => {
          const meta = TYPE_META[t.type];
          const locked = t.status === 'locked';
          const done = t.status === 'completed';
          const inProgress = t.status === 'in-progress';
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={locked ? 1 : 0.85}
              style={[styles.card, locked && styles.cardLocked]}
            >
              <LinearGradient colors={locked ? ['#cbd5e1', '#94a3b8'] : meta.color} style={styles.thumb}>
                <Text style={styles.thumbIcon}>{meta.icon}</Text>
              </LinearGradient>

              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{t.title}</Text>
                  {done && t.bestScore !== undefined && (
                    <View style={[styles.scorePill, { backgroundColor: scoreBg(t.bestScore) }]}>
                      <Text style={[styles.scorePillText, { color: scoreColor(t.bestScore) }]}>
                        {t.bestScore}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardMeta}>{t.subject} • {meta.label}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={11} color="#6f679c" />
                    <Text style={styles.statText}>{t.duration}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="help-circle-outline" size={11} color="#6f679c" />
                    <Text style={styles.statText}>{t.questions} questions</Text>
                  </View>
                  {t.attempts > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="refresh-outline" size={11} color="#6f679c" />
                      <Text style={styles.statText}>{t.attempts} attempts</Text>
                    </View>
                  )}
                </View>
                <View style={styles.actionRow}>
                  {locked ? (
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={11} color="#6f679c" />
                      <Text style={styles.lockedText}>Unlocks {t.unlockDate}</Text>
                    </View>
                  ) : done ? (
                    <View style={styles.retakeBtn}>
                      <Ionicons name="refresh" size={12} color="#7c5cff" />
                      <Text style={styles.retakeText}>Retake</Text>
                    </View>
                  ) : inProgress ? (
                    <LinearGradient colors={['#f4a716', '#ff9d2e']} style={styles.resumeBtn}>
                      <Text style={styles.resumeText}>Resume</Text>
                    </LinearGradient>
                  ) : (
                    <LinearGradient colors={meta.color} style={styles.startBtn}>
                      <Ionicons name="play" size={11} color="#fff" />
                      <Text style={styles.startText}>Start</Text>
                    </LinearGradient>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {tests.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No tests in this category yet</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const FilterChip: React.FC<{
  label: string; active: boolean; onPress: () => void; tokens: any
}> = ({ label, active, onPress, tokens }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
    {active ? (
      <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={[styles.chip]}>
        <Text style={[styles.chipText, { color: '#fff' }]}>{label}</Text>
      </LinearGradient>
    ) : (
      <View style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

function scoreColor(s: number) {
  if (s >= 80) return '#15c98c';
  if (s >= 60) return '#f4a716';
  return '#ef4444';
}
function scoreBg(s: number) {
  if (s >= 80) return '#eafef3';
  if (s >= 60) return '#fff7e6';
  return '#fee2e2';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  chipsRow: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ece8fb',
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#6f679c' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLocked: { opacity: 0.7 },
  thumb: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbIcon: { fontSize: 24 },

  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  scorePillText: { fontSize: 11, fontWeight: '800' },
  cardMeta: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 10.5, color: '#6f679c', fontWeight: '600' },

  actionRow: { flexDirection: 'row', marginTop: 8 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99,
  },
  startText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#efeaff',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99,
  },
  retakeText: { color: '#7c5cff', fontWeight: '800', fontSize: 11 },
  resumeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99,
  },
  resumeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f4f1ff',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 99,
  },
  lockedText: { color: '#6f679c', fontSize: 10.5, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6f679c', fontWeight: '600', fontSize: 13 },
});
