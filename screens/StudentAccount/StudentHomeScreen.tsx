import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StatusBar, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useStudentHome } from '../../hooks/useStudentHome';
import { useAuth } from '../../context/AuthContext';
import {
  xpInCurrentLevel, xpToNextLevel, levelProgressFraction, XP_PER_LEVEL,
} from '../../api/gamification.types';
import { StudentCalendarItem } from '../../api/student.types';
import { SubjectProgress, ActivityItem } from '../../api/learner-progress.types';

export const StudentHomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user } = useAuth();
  const { profile, gamification, progress, calendar, loading, refreshing, refresh, error } = useStudentHome();

  // Derive today's classes / events from calendar (kind=LIVE_CLASS or anything happening today)
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayItems = useMemo(
    () => (calendar ?? []).filter((c) => (c.startsOn ?? '').slice(0, 10) === todayKey),
    [calendar, todayKey],
  );

  const upcomingItems = useMemo(
    () => (calendar ?? [])
      .filter((c) => (c.startsOn ?? '').slice(0, 10) > todayKey)
      .slice(0, 2),
    [calendar, todayKey],
  );

  if (loading) {
    return (
      <View style={styles.safe}>
        <StatusBar barStyle={colors.statusBarStyle} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </View>
    );
  }

  const firstName = profile?.firstName ?? user?.username ?? 'Learner';
  const className = profile?.className ?? '—';
  const level = gamification.level ?? 1;
  const totalXp = gamification.totalXp ?? 0;
  const streakCurrent = gamification.streak?.current ?? 0;
  const xpNow = xpInCurrentLevel(gamification);
  const xpNeeded = xpToNextLevel(gamification);
  const progressFraction = levelProgressFraction(gamification);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* ═══════════════════════════════════════════════════
            Top bar: avatar + greeting + bell
        ═══════════════════════════════════════════════════ */}
        <View style={styles.topBar}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.greeting}>Hi, {firstName}! 👋</Text>
            {/* Class only — the age tier is internal and never named here. */}
            <Text style={styles.subgreeting}>{className}</Text>
          </View>
          <TouchableOpacity hitSlop={10} onPress={() => router.push('/notifications' as any)}>
            <View>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={14} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════
            Gamification hero (level + XP + streak)
        ═══════════════════════════════════════════════════ */}
        <LinearGradient
          colors={[colors.purple, colors.purpleDeep]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroLevelBadge}>
              <Text style={styles.heroLevelLabel}>LEVEL</Text>
              <Text style={styles.heroLevelValue}>{level}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.heroTitle}>Keep going!</Text>
              <Text style={styles.heroSubtitle}>
                {xpNeeded} XP to level {level + 1}
              </Text>
            </View>
            <View style={styles.heroStreakBox}>
              <Text style={styles.heroFire}>🔥</Text>
              <Text style={styles.heroStreakValue}>{streakCurrent}</Text>
              <Text style={styles.heroStreakLabel}>day{streakCurrent === 1 ? '' : 's'}</Text>
            </View>
          </View>

          {/* XP progress bar */}
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.max(2, progressFraction * 100)}%` }]} />
          </View>
          <Text style={styles.xpLabel}>{xpNow} / {XP_PER_LEVEL} XP this level  •  {totalXp.toLocaleString()} total</Text>
        </LinearGradient>

        {/* ═══════════════════════════════════════════════════
            Today's schedule
        ═══════════════════════════════════════════════════ */}
        {todayItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <TouchableOpacity hitSlop={6} onPress={() => router.push('/student/live-classes' as any)}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {todayItems.map((item, idx) => (
              <CalendarItemCard key={`today-${idx}`} item={item} colors={colors} styles={styles} />
            ))}
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            Continue learning
        ═══════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <TouchableOpacity hitSlop={6} onPress={() => router.push('/student/lesson' as any)}>
            <Text style={styles.viewAll}>All lessons</Text>
          </TouchableOpacity>
        </View>

        {progress.recent && progress.recent.length > 0 ? (
          <ContinueLearningCard
            recent={progress.recent[0]}
            colors={colors} styles={styles}
            onPress={() => router.push('/student/lesson' as any)}
          />
        ) : (
          <NextLessonCTA colors={colors} styles={styles} />
        )}

        {/* ═══════════════════════════════════════════════════
            Quick actions
        ═══════════════════════════════════════════════════ */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Explore</Text>

        <View style={styles.actionsGrid}>
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="book-open-page-variant" size={22} color="#fff" />}
            label="Lessons" bg={colors.primary}
            onPress={() => router.push('/student/lesson' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<Ionicons name="videocam" size={22} color="#fff" />}
            label="Live Classes" bg={colors.danger}
            onPress={() => router.push('/student/live-classes' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="bookshelf" size={22} color="#fff" />}
            label="Library" bg={colors.info}
            onPress={() => router.push('/student/library' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<FontAwesome5 name="play" size={18} color="#fff" />}
            label="Videos" bg={colors.purple}
            onPress={() => router.push('/student/videos' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="trophy" size={22} color="#fff" />}
            label="Quests" bg={colors.warning}
            onPress={() => router.push('/student/stars' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="head-question" size={22} color="#fff" />}
            label="Tests" bg={colors.success}
            onPress={() => router.push('/student/tests' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="clipboard-text" size={22} color="#fff" />}
            label="Assignments" bg={colors.subjectComputer}
            onPress={() => router.push('/student/assignments' as any)} />
          <ActionTile colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="folder-star" size={22} color="#fff" />}
            label="Portfolio" bg={colors.subjectArt}
            onPress={() => router.push('/student/portfolio' as any)} />
        </View>

        {/* ═══════════════════════════════════════════════════
            Code Lab
        ═══════════════════════════════════════════════════ */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Code Lab</Text>

        <View style={styles.codeGrid}>
          <CodeTile colors={colors} styles={styles}
            icon="cat" label="Scratch" sub="Visual blocks" bg="#FFE4ED" iconColor="#F472B6"
            onPress={() => router.push('/student/code/scratch' as any)} />
          <CodeTile colors={colors} styles={styles}
            icon="puzzle" label="Blockly" sub="Logic puzzles" bg="#FEF3C7" iconColor="#F59E0B"
            onPress={() => router.push('/student/code/blockly' as any)} />
          <CodeTile colors={colors} styles={styles}
            icon="language-python" label="Python" sub="Real code" bg="#DBEAFE" iconColor="#3B82F6"
            onPress={() => router.push('/student/code/python' as any)} />
          <CodeTile colors={colors} styles={styles}
            icon="cellphone" label="Mobile" sub="Build apps" bg="#D1FAE5" iconColor="#10B981"
            onPress={() => router.push('/student/code/mobile' as any)} />
          <CodeTile colors={colors} styles={styles}
            icon="robot" label="Robotics" sub="Code robots" bg="#E0E7FF" iconColor="#6366F1"
            onPress={() => router.push('/student/code/robotics' as any)} />
        </View>

        {/* ═══════════════════════════════════════════════════
            Subject progress
        ═══════════════════════════════════════════════════ */}
        {(progress.subjects ?? []).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>My Progress</Text>
            <View style={styles.subjectsCard}>
              {progress.subjects!.map((s, idx, arr) => (
                <SubjectProgressRow
                  key={`subj-${idx}`}
                  subject={s}
                  isLast={idx === arr.length - 1}
                  colors={colors} styles={styles}
                />
              ))}
            </View>

            <View style={styles.statsRow}>
              <SmallStat label="Stages" value={progress.stagesCompleted ?? 0} colors={colors} styles={styles} />
              <SmallStat label="Quizzes" value={progress.quizzesTaken ?? 0} colors={colors} styles={styles} />
              <SmallStat label="Avg Score" value={`${progress.avgScorePct ?? 0}%`} colors={colors} styles={styles} />
              <SmallStat label="Mastery" value={progress.masteryCount ?? 0} colors={colors} styles={styles} />
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            Recent badges
        ═══════════════════════════════════════════════════ */}
        {(gamification.badges ?? []).length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Recent Badges</Text>
              <TouchableOpacity hitSlop={6} onPress={() => router.push('/student/stars' as any)}>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {gamification.badges!.slice(0, 6).map((b, idx) => {
                const earned = !!b.earnedAt;
                return (
                  <View key={`badge-${idx}`} style={[styles.badgeCard, !earned && styles.badgeLocked]}>
                    <View style={[styles.badgeIconCircle, !earned && { opacity: 0.4 }]}>
                      <Text style={styles.badgeIcon}>{b.icon ?? '🏅'}</Text>
                    </View>
                    <Text style={styles.badgeTitle} numberOfLines={1}>{b.title ?? 'Badge'}</Text>
                    {!earned && <Text style={styles.badgeLockedText}>Locked</Text>}
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            Upcoming events (next 2)
        ═══════════════════════════════════════════════════ */}
        {upcomingItems.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Coming Up</Text>
            {upcomingItems.map((item, idx) => (
              <CalendarItemCard key={`up-${idx}`} item={item} colors={colors} styles={styles} />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
// Components
// =================================================================
const CalendarItemCard: React.FC<{ item: StudentCalendarItem; colors: ColorPalette; styles: any }> = ({ item, colors, styles }) => {
  const kind = (item.kind ?? '').toUpperCase();
  const isLive = (item.status ?? '').toUpperCase() === 'LIVE';
  const iconName: any =
    kind === 'LIVE_CLASS' ? 'videocam' :
    kind === 'EXAM' ? 'school' :
    'calendar';
  const tint =
    kind === 'LIVE_CLASS' ? colors.danger :
    kind === 'EXAM' ? colors.warning :
    colors.info;
  const tintBg =
    kind === 'LIVE_CLASS' ? colors.dangerSoft :
    kind === 'EXAM' ? colors.warningSoft :
    colors.infoSoft;

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.calendarCard}>
      <View style={[styles.calendarIcon, { backgroundColor: tintBg }]}>
        <Ionicons name={iconName} size={20} color={tint} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.calendarTopRow}>
          <Text style={styles.calendarTitle} numberOfLines={1}>{item.title ?? 'Class'}</Text>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.calendarMeta}>{formatTimeRange(item.startsOn, item.endsOn)}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const ContinueLearningCard: React.FC<{
  recent: ActivityItem; onPress: () => void; colors: ColorPalette; styles: any;
}> = ({ recent, onPress, colors, styles }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.continueCard}>
    <View style={styles.continueIcon}>
      <MaterialCommunityIcons name="play-circle" size={28} color={colors.primary} />
    </View>
    <View style={{ flex: 1, marginLeft: 14 }}>
      <Text style={styles.continueLabel}>RECENT</Text>
      <Text style={styles.continueTitle} numberOfLines={1}>{recent.title ?? 'Lesson'}</Text>
      <Text style={styles.continueMeta}>
        {recent.subject ?? '—'}
        {recent.scorePct != null && ` • ${recent.scorePct}%`}
        {recent.stars != null && ` • ${'⭐'.repeat(Math.max(0, Math.min(3, recent.stars)))}`}
      </Text>
    </View>
    <Feather name="chevron-right" size={20} color={colors.primary} />
  </TouchableOpacity>
);

const NextLessonCTA: React.FC<{ colors: ColorPalette; styles: any }> = ({ colors, styles }) => (
  <TouchableOpacity activeOpacity={0.85} style={styles.continueCard} onPress={() => router.push('/student/lesson' as any)}>
    <View style={styles.continueIcon}>
      <MaterialCommunityIcons name="rocket-launch" size={28} color={colors.primary} />
    </View>
    <View style={{ flex: 1, marginLeft: 14 }}>
      <Text style={styles.continueLabel}>READY TO START</Text>
      <Text style={styles.continueTitle}>Begin your first lesson</Text>
      <Text style={styles.continueMeta}>Earn XP and unlock badges</Text>
    </View>
    <Feather name="chevron-right" size={20} color={colors.primary} />
  </TouchableOpacity>
);

const ActionTile: React.FC<{
  icon: React.ReactNode; label: string; bg: string; onPress: () => void;
  colors: ColorPalette; styles: any;
}> = ({ icon, label, bg, onPress, styles }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.actionTile}>
    <View style={[styles.actionIcon, { backgroundColor: bg }]}>{icon}</View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const CodeTile: React.FC<{
  icon: any; label: string; sub: string; bg: string; iconColor: string; onPress: () => void;
  colors: ColorPalette; styles: any;
}> = ({ icon, label, sub, bg, iconColor, onPress, styles }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.codeTile}>
    <View style={[styles.codeIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={26} color={iconColor} />
    </View>
    <Text style={styles.codeLabel}>{label}</Text>
    <Text style={styles.codeSub}>{sub}</Text>
  </TouchableOpacity>
);

const SubjectProgressRow: React.FC<{ subject: SubjectProgress; isLast: boolean; colors: ColorPalette; styles: any }> = ({ subject, isLast, colors, styles }) => {
  const pct = Math.max(0, Math.min(100, subject.avgScorePct ?? 0));
  const completed = subject.completed ?? 0;
  const subjectName = subject.subject ?? '—';

  const tint = subjectColor(colors, subjectName);

  return (
    <View style={[styles.subjectRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.subjectDot, { backgroundColor: tint }]} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={styles.subjectTopLine}>
          <Text style={styles.subjectName} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.subjectPct}>{pct}%</Text>
        </View>
        <Text style={styles.subjectCompleted}>{completed} stages done</Text>
        <View style={styles.subjectTrack}>
          <View style={[styles.subjectFill, { backgroundColor: tint, width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
};

const SmallStat: React.FC<{ label: string; value: number | string; colors: ColorPalette; styles: any }> = ({ label, value, styles }) => (
  <View style={styles.smallStat}>
    <Text style={styles.smallStatValue}>{value}</Text>
    <Text style={styles.smallStatLabel}>{label}</Text>
  </View>
);

// =================================================================
function subjectColor(c: ColorPalette, name: string): string {
  const k = name.toLowerCase();
  if (k.includes('math')) return c.subjectMath;
  if (k.includes('english')) return c.subjectEnglish;
  if (k.includes('science')) return c.subjectScience;
  if (k.includes('kiswa')) return c.subjectKiswahili;
  if (k.includes('social')) return c.subjectSocial;
  if (k.includes('cre') || k.includes('ire')) return c.subjectCRE;
  if (k.includes('comp')) return c.subjectComputer;
  if (k.includes('art')) return c.subjectArt;
  return c.purple;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return '—';
  try {
    const s = new Date(start);
    if (isNaN(s.getTime())) return start;
    const startTime = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (end) {
      const e = new Date(end);
      if (!isNaN(e.getTime())) {
        return `${startTime} – ${e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    return startTime;
  } catch { return start; }
}

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: 12.5, color: c.textSecondary, marginTop: 12, fontWeight: '500' },

    // ── Top bar ────────────────────────────────────────────
    topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.purpleLight,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: c.purple, fontSize: 18, fontWeight: '900' },
    greeting: { fontSize: 17, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    subgreeting: { fontSize: 12, color: c.textSecondary, marginTop: 1, fontWeight: '500' },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 10, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 12.5 },

    // ── Hero card (purple gradient with level + XP + streak) ──
    heroCard: {
      borderRadius: 22, padding: 18,
      shadowColor: c.purple,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    heroLevelBadge: {
      width: 60, height: 60, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    },
    heroLevelLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    heroLevelValue: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    heroSubtitle: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 2, fontWeight: '500' },
    heroStreakBox: { alignItems: 'center', minWidth: 56 },
    heroFire: { fontSize: 22 },
    heroStreakValue: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
    heroStreakLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },

    xpTrack: {
      height: 8, borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden',
    },
    xpFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 4 },
    xpLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 6, fontWeight: '600' },

    // ── Section headers ────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 24, marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    viewAll: { fontSize: 12.5, fontWeight: '700', color: c.primary },

    // ── Calendar item ──────────────────────────────────────
    calendarCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      padding: 14, borderRadius: 16, marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    calendarIcon: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    calendarTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    calendarTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    calendarMeta: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    liveBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.dangerSoft,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    },
    livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger },
    liveBadgeText: { color: c.danger, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },

    // ── Continue learning ──────────────────────────────────
    continueCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.primarySoft,
      padding: 14, borderRadius: 18,
    },
    continueIcon: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    continueLabel: { fontSize: 10, color: c.primary, fontWeight: '800', letterSpacing: 0.6 },
    continueTitle: { fontSize: 15, color: c.text, fontWeight: '800', marginTop: 2, letterSpacing: -0.2 },
    continueMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    // ── Quick action tiles ─────────────────────────────────
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionTile: {
      flexBasis: '22%', flexGrow: 1, alignItems: 'center',
      paddingVertical: 4,
    },
    actionIcon: {
      width: '100%', aspectRatio: 1, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      maxHeight: 64,
    },
    actionLabel: { fontSize: 11, color: c.text, marginTop: 6, fontWeight: '700', textAlign: 'center' },

    // ── Code Lab ───────────────────────────────────────────
    codeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    codeTile: {
      flexBasis: '47%', flexGrow: 1,
      backgroundColor: c.card,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 12, alignItems: 'flex-start',
    },
    codeIcon: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    codeLabel: { fontSize: 14, color: c.text, fontWeight: '800', letterSpacing: -0.2 },
    codeSub: { fontSize: 11, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    // ── Subject progress ──────────────────────────────────
    subjectsCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    subjectRow: {
      flexDirection: 'row', alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    subjectDot: { width: 10, height: 10, borderRadius: 5 },
    subjectTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    subjectName: { flex: 1, fontSize: 13.5, fontWeight: '800', color: c.text },
    subjectPct: { fontSize: 13.5, fontWeight: '800', color: c.text },
    subjectCompleted: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '500' },
    subjectTrack: {
      height: 5, borderRadius: 2.5,
      backgroundColor: c.scheme === 'dark' ? '#2A3744' : '#F3F4F6',
      overflow: 'hidden',
    },
    subjectFill: { height: '100%', borderRadius: 2.5 },

    statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    smallStat: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.border,
      padding: 12, alignItems: 'center',
    },
    smallStatValue: { fontSize: 17, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
    smallStatLabel: { fontSize: 10.5, color: c.textSecondary, marginTop: 2, fontWeight: '600' },

    // ── Badges ─────────────────────────────────────────────
    badgesRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
    badgeCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 12, alignItems: 'center', minWidth: 96,
    },
    badgeLocked: { borderStyle: 'dashed' },
    badgeIconCircle: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.warningSoft,
      alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    badgeIcon: { fontSize: 22 },
    badgeTitle: { fontSize: 11.5, color: c.text, fontWeight: '700', textAlign: 'center' },
    badgeLockedText: { fontSize: 9.5, color: c.textTertiary, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 },
  });
}
