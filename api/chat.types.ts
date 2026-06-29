// =================================================================
// Chat types - mirrors ChatContactDTO, ChatMessageDTO, SendChatBody.
// =================================================================

export type ChatRole = 'TEACHER' | 'ADMIN' | 'PARENT' | 'STUDENT' | string;

export interface ChatContact {
  id: number | null;              // peerId
  role: ChatRole | null;          // peerRole
  name: string | null;
  avatar: string | null;
  subtitle: string | null;        // e.g. "Math teacher" / "Class teacher Grade 5"
  classLabel: string | null;
  childNames: string[] | null;    // Grade 5: "James", "Mary"
  lastMessage: string | null;
  lastMessageWasMe: boolean | null;
  lastMessageTime: string | null;
  unreadCount: number | null;
  isOnline: boolean | null;
  lastSeen: string | null;
}

export type ChatMessageStatus =
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'SENDING'
  | string;

export interface ChatMessage {
  id: number | null;
  from: 'me' | 'peer' | string | null;  // who sent it
  text: string | null;
  time: string | null;                  // ISO timestamp
  status: ChatMessageStatus | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;        // mime type
}

export interface SendChatBody {
  peerId: number;
  peerRole: ChatRole;
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentType?: string | null;
}

export interface UploadResult {
  url: string;                          // Server-stored URL of the file
  name: string;
  size: number;
  type: string;
}
