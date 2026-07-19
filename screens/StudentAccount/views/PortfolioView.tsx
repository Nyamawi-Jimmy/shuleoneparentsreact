import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { useStudentPortfolio } from '../../../hooks/useStudentPortfolio';
import { PortfolioProject, PortfolioSkill } from '../../../api/student.types';

const statusMeta = (status?: string | null): { label: string; color: string } => {
  const s = String(status || '').toUpperCase();
  if (s === 'GRADED') return { label: 'Graded', color: '#15c98c' };
  if (s === 'PUBLISHED') return { label: 'Published', color: '#7c5cff' };
  if (s === 'SUBMITTED') return { label: 'Submitted', color: '#3aa0ff' };
  return { label: status || 'Draft', color: '#9b93c4' };
};
const masteryColor = (pct: number) => (pct >= 80 ? '#15c98c' : pct >= 50 ? '#f59e0b' : '#7c5cff');

export const PortfolioView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { stats, projects, skills, loading, refreshing, error, refresh } = useStudentPortfolio();

  const title = pickByTier(tier, {
    base: '🎒 My Portfolio', sprout: '🎒 My Treasures', explorer: '🎒 My Treasures',
    scholar: '🎒 My Portfolio', campus: '🎒 Innovation Profile',
  });

  const isEmpty = projects.length === 0 && skills.length === 0;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader title={title} subtitle="Your projects and the skills you’ve earned" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent1} />}
      >
        {loading && isEmpty ? (
          <View style={styles.center}><ActivityIndicator size="large" color={tokens.accent1} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎒</Text>
            <Text style={styles.emptyTitle}>Couldn’t load your portfolio</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌟</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Submit your first coding or robotics project and earn skills — they’ll show up here for you to share.</Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard value={stats?.projects ?? projects.length} label="Projects" color="#7c5cff" radius={tokens.radius} />
              <StatCard value={stats?.skillsMastered ?? skills.length} label="Skills earned" color="#15c98c" radius={tokens.radius} />
            </View>

            {/* Projects */}
            {projects.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Projects</Text>
                {projects.map((p, i) => <ProjectCard key={p.id ?? i} project={p} radius={tokens.radius} />)}
              </>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Skills mastered</Text>
                <View style={[styles.skillsCard, { borderRadius: tokens.radius }]}>
                  {skills.map((s, i) => <SkillRow key={s.subStrandId ?? i} skill={s} last={i === skills.length - 1} />)}
                </View>
              </>
            )}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const StatCard: React.FC<{ value: number; label: string; color: string; radius: number }> = ({ value, label, color, radius }) => (
  <View style={[styles.statCard, { borderRadius: radius }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProjectCard: React.FC<{ project: PortfolioProject; radius: number }> = ({ project, radius }) => {
  const st = statusMeta(project.status);
  const graded = project.scorePct != null;
  return (
    <View style={[styles.projectCard, { borderRadius: radius }]}>
      <View style={styles.projectTop}>
        <View style={styles.projectIcon}><Text style={{ fontSize: 20 }}>🎨</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.projectTitle} numberOfLines={1}>{project.title || 'Project'}</Text>
          {!!project.summary && <Text style={styles.projectSummary} numberOfLines={2}>{project.summary}</Text>}
        </View>
        <View style={[styles.statusChip, { backgroundColor: st.color + '18' }]}>
          <Text style={[styles.statusChipText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {(graded || project.band != null) && (
        <View style={styles.scoreRow}>
          {graded && (
            <View style={styles.scorePill}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.scorePillText}>{project.scorePct}%</Text>
            </View>
          )}
          {project.band != null && (
            <View style={styles.bandPill}><Text style={styles.bandPillText}>Band {project.band}</Text></View>
          )}
        </View>
      )}

      {!!project.feedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText} numberOfLines={3}>“{project.feedback}”</Text>
        </View>
      )}

      {(project.artifactUrl || project.repoUrl) && (
        <View style={styles.linkRow}>
          {!!project.artifactUrl && (
            <TouchableOpacity style={styles.linkBtn} activeOpacity={0.8} onPress={() => Linking.openURL(project.artifactUrl!)}>
              <Ionicons name="open-outline" size={13} color="#7c5cff" />
              <Text style={styles.linkBtnText}>View</Text>
            </TouchableOpacity>
          )}
          {!!project.repoUrl && (
            <TouchableOpacity style={styles.linkBtn} activeOpacity={0.8} onPress={() => Linking.openURL(project.repoUrl!)}>
              <Ionicons name="code-slash" size={13} color="#7c5cff" />
              <Text style={styles.linkBtnText}>Code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const SkillRow: React.FC<{ skill: PortfolioSkill; last: boolean }> = ({ skill, last }) => {
  const pct = Math.max(0, Math.min(100, skill.masteryPct || 0));
  const color = masteryColor(pct);
  return (
    <View style={[styles.skillRow, !last && styles.divider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.skillName} numberOfLines={1}>{skill.name || 'Skill'}</Text>
        <View style={styles.skillTrack}>
          <LinearGradient colors={[color, color + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.skillFill, { width: `${pct}%` }]} />
        </View>
      </View>
      <Text style={[styles.skillPct, { color }]}>{pct}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 44 },
  emptyIcon: { fontSize: 54, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  retry: { color: '#7c5cff', fontWeight: '800', fontSize: 13, marginTop: 10 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', padding: 16, alignItems: 'center',
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#6f679c', marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550', marginBottom: 12 },

  projectCard: {
    backgroundColor: '#fff', padding: 14, marginBottom: 12,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  projectTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  projectIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f4f1ff', alignItems: 'center', justifyContent: 'center' },
  projectTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550' },
  projectSummary: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 3, lineHeight: 16 },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusChipText: { fontSize: 10, fontWeight: '800' },

  scoreRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7e6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  scorePillText: { fontSize: 11.5, fontWeight: '800', color: '#f59e0b' },
  bandPill: { backgroundColor: '#efeaff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  bandPillText: { fontSize: 11, fontWeight: '800', color: '#7c5cff' },

  feedbackBox: { backgroundColor: '#f7f5ff', borderRadius: 12, padding: 11, marginTop: 12 },
  feedbackText: { fontSize: 12, fontStyle: 'italic', color: '#6f679c', fontWeight: '600', lineHeight: 17 },

  linkRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#efeaff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  linkBtnText: { fontSize: 12, fontWeight: '800', color: '#7c5cff' },

  skillsCard: {
    backgroundColor: '#fff', paddingHorizontal: 14,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  divider: { borderBottomWidth: 2, borderBottomColor: '#f2eefc' },
  skillName: { fontSize: 13, fontWeight: '700', color: '#2c2550' },
  skillTrack: { height: 7, borderRadius: 99, backgroundColor: '#f0ecfb', overflow: 'hidden', marginTop: 7 },
  skillFill: { height: '100%', borderRadius: 99 },
  skillPct: { fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'right' },
});
