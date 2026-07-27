import dayjs from 'dayjs';

/** Format a number as Indian Rupees — e.g. ₹1,24,500 or ₹2.4L */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
    if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(2)}L`;
    if (amount >= 1_000)       return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return '₹' + Math.trunc(amount).toLocaleString('en-IN');
}

/** Format count compactly */
export function fmtNum(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format datetime */
export function fmtDate(d: string | null | undefined, fmt = 'DD MMM YYYY'): string {
  if (!d) return '—';
  return dayjs(d).format(fmt);
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  // Include year so toll txn (and other) lists stay unambiguous across years.
  return dayjs(d).format('DD MMM YYYY, hh:mm A');
}

/** Claim detail dates — matches the web ledger (DD-MM-YYYY). */
export function fmtClaimDate(d: string | null | undefined): string {
  if (!d) return '—';
  return dayjs(d).format('DD-MM-YYYY');
}

/** Claim detail timestamps — matches the web ledger (DD-MM-YYYY hh:mm A). */
export function fmtClaimDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return dayjs(d).format('DD-MM-YYYY hh:mm A');
}

/** Decimal amount without currency symbol — mirrors the claims web table. */
export function fmtDecimalAmount(amount?: number | string | null): string {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

/** Days until a date */
export function daysUntil(dateStr: string): number {
  return dayjs(dateStr).diff(dayjs(), 'day');
}

/** Expiry variant based on days remaining */
export function expiryVariant(dateStr?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!dateStr) return 'neutral';
  const days = daysUntil(dateStr);
  if (days < 0)  return 'danger';
  if (days <= 7)  return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

/** Vehicle number formatted for display */
export function fmtVehicleNo(vno: string): string {
  return vno.toUpperCase().trim();
}
