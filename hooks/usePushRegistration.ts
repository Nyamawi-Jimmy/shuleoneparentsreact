import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { registerFcmToken } from '../api/notifications';

/**
 * Expo Go (SDK 53+) removed remote push. In Expo Go even *importing*
 * expo-notifications throws at module-evaluation time, which would crash the
 * whole app at load. So we never statically import it — we lazy-require it only
 * outside Expo Go, wrapped in try/catch, and no-op everywhere it's unavailable.
 * Full push delivery needs a dev build with google-services.json (see HANDOVER).
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

const Notifications: typeof NotificationsModule | null = (() => {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications') as typeof NotificationsModule;
  } catch {
    return null;
  }
})();

// Foreground display behaviour (SDK 56 handler shape). Only when available.
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Notifications native module unavailable in this runtime — non-fatal.
  }
}

/**
 * Registers this device's native push token with the backend for the logged-in
 * PARENT, and routes notification taps to the inbox.
 *
 * Uses getDevicePushTokenAsync() (the FCM registration token on Android), which
 * matches the backend's FCM pipeline. No-ops safely in Expo Go / simulators /
 * when Firebase isn't configured.
 */
export function usePushRegistration() {
  const { accessToken, user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!Notifications) return;
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
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notifications' as any);
    });
    return () => sub.remove();
  }, []);
}
