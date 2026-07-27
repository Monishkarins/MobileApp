import {resolveComplianceTotals} from '../features/dashboard/dashboardSummaryUtils';
import type {DashboardSummary} from '../types/dashboard';

describe('resolveComplianceTotals', () => {
  it('aggregates all configured compliance categories', () => {
    const summary = {
      compliance: {
        fitness: {valid: 8, expiringSoon: 2, expired: 1},
        insurance: {valid: 9, exp7: 1, exp15: 2, exp30: 3, expired: 4},
        pucc: {valid: 10, expiringSoon: 0, expired: 0},
      },
    } as DashboardSummary;

    expect(resolveComplianceTotals(summary)).toEqual({
      valid: 27,
      expiring: 8,
      expired: 5,
    });
  });

  it('returns zeroes for missing data and clamps negative counters', () => {
    const summary = {
      compliance: {
        fitness: {valid: -2, expiringSoon: -1, expired: -4},
      },
    } as DashboardSummary;

    expect(resolveComplianceTotals(summary)).toEqual({
      valid: 0,
      expiring: 0,
      expired: 0,
    });
  });
});
