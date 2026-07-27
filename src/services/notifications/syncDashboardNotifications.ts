/**
 * Derives fleet alerts from the dashboard summary (due / finished work) and
 * mirrors them into the local notification inbox — same rules as the web portal.
 */

import type { Announcement, ComplianceSummary, DashboardSummary } from '../../types/dashboard';
import { formatINR } from '../../utils/format';
import { getDriverOpenAlertCount } from '../../features/dashboard/utils/dashboardSummaryUtils';
import { getComplianceExpiringCount } from '../../features/compliance/utils/complianceNavigationUtils';
import type { FleetNotification } from './notificationTypes';
import { syncDerivedNotifications } from './notificationCenter';
import { isCategoryAlertsEnabled } from './notificationPreferences';
import { showDerivedFleetPush } from './localFleetNotificationService';
import { evaluateWalletLowBalance, type WalletAlertScope } from './walletAlertUtils';

const COMPLIANCE_DOC_KEYS: (keyof Omit<ComplianceSummary, 'totalAlerts' | 'totalVehicles'>)[] = [
  'fitness', 'insurance', 'pucc', 'permit', 'tax', 'np',
];

/** Same six docs / labels as the dashboard Vahan Compliance card. */
const COMPLIANCE_DOC_ROWS: {
  key: keyof Omit<ComplianceSummary, 'totalAlerts' | 'totalVehicles'>;
  label: string;
}[] = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'pucc', label: 'PUCC' },
  { key: 'permit', label: 'Permit' },
  { key: 'tax', label: 'Tax' },
  { key: 'np', label: 'NP' },
];

function sumExpiredCompliance(compliance: DashboardSummary['compliance']): number {
  return COMPLIANCE_DOC_KEYS.reduce(
    (sum, key) => sum + (compliance[key]?.expired ?? 0),
    0,
  );
}

/** Expiring = 7/15/30-day buckets (or legacy expiringSoon), same as the Compliance card. */
function sumExpiringCompliance(compliance: DashboardSummary['compliance']): number {
  return COMPLIANCE_DOC_KEYS.reduce((sum, key) => {
    const item = compliance[key];
    const bucketed = getComplianceExpiringCount(item);
    if (bucketed > 0) return sum + bucketed;
    return sum + (item?.expiringSoon ?? 0);
  }, 0);
}

/**
 * One line per VAHAN doc: expired / expiring-30d / valid — matches the
 * Compliance card count columns so the inbox mirrors fleet health at a glance.
 */
function formatComplianceStatusCounts(compliance: DashboardSummary['compliance']): string {
  return COMPLIANCE_DOC_ROWS.map(({ key, label }) => {
    const item = compliance[key];
    const expired = item?.expired ?? 0;
    // Prefer the 30-day bar segment; fall back to bucketed/legacy when API omits exp30.
    const expiring = item?.exp30 ?? item?.expiringSoon ?? getComplianceExpiringCount(item);
    return `${label}: ${expired}/${expiring}`;
  }).join('\n');
}

function normalizeAnnouncements(value: unknown): Announcement[] {
  return Array.isArray(value) ? value : [];
}

