// =================================================================
// Display formatters. Defensive against undefined/null.
// =================================================================

export const formatKsh = (amount: number | null | undefined): string => {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `KSh ${n.toLocaleString('en-KE')}`;
};

export const formatNumber = (n: number | null | undefined): string => {
  const safe = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('en-KE');
};

export const formatPercent = (n: number | null | undefined): string => {
  const safe = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `${safe}%`;
};

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
};

// =================================================================
// Grade badge colour. Returns an object with bg, text, and color
// for badges in academic reports.
// =================================================================
export interface GradeColors {
  bg: string;
  text: string;
  color: string;
}

export const gradeBadgeColor = (grade: string | null | undefined): GradeColors => {
  const letter = (grade ?? '').toString().trim().toUpperCase()[0] ?? '';
  switch (letter) {
    case 'A': return { bg: '#dcfce7', text: '#15803d', color: '#15c98c' };
    case 'B': return { bg: '#dbeafe', text: '#1e40af', color: '#3aa0ff' };
    case 'C': return { bg: '#fef3c7', text: '#92400e', color: '#f4a716' };
    case 'D': return { bg: '#fed7aa', text: '#9a3412', color: '#fb923c' };
    case 'E':
    case 'F': return { bg: '#fee2e2', text: '#991b1b', color: '#ef4444' };
    default:  return { bg: '#f1f5f9', text: '#475569', color: '#94a3b8' };
  }
};
