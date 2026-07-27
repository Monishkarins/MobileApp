import { apiClient } from './client';
import type { WalletTransaction } from '../../types/dashboard';
import { formatWalletTypeLabel } from '../../utils/walletTypeUtils';

export interface WalletParams {
  customerId?: number | string;
  customerName?: string;
  agentId?: string | number;
  fromDate?: string;
  toDate?: string;
  dateRange?: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth';
  txnType?: string;
  walletType?: string | number;
  pageNo?: number;
  pageSize?: number;
}

export interface WalletTransactionRow {
  id?: number | string;
  txnType?: string;
  txnAmount?: string | number;
  balance?: string | number;
  txnDate?: string;
  txnRefNo?: string;
  txnStatus?: string;
  merchantLocation?: string;
  merchantId?: string;
  walletType?: number;
  type?: number;
  customer?: { firstName?: string; yapEntityId?: string };
}

export type WalletReportRow = WalletTransactionRow;

/** Unified wallet report row — wallet ledger entries and recharge history share one list. */
export type WalletReportListItem =
  | { kind: 'wallet'; row: WalletReportRow; sortTime: number }
  | { kind: 'recharge'; row: RechargeTransactionRow; sortTime: number };

export interface MergedWalletReportPage {
  items: WalletReportListItem[];
  walletCount: number;
  rechargeCount: number;
  summaryCards?: WalletTransactionResponse['cards'];
}

/** Scope params shared by wallet ledger and recharge feeds (date/customer/agent). */
export function buildWalletFeedParams(
  params: Record<string, string | number>,
): WalletParams {
  const {
    pageNo,
    pageSize,
    customerName,
    agentId,
    dateRange,
    fromDate,
    toDate,
  } = params;

  return {
    pageNo: Number(pageNo),
    pageSize: Number(pageSize),
    ...(customerName ? { customerName: String(customerName) } : {}),
    ...(agentId ? { agentId } : {}),
    ...(dateRange ? { dateRange: dateRange as WalletParams['dateRange'] } : {}),
    ...(fromDate ? { fromDate: String(fromDate) } : {}),
    ...(toDate ? { toDate: String(toDate) } : {}),
  };
}

export function rechargeMatchesWalletType(
  row: RechargeTransactionRow,
  walletTypeFilter: string,
): boolean {
  if (!walletTypeFilter) return true;
  const label = formatWalletTypeLabel(row.transferredWalletType);
  const target = walletTypeFilter === '1' ? 'FASTag' : 'Corporate';
  return label === target;
}

export function mapRechargeToReportRow(row: RechargeTransactionRow): WalletReportRow {
  const mapped = mapRechargeTransactionRow(row, Number(row.id) || 0);
  const statusText = String(row.yapStatus ?? row.zaakpayStatus ?? '');
  const isFailed = /fail|reject|cancel|error/i.test(statusText);

  return {
    id: row.id,
    txnType: 'Wallet Recharge',
    txnAmount: mapped.amount,
    txnDate: mapped.transactionDate,
    txnRefNo: mapped.referenceNo,
    txnStatus: isFailed ? 'PAYMENT_FAILURE' : statusText || 'SUCCESS',
    merchantLocation: mapped.description,
    type: mapped.transactionType === 'CR' ? 1 : 2,
    balance: 0,
    customer: row.customerName
      ? { firstName: row.customerName, yapEntityId: '' }
      : undefined,
  };
}

export async function fetchMergedWalletReportPage(
  walletParams: Record<string, string | number>,
  includeRecharge: boolean,
): Promise<MergedWalletReportPage> {
  const feedParams = buildWalletFeedParams(walletParams);
  const walletTypeFilter = String(walletParams.walletType ?? '');

  const walletPromise = walletApi.getTransactions({
    ...feedParams,
    ...(walletParams.txnType ? { txnType: String(walletParams.txnType) } : {}),
    ...(walletTypeFilter ? { walletType: walletTypeFilter } : {}),
  });

  const rechargePromise = includeRecharge
    ? walletApi.getRecharges(feedParams)
    : Promise.resolve({ data: { rows: [], count: 0 } as RechargeTransactionResponse });

  const [walletRes, rechargeRes] = await Promise.all([walletPromise, rechargePromise]);

  const walletRows = (walletRes.data.rows ?? []) as WalletReportRow[];
  const rechargeRows = (rechargeRes.data.rows ?? []).filter((row) =>
    rechargeMatchesWalletType(row, walletTypeFilter),
  );

  const items: WalletReportListItem[] = [
    ...walletRows.map((row) => ({
      kind: 'wallet' as const,
      row,
      sortTime: Date.parse(row.txnDate ?? '') || 0,
    })),
    ...rechargeRows.map((row) => ({
      kind: 'recharge' as const,
      row,
      sortTime: Date.parse(row.createdDate ?? '') || 0,
    })),
  ].sort((a, b) => b.sortTime - a.sortTime);

  return {
    items,
    walletCount: walletRes.data.count ?? walletRows.length,
    rechargeCount: rechargeRes.data.count ?? rechargeRows.length,
    summaryCards: walletRes.data.cards,
  };
}

