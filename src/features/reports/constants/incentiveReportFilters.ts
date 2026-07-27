/**
 * Incentive report filters — mirrors web CommissionReportHeader query params.
 */

export interface IncentiveReportFilters {
  customerId: string;
  monthRange: string;
  year: string;
  status: string;
}

export const EMPTY_INCENTIVE_FILTERS: IncentiveReportFilters = {
  customerId: '',
  monthRange: '',
  year: '',
  status: '',
};

export const INCENTIVE_MONTH_RANGE_OPTIONS = [
  { label: 'JANUARY - MARCH', value: '01-03' },
  { label: 'APRIL - JUNE', value: '04-06' },
  { label: 'JULY - SEPTEMBER', value: '07-09' },
  { label: 'OCTOBER - DECEMBER', value: '10-12' },
] as const;

export const INCENTIVE_STATUS_OPTIONS = [
  { label: 'OPEN', value: '1' },
  { label: 'APPROVED', value: '2' },
  { label: 'INVOICE', value: '3' },
  { label: 'PAID', value: '4' },
] as const;

/** Customers only see APPROVED / INVOICE / PAID on web — hide OPEN. */
export const CUSTOMER_INCENTIVE_STATUS_OPTIONS = INCENTIVE_STATUS_OPTIONS.filter(
  (opt) => opt.value !== '1',
);

export function hasActiveIncentiveFilters(filters: IncentiveReportFilters): boolean {
  return Boolean(
    filters.customerId.trim()
    || filters.monthRange
    || filters.year.trim()
    || filters.status,
  );
}

export function buildIncentiveQueryParams(
  filters: IncentiveReportFilters,
  pageNo: number,
  pageSize: number,
): Record<string, string | number> {
  const params: Record<string, string | number> = { pageNo, pageSize };
  if (filters.customerId.trim()) params.customerId = filters.customerId.trim();
  if (filters.monthRange) params.monthRange = filters.monthRange;
  if (filters.year.trim()) params.year = filters.year.trim();
  if (filters.status) params.status = filters.status;
  return params;
}

function parseAmount(value?: string | number | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatIncentiveAmount(value?: string | number | null): string {
  return parseAmount(value).toFixed(2);
}

export function incentiveStatusVariant(status?: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  const s = (status ?? '').toUpperCase();
  if (s.includes('PAID')) return 'success';
  if (s.includes('APPROV')) return 'info';
  if (s.includes('INVOICE')) return 'warning';
  if (s.includes('OPEN')) return 'neutral';
  return 'neutral';
}
