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
import { mockLibrary, filterByTier, LibraryResource } from '../learningData';

type Filter = 'all' | 'book' | 'notes' | 'audio' | 'pdf' | 'worksheet';

const TYPE_LABELS: Record<Filter, string> = {
  all: 'All',
  book: 'Books',
  notes: 'Notes',
  audio: 'Audio',
  pdf: 'PDFs',
  worksheet: 'Worksheets',
};

const TYPE_ICONS: Record<LibraryResource['type'], string> = {
  book: '📚',
  notes: '📝',
  audio: '🎧',
  pdf: '📄',
  worksheet: '📋',
};

export const LibraryView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [filter, setFilter] = useState<Filter>('all');

  const all = filterByTier(mockLibrary, tier);
  const items = filter === 'all' ? all : all.filter((i) => i.type === filter);
  const downloaded = all.filter((i) => i.downloaded).length;

  const title = pickByTier(tier, {
    base: '📚 Library',
    sprout: '📚 Story Library',
    explorer: '📚 Story Library',
  });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title={title}
        subtitle={`${downloaded} of ${all.length} downloaded`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {(Object.keys(TYPE_LABELS) as Filter[]).map((key) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.85}
                onPress={() => setFilter(key)}
              >
                {active ? (
                  <LinearGradient
                    colors={[tokens.accent1, tokens.accent2]}
                    style={[styles.chip, styles.chipActive]}
                  >
                    <Text style={[styles.chipText, { color: '#fff' }]}>
                      {TYPE_LABELS[key]}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{TYPE_LABELS[key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {items.map((it) => (
          <TouchableOpacity
            key={it.id}
            activeOpacity={0.85}
            style={styles.card}
          >
            <LinearGradient colors={it.color} style={styles.thumb}>
              <Text style={styles.thumbIcon}>{it.thumb}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{TYPE_ICONS[it.type]}</Text>
              </View>
              {it.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>NEW</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
              <Text style={styles.cardMeta}>
                {it.subject} • {it.size}
                {it.pages ? ` • ${it.pages} pages` : ''}
                {it.duration ? ` • ${it.duration}` : ''}
              </Text>
              <View style={styles.actionRow}>
                {it.downloaded ? (
                  <View style={styles.openBtn}>
                    <Ionicons name="open-outline" size={12} color="#15c98c" />
                    <Text style={styles.openText}>Open</Text>
                  </View>
                ) : (
                  <View style={styles.downloadBtn}>
                    <Ionicons name="cloud-download-outline" size={12} color="#7c5cff" />
                    <Text style={styles.downloadText}>Download</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No {filter} items for your grade yet</Text>
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

  chipsRow: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ece8fb',
  },
  chipActive: { borderWidth: 0 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#6f679c' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 70, height: 90, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  thumbIcon: { fontSize: 30 },
  typeBadge: {
    position: 'absolute', bottom: 5, right: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadgeText: { fontSize: 11 },
  newBadge: {
    position: 'absolute', top: 5, left: 5,
    backgroundColor: '#ff5e9c',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 5,
  },
  newText: { color: '#fff', fontSize: 7.5, fontWeight: '800' },

  cardBody: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550', lineHeight: 17 },
  cardMeta: { fontSize: 10.5, color: '#6f679c', fontWeight: '600', marginTop: 4 },
  actionRow: { flexDirection: 'row', marginTop: 8 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eafef3',
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 99,
  },
  openText: { color: '#15c98c', fontSize: 10.5, fontWeight: '800' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#efeaff',
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 99,
  },
  downloadText: { color: '#7c5cff', fontSize: 10.5, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6f679c', fontWeight: '600', fontSize: 13 },
});
