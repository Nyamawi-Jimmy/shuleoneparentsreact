import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import {
  mockRoboticsComponents, mockRoboticsLessons, mockRoboticsProjects,
  RoboticsComponent,
} from '../codeLabData';

type Tab = 'lessons' | 'components' | 'projects';

export const RoboticsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const [tab, setTab] = useState<Tab>('lessons');

  const lessonsDone = mockRoboticsLessons.filter((l) => l.done).length;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title="🤖 Robotics"
        subtitle={`${lessonsDone} of ${mockRoboticsLessons.length} lessons done`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#7c3aed', '#0ea5a8']} style={[styles.hero, { borderRadius: tokens.radius }]}>
          <Text style={styles.heroEmoji}>🤖</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Build real robots</Text>
            <Text style={styles.heroSub}>Sensors, motors, code. Make machines come alive.</Text>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TabBtn label="Lessons" active={tab === 'lessons'} onPress={() => setTab('lessons')} />
          <TabBtn label="Components" active={tab === 'components'} onPress={() => setTab('components')} />
          <TabBtn label="Projects" active={tab === 'projects'} onPress={() => setTab('projects')} />
        </View>

        {tab === 'lessons' && <LessonsTab radius={tokens.radius} />}
        {tab === 'components' && <ComponentsTab radius={tokens.radius} />}
        {tab === 'projects' && <ProjectsTab radius={tokens.radius} />}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const TabBtn: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ============================================================
// LESSONS TAB
// ============================================================
const LessonsTab: React.FC<{ radius: number }> = ({ radius }) => (
  <View>
    {mockRoboticsLessons.map((l, idx) => (
      <View key={l.id}>
        <TouchableOpacity
          activeOpacity={l.locked ? 1 : 0.85}
          style={[styles.lessonCard, l.locked && styles.locked, { borderRadius: radius }]}
        >
          <View style={styles.lessonLeft}>
            <View style={[styles.stepBubble, l.done && styles.stepDone]}>
              {l.done ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : l.locked ? (
                <Ionicons name="lock-closed" size={13} color="#9b94c4" />
              ) : (
                <Text style={styles.stepNum}>{l.step}</Text>
              )}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonEmoji}>{l.emoji}</Text>
              <Text style={[styles.lessonTitle, l.locked && { color: '#9b94c4' }]}>{l.title}</Text>
            </View>
            <Text style={[styles.lessonDesc, l.locked && { color: '#cbc6e2' }]}>{l.description}</Text>
            <View style={styles.compsRow}>
              {l.componentsUsed.map((c) => (
                <View key={c} style={styles.compChip}>
                  <Text style={styles.compChipText}>{c}</Text>
                </View>
              ))}
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={11} color="#6f679c" />
              <Text style={styles.timeText}>{l.duration}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {idx < mockRoboticsLessons.length - 1 && <View style={styles.connector} />}
      </View>
    ))}
  </View>
);

// ============================================================
// COMPONENTS CATALOG TAB
// ============================================================
const CATEGORIES = [
  { key: 'controller' as const, label: 'Controllers', emoji: '🧠' },
  { key: 'sensor' as const, label: 'Sensors', emoji: '📡' },
  { key: 'motor' as const, label: 'Motors', emoji: '⚙️' },
  { key: 'output' as const, label: 'Outputs', emoji: '💡' },
];

const ComponentsTab: React.FC<{ radius: number }> = ({ radius }) => (
  <View>
    {CATEGORIES.map((cat) => {
      const items = mockRoboticsComponents.filter((c) => c.category === cat.key);
      return (
        <View key={cat.key} style={{ marginBottom: 16 }}>
          <View style={styles.catHeader}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={styles.catTitle}>{cat.label}</Text>
            <Text style={styles.catCount}>{items.length}</Text>
          </View>
          {items.map((c) => <ComponentCard key={c.id} comp={c} radius={radius} />)}
        </View>
      );
    })}
  </View>
);

