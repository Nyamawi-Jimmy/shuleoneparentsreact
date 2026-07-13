// Class Diary — mobile-first redesign (distinct from the web's diary tab):
//   List   — rose app bar with a floating Weeks / To-sign / Comments stat card
//            riding over it, searchable week cards with a gradient week badge
//            and sign-progress bar.
//   Detail — the week's own app bar (title = week label, "All weeks" pill),
//            a calendar-style day strip (active day = gradient pill, status
//            dots for signed/unsigned), the day's learning plan as a numbered
//            list, teacher comments as chat bubbles with the teacher's avatar,
//            and the parent's response bubble / sign form with gradient CTA.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { getChildDiary, signDiaryEntry, DiarySignResult } from '../../api/diary';
import { DiarySession, DiaryDailyEntry, DiaryWeeklyEntry } from '../../api/diary.types';
import { ApiError } from '../../config/api';

const DAY_LABELS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Week', full: 'Weekly' },
];

const fmtDate = (s?: string | null, opts?: Intl.DateTimeFormatOptions): string => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
};
const dayDate = (weekStart: string, idx: number): Date | null => {
  const d = new Date(weekStart);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + idx);
  return d;
};

type Override = { parentComment?: string | null; parentSign?: string | null; parentSignedAt?: string | null };

/** Per-slot signature state for one week: Mon–Fri then Weekly. */
type SlotState = 'none' | 'pending' | 'signed';
const slotStates = (s: DiarySession): SlotState[] => {
  const out: SlotState[] = [];
  for (let i = 0; i < 5; i++) {
    const e = s.dailyEntries.find((d) => d.dayIndex === i);
    out.push(!e?.teacherComment ? 'none' : e.parentSignedAt ? 'signed' : 'pending');
  }
  const w = s.weeklyEntry;
  out.push(!w?.teacherComment ? 'none' : w.parentSignedAt ? 'signed' : 'pending');
  return out;
};
/** First slot still waiting for the parent (0–4 day, 5 weekly), or null. */
const firstPending = (s: DiarySession): number | null => {
  const idx = slotStates(s).findIndex((x) => x === 'pending');
  return idx === -1 ? null : idx;
};

