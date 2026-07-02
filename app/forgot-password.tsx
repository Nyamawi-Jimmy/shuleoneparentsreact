import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { requestPasswordReset, resetPassword } from '../api/auth';
import { ApiError } from '../config/api';

type Step = 'request' | 'confirm' | 'done';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ identifier?: string }>();
  const [identifier, setIdentifier] = useState(params.identifier ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>('request');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submitRequest = async () => {
    if (!identifier.trim()) {
      Alert.alert('Missing info', 'Enter the phone number or email on your account.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset(identifier.trim());
      setInfo(res.message ?? 'If an account matches, we sent a 6-digit reset code.');
      setStep('confirm');
    } catch (e) {
      Alert.alert('Could not send code', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!code.trim() || newPassword.length < 6) {
      Alert.alert('Check your details', 'Enter the 6-digit code and a new password (min 6 characters).');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(identifier.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (e) {
      Alert.alert('Reset failed', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#2c2550" />
          </TouchableOpacity>

          <LinearGradient colors={['#FB7185', '#E11D48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name={step === 'done' ? 'checkmark-done' : 'lock-open'} size={30} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>Reset password</Text>
            <Text style={styles.heroSub}>
              {step === 'request' && "We'll text or email you a code"}
              {step === 'confirm' && 'Enter the code we sent'}
              {step === 'done' && "You're all set"}
            </Text>
          </LinearGradient>

          <View style={styles.form}>
            {step === 'request' && (
              <>
                <Text style={styles.label}>Phone or Email</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#9b94c4" />
                  <TextInput
                    style={styles.input}
                    placeholder="+254 7XX XXX XXX"
                    placeholderTextColor="#b9b2d8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={identifier}
                    onChangeText={setIdentifier}
                    editable={!loading}
                  />
                </View>
                <PrimaryButton label="Send reset code" loading={loading} onPress={submitRequest} />
              </>
            )}

            {step === 'confirm' && (
              <>
                {info ? <Text style={styles.info}>{info}</Text> : null}
                <Text style={styles.label}>6-digit code</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="keypad-outline" size={18} color="#9b94c4" />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#b9b2d8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                    editable={!loading}
                  />
                </View>

                <Text style={styles.label}>New password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9b94c4" />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#b9b2d8"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9b94c4" />
                  </TouchableOpacity>
                </View>

                <PrimaryButton label="Set new password" loading={loading} onPress={submitReset} />
                <TouchableOpacity style={styles.linkBtn} hitSlop={6} onPress={submitRequest} disabled={loading}>
                  <Text style={styles.linkText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'done' && (
              <>
                <Text style={styles.info}>Your password has been changed. You can now sign in with your new password.</Text>
                <PrimaryButton label="Back to sign in" loading={false} onPress={() => router.replace('/parent-login' as any)} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PrimaryButton: React.FC<{ label: string; loading: boolean; onPress: () => void }> = ({ label, loading, onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={loading} style={{ marginTop: 8 }}>
    <LinearGradient colors={loading ? ['#fda4af', '#fb7185'] : ['#FB7185', '#E11D48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.signInBtn}>
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signInText}>{label}</Text>}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  scroll: { paddingBottom: 30 },
  backBtn: {
    position: 'absolute', top: 14, left: 14, zIndex: 2,
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  hero: {
    paddingTop: 70, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: '#E11D48', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { color: '#FFF', fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: '500', marginTop: 4 },
  form: { paddingHorizontal: 24, paddingTop: 28 },
  info: { fontSize: 13, color: '#6f679c', fontWeight: '500', lineHeight: 19, marginBottom: 18 },
  label: { fontSize: 12, color: '#6f679c', fontWeight: '700', marginBottom: 6, marginTop: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#F1F1F4', paddingHorizontal: 14, height: 50, marginBottom: 14, gap: 10,
  },
  input: { flex: 1, fontSize: 14.5, color: '#2c2550', fontWeight: '500', height: '100%' },
  signInBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#E11D48', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  signInText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  linkBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 6 },
  linkText: { color: '#E11D48', fontSize: 13, fontWeight: '700' },
});
