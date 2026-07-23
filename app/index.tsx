// The app's entry route ("/"). It exists to OWN the "/" path so it can't fall
// through to a tab group's index.
//
// Without this file, "/" resolved to a group index — and both (tabs)/index and
// (student-tabs)/index claim "/", so expo-router picked (student-tabs)/index
// (the student "Me" screen). That opened the app straight into the student tabs
// regardless of login state; the anchor then let Back reveal onboarding. This
// gatekeeper decides where "/" goes based on the real auth state, so a logged-
// out user lands on onboarding/login and a logged-in one on their tabs.

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const ONBOARDING_KEY = 'shuleone:onboarding:completed';

export default function Index() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setOnboarded(v === 'true'))
      .catch(() => setOnboarded(false));
  }, []);

  // Hold on a splash until BOTH the auth rehydration and the onboarding flag are
  // known — deciding early would flash the wrong screen.
  if (loading || onboarded === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  const type = String(user?.userType || '').toUpperCase();
  if (type === 'PARENT') return <Redirect href={'/(tabs)' as any} />;
  if (type === 'STUDENT' || type === 'LEARNER') return <Redirect href={'/(student-tabs)' as any} />;

  // Logged out → onboarding the first time, straight to login after that.
  return <Redirect href={(onboarded ? '/login' : '/onboarding') as any} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
});
