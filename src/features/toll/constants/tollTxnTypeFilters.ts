/**
 * Toll transaction type options — mirrors web TollTransactionReportHeader
 * `txnTypes` so mobile and portal filter the same ledger codes.
 */

export const TOLL_TXN_TYPE_OPTIONS = [
  { value: 'NETC_CORPORATE_DEBIT', label: 'CORPORATE_DEBIT' },
  { value: 'DEBIT_ADJUSTMENT', label: 'DEBIT_ADJUSTMENT' },
  { value: 'CHARGEBACK_CREDIT', label: 'CHARGEBACK_CREDIT' },
  { value: 'DEEMED_ACCEPTANCE_DEBIT', label: 'DEEMED_ACCEPTANCE_DEBIT' },
  { value: 'C2M', label: 'C2M' },
] as const;

export type TollTxnTypeValue = (typeof TOLL_TXN_TYPE_OPTIONS)[number]['value'] | '';

export function tollTxnTypeLabel(value: string): string {
  if (!value) return 'All transaction types';
  const match = TOLL_TXN_TYPE_OPTIONS.find((row) => row.value === value);
  return match?.label ?? value;
}