const ComponentCard: React.FC<{ comp: RoboticsComponent; radius: number }> = ({ comp, radius }) => (
  <TouchableOpacity activeOpacity={0.85} style={[styles.compCard, { borderRadius: radius }]}>
    <LinearGradient colors={comp.color} style={styles.compIcon}>
      <Text style={styles.compEmoji}>{comp.emoji}</Text>
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={styles.compName}>{comp.name}</Text>
      <Text style={styles.compDesc}>{comp.description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#9b94c4" />
  </TouchableOpacity>
);

// ============================================================
// PROJECTS TAB
// ============================================================
const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  available: { label: 'Available', bg: '#dbeafe', color: '#3aa0ff' },
  'in-progress': { label: 'In progress', bg: '#fff7e6', color: '#f4a716' },
  submitted: { label: 'Submitted', bg: '#efeaff', color: '#7c5cff' },
  reviewed: { label: 'Reviewed', bg: '#eafef3', color: '#15c98c' },
};

const ProjectsTab: React.FC<{ radius: number }> = ({ radius }) => (
  <View style={styles.projectsGrid}>
    {mockRoboticsProjects.map((p) => {
      const meta = STATUS_META[p.status];
      return (
        <TouchableOpacity key={p.id} activeOpacity={0.85} style={[styles.projectCard, { borderRadius: radius }]}>
          <LinearGradient colors={p.color} style={styles.projectThumb}>
            <Text style={styles.projectEmoji}>{p.thumb}</Text>
            <View style={styles.diffBadge}>
              <Text style={styles.diffText}>{p.difficulty}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.projectTitle}>{p.title}</Text>
          <View style={styles.projectMetaRow}>
            <Ionicons name="hardware-chip-outline" size={11} color="#6f679c" />
            <Text style={styles.projectMeta}>{p.componentsCount} parts</Text>
            <Text style={styles.projectMetaSep}>·</Text>
            <Ionicons name="time-outline" size={11} color="#6f679c" />
            <Text style={styles.projectMeta}>{p.estTime}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  heroEmoji: { fontSize: 42 },
  heroTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.95, lineHeight: 16 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 4, marginBottom: 14,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 1,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9,
  },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { fontSize: 12.5, fontWeight: '800', color: '#6f679c' },
  tabTextActive: { color: '#fff' },

  // Lessons
  lessonCard: {
    flexDirection: 'row',
    backgroundColor: '#fff', padding: 12, gap: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 1,
  },
  locked: { opacity: 0.6 },
  lessonLeft: { alignItems: 'center' },
  stepBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#efeaff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDone: { backgroundColor: '#15c98c' },
  stepNum: { color: '#7c3aed', fontWeight: '800', fontSize: 13 },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonEmoji: { fontSize: 20 },
  lessonTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#2c2550' },
  lessonDesc: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 3, lineHeight: 16 },
  compsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  compChip: {
    backgroundColor: '#f4f1ff',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99,
  },
  compChipText: { fontSize: 9.5, color: '#7c3aed', fontWeight: '800' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  timeText: { fontSize: 10.5, color: '#6f679c', fontWeight: '700' },
  connector: { width: 2, height: 12, backgroundColor: '#ece8fb', marginLeft: 28 },

  // Components catalog
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catEmoji: { fontSize: 20 },
  catTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#2c2550' },
  catCount: {
    fontSize: 10, color: '#7c3aed', fontWeight: '800',
    backgroundColor: '#efeaff',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99,
  },
  compCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 12, marginBottom: 6,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  compIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  compEmoji: { fontSize: 22 },
  compName: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  compDesc: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 2, lineHeight: 14 },

  // Projects
  projectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  projectCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', padding: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  projectThumb: {
    height: 90, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', marginBottom: 8,
  },
  projectEmoji: { fontSize: 44 },
  diffBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  diffText: { fontSize: 8.5, fontWeight: '800', color: '#2c2550', letterSpacing: 0.3 },
  projectTitle: { fontSize: 12.5, fontWeight: '800', color: '#2c2550' },
  projectMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, flexWrap: 'wrap' },
  projectMeta: { fontSize: 10, color: '#6f679c', fontWeight: '700' },
  projectMetaSep: { color: '#cbc6e2', marginHorizontal: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    marginTop: 6,
  },
  statusText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },
});
