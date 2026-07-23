// Onboarding — the first thing a logged-out user sees. A modern, brand-led
// intro carousel: a rose gradient stage with a glass illustration card, Inter
// typography matching the rest of the app, a pill progress indicator and a
// gradient CTA. Routing is handled by the entry gatekeeper (app/index.tsx);
// this screen only presents the carousel and, on finish, moves to sign-in.

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList,
  ViewToken, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { fonts } from '../constants/theme';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'shuleone:onboarding:completed';

// Brand rose is the through-line; each slide carries a soft accent within it.
const BRAND: [string, string] = ['#F43F5E', '#BE123C'];

interface Slide {
  id: string;
  icon: React.ReactNode;
  glyphs: [string, string, string];
  title: string;
  subtitle: string;
  accent: string;       // soft tint for that slide's decorative dots
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: <MaterialCommunityIcons name="school" size={58} color="#FFF" />,
    glyphs: ['📚', '✨', '🎓'],
    accent: '#FDA4AF',
    title: 'Welcome to ShuleOne',
    subtitle: 'Learning, school records and family communication — all in one beautifully simple app.',
  },
  {
    id: '2',
    icon: <FontAwesome5 name="user-graduate" size={52} color="#FFF" />,
    glyphs: ['🚀', '⭐', '🧠'],
    accent: '#C4B5FD',
    title: 'Learn, practise & code',
    subtitle: 'Daily missions, smart quizzes, coding and robotics — with progress that grows alongside your child.',
  },
  {
    id: '3',
    icon: <Ionicons name="people" size={54} color="#FFF" />,
    glyphs: ['💬', '📊', '💳'],
    accent: '#F9A8D4',
    title: 'Stay close to school',
    subtitle: 'Fees, attendance, exam results and the school bus — always a glance away, wherever you are.',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
    },
  ).current;

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch { /* ignore */ }
    router.replace('/login' as any);
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Brand stage ─────────────────────────────────────── */}
      <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stage}>
        {/* Decorative soft blobs for depth */}
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />

        <View style={[styles.stageTop, { paddingTop: insets.top + 8 }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons name="school" size={15} color="#BE123C" />
            </View>
            <Text style={styles.brandName}>ShuleOne</Text>
          </View>
          {!isLast ? (
            <TouchableOpacity hitSlop={12} onPress={finish}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 34 }} />}
        </View>

        <FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              {/* Glass illustration card */}
              <View style={styles.glass}>
                <View style={styles.glassInner}>{item.icon}</View>
                <Text style={[styles.glyph, styles.glyph1]}>{item.glyphs[0]}</Text>
                <Text style={[styles.glyph, styles.glyph2]}>{item.glyphs[1]}</Text>
                <Text style={[styles.glyph, styles.glyph3]}>{item.glyphs[2]}</Text>
              </View>
            </View>
          )}
        />
      </LinearGradient>

      {/* ── Sheet ───────────────────────────────────────────── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        {/* Re-key on slide so the copy fades in per page */}
        <Animated.View key={slide.id} entering={FadeInDown.duration(340)} style={styles.copy}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={goNext} style={styles.ctaWrap}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              {isLast ? (
                <Animated.View key="get" entering={FadeIn} style={styles.ctaRow}>
                  <Text style={styles.ctaText}>Get started</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </Animated.View>
              ) : (
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={finish} hitSlop={8} style={styles.signInHint}>
            <Text style={styles.signInHintText}>
              Already have an account? <Text style={styles.signInHintLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // Stage
  stage: {
    flex: 0.60,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  blobA: { width: 240, height: 240, top: -70, right: -60 },
  blobB: { width: 180, height: 180, bottom: 30, left: -70, backgroundColor: 'rgba(255,255,255,0.07)' },
  stageTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 26, height: 26, borderRadius: 9, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { color: '#FFF', fontSize: 15.5, fontFamily: fonts.extrabold, letterSpacing: -0.2 },
  skip: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, fontFamily: fonts.bold, letterSpacing: 0.2 },

  slide: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  glass: {
    width: 190, height: 190, borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  glassInner: {
    width: 118, height: 118, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  glyph: { position: 'absolute', fontSize: 26 },
  glyph1: { top: 8, right: 12 },
  glyph2: { bottom: 20, left: 2, fontSize: 22 },
  glyph3: { top: 30, left: 14, fontSize: 20 },

  // Sheet
  sheet: { flex: 0.40, paddingHorizontal: 28, paddingTop: 26, justifyContent: 'space-between' },
  copy: { alignItems: 'center' },
  title: { fontSize: 25, fontFamily: fonts.extrabold, color: '#1F2937', textAlign: 'center', letterSpacing: -0.6 },
  subtitle: {
    fontSize: 14, fontFamily: fonts.regular, color: '#6B7280',
    textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 4,
  },

  footer: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 26, backgroundColor: '#E11D48' },

  ctaWrap: { width: '100%' },
  cta: {
    height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#BE123C', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0.4, shadowRadius: 14, elevation: 7,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ctaText: { color: '#FFF', fontSize: 15.5, fontFamily: fonts.bold, letterSpacing: 0.2 },

  signInHint: { marginTop: 16 },
  signInHintText: { fontSize: 13, fontFamily: fonts.medium, color: '#9CA3AF' },
  signInHintLink: { color: '#E11D48', fontFamily: fonts.bold },
});
