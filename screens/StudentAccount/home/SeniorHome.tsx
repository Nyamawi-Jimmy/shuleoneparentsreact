import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { mockSeniorHome, mockStudentName } from '../mockData';

// ── REAL DATA ─────────────────────────────────────────────────
import { useStudentHome } from '../../../hooks/useStudentHome';

// Subject palette to map real subject names → background colour
const SUBJECT_COLORS: Record<string, string> = {
  math: '#7c3aed', mathematics: '#7c3aed',
  english: '#3b82f6',
  science: '#ef4444', biology: '#ef4444', chemistry: '#ef4444', physics: '#ef4444',
  kiswahili: '#a855f7',
  social: '#f59e0b', history: '#f59e0b', geography: '#f59e0b',
  cre: '#06b6d4', ire: '#06b6d4',
  computer: '#6366f1', ict: '#6366f1',
  art: '#ec4899',
};

const SUBJECT_EMOJI: Record<string, string> = {
  math: '🧮', mathematics: '🧮',
  english: '📖',
  science: '🔬', biology: '🧬', chemistry: '⚗️', physics: '🔭',
  kiswahili: '🌍',
  social: '🌐', history: '📜', geography: '🗺️',
  cre: '✝️', ire: '☪️',
  computer: '💻', ict: '💻',
  art: '🎨',
};

function gradeForPct(pct: number): string {
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'A-';
  if (pct >= 70) return 'B+';
  if (pct >= 65) return 'B';
  if (pct >= 60) return 'B-';
  if (pct >= 55) return 'C+';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'E';
}

function metaFor(name: string) {
  const k = (name || '').toLowerCase();
  for (const key of Object.keys(SUBJECT_COLORS)) {
    if (k.includes(key)) {
      return { color: SUBJECT_COLORS[key], emoji: SUBJECT_EMOJI[key] };
    }
  }
  return { color: '#7c3aed', emoji: '📚' };
}