export function mergeWalletReportPages(
  existing: WalletReportListItem[],
  nextPage: WalletReportListItem[],
): WalletReportListItem[] {
  const seen = new Set(existing.map((item) =>
    item.kind === 'wallet'
      ? `wallet-${item.row.txnRefNo ?? item.row.txnDate}-${item.row.txnAmount}`
      : `recharge-${item.row.orderId ?? item.row.id}-${item.row.createdDate}`,
  ));

  const merged = [...existing];
  for (const item of nextPage) {
    const key = item.kind === 'wallet'
      ? `wallet-${item.row.txnRefNo ?? item.row.txnDate}-${item.row.txnAmount}`
      : `recharge-${item.row.orderId ?? item.row.id}-${item.row.createdDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.sort((a, b) => b.sortTime - a.sortTime);
}

export interface WalletTransactionResponse {
  rows: WalletTransactionRow[];
  count: number;
  cards?: {
    today?: { creditAmount?: number; debitAmount?: number };
    yesterday?: { creditAmount?: number; debitAmount?: number };
    thisWeek?: { creditAmount?: number; debitAmount?: number };
    thisMonth?: { creditAmount?: number; debitAmount?: number };
  };
}

export interface RechargeTransactionRow {
  id?: number;
  orderId?: string;
  pgTransactionId?: string;
  amount?: string | number;
  createdDate?: string;
  yapStatus?: string;
  zaakpayStatus?: string;
  transferredWalletType?: string;
  receivedFrom?: string;
  customerName?: string;
}

export interface RechargeTransactionResponse {
  rows?: RechargeTransactionRow[];
  count?: number;
}

/** Web /transaction/recharge/process-recharge — initiates Zaakpay checkout. */
export interface ProcessRechargeResponse {
  checkoutUrl?: string;
  orderId?: string;
  rechargeStatus?: string;
  amount?: string | number;
  message?: string;
  paymentMode?: string;
}

/** Web POST /transaction/recharge/check-txn-status response. */
export interface RechargeTxnStatusResponse {
  orderId: string;
  amount?: string | number;
  rechargeStatus?: string;
  message?: string;
  paymentMode?: string;
}

/** Web GET /user/customer-balance — pre-recharge customer validation. */
export interface CustomerBalanceResponse {
  customerId?: string;
  customerName?: string;
  totalBalance?: number;
  fastagBalance?: number;
  corporateBalance?: number;
}

/** Admin recharge header uses this yapEntityId for partner wallet balance. */
export const ADMIN_PARTNER_YAP_ENTITY_ID = 'LQPARTNER20';

/** Backend may nest balance under `data`; mirror web RechargeContainer unwrap. */
export function unwrapCustomerBalance(
  payload: CustomerBalanceResponse | { data?: CustomerBalanceResponse },
): CustomerBalanceResponse {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data;
  }
  return payload as CustomerBalanceResponse;
}

export interface RechargeQueryParams extends WalletParams {
  orderId?: string;
  type?: string | number;
  yapStatus?: string;
  transferredTo?: string | number;
}

export const walletApi = {
  getBalance: (customerId?: number) =>
    apiClient.get<any>('/transaction/wallet/balance', { params: { customerId } }),

  /** Web parity — /transaction/wallet/wallet-transaction-data */
  getTransactions: (params: WalletParams) =>
    apiClient.get<WalletTransactionResponse>(
      '/transaction/wallet/wallet-transaction-data',
      { params },
    ),

  /** Customer picker for wallet transaction report — web WalletTransactionReportHeader. */
  getCustomerList: () =>
    apiClient.get<Array<{ yapEntityId: string; firstName: string }>>(
      '/transaction/wallet/customer-list',
    ),

  getRecharges: (params: RechargeQueryParams) =>
    apiClient.get<RechargeTransactionResponse>('/transaction/recharge', { params }),

  /** Web parity — POST /transaction/recharge/process-recharge */
  processRecharge: (payload: { amount: string | number; customerId?: string }) =>
    apiClient.post<ProcessRechargeResponse>(
      '/transaction/recharge/process-recharge',
      payload,
    ),

  /** Web parity — POST /transaction/recharge/check-txn-status */
  checkRechargeTxnStatus: (orderId: string) =>
    apiClient.post<RechargeTxnStatusResponse>(
      '/transaction/recharge/check-txn-status',
      { orderId },
    ),

  /** Web parity — GET /user/customer-balance */
  getCustomerBalance: (params: { checkBalance: boolean; yapEntityId: string }) =>
    apiClient.get<CustomerBalanceResponse | { data?: CustomerBalanceResponse }>(
      '/user/customer-balance',
      { params },
    ),

  /** Admin recharge picker — same list as web Recharge page. */
  getFastagUsers: () =>
    apiClient.get<{ data?: Array<{ yapEntityId: string; firstName: string }> }>(
      '/user/fastag-users',
    ),

  exportRechargesExcel: (params: Omit<RechargeQueryParams, 'pageNo' | 'pageSize'>) =>
    apiClient.get<ArrayBuffer>('/transaction/recharge/export-excel', {
      params,
      responseType: 'arraybuffer',
    }),

  exportTransactionsExcel: (params: Omit<WalletParams, 'pageNo' | 'pageSize'>) =>
    apiClient.get<ArrayBuffer>('/transaction/wallet/export-wallet-transactions-excel', {
      params,
      responseType: 'arraybuffer',
    }),

  exportTransactionsPdf: (params: Omit<WalletParams, 'pageNo' | 'pageSize'>) =>
    apiClient.get<ArrayBuffer>('/transaction/wallet/export-wallet-transactions-pdf', {
      params,
      responseType: 'arraybuffer',
    }),
};

export function mapWalletTransactionRow(
  row: WalletTransactionRow,
  index: number,
): WalletTransaction {
  const isFailed = row.txnStatus === 'PAYMENT_FAILURE';
  const isCredit = row.type === 1 && !isFailed;

  return {
    id: index,
    transactionType: isCredit ? 'CR' : 'DR',
    amount: Number(row.txnAmount) || 0,
    description: row.merchantLocation || row.txnType || (isFailed ? 'Payment failed' : 'Wallet transaction'),
    transactionDate: row.txnDate ?? '',
    referenceNo: row.txnRefNo ?? '',
    balance: Number(row.balance) || 0,
    source: 'wallet',
  };
}

/** Maps /transaction/recharge rows into the same list shape as wallet debits/credits. */
export function mapRechargeTransactionRow(
  row: RechargeTransactionRow,
  index: number,
): WalletTransaction {
  const statusText = String(row.yapStatus ?? row.zaakpayStatus ?? '');
  const isFailed = /fail|reject|cancel|error/i.test(statusText);
  const walletLabel = formatWalletTypeLabel(row.transferredWalletType);
  const baseDesc = walletLabel !== '—' ? `Wallet Recharge · ${walletLabel}` : 'Wallet Recharge';

  return {
    id: row.id ?? index,
    transactionType: isFailed ? 'DR' : 'CR',
    amount: Number(row.amount) || 0,
    description: isFailed ? `${baseDesc} (${statusText || 'Failed'})` : baseDesc,
    transactionDate: row.createdDate ?? '',
    referenceNo: row.orderId ?? row.pgTransactionId ?? '',
    balance: 0,
    source: 'recharge',
  };
}

/** Merges wallet + recharge feeds and sorts newest transaction first. */
export function mergeRecentWalletTransactions(
  walletRows: WalletTransaction[],
  rechargeRows: WalletTransaction[],
): WalletTransaction[] {
  return [...walletRows, ...rechargeRows].sort((a, b) => {
    const timeA = Date.parse(a.transactionDate) || 0;
    const timeB = Date.parse(b.transactionDate) || 0;
    return timeB - timeA;
  });
}
