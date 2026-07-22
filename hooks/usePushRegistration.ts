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

/**
 * Firebase Messaging, guarded exactly like expo-notifications above: it is a
 * native module, absent in Expo Go, and importing it there throws at module
 * evaluation. Used on iOS only — see the token comment in the hook below.
 */
const firebaseMessaging: (() => any) | null = (() => {
  if (isExpoGo) return null;
  try {
    return require('@react-native-firebase/messaging').default;
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
 * Registers this device's push token with the backend for the logged-in PARENT,
 * and routes notification taps to the inbox.
 *
 * <h3>Why the token differs by platform</h3>
 * The backend sends every push through Firebase Admin, which only accepts FCM
 * registration tokens — and the shared `fcm_token` table has no platform column
 * to tell them apart.
 *
 * On Android, {@code getDevicePushTokenAsync()} already returns an FCM token, so
 * that path is unchanged. On iOS it returns an **APNs** token, which Firebase
 * rejects: registering one would look like success here and then fail silently
 * on every send. So on iOS we ask Firebase Messaging for the real FCM token
 * instead — it registers with APNs under the hood and hands back the FCM
 * identifier the backend can actually use.
 *
 * No-ops safely in Expo Go, on simulators (which cannot receive remote push at
 * all), and when Firebase is not configured.
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

        // The backend only speaks FCM. On Android getDevicePushTokenAsync()
        // already returns an FCM token; on iOS it returns an APNs token, which
        // Firebase rejects — so ask Firebase Messaging for the FCM token that
        // APNs registration maps to. Falling back to the APNs token would
        // register successfully here and then fail on every send.
        let token: string | null = null;
        if (Platform.OS === 'ios') {
          if (!firebaseMessaging) return;   // no Firebase → no usable iOS token
          const messaging = firebaseMessaging();
          if (messaging.registerDeviceForRemoteMessages) {
            await messaging.registerDeviceForRemoteMessages();
          }
          token = await messaging.getToken();
        } else {
          const { data } = await Notifications.getDevicePushTokenAsync();
          token = typeof data === 'string' ? data : JSON.stringify(data);
        }
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
