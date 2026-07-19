import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { mockScratchLessons, mockScratchTemplates } from '../codeLabData';

export const ScratchView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const done = mockScratchLessons.filter((l) => l.done).length;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title="🐱 Scratch"
        subtitle={`${done} of ${mockScratchLessons.length} lessons done`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero with launch button */}
        <LinearGradient colors={['#ff9d2e', '#ff5e9c']} style={[styles.hero, { borderRadius: tokens.radius }]}>
          <Text style={styles.heroEmoji}>🐱</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Open Scratch Studio</Text>
            <Text style={styles.heroSub}>
              Drag blocks to make games, stories, and animations.
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.heroBtn}
            onPress={() => router.push('/student/playground?kind=SCRATCH' as any)}>
            <Ionicons name="open-outline" size={14} color="#ff5e9c" />
            <Text style={styles.heroBtnText}>Launch</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Lessons */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>📚 Lessons</Text>
          <View style={styles.secHLine} />
        </View>

        {mockScratchLessons.map((l) => (
          <TouchableOpacity
            key={l.id}
            activeOpacity={l.locked ? 1 : 0.85}
            style={[styles.lessonRow, l.locked && styles.lessonLocked]}
          >
            <View style={[styles.stepCircle, l.done && styles.stepDone, l.locked && styles.stepLocked]}>
              {l.done ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : l.locked ? (
                <Ionicons name="lock-closed" size={12} color="#9b94c4" />
              ) : (
                <Text style={styles.stepNum}>{l.step}</Text>
              )}
            </View>
            <Text style={styles.lessonEmoji}>{l.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.lessonDesc} numberOfLines={1}>{l.description}</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={11} color="#6f679c" />
                <Text style={styles.timeText}>{l.estTime}</Text>
              </View>
            </View>
            {!l.locked && !l.done && (
              <View style={styles.playPill}>
                <Ionicons name="play" size={11} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Templates */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>🎨 Start from a template</Text>
          <View style={styles.secHLine} />
        </View>

        <View style={styles.templatesGrid}>
          {mockScratchTemplates.map((t) => (
            <TouchableOpacity key={t.id} activeOpacity={0.85} style={styles.templateCard}>
              <LinearGradient colors={t.color as [string, string]} style={[styles.templateThumb, { borderRadius: tokens.radius }]}>
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
              </LinearGradient>
              <Text style={styles.templateTitle}>{t.title}</Text>
              <Text style={styles.templateDesc}>{t.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 14,
    shadowColor: '#ff5e9c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  heroEmoji: { fontSize: 48 },
  heroTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.95, lineHeight: 16 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  heroBtnText: { color: '#ff5e9c', fontWeight: '800', fontSize: 12 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  secHTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 14, gap: 10, marginBottom: 8,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
  },
  lessonLocked: { opacity: 0.55 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#efeaff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDone: { backgroundColor: '#15c98c' },
  stepLocked: { backgroundColor: '#f4f1ff' },
  stepNum: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },
  lessonEmoji: { fontSize: 24 },
  lessonTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  lessonDesc: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  timeText: { fontSize: 10.5, color: '#6f679c', fontWeight: '600' },
  playPill: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ff9d2e',
    alignItems: 'center', justifyContent: 'center',
  },

  templatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  templateCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 14, padding: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  templateThumb: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  templateEmoji: { fontSize: 40 },
  templateTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  templateDesc: { fontSize: 10.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },
});
