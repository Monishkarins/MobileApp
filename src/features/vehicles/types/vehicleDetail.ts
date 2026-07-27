/**
 * Vehicle detail payload — mirrors web Vehicle list row + history modal fields.
 */

export interface VehicleHistoryRow {
  yapKitNumber?: string;
  yapStatus?: string;
  yapRegisteredDate?: string;
  createdAt?: string;
}

export interface VehicleDetailPayload {
  vehicleNo: string;
  profileId?: string;
  yapKitNumber?: string;
  vehicleGroupName?: string;
  yapStatus?: string;
  statusOnOff?: string;
  yapRegisteredDate?: string;
  createdAt?: string;
  customerName?: string;
  customerId?: string;
  history?: VehicleHistoryRow[];
}
