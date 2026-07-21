// Password reset — the mobile port of the web LoginPage's 'forgot' → 'reset'
// screens, on the same endpoints:
//   POST /api/auth/password/forgot  { identifier }
//   POST /api/auth/password/reset   { identifier, code, newPassword }
//
// The server sends a 6-DIGIT CODE (email or SMS, chosen by the shape of the
// identifier) — not a link — so there is no deep link to handle. The code is
// kept as a STRING end to end: it is zero-padded, so parsing it to a number
// would silently corrupt codes like "004213".
//
// `identifier` must be carried into the reset call: the code alone is not a
// lookup key, the server resolves the account from the identifier first.
//
// The forgot step deliberately never reveals whether an account exists, so it
// advances to the code screen even on failure — EXCEPT for 429, which the web
// swallows and we surface, since a throttled user is otherwise left waiting for
// a code that was never sent.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { requestPasswordReset, resetPassword } from '../api/auth';
import { ApiError } from '../config/api';

type Step = 'request' | 'reset' | 'done';

// The server allows one request per identifier per 60s; mirror that so the
// resend button can't burn the user's own rate limit.
const RESEND_SECONDS = 60;
const MIN_PASSWORD = 8;   // enforced server-side too

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ identifier?: string }>();

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(params.identifier ?? '');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentMsg, setSentMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown ticker.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cooldown]);

  const isEmail = identifier.includes('@');

  const sendCode = async (resend = false) => {
    const id = identifier.trim();
    if (!id) { setError('Enter your email or phone number.'); return; }
    if (busy || (resend && cooldown > 0)) return;
    setError(''); setBusy(true);
    try {
      const res = await requestPasswordReset(id);
      setSentMsg(res?.message || 'If an account exists, we sent a 6-digit code.');
      setStep('reset');
      setCooldown(RESEND_SECONDS);
    } catch (e: any) {
      // 429 is the one failure worth showing — otherwise the user waits for a
      // code that was never sent. Everything else stays generic by design.
      if (e instanceof ApiError && e.status === 429) {
        setError(e.message || 'Too many requests. Please wait a minute and try again.');
      } else {
        setSentMsg('If an account exists, we sent a 6-digit code.');
        setStep('reset');
        setCooldown(RESEND_SECONDS);
      }
    } finally { setBusy(false); }
  };

  const submitReset = async () => {
    if (busy) return;
    if (code.trim().length !== 6) { setError('Enter the 6-digit code we sent you.'); return; }
    if (pw.length < MIN_PASSWORD) { setError(`Password must be at least ${MIN_PASSWORD} characters.`); return; }
    if (pw !== pw2) { setError('The two passwords do not match.'); return; }
    setError(''); setBusy(true);
    try {
      await resetPassword(identifier.trim(), code.trim(), pw);
      setStep('done');
    } catch (e: any) {
      setError(e?.message || 'That code is invalid or has expired. Request a new one.');
    } finally { setBusy(false); }
  };

  const backToLogin = () =>
    router.replace({ pathname: '/login', params: { identifier: identifier.trim() } } as any);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} hitSlop={8} activeOpacity={0.7}
            onPress={() => (step === 'reset' ? setStep('request') : backToLogin())}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Progress — two real steps, then a success state. */}
          {step !== 'done' && (
            <View style={styles.steps}>
              <View style={[styles.stepBar, { backgroundColor: colors.primary }]} />
              <View style={[styles.stepBar, { backgroundColor: step === 'reset' ? colors.primary : colors.border }]} />
            </View>
          )}

          {step === 'request' && (
            <>
              <View style={styles.iconWrap}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconTile}>
                  <MaterialCommunityIcons name="lock-reset" size={26} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>
                Enter the email or phone number on your account and we’ll send a 6-digit code.
              </Text>

              <Text style={styles.fieldLabel}>EMAIL OR PHONE</Text>
              <View style={styles.inputWrap}>
                <Ionicons name={isEmail ? 'mail-outline' : 'call-outline'} size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="e.g. 0712 345 678"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={isEmail ? 'email-address' : 'default'}
                  autoComplete="username"
                  returnKeyType="send"
                  onSubmitEditing={() => sendCode()}
                />
              </View>

              <ErrorRow styles={styles} colors={colors} error={error} />

              <PrimaryButton styles={styles} colors={colors} busy={busy}
                label="Send reset code" icon="paper-plane" onPress={() => sendCode()} />

              <Text style={styles.note}>
                School accounts for younger students are reset by the school administrator.
              </Text>
            </>
          )}

          {step === 'reset' && (
            <>
              <View style={styles.iconWrap}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconTile}>
                  <MaterialCommunityIcons name="email-check-outline" size={26} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Enter your code</Text>
              {/* The server's own copy — it explains the spam folder etc. */}
              <Text style={styles.subtitle}>{sentMsg}</Text>
              <View style={styles.identRow}>
                <View style={styles.identPill}>
                  <Ionicons name={isEmail ? 'mail' : 'call'} size={12} color={colors.textSecondary} />
                  <Text style={styles.identPillText} numberOfLines={1}>{identifier.trim()}</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>6-DIGIT CODE</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  // Digits only, but kept as a STRING — codes can start with 0.
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  // Lets both platforms autofill the code straight from the SMS.
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                />
              </View>

              <View style={styles.resendRow}>
                <Text style={styles.resendHint}>Didn’t get it?</Text>
                <TouchableOpacity disabled={cooldown > 0 || busy} onPress={() => sendCode(true)} hitSlop={6}>
                  <Text style={[styles.resendLink, (cooldown > 0 || busy) && { color: colors.textTertiary }]}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={pw}
                  onChangeText={setPw}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <TouchableOpacity hitSlop={8} onPress={() => setShowPw((v) => !v)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={pw2}
                  onChangeText={setPw2}
                  placeholder="Repeat it"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={submitReset}
                />
              </View>
              {/* Live match feedback, so it isn't discovered only on submit. */}
              {pw2.length > 0 && (
                <Text style={[styles.matchHint, { color: pw === pw2 ? colors.success : colors.danger }]}>
                  {pw === pw2 ? '✓ Passwords match' : 'Passwords do not match yet'}
                </Text>
              )}

              <ErrorRow styles={styles} colors={colors} error={error} />

              <PrimaryButton styles={styles} colors={colors} busy={busy}
                label="Set new password" icon="checkmark" onPress={submitReset} />

              <TouchableOpacity onPress={() => { setStep('request'); setError(''); }}>
                <Text style={styles.link}>Use a different email or phone</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <View style={styles.doneWrap}>
              <View style={[styles.doneTile, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              </View>
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.subtitle}>
                You can now sign in with your new password.
              </Text>
              <PrimaryButton styles={styles} colors={colors} busy={false}
                label="Back to sign in" icon="arrow-forward" onPress={backToLogin} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const ErrorRow: React.FC<{ styles: any; colors: ColorPalette; error: string }> = ({ styles, colors, error }) =>
  !error ? null : (
    <View style={styles.errorRow} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={14} color={colors.danger} />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

const PrimaryButton: React.FC<{
  styles: any; colors: ColorPalette; busy: boolean; label: string; icon: any; onPress: () => void;
}> = ({ styles, colors, busy, label, icon, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} disabled={busy} onPress={onPress}>
    <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.primaryBtn, busy && { opacity: 0.7 }]}>
      {busy ? <ActivityIndicator color="#FFF" /> : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          <Ionicons name={icon} size={16} color="#FFF" />
        </>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { paddingHorizontal: 26, flexGrow: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },

  steps: { flexDirection: 'row', gap: 6, marginTop: 22 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },

  iconWrap: { alignItems: 'center', marginTop: 26 },
  iconTile: {
    width: 60, height: 60, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },

  title: { fontSize: 22, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.5, textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 8 },

  identRow: { alignItems: 'center', marginTop: 12 },
  identPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.backgroundAlt, borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 6, maxWidth: '90%',
  },
  identPillText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary },

  fieldLabel: { fontSize: 10, fontFamily: fonts.extrabold, color: c.textTertiary, letterSpacing: 0.8, marginTop: 22, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: c.text, paddingVertical: 0 },
  codeInput: { fontSize: 19, fontFamily: fonts.extrabold, letterSpacing: 8, textAlign: 'center' },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  resendHint: { fontSize: 12, fontFamily: fonts.regular, color: c.textTertiary },
  resendLink: { fontSize: 12, fontFamily: fonts.bold, color: c.primary },

  matchHint: { fontSize: 11.5, fontFamily: fonts.semibold, marginTop: 7, marginLeft: 2 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  errorText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.danger },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15, marginTop: 22,
  },
  primaryText: { color: '#FFF', fontSize: 14.5, fontFamily: fonts.bold },

  link: { textAlign: 'center', fontSize: 12.5, fontFamily: fonts.bold, color: c.primary, marginTop: 18 },
  note: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, textAlign: 'center', lineHeight: 17, marginTop: 20 },

  doneWrap: { alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingBottom: 40 },
  doneTile: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
