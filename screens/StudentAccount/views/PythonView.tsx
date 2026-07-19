import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { mockPythonLessons, mockPythonStarter } from '../codeLabData';

export const PythonView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const done = mockPythonLessons.filter((l) => l.done).length;
  const [code, setCode] = useState(mockPythonStarter);
  const [output, setOutput] = useState<string>('');

  // Group lessons by unit
  const units = Array.from(new Set(mockPythonLessons.map((l) => l.unit))).sort();

  const handleRun = () => {
    // Mock execution. Real Pyodide integration plugged in later.
    setOutput('▶ Running...\n\nWhat is your name? Amani\nHello, Amani!\n\n[Process finished with exit code 0]');
  };

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title="🐍 Python"
        subtitle={`${done} of ${mockPythonLessons.length} lessons done`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#3aa0ff', '#7c5cff']} style={[styles.hero, { borderRadius: tokens.radius }]}>
          <Text style={styles.heroEmoji}>🐍</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Real text programming</Text>
            <Text style={styles.heroSub}>Run Python right in your browser. No setup needed.</Text>
          </View>
        </LinearGradient>

        {/* Mock editor */}
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <View style={styles.tabsRow}>
              <View style={styles.tabDot} />
              <View style={[styles.tabDot, { backgroundColor: '#f4a716' }]} />
              <View style={[styles.tabDot, { backgroundColor: '#15c98c' }]} />
              <Text style={styles.editorFile}>main.py</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={handleRun} style={styles.runBtn}>
              <Ionicons name="play" size={12} color="#fff" />
              <Text style={styles.runBtnText}>Run</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            multiline
            value={code}
            onChangeText={setCode}
            style={styles.editor}
            placeholder="# Write your code here"
            placeholderTextColor="#6b7280"
          />
          {output ? (
            <View style={styles.outputBox}>
              <Text style={styles.outputLabel}>OUTPUT</Text>
              <Text style={styles.outputText}>{output}</Text>
            </View>
          ) : null}
        </View>

        {/* Lessons */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>📚 Curriculum</Text>
          <View style={styles.secHLine} />
        </View>

        {units.map((unit) => (
          <View key={unit} style={{ marginBottom: 14 }}>
            <Text style={styles.unitTitle}>Unit {unit}</Text>
            {mockPythonLessons.filter((l) => l.unit === unit).map((l) => (
              <TouchableOpacity
                key={l.id}
                activeOpacity={l.locked ? 1 : 0.85}
                style={[styles.lessonRow, l.locked && styles.lessonLocked]}
              >
                <View style={[styles.lessonCircle, l.done && styles.lessonDone, l.locked && styles.lessonLockedCircle]}>
                  {l.done ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : l.locked ? (
                    <Ionicons name="lock-closed" size={11} color="#9b94c4" />
                  ) : (
                    <Ionicons name="play" size={12} color="#3aa0ff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>{l.title}</Text>
                  <Text style={styles.lessonDesc} numberOfLines={1}>{l.description}</Text>
                  <View style={styles.topicChips}>
                    {l.topics.slice(0, 3).map((t) => (
                      <View key={t} style={styles.topicChip}>
                        <Text style={styles.topicChipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.duration}>{l.duration}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14,
    shadowColor: '#3aa0ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  heroEmoji: { fontSize: 42 },
  heroTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.95 },

  // Editor
  editorCard: {
    backgroundColor: '#1e1b2e', borderRadius: 14, overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  editorHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#2c2550',
  },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  editorFile: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 8 },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#15c98c', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  runBtnText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },
  editor: {
    color: '#a7f3d0', fontFamily: 'monospace', fontSize: 13,
    padding: 14, minHeight: 110, textAlignVertical: 'top',
  },
  outputBox: {
    backgroundColor: '#0f1019',
    padding: 14, borderTopWidth: 1, borderTopColor: '#3a3656',
  },
  outputLabel: { color: '#6f679c', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  outputText: { color: '#e5e7eb', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  unitTitle: { fontSize: 12, fontWeight: '800', color: '#7c5cff', letterSpacing: 0.5, marginBottom: 8 },
  lessonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 12, gap: 10, marginBottom: 6,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
  },
  lessonLocked: { opacity: 0.6 },
  lessonCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
  },
  lessonDone: { backgroundColor: '#15c98c' },
  lessonLockedCircle: { backgroundColor: '#f4f1ff' },
  lessonTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  lessonDesc: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 1 },
  topicChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  topicChip: {
    backgroundColor: '#efeaff',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
  },
  topicChipText: { fontSize: 9, color: '#7c5cff', fontWeight: '800', fontFamily: 'monospace' },
  duration: { fontSize: 10.5, color: '#6f679c', fontWeight: '700' },
});
