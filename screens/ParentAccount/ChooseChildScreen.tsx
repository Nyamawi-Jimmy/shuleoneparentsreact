import React, { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1612531048118-826c64158142?w=200&h=200&fit=crop&crop=face';

export const ChooseChildScreen: React.FC = () => {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    router.replace('/chooser' as any);
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#FB7185', '#E11D48']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Welcome!</Text>
        <Text style={styles.headerSubtitle}>
          Choose which child you'd like to view today
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your children…</Text>
          </View>
        )}

        {!loading && children.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyCircle}>
              <Ionicons name="people-outline" size={28} color={colors.textTertiary} />
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
              const photoUri = (child as any).photoUrl || PLACEHOLDER;
              const className = child.className || (child as any).grade || '—';
              const schoolName = child.schoolName || '';
              return (
                <TouchableOpacity
                  key={child.studentId}
                  activeOpacity={0.85}
                  onPress={() => handleChildPress(child.studentId)}
                  style={styles.childCard}
                >
                  <View style={styles.avatarRing}>
                    <Image source={{ uri: photoUri }} style={styles.avatarImg} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.childName}>{child.fullName}</Text>
                    <Text style={styles.childMeta}>{className}</Text>
                    {!!schoolName && (
                      <View style={styles.schoolRow}>
                        <Ionicons name="location" size={12} color={colors.textTertiary} />
                        <Text style={styles.childSchool}>{schoolName}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!loading && (
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7} style={styles.signOutBtn}>
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
      paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24,
    },
    headerTitle: {
      color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.6,
    },
    headerSubtitle: {
      color: '#FFFFFF', fontSize: 14, opacity: 0.95,
      marginTop: 6, fontWeight: '500', lineHeight: 19,
    },
    scroll: { paddingHorizontal: 18, paddingTop: 18 },

    center: { alignItems: 'center', paddingVertical: 60 },
    loadingText: { color: c.textSecondary, fontSize: 13, marginTop: 12, fontWeight: '500' },
    emptyCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: c.text },
    emptyText: {
      fontSize: 12.5, color: c.textSecondary, marginTop: 6,
      textAlign: 'center', lineHeight: 17, paddingHorizontal: 30,
    },

    childList: { gap: 12, paddingBottom: 8 },
    childCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 18,
      padding: 14,
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 6, elevation: 2,
    },
    avatarRing: {
      width: 58, height: 58, borderRadius: 29,
      borderWidth: 2, borderColor: c.primarySoft,
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    childName: {
      fontSize: 16, fontWeight: '800',
      color: c.text, letterSpacing: -0.2,
    },
    childMeta: { fontSize: 12.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    schoolRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
    childSchool: { fontSize: 11.5, color: c.textTertiary, fontWeight: '500' },
    chevronCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },

    signOutBtn: { alignItems: 'center', paddingVertical: 24, marginTop: 12 },
    signOutText: { color: c.danger, fontSize: 13.5, fontWeight: '700' },
  });
}
