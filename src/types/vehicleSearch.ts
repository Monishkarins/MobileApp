/**
 * Fleet dashboard Vehicle 360 search — mirrors web FleetDashboard VehicleSearchRecord.
 */

export type VehicleVahanDocStatus = 'valid' | 'expiring' | 'expired';

export interface VehicleVahanDoc {
  status: VehicleVahanDocStatus;
  date: string;
}

export interface VehicleSearchRecord {
  reg: string;
  owner: string;
  driver: string;
  vahan: Record<'fitness' | 'insurance' | 'pucc' | 'permit' | 'tax' | 'np', VehicleVahanDoc>;
  tolls: { plaza: string; time: string; amount: string; rrn: string }[];
  challans: { no: string; date: string; amount: string; status?: string }[];
  claims: { plaza: string; amount: string; status: string; updated: string }[];
}
