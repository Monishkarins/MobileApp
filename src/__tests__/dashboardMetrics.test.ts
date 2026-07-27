import {
  buildDashboardMetrics, gridMetrics, computeFleetIntelligence,
} from '../features/dashboard/dashboardMetrics';
import { computeHealthScore, computeOpenAlerts } from '../features/dashboard/utils/dashboardSummaryUtils';
import { sampleSummary } from './fixtures';

describe('dashboard metric registry — no duplication', () => {
  const metrics = buildDashboardMetrics(sampleSummary, 'fy');

  it('every metric key is unique', () => {
    const keys = metrics.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every metric label is unique (no duplicate cards)', () => {
    const labels = metrics.map((m) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('previously-duplicated metrics appear exactly once', () => {
    for (const key of ['activeFleet', 'fySavings', 'walletTotal']) {
      expect(metrics.filter((m) => m.key === key)).toHaveLength(1);
    }
  });

  it('no metric is both in the hero and the KPI grid', () => {
    const grid = gridMetrics(metrics);
    const gridKeys = new Set(grid.map((m) => m.key));
    const heroKeys = metrics.filter((m) => m.section === 'hero').map((m) => m.key);
    for (const k of heroKeys) expect(gridKeys.has(k)).toBe(false);
  });

  it('wallet and savings metrics are not duplicated into the KPI grid', () => {
    const gridKeys = gridMetrics(metrics).map((m) => m.key);
    expect(gridKeys).not.toContain('walletTotal');
    expect(gridKeys).not.toContain('fySavings');
  });

  it('toll metric reflects the selected period', () => {
    const today = buildDashboardMetrics(sampleSummary, 'today').find((m) => m.key === 'tollSpend');
    const fy = buildDashboardMetrics(sampleSummary, 'fy').find((m) => m.key === 'tollSpend');
    expect(today?.value).toBe(12000);
    expect(fy?.value).toBe(5911000);
  });

  it('claims card shows approved count (web parity)', () => {
    const claims = metrics.find((m) => m.key === 'claimsApproved');
    expect(claims?.value).toBe(5);
    expect(claims?.sub).toContain('3 pending');
  });

  it('open alerts match web formula', () => {
    expect(computeOpenAlerts(sampleSummary)).toBe(11 + 8 + 10);
  });
});

describe('fleet health score', () => {
  it('is between 0 and 100', () => {
    const health = computeHealthScore(sampleSummary);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it('a perfectly healthy fleet scores 100', () => {
    const healthy = computeHealthScore({
      ...sampleSummary,
      compliance: {
        fitness: { expired: 0 }, tax: { expired: 0 }, insurance: { expired: 0 },
        pucc: { expired: 0 }, permit: { expired: 0 }, np: { expired: 0 },
        totalAlerts: 0,
      },
      challans: { pendingCount: 0, pendingAmount: 0 },
      drivers: { total: 80, valid: 80, suspended: 0, expiringSoon: 0, expired: 0 },
      fleet: { total: 175, active: 175, inactive: 0, hotlisted: 0 },
      wallet: { ...sampleSummary.wallet, walletStatus: 'HEALTHY' },
    });
    expect(healthy.score).toBe(100);
    expect(healthy.label).toBe('Excellent');
  });

  it('high expired docs and challans drop the score', () => {
    const risky = computeHealthScore({
      ...sampleSummary,
      compliance: {
        fitness: { expired: 20 }, tax: { expired: 20 }, insurance: { expired: 20 },
        pucc: { expired: 20 }, permit: { expired: 20 }, np: { expired: 20 },
        totalAlerts: 100,
      },
      challans: { pendingCount: 50, pendingAmount: 999999 },
      drivers: { total: 80, valid: 0, suspended: 0, expiringSoon: 0, expired: 40 },
      fleet: { total: 175, active: 50, inactive: 125, hotlisted: 0 },
      wallet: { ...sampleSummary.wallet, walletStatus: 'RECHARGE_REQUIRED' },
    });
    expect(risky.score).toBeLessThan(50);
    expect(risky.label).toBe('At Risk');
  });

  it('fleet intelligence maps health score to hero status', () => {
    const fi = computeFleetIntelligence(sampleSummary);
    expect(fi.score).toBe(computeHealthScore(sampleSummary).score);
    expect(fi.openAlerts).toBe(computeOpenAlerts(sampleSummary));
  });
});
