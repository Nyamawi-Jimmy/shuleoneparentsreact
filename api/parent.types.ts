// =================================================================
// Parent + children types - mirrors backend DTOs.
// =================================================================

// =================================================================
// ChildRef (GET /api/parent/children item)
// =================================================================
export interface ChildRef {
  studentId: number | null;
  admNo: string | null;
  name: string | null;
  currentForm: number | null;
  stream: number | null;
  className: string | null;
  streamName: string | null;
  active: boolean | null;
  schoolId: number | null;
  schoolName: string | null;
  codingSchool: boolean | null;
  codingOnly: boolean | null;
}

export interface Child {
  studentId: number;
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  photoUrl?: string;
  admNo: string;
  className: string;
  streamName: string;
  classLabel: string;
  schoolName: string;
  active: boolean;
  codingSchool: boolean;
  codingOnly: boolean;
  initials: string;
}

export function normalizeChild(raw: ChildRef): Child | null {
  if (raw.studentId == null) return null;
  const fullName = (raw.name ?? '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  const className = raw.className ?? '';
  const streamName = raw.streamName ?? '';
  const classLabel = [className, streamName].filter(Boolean).join(' • ');
  return {
    studentId: raw.studentId,
    id: raw.studentId,
    firstName,
    lastName,
    fullName,
    admNo: raw.admNo ?? '',
    className,
    streamName,
    classLabel,
    schoolName: raw.schoolName ?? '',
    active: raw.active ?? true,
    codingSchool: raw.codingSchool ?? false,
    codingOnly: raw.codingOnly ?? false,
    initials: deriveInitials(fullName),
  };
}

// =================================================================
// ParentRef (GET /api/parent/me response)
// =================================================================
export interface ParentRef {
  id: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
}

/**
 * Normalized Parent shape used throughout the app. Preserves legacy
 * mock fields (firstName, lastName) split from `name` so existing
 * screens reading mockParent.firstName / mockParent.lastName keep working.
 */
export interface Parent {
  id: number;
  name: string;            // full display name from backend
  firstName: string;       // split from name
  lastName: string;        // split from name
  email: string;
  phone: string;
  image: string;           // photo URL
  photoUrl: string;        // alias for `image` (existing screens read photoUrl)
  initials: string;
}

export function normalizeParent(raw: ParentRef): Parent | null {
  if (raw.id == null) return null;
  const name = (raw.name ?? '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return {
    id: raw.id,
    name,
    firstName,
    lastName,
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    image: raw.image ?? '',
    photoUrl: raw.image ?? '',
    initials: deriveInitials(name),
  };
}

// =================================================================
// Request bodies for PUT /api/parent/me and POST /api/parent/me/password
// =================================================================
export interface UpdateProfileRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// =================================================================
// Helpers
// =================================================================
function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}
