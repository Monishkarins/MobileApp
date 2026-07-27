import { apiClient } from './client';
import type { ClaimRecord } from '../../types/dashboard';

// DA-claims list filters. The backend uses `size` (not pageSize) and expects the
// full filter surface; blanks are sent as empty strings so the query stays valid.
export interface ClaimsParams {
  pageNo?: number;
  size?: number;
  // Scope claims to the customer chosen in the dashboard dropdown (group admins).
  customerId?: number;
  customerName?: string;
  vehicleNo?: string;
  tollName?: string;
  claimStatus?: string;
  claimType?: string;
  claimLevel?: string;
  rrn?: string;
  exitType?: string;
  dateFilterType?: string;
  fromDateTime?: string;
  toDateTime?: string;
  m2pTollId?: string;
  customerSort?: string | null;
  vrnSort?: string | null;
  tollSort?: string | null;
  statusSort?: string | null;
  claimSubmittedDateSort?: string | null;
  txnReaderDateTimeSort?: string | null;
  claimRequestedDateSort?: string | null;
  reqFrom?: string;
}

// Defaults that mirror the web claims summary call; callers override as needed.
const CLAIM_LIST_DEFAULTS = {
  dateFilterType: 'transactionDate',
  reqFrom: 'claimSummary',
  vehicleNo: '',
  customerName: '',
  tollName: '',
  rrn: '',
  exitType: '',
  claimLevel: 'undefined',
  claimStatus: 'undefined',
  claimType: 'undefined',
  m2pTollId: '',
  fromDateTime: '',
  toDateTime: '',
  customerSort: null,
  vrnSort: null,
  tollSort: null,
  statusSort: null,
  claimSubmittedDateSort: null,
  txnReaderDateTimeSort: null,
  claimRequestedDateSort: null,
};

// Raw claim row from /debit/getList. Amounts are strings, vehicle/toll names are
// nested, and status is a granular code that the UI collapses into a group.
export interface ClaimListRow {
  claimId: number;
  rrn?: string;
  tollName?: string;
  m2pTollId?: string | number;
  tollId?: string | number;
  // Transaction Amount on the claim. Reference Amount maps to the original
  // toll debit `txnAmount` (web: Transaction Amount = claimTxnAmount,
  // Reference Amount = txnAmount).
  claimTxnAmount?: string;
  txnAmount?: string | number;
  referenceAmount?: string | number;
  refAmount?: string | number;
  claimStatus?: string | number;
  claimStatusName?: string;
  status?: string | number;
  claimType?: number;
  claimTypeName?: string;
  claimLevel?: number;
  claimLevelName?: string;
  claimRequestedDate?: string;
  claimReceivedDate?: string;
  claimSubmittedDate?: string;
  claimRejectedDate?: string;
  claimRejectedReason?: string;
  claimSubmittedDateLevel2?: string;
  claimRejectedDateLevel2?: string;
  claimRejectedReasonLevel2?: string;
  claimSubmittedDateLevel3?: string;
  claimRejectedDateLevel3?: string;
  claimRejectedReasonLevel3?: string;
  claimExpiredDate?: string;
  createdAt?: string;
  // Reader Date Time on the backend is `txnReaderTime`; `txnReaderDateTime`
  // exists only as a sort-key param name, never as a data field.
  txnReaderTime?: string;
  txnReaderDateTime?: string;
  txnDateTime?: string;
  transactionDateTime?: string;
  // Mapper class & axle arrive nested under the joined vehicle_class relation,
  // not as flat row fields (matches the web /debit/getList shape).
  vehicle_class?: { mapperClass?: string; axle?: string | number };
  mapperClass?: string;
  vehicleClass?: string;
  axle?: string | number;
  axleCount?: string | number;
  customerName?: string;
  yapEntityId?: string;
  customerId?: string | number;
  vehicle?: { vehicleNo?: string };
  customer?: { firstName?: string; yapEntityId?: string };
}

export interface ClaimListResponse {
  rows: ClaimListRow[];
  count: number;
}

export const claimsApi = {
  getList: (params: ClaimsParams) =>
    apiClient.get<ClaimListResponse>('/debit/getList', {
      params: { ...CLAIM_LIST_DEFAULTS, ...params },
    }),

  getTollPlazaCodes: (tollId: string) =>
    apiClient.get<{ tollId: string }[]>('/toll/getTollPlazaCode', {
      params: { tollId },
    }),

  getVrnList: (vrn: string) =>
    apiClient.get<{ id: number; vehicleNo: string }[]>('/debit/getVrnList', {
      params: { vrn },
    }),

  getById: (claimId: number) =>
    apiClient.get<ClaimRecord>(`/debit/${claimId}`),

  getSummary: (customerId?: number) =>
    apiClient.get<any>('/debit/summary', { params: { customerId } }),

  updateStatus: (claimId: number, status: string, notes?: string) =>
    apiClient.put(`/debit/${claimId}/status`, { status, notes }),
};
