import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockMobileDevModules, MobileDevModule } from '../codeLabData';

const TYPE_META: Record<MobileDevModule['type'], { label: string; color: string; bg: string; icon: any }> = {
  concept:  { label: 'Concept',  color: '#3aa0ff', bg: '#dbeafe', icon: 'book-outline' },
  design:   { label: 'Design',   color: '#ff5e9c', bg: '#fce7f3', icon: 'color-palette-outline' },
  code:     { label: 'Code',     color: '#7c5cff', bg: '#efeaff', icon: 'code-slash-outline' },
  project:  { label: 'Project',  color: '#15c98c', bg: '#eafef3', icon: 'rocket-outline' },
};

export const MobileDevView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const done = mockMobileDevModules.filter((m) => m.done).length;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title="📱 Mobile Dev"
        subtitle={`${done} of ${mockMobileDevModules.length} modules done`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#15c98c', '#13b8c6']} style={[styles.hero, { borderRadius: tokens.radius }]}>
          <Text style={styles.heroEmoji}>📱</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Build real mobile apps</Text>
            <Text style={styles.heroSub}>Learn React Native concepts, design, and ship your first app.</Text>
          </View>
        </LinearGradient>

        <View style={styles.secH}>
          <Text style={styles.secHTitle}>📚 Modules</Text>
          <View style={styles.secHLine} />
        </View>

        {mockMobileDevModules.map((m, idx) => {
          const meta = TYPE_META[m.type];
          return (
            <View key={m.id}>
              <TouchableOpacity
                activeOpacity={m.locked ? 1 : 0.85}
                style={[styles.moduleCard, m.locked && styles.moduleLocked]}
              >
                <View style={styles.moduleHeader}>
                  <View style={styles.moduleNumber}>
                    <Text style={styles.moduleNumberText}>{m.number}</Text>
                  </View>
                  <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  {m.done && <Ionicons name="checkmark-circle" size={20} color="#15c98c" />}
                  {m.locked && <Ionicons name="lock-closed" size={16} color="#9b94c4" />}
                </View>
                <Text style={[styles.moduleTitle, m.locked && { color: '#9b94c4' }]}>
                  {m.title}
                </Text>
                <Text style={[styles.moduleDesc, m.locked && { color: '#cbc6e2' }]} numberOfLines={2}>
                  {m.description}
                </Text>
                <View style={styles.moduleFooter}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={11} color="#6f679c" />
                    <Text style={styles.timeText}>{m.duration}</Text>
                  </View>
                  {!m.locked && (
                    <Text style={styles.actionText}>
                      {m.done ? 'Review →' : 'Start →'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {idx < mockMobileDevModules.length - 1 && <View style={styles.connector} />}
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14,
    shadowColor: '#15c98c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  heroEmoji: { fontSize: 42 },
  heroTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.95, lineHeight: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  moduleCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  moduleLocked: { opacity: 0.6 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  moduleNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#13b8c6',
    alignItems: 'center', justifyContent: 'center',
  },
  moduleNumberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 99,
  },
  typeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  moduleTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550' },
  moduleDesc: { fontSize: 12, color: '#6f679c', fontWeight: '600', marginTop: 3, lineHeight: 16 },
  moduleFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 11, color: '#6f679c', fontWeight: '700' },
  actionText: { fontSize: 11.5, color: '#15c98c', fontWeight: '800' },

  connector: {
    width: 2, height: 16,
    backgroundColor: '#ece8fb',
    marginLeft: 28,
  },
});
