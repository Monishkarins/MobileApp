import { apiClient } from './client';
import type { VehicleRecord } from '../../types/dashboard';

export interface VehicleParams {
  pageNo: string;
  pageSize: string;
  /** Dashboard scope (numeric) or filter form (yapEntityId string) — web sends both shapes */
  customerId?: number | string;
  /** Comma-separated yapStatus filter — status cards and drilldown */
  vehicleStatuses?: string;
  vehicleNo?: string;
  vehicleClass?: string;
  tagId?: string;
  group?: string;
  /** Some list endpoints key groups the same way as RC (`groupName`). */
  groupName?: string;
  /** ACTIVE / INACTIVE — web ON/OFF status filter */
  status?: string;
  /** Single YAP status from filter dropdown */
  vehicleStatus?: string;
  agentId?: number | string;
  vehicleGroupId?: string;
}

// Raw vehicle row from /vehicle/vehicle-list. Customer name is nested and there
// is no per-row status flag — active/hotlist state is derived from yapStatus.
export interface VehicleListRow {
  id?: number;
  vehicleNo: string;
  customer?: { firstName?: string; yapEntityId?: string; agentId?: number };
  profileId?: string;
  vehicleGroupName?: string;
  yapStatus?: string;
  yapRegisteredDate?: string;
  createdAt?: string;
  yapKitNumber?: string;
  historyAvailable?: boolean;
  history?: {
    yapKitNumber?: string;
    yapStatus?: string;
    yapRegisteredDate?: string;
    createdAt?: string;
  }[];
}

// One bucket of the fleet status breakdown (e.g. Total Vehicles, Active, Hot List).
export interface VehicleStatusSummary {
  status: string;
  count: number;
}

// Backend wraps the page under `result` and ships aggregate counts separately.
export interface VehicleListResponse {
  result: { count: number; rows: VehicleListRow[] };
  statusSummary: VehicleStatusSummary[];
}

export const vehicleApi = {
  getList: (params: VehicleParams) =>
    apiClient.get<VehicleListResponse>('/vehicle/vehicle-list', { params }),

  /** Dropdown source for group + YAP status options (web VehicleHeader parity). */
  getFilterMeta: () =>
    apiClient.get<any[]>('/vehicle/filters'),

  /** Customer picker options for admin/employee/agent vehicle filter. */
  getCustomerVehicleGroups: () =>
    apiClient.get<any[]>('/transaction/toll/customer-vehicle-groups-list'),

  /** Group picker for VAHAN RC filters (web /vehicle-group/group-names). */
  getGroupNames: () =>
    apiClient.get<{ data?: { id: number; title: string }[] }>('/vehicle-group/group-names'),

  getById: (id: number) =>
    apiClient.get<VehicleRecord>(`/vehicle/${id}`),

  getGroups: (customerId?: number) =>
    apiClient.get<any[]>('/vehicle-group/list', { params: { customerId } }),

  getGroupById: (groupId: number) =>
    apiClient.get<any>(`/vehicle-group/${groupId}`),

  getTransactionSummary: (vehicleId: number, period: string) =>
    apiClient.get<any>(`/transaction/vehicle/${vehicleId}/summary`, { params: { period } }),

  getVehicleTollHistory: (vehicleNo: string, params: { fromDate?: string; toDate?: string }) =>
    apiClient.get<any[]>('/transaction/vehicle-toll-history', { params: { vehicleNo, ...params } }),

  /** Toggle vehicle tag ON/OFF — mirrors web VehicleContainer confirmVehicleToggle. */
  updateTagStatus: (yapKitNo: string, isOn: boolean) =>
    apiClient.post('/vehicle/update-vehicle-tagStatus', {
      newStatus: isOn ? 'ALLOCATED' : 'NETC_LOWBALANCE',
      yapKitNo,
      tagOperation: isOn ? 'remove' : 'add',
    }),

  /** Fleet list Excel export — same filters as /vehicle/vehicle-list (web parity). */
  exportVehiclesExcel: (params: Omit<VehicleParams, 'pageNo' | 'pageSize'>) =>
    apiClient.get('/vehicle/export-vehicles-excel', {
      params,
      responseType: 'arraybuffer',
      timeout: 120_000,
      transformResponse: [(data: unknown) => data],
      headers: {
        Accept: 'application/octet-stream, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
      },
    }),

  /** Fleet list PDF export. */
  exportVehiclesPdf: (params: Omit<VehicleParams, 'pageNo' | 'pageSize'>) =>
    apiClient.get('/vehicle/export-vehicles-pdf', {
      params,
      responseType: 'arraybuffer',
      timeout: 120_000,
      transformResponse: [(data: unknown) => data],
      headers: {
        Accept: 'application/octet-stream, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
      },
    }),
};
