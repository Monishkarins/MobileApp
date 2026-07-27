/**
 * Vehicle 360 search helpers — mirrors web FleetDashboard search result styling.
 */

import type { VehicleSearchRecord, VehicleVahanDocStatus } from '../../../types/vehicleSearch';

export interface PillStyle {
  bg: string;
  fg: string;
  label: string;
}

export interface VahanChipStyle {
  fg: string;
  bg: string;
  border: string;
  status: string;
}

export interface RiskStyle {
  bg: string;
  fg: string;
  label: string;
}

export function claimPill(statusGroup: string): PillStyle {
  switch (statusGroup) {
    case 'APPROVED': return { bg: 'rgba(40,167,69,.15)', fg: '#1e7a37', label: 'APPROVED' };
    case 'PENDING': return { bg: 'rgba(0,113,197,.12)', fg: '#005a9e', label: 'PENDING' };
    case 'REJECTED': return { bg: 'rgba(255,43,43,.14)', fg: '#c4273c', label: 'REJECTED' };
    case 'WAITING_FOR_DOC': return { bg: 'rgba(255,193,7,.2)', fg: '#b9860b', label: 'WAITING' };
    default: return { bg: 'rgba(115,136,160,.16)', fg: '#5a6b80', label: 'EXPIRED' };
  }
}

export function challanPill(status?: string): PillStyle {
  const normalized = (status || 'Pending').trim().toLowerCase();

  if (normalized === 'disposed') {
    return { bg: 'rgba(40,167,69,.15)', fg: '#1e7a37', label: 'DISPOSED' };
  }

  if (normalized === 'pending') {
    return { bg: 'rgba(255,193,7,.18)', fg: '#b9860b', label: 'PENDING' };
  }

  return { bg: 'rgba(115,136,160,.16)', fg: '#5a6b80', label: (status || 'UNKNOWN').toUpperCase() };
}

export function vahanChip(status: VehicleVahanDocStatus): VahanChipStyle {
  switch (status) {
    case 'valid':
      return { fg: '#1e7a37', bg: 'rgba(40,167,69,.07)', border: 'rgba(40,167,69,.28)', status: 'VALID' };
    case 'expiring':
      return { fg: '#b9860b', bg: 'rgba(255,193,7,.1)', border: 'rgba(255,193,7,.4)', status: 'EXPIRING' };
    default:
      return { fg: '#c4273c', bg: 'rgba(255,43,43,.07)', border: 'rgba(255,43,43,.28)', status: 'EXPIRED' };
  }
}

/** True when a challan is still unpaid / open — disposed entries must not escalate risk. */
function hasPendingChallan(record: VehicleSearchRecord): boolean {
  return record.challans.some((challan) => {
    const status = (challan.status ?? '').trim().toLowerCase();
    // Missing status is treated as pending (API often omits it for open challans).
    return !status || status === 'pending';
  });
}

/**
 * Vehicle 360 risk — At Risk only for pending challans or VAHAN expiry/expiring;
 * otherwise Healthy (no intermediate Watch band).
 */
export function riskOf(record: VehicleSearchRecord): RiskStyle {
  const statuses = Object.values(record.vahan).map((doc) => doc.status);
  const hasVahanComplianceIssue =
    statuses.includes('expired') || statuses.includes('expiring');

  if (hasVahanComplianceIssue || hasPendingChallan(record)) {
    return { bg: 'rgba(255,43,43,.16)', fg: '#c4273c', label: 'At Risk' };
  }

  return { bg: 'rgba(40,167,69,.16)', fg: '#1e7a37', label: 'Healthy' };
}
