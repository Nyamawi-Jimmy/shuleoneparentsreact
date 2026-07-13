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
    if (k === 'PARENT') return { icon: 'people' as const, label: 'Parent account', tint: colors.primary };
    if (k === 'STUDENT' || k === 'LEARNER') return { icon: 'school' as const, label: 'Student account', tint: '#7C3AED' };
    return { icon: 'person' as const, label: k || 'Account', tint: colors.textSecondary };
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand mark — the only saturated element on the page */}
          <View style={styles.brand}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoSquircle}>
              <MaterialCommunityIcons name="school" size={28} color="#FFF" />
            </LinearGradient>
            <Text style={styles.brandName}>ShuleOne</Text>
          </View>

          {candidates ? (
            <>
              <Text style={styles.title}>Which account?</Text>
              <Text style={styles.subtitle}>
                Those details match more than one account — pick the one to open.
              </Text>
              {candidates.map((c) => {
                const m = typeMeta(c.userType);
                const isBusy = choosing === String(c.accountId);
                return (
                  <TouchableOpacity key={`${c.userType}-${c.accountId}`} style={styles.candidate}
                    activeOpacity={0.8} disabled={choosing != null}
                    onPress={() => attempt(c.userType, c.accountId)}>
                    <View style={[styles.candidateIcon, { backgroundColor: m.tint + '1A' }]}>
                      <Ionicons name={m.icon} size={18} color={m.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.candidateLabel}>{c.name || c.label || m.label}</Text>
                      <Text style={styles.candidateSub}>{m.label}</Text>
                    </View>
                    {isBusy
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => { setCandidates(null); setError(''); }}>
                <Text style={styles.link}>← Use different details</Text>
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
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 48 },

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

    candidate: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14,
      padding: 13, marginBottom: 9,
    },
    candidateIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    candidateLabel: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    candidateSub: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },

    foot: { textAlign: 'center', color: c.textTertiary, fontSize: 11, fontFamily: fonts.medium, marginTop: 30 },
  });
}
