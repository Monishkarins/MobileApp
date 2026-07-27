import { apiClient } from './client';
import type { TollTransaction, PaginatedResponse } from '../../types/dashboard';

export interface TollParams {
  customerId?: number;
  vehicleGroupId?: number;
  vehicleNo?: string;
  rrn?: string;
  locationName?: string;
  fromDate?: string;
  toDate?: string;
  dateRange?: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth';
  /** @deprecated use dateRange — kept for backward compatibility */
  period?: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth';
  txnType?: string;
  pageNo?: number;
  pageSize?: number;
  tollReaderDateTimeSort?: 'ascend' | 'descend';
  showAllTxn?: boolean;
}

export type TollExportParams = Omit<TollParams, 'pageNo' | 'pageSize' | 'period'>;

// Raw row as returned by the toll ledger endpoint. Field names and numeric
// types differ from the UI's TollTransaction, so the screen maps before render.
export interface TollTransactionRow {
  id: number;
  entityId: string;
  locationName: string;
  direction: string;
  txnDateTime: string;
  txnReaderTime?: string;
  txnRefNo?: string;
  txnAmount: string;
  balance: string;
  rrn: string;
  txnType: string;
  kitNumber?: string;
  tollId?: string;
  lan?: string;
  locationLat?: string;
  locationLang?: string;
  externalTxnId?: string;
  barcode?: string;
  customer?: { firstName?: string; yapEntityId?: string };
  vehicle?: { vehicleNo?: string; profileId?: string };
}

// Backend wraps the page in { rows, count } rather than { data, total }.
export interface TollTransactionResponse {
  rows: TollTransactionRow[];
  count: number;
  showRecentTxn?: boolean;
  tollTxnSummary?: unknown;
}

function buildTollQueryParams(params: TollParams | TollExportParams): Record<string, unknown> {
  const { period, dateRange, fromDate, toDate, ...rest } = params as TollParams;
  const query: Record<string, unknown> = { ...rest };
  // Prefer explicit from/to when both are present; otherwise send preset dateRange.
  // Omit undefined dateRange so vehicle-scoped calls are not polluted with empty keys.
  if (fromDate && toDate) {
    query.fromDate = fromDate;
    query.toDate = toDate;
  } else if (dateRange ?? period) {
    query.dateRange = dateRange ?? period;
  }
  return query;
}

/** Binary export GETs must not force JSON Content-Type — that breaks some gateways. */
const BINARY_EXPORT_CONFIG = {
  responseType: 'arraybuffer' as const,
  timeout: 120_000,
  transformResponse: [(data: unknown) => data],
  headers: {
    Accept: 'application/octet-stream, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
  },
};

export const tollApi = {
  getTransactions: (params: TollParams) =>
    apiClient.get<TollTransactionResponse>(
      '/transaction/toll/toll-transactions',
      { params: buildTollQueryParams(params) },
    ),

  exportTransactionsExcel: (params: TollExportParams) =>
    apiClient.get<ArrayBuffer>('/transaction/toll/export-toll-transactions', {
      params: buildTollQueryParams(params),
      ...BINARY_EXPORT_CONFIG,
    }),

  exportTransactionsPdf: (params: TollExportParams) =>
    apiClient.get<ArrayBuffer>('/transaction/toll/export-toll-transactions-pdf', {
      params: buildTollQueryParams(params),
      ...BINARY_EXPORT_CONFIG,
    }),

  getRecentTransactions: (pageSize = 10) =>
    apiClient.get<TollTransactionResponse>('/transaction/toll/toll-transactions', {
      params: {
        pageNo: 1,
        pageSize,
        tollReaderDateTimeSort: 'descend',
        showAllTxn: true,
      },
    }),

  getTransaction: (id: number) =>
    apiClient.get<TollTransaction>(`/transaction/toll/${id}`),

  getTollRates: (params: { plazaId?: number; vehicleClass?: string }) =>
    apiClient.get<any[]>('/toll/rates', { params }),

  getDoubleDebits: (params: TollParams) =>
    apiClient.get<PaginatedResponse<any>>('/doubleDebit/list', { params }),

  getSuspiciousTransactions: (params: TollParams) =>
    apiClient.get<PaginatedResponse<any>>('/transaction/suspicious', { params }),

  // Paginated FASTag inventory — backend lists tags under /tag/tagList (GET).
  getTagInventory: (params: TagInventoryParams) =>
    apiClient.get<TagInventoryResponse>('/tag/tagList', {
      params: { pageNo: 1, pageSize: 25, ...params },
    }),
};

/** Query params for /tag/tagList — mirrors web TagInventoryHeader tagQuery. */
export interface TagInventoryParams {
  pageNo?: number;
  pageSize?: number;
  tagId?: string;
  tagBarcode?: string;
  tagClass?: string;
  customerId?: string | number;
  vrn?: string;
  status?: string;
  agentId?: string | number;
}

// Raw FASTag row from /tag/tagList. `vrn` is the assigned vehicle (null when the
// tag is spare) and there is no wallet balance on this endpoint.
export interface TagInventoryRow {
  id: number;
  tagId: string;            // NETC tag serial / kit number
  tagBarcode?: string;
  tagClass?: string;        // vehicle class code (e.g. VC4)
  status: string;           // assigned | unassigned | hotlist | ...
  vrn?: string | null;      // assigned vehicle registration number
  assignedDate?: string | null;
  allocatedDate?: string | null;
  customerName?: string;
  customerYapEntityId?: string | null;
  name?: string;
  mobileNumber?: string;
}

// Backend returns aggregate counts plus the paged list under `tagList`.
export interface TagInventoryResponse {
  totalCount: number;
  tagList: TagInventoryRow[];
  assignedTags?: unknown;
  unAssignedTags?: unknown;
}
