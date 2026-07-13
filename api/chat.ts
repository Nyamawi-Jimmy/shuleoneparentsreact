import { apiFetch, API_BASE_URL } from '../config/api';
import {
  ChatContact, ChatMessage, ChatRole, SendChatBody, UploadResult,
} from './chat.types';

/** GET /api/parent/chat/contacts */
export function getChatContacts(accessToken: string) {
  return apiFetch<ChatContact[]>('/api/parent/chat/contacts', { accessToken });
}

/** GET /api/parent/chat/history?peerId=&peerRole= */
export function getChatHistory(
  accessToken: string,
  peerId: number,
  peerRole: ChatRole,
) {
  const qs = new URLSearchParams({
    peerId: String(peerId),
    peerRole,
  }).toString();
  return apiFetch<ChatMessage[]>(
    `/api/parent/chat/history?${qs}`,
    { accessToken },
  );
}

/** POST /api/parent/chat/send */
export function sendChatMessage(accessToken: string, body: SendChatBody) {
  return apiFetch<ChatMessage>('/api/parent/chat/send', {
    method: 'POST',
    accessToken,
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** POST /api/parent/chat/mark-read?peerId=&peerRole= */
export function markChatRead(
  accessToken: string,
  peerId: number,
  peerRole: ChatRole,
) {
  const qs = new URLSearchParams({
    peerId: String(peerId),
    peerRole,
  }).toString();
  return apiFetch<void>(`/api/parent/chat/mark-read?${qs}`, {
    method: 'POST',
    accessToken,
  });
}

/**
 * POST /api/parent/chat/upload
 *
 * Multipart upload. The OpenAPI declares `file` as query+binary which
 * is a Spring quirk - the actual implementation uses multipart form-data
 * with `file` as the part name. Returns server-stored URL info.
 *
 * In React Native, pass `{ uri, name, type }` produced by expo-image-picker
 * or expo-document-picker.
 */
export async function uploadChatAttachment(
  accessToken: string,
  file: { uri: string; name: string; type: string },
): Promise<UploadResult> {
  const form = new FormData();
  // RN FormData accepts an object with uri/name/type; do NOT JSON.stringify
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
    // @ts-ignore - RN-specific FormData blob shape
  } as any);

  const res = await fetch(`${API_BASE_URL}/api/parent/chat/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // DO NOT set Content-Type; fetch will set it with the multipart boundary.
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  // Backend response shape varies; normalize common keys
  return {
    url: data.url ?? data.location ?? data.path ?? '',
    name: data.name ?? data.fileName ?? file.name,
    size: data.size ?? data.length ?? 0,
    type: data.type ?? data.contentType ?? file.type,
  };
}
