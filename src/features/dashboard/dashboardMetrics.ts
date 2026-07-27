/**
 * Dashboard metric registry — the SINGLE SOURCE OF TRUTH for every metric the
 * Fleet Dashboard renders.
 *
 * Count formulas mirror karins_fastag_react Fleet Dashboard cards so mobile
 * shows the same numbers as the web portal.
 */

import type { DashboardSummary, WalletStatus } from '../../types/dashboard';
import { formatINR } from '../../utils/format';
import {
  computeHealthScore,
  computeOpenAlerts,
  healthStatusText,
  readTollMetricsForPeriod,
  resolveFySavingsDisplayTotal,
  resolveWalletTotalBalance,
  type HealthScore,
  type RiskLevel,
} from './utils/dashboardSummaryUtils';

export type MetricSection =
  | 'hero'
  | 'wallet'
  | 'toll'
  | 'claims'
  | 'challan'
  | 'compliance'
  | 'savings';

export type MetricFormat = 'currency' | 'currencyCompact' | 'number' | 'score' | 'text';
export type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface MetricTarget {
  tab?: 'Toll' | 'Claims' | 'Vehicles' | 'More';
  screen: string;
}

export interface DashboardMetric {
  key: string;
  section: MetricSection;
  label: string;
  value: number | string;
  format: MetricFormat;
  sub?: string;
  tone?: MetricTone;
  target?: MetricTarget;
}

export type DashboardPeriod = 'today' | 'yesterday' | 'month' | 'fy';

export type FleetLevel = 'OPERATIONAL' | 'NEEDS ATTENTION' | 'ACTION REQUIRED';

export interface FleetIntelligence {
  score: number;
  level: FleetLevel;
  headline: string;
  tone: MetricTone;
  healthLabel: string;
  openAlerts: number;
}

function riskLevelToTone(level: RiskLevel): MetricTone {
  switch (level) {
    case 'healthy':
      return 'success';
    case 'watch':
      return 'warning';
    case 'at-risk':
      return 'danger';
    default:
      return 'default';
  }
}

function buildFleetHeadline(openAlerts: number): string {
  if (openAlerts <= 0) return 'All fleet systems operational';
  return `${openAlerts} open alert${openAlerts === 1 ? '' : 's'} need attention`;
}

/**
 * Hero intelligence block — web health score + open-alerts headline.
 */
export function computeFleetIntelligence(d: DashboardSummary): FleetIntelligence {
  const health: HealthScore = computeHealthScore(d);
  const openAlerts = computeOpenAlerts(d);
  const level = healthStatusText(health.score) as FleetLevel;

  return {
    score: health.score,
    level,
    headline: buildFleetHeadline(openAlerts),
    tone: riskLevelToTone(health.level),
    healthLabel: health.label,
    openAlerts,
  };
}

/**
 * Builds the deduplicated metric list. Each metric key is unique and each
 * business metric appears exactly once, in exactly one section.
 */
export function buildDashboardMetrics(
  d: DashboardSummary,
  period: DashboardPeriod,
): DashboardMetric[] {
  const health = computeHealthScore(d);
  const openAlerts = computeOpenAlerts(d);
  const toll = readTollMetricsForPeriod(d, period);
  const complianceAlerts = d.compliance?.totalAlerts ?? 0;
  const claimsApproved = d.claims?.approved ?? 0;
  const claimsPending = d.claims?.pending ?? 0;
  const challanPending = d.challans?.pendingCount ?? 0;
  const challanAmount = d.challans?.pendingAmount ?? 0;
  const walletTotal = resolveWalletTotalBalance(d.wallet);
  const fySavings = resolveFySavingsDisplayTotal(d);

  const metrics: DashboardMetric[] = [
    {
      key: 'fleetIntelligenceScore',
      section: 'hero',
      label: 'Fleet Health Score',
      value: health.score,
      format: 'score',
      sub: health.label,
      tone: riskLevelToTone(health.level),
    },
    {
      key: 'activeFleet',
      section: 'hero',
      label: 'Active Fleet',
      value: d.fleet?.active ?? 0,
      format: 'number',
      sub: `of ${d.fleet?.total ?? 0} vehicles`,
      tone: 'info',
      target: { tab: 'Vehicles', screen: 'VehicleList' },
    },
    {
      key: 'openAlerts',
      section: 'hero',
      label: 'Action Required',
      value: openAlerts,
      format: 'number',
      sub: 'compliance · challan · driver',
      tone: openAlerts > 0 ? 'danger' : 'success',
    },

    {
      key: 'walletTotal',
      section: 'wallet',
      label: 'Total Wallet Balance',
      value: walletTotal,
      format: 'currency',
      tone:
        d.wallet?.walletStatus === 'HEALTHY'
          ? 'success'
          : d.wallet?.walletStatus === 'LOW'
            ? 'warning'
            : 'danger',
      target: { tab: 'More', screen: 'WalletHome' },
    },
    {
      key: 'walletFastag',
      section: 'wallet',
      label: 'FASTag Wallet',
      value: d.wallet?.fastagBalance ?? 0,
      format: 'currency',
    },
    {
      key: 'walletCorporate',
      section: 'wallet',
      label: 'Corporate Wallet',
      value: d.wallet?.corporateBalance ?? 0,
      format: 'currency',
    },

    {
      key: 'tollSpend',
      section: 'toll',
      label: 'Toll Spend',
      value: toll.amount,
      format: 'currencyCompact',
      sub: `${toll.txnCount} transactions`,
      target: { tab: 'Toll', screen: 'TollList' },
    },

    {
      key: 'claimsApproved',
      section: 'claims',
      label: 'Claims Approved',
      value: claimsApproved,
      format: 'number',
      sub: `${claimsPending} pending`,
      tone: claimsApproved > 0 ? 'success' : 'default',
      target: { tab: 'Claims', screen: 'ClaimsList' },
    },

    {
      key: 'challanPending',
      section: 'challan',
      label: 'Pending Challans',
      value: challanPending,
      format: 'number',
      sub: `${formatINR(challanAmount, true)} pending`,
      tone: challanPending > 0 ? 'danger' : 'default',
      target: { tab: 'More', screen: 'ChallanList' },
    },

    {
      key: 'complianceAlerts',
      section: 'compliance',
      label: 'Compliance Alerts',
      value: complianceAlerts,
      format: 'number',
      sub: 'RC / fitness / insurance / DL',
      tone: complianceAlerts > 0 ? 'danger' : 'success',
      target: { tab: 'More', screen: 'RCList' },
    },

    {
      key: 'fySavings',
      section: 'savings',
      label: 'FY Savings',
      value: fySavings,
      format: 'currencyCompact',
      sub: 'Claims recovered this FY',
      tone: 'success',
    },
  ];

  return metrics;
}

/** Metrics for the KPI grid (hero, wallet, and savings have dedicated cards). */
export function gridMetrics(metrics: DashboardMetric[]): DashboardMetric[] {
  return metrics.filter(
    (m) => m.section !== 'hero' && m.section !== 'wallet' && m.section !== 'savings',
  );
}

/** @deprecated retained for wallet penalty tests — use computeHealthScore instead. */
export function walletPenalty(status: WalletStatus): number {
  switch (status) {
    case 'CRITICAL':
    case 'RECHARGE_REQUIRED':
      return 15;
    case 'LOW':
      return 8;
    default:
      return 0;
  }
}
