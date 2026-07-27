/**
 * SARATHI list deep-link filters — mirrors web driverNavigationUtils.ts so
 * dashboard driver stats open the DL list with the same expiry presets.
 */

export type DriverLicenseFilterKey = 'total' | 'valid' | 'suspended' | 'expiring' | 'expired';

export interface DLListNavParams {
  expiryStatus?: string;
  expiryType?: string;
  licenseNo?: string;
  driverName?: string;
}

export function buildDLListParams(
  filterKey: DriverLicenseFilterKey,
  options?: { licenseNo?: string; driverName?: string },
): DLListNavParams {
  const params: DLListNavParams = { ...options };

  switch (filterKey) {
    case 'valid':
      params.expiryStatus = 'active';
      params.expiryType = 'dlStatus';
      break;
    case 'suspended':
      params.expiryStatus = 'suspended';
      params.expiryType = 'dlStatus';
      break;
    case 'expiring':
      params.expiryStatus = 'expiring';
      params.expiryType = 'allExpiry';
      break;
    case 'expired':
      params.expiryStatus = 'expired';
      params.expiryType = 'allExpiry';
      break;
    default:
      break;
  }

  return params;
}

/** Pick the most relevant SARATHI filter from dashboard driver stats (web parity). */
export function buildDLListParamsFromDashboardStats(stats: {
  suspended?: number;
  expired: number;
  expiringSoon: number;
}): DLListNavParams {
  if (stats.expired > 0) return buildDLListParams('expired');
  if (stats.expiringSoon > 0) return buildDLListParams('expiring');
  if ((stats.suspended ?? 0) > 0) return buildDLListParams('suspended');
  return buildDLListParams('total');
}
