import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  ViewToken,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const ONBOARDING_KEY = 'shuleone:onboarding:completed';

interface Slide {
  id: string;
  illustration: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: [string, string];
  shadowColor: string;
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  /** Initially true — we hide the UI behind a spinner until we know where to go. */
  const [resolving, setResolving] = useState(true);
  const flatRef = useRef<FlatList>(null);
  const { user, loading: authLoading } = useAuth();

  const SLIDES: Slide[] = [
    {
      id: '1',
      gradient: ['#FB7185', '#E11D48'],
      shadowColor: '#E11D48',
      illustration: (
        <View style={styles.illustration}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <MaterialCommunityIcons name="school" size={60} color="#FFF" />
          </View>
          <Text style={[styles.floater, styles.floater1]}>📚</Text>
          <Text style={[styles.floater, styles.floater2]}>✨</Text>
          <Text style={[styles.floater, styles.floater3]}>🎓</Text>
        </View>
      ),
      title: 'Welcome to ShuleOne',
      subtitle:
        'Your all-in-one learning, school records and family communication app.',
    },
    {
      id: '2',
      gradient: ['#8B5CF6', '#6366F1'],
      shadowColor: '#6366F1',
      illustration: (
        <View style={styles.illustration}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <FontAwesome5 name="user-graduate" size={56} color="#FFF" />
          </View>
          <Text style={[styles.floater, styles.floater1]}>🚀</Text>
          <Text style={[styles.floater, styles.floater2]}>⭐</Text>
          <Text style={[styles.floater, styles.floater3]}>🧠</Text>
        </View>
      ),
      title: 'Learn, practice & code',
      subtitle:
        'Daily missions, smart quizzes, coding, robotics and progress that grows with you.',
    },
    {
      id: '3',
      gradient: ['#F472B6', '#7C3AED'],
      shadowColor: '#7C3AED',
      illustration: (
        <View style={styles.illustration}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <Ionicons name="people" size={56} color="#FFF" />
          </View>
          <Text style={[styles.floater, styles.floater1]}>💬</Text>
          <Text style={[styles.floater, styles.floater2]}>📊</Text>
          <Text style={[styles.floater, styles.floater3]}>💳</Text>
        </View>
      ),
      title: 'Stay close to school',
      subtitle:
        "Track fees, attendance, exam results and your child's learning — all in one place.",
    },
  ];

  // -------------------------------------------------------
  // Launch logic — runs once when AuthContext is done loading.
  //
  //   1. Logged in as PARENT  → /(tabs)
  //   2. Logged in as STUDENT → /(student-tabs)
  //   3. Onboarding already done → /chooser
  //   4. Otherwise → show this onboarding carousel
  // -------------------------------------------------------
  useEffect(() => {
    if (authLoading) return; // wait for token rehydration

    (async () => {
      try {
        if (user?.userType === 'PARENT') {
          router.replace('/(tabs)' as any);
          return;
        }
        if (user?.userType === 'STUDENT') {
          router.replace('/(student-tabs)' as any);
          return;
        }
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (done === 'true') {
          router.replace('/chooser' as any);
          return;
        }
        // First-time visitor — let the carousel render
        setResolving(false);
      } catch {
        setResolving(false);
      }
    })();
  }, [authLoading, user]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    router.replace('/chooser' as any);
  };

  // Spinner while we decide where to send the user
  if (resolving) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: '#FFF' }]}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  const slide = SLIDES[activeIndex];
  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: '#FFF' }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={slide.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroBg, { shadowColor: slide.shadowColor }]}
      >
        <SafeAreaView style={styles.heroSafe}>
          <View style={styles.topBar}>
            {!isLast ? (
              <TouchableOpacity hitSlop={10} onPress={finish}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
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
              <View style={[styles.slide, { width }]}>{item.illustration}</View>
            )}
          />
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView style={styles.bottomSafe}>
        <View style={styles.bottom}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>

          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex && [
                    styles.dotActive,
                    { backgroundColor: slide.gradient[1] },
                  ],
                ]}
              />
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={goNext}>
            <LinearGradient
              colors={slide.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cta, { shadowColor: slide.shadowColor }]}
            >
              <Text style={styles.ctaText}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons
                name={isLast ? 'rocket' : 'arrow-forward'}
                size={18}
                color="#FFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  heroBg: {
    flex: 0.62,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  heroSafe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  skipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  slide: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  illustration: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 160, height: 160, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  floater: { position: 'absolute', fontSize: 28 },
  floater1: { top: 10, right: 14 },
  floater2: { bottom: 24, left: 4, fontSize: 24 },
  floater3: { top: 36, left: 18, fontSize: 22 },
  bottomSafe: { flex: 0.38, backgroundColor: '#FFF' },
  bottom: {
    flex: 1, paddingHorizontal: 28, paddingTop: 30, paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26, fontWeight: '800', color: '#2c2550',
    textAlign: 'center', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: '#6f679c', fontWeight: '500',
    textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 8,
  },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 'auto', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 28 },
  cta: {
    width: width - 56, height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
