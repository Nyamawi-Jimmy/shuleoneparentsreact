import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mockCampusHome, mockStudentName } from '../mockData';

// ── REAL DATA ─────────────────────────────────────────────────
import { useStudentHome } from '../../../hooks/useStudentHome';

export const CampusHome: React.FC = () => {
  const { profile, gamification, progress, calendar } = useStudentHome();

  const realFirstName = profile?.firstName ?? mockStudentName;
  const className = profile?.className ?? 'BSc Computer Science';
  const greetSub = `${className} · Year 2 · Semester 1`;

  // KPIs - replace with real where possible
  const realKpis = [
    { ic: '📚', value: `${progress.stagesCompleted ?? 0}`, label: 'units active' },
    { ic: '📈', value: `${progress.avgScorePct ?? 0}%`, label: 'avg score' },
    { ic: '🏅', value: `${gamification.badges?.length ?? 0}`, label: 'credentials' },
    { ic: '🔥', value: `${gamification.streak?.current ?? 0}`, label: 'day streak' },
  ];
  const kpis = realKpis.some((k) => parseInt(k.value) > 0) ? realKpis : mockCampusHome.kpis;

  // Today's weekly schedule from calendar
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingItems = (calendar ?? [])
    .filter((c) => (c.startsOn ?? '').slice(0, 10) >= todayKey)
    .slice(0, 5);
  const weekly = upcomingItems.length > 0
    ? upcomingItems.map((c) => ({
        time: c.startsOn
          ? new Date(c.startsOn).toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' +
            new Date(c.startsOn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : '—',
        activity: c.title ?? 'Class',
      }))
    : mockCampusHome.weekly;

  // Earned badges → cert chips
  const earnedBadges = (gamification.badges ?? []).filter((b) => b.earnedAt);
  const certs = earnedBadges.length > 0
    ? earnedBadges.slice(0, 6).map((b) => b.title ?? 'Achievement')
    : mockCampusHome.certs;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Greeting */}
      <View style={styles.greet}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetTitle}>Welcome back, {realFirstName}</Text>
          <Text style={styles.greetSub}>{greetSub}</Text>
        </View>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{mockCampusHome.date}</Text>
        </View>
      </View>

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

      {/* Units - keep mock (no university units endpoint) */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🧾 My units · Semester 1</Text>
        {mockCampusHome.units.map((u, idx) => (
          <View
            key={u.name}
            style={[styles.courseRow, idx < mockCampusHome.units.length - 1 && styles.divider]}
          >
            <View style={[styles.ci, { backgroundColor: u.color }]}>
              <Text style={styles.ciEm}>{u.short}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseName}>{u.name}</Text>
              <Text style={styles.courseSub}>{u.code}</Text>
            </View>
            <View style={styles.coursePg}>
              <LinearGradient
                colors={['#0f766e', '#475569']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.coursePgFill, { width: `${u.pct}%` }]}
              />
            </View>
            <Text style={styles.courseGr}>{u.grade}</Text>
          </View>
        ))}
      </View>

      {/* Announcements - keep mock (no student-announcements endpoint) */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📢 Announcements</Text>
        {mockCampusHome.announcements.map((a, idx) => (
          <View
            key={a.text}
            style={[styles.dlRow, idx < mockCampusHome.announcements.length - 1 && styles.divider]}
          >
            <View style={styles.dlDot} />
            <Text style={styles.dlText}>{a.text}</Text>
            <View style={[styles.dlDue, !a.urgent && styles.dlDueSoft]}>
              <Text style={[styles.dlDueText, !a.urgent && styles.dlDueTextSoft]}>{a.due}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Deadlines - keep mock (no assignments endpoint yet) */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📤 Deadlines & submissions</Text>
        {mockCampusHome.deadlines.map((d, idx) => (
          <View
            key={d.text}
            style={[styles.dlRow, idx < mockCampusHome.deadlines.length - 1 && styles.divider]}
          >
            <View style={styles.dlDot} />
            <Text style={styles.dlText}>{d.text}</Text>
            <View style={[styles.dlDue, !d.urgent && styles.dlDueSoft]}>
              <Text style={[styles.dlDueText, !d.urgent && styles.dlDueTextSoft]}>{d.due}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* This week - REAL from calendar */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🗓️ This week</Text>
        {weekly.map((w, idx) => (
          <View
            key={`${w.time}-${idx}`}
            style={[styles.ttRow, idx < weekly.length - 1 && styles.divider]}
          >
            <Text style={styles.ttTime}>{w.time}</Text>
            <Text style={styles.ttActivity}>{w.activity}</Text>
          </View>
        ))}
      </View>

      {/* Career & certs - REAL from earned badges */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>🎖️ Career & certificates</Text>
        <View style={styles.credsRow}>
          {certs.map((c, idx) => (
            <View key={`cert-${idx}`} style={styles.cred}>
              <Text style={styles.credText}>{c}</Text>
            </View>
          ))}
        </View>
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

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', padding: 12, borderRadius: 11,
    borderWidth: 1, borderColor: '#ece8fb',
  },
  kpiIc: { fontSize: 14, opacity: 0.8 },
  kpiVal: { fontSize: 21, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  kpiLabel: { color: '#6f679c', fontWeight: '600', fontSize: 10.5, marginTop: 2 },

  panel: {
    backgroundColor: '#fff', borderRadius: 11,
    borderWidth: 1, borderColor: '#ece8fb',
    padding: 14, marginBottom: 12,
  },
  panelTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550', marginBottom: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },

  courseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  ci: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ciEm: { color: '#fff', fontSize: 12, fontWeight: '800' },
  courseName: { fontWeight: '700', fontSize: 12.5, color: '#2c2550' },
  courseSub: { color: '#6f679c', fontWeight: '500', fontSize: 10.5, marginTop: 1 },
  coursePg: { width: 70, height: 7, borderRadius: 99, backgroundColor: '#efeaff', overflow: 'hidden' },
  coursePgFill: { height: '100%' },
  courseGr: { width: 30, textAlign: 'right', fontWeight: '800', color: '#0f766e', fontSize: 12 },

  dlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  dlDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#475569' },
  dlText: { flex: 1, fontWeight: '600', fontSize: 12.5, color: '#2c2550' },
  dlDue: { backgroundColor: '#ffeef1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dlDueSoft: { backgroundColor: '#efeaff' },
  dlDueText: { color: '#e2566f', fontWeight: '800', fontSize: 10.5 },
  dlDueTextSoft: { color: '#6f679c' },

  ttRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  ttTime: { color: '#0f766e', fontWeight: '800', fontSize: 12, width: 54 },
  ttActivity: { flex: 1, fontWeight: '600', fontSize: 12.5, color: '#2c2550' },

  credsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cred: {
    backgroundColor: '#efeaff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  credText: { color: '#6f679c', fontWeight: '700', fontSize: 11 },
});
