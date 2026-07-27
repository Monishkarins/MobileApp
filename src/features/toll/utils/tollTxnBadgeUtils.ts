/**
 * Toll transaction status pill — flagged states override the ledger credit/debit type.
 */

import type { TollTransactionDetail } from '../../../types/dashboard';

export type TollTxnBadgeVariant = 'success' | 'warning' | 'danger';

export interface TollTxnBadge {
  label: string;
  variant: TollTxnBadgeVariant;
}

/** Resolve hero/list pill label from toll row flags and txn type. */
export function resolveTollTxnBadge(txn: Pick<
  TollTransactionDetail,
  'isDoubleDebit' | 'isSuspicious' | 'claimStatus' | 'txnType'
>): TollTxnBadge {
  if (txn.isDoubleDebit) return { label: 'Double Debit', variant: 'danger' };
  if (txn.isSuspicious) return { label: 'Suspicious', variant: 'warning' };
  if (txn.claimStatus) return { label: 'Claimed', variant: 'success' };

  // Credit reversals/refunds add money back; standard toll crossings are debits.
  const isCredit = (txn.txnType ?? '').toUpperCase().includes('CREDIT');
  return isCredit
    ? { label: 'Credit', variant: 'success' }
    : { label: 'Debit', variant: 'danger' };
}

/** Whether the ledger row represents money credited back to the wallet. */
export function isTollCreditTxn(txnType?: string | null): boolean {
  return (txnType ?? '').toUpperCase().includes('CREDIT');
}
