/**
 * Mock fleet dataset — stand-in for the backend API until live endpoints are wired.
 * Used to populate the dashboard and list screens during development.
 */

import { Vehicle, Driver } from '../types/fleet';

export const mockVehicles: Vehicle[] = [
  {
    vehicleId: 'VH-1001',
    name: 'Volvo FH16',
    plateNumber: 'KA01AB1234',
    status: 'active',
    driverName: 'Ravi Kumar',
    fuelLevel: 78,
    mileageKm: 142350,
    lastServiceDate: '2026-05-12',
  },
  {
    vehicleId: 'VH-1002',
    name: 'Tata Prima',
    plateNumber: 'KA05CD5678',
    status: 'idle',
    driverName: 'Sahana M',
    fuelLevel: 45,
    mileageKm: 98120,
    lastServiceDate: '2026-04-28',
  },
  {
    vehicleId: 'VH-1003',
    name: 'Ashok Leyland',
    plateNumber: 'KA03EF9012',
    status: 'maintenance',
    driverName: 'Imran Khan',
    fuelLevel: 12,
    mileageKm: 210540,
    lastServiceDate: '2026-06-20',
  },
  {
    vehicleId: 'VH-1004',
    name: 'Mahindra Blazo',
    plateNumber: 'KA09GH3456',
    status: 'active',
    driverName: 'Deepa R',
    fuelLevel: 63,
    mileageKm: 56230,
    lastServiceDate: '2026-06-02',
  },
];

export const mockDrivers: Driver[] = [
  {
    driverId: 'DR-2001',
    name: 'Ravi Kumar',
    licenseNumber: 'DL-KA-2019-0091',
    assignedVehicle: 'VH-1001',
    phone: '+91 98860 11223',
    isOnDuty: true,
  },
  {
    driverId: 'DR-2002',
    name: 'Sahana M',
    licenseNumber: 'DL-KA-2020-0455',
    assignedVehicle: 'VH-1002',
    phone: '+91 99012 33445',
    isOnDuty: false,
  },
  {
    driverId: 'DR-2003',
    name: 'Imran Khan',
    licenseNumber: 'DL-KA-2018-0732',
    assignedVehicle: 'VH-1003',
    phone: '+91 90080 55667',
    isOnDuty: false,
  },
  {
    driverId: 'DR-2004',
    name: 'Deepa R',
    licenseNumber: 'DL-KA-2021-0188',
    assignedVehicle: 'VH-1004',
    phone: '+91 97400 77889',
    isOnDuty: true,
  },
];
