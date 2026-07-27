/**
 * Full e-Challan row payload for the detail screen — mirrors web EchallanContainer view modal.
 */

export interface ChallanOffenceRow {
  act?: string;
  offenceName?: string;
}

export interface ChallanDetailPayload {
  vehicleNo: string;
  challanNo: string;
  challanDateTime?: string;
  challanPlace?: string;
  challanStatus?: string;
  fineImposed?: number | string;
  receivedAmount?: number | string;
  receiptNo?: string;
  paymentStatus?: string;
  department?: string;
  rtoDistrictName?: string;
  stateCode?: string;
  driverName?: string;
  ownerName?: string;
  nameOfViolator?: string;
  dlNo?: string;
  sentToRegCourt?: string;
  sentToVirtualCourt?: string;
  sentToCourtOn?: string;
  dateOfProceeding?: string;
  courtName?: string;
  courtAddress?: string;
  documentImpounded?: string;
  remark?: string;
  customerName?: string;
  offensiveDetails?: ChallanOffenceRow[];
  paymentUrl?: string;
  paymentRequestId?: string;
}
