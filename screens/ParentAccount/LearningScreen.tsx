import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { ParentHeader } from '../../components/ParentHeader';
import { fonts } from '../../constants/theme';
import { useChildLearning } from '../../hooks/useChildLearning';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { SubjectProgress, ActivityItem } from '../../api/learner-progress.types';
import {
  QuestSummary, ChildInsights, InsightItem, CoachTurn,
  askChildCoach, getChildCoachHistory,
} from '../../api/guardian';

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isCoding = (s?: string | null) => /cod|robot/i.test(String(s || ''));
const rankStatus = (x?: string | null) => ({ IN_PROGRESS: 0, AVAILABLE: 1, COMPLETED: 2, LOCKED: 3 } as any)[String(x)] ?? 4;
const fmtMinutes = (min?: number | null) => {
  const m = num(min); if (m <= 0) return '0m';
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};
const shortDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const subjectIconName = (subject?: string | null): any => {
  const s = String(subject || '').toLowerCase();
  if (isCoding(s)) return 'code-tags';
  if (s.includes('math') || s.includes('hisabati')) return 'brain';
  return 'book-open-variant';
};

export const LearningScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild: child } = useSelectedChild();
  const { accessToken } = useAuth();
  const {
    report, quests, insights, loading, refreshing, insightsRefreshing, error, refresh, refreshInsights, studentId,
  } = useChildLearning();

  const firstName = child?.firstName || report?.learnerName || 'your child';

  // Premium signal: backend marks insights LOCKED for non-Premium children.
  const locked = insights?.state === 'LOCKED';
  const subscribed = !!insights && !locked;

  const subjects = (report?.subjects ?? []).filter((s): s is SubjectProgress => !!s);
  const recent = (report?.recent ?? []).filter((r): r is ActivityItem => !!r).slice(0, 5);

  // Weakest real subject drives the focus-area hero + "why" card.
  const weakest = useMemo(() => {
    const subs = subjects.filter((s) => s.avgScorePct != null);
    if (!subs.length) return null;
    return [...subs].sort((a, b) => num(a.avgScorePct) - num(b.avgScorePct))[0];
  }, [subjects]);

  // "By subject": group the child's quests by subject (real completion %).
  const subjectCards = useMemo(() => {
    const groups = new Map<string, { subject: string; total: number; done: number; rep: QuestSummary | null; accent: string | null }>();
    for (const q of quests) {
      const key = q.subject || 'General';
      const g = groups.get(key) || { subject: key, total: 0, done: 0, rep: null, accent: null };
      g.total += q.totalStages || 0;
      g.done += q.completedStages || 0;
      if (!g.rep || rankStatus(q.status) < rankStatus(g.rep.status)) g.rep = q;
      if (!g.accent && q.accentColor) g.accent = q.accentColor;
      groups.set(key, g);
    }
    return [...groups.values()].map((g) => ({
      subject: g.subject,
      latest: g.rep?.title || null,
      pct: g.total > 0 ? Math.round((g.done / g.total) * 100) : 0,
      accent: g.accent,
      coding: isCoding(g.subject),
    }));
  }, [quests]);
  const academicCards = subjectCards.filter((s) => !s.coding);
  const hasCodingQuest = subjectCards.some((s) => s.coding);

  const hasReport = !!report && num(report.stagesCompleted) > 0;
  const hasStreak = !!report && report.currentStreak != null;

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
      ) : !studentId ? (
        <View style={styles.center}>
          <Ionicons name="person-add-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Select a child to see their learning.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* Hero — entitlement-aware */}
          <LinearGradient colors={[colors.primary, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <Ionicons name={subscribed ? 'flag' : 'sparkles'} size={20} color="#FFF" />
              </View>
              <View style={styles.planChip}>
                <Text style={styles.planChipText}>{subscribed ? 'Premium' : 'Basic'}</Text>
              </View>
            </View>
            <Text style={styles.heroKicker}>{subscribed ? 'FOCUS AREA' : 'PREMIUM'}</Text>
            <Text style={styles.heroTitle}>
              {subscribed
                ? (weakest ? `More practice in ${weakest.subject}` : `${firstName} is on track`)
                : `See where ${firstName} is — and what's next`}
            </Text>
            <Text style={styles.heroBody}>
              {subscribed
                ? (weakest
                    ? `${firstName} averages ${num(weakest.avgScorePct)}% in ${weakest.subject}${weakest.completed ? ` across ${num(weakest.completed)} ${num(weakest.completed) === 1 ? 'lesson' : 'lessons'}` : ''}. A little regular practice here moves the needle most.`
                    : `Keep the momentum going — short, steady practice keeps ${firstName} progressing.`)
                : `Unlock the full learning report: mastery, focus areas, and what to practise next.`}
            </Text>
            {!subscribed && (
              <TouchableOpacity style={styles.heroBtn} activeOpacity={0.85} onPress={() => router.push('/subscriptions' as any)}>
                <Text style={styles.heroBtnText}>Unlock Premium</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
            {hasStreak && (
              <View style={styles.streakRow}>
                <HeroStat label="Streak" value={`${num(report!.currentStreak)}d`} note={num(report!.currentStreak) ? 'Keep going!' : 'Start today'} />
                <View style={styles.heroDivider} />
                <HeroStat label="Best" value={`${num(report!.longestStreak)}d`} note="Longest" />
              </View>
            )}
          </LinearGradient>

          {/* AI insights (Premium) */}
          {subscribed && (
            <InsightsCard styles={styles} colors={colors} insights={insights} refreshing={insightsRefreshing} onRefresh={refreshInsights} />
          )}

          {/* AI coach (Premium) */}
          {subscribed && studentId != null && accessToken && (
            <CoachPanel styles={styles} colors={colors} studentId={studentId} accessToken={accessToken} childName={firstName} />
          )}

          {/* Snapshot */}
          {hasReport && (
            <>
              <View style={styles.snapshotHead}>
                <MaterialCommunityIcons name="school-outline" size={15} color={colors.textTertiary} />
                <Text style={styles.snapshotHeadText}>Level {num(report!.level) || 1} · {num(report!.totalXp)} XP</Text>
              </View>
              <View style={styles.statGrid}>
                <StatTile styles={styles} colors={colors} icon="ribbon" tint={colors.purple} value={report!.avgScorePct != null ? `${num(report!.avgScorePct)}%` : '—'} label="Average score" />
                <StatTile styles={styles} colors={colors} icon="star" tint={colors.warning} value={`${num(report!.masteryCount)}`} label="Skills mastered" />
                <StatTile styles={styles} colors={colors} icon="flame" tint={colors.danger} value={`${num(report!.currentStreak)}`} label="Day streak" />
                <StatTile styles={styles} colors={colors} icon="time" tint={colors.info} value={fmtMinutes(report!.minutesInvested)} label="Time invested" />
              </View>
            </>
          )}

          {/* By subject (quests) */}
          {(academicCards.length > 0 || hasCodingQuest) && (
            <>
              <Text style={styles.sectionTitle}>By subject</Text>
              <View style={styles.subjectGrid}>
                {academicCards.map((s) => {
                  const accent = s.accent || colors.primary;
                  return (
                    <View key={s.subject} style={styles.subjectCard}>
                      <View style={styles.subjectCardHead}>
                        <View style={[styles.subjectIcon, { backgroundColor: accent + '1F' }]}>
                          <MaterialCommunityIcons name={subjectIconName(s.subject)} size={18} color={accent} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.subjectName} numberOfLines={1}>{s.subject}</Text>
                          {!!s.latest && <Text style={styles.subjectLatest} numberOfLines={1}>Latest: {s.latest}</Text>}
                        </View>
                      </View>
                      <View style={styles.subjectPctRow}>
                        <Text style={styles.subjectPctText}>{s.pct}% complete</Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, s.pct))}%`, backgroundColor: accent }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Recent activity */}
          {recent.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <View style={styles.card}>
                {recent.map((a, i) => (
                  <View key={i} style={[styles.activityRow, i > 0 && styles.divider]}>
                    <View style={[styles.activityIcon, { backgroundColor: colors.primarySofter }]}>
                      <MaterialCommunityIcons name="book-open-variant" size={15} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{a.title || 'Lesson'}</Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>{[a.subject, shortDate(a.completedAt)].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {num((a as any).stars) > 0 && <Text style={styles.activityStars}>{'★'.repeat(Math.min(3, num((a as any).stars)))}</Text>}
                    {a.scorePct != null && <Text style={styles.activityScore}>{num(a.scorePct)}%</Text>}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Why this focus (Premium + weakest) */}
          {subscribed && weakest && (
            <View style={styles.whyCard}>
              <View style={[styles.whyIcon, { backgroundColor: colors.purple + '1A' }]}>
                <Ionicons name="bulb" size={17} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whyTitle}>Why this focus</Text>
                <Text style={styles.whyBody}>
                  {firstName} is doing well overall. {weakest.subject} has the most room to grow right now
                  {weakest.avgScorePct != null ? ` (${num(weakest.avgScorePct)}% average so far)` : ''}. Short, regular practice will strengthen it and build confidence.
                </Text>
              </View>
            </View>
          )}

          {/* Empty */}
          {!hasReport && academicCards.length === 0 && !hasCodingQuest && (
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

const HeroStat: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontFamily: fonts.medium }}>{label}</Text>
    <Text style={{ color: '#FFF', fontSize: 16, fontFamily: fonts.extrabold, marginTop: 1 }}>{value}</Text>
    {!!note && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontFamily: fonts.regular, marginTop: 1 }}>{note}</Text>}
  </View>
);

const StatTile: React.FC<{ styles: any; colors: ColorPalette; icon: any; tint: string; value: string; label: string }> =
  ({ styles, icon, tint, value, label }) => (
  <View style={styles.statTile}>
    <View style={[styles.statTileIcon, { backgroundColor: tint + '1A' }]}><Ionicons name={icon} size={15} color={tint} /></View>
    <Text style={styles.statTileValue}>{value}</Text>
    <Text style={styles.statTileLabel}>{label}</Text>
  </View>
);

// ── AI insights ──────────────────────────────────────────────────────────────
const InsightsCard: React.FC<{ styles: any; colors: ColorPalette; insights: ChildInsights | null; refreshing: boolean; onRefresh: () => void }> =
  ({ styles, colors, insights, refreshing, onRefresh }) => {
  if (!insights || insights.state !== 'READY') {
    // legacy free-text fallback
    if (insights?.content) {
      return (
        <View style={styles.insightCard}>
          <View style={styles.insightHead}><MaterialCommunityIcons name="lightbulb-on-outline" size={17} color={colors.purple} /><Text style={styles.insightHeadText}>AI insights</Text></View>
          <Text style={styles.insightSummary}>{insights.content}</Text>
        </View>
      );
    }
    return null;
  }
  const strengths = (insights.strengths ?? []) as InsightItem[];
  const focusAreas = (insights.focusAreas ?? []) as InsightItem[];
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeadRow}>
        <View style={styles.insightHead}>
          <View style={[styles.insightBadge, { backgroundColor: colors.purple + '1A' }]}><MaterialCommunityIcons name="lightbulb-on" size={15} color={colors.purple} /></View>
          <Text style={styles.insightHeadText}>AI insights</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing} hitSlop={8}>
          {refreshing ? <ActivityIndicator size="small" color={colors.textTertiary} /> : <Feather name="refresh-cw" size={14} color={colors.textTertiary} />}
        </TouchableOpacity>
      </View>
      {!!insights.headline && <Text style={styles.insightHeadline}>{insights.headline}</Text>}
      {!!insights.summary && <Text style={styles.insightSummary}>{insights.summary}</Text>}
      {strengths.length > 0 && (
        <View style={styles.insightGroup}>
          <Text style={styles.insightGroupLabel}>STRENGTHS</Text>
          {strengths.map((s, i) => (
            <View key={i} style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginTop: 1 }} />
              <Text style={styles.insightItemText}>{s.area ? <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{s.area}. </Text> : null}{s.note}</Text>
            </View>
          ))}
        </View>
      )}
      {focusAreas.length > 0 && (
        <View style={styles.insightGroup}>
          <Text style={styles.insightGroupLabel}>FOCUS AREAS</Text>
          {focusAreas.map((f, i) => (
            <View key={i} style={styles.insightItem}>
              <Ionicons name="locate" size={14} color={colors.warning} style={{ marginTop: 1 }} />
              <Text style={styles.insightItemText}>{f.area ? <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{f.area}. </Text> : null}{f.note}</Text>
            </View>
          ))}
        </View>
      )}
      {!!insights.nextStep && (
        <View style={styles.nextStep}>
          <Ionicons name="bulb" size={14} color={colors.purple} style={{ marginTop: 1 }} />
          <Text style={styles.insightItemText}><Text style={{ fontFamily: fonts.bold, color: colors.text }}>Next step. </Text>{insights.nextStep}</Text>
        </View>
      )}
    </View>
  );
};

// ── AI coach ─────────────────────────────────────────────────────────────────
const SUGGESTIONS = ["What's affecting the grades?", 'How can we improve this week?', 'Which subject needs the most help?'];
const CoachPanel: React.FC<{ styles: any; colors: ColorPalette; studentId: number; accessToken: string; childName: string }> =
  ({ styles, colors, studentId, accessToken, childName }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next && !loaded) {
        setLoaded(true);
        getChildCoachHistory(accessToken, studentId).then((h) => { if (Array.isArray(h) && h.length) setMessages(h); }).catch(() => {});
      }
      return next;
    });
  }, [loaded, accessToken, studentId]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'parent', content: msg }]);
    setInput(''); setSending(true);
    try {
      const r = await askChildCoach(accessToken, studentId, msg, history);
      setMessages((m) => [...m, { role: 'coach', content: r?.reply || 'Sorry — no reply came back.' }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'coach', content: e?.status === 402 ? 'This is a Premium feature.' : 'Sorry — could not reach the coach. Please try again.' }]);
    } finally { setSending(false); }
  };

  return (
    <View style={styles.coachCard}>
      <TouchableOpacity style={styles.coachHead} activeOpacity={0.7} onPress={toggle}>
        <View style={[styles.insightBadge, { backgroundColor: colors.purple + '1A' }]}><Ionicons name="chatbubbles" size={15} color={colors.purple} /></View>
        <Text style={styles.coachHeadText}>Ask about {childName}</Text>
        <Text style={styles.coachToggle}>{open ? 'Hide' : 'Open'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 12 }}>
          {messages.length === 0 ? (
            <>
              <Text style={styles.coachHint}>Ask anything about {childName}'s learning — answers come from their real progress.</Text>
              <View style={styles.suggestRow}>
                {SUGGESTIONS.map((q, i) => (
                  <TouchableOpacity key={i} style={styles.suggestChip} activeOpacity={0.7} onPress={() => send(q)}>
                    <Text style={styles.suggestChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={{ gap: 8, marginBottom: 10 }}>
              {messages.map((m, i) => (
                <View key={i} style={[styles.bubble, m.role === 'parent' ? styles.bubbleMe : styles.bubbleCoach]}>
                  <Text style={[styles.bubbleText, m.role === 'parent' && { color: colors.text }]}>{m.content}</Text>
                </View>
              ))}
              {sending && <View style={[styles.bubble, styles.bubbleCoach]}><Text style={styles.bubbleText}>thinking…</Text></View>}
            </View>
          )}
          <View style={styles.coachInputRow}>
            <TextInput
              style={styles.coachInput}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask about ${childName}…`}
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => send()}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.coachSend, (!input.trim() || sending) && { opacity: 0.5 }]} disabled={!input.trim() || sending} onPress={() => send()}>
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.coachFoot}>AI coach · grounded in real progress · not a diagnosis</Text>
        </View>
      )}
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    hero: { borderRadius: 20, padding: 18, marginBottom: 16, shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 8 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    heroIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    planChip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    planChipText: { color: '#FFF', fontSize: 11, fontFamily: fonts.bold },
    heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 1 },
    heroTitle: { color: '#FFF', fontSize: 20, fontFamily: fonts.extrabold, letterSpacing: -0.4, marginTop: 4, lineHeight: 25 },
    heroBody: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: fonts.regular, marginTop: 6, lineHeight: 19 },
    heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
    heroBtnText: { color: c.primary, fontSize: 13.5, fontFamily: fonts.bold },
    streakRow: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

    insightCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 16 },
    insightHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    insightBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    insightHeadText: { fontSize: 14, fontFamily: fonts.bold, color: c.text },
    insightHeadline: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, lineHeight: 20 },
    insightSummary: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 19 },
    insightGroup: { marginTop: 14 },
    insightGroupLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 1, marginBottom: 7 },
    insightItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    insightItemText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },
    nextStep: { flexDirection: 'row', gap: 8, backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 12, marginTop: 14 },

    coachCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 20 },
    coachHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coachHeadText: { fontSize: 14, fontFamily: fonts.bold, color: c.text, flex: 1 },
    coachToggle: { fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary },
    coachHint: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18, marginBottom: 10 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    suggestChip: { borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
    suggestChipText: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary },
    bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
    bubbleMe: { alignSelf: 'flex-end', backgroundColor: c.primarySofter },
    bubbleCoach: { alignSelf: 'flex-start', backgroundColor: c.backgroundAlt },
    bubbleText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },
    coachInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coachInput: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.background, paddingHorizontal: 12, height: 44, fontSize: 13.5, fontFamily: fonts.regular, color: c.text },
    coachSend: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    coachFoot: { fontSize: 10, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 8 },

    snapshotHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    snapshotHeadText: { fontSize: 12, fontFamily: fonts.semibold, color: c.textSecondary },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
    statTile: { flexBasis: '47.5%', flexGrow: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 13 },
    statTileIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
    statTileValue: { fontSize: 19, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    statTileLabel: { fontSize: 11, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },

    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },

    subjectGrid: { gap: 10, marginBottom: 22 },
    subjectCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 },
    subjectCardHead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
    subjectIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    subjectName: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    subjectLatest: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    subjectPctRow: { marginBottom: 6 },
    subjectPctText: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary },
    track: { height: 7, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
    activityIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    activityTitle: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    activityMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    activityStars: { fontSize: 12, color: c.warning },
    activityScore: { fontSize: 13, fontFamily: fonts.bold, color: c.textSecondary },

    whyCard: { flexDirection: 'row', gap: 12, backgroundColor: c.purple + '0D', borderRadius: 16, borderWidth: 1, borderColor: c.purple + '26', padding: 14, marginBottom: 22 },
    whyIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    whyTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, marginBottom: 4 },
    whyBody: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },

    emptyBox: { alignItems: 'center', padding: 34, gap: 6 },
    emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: c.text, marginTop: 6 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
  });
}
