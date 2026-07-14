// "Help do it" — opens one assignment for the parent to work through WITH the
// child, mirroring the web's AssignmentPlayer flow. While mounted it arms the
// kid-learn header (X-Learn-As-Child), so the student assignment endpoints
// resolve to the selected child and everything the parent does is saved on the
// child's account. Reuses the student TaskPlayer verbatim.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../constants/theme';
import { setLearnAsChild } from '../../config/api';
import { TierProvider } from '../StudentAccount/TierContext';
import { TaskPlayer } from '../StudentAccount/views/TaskPlayer';

export const HelpAssignmentScreen: React.FC = () => {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ examId?: string; studentId?: string; childName?: string }>();
  const examId = params.examId ? Number(params.examId) : null;
  const studentId = params.studentId ? Number(params.studentId) : null;
  const childName = (params.childName as string) || 'your child';

  // Arm kid-learn for the child while this screen is open.
  useEffect(() => {
    if (studentId == null) return;
    setLearnAsChild(studentId);
    return () => setLearnAsChild(null);
  }, [studentId]);

  if (examId == null) { router.back(); return null; }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Slim kid-learn context strip; TaskPlayer draws its own title + close. */}
      <View style={[styles.strip, { backgroundColor: colors.primarySoft }]}>
        <Text style={{ fontSize: 13 }}>🎓</Text>
        <Text style={[styles.stripText, { color: colors.primaryDeep }]} numberOfLines={1}>
          Helping {childName} — their work saves to their account
        </Text>
      </View>
      <TierProvider>
        <TaskPlayer
          examId={examId}
          onClose={() => router.back()}
          onSubmitted={() => router.back()}
        />
      </TierProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 9,
  },
  stripText: { flex: 1, fontSize: 12, fontFamily: fonts.bold },
});
