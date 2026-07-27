/**
 * Maps /vehicle/vehicle-list rows to list cards and detail payloads (web parity).
 */

import type { VehicleListRow } from '../../services/api/vehicleApi';
import type { VehicleRecord } from '../../types/dashboard';
import { resolveVehicleStatusDisplay, isVehicleStatusOn } from './utils/vehicleStatusUtils';
import type { VehicleDetailPayload, VehicleHistoryRow } from './types/vehicleDetail';

function readStatusOnOff(yapStatus?: string): string {
  return isVehicleStatusOn(yapStatus) ? 'ON' : 'OFF';
}

export interface VehicleListItem extends VehicleRecord {
  detail: VehicleDetailPayload;
}

export function mapVehicleListRow(row: VehicleListRow, index: number): VehicleListItem {
  const statusDisplay = resolveVehicleStatusDisplay(row.yapStatus);
  const history = (row.history ?? []) as VehicleHistoryRow[];

  const detail: VehicleDetailPayload = {
    vehicleNo: row.vehicleNo,
    profileId: row.profileId,
    yapKitNumber: row.yapKitNumber,
    vehicleGroupName: row.vehicleGroupName,
    yapStatus: row.yapStatus,
    statusOnOff: readStatusOnOff(row.yapStatus),
    yapRegisteredDate: row.yapRegisteredDate,
    createdAt: row.createdAt,
    customerName: row.customer?.firstName,
    customerId: row.customer?.yapEntityId,
    history,
  };

  return {
    id: row.id ?? index,
    vehicleNo: row.vehicleNo,
    customerName: row.customer?.firstName ?? '',
    vehicleGroupName: row.vehicleGroupName,
    tagStatus: row.yapStatus ?? statusDisplay.label,
    isActive: statusDisplay.isActive,
    complianceRisk: statusDisplay.tone === 'danger'
      ? 'at-risk'
      : statusDisplay.tone === 'warning'
        ? 'watch'
        : 'healthy',
    detail,
  };
}
