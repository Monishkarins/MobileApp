/**
 * Maps a raw /debit/getList row into the ClaimRecord shape used by the list
 * and detail screens. The ledger already carries every field operators need,
 * so the detail view can render without a separate /debit/:id fetch.
 */

import type { ClaimListRow } from '../../services/api/claimsApi';
import type { ClaimRecord } from '../../types/dashboard';
import { resolveClaimStatus, formatClaimType } from './claimStatus';

function readText(...values: Array<string | number | null | undefined>): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function readAmount(...values: Array<string | number | null | undefined>): string {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return String(value);
  }
  return '';
}

/** Flatten nested ledger fields into the mobile ClaimRecord contract. */
export function mapClaimListRow(row: ClaimListRow): ClaimRecord {
  const { statusGroup, statusLabel, rawClaimStatus } = resolveClaimStatus(row);
  // Reference Amount = the original toll debit (`txnAmount`), matching the web
  // claim detail. The flat referenceAmount/refAmount keys are kept as fallbacks.
  const referenceAmount = readAmount(row.txnAmount, row.referenceAmount, row.refAmount);

  return {
    claimId: row.claimId,
    vehicleNo: row.vehicle?.vehicleNo ?? '',
    customerName: readText(row.customer?.firstName, row.customerName),
    customerId: readText(row.customer?.yapEntityId, row.yapEntityId, row.customerId),
    tollPlaza: row.tollName ?? '',
    tollId: readText(row.m2pTollId, row.tollId),
    claimType: row.claimType ?? 0,
    // Web renders claim type from the numeric code only (getClaimType), not a
    // free-text backend name — keeps list cards aligned with the portal table.
    claimTypeName: formatClaimType(row.claimType, 'list'),
    amount: Number(row.claimTxnAmount) || 0,
    claimStatus: statusLabel,
    statusGroup,
    rawClaimStatus,
    // Backend field is `txnReaderTime`; keep the legacy key only as a fallback.
    readerDateTime: readText(row.txnReaderTime, row.txnReaderDateTime),
    transactionDateTime: readText(row.txnDateTime, row.transactionDateTime),
    // Mapper class / axle live on the joined vehicle_class relation; the flat
    // fields are fallbacks in case a future endpoint flattens them.
    mapperClass: readText(row.vehicle_class?.mapperClass, row.mapperClass, row.vehicleClass),
    axle: readText(row.vehicle_class?.axle, row.axle, row.axleCount),
    referenceAmount,
    requestedDate: row.claimRequestedDate ?? row.createdAt ?? '',
    receivedDate: row.claimReceivedDate ?? '',
    expiryDate: row.claimExpiredDate ?? '',
    submittedDate: readText(row.claimSubmittedDate),
    rejectedDate: readText(row.claimRejectedDate),
    rejectedReason: row.claimRejectedReason ?? '',
    submittedDateLevel2: readText(row.claimSubmittedDateLevel2),
    rejectedDateLevel2: readText(row.claimRejectedDateLevel2),
    rejectedReasonLevel2: readText(row.claimRejectedReasonLevel2),
    submittedDateLevel3: readText(row.claimSubmittedDateLevel3),
    rejectedDateLevel3: readText(row.claimRejectedDateLevel3),
    rejectedReasonLevel3: readText(row.claimRejectedReasonLevel3),
    lastUpdated:
      row.claimReceivedDate ?? row.claimSubmittedDate ?? row.createdAt ?? '',
    rrn: row.rrn,
  };
}
