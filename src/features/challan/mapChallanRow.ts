/**
 * Maps /echallan/echallans list rows to list cards and detail payloads (web parity).
 */

import type { ChallanRecord } from '../../types/dashboard';
import type { ChallanDetailPayload } from './types/challanDetail';
import { normalizeChallanNo, normalizeChallanVehicleNo } from './utils/challanApiNormalize';

function isStatus(value: string | undefined, target: 'pending' | 'disposed'): boolean {
  return String(value ?? '').trim().toLowerCase() === target;
}

function readAmount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface ChallanListItem extends ChallanRecord {
  detail: ChallanDetailPayload;
}

export function mapChallanListRow(row: any, index: number): ChallanListItem {
  const pending = isStatus(row.challanStatus, 'pending');
  const disposed = isStatus(row.challanStatus, 'disposed');

  const detail: ChallanDetailPayload = {
    vehicleNo: normalizeChallanVehicleNo(row.vehicleNo ?? ''),
    challanNo: normalizeChallanNo(row.challanNo ?? ''),
    challanDateTime: row.challanDateTime,
    challanPlace: row.challanPlace,
    challanStatus: row.challanStatus,
    fineImposed: row.fineImposed,
    receivedAmount: row.receivedAmount,
    receiptNo: row.receiptNo,
    paymentStatus: row.paymentStatus,
    department: row.department,
    rtoDistrictName: row.rtoDistrictName,
    stateCode: row.stateCode,
    driverName: row.driverName,
    ownerName: row.ownerName,
    nameOfViolator: row.nameOfViolator,
    dlNo: row.dlNo,
    sentToRegCourt: row.sentToRegCourt,
    sentToVirtualCourt: row.sentToVirtualCourt,
    sentToCourtOn: row.sentToCourtOn,
    dateOfProceeding: row.dateOfProceeding,
    courtName: row.courtName,
    courtAddress: row.courtAddress,
    documentImpounded: row.documentImpounded,
    remark: row.remark,
    customerName: row.customerName,
    offensiveDetails: row.offensiveDetails ?? [],
    paymentUrl: row.paymentUrl,
    paymentRequestId: row.paymentRequestId,
  };

  return {
    id: index,
    vehicleNo: detail.vehicleNo,
    challanNo: detail.challanNo,
    challanDateTime: detail.challanDateTime ?? '',
    state: detail.stateCode ?? '',
    department: detail.department ?? '',
    fineImposed: readAmount(row.fineImposed),
    status: detail.challanStatus ?? '',
    isPending: pending,
    isDisposed: disposed,
    isVirtualCourt: String(row.sentToVirtualCourt).toUpperCase() === 'YES',
    paymentUrl: row.paymentUrl,
    detail,
  };
}
