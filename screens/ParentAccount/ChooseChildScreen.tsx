// Choose child — the post-login child picker, in the app's design language:
// flat brand header with a floating child list riding over its edge, initials
// avatars (no stock photos), and quiet sign-out.

import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { fonts } from '../../constants/theme';

export const ChooseChildScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Pad by the real status-bar height instead of a hardcoded guess, so the
  // clock/battery/notification icons are never sat on by the header.
  const insets = useSafeAreaInsets();

  const { children, selectChild, loading } = useSelectedChild();
  const { signOut } = useAuth();

  useEffect(() => {
    if (!loading && children.length === 1) {
      selectChild(children[0].studentId);
      router.replace('/(tabs)' as any);
    }
  }, [loading, children]);

  const handleChildPress = (studentId: number | null) => {
    if (studentId == null) return;
    selectChild(studentId);
    router.replace('/(tabs)' as any);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login' as any);
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Flat brand header — same language as the app bars */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 24 }]}>
        <Text style={styles.headerTitle}>Who are we checking on?</Text>
        <Text style={styles.headerSubtitle}>Pick a child — you can switch any time from Today.</Text>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your children…</Text>
          </View>
        )}

        {!loading && children.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyCircle}>
              <Ionicons name="people-outline" size={26} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No children linked</Text>
            <Text style={styles.emptyText}>
              No children are linked to this account yet. Please contact your school.
            </Text>
          </View>
        )}

        {!loading && children.length > 1 && (
          <View style={styles.childList}>
            {children.map((child) => {
              const photoUri = (child as any).photoUrl as string | undefined;
              const className = child.classLabel || child.className || '—';
              const schoolName = child.schoolName || '';
              return (
                <TouchableOpacity
                  key={child.studentId}
                  activeOpacity={0.8}
                  onPress={() => handleChildPress(child.studentId)}
                  style={styles.childCard}
                >
                  <View style={styles.avatar}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarInitials}>{child.initials}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 13 }}>
                    <Text style={styles.childName} numberOfLines={1}>{child.fullName}</Text>
                    <Text style={styles.childMeta} numberOfLines={1}>{className}</Text>
                    {!!schoolName && (
                      <View style={styles.schoolRow}>
                        <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
                        <Text style={styles.childSchool} numberOfLines={1}>{schoolName}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!loading && (
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={15} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      // paddingTop comes from the safe-area inset inline (see component).
      paddingBottom: 40, paddingHorizontal: 20,
      borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    },
    headerTitle: { color: '#FFF', fontSize: 21, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
    headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontFamily: fonts.regular, marginTop: 5, lineHeight: 18 },

    // The whole scroll viewport rides over the header edge — a negative margin
    // inside contentContainer would get clipped by the ScrollView instead.
    scrollBody: { marginTop: -22 },
    scroll: { paddingHorizontal: 16, paddingBottom: 24 },

    center: { alignItems: 'center', paddingVertical: 60, backgroundColor: c.background, borderRadius: 18 },
    loadingText: { color: c.textSecondary, fontSize: 13, fontFamily: fonts.medium, marginTop: 12 },

    emptyCard: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', padding: 32,
    },
    emptyCircle: {
      width: 54, height: 54, borderRadius: 27,
      backgroundColor: c.backgroundAlt,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: c.text },
    emptyText: {
      fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 6,
      textAlign: 'center', lineHeight: 18, paddingHorizontal: 16,
    },

    childList: { gap: 10 },
    childCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 18,
      padding: 13,
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.06,
      shadowRadius: 8, elevation: 3,
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: c.primarySoft, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitials: { fontSize: 16, fontFamily: fonts.extrabold, color: c.primary },
    childName: { fontSize: 15, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    childMeta: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 2 },
    schoolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
    childSchool: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary },
    chevronCircle: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },

    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 22, marginTop: 8,
    },
    signOutText: { color: c.danger, fontSize: 13, fontFamily: fonts.bold },
  });
}
