/**
 * Shared domain types for fleet entities.
 * Centralizing these keeps the API layer, store, and UI aligned on one shape.
 */

export type VehicleStatus = 'active' | 'idle' | 'maintenance';

export interface Vehicle {
  vehicleId: string;
  name: string;
  plateNumber: string;
  status: VehicleStatus;
  driverName: string;
  fuelLevel: number; // percentage 0-100
  mileageKm: number;
  lastServiceDate: string; // ISO date
}

export interface Driver {
  driverId: string;
  name: string;
  licenseNumber: string;
  assignedVehicle: string | null;
  phone: string;
  isOnDuty: boolean;
}
