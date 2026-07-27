/**
 * SARATHI DL list filters — query field names mirror web DrivingLicenseHeader.
 */

export interface DLFilters {
  /** Web admin picker sends yapEntityId as customerId. */
  customerId: string;
  licenseNo: string;
  driverName: string;
  mobileNo: string;
  expiryType: string;
  fromDate: string;
  toDate: string;
  status: string;
}

export const EMPTY_DL_FILTERS: DLFilters = {
  customerId: '',
  licenseNo: '',
  driverName: '',
  mobileNo: '',
  expiryType: '',
  fromDate: '',
  toDate: '',
  status: '',
};

export const DL_EXPIRY_TYPE_OPTIONS = [
  { label: 'NON - TRANSPORT', value: 'dlNtValdtoDt' },
  { label: 'TRANSPORT', value: 'dlTrValdtoDt' },
  { label: 'HAZARDOUS', value: 'dlHzValdtoDt' },
  { label: 'HILL', value: 'dlHlValdtoDt' },
] as const;

export const DL_STATUS_OPTIONS = [
  { label: 'ACTIVE', value: 'Active' },
  { label: 'SUSPENDED', value: 'Suspended' },
] as const;

export interface DlCustomerOption {
  yapEntityId: string;
  firstName: string;
}