export const SeniorHome: React.FC = () => {
  const { profile, gamification, progress, calendar } = useStudentHome();

  const realFirstName = profile?.firstName ?? mockStudentName;
  const className = profile?.className ?? 'Grade 11';
  const streamName = profile?.streamName ?? 'STEM Pathway';

  // Today's timetable from calendar
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayItems = (calendar ?? []).filter((c) => (c.startsOn ?? '').slice(0, 10) === todayKey);
  const todayTimetable = todayItems.length > 0
    ? todayItems.map((c) => ({
        time: c.startsOn ? new Date(c.startsOn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
        activity: c.title ?? 'Class',
      }))
    : mockSeniorHome.timetable;

  // Upcoming CATs/exams from calendar (kind=EXAM or status indicators)
  const upcomingExams = (calendar ?? [])
    .filter((c) => {
      const kind = (c.kind ?? '').toUpperCase();
      return kind === 'EXAM' || kind === 'CAT' || kind === 'TEST';
    })
    .slice(0, 4);

  const upcomingCATs = upcomingExams.length > 0
    ? upcomingExams.map((c) => ({
        title: c.title ?? 'CAT',
        due: c.startsOn ? new Date(c.startsOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD',
        urgent: c.startsOn ? (new Date(c.startsOn).getTime() - Date.now()) < (3 * 86400000) : false,
      }))
    : mockSeniorHome.upcomingCATs;

  // Subjects from learner progress
  const realSubjects = (progress.subjects ?? []).filter((s) => s.subject);
  const subjects = realSubjects.length > 0
    ? realSubjects.map((s) => {
        const pct = Math.max(0, Math.min(100, s.avgScorePct ?? 0));
        const meta = metaFor(s.subject ?? '');
        return {
          name: s.subject ?? '—',
          emoji: meta.emoji,
          color: meta.color,
          pct,
          grade: gradeForPct(pct),
        };
      })
    : mockSeniorHome.subjects;

  // KPIs - use real where available
  const realKpis = [
    { ic: '📈', value: `${progress.avgScorePct ?? 0}%`, label: 'avg score' },
    { ic: '🎯', value: `${progress.masteryCount ?? 0}`, label: 'mastered' },
    { ic: '🔥', value: `${gamification.streak?.current ?? 0}`, label: 'day streak' },
    { ic: '⚡', value: `${gamification.totalXp ?? 0}`, label: 'total XP' },
  ];
  const kpis = realKpis.some((k) => parseInt(k.value) > 0) ? realKpis : mockSeniorHome.kpis;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Greeting */}
      <View style={styles.greet}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetTitle}>Welcome back, {realFirstName}</Text>
          <Text style={styles.greetSub}>{className} · {streamName} · Term 2</Text>
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{mockSeniorHome.date}</Text>
        </View>
      </View>

      {/* Exam countdown - keep mock for now (no national exam endpoint) */}
      <LinearGradient
        colors={['#4f46e5', '#0ea5a8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.countdown}
      >
        <View style={styles.countdownNumBox}>
          <Text style={styles.countdownNum}>{mockSeniorHome.examCountdownDays}</Text>
          <Text style={styles.countdownDays}>DAYS</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 14 }}>
          <Text style={styles.countdownTitle}>{mockSeniorHome.examTitle}</Text>
          <Text style={styles.countdownSub}>{mockSeniorHome.examNote}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.whitePillBtn}
          onPress={() => router.push('/(student-tabs)/games' as any)}
        >
          <Text style={styles.whitePillText}>Revision plan</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* KPIs - real where possible */}
      <View style={styles.kpis}>
        {kpis.map((k) => (
          <View key={k.label} style={styles.kpi}>
            <Text style={styles.kpiIc}>{k.ic}</Text>
            <Text style={styles.kpiVal}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Subject performance - REAL from learner progress */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📊 Subject performance</Text>
        {subjects.map((s, idx) => (
          <View
            key={`${s.name}-${idx}`}
            style={[styles.courseRow, idx < subjects.length - 1 && styles.divider]}
          >
            <View style={[styles.ci, { backgroundColor: s.color }]}>
              <Text style={styles.ciEm}>{s.emoji}</Text>
            </View>
            <Text style={styles.courseName}>{s.name}</Text>
            <View style={styles.coursePg}>
              <LinearGradient
                colors={['#4f46e5', '#0ea5a8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.coursePgFill, { width: `${s.pct}%` }]}
              />
            </View>
            <Text style={styles.courseGr}>{s.grade}</Text>
          </View>
        ))}
      </View>

      {/* Revision creds - keep mock */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📝 Revision & past papers</Text>
        <View style={styles.credsRow}>
          {mockSeniorHome.revision.map((r) => (
            <View key={r} style={styles.cred}>
              <Text style={styles.credText}>{r}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Upcoming CATs - REAL from calendar */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>⏰ Upcoming CATs</Text>
        {upcomingCATs.map((c, idx) => (
          <View
            key={c.title}
            style={[styles.dlRow, idx < upcomingCATs.length - 1 && styles.divider]}
          >
            <View style={styles.dlDot} />
            <Text style={styles.dlText}>{c.title}</Text>
            <View style={[styles.dlDue, !c.urgent && styles.dlDueSoft]}>
              <Text style={[styles.dlDueText, !c.urgent && styles.dlDueTextSoft]}>{c.due}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Today's timetable - REAL from calendar */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🕘 Today's timetable</Text>
        {todayTimetable.map((t, idx) => (
          <View
            key={`${t.time}-${idx}`}
            style={[styles.ttRow, idx < todayTimetable.length - 1 && styles.divider]}
          >
            <Text style={styles.ttTime}>{t.time}</Text>
            <Text style={styles.ttActivity}>{t.activity}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 24 },

  greet: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  greetTitle: { fontSize: 19, fontWeight: '800', color: '#2c2550' },
  greetSub: { color: '#6f679c', fontWeight: '600', fontSize: 12, marginTop: 2 },
  dateChip: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece8fb',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  dateChipText: { color: '#6f679c', fontWeight: '600', fontSize: 11 },

  countdown: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 13, marginBottom: 14,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  countdownNumBox: { alignItems: 'center' },
  countdownNum: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 36 },
  countdownDays: { color: '#fff', fontSize: 10, fontWeight: '700', opacity: 0.85, marginTop: -2 },
  countdownTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  countdownSub: { color: 'rgba(255,255,255,0.92)', fontSize: 11.5, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  whitePillBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  whitePillText: { color: '#4f46e5', fontWeight: '800', fontSize: 11.5 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', padding: 12, borderRadius: 13,
    borderWidth: 1, borderColor: '#ece8fb',
  },
  kpiIc: { fontSize: 15, opacity: 0.8 },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  kpiLabel: { color: '#6f679c', fontWeight: '600', fontSize: 10.5, marginTop: 2 },

  panel: {
    backgroundColor: '#fff', borderRadius: 13,
    borderWidth: 1, borderColor: '#ece8fb',
    padding: 14, marginBottom: 12,
  },
  panelTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550', marginBottom: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },

  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  ci: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ciEm: { color: '#fff', fontSize: 14, fontWeight: '800' },
  courseName: { flex: 1, fontWeight: '700', fontSize: 12.5, color: '#2c2550' },
  coursePg: { width: 90, height: 7, borderRadius: 99, backgroundColor: '#efeaff', overflow: 'hidden' },
  coursePgFill: { height: '100%' },
  courseGr: { width: 36, textAlign: 'right', fontWeight: '800', color: '#4f46e5', fontSize: 13 },

  credsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cred: {
    backgroundColor: '#efeaff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  credText: { color: '#6f679c', fontWeight: '700', fontSize: 11 },

  dlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  dlDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#0ea5a8' },
  dlText: { flex: 1, fontWeight: '600', fontSize: 12.5, color: '#2c2550' },
  dlDue: { backgroundColor: '#ffeef1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dlDueSoft: { backgroundColor: '#efeaff' },
  dlDueText: { color: '#e2566f', fontWeight: '800', fontSize: 10.5 },
  dlDueTextSoft: { color: '#6f679c' },

  ttRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  ttTime: { color: '#4f46e5', fontWeight: '800', fontSize: 12, width: 54 },
  ttActivity: { flex: 1, fontWeight: '600', fontSize: 12.5, color: '#2c2550' },
});
