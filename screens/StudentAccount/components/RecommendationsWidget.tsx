import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { mockRecommendations, RecReason } from '../polishData';

const REASON_META: Record<RecReason, { icon: any; label: string; color: string }> = {
  'weak-topic': { icon: 'fitness-outline', label: 'Practice weak spot', color: '#ef4444' },
  'continue':   { icon: 'play-outline',     label: 'Continue',            color: '#7c5cff' },
  'streak':     { icon: 'flame-outline',    label: 'Keep streak',         color: '#f4a716' },
  'upcoming':   { icon: 'alarm-outline',    label: 'Coming up',           color: '#3aa0ff' },
  'new':        { icon: 'sparkles-outline', label: 'New for you',         color: '#15c98c' },
};

/**
 * Adaptive recommendations widget - drops into the student home below
 * "Continue Learning". Tap a card to navigate to its target route.
 *
 * Filtered by current tier so each age sees age-appropriate suggestions.
 */
export const RecommendationsWidget: React.FC = () => {
  const { tier } = useTier();
  const recs = mockRecommendations.filter((r) => r.tier.includes(tier)).slice(0, 5);

  if (recs.length === 0) return null;

  const heading = pickByTier(tier, {
    base: '🎯 Picked for you',
    sprout: '🎯 Try this next!',
    explorer: '🎯 Try this next!',
  });

  return (
    <View style={{ marginBottom: 18 }}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subhead}>Based on your activity</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}
      >
        {recs.map((r) => {
          const meta = REASON_META[r.reason];
          return (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.85}
              onPress={() => router.push(r.route as any)}
              style={styles.card}
            >
              <LinearGradient colors={r.color} style={styles.thumb}>
                <Text style={styles.emoji}>{r.emoji}</Text>
                <View style={[styles.reasonPill, { borderColor: meta.color }]}>
                  <Ionicons name={meta.icon} size={10} color={meta.color} />
                  <Text style={[styles.reasonText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </LinearGradient>

              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{r.title}</Text>
                <Text style={styles.reasonLine} numberOfLines={2}>{r.reasonText}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={11} color="#6f679c" />
                    <Text style={styles.metaText}>{r.estMinutes} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="flash-outline" size={11} color="#f4a716" />
                    <Text style={[styles.metaText, { color: '#f4a716' }]}>+{r.xpReward} XP</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headRow: { marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  subhead: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },

  card: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    height: 90,
    padding: 12,
    justifyContent: 'space-between',
  },
  emoji: { fontSize: 32 },
  reasonPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  reasonText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },

  body: { padding: 12 },
  title: { fontSize: 13, fontWeight: '800', color: '#2c2550', lineHeight: 17 },
  reasonLine: { fontSize: 11, color: '#6f679c', fontWeight: '500', marginTop: 4, lineHeight: 15, minHeight: 30 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10.5, color: '#6f679c', fontWeight: '700' },
});