/** Build inbox rows for wallet, compliance, challans, drivers, claims, and news. */
export function deriveDashboardNotifications(
  summary: DashboardSummary,
  scope?: WalletAlertScope,
): FleetNotification[] {
  const out: FleetNotification[] = [];
  // Stamp with wall-clock “now” so active alerts land in today’s daily inbox
  // even when the dashboard summary cache still carries yesterday’s generatedAt.
  const now = new Date().toISOString();
  const wallet = summary.wallet;
  const walletAlert = evaluateWalletLowBalance(wallet, scope);
  const walletThreshold = walletAlert.alertThreshold;

  if (walletAlert.isLow && isCategoryAlertsEnabled('low_wallet')) {
    // Multi-line body so Android Inbox style can show each fact on its own row.
    const walletBody = walletAlert.isEmpty
      ? 'FASTag wallet is empty.\nRecharge immediately to avoid toll failures.'
      : [
          `Balance: ${formatINR(walletAlert.totalBalance)}`,
          `Alert limit: ${formatINR(walletThreshold)}`,
          'Recharge to avoid toll failures.',
        ].join('\n');

    out.push({
      id: 'dash-wallet',
      category: 'low_wallet',
      title: walletAlert.isEmpty ? 'FASTag wallet empty' : 'Wallet low',
      body: walletBody,
      detail: walletBody,
      createdAt: now,
      read: false,
    });
  }

  const expiredCompliance = sumExpiredCompliance(summary.compliance);
  const expiringCompliance = sumExpiringCompliance(summary.compliance);
  // Surface VAHAN whenever expired or expiring docs need attention.
  if (
    (expiredCompliance > 0 || expiringCompliance > 0)
    && isCategoryAlertsEnabled('rc_expiry')
  ) {
    // One doc per line — Inbox style shows Fitness / Insurance / … without "…".
    const complianceBody = formatComplianceStatusCounts(summary.compliance);
    out.push({
      id: 'dash-compliance',
      category: 'rc_expiry',
      title: 'Vahan Compliance',
      body: complianceBody,
      detail: complianceBody,
      createdAt: now,
      read: false,
      data: { screen: 'RCList' },
    });
  }

  const pendingChallans = summary.challans?.pendingCount ?? 0;
  if (pendingChallans > 0 && isCategoryAlertsEnabled('echallan')) {
    const challanBody = [
      `Pending Challans: ${pendingChallans}`,
      `Due Amount: ${formatINR(summary.challans.pendingAmount)}`,
    ].join('\n');
    out.push({
      id: 'dash-challans',
      category: 'echallan',
      title: 'E-challan',
      body: challanBody,
      detail: challanBody,
      createdAt: now,
      read: false,
      data: { screen: 'ChallanList' },
    });
  }

  const driverAlertCount = getDriverOpenAlertCount(summary.drivers);
  if (driverAlertCount > 0 && isCategoryAlertsEnabled('dl_expiry')) {
    // Separate lines so Suspended / Expiring / Expired are not cut mid-word.
    const driverBody = [
      `${driverAlertCount} need attention`,
      `Suspended: ${summary.drivers.suspended}`,
      `Expiring: ${summary.drivers.expiringSoon}`,
      `Expired: ${summary.drivers.expired}`,
    ].join('\n');
    out.push({
      id: 'dash-drivers',
      category: 'dl_expiry',
      title: 'Driver License',
      body: driverBody,
      detail: driverBody,
      createdAt: now,
      read: false,
      data: { screen: 'DLList' },
    });
  }

  const approvedClaims = summary.claims?.approved ?? 0;
  if (approvedClaims > 0 && isCategoryAlertsEnabled('claim_update')) {
    const claimBody = [
      `${approvedClaims} toll claim${approvedClaims > 1 ? 's' : ''} approved`,
      `Recovered Amount: ${formatINR(summary.claims.recoveredFY)}`,
    ].join('\n');
    out.push({
      id: 'dash-claims',
      category: 'claim_update',
      title: 'Claim',
      body: claimBody,
      detail: claimBody,
      createdAt: now,
      read: false,
      data: { screen: 'ClaimsList', initialFilter: 'APPROVED' },
    });
  }

  normalizeAnnouncements(summary.announcements)
    .filter((item) => item.showAsDashboardAlert)
    .forEach((item) => {
      const announcementBody =
        item.message || (item.category ? `Update · ${item.category}` : 'Karins update');
      out.push({
        id: `dash-announcement-${item.id}`,
        category: 'product_update',
        title: item.title,
        body: announcementBody,
        detail: announcementBody,
        // Daily feed: announce today while the dashboard still flags the alert.
        createdAt: now,
        read: false,
        data: { announcementId: String(item.id) },
      });
    });

  return out;
}

/** Refresh dashboard-sourced alerts whenever the fleet summary changes. */
export function syncDashboardNotifications(
  summary: DashboardSummary | null | undefined,
  scope?: WalletAlertScope,
): void {
  if (!summary) return;

  const derived = deriveDashboardNotifications(summary, scope);
  syncDerivedNotifications(derived);

  derived.forEach((row) => {
    showDerivedFleetPush(row).catch(() => undefined);
  });
}
