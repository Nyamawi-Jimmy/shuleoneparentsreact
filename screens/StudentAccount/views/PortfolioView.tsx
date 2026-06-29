import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockPortfolio, filterByTier, PortfolioItem } from '../learningData';

const TYPE_LABELS: Record<PortfolioItem['type'], string> = {
  lesson: 'Lessons',
  certificate: 'Certificates',
  project: 'Projects',
  'best-score': 'Best Scores',
};

const TYPE_ICONS: Record<PortfolioItem['type'], string> = {
  lesson: '📖',
  certificate: '🎖️',
  project: '🎨',
  'best-score': '🏆',
};

type Filter = 'all' | PortfolioItem['type'];

export const PortfolioView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [filter, setFilter] = useState<Filter>('all');

  const all = filterByTier(mockPortfolio, tier);
  const items = filter === 'all' ? all : all.filter((i) => i.type === filter);

  const counts = {
    lesson: all.filter((i) => i.type === 'lesson').length,
    certificate: all.filter((i) => i.type === 'certificate').length,
    project: all.filter((i) => i.type === 'project').length,
    'best-score': all.filter((i) => i.type === 'best-score').length,
  };

  const title = pickByTier(tier, {
    base: '🌟 My Portfolio',
    sprout: '🌟 My Treasure Chest',
    explorer: '🌟 My Achievements',
  });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader title={title} subtitle={`${all.length} items earned`} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary tiles */}
        <View style={styles.summaryGrid}>
          {(Object.keys(counts) as PortfolioItem['type'][]).map((k) => (
            <TouchableOpacity
              key={k}
              activeOpacity={0.85}
              onPress={() => setFilter(filter === k ? 'all' : k)}
              style={[styles.summaryTile, filter === k && styles.summaryTileActive]}
            >
              <Text style={styles.summaryIcon}>{TYPE_ICONS[k]}</Text>
              <Text style={styles.summaryCount}>{counts[k]}</Text>
              <Text style={styles.summaryLabel}>{TYPE_LABELS[k]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter info */}
        {filter !== 'all' && (
          <View style={styles.filterInfo}>
            <Text style={styles.filterInfoText}>
              Showing {TYPE_LABELS[filter as PortfolioItem['type']]}
            </Text>
            <TouchableOpacity onPress={() => setFilter('all')} hitSlop={6}>
              <Text style={styles.clearFilter}>Show all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Items grid */}
        <View style={styles.itemsGrid}>
          {items.map((it) => (
            <TouchableOpacity key={it.id} activeOpacity={0.85} style={styles.itemCard}>
              <LinearGradient colors={it.color} style={[styles.itemThumb, { borderRadius: tokens.radius }]}>
                <Text style={styles.itemThumbIcon}>{it.thumb}</Text>
                {it.type === 'certificate' && (
                  <View style={styles.certBadge}>
                    <Text style={styles.certText}>CERTIFIED</Text>
                  </View>
                )}
                {it.score !== undefined && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{it.score}%</Text>
                  </View>
                )}
              </LinearGradient>
              <Text style={styles.itemTitle} numberOfLines={2}>{it.title}</Text>
              <Text style={styles.itemMeta}>{it.subject}</Text>
              <Text style={styles.itemDate}>{it.completedDate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>Start learning to earn your first achievement</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  summaryTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTileActive: { borderColor: '#7c5cff' },
  summaryIcon: { fontSize: 28 },
  summaryCount: { fontSize: 24, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  summaryLabel: { fontSize: 11, color: '#6f679c', fontWeight: '700', marginTop: 2 },

  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  filterInfoText: { fontSize: 12, color: '#6f679c', fontWeight: '700' },
  clearFilter: { fontSize: 12, color: '#7c5cff', fontWeight: '800' },

  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  itemThumb: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  itemThumbIcon: { fontSize: 44 },
  certBadge: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  certText: { color: '#2c2550', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  scoreBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 99,
  },
  scoreText: { color: '#2c2550', fontSize: 10.5, fontWeight: '800' },

  itemTitle: { fontSize: 12.5, fontWeight: '800', color: '#2c2550', lineHeight: 16 },
  itemMeta: { fontSize: 10.5, color: '#6f679c', fontWeight: '600', marginTop: 3 },
  itemDate: { fontSize: 10, color: '#9b94c4', fontWeight: '600', marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6f679c', fontWeight: '600', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
});
