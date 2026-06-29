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
import { mockAssignments, filterByTier, Assignment } from '../learningData';

const STATUS_META: Record<Assignment['status'], { label: string; color: string; bg: string }> = {
  pending: { label: 'To do', color: '#7c5cff', bg: '#efeaff' },
  submitted: { label: 'Submitted', color: '#3aa0ff', bg: '#dbeafe' },
  graded: { label: 'Graded', color: '#15c98c', bg: '#eafef3' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: '#fee2e2' },
};

const TYPE_ICONS: Record<Assignment['submissionType'], string> = {
  text: '📝', photo: '📸', document: '📄', project: '🎁',
};

type Filter = 'all' | Assignment['status'];

export const AssignmentsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [filter, setFilter] = useState<Filter>('all');

  const all = filterByTier(mockAssignments, tier);
  const items = filter === 'all' ? all : all.filter((a) => a.status === filter);

  const pending = all.filter((a) => a.status === 'pending').length;
  const overdue = all.filter((a) => a.status === 'overdue').length;

  const title = pickByTier(tier, {
    base: '📝 Assignments',
    sprout: '📝 My Homework',
    explorer: '📝 Homework',
  });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title={title}
        subtitle={`${pending} pending${overdue > 0 ? ` • ${overdue} overdue` : ''}`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary stats */}
        <View style={styles.summaryRow}>
          <SummaryStat n={pending} label="To do" color="#7c5cff" />
          <SummaryStat n={all.filter((a) => a.status === 'submitted').length} label="Submitted" color="#3aa0ff" />
          <SummaryStat n={all.filter((a) => a.status === 'graded').length} label="Graded" color="#15c98c" />
          <SummaryStat n={overdue} label="Overdue" color="#ef4444" />
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {(['all', 'pending', 'submitted', 'graded', 'overdue'] as Filter[]).map((key) => {
            const active = filter === key;
            return (
              <TouchableOpacity key={key} activeOpacity={0.85} onPress={() => setFilter(key)}>
                {active ? (
                  <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={styles.chip}>
                    <Text style={[styles.chipText, { color: '#fff' }]}>
                      {key === 'all' ? 'All' : STATUS_META[key as Assignment['status']].label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {key === 'all' ? 'All' : STATUS_META[key as Assignment['status']].label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {items.map((a) => {
          const meta = STATUS_META[a.status];
          const overdue = a.status === 'overdue';
          return (
            <TouchableOpacity key={a.id} activeOpacity={0.85} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 18 }}>{TYPE_ICONS[a.submissionType]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  <Text style={styles.cardMeta}>{a.subject} • {a.assignedBy}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.dueRow}>
                  <Ionicons
                    name={overdue ? 'warning' : 'calendar-outline'}
                    size={12}
                    color={overdue ? '#ef4444' : '#6f679c'}
                  />
                  <Text style={[styles.dueText, overdue && { color: '#ef4444' }]}>
                    Due {a.dueDate}
                  </Text>
                </View>
                {a.priority === 'high' && a.status !== 'graded' && a.status !== 'submitted' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>HIGH PRIORITY</Text>
                  </View>
                )}
                <Text style={styles.maxScore}>{a.score ?? '—'} / {a.maxScore}</Text>
              </View>

              {a.feedback && (
                <View style={styles.feedback}>
                  <Ionicons name="chatbubble" size={11} color="#7c5cff" />
                  <Text style={styles.feedbackText}>{a.feedback}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>Nothing here. All done!</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const SummaryStat: React.FC<{ n: number; label: string; color: string }> = ({ n, label, color }) => (
  <View style={styles.summaryStat}>
    <Text style={[styles.summaryNum, { color }]}>{n}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },

  chipsRow: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ece8fb',
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#6f679c' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  cardMeta: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10, gap: 8,
  },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 11, color: '#6f679c', fontWeight: '700' },
  priorityBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: { color: '#dc2626', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  maxScore: { marginLeft: 'auto', fontSize: 12, fontWeight: '800', color: '#2c2550' },

  feedback: {
    flexDirection: 'row',
    backgroundColor: '#f4f1ff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 6,
    alignItems: 'flex-start',
  },
  feedbackText: { flex: 1, fontSize: 11.5, color: '#2c2550', fontWeight: '500', lineHeight: 16 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#6f679c', fontWeight: '600', fontSize: 13 },
});
