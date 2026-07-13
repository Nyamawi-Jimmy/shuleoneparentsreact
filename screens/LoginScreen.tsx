// One login for everyone — the same unified /auth/login the web uses.
// Enter phone / email / username + password; the backend works out whether
// it's a parent or a student account. When one identifier matches both, a
// picker appears (CHOOSE_ACCOUNT) and we retry with the chosen account.

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
  const { colors, scheme } = useTheme();
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
    <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="school" size={30} color="#FFF" />
            </View>
            <Text style={styles.brandName}>ShuleOne</Text>
            <Text style={styles.brandSub}>One account for parents and students</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {candidates ? (
              <>
                <Text style={styles.cardTitle}>Which account?</Text>
                <Text style={styles.cardSub}>
                  Those details match more than one account — pick the one to open.
                </Text>
                {candidates.map((c) => {
                  const m = typeMeta(c.userType);
                  const isBusy = choosing === String(c.accountId);
                  return (
                    <TouchableOpacity key={`${c.userType}-${c.accountId}`} style={styles.candidate}
                      activeOpacity={0.8} disabled={choosing != null}
                      onPress={() => attempt(c.userType, c.accountId)}>
                      <View style={[styles.candidateIcon, { backgroundColor: m.tint + '1F' }]}>
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
                  <Text style={styles.backLink}>← Use different details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Sign in</Text>
                <Text style={styles.cardSub}>Phone, email or username — parents and students use the same door.</Text>

                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Phone, email or username"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
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
                  <Text style={styles.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.foot}>by Educraft</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingTop: 70 },

    brand: { alignItems: 'center', marginBottom: 26 },
    logoCircle: {
      width: 64, height: 64, borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center', justifyContent: 'center',
    },
    brandName: { color: '#FFF', fontSize: 24, fontFamily: fonts.extrabold, letterSpacing: -0.5, marginTop: 12 },
    brandSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontFamily: fonts.medium, marginTop: 4 },

    card: {
      borderRadius: 24, padding: 20,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
    },
    cardTitle: { fontSize: 19, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    cardSub: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18, marginBottom: 16 },

    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 9,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14,
      backgroundColor: c.background, paddingHorizontal: 13, height: 50, marginBottom: 11,
    },
    input: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: c.text, paddingVertical: 0 },

    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    errorText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.danger },

    signInBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 14, paddingVertical: 14, marginTop: 4,
    },
    signInText: { color: '#FFF', fontSize: 15, fontFamily: fonts.extrabold },
    forgot: { textAlign: 'center', fontSize: 12.5, fontFamily: fonts.bold, color: c.primary, marginTop: 14 },

    candidate: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: c.border, borderRadius: 14,
      padding: 13, marginBottom: 9,
    },
    candidateIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    candidateLabel: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    candidateSub: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    backLink: { textAlign: 'center', fontSize: 12.5, fontFamily: fonts.bold, color: c.primary, marginTop: 8 },

    foot: { textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: fonts.medium, marginTop: 22 },
  });
}
