import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { Mascot } from '../components/Mascot';
import { AgeSwitcher } from '../components/AgeSwitcher';

/**
 * Lesson view - the content totally differs per tier:
 * - sprout: counting apples with audio + numberline
 * - explorer: fractions video + halves/quarters quick check
 * - voyager: algebra variables with practice input
 * - scholar: quadratic equations with KCSE past paper
 * - campus: BST module with resources + assignment brief
 */
export const LessonView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      {/* Top bar with back button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#2c2550" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tier === 'sprout' ? "📖 Today's Lesson" : tier === 'campus' ? '📦 Module' : '📖 Lesson'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tier === 'sprout' && <SproutLesson tokens={tokens} />}
        {tier === 'explorer' && <ExplorerLesson tokens={tokens} />}
        {tier === 'voyager' && <VoyagerLesson tokens={tokens} />}
        {tier === 'scholar' && <ScholarLesson tokens={tokens} />}
        {tier === 'campus' && <CampusLesson tokens={tokens} />}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// ============================================================
// SPROUT: Counting to 5 with apples
// ============================================================
const SproutLesson: React.FC<{ tokens: any }> = ({ tokens }) => (
  <>
    <LinearGradient
      colors={['#fff', '#fbf7ff']}
      style={[styles.lcard, { borderRadius: tokens.radius }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mascot size={70} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h4Big}>Counting to 5 🍎</Text>
          <Text style={styles.p}>Let's count the apples together!</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={styles.audioBtn}>
          <TouchableOpacity activeOpacity={0.85} style={styles.audioBtnTouch}>
            <Text style={styles.audioBtnText}>🔊 Tap to hear</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
      <View style={styles.tapRow}>
        {['🍎', '🍎', '🍎', '🍎', '🍎'].map((a, i) => (
          <Text key={i} style={styles.bigApple}>{a}</Text>
        ))}
      </View>
      <View style={styles.numline}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={[styles.numBox, n === 5 && [styles.numHi, { backgroundColor: tokens.accent1 }]]}>
            <Text style={[styles.numText, n === 5 && { color: '#fff' }]}>{n}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.summaryText}>
        There are <Text style={{ color: tokens.accent1, fontWeight: '800' }}>5</Text> apples! 🎉
      </Text>
    </LinearGradient>

    <LinearGradient colors={[SHARED.orange1, SHARED.pink1]} style={[styles.bigBtn, { borderRadius: 999 }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
        <Text style={styles.bigBtnText}>I did it! ⭐</Text>
      </TouchableOpacity>
    </LinearGradient>
  </>
);

// ============================================================
// EXPLORER: Fractions
// ============================================================
const ExplorerLesson: React.FC<{ tokens: any }> = ({ tokens }) => (
  <>
    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius }]}>
      <View style={styles.lstep}>
        <View style={[styles.stepBar, styles.stepBarOn]} />
        <View style={[styles.stepBar, styles.stepBarOn]} />
        <View style={styles.stepBar} />
        <View style={styles.stepBar} />
      </View>
      <Text style={styles.h4}>Fractions: Halves & Quarters</Text>

      <View style={styles.video}>
        <View style={styles.playC}>
          <Text style={{ fontSize: 20, color: '#fff' }}>▶</Text>
        </View>
        <View style={styles.videoDur}>
          <Text style={styles.videoDurText}>2:30</Text>
        </View>
      </View>

      <Text style={styles.p}>
        A <Text style={styles.b}>fraction</Text> shows equal parts of a whole. Cut a pizza into 2 equal parts and each part is{' '}
        <Text style={styles.b}>one half</Text> (½).
      </Text>
      <View style={styles.visual}>
        <Text style={styles.visualText}>🍕🍕</Text>
      </View>
      <View style={styles.example}>
        <Text style={styles.exampleText}>
          Share 1 pizza between 4 friends → each gets{' '}
          <Text style={{ color: tokens.accent1, fontWeight: '800' }}>¼</Text> (one quarter).
        </Text>
      </View>
    </View>

    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius }]}>
      <Text style={styles.h4}>✏️ Quick check</Text>
      <Text style={[styles.p, { marginBottom: 10 }]}>How many quarters make one whole?</Text>
      <View style={styles.opts}>
        <TouchableOpacity activeOpacity={0.85} style={styles.opt}>
          <Text style={styles.optEm}>2️⃣</Text>
          <Text style={styles.optText}>Two</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} style={styles.opt}>
          <Text style={styles.optEm}>4️⃣</Text>
          <Text style={styles.optText}>Four</Text>
        </TouchableOpacity>
      </View>
    </View>

    <LinearGradient colors={[SHARED.green1, '#0fae78']} style={[styles.bigBtn, { borderRadius: 999 }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
        <Text style={styles.bigBtnText}>Mark complete · +20 XP</Text>
      </TouchableOpacity>
    </LinearGradient>
  </>
);

// ============================================================
// VOYAGER: Algebra variables
// ============================================================
const VoyagerLesson: React.FC<{ tokens: any }> = ({ tokens }) => (
  <>
    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius }]}>
      <View style={styles.lmetaRow}>
        {['📐 Mathematics', '⏱️ 15 min', '🎯 +30 XP', '👥 12 classmates here'].map((m) => (
          <View key={m} style={styles.lmetaPill}>
            <Text style={styles.lmetaText}>{m}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.h4}>Introduction to Algebra: Variables</Text>

      <Text style={[styles.b, { marginTop: 6 }]}>Learning objectives</Text>
      <View style={{ marginTop: 6, gap: 6 }}>
        {['Understand what a variable represents', 'Write a simple expression using a letter', 'Solve for an unknown value'].map((o) => (
          <View key={o} style={styles.objRow}>
            <Text style={{ color: tokens.accent2, fontWeight: '800' }}>✔</Text>
            <Text style={styles.objText}>{o}</Text>
          </View>
        ))}
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleText}>
          A <Text style={styles.b}>variable</Text> is a letter that stands for a number we don't know yet. In{' '}
          <Text style={styles.b}>x + 3 = 7</Text>, the letter <Text style={styles.b}>x</Text> is the unknown.
        </Text>
      </View>
      <LinearGradient colors={['#f3f0ff', '#e9fbff']} style={styles.example}>
        <Text style={styles.exampleText}>
          🔗 <Text style={styles.b}>Coding link:</Text> in Scratch, a variable like <Text style={{ fontStyle: 'italic' }}>score</Text> works exactly the same way.
        </Text>
      </LinearGradient>
    </View>

    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius }]}>
      <Text style={styles.h4}>🧮 Your turn</Text>
      <Text style={styles.p}>
        If <Text style={styles.b}>x + 3 = 7</Text>, what is x?
      </Text>
      <View style={styles.practice}>
        <TextInput
          placeholder="x = ?"
          placeholderTextColor="#9b94c4"
          style={styles.practiceInput}
        />
        <LinearGradient colors={[SHARED.green1, '#0fae78']} style={{ borderRadius: 999 }}>
          <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
            <Text style={styles.bigBtnText}>Check</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>

    <LinearGradient colors={[SHARED.green1, '#0fae78']} style={[styles.bigBtn, { borderRadius: 999 }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
        <Text style={styles.bigBtnText}>Submit & continue 🔥</Text>
      </TouchableOpacity>
    </LinearGradient>
  </>
);

// ============================================================
// SCHOLAR: Quadratics
// ============================================================
const ScholarLesson: React.FC<{ tokens: any }> = ({ tokens }) => (
  <>
    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius, borderWidth: 1, borderColor: '#ece8fb' }]}>
      <View style={styles.lmetaRow}>
        {['📐 Mathematics · Paper 1', '⏱️ 25 min', '📄 Download notes', '🔖 Mark for revision'].map((m) => (
          <View key={m} style={styles.lmetaPill}>
            <Text style={styles.lmetaText}>{m}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.h4}>Quadratic Equations — Completing the Square</Text>
      <Text style={styles.p}>
        <Text style={styles.b}>Learning outcomes:</Text> express a quadratic as a(x + p)² + q, then use it to solve equations and find the turning point.
      </Text>

      <View style={{ marginTop: 10, gap: 8 }}>
        {[
          'Make the coefficient of x² equal to 1.',
          'Halve the coefficient of x and square it.',
          'Add and subtract that value; factorise the perfect square.',
          'Rearrange to solve for x.',
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: tokens.accent1 }]}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleText}>
          Worked: x² + 6x + 5 = 0 → (x + 3)² − 4 = 0 → x = −1 or x = −5
        </Text>
      </View>
    </View>

    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius, borderWidth: 1, borderColor: '#ece8fb' }]}>
      <Text style={styles.h4}>📝 Exam practice</Text>
      <View style={[styles.pastpaper, { borderColor: tokens.accent1 }]}>
        <View style={[styles.tagp, { backgroundColor: tokens.accent1 }]}>
          <Text style={styles.tagpText}>KCSE 2022 · Q6</Text>
        </View>
        <Text style={[styles.p, { marginTop: 8 }]}>
          Solve 2x² − 8x + 3 = 0 by completing the square. (4 marks)
        </Text>
      </View>
      <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={[styles.bigBtn, { borderRadius: 12, marginTop: 14 }]}>
        <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
          <Text style={styles.bigBtnText}>Attempt question</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  </>
);

// ============================================================
// CAMPUS: BST module
// ============================================================
const CampusLesson: React.FC<{ tokens: any }> = ({ tokens }) => (
  <>
    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius, borderWidth: 1, borderColor: '#ece8fb' }]}>
      <View style={styles.lmetaRow}>
        {['CSC 201 · Week 5', '3 credits', '⏱️ 2h lecture'].map((m) => (
          <View key={m} style={styles.lmetaPill}>
            <Text style={styles.lmetaText}>{m}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.h4}>Data Structures — Binary Search Trees</Text>
      <Text style={styles.p}>
        <Text style={styles.b}>Learning outcomes:</Text> describe BST properties, implement insert & search, and analyse average vs worst-case time complexity.
      </Text>
    </View>

    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius, borderWidth: 1, borderColor: '#ece8fb' }]}>
      <Text style={styles.h4}>📚 Module resources</Text>
      {[
        { ic: '🎬', title: 'Lecture 5 — BST operations', sub: 'Prof. Mwangi', meta: '48 min' },
        { ic: '📊', title: 'Slides — Trees & traversal', sub: 'PDF · 32 slides', meta: 'Open' },
        { ic: '📖', title: 'Reading — CLRS Ch. 12', sub: 'Cormen et al.', meta: 'pp. 286–307' },
      ].map((r, i, arr) => (
        <View key={r.title} style={[styles.resRow, i < arr.length - 1 && styles.resDivider]}>
          <View style={styles.resIcon}>
            <Text style={{ fontSize: 16 }}>{r.ic}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resTitle}>{r.title}</Text>
            <Text style={styles.resSub}>{r.sub}</Text>
          </View>
          <Text style={styles.resMeta}>{r.meta}</Text>
        </View>
      ))}
    </View>

    <View style={[styles.lcard, { backgroundColor: '#fff', borderRadius: tokens.radius, borderWidth: 1, borderColor: '#ece8fb' }]}>
      <Text style={styles.h4}>🧾 Assignment</Text>
      <View style={styles.brief}>
        <Text style={styles.briefText}>
          <Text style={styles.b}>Lab 5:</Text> implement a balanced BST and benchmark search against a linear list.{' '}
          <Text style={styles.b}>Due Fri 30 May, 23:59</Text> · 10% of final grade.
        </Text>
      </View>
      <Text style={styles.refs}>
        <Text style={styles.b}>References:</Text> Cormen, Leiserson, Rivest & Stein (2009).{' '}
        <Text style={{ fontStyle: 'italic' }}>Introduction to Algorithms</Text> (3rd ed.). MIT Press.
      </Text>
    </View>

    <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={[styles.bigBtn, { borderRadius: 12 }]}>
      <TouchableOpacity activeOpacity={0.85} style={styles.bigBtnTouch}>
        <Text style={styles.bigBtnText}>Open discussion forum</Text>
      </TouchableOpacity>
    </LinearGradient>
  </>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 0 },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#2c2550' },
  scroll: { padding: 16 },

  lcard: {
    padding: 18,
    marginBottom: 14,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 3,
  },
  h4: { fontSize: 17, fontWeight: '800', color: '#2c2550', marginBottom: 8 },
  h4Big: { fontSize: 21, fontWeight: '800', color: '#2c2550' },
  p: { color: '#6f679c', fontWeight: '500', fontSize: 13.5, lineHeight: 21 },
  b: { fontWeight: '800', color: '#2c2550' },

  audioBtn: { borderRadius: 999 },
  audioBtnTouch: { paddingVertical: 11, paddingHorizontal: 20 },
  audioBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  tapRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginVertical: 16, gap: 12 },
  bigApple: { fontSize: 46 },
  numline: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  numBox: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#efeaff', alignItems: 'center', justifyContent: 'center' },
  numHi: { transform: [{ scale: 1.12 }] },
  numText: { fontWeight: '800', fontSize: 19, color: '#7c5cff' },
  summaryText: { textAlign: 'center', marginTop: 14, fontSize: 16, fontWeight: '600', color: '#2c2550' },

  lstep: { flexDirection: 'row', gap: 5, marginBottom: 12 },
  stepBar: { flex: 1, height: 7, borderRadius: 99, backgroundColor: '#efeaff' },
  stepBarOn: { backgroundColor: '#7c5cff' },

  video: {
    height: 140,
    backgroundColor: '#3aa0ff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  playC: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  videoDur: { position: 'absolute', bottom: 8, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  videoDurText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },

  visual: { alignItems: 'center', marginVertical: 6 },
  visualText: { fontSize: 40 },
  example: { backgroundColor: '#efeaff', borderRadius: 12, padding: 12, marginTop: 10 },
  exampleText: { color: '#2c2550', fontWeight: '600', fontSize: 13 },

  opts: { flexDirection: 'row', gap: 10 },
  opt: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 3, borderColor: '#ece8fb', borderRadius: 14, padding: 12, gap: 8 },
  optEm: { fontSize: 22 },
  optText: { fontSize: 14, fontWeight: '700', color: '#2c2550' },

  bigBtn: {
    marginTop: 8,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  bigBtnTouch: { paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  lmetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  lmetaPill: { backgroundColor: '#efeaff', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  lmetaText: { color: '#6f679c', fontWeight: '700', fontSize: 10.5 },

  objRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  objText: { flex: 1, color: '#2c2550', fontWeight: '600', fontSize: 13 },

  practice: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 },
  practiceInput: {
    flex: 1,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: '#ece8fb',
    borderRadius: 11,
    padding: 11,
    fontSize: 15,
    color: '#2c2550',
  },

  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  stepText: { flex: 1, color: '#6f679c', fontWeight: '500', fontSize: 13 },

  pastpaper: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 14, marginTop: 8 },
  tagp: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  tagpText: { color: '#fff', fontWeight: '800', fontSize: 10 },

  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  resDivider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },
  resIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#efeaff', alignItems: 'center', justifyContent: 'center' },
  resTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  resSub: { fontSize: 11, color: '#6f679c', fontWeight: '500', marginTop: 1 },
  resMeta: { fontSize: 11, color: '#6f679c', fontWeight: '700' },

  brief: { backgroundColor: '#fff7ec', borderWidth: 1, borderColor: '#f6e0b8', borderRadius: 11, padding: 12, marginTop: 6 },
  briefText: { color: '#8a5a00', fontSize: 13, lineHeight: 19 },
  refs: { fontSize: 11, color: '#6f679c', fontWeight: '500', marginTop: 10, lineHeight: 16 },
});
