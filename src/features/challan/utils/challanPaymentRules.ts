/**
 * e-Challan payment eligibility — mirrors web EchallanContainer Pay button rules.
 */

export interface ChallanPayEligibility {
  challanStatus?: string;
  paymentStatus?: string;
  sentToRegCourt?: string;
  sentToVirtualCourt?: string;
}

function normalizeStatus(value?: string): string {
  return String(value ?? '').trim();
}

/** Pay is allowed only for pending challans not in court with a retryable payment state. */
export function canPayChallan(row: ChallanPayEligibility): boolean {
  const isPending = normalizeStatus(row.challanStatus).toLowerCase() === 'pending';
  const paymentStatus = normalizeStatus(row.paymentStatus);
  const canRetryPayment =
    paymentStatus === 'Failed'
    || paymentStatus === 'Cancelled'
    || paymentStatus === 'Refund'
    || paymentStatus === ''
    || !paymentStatus;
  const notInCourt =
    normalizeStatus(row.sentToRegCourt).toLowerCase() !== 'yes'
    && normalizeStatus(row.sentToVirtualCourt).toLowerCase() !== 'yes';

  return isPending && canRetryPayment && notInCourt;
}

export function hasChallanReceipt(paymentStatus?: string): boolean {
  return normalizeStatus(paymentStatus) === 'Success';
}

/** Web uses a 12-minute session window before auto-cancelling stale checkouts. */
export const CHALLAN_PAYMENT_TIMEOUT_MS = 720_000;
