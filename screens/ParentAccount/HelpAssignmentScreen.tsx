// "Help do it" — the parent works through ONE assignment WITH the child,
// mirroring the web AssignmentPlayer's assist mode. Like the web, it uses the
// PARENT-scoped assignment endpoints (/parent/children/{studentId}/assignments
// /{examId}[/submit|/review]) so the attempt is saved as parent-assisted on
// the child's account — no kid-learn header needed. Reuses the TaskPlayer with
// those parent fetchers injected. Its own professional design.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { TierProvider } from '../StudentAccount/TierContext';
import { TaskPlayer } from '../StudentAccount/views/TaskPlayer';
import {
  getParentAssignmentExam, submitParentAssignmentExam, getParentAssignmentReview,
} from '../../api/student';

export const HelpAssignmentScreen: React.FC = () => {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  // Pad by the real status-bar height instead of a hardcoded guess, so the
  // clock/battery/notification icons are never sat on by the header row.
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ examId?: string; studentId?: string; childName?: string }>();
  const examId = params.examId ? Number(params.examId) : null;
  const studentId = params.studentId ? Number(params.studentId) : null;
  const childName = (params.childName as string) || 'your child';

  if (examId == null || studentId == null || !accessToken) { router.back(); return null; }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Parent-assist header — its own professional design */}
      <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bar, { paddingTop: insets.top + 14 }]}>
        <View style={styles.badge}><Text style={{ fontSize: 18 }}>🤝</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>Help {childName} do this</Text>
          <Text style={styles.sub} numberOfLines={1}>Saved as parent-assisted · counts on their account</Text>
        </View>
        <TouchableOpacity style={styles.done} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="close" size={14} color="#FFF" />
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </LinearGradient>

      <TierProvider>
        <TaskPlayer
          examId={examId}
          loadExam={(id) => getParentAssignmentExam(accessToken, studentId, id)}
          submitExam={(id, body) => submitParentAssignmentExam(accessToken, studentId, id, body)}
          loadReviewFn={(id, take) => getParentAssignmentReview(accessToken, studentId, id, take)}
          helperStudentId={studentId}
          helperAudience="PARENT"
          onClose={() => router.back()}
          onSubmitted={() => router.back()}
        />
      </TierProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    // paddingTop comes from the safe-area inset inline (see component).
    paddingHorizontal: 14, paddingBottom: 13,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  badge: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15.5, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: -0.3 },
  sub: { fontSize: 11, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  done: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
  },
  doneText: { fontSize: 12.5, fontFamily: fonts.bold, color: '#FFF' },
});
