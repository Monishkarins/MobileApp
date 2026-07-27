/**
 * Tag inventory status colours — allocated is healthy (green), closed is terminal (red).
 */

import dayjs from 'dayjs';

export function tagStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');

  // Closed / allocated-closed tags are no longer active on the network.
  if (normalized.includes('close') || normalized === 'closed') return 'danger';

  // Allocated (without closed) is an active assignment state.
  if (normalized.includes('allocated')) return 'success';

  if (normalized.includes('hot') || normalized.includes('black')) return 'danger';
  if (normalized.includes('unassign')) return 'warning';
  if (normalized.includes('assign')) return 'success';
  if (normalized.includes('low') || normalized.includes('pend')) return 'warning';

  return 'neutral';
}

export function tagStatusDisplay(status: string): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').toUpperCase();
}

/** Tag manufacture / allocation year — derived from allocated date when no API year exists. */
export function tagYearLabel(allocatedDate?: string | null): string {
  if (!allocatedDate) return '—';
  const year = dayjs(allocatedDate).year();
  return Number.isFinite(year) && year > 1970 ? String(year) : '—';
}
