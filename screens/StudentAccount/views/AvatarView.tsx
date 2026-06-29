import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockProfile } from '../mockData';
import { useAuth } from '../../../context/AuthContext';

export const AvatarView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { signOut, user } = useAuth();

  const title = pickByTier(tier, {
    base: '🎒 My Profile',
    sprout: '🎒 My Backpack',
    explorer: '🎒 My Backpack',
    campus: '👤 My Profile',
  });
  const badgesTitle = pickByTier(tier, {
    base: 'Achievements',
    sprout: 'My Trophies',
    explorer: 'My Trophies',
    scholar: 'Certificates & badges',
    campus: 'Certificates & badges',
  });

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      "You'll need to log in again to come back.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/chooser' as any);
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Profile hero */}
        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.meTop, { borderRadius: tokens.radius }]}
        >
          <LinearGradient colors={['#3aa0ff', '#ff5e9c']} style={styles.meAv}>
            <Text style={{ fontSize: 48 }}>{mockProfile.avatar}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.meName}>{mockProfile.name}</Text>
            <View style={styles.chips}>
              {mockProfile.chips.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Badges */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{badgesTitle}</Text>
          <View style={styles.secHLine} />
        </View>
        <View style={styles.badges}>
          {mockProfile.badges.map((b, i) => (
            <View key={i} style={[styles.badge, !b.earned && styles.badgeLocked]}>
              <Text style={[styles.badgeIcon, !b.earned && { opacity: 0.4 }]}>{b.icon}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Account section */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>Account</Text>
          <View style={styles.secHLine} />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSignOut}
          style={styles.signOutCard}
        >
          <View style={styles.signOutIcon}>
            <Ionicons name="log-out" size={20} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.signOutTitle}>Sign out</Text>
            <Text style={styles.signOutSub}>
              {user ? `Logged in as ${user.username}` : 'End your learning session'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ef4444" />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  meTop: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    marginBottom: 16,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 5,
  },
  meAv: {
    width: 84, height: 84, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
  },
  meName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 11 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: {
    flexBasis: '30%', flexGrow: 1,
    backgroundColor: '#fff', padding: 14, borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: { fontSize: 32 },
  badgeLabel: {
    fontSize: 10, fontWeight: '700', color: '#6f679c',
    marginTop: 6, textAlign: 'center',
  },

  // Sign out card
  signOutCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 16,
    borderRadius: 16,
    borderWidth: 1.5, borderColor: '#fee2e2',
    gap: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  signOutIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  signOutTitle: { fontSize: 14, fontWeight: '800', color: '#ef4444' },
  signOutSub: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },
});
