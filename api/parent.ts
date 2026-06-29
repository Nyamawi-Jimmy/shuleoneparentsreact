import { apiFetch } from '../config/api';
import {
  ChildRef, Child, normalizeChild,
  ParentRef, Parent, normalizeParent,
  UpdateProfileRequest, ChangePasswordRequest,
} from './parent.types';

// =================================================================
// Children
// =================================================================
export function listChildrenRaw(accessToken: string) {
  return apiFetch<ChildRef[]>('/api/parent/children', { accessToken });
}

export async function listChildrenNormalized(accessToken: string): Promise<Child[]> {
  const raw = await listChildrenRaw(accessToken);
  return raw.map(normalizeChild).filter((c): c is Child => c !== null);
}

// =================================================================
// Parent profile
// =================================================================
export function getParentMeRaw(accessToken: string) {
  return apiFetch<ParentRef>('/api/parent/me', { accessToken });
}

export async function getParentMe(accessToken: string): Promise<Parent | null> {
  const raw = await getParentMeRaw(accessToken);
  return normalizeParent(raw);
}

export function updateParentMeRaw(accessToken: string, body: UpdateProfileRequest) {
  return apiFetch<ParentRef>('/api/parent/me', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateParentMe(accessToken: string, body: UpdateProfileRequest): Promise<Parent | null> {
  const raw = await updateParentMeRaw(accessToken, body);
  return normalizeParent(raw);
}

// =================================================================
// POST /api/parent/me/password
// =================================================================
export function changeParentPassword(accessToken: string, body: ChangePasswordRequest) {
  return apiFetch<void>('/api/parent/me/password', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// =================================================================
// POST /api/parent/me/photo
// Per spec the file is passed via `file` query parameter. We expect
// the caller to provide a publicly fetchable URL (e.g. uploaded to
// DigitalOcean Spaces first). For native file uploads, switch this
// to a multipart/form-data implementation.
// =================================================================
export function uploadParentPhoto(accessToken: string, fileUrl: string) {
  const qs = new URLSearchParams({ file: fileUrl }).toString();
  return apiFetch<ParentRef>(`/api/parent/me/photo?${qs}`, {
    method: 'POST',
    accessToken,
  });
}