export const DiaryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const { parent } = useParentProfile();

  const [sessions, setSessions] = useState<DiarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState(0);

  // Opening a week lands on the first slot that still needs a signature.
  const open = (id: number, day?: number) => {
    const s = sessions.find((x) => x.id === id);
    setOpenDay(day ?? (s ? firstPending(s) ?? 0 : 0));
    setOpenId(id);
  };

  const studentId = selectedChild?.studentId ?? null;
  const childName = selectedChild?.firstName || selectedChild?.fullName || 'your child';

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getChildDiary(accessToken, studentId);
      setSessions((data ?? []).filter((s) => s.status === 'PUBLISHED'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load diary.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSession = sessions.find((s) => s.id === openId) ?? null;

  if (!selectedChild) {
    return (
      <View style={styles.root}>
        <GradientAppBar title="Class Diary" showBack />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="person-add-outline" size={26} color={colors.textSecondary} /></View>
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>Pick a child from Home to view their class diary.</Text>
        </View>
      </View>
    );
  }

  if (openSession) {
    return (
      <View style={styles.root}>
        <GradientAppBar
          overlap
          title={openSession.weekLabel || 'Diary week'}
          subtitle={[openSession.classLabel, openSession.teacherName].filter(Boolean).join(' · ')}
          right={
            <TouchableOpacity style={styles.appBarAction} activeOpacity={0.7} onPress={() => setOpenId(null)}>
              <Ionicons name="chevron-back" size={14} color="#FFF" />
              <Text style={styles.appBarActionText}>All weeks</Text>
            </TouchableOpacity>
          }
        />
        <SessionDetail
          key={openSession.id}
          styles={styles}
          colors={colors}
          session={openSession}
          initialDay={openDay}
          studentId={selectedChild.studentId}
          parentName={(parent as any)?.name || (parent as any)?.fullName || ''}
          accessToken={accessToken!}
          onSigned={() => load(true)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GradientAppBar overlap title="Class Diary" subtitle={`${childName}’s week-by-week diary`} showBack />
      <SessionList
        styles={styles}
        colors={colors}
        sessions={sessions}
        loading={loading}
        refreshing={refreshing}
        error={error}
        query={query}
        setQuery={setQuery}
        childName={childName}
        onOpen={open}
        onRefresh={() => load(true)}
      />
    </View>
  );
};

// ── List ─────────────────────────────────────────────────────────────────────
const SessionList: React.FC<{
  styles: any; colors: ColorPalette; sessions: DiarySession[];
  loading: boolean; refreshing: boolean; error: string | null;
  query: string; setQuery: (s: string) => void; childName: string;
  onOpen: (id: number, day?: number) => void; onRefresh: () => void;
}> = ({ styles, colors, sessions, loading, refreshing, error, query, setQuery, childName, onOpen, onRefresh }) => {
  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) =>
      s.weekLabel?.toLowerCase().includes(q) ||
      s.teacherName?.toLowerCase().includes(q) ||
      s.classLabel?.toLowerCase().includes(q));
  }, [sessions, query]);

  const totalUnsigned = sessions.reduce((sum, s) => {
    const dayU = s.dailyEntries.filter((d) => d.teacherComment && !d.parentSignedAt).length;
    const wkU = s.weeklyEntry?.teacherComment && !s.weeklyEntry?.parentSignedAt ? 1 : 0;
    return sum + dayU + wkU;
  }, 0);
  const totalComments = sessions.reduce((sum, s) => sum + s.dailyEntries.filter((d) => d.teacherComment).length, 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.scrollBody}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero — rides over the app bar edge. When signatures are pending it's a
          call to action that drops straight onto the first unsigned day. */}
      <LinearGradient
        colors={totalUnsigned > 0 ? [colors.primary, colors.primaryDeep] : ['#059669', '#047857']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name={totalUnsigned > 0 ? 'draw-pen' : 'check-decagram'} size={20} color="#FFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>
              {totalUnsigned > 0
                ? `${totalUnsigned} ${totalUnsigned === 1 ? 'response' : 'responses'} waiting for your signature`
                : 'All caught up'}
            </Text>
            <Text style={styles.heroSub}>
              {totalUnsigned > 0
                ? 'Teachers can see when you’ve read and signed the diary.'
                : `Every teacher comment in ${childName}’s diary is signed. 🎉`}
            </Text>
          </View>
        </View>
        {totalUnsigned > 0 && (() => {
          const target = sessions.find((s) => firstPending(s) != null);
          if (!target) return null;
          return (
            <TouchableOpacity style={styles.heroBtn} activeOpacity={0.85}
              onPress={() => onOpen(target.id, firstPending(target) ?? 0)}>
              <Text style={styles.heroBtnText}>Sign now</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primaryDeep} />
            </TouchableOpacity>
          );
        })()}
        <View style={styles.heroStats}>
          <Stat styles={styles} value={String(sessions.length)} label="Weeks" sub="published" color="#FFF" />
          <View style={styles.statDivider} />
          <Stat styles={styles} value={String(totalComments)} label="Comments" sub="from teachers" color="#FFF" />
          <View style={styles.statDivider} />
          <Stat styles={styles} value={String(totalUnsigned)} label="To sign" sub="your responses" color="#FFF" />
        </View>
      </LinearGradient>

      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      {/* Search */}
      <View style={styles.searchBox}>
        <Feather name="search" size={15} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by week, teacher, class…"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Week cards */}
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="notebook-outline" size={30} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{query ? 'No matches' : 'No diary weeks yet'}</Text>
          <Text style={styles.emptyText}>
            {query ? `Nothing matches “${query}”.` : `Teachers haven’t published any diary weeks for ${childName} yet.`}
          </Text>
        </View>
      ) : (
        filtered.map((s) => {
          const slots = slotStates(s);
          const totalSignable = slots.filter((x) => x !== 'none').length;
          const totalSigned = slots.filter((x) => x === 'signed').length;
          const pending = totalSignable - totalSigned;
          const weekNo = s.weekLabel?.match(/Week (\d+)/)?.[1] || '?';
          const SLOT_LABELS = ['M', 'T', 'W', 'T', 'F', '∑'];

          return (
            <TouchableOpacity key={s.id} style={styles.weekCard} activeOpacity={0.85} onPress={() => onOpen(s.id)}>
              <View style={styles.weekCardTop}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weekBadge}>
                  <Text style={styles.weekBadgeKicker}>WEEK</Text>
                  <Text style={styles.weekBadgeNo}>{weekNo}</Text>
                </LinearGradient>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.weekTitleRow}>
                    <Text style={styles.weekTitle} numberOfLines={1}>{s.weekLabel}</Text>
                    {totalSignable > 0 && (
                      pending > 0 ? (
                        <View style={[styles.miniChip, { backgroundColor: colors.primarySoft }]}>
                          <Feather name="edit-2" size={10} color={colors.primary} />
                          <Text style={[styles.miniChipText, { color: colors.primary }]}>{pending} to sign</Text>
                        </View>
                      ) : (
                        <View style={[styles.miniChip, { backgroundColor: colors.successSoft }]}>
                          <Ionicons name="checkmark" size={11} color={colors.success} />
                          <Text style={[styles.miniChipText, { color: colors.success }]}>Signed</Text>
                        </View>
                      )
                    )}
                  </View>
                  <Text style={styles.weekMeta} numberOfLines={1}>
                    {s.classLabel}{s.weekStart ? `  ·  ${fmtDate(s.weekStart, { day: 'numeric', month: 'short' })}` : ''}{s.teacherName ? `  ·  ${s.teacherName}` : ''}
                  </Text>
                  {!!s.notes && <Text style={styles.weekNotes} numberOfLines={1}>“{s.notes}”</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>

              {/* Signature map — Mon–Fri + weekly at a glance. Tap a pending slot
                  to land straight on that day. */}
              <View style={styles.slotRow}>
                {slots.map((st, i) => (
                  <TouchableOpacity key={i} style={styles.slot} activeOpacity={st === 'none' ? 1 : 0.7}
                    onPress={() => onOpen(s.id, i)} disabled={st === 'none'}>
                    <View style={[
                      styles.slotDot,
                      st === 'signed' && { backgroundColor: colors.success },
                      st === 'pending' && { backgroundColor: colors.primary },
                      st === 'none' && { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border },
                    ]}>
                      {st === 'signed' && <Ionicons name="checkmark" size={10} color="#FFF" />}
                      {st === 'pending' && <MaterialCommunityIcons name="draw-pen" size={9} color="#FFF" />}
                    </View>
                    <Text style={[styles.slotLabel, st === 'pending' && { color: colors.primary, fontFamily: fonts.bold }]}>
                      {SLOT_LABELS[i]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Helper */}
      <View style={styles.helperCard}>
        <View style={[styles.helperIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.helperTitle}>How the Class Diary works</Text>
          <Text style={styles.helperText}>
            Each week your child’s teacher publishes a diary covering Mon–Fri lessons plus a weekly summary.
            Open any week to see the lesson plan and daily comments — then sign right from the app.
          </Text>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

// ── Detail ───────────────────────────────────────────────────────────────────
const SessionDetail: React.FC<{
  styles: any; colors: ColorPalette; session: DiarySession; initialDay?: number; studentId: number;
  parentName: string; accessToken: string; onSigned: () => void;
}> = ({ styles, colors, session, initialDay = 0, studentId, parentName, accessToken, onSigned }) => {
  const [activeDay, setActiveDay] = useState(Math.max(0, Math.min(5, initialDay)));   // 0..4 days, 5 = weekly
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [comment, setComment] = useState('');
  const [signName, setSignName] = useState(parentName || '');
  const [busy, setBusy] = useState(false);
  const [signErr, setSignErr] = useState<string | null>(null);

  const isWeekly = activeDay === 5;
  const key = (idx: number) => (idx === 5 ? 'W' : `D${idx}`);
  const withOverride = <T extends object>(entry: T | null | undefined, idx: number): T | null => {
    const o = overrides[key(idx)];
    return o ? ({ ...(entry || {}), ...o } as T) : (entry ?? null);
  };

  const dayEntry = !isWeekly
    ? withOverride<DiaryDailyEntry>(session.dailyEntries.find((d) => d.dayIndex === activeDay), activeDay)
    : null;
  const weeklyEntry = withOverride<DiaryWeeklyEntry>(session.weeklyEntry, 5);
  const active: any = isWeekly ? weeklyEntry : dayEntry;
  const planForDay = !isWeekly ? session.planRows.filter((r) => r.dayIndex === activeDay) : [];

  const hasTeacher = !!active?.teacherComment;
  const parentSigned = !!active?.parentSignedAt;

  const submit = async () => {
    if (busy || !signName.trim()) return;
    setBusy(true); setSignErr(null);
    try {
      const saved: DiarySignResult = await signDiaryEntry(accessToken, studentId, {
        sessionId: session.id,
        scope: isWeekly ? 'WEEKLY' : 'DAILY',
        dayIndex: isWeekly ? undefined : activeDay,
        comment: comment.trim() || undefined,
        signature: signName.trim(),
      });
      setOverrides((prev) => ({
        ...prev,
        [key(activeDay)]: {
          parentComment: saved.parentComment ?? (comment.trim() || null),
          parentSign: saved.parentSign ?? signName.trim(),
          parentSignedAt: saved.parentSignedAt || new Date().toISOString(),
        },
      }));
      setComment('');
      onSigned();
    } catch (e) {
      setSignErr(e instanceof ApiError ? e.message : 'Could not save your signature.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Day strip — calendar-style, floats over the app bar edge */}
        <View style={styles.dayStrip}>
          {DAY_LABELS.map((d, idx) => {
            const isActive = activeDay === idx;
            const e: any = idx < 5
              ? withOverride<DiaryDailyEntry>(session.dailyEntries.find((x) => x.dayIndex === idx), idx)
              : weeklyEntry;
            const hasContent = !!e?.teacherComment;
            const signed = !!e?.parentSignedAt;
            const dd = idx < 5 ? dayDate(session.weekStart, idx) : null;
            const inner = (
              <>
                <Text style={[styles.dayShort, isActive && { color: 'rgba(255,255,255,0.9)' }]}>{d.short}</Text>
                <Text style={[styles.dayNum, isActive && { color: '#FFF' }]}>
                  {dd ? dd.getDate() : '∑'}
                </Text>
                <View style={[
                  styles.dayDot,
                  hasContent
                    ? { backgroundColor: isActive ? '#FFF' : signed ? colors.success : colors.primary }
                    : { backgroundColor: 'transparent' },
                ]} />
              </>
            );
            return (
              <TouchableOpacity key={idx} style={{ flex: 1 }} activeOpacity={0.75}
                onPress={() => { setActiveDay(idx); setComment(''); setSignErr(null); }}>
                {isActive ? (
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dayPill}>
                    {inner}
                  </LinearGradient>
                ) : (
                  <View style={styles.dayPill}>{inner}</View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {!!session.notes && (
          <View style={styles.notesRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.notesText} numberOfLines={2}>“{session.notes}”</Text>
          </View>
        )}

        {/* Learning plan (days only) */}
        {!isWeekly && (
          <>
            <Text style={styles.sectionTitle}>Learning plan — {DAY_LABELS[activeDay].full}</Text>
            {planForDay.length === 0 ? (
              <View style={styles.subtleBox}><Text style={styles.subtleText}>No learning plan posted for this day.</Text></View>
            ) : (
              <View style={styles.planCard}>
                {planForDay.map((r, i) => (
                  <View key={r.rowIndex ?? i} style={[styles.planRow, i > 0 && styles.divider]}>
                    <View style={styles.planNumWrap}><Text style={styles.planNum}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planSubject}>{r.subject || '—'}</Text>
                      <Text style={styles.planMeta}>
                        {[r.book, r.exercise].filter(Boolean).join(' · ') || 'No details'}
                        {r.page ? `  ·  p.${r.page}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Teacher comment — chat-bubble with the teacher's avatar */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {isWeekly ? 'Weekly comment' : `${DAY_LABELS[activeDay].full}’s comment`}
          </Text>
          {hasTeacher && (
            parentSigned ? (
              <View style={[styles.miniChip, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark" size={11} color={colors.success} />
                <Text style={[styles.miniChipText, { color: colors.success }]}>Signed</Text>
              </View>
            ) : (
              <View style={[styles.miniChip, { backgroundColor: colors.primarySoft }]}>
                <MaterialCommunityIcons name="draw-pen" size={10} color={colors.primary} />
                <Text style={[styles.miniChipText, { color: colors.primary }]}>Awaiting your signature</Text>
              </View>
            )
          )}
        </View>
        {hasTeacher ? (
          <View style={styles.bubbleRow}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherInitials}>{session.teacherInitials || '?'}</Text>
            </View>
            <View style={styles.teacherBubble}>
              <Text style={styles.bubbleAuthor}>{session.teacherName || 'Class teacher'}</Text>
              <Text style={styles.bubbleText}>{active.teacherComment}</Text>
              {!!active.teacherSign && (
                <View style={styles.bubbleSignRow}>
                  <MaterialCommunityIcons name="draw-pen" size={12} color={colors.textTertiary} />
                  <Text style={styles.bubbleSignText}>Signed · {active.teacherSign}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.subtleBox}>
            <Text style={styles.subtleText}>Teacher hasn’t commented for {isWeekly ? 'this week' : 'this day'} yet.</Text>
          </View>
        )}

        {/* Parent response */}
        {hasTeacher && (
          parentSigned ? (
            <View style={[styles.bubbleRow, { justifyContent: 'flex-end' }]}>
              <View style={styles.parentBubble}>
                {!!active.parentComment && <Text style={[styles.bubbleText, { color: '#FFF' }]}>{active.parentComment}</Text>}
                <View style={[styles.bubbleSignRow, !active.parentComment && { marginTop: 0 }]}>
                  <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={[styles.bubbleSignText, { color: 'rgba(255,255,255,0.85)' }]}>
                    Signed · {active.parentSign}{active.parentSignedAt ? ` · ${fmtDate(active.parentSignedAt, { day: 'numeric', month: 'short' })}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.signForm}>
              <Text style={styles.signFormTitle}>Your response</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={isWeekly ? 'Add a note about the week (optional)…' : 'Add a note for the teacher (optional)…'}
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={2000}
                style={styles.textArea}
              />
              <View style={styles.signInputRow}>
                <MaterialCommunityIcons name="draw-pen" size={16} color={colors.textTertiary} />
                <TextInput
                  value={signName}
                  onChangeText={setSignName}
                  placeholder="Your name (signature)"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={120}
                  style={styles.signInput}
                />
              </View>
              {signErr && <Text style={styles.signErrText}>{signErr}</Text>}
              <TouchableOpacity activeOpacity={0.85} disabled={!signName.trim() || busy} onPress={submit}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.signBtn, (!signName.trim() || busy) && { opacity: 0.5 }]}>
                  {busy ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <>
                      <Ionicons name="checkmark" size={17} color="#FFF" />
                      <Text style={styles.signBtnText}>{isWeekly ? 'Sign the week' : 'Save & sign'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.signHint}>Your signature and note are saved to the class diary and visible to the teacher.</Text>
            </View>
          )
        )}

        {/* Day nav */}
        <View style={styles.navRow}>
          <TouchableOpacity disabled={activeDay === 0} style={styles.navBtn} onPress={() => { setActiveDay(Math.max(0, activeDay - 1)); setComment(''); setSignErr(null); }}>
            <Ionicons name="chevron-back" size={16} color={activeDay === 0 ? colors.textTertiary : colors.primary} />
            <Text style={[styles.navText, activeDay === 0 && { color: colors.textTertiary }]}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.navCenter}>{isWeekly ? 'Weekly summary' : `Day ${activeDay + 1} of 5`}</Text>
          <TouchableOpacity disabled={activeDay === 5} style={styles.navBtn} onPress={() => { setActiveDay(Math.min(5, activeDay + 1)); setComment(''); setSignErr(null); }}>
            <Text style={[styles.navText, activeDay === 5 && { color: colors.textTertiary }]}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color={activeDay === 5 ? colors.textTertiary : colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Stat: React.FC<{ styles: any; value: string; label: string; sub: string; color: string }> = ({ styles, value, label, sub, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={[styles.statLabel, color === '#FFF' && { color: 'rgba(255,255,255,0.9)' }]}>{label}</Text>
    <Text style={[styles.statSub, color === '#FFF' && { color: 'rgba(255,255,255,0.7)' }]}>{sub}</Text>
  </View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    // Viewport rides over the app bar band; a negative margin on the first
    // scroll child would be clipped by the ScrollView instead.
    scrollBody: { marginTop: -20 },
    scroll: { paddingHorizontal: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    appBarAction: {
      flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: 999, paddingLeft: 8, paddingRight: 12, paddingVertical: 7,
    },
    appBarActionText: { color: '#FFF', fontSize: 12, fontFamily: fonts.bold },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 14 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger },

    // Hero — gradient CTA card riding over the app bar edge
    heroCard: {
      borderRadius: 22, padding: 16,
      marginBottom: 16,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 18, elevation: 7,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIcon: {
      width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { color: '#FFF', fontSize: 15.5, fontFamily: fonts.extrabold, letterSpacing: -0.3, lineHeight: 20 },
    heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontFamily: fonts.regular, marginTop: 3, lineHeight: 17 },
    heroBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 11, marginTop: 14,
    },
    heroBtnText: { fontSize: 13.5, fontFamily: fonts.extrabold, color: c.primaryDeep },
    heroStats: {
      flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12,
      borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 19, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
    statLabel: { fontSize: 11, fontFamily: fonts.bold, color: c.textSecondary, marginTop: 2 },
    statSub: { fontSize: 9.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderRadius: 13, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, height: 42, marginBottom: 14,
    },
    searchInput: { flex: 1, fontSize: 13.5, fontFamily: fonts.regular, color: c.text, paddingVertical: 0 },

    weekCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 13, marginBottom: 10,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    weekCardTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    slotRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      marginTop: 12, paddingTop: 11, paddingHorizontal: 6,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    slot: { alignItems: 'center', gap: 4, minWidth: 30 },
    slotDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    slotLabel: { fontSize: 9.5, fontFamily: fonts.semibold, color: c.textTertiary },
    weekBadge: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    weekBadgeKicker: { fontSize: 8, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
    weekBadgeNo: { fontSize: 19, fontFamily: fonts.extrabold, color: '#FFF', lineHeight: 22 },
    weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    weekTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, flexShrink: 1 },
    miniChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    miniChipText: { fontSize: 10.5, fontFamily: fonts.bold },
    weekMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3 },
    weekNotes: { fontSize: 11.5, fontFamily: fonts.regular, fontStyle: 'italic', color: c.textSecondary, marginTop: 4 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
    progressTrack: { flex: 1, height: 5, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    progressText: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary },

    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 30, alignItems: 'center', marginBottom: 14 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    helperCard: {
      flexDirection: 'row', gap: 12, backgroundColor: c.primarySofter,
      borderRadius: 16, borderWidth: 1, borderColor: c.primary + '26', padding: 14, marginTop: 6,
    },
    helperIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    helperTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    helperText: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18 },

    // Day strip — floats over the app bar edge
    dayStrip: {
      flexDirection: 'row', gap: 4,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 5, marginBottom: 14,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    },
    dayPill: { alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
    dayShort: { fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.3 },
    dayNum: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.textSecondary, marginTop: 2 },
    dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },

    notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14, paddingHorizontal: 2 },
    notesText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, fontStyle: 'italic', color: c.textSecondary, lineHeight: 17 },

    sectionTitle: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 10 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' },

    planCard: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 20 },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    planNumWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    planNum: { fontSize: 11, fontFamily: fonts.extrabold, color: c.primary },
    planSubject: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    planMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    subtleBox: { backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center' },
    subtleText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center' },

    // Chat bubbles
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 20 },
    teacherAvatar: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    teacherInitials: { fontSize: 12, fontFamily: fonts.extrabold, color: c.primary },
    teacherBubble: {
      flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 18, borderBottomLeftRadius: 6, padding: 13,
    },
    parentBubble: {
      maxWidth: '85%', backgroundColor: c.primary,
      borderRadius: 18, borderBottomRightRadius: 6, padding: 13,
    },
    bubbleAuthor: { fontSize: 11, fontFamily: fonts.bold, color: c.primary, marginBottom: 4 },
    bubbleText: { fontSize: 13.5, fontFamily: fonts.regular, color: c.text, lineHeight: 20 },
    bubbleSignRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
    bubbleSignText: { fontSize: 10.5, fontFamily: fonts.semibold, color: c.textTertiary },

    signForm: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 20 },
    signFormTitle: { fontSize: 13.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.2, marginBottom: 10 },
    textArea: { minHeight: 74, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, padding: 12, fontSize: 13.5, fontFamily: fonts.regular, color: c.text, textAlignVertical: 'top' },
    signInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: 12, height: 46, marginTop: 10 },
    signInput: { flex: 1, fontSize: 13.5, fontFamily: fonts.medium, color: c.text, paddingVertical: 0 },
    signErrText: { fontSize: 12, fontFamily: fonts.medium, color: c.danger, marginTop: 8 },
    signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
    signBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    signHint: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 10, lineHeight: 16 },

    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 6 },
    navText: { fontSize: 13, fontFamily: fonts.bold, color: c.primary },
    navCenter: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary },
  });
}
