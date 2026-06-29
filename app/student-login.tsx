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

export default function StudentLoginScreen() {
  const { signInStudent } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Oops!', 'Please type your username and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await signInStudent(identifier.trim(), password);
      if (user.userType !== 'STUDENT') {
        Alert.alert('Wrong account', 'This account is not a student account.');
        return;
      }
      router.replace('/(student-tabs)' as any);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.status === 401
            ? 'Wrong username or password.'
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#2c2550" />
          </TouchableOpacity>

          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={[styles.sparkle, styles.sparkle1]}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
            <Text style={[styles.sparkle, styles.sparkle3]}>🌟</Text>

            <View style={styles.heroIcon}>
              <Ionicons name="school" size={32} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>Student App</Text>
            <Text style={styles.heroSub}>Let's learn something amazing! 🚀</Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.heading}>Hi there! 👋</Text>
            <Text style={styles.subheading}>Log in to start your learning adventure</Text>

            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="happy-outline" size={18} color="#9b94c4" />
              <TextInput
                style={styles.input}
                placeholder="Your username"
                placeholderTextColor="#b9b2d8"
                autoCapitalize="none"
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
                placeholder="Enter your password"
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

            <TouchableOpacity style={styles.forgotBtn} hitSlop={6}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={handleLogin} disabled={loading}>
              <LinearGradient
                colors={loading ? ['#c4b5fd', '#a78bfa'] : ['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signInBtn}
              >
                <Text style={styles.signInText}>
                  {loading ? 'Getting ready…' : "Let's go!"}
                </Text>
                {!loading && <Ionicons name="rocket" size={18} color="#FFF" />}
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

            <View style={styles.askParentCard}>
              <View style={styles.askParentIcon}>
                <Ionicons name="information" size={14} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.askParentTitle}>New here?</Text>
                <Text style={styles.askParentSub}>
                  Ask your parent or teacher to help set up your account.
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.footer}>
            By signing in you agree to our <Text style={styles.footerLink}>Kid-Safe Terms</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    overflow: 'hidden',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.95)', fontSize: 13.5, fontWeight: '600', marginTop: 4 },
  sparkle: { position: 'absolute', fontSize: 16 },
  sparkle1: { top: 50, left: 30, fontSize: 18 },
  sparkle2: { top: 80, right: 40, fontSize: 14 },
  sparkle3: { bottom: 30, left: 50, fontSize: 16 },
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
  forgotText: { color: '#7C3AED', fontSize: 12.5, fontWeight: '700' },
  signInBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 },
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
  askParentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE9FE', borderRadius: 14,
    padding: 12, marginTop: 20, gap: 10,
  },
  askParentIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  askParentTitle: { fontSize: 12.5, fontWeight: '800', color: '#5B21B6' },
  askParentSub: { fontSize: 11, color: '#6f679c', fontWeight: '500', marginTop: 1, lineHeight: 14 },
  footer: {
    fontSize: 11, color: '#9b94c4', textAlign: 'center',
    fontWeight: '500', marginTop: 24, paddingHorizontal: 40, lineHeight: 17,
  },
  footerLink: { color: '#7C3AED', fontWeight: '700' },
});
