import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../config/api';

export default function ParentLoginScreen() {
  const { signInParent } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing info', 'Please enter both your phone/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await signInParent(identifier.trim(), password);
      // Sanity check: backend may return a STUDENT user if the API is misconfigured
      if (user.userType !== 'PARENT') {
        Alert.alert('Wrong account', 'This account is not a parent account.');
        return;
      }
      router.replace('/choose-child' as any);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.status === 401
            ? 'Incorrect phone/email or password.'
            : e.message
          : 'Something went wrong. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    Alert.alert(
      'Google Sign-In',
      'Google authentication will be wired via expo-auth-session next.',
      [{ text: 'OK' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color="#2c2550" />
          </TouchableOpacity>

          <LinearGradient
            colors={['#FB7185', '#E11D48']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="people" size={32} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>Parent App</Text>
            <Text style={styles.heroSub}>Welcome back to ShuleOne</Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.subheading}>
              Enter your details to access your dashboard
            </Text>

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

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#9b94c4" />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#b9b2d8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9b94c4"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              hitSlop={6}
              onPress={() =>
                router.push({
                  pathname: '/forgot-password',
                  params: { identifier: identifier.trim() },
                } as any)
              }
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={loading ? ['#fda4af', '#fb7185'] : ['#FB7185', '#E11D48']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signInBtn}
              >
                <Text style={styles.signInText}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGoogle}
              style={styles.googleBtn}
              disabled={loading}
            >
              <FontAwesome name="google" size={18} color="#EA4335" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity hitSlop={6}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>
            By signing in, you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text> and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles unchanged from the previous version
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  scroll: { paddingBottom: 30 },
  backBtn: {
    position: 'absolute', top: 14, left: 14, zIndex: 2,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  hero: {
    paddingTop: 70, paddingBottom: 40, paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: '#E11D48', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: '500', marginTop: 4 },
  form: { paddingHorizontal: 24, paddingTop: 28 },
  heading: { fontSize: 22, fontWeight: '800', color: '#2c2550', letterSpacing: -0.3 },
  subheading: { fontSize: 13.5, color: '#6f679c', marginTop: 4, marginBottom: 20, fontWeight: '500' },
  label: { fontSize: 12, color: '#6f679c', fontWeight: '700', marginBottom: 6, marginTop: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#F1F1F4',
    paddingHorizontal: 14, height: 50, marginBottom: 14, gap: 10,
  },
  input: { flex: 1, fontSize: 14.5, color: '#2c2550', fontWeight: '500', height: '100%' },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 18 },
  forgotText: { color: '#E11D48', fontSize: 12.5, fontWeight: '700' },
  signInBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#E11D48', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  signInText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F1F1F4' },
  dividerText: { fontSize: 11.5, color: '#9b94c4', fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#F1F1F4', height: 50, gap: 10,
  },
  googleText: { fontSize: 14, color: '#2c2550', fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { fontSize: 13, color: '#6f679c', fontWeight: '500' },
  signupLink: { fontSize: 13, color: '#E11D48', fontWeight: '800' },
  footer: {
    fontSize: 11, color: '#9b94c4', textAlign: 'center',
    fontWeight: '500', marginTop: 24, paddingHorizontal: 40, lineHeight: 17,
  },
  footerLink: { color: '#E11D48', fontWeight: '700' },
});
