import { apiFetch } from '../config/api';
import {
  InviteBody, SignalBody, InviteResponse, TurnConfig, WsInfo,
} from './call.types';

/** POST /api/parent/call/invite → string (JSON-encoded callId + status) */
export async function inviteCall(accessToken: string, body: InviteBody): Promise<InviteResponse> {
  const raw = await apiFetch<string>('/api/parent/call/invite', {
    method: 'POST',
    accessToken,
    body,
    headers: { 'Content-Type': 'application/json' },
  });
  return safeJson<InviteResponse>(raw) ?? { callId: String(raw) };
}

/** POST /api/parent/call/{callId}/accept */
export function acceptCall(accessToken: string, callId: string) {
  return apiFetch<string>(`/api/parent/call/${encodeURIComponent(callId)}/accept`, {
    method: 'POST',
    accessToken,
  });
}

/** POST /api/parent/call/{callId}/reject */
export function rejectCall(accessToken: string, callId: string) {
  return apiFetch<string>(`/api/parent/call/${encodeURIComponent(callId)}/reject`, {
    method: 'POST',
    accessToken,
  });
}

/** POST /api/parent/call/{callId}/end */
export function endCall(accessToken: string, callId: string) {
  return apiFetch<string>(`/api/parent/call/${encodeURIComponent(callId)}/end`, {
    method: 'POST',
    accessToken,
  });
}

/** POST /api/parent/call/{callId}/signal */
export function signalCall(accessToken: string, callId: string, body: SignalBody) {
  return apiFetch<string>(`/api/parent/call/${encodeURIComponent(callId)}/signal`, {
    method: 'POST',
    accessToken,
    body,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/parent/call/turn → string (JSON config) */
export async function getTurnConfig(accessToken: string): Promise<TurnConfig> {
  const raw = await apiFetch<string>('/api/parent/call/turn', { accessToken });
  const parsed = safeJson<TurnConfig>(raw);
  if (parsed && parsed.iceServers) return parsed;
  // Fallback to public STUN if backend didn't return a config
  return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
}

/** GET /api/parent/call/ws-info → string (JSON with WS URL + topic prefixes) */
export async function getWsInfo(accessToken: string): Promise<WsInfo> {
  const raw = await apiFetch<string>('/api/parent/call/ws-info', { accessToken });
  const parsed = safeJson<WsInfo>(raw);
  return parsed ?? { url: String(raw ?? '') };
}

// =================================================================
// Helpers
// =================================================================
function safeJson<T>(raw: any): T | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
