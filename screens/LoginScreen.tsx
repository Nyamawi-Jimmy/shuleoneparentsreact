// One login for everyone — the same unified /auth/login the web uses.
// Clean, neutral canvas: the brand color appears only in the logo mark,
// the sign-in button and links. On CHOOSE_ACCOUNT (one identifier matching
// both a parent and a student account) a picker appears and we retry.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { fonts } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { useAuth } from '../context/AuthContext';
import { LoginCandidate } from '../api/auth';

const homeFor = (userType?: string | null) =>
  String(userType || '').toUpperCase() === 'PARENT' ? '/choose-child' : '/(student-tabs)';

export const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signInUnified } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<LoginCandidate[] | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null); // accountId being tried

  const attempt = async (userType?: string | null, accountId?: number | string | null) => {
    const id = identifier.trim();
    if (!id || !password) { setError('Enter your phone/email/username and password.'); return; }
    setError('');
    if (accountId != null) setChoosing(String(accountId)); else setBusy(true);
    try {
      const out = await signInUnified(id, password, userType, accountId);
      if ('user' in out) {
        router.replace(homeFor(out.user.userType) as any);
        return;
      }
      const r: any = out.result;
      if (r?.status === 'CHOOSE_ACCOUNT') {
        setCandidates(Array.isArray(r.candidates) ? r.candidates : []);
      } else if (r?.status === 'PASSWORD_NOT_SET') {
        setError(r.message || 'This account uses Google sign-in on the web. Set a password there first.');
      } else {
        setError(r?.message || 'Could not sign you in. Check your details.');
      }
    } catch (e: any) {
      setError(e?.message || 'Invalid login details.');
    } finally {
      setBusy(false); setChoosing(null);
    }
  };

  const typeMeta = (t?: string | null) => {
    const k = String(t || '').toUpperCase();
    if (k === 'PARENT') return {
      icon: 'people' as const, label: 'Parent', tint: colors.primary,
      gradient: [colors.primary, colors.primaryDeep] as [string, string],
      desc: 'Fees, diary, results & the school bus',
    };
    if (k === 'STUDENT' || k === 'LEARNER') return {
      icon: 'school' as const, label: 'Student', tint: '#7C3AED',
      gradient: ['#8B5CF6', '#6D28D9'] as [string, string],
      desc: 'Lessons, quests, games & assignments',
    };
    return {
      icon: 'person' as const, label: k || 'Account', tint: colors.textSecondary,
      gradient: ['#64748B', '#475569'] as [string, string],
      desc: 'Open this account',
    };
  };

  return (
    <View style={styles.root}>
      {/* Android needs an explicit behavior — with `undefined` the view does
          nothing, so the keyboard covered the password field (the lower of the
          two) and it looked like the field had disappeared. 'height' is what
          ConversationScreen already uses successfully. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark — the only saturated element on the page */}
          <View style={styles.brand}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoSquircle}>
              <MaterialCommunityIcons name="school" size={28} color="#FFF" />
            </LinearGradient>
            <Text style={styles.brandName}>ShuleOne</Text>
          </View>

          {candidates ? (
            <>
              {/* Step 2 — choose the account behind these details */}
              <View style={styles.stepDots}>
                <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                <View style={[styles.stepDot, styles.stepDotWide, { backgroundColor: colors.primary }]} />
              </View>

              <Text style={[styles.title, styles.centered]}>Choose your account</Text>
              <View style={styles.identRow}>
                <View style={styles.identPill}>
                  <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.identPillText} numberOfLines={1}>{identifier.trim()}</Text>
                </View>
              </View>
              <Text style={[styles.subtitle, styles.centered]}>
                These details are linked to {candidates.length} accounts — pick the one to open.
              </Text>

              {candidates.map((c, idx) => {
                const m = typeMeta(c.userType);
                const isBusy = choosing === String(c.accountId);
                return (
                  <TouchableOpacity key={`${c.userType}-${c.accountId}`}
                    style={[styles.accountCard, idx === 0 && { marginTop: 6 }, isBusy && { borderColor: m.tint }]}
                    activeOpacity={0.85} disabled={choosing != null}
                    onPress={() => attempt(c.userType, c.accountId)}>
                    <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accountBadge}>
                      <Ionicons name={m.icon} size={20} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.accountNameRow}>
                        <Text style={styles.accountName} numberOfLines={1}>{c.name || c.label || `${m.label} account`}</Text>
                        <View style={[styles.accountTypePill, { backgroundColor: m.tint + '16' }]}>
                          <Text style={[styles.accountTypeText, { color: m.tint }]}>{m.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.accountDesc} numberOfLines={1}>{m.desc}</Text>
                    </View>
                    <View style={[styles.accountGo, { backgroundColor: m.tint + '14' }]}>
                      {isBusy
                        ? <ActivityIndicator size="small" color={m.tint} />
                        : <Ionicons name="arrow-forward" size={15} color={m.tint} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {!!error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => { setCandidates(null); setError(''); }}>
                <Text style={styles.link}>Not you? Use different details</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                One sign-in for parents and students — use your phone, email or username.
              </Text>

              <Text style={styles.fieldLabel}>PHONE, EMAIL OR USERNAME</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="e.g. 0712 345 678"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity hitSlop={8} onPress={() => setShowPw((v) => !v)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {!!error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity activeOpacity={0.85} disabled={busy} onPress={() => attempt()}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.signInBtn, busy && { opacity: 0.7 }]}>
                  {busy ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Text style={styles.signInText}>Sign in</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/forgot-password' as any)}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.foot}>ShuleOne · by Educraft</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      flexGrow: 1, justifyContent: 'center',
      paddingHorizontal: 26,
      paddingTop: Platform.OS === 'ios' ? 96 : 84,
      paddingBottom: 48,
    },

    brand: { alignItems: 'center', marginBottom: 30 },
    logoSquircle: {
      width: 58, height: 58, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    brandName: { fontSize: 20, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4, marginTop: 12 },

    title: { fontSize: 24, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.6 },
    subtitle: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 6, lineHeight: 19, marginBottom: 22 },

    fieldLabel: { fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.9, marginBottom: 6 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 9,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14,
      backgroundColor: c.card, paddingHorizontal: 13, height: 50, marginBottom: 14,
    },
    input: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: c.text, paddingVertical: 0 },

    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    errorText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.danger },

    signInBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 14, paddingVertical: 14, marginTop: 6,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
    },
    signInText: { color: '#FFF', fontSize: 15, fontFamily: fonts.extrabold },
    link: { textAlign: 'center', fontSize: 12.5, fontFamily: fonts.bold, color: c.primary, marginTop: 16 },

    // Step 2 — account picker
    centered: { textAlign: 'center' },
    stepDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 20 },
    stepDot: { width: 7, height: 7, borderRadius: 4 },
    stepDotWide: { width: 22 },
    identRow: { alignItems: 'center', marginTop: 10, marginBottom: 8 },
    identPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
    },
    identPillText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.text },
    accountCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 15, paddingVertical: 17, marginBottom: 12,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    accountBadge: {
      width: 50, height: 50, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
    },
    accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    accountName: { flexShrink: 1, fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    accountTypePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5 },
    accountTypeText: { fontSize: 10, fontFamily: fonts.extrabold, letterSpacing: 0.3 },
    accountDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 3 },
    accountGo: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
    },

    foot: { textAlign: 'center', color: c.textTertiary, fontSize: 11, fontFamily: fonts.medium, marginTop: 30 },
  });
}
