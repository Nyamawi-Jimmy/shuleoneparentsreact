// =================================================================
// Notifications + Reminders types.
// =================================================================

export interface ParentNotification {
  id: number | null;
  parentId: number | null;
  studentId: number | null;
  category: string | null;        // FEES / ATTENDANCE / DIARY / ACADEMICS / TRANSPORT / etc.
  title: string | null;
  body: string | null;
  link: string | null;            // deep link
  readAt: string | null;          // ISO date-time, null = unread
  createdAt: string | null;
}

/**
 * Notification preferences. Backend stores as a JSON string (the endpoint
 * accepts and returns `string` per the OpenAPI spec). We parse/serialize
 * a structured shape on the client side.
 */
export interface NotificationPrefs {
  push: Record<string, boolean>;
  sms: Record<string, boolean>;
  email: Record<string, boolean>;
  whatsapp: Record<string, boolean>;
}

export function emptyPrefs(): NotificationPrefs {
  return { push: {}, sms: {}, email: {}, whatsapp: {} };
}

// =================================================================
// Reminders
// =================================================================
export interface SetReminderRequest {
  sourceType: string;             // 'DIARY' / 'LIVE_CLASS' / 'EVENT' / 'FEE_DUE' etc.
  sourceId: string;
  title: string;
  startsAt: string;               // ISO date-time
  leadMinutes?: number;           // minutes before startsAt to fire
}

export interface ParentReminder {
  id: number | null;
  parentId: number | null;
  studentId: number | null;
  sourceType: string | null;
  sourceId: string | null;
  title: string | null;
  startsAt: string | null;
  leadMinutes: number | null;
  notifyAt: string | null;
  firedAt: string | null;
  createdAt: string | null;
}
