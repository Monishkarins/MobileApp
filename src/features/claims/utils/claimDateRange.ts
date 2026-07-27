/**
 * DA-claims date helpers.
 * Claims menu / list opens with no From–To window so the ledger shows all rows
 * (same as web claim summary with blank dates). Operators opt into a range in Filters.
 */

/** True only when both bounds are set — backend requires a complete range or none. */
export function hasClaimDateRange(fromDateTime: string, toDateTime: string): boolean {
  return Boolean(fromDateTime?.trim() && toDateTime?.trim());
}

/**
 * Never invent a calendar-year (or any) window when dates are blank.
 * Partial ranges are cleared so we do not send a one-sided filter to /debit/getList.
 */
export function resolveClaimDateRange(fromDateTime: string, toDateTime: string) {
  if (hasClaimDateRange(fromDateTime, toDateTime)) {
    return {
      fromDateTime: fromDateTime.trim(),
      toDateTime: toDateTime.trim(),
    };
  }
  return { fromDateTime: '', toDateTime: '' };
}
