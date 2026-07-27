/**
 * yapStatus display helpers — maps backend vehicle status codes to user-facing
 * labels and pill colours consistent with the web vehicle list semantics.
 */

export type VehicleStatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface VehicleStatusDisplay {
  label: string;
  tone: VehicleStatusTone;
  isActive: boolean;
}

const ON_STATUSES = new Set(['ALLOCATED', 'NETC_NOTEXCEPTION']);

/** Web Status column: switch ON only for allocated / not-exception vehicles. */
export function isVehicleStatusOn(yapStatus?: string | null): boolean {
  return ON_STATUSES.has(normalizeYapStatus(yapStatus));
}

export function normalizeYapStatus(yapStatus?: string | null): string {
  return (yapStatus ?? '').trim().toUpperCase().replace(/\s+/g, '_');
}

export function resolveVehicleStatusDisplay(yapStatus?: string | null): VehicleStatusDisplay {
  const status = normalizeYapStatus(yapStatus);

  if (!status) {
    return { label: 'Unknown', tone: 'neutral', isActive: false };
  }

  if (ON_STATUSES.has(status)) {
    return { label: 'Active', tone: 'success', isActive: true };
  }

  if (status === 'NETC_LOWBALANCE' || status === 'NETC_FORCED_LOWBALANCE') {
    return { label: 'Low Balance', tone: 'warning', isActive: false };
  }

  if (status === 'NETC_HOTLIST' || status === 'NETC_FORCED_HOTLIST') {
    return { label: status === 'NETC_FORCED_HOTLIST' ? 'Forced Hot List' : 'Hot List', tone: 'danger', isActive: false };
  }

  if (status === 'NETC_BLACKLIST') {
    return { label: 'Black List', tone: 'danger', isActive: false };
  }

  if (
    status === 'NETC_CLOSED_OR_REPLACED'
    || status === 'NETC_FORCED_CLOSED'
  ) {
    return { label: 'Closed', tone: 'neutral', isActive: false };
  }

  return { label: status.replace(/_/g, ' '), tone: 'info', isActive: false };
}
