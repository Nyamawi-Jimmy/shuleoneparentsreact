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

/** Hard cap, mirroring the server and the web client. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_LABEL = '50 MB';

/**
 * POST /api/parent/chat/upload
 *
 * Multipart upload. The OpenAPI declares `file` as query+binary which
 * is a Spring quirk - the actual implementation uses multipart form-data
 * with `file` as the part name. Returns server-stored URL info.
 *
 * In React Native, pass `{ uri, name, type }` produced by expo-image-picker
 * or expo-document-picker.
 *
 * Uses XMLHttpRequest rather than fetch because fetch cannot observe upload
 * progress - the same reason the web client does it this way. A parent on a
 * phone connection sending a photo needs to see that something is happening.
 * `onProgress` receives 0..100.
 */
export function uploadChatAttachment(
  accessToken: string,
  file: { uri: string; name: string; type: string; size?: number },
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  // Refuse oversized files up front instead of uploading for a minute and
  // failing at the far end with a 413.
  if (file.size != null && file.size > MAX_FILE_BYTES) {
    return Promise.reject(
      new Error(`That file is larger than ${MAX_FILE_LABEL}.`),
    );
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/parent/chat/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    // DO NOT set Content-Type; the boundary has to come from FormData.

    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (!onProgress || !e.lengthComputable || !e.total) return;
        // Hold at 99 until the server actually answers.
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      };
    }

    xhr.onload = () => {
      let data: any = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* non-JSON */ }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        // Backend response shape varies; normalize common keys
        resolve({
          url: data?.url ?? data?.location ?? data?.path ?? '',
          name: data?.name ?? data?.fileName ?? file.name,
          size: data?.size ?? data?.length ?? file.size ?? 0,
          type: data?.type ?? data?.contentType ?? file.type,
        });
      } else {
        // Prefer the server's own wording - on 413 it explains the cap.
        reject(new Error(
          data?.error || data?.message || `Upload failed (${xhr.status})`,
        ));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));

    const form = new FormData();
    // RN FormData accepts an object with uri/name/type; do NOT JSON.stringify
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    xhr.send(form);
  });
}
