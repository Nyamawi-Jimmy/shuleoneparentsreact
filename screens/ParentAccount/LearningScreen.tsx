import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { ParentHeader } from '../../components/ParentHeader';
import { useChildLearning } from '../../hooks/useChildLearning';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { SubjectProgress, ActivityItem } from '../../api/learner-progress.types';

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function scoreColor(c: ColorPalette, pct: number): string {
  if (pct >= 80) return c.success;
  if (pct >= 50) return c.warning;
  return c.danger;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export const LearningScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild: child } = useSelectedChild();
  const { report, insights, loading, refreshing, error, refresh } = useChildLearning();

  const subjects = (report?.subjects ?? []).filter((s): s is SubjectProgress => !!s);
  const recent = (report?.recent ?? []).filter((r): r is ActivityItem => !!r);

  // Derive focus areas (lowest scores) and strengths (highest scores).
  const ranked = [...subjects].sort((a, b) => num(a.avgScorePct) - num(b.avgScorePct));
  const focus = ranked.slice(0, 2).filter((s) => num(s.avgScorePct) < 75);
  const strengths = [...ranked].reverse().slice(0, 2).filter((s) => num(s.avgScorePct) >= 60);

  const firstName = child?.firstName || report?.learnerName || 'your child';
  const showInsight = !!insights?.content && (insights.state ?? 'READY') === 'READY';

  return (
    <View style={styles.root}>
      <ParentHeader title="Learning" showBack={false} rightIcon="none" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* Hero */}
          <LinearGradient colors={['#6366F1', '#4338CA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNum}>{num(report?.level) || 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{firstName}’s learning</Text>
                <Text style={styles.heroSub}>Progress across all subjects</Text>
              </View>
              <MaterialCommunityIcons name="rocket-launch-outline" size={26} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={styles.heroStats}>
              <HeroStat label="XP" value={`${num(report?.totalXp)}`} />
              <View style={styles.heroDivider} />
              <HeroStat label="Day streak" value={`${num(report?.currentStreak)} 🔥`} />
              <View style={styles.heroDivider} />
              <HeroStat label="Mastered" value={`${num(report?.masteryCount)}`} />
            </View>
          </LinearGradient>

          {/* Quick stats */}
          <View style={styles.statGrid}>
            <StatTile styles={styles} colors={colors}
              icon={<Feather name="target" size={16} color={colors.primary} />}
              value={`${num(report?.avgScorePct)}%`} label="Average score" />
            <StatTile styles={styles} colors={colors}
              icon={<Ionicons name="time-outline" size={16} color={colors.info} />}
              value={`${num(report?.minutesInvested)} min`} label="Time learning" />
            <StatTile styles={styles} colors={colors}
              icon={<Ionicons name="checkbox-outline" size={16} color={colors.success} />}
              value={`${num(report?.stagesCompleted)}`} label="Lessons done" />
            <StatTile styles={styles} colors={colors}
              icon={<Ionicons name="help-circle-outline" size={16} color={colors.warning} />}
              value={`${num(report?.quizzesTaken)}`} label="Quizzes taken" />
          </View>

          {/* AI insight */}
          {showInsight && (
            <View style={styles.insightCard}>
              <View style={styles.insightHead}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.purple} />
                <Text style={styles.insightTitle}>What to focus on</Text>
              </View>
              <Text style={styles.insightBody}>{insights!.content}</Text>
            </View>
          )}

          {/* By subject */}
          {subjects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>By subject</Text>
              <View style={styles.card}>
                {subjects.map((s, i) => {
                  const pct = Math.max(0, Math.min(100, num(s.avgScorePct)));
                  return (
                    <View key={`${s.subject}-${i}`} style={[styles.subjectRow, i > 0 && styles.subjectDivider]}>
                      <View style={styles.subjectHead}>
                        <Text style={styles.subjectName} numberOfLines={1}>{s.subject || 'Subject'}</Text>
                        <Text style={[styles.subjectPct, { color: scoreColor(colors, pct) }]}>{pct}%</Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: scoreColor(colors, pct) }]} />
                      </View>
                      {s.completed != null && (
                        <Text style={styles.subjectMeta}>{num(s.completed)} lessons completed</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Focus + strengths */}
          {(focus.length > 0 || strengths.length > 0) && (
            <View style={styles.twoCol}>
              {focus.length > 0 && (
                <View style={[styles.miniCard, { borderColor: colors.warningSoft }]}>
                  <View style={styles.miniHead}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                    <Text style={styles.miniTitle}>Needs focus</Text>
                  </View>
                  {focus.map((s, i) => (
                    <Text key={i} style={styles.miniItem} numberOfLines={1}>• {s.subject}</Text>
                  ))}
                </View>
              )}
              {strengths.length > 0 && (
                <View style={[styles.miniCard, { borderColor: colors.successSoft }]}>
                  <View style={styles.miniHead}>
                    <Ionicons name="ribbon-outline" size={16} color={colors.success} />
                    <Text style={styles.miniTitle}>Strengths</Text>
                  </View>
                  {strengths.map((s, i) => (
                    <Text key={i} style={styles.miniItem} numberOfLines={1}>• {s.subject}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Recent activity */}
          {recent.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <View style={styles.card}>
                {recent.slice(0, 8).map((a, i) => {
                  const pct = num(a.scorePct);
                  return (
                    <View key={i} style={[styles.activityRow, i > 0 && styles.subjectDivider]}>
                      <View style={[styles.activityDot, { backgroundColor: scoreColor(colors, pct) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle} numberOfLines={1}>{a.title || 'Lesson'}</Text>
                        <Text style={styles.activityMeta} numberOfLines={1}>
                          {a.subject || '—'}{a.completedAt ? `  •  ${shortDate(a.completedAt)}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.activityScore, { color: scoreColor(colors, pct) }]}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {subjects.length === 0 && recent.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No learning activity yet</Text>
              <Text style={styles.emptyText}>When {firstName} starts lessons, their progress shows up here.</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};

const HeroStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{value}</Text>
    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, fontWeight: '500' }}>{label}</Text>
  </View>
);

const StatTile: React.FC<{ styles: any; colors: ColorPalette; icon: React.ReactNode; value: string; label: string }> =
  ({ styles, icon, value, label }) => (
  <View style={styles.statTile}>
    <View style={styles.statTileHead}>{icon}</View>
    <Text style={styles.statTileValue}>{value}</Text>
    <Text style={styles.statTileLabel}>{label}</Text>
  </View>
);

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    hero: {
      borderRadius: 20, padding: 16, marginBottom: 14,
      shadowColor: '#4338CA', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28, shadowRadius: 18, elevation: 8,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    levelBadge: {
      width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center',
    },
    levelNum: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    heroName: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
    heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, marginTop: 2, fontWeight: '500' },
    heroStats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statTile: {
      flexBasis: '47.5%', flexGrow: 1, backgroundColor: c.card,
      borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 13,
    },
    statTileHead: { marginBottom: 8 },
    statTileValue: { fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    statTileLabel: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    insightCard: {
      backgroundColor: c.purpleLight, borderRadius: 16, padding: 15, marginBottom: 20,
    },
    insightHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
    insightTitle: { fontSize: 14, fontWeight: '800', color: c.text },
    insightBody: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 12, letterSpacing: -0.3 },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, paddingVertical: 4, marginBottom: 20,
    },
    subjectRow: { paddingVertical: 12 },
    subjectDivider: { borderTopWidth: 1, borderTopColor: c.border },
    subjectHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    subjectName: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    subjectPct: { fontSize: 13.5, fontWeight: '800' },
    track: { height: 7, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },
    subjectMeta: { fontSize: 11.5, color: c.textTertiary, marginTop: 6 },

    twoCol: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    miniCard: { flex: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, padding: 13 },
    miniHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    miniTitle: { fontSize: 12.5, fontWeight: '800', color: c.text },
    miniItem: { fontSize: 12.5, color: c.textSecondary, marginTop: 3 },

    activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    activityDot: { width: 9, height: 9, borderRadius: 5 },
    activityTitle: { fontSize: 13.5, fontWeight: '700', color: c.text },
    activityMeta: { fontSize: 11.5, color: c.textTertiary, marginTop: 2 },
    activityScore: { fontSize: 14, fontWeight: '800' },

    emptyBox: { alignItems: 'center', padding: 32, gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginTop: 4 },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
  });
}
