/**
 * DA claims list filters — field names and enums mirror web DAClaimHeader.
 */

import type { ClaimFilters } from './claimFilters.types';
import { hasClaimDateRange } from '../utils/claimDateRange';

export type { ClaimFilters } from './claimFilters.types';

export const EMPTY_CLAIM_FILTERS: ClaimFilters = {
  customerId: '',
  customerName: '',
  vehicleNo: '',
  tollName: '',
  m2pTollId: '',
  rrn: '',
  claimStatus: '',
  claimType: '',
  exitType: '',
  claimLevel: '',
  dateFilterType: 'transactionDate',
  // Intentionally blank — Claims tab must load the full ledger until the user picks a range.
  fromDateTime: '',
  toDateTime: '',
};

/** Initial / reset filters: no From–To so menu data shows all claims. */
export function getDefaultClaimFilters(): ClaimFilters {
  return {
    ...EMPTY_CLAIM_FILTERS,
    dateFilterType: 'transactionDate',
    fromDateTime: '',
    toDateTime: '',
  };
}

/** Web claimStatusList — full granular statuses on /claim/claims. */
export const CLAIM_STATUS_OPTIONS = [
  { label: 'WRONG_DEBIT', value: 'WRONG_DEBIT' },
  { label: 'NO_TOLL_RATE', value: 'NO_TOLL_RATE' },
  { label: 'WAITING_FOR_DOC', value: 'WAITING_FOR_DOC' },
  { label: 'CLAIM_REQUESTED', value: 'CLAIM_REQUESTED' },
  { label: 'CLAIM_SUBMITTED', value: 'CLAIM_SUBMITTED' },
  { label: 'CLAIM_REJECTED', value: 'CLAIM_REJECTED' },
  { label: 'CLAIM_REJ_CLOSED', value: 'CLAIM_REJ_CLOSED' },
  { label: 'EXPIRED', value: 'EXPIRED' },
  { label: 'CLAIM_RECEIVED', value: 'CLAIM_RECEIVED' },
] as const;

export const CLAIM_TYPE_OPTIONS = [
  { label: 'DEBIT_ADJUSTMENT', value: '1' },
  { label: 'WRONG_SINGLE', value: '2' },
  { label: 'WRONG_RETURN', value: '3' },
  { label: 'WRONG_DOUBLE_DEBIT', value: '4' },
  { label: 'WRONG_L_AND_T', value: '5' },
  { label: 'OTHERS', value: '6' },
  { label: 'SUSPICIOUS_DEBIT', value: '7' },
  { label: 'WRONG_GPS', value: '8' },
] as const;

export const CLAIM_EXIT_TYPE_OPTIONS = [
  { label: 'ONE', value: '1' },
  { label: 'MANY', value: '2' },
  { label: 'MANY_INT', value: '24' },
] as const;

export const CLAIM_LEVEL_OPTIONS = [
  { label: 'Level 1', value: '1' },
  { label: 'Level 2', value: '2' },
  { label: 'Level 3', value: '3' },
] as const;

export const CLAIM_DATE_FILTER_OPTIONS = [
  { label: 'TRANSACTION_DATE', value: 'transactionDate' },
  { label: 'REQUESTED_DATE', value: 'requestedDate' },
  { label: 'SUBMITTED_DATE', value: 'submittedDate' },
  { label: 'RECEIVED_DATE', value: 'receivedDate' },
  { label: 'CLAIM_REJ_DATE_1', value: 'rejectedDateLevel1' },
  { label: 'CLAIM_REJ_DATE_2', value: 'rejectedDateLevel2' },
  { label: 'CLAIM_REJ_DATE_3', value: 'rejectedDateLevel3' },
] as const;

/** From/To date labels — mirrors web DAClaimHeader placeholders per date type. */
export function getClaimDateRangeLabel(
  dateFilterType: string,
  bound: 'from' | 'to',
): string {
  const prefix = bound === 'from' ? 'From' : 'To';
  switch (dateFilterType) {
    case 'transactionDate': return `${prefix} Txn Date`;
    case 'requestedDate': return `${prefix} Req Date`;
    case 'submittedDate': return `${prefix} Sub Date`;
    case 'receivedDate': return `${prefix} Received Date`;
    case 'rejectedDateLevel1': return `${prefix} Rej Date 1`;
    case 'rejectedDateLevel2': return `${prefix} Rej Date 2`;
    case 'rejectedDateLevel3': return `${prefix} Rej Date 3`;
    default: return `${prefix} Date`;
  }
}

export interface ClaimCustomerOption {
  yapEntityId: string;
  firstName: string;
}

export function isClaimFiltersActive(filters: ClaimFilters): boolean {
  return Boolean(
    filters.customerName.trim()
    || filters.vehicleNo.trim()
    || filters.tollName.trim()
    || filters.m2pTollId.trim()
    || filters.rrn.trim()
    || filters.claimStatus
    || filters.claimType
    || filters.exitType
    || filters.claimLevel
    // Any complete date window counts as an active filter (there is no invisible year default).
    || hasClaimDateRange(filters.fromDateTime, filters.toDateTime)
    || filters.dateFilterType !== 'transactionDate',
  );
}
