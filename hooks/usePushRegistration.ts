import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { registerFcmToken } from '../api/notifications';

/**
 * Expo Go (SDK 53+) removed remote push. Any notifications API access — even the
 * top-level setNotificationHandler — throws there, which would crash the whole
 * app at module load. Detect Expo Go and no-op; push works in a dev build.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Foreground display behaviour (SDK 56 handler shape). Guarded for Expo Go.
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Registers this device's native push token with the backend for the logged-in
 * PARENT, and routes notification taps to the inbox.
 *
 * Uses getDevicePushTokenAsync() (the FCM registration token on Android), which
 * matches the backend's FCM pipeline. No-ops safely in Expo Go / simulators /
 * when Firebase isn't configured — full delivery needs a dev build with
 * google-services.json (see HANDOVER).
 */
export function usePushRegistration() {
  const { accessToken, user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (isExpoGo) return;
    if (!accessToken || user?.userType !== 'PARENT' || registered.current) return;
    let cancelled = false;

    (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        let status = current.status;
        if (status !== 'granted') {
          status = (await Notifications.requestPermissionsAsync()).status;
        }
        if (status !== 'granted' || cancelled) return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { data } = await Notifications.getDevicePushTokenAsync();
        const token = typeof data === 'string' ? data : JSON.stringify(data);
        if (cancelled || !token) return;

        await registerFcmToken(accessToken, token);
        registered.current = true;
      } catch {
        // Push unavailable in this runtime — non-fatal.
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, user?.userType]);

  useEffect(() => {
    if (isExpoGo) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications' as any);
    });
    return () => sub.remove();
  }, []);
}
