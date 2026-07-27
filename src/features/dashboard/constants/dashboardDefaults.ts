/**
 * Default dashboard time windows — Toll Spend opens on today's activity so the
 * card matches the live day the operator is looking at.
 */

import type { TollPeriod } from '../../../types/dashboard';

export const DEFAULT_DASHBOARD_TOLL_PERIOD: TollPeriod = 'TODAY';

export type TollListPresetRange = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth';

export const DEFAULT_TOLL_LIST_RANGE: TollListPresetRange = 'today';

/** Maps dashboard toll period chips to the toll list preset filter. */
export function mapTollPeriodToListRange(period: TollPeriod): TollListPresetRange {
  switch (period) {
    case 'TODAY':
      return 'today';
    case 'YESTERDAY':
      return 'yesterday';
    case 'THIS_MONTH':
      return 'thisMonth';
    case 'LAST_QUARTER':
    case 'THIS_FY':
      return 'thisMonth';
    default:
      return DEFAULT_TOLL_LIST_RANGE;
  }
}
