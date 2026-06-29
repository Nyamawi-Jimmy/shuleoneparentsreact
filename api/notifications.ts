import { apiFetch } from '../config/api';
import {
  ParentNotification,
  NotificationPrefs,
  ParentReminder,
  SetReminderRequest,
  emptyPrefs,
} from './notifications.types';

// =================================================================
// Notifications
// =================================================================

/** GET /api/parent/notifications */
export function listNotifications(accessToken: string) {
  return apiFetch<ParentNotification[]>(
    '/api/parent/notifications',
    { accessToken },
  );
}

/** GET /api/parent/notifications/unread-count */
export function getUnreadCount(accessToken: string) {
  return apiFetch<{ count: number } | number>(
    '/api/parent/notifications/unread-count',
    { accessToken },
  );
}

/** POST /api/parent/notifications/{id}/read */
export function markNotificationRead(accessToken: string, id: number) {
  return apiFetch<void>(
    `/api/parent/notifications/${id}/read`,
    { method: 'POST', accessToken },
  );
}

/** POST /api/parent/notifications/read-all */
export function markAllRead(accessToken: string) {
  return apiFetch<void>(
    '/api/parent/notifications/read-all',
    { method: 'POST', accessToken },
  );
}

/** GET /api/parent/notifications/prefs (server stores as JSON string). */
export async function getNotificationPrefs(accessToken: string): Promise<NotificationPrefs> {
  const raw = await apiFetch<string>(
    '/api/parent/notifications/prefs',
    { accessToken },
  );
  return parsePrefs(raw);
}

/** PUT /api/parent/notifications/prefs */
export async function setNotificationPrefs(
  accessToken: string,
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> {
  const body = JSON.stringify(prefs);
  const raw = await apiFetch<string>(
    '/api/parent/notifications/prefs',
    {
      method: 'PUT',
      accessToken,
      body,
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return parsePrefs(raw);
}

function parsePrefs(raw: string | NotificationPrefs | null | undefined): NotificationPrefs {
  if (!raw) return emptyPrefs();
  if (typeof raw === 'object') return raw as NotificationPrefs;
  try {
    const parsed = JSON.parse(raw);
    return {
      push: parsed.push ?? {},
      sms: parsed.sms ?? {},
      email: parsed.email ?? {},
      whatsapp: parsed.whatsapp ?? {},
    };
  } catch {
    return emptyPrefs();
  }
}

// =================================================================
// FCM token registration (POST /api/parent/fcm-token)
// =================================================================
export function registerFcmToken(accessToken: string, token: string) {
  return apiFetch<void>(
    '/api/parent/fcm-token',
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ token }),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// =================================================================
// Reminders
// =================================================================

/** GET /api/parent/children/{studentId}/reminders */
export function listChildReminders(accessToken: string, studentId: number) {
  return apiFetch<ParentReminder[]>(
    `/api/parent/children/${studentId}/reminders`,
    { accessToken },
  );
}

/** POST /api/parent/children/{studentId}/reminders */
export function setReminder(
  accessToken: string,
  studentId: number,
  body: SetReminderRequest,
) {
  return apiFetch<ParentReminder>(
    `/api/parent/children/${studentId}/reminders`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/** DELETE /api/parent/reminders/{sourceType}/{sourceId} */
export function cancelReminder(
  accessToken: string,
  sourceType: string,
  sourceId: string,
) {
  return apiFetch<void>(
    `/api/parent/reminders/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`,
    { method: 'DELETE', accessToken },
  );
}
