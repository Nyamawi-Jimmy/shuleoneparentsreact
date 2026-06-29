import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  StatusBar, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallManager } from '../../hooks/useCallManager';
import { ChatRole } from '../../api/chat.types';
import { colors, typography } from '../../constants/theme';

type Mode = 'outgoing' | 'incoming';

export const CallScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    mode?: Mode;
    callId?: string;
    peerId?: string;
    peerRole?: ChatRole;
    peerName?: string;
  }>();
  const insets = useSafeAreaInsets();

  const mode = (params.mode ?? 'outgoing') as Mode;
  const peerIdNum = params.peerId ? Number(params.peerId) : null;
  const peerRole = params.peerRole;
  const peerName = params.peerName ?? 'Caller';

  const callManagerArgs = mode === 'outgoing'
    ? {
        outgoing: peerIdNum && peerRole
          ? { peerId: peerIdNum, peerRole, peerName }
          : undefined,
      }
    : {
        incoming: peerIdNum && peerRole && params.callId
          ? { callId: params.callId, peerId: peerIdNum, peerRole, peerName }
          : undefined,
      };

  const {
    session, error, supported,
    micMuted, speakerOn,
    accept, reject, hangUp, toggleMic, toggleSpeaker,
  } = useCallManager(callManagerArgs);

  // Auto-dismiss after call ends
  useEffect(() => {
    if (session?.state === 'ended') {
      const t = setTimeout(() => router.back(), 1500);
      return () => clearTimeout(t);
    }
  }, [session?.state]);

  // Live call duration
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (session?.state !== 'in_call') return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [session?.state]);

  // Dev-build gate
  if (!supported) {
    return <UnsupportedView onClose={() => router.back()} />;
  }

  const state = session?.state ?? 'idle';
  const initials = peerName.split(/\s+/).slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '').join('');

  const statusLabel = (() => {
    if (error) return error;
    switch (state) {
      case 'idle': return 'Preparing...';
      case 'dialing': return 'Calling...';
      case 'ringing': return 'Incoming voice call';
      case 'connecting': return 'Connecting...';
      case 'in_call': {
        const dur = session?.startedAt
          ? Math.floor((Date.now() - session.startedAt) / 1000)
          : 0;
        return formatDuration(dur);
      }
      case 'ended': return 'Call ended';
      case 'failed': return error ?? 'Call failed';
      default: return '';
    }
  })();

  return (
    <View style={styles.safe}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />
      <LinearGradient
        colors={['#1e0b2b', '#3a0f3a', '#6e1c5a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
        {/* Top status */}
        <View style={[styles.topArea, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.topRole}>
            {(peerRole ?? '').toString().toUpperCase()}
          </Text>
          <Text style={styles.topStatus}>{statusLabel}</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarArea}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials || '?'}</Text>
            </View>
          </View>
          <Text style={styles.peerName} numberOfLines={1}>{peerName}</Text>
          {state === 'connecting' && (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginTop: 12 }} />
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 36 }]}>
          {state === 'ringing' ? (
            <View style={styles.ringingActions}>
              <TouchableOpacity
                onPress={reject}
                activeOpacity={0.85}
                style={[styles.bigBtn, styles.declineBtn]}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.actionLabel}>Decline</Text>
              </View>

              <TouchableOpacity
                onPress={accept}
                activeOpacity={0.85}
                style={[styles.bigBtn, styles.acceptBtn]}
              >
                <Ionicons name="call" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.actionLabel}>Accept</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Mic / Speaker */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleCol}>
                  <TouchableOpacity
                    onPress={toggleMic}
                    activeOpacity={0.85}
                    style={[styles.toggleBtn, micMuted && styles.toggleBtnActive]}
                  >
                    <Ionicons
                      name={micMuted ? 'mic-off' : 'mic'}
                      size={22}
                      color={micMuted ? '#fff' : 'rgba(255,255,255,0.95)'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.toggleLabel}>{micMuted ? 'Muted' : 'Mute'}</Text>
                </View>

                <View style={styles.toggleCol}>
                  <TouchableOpacity
                    onPress={toggleSpeaker}
                    activeOpacity={0.85}
                    style={[styles.toggleBtn, speakerOn && styles.toggleBtnActive]}
                  >
                    <Ionicons
                      name={speakerOn ? 'volume-high' : 'volume-medium'}
                      size={22}
                      color={speakerOn ? '#fff' : 'rgba(255,255,255,0.95)'}
                    />
                  </TouchableOpacity>
                  <Text style={styles.toggleLabel}>Speaker</Text>
                </View>
              </View>

              {/* End call */}
              <TouchableOpacity
                onPress={hangUp}
                activeOpacity={0.85}
                style={[styles.bigBtn, styles.declineBtn]}
              >
                <MaterialCommunityIcons name="phone-hangup" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>End call</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// =================================================================
// Unsupported view (Expo Go - no react-native-webrtc)
// =================================================================
const UnsupportedView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={['#1e0b2b', '#3a0f3a', '#6e1c5a']}
        style={styles.bg}
      >
        <View style={[styles.topArea, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.topRole}>VOICE CALL</Text>
        </View>
        <View style={styles.unsupportedArea}>
          <Ionicons name="construct" size={48} color="rgba(255,255,255,0.85)" />
          <Text style={styles.unsupportedTitle}>Voice calls need a dev build</Text>
          <Text style={styles.unsupportedBody}>
            Voice calls use{' '}
            <Text style={{ fontWeight: '800' }}>react-native-webrtc</Text>{' '}
            which doesn't run inside Expo Go. Build the app with{' '}
            <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }}>
              eas build --profile development
            </Text>{' '}
            to enable calling.
          </Text>
        </View>
        <View style={[styles.controls, { paddingBottom: insets.bottom + 36 }]}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={[styles.bigBtn, styles.declineBtn]}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Close</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// =================================================================
// Helpers
// =================================================================
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =================================================================
// Styles
// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1e0b2b' },
  bg: { flex: 1 },

  topArea: { alignItems: 'center', paddingHorizontal: 24 },
  topRole: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 1.5, fontWeight: '800',
  },
  topStatus: {
    color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600',
    marginTop: 6, textAlign: 'center',
  },

  avatarArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    width: 168, height: 168, borderRadius: 84,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 138, height: 138, borderRadius: 69,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 46, fontWeight: '800', letterSpacing: 1 },
  peerName: {
    color: '#fff', fontSize: 24, fontWeight: '800',
    marginTop: 22, letterSpacing: -0.3,
  },

  controls: { paddingHorizontal: 24, alignItems: 'center', gap: 12 },

  ringingActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 60,
  },

  bigBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  acceptBtn: { backgroundColor: '#15c98c' },
  declineBtn: { backgroundColor: '#ef4444' },

  actionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', marginTop: 8 },

  toggleRow: {
    flexDirection: 'row', gap: 48,
    marginBottom: 32,
  },
  toggleCol: { alignItems: 'center' },
  toggleBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  toggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginTop: 8 },

  unsupportedArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  unsupportedTitle: {
    color: '#fff', fontSize: 20, fontWeight: '800',
    marginTop: 20, textAlign: 'center',
  },
  unsupportedBody: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20,
    marginTop: 12, textAlign: 'center',
  },
});
