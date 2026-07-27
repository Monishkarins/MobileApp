import type {ComplianceItem, DashboardSummary} from '../../types/dashboard';

export interface ComplianceTotals {
  valid: number;
  expiring: number;
  expired: number;
}

function expiringCount(item?: ComplianceItem): number {
  if (!item) return 0;
  if (typeof item.expiringSoon === 'number') {
    return Math.max(0, item.expiringSoon);
  }
  return Math.max(0, (item.exp7 ?? 0) + (item.exp15 ?? 0) + (item.exp30 ?? 0));
}

/**
 * Aggregates VAHAN/compliance categories for the dashboard hero summary.
 * Values are clamped at zero so malformed API counters cannot distort the UI.
 */
export function resolveComplianceTotals(summary: DashboardSummary): ComplianceTotals {
  const items = [
    summary.compliance?.fitness,
    summary.compliance?.tax,
    summary.compliance?.insurance,
    summary.compliance?.pucc,
    summary.compliance?.permit,
    summary.compliance?.np,
  ];

  return items.reduce<ComplianceTotals>((totals, item) => {
    if (!item) return totals;
    totals.valid += Math.max(0, item.valid ?? 0);
    totals.expiring += expiringCount(item);
    totals.expired += Math.max(0, item.expired ?? 0);
    return totals;
  }, {valid: 0, expiring: 0, expired: 0});
}
