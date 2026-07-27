/**
 * Karins product catalogue for the Solutions card — static list mirrored from
 * the web Fleet Dashboard demoData.
 */

export type KarinsServiceStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'AVAILABLE'
  | 'COMING_SOON'
  | 'ACTION_REQUIRED';

export interface KarinsService {
  key: string;
  name: string;
  description: string;
  status: KarinsServiceStatus;
  icon: string;
  routeKey?: 'toll' | 'challan' | 'rc' | 'dl';
  enquiryOption?: string;
}

export const SERVICE_REQUEST_OPTIONS = [
  'Fuel Card / Savings',
  'Fleet Insurance',
  'ADAS / DMS Safety',
  'Governance Reports',
];

export const KARINS_SERVICES: KarinsService[] = [
  {
    key: 'fastag',
    name: 'FASTag',
    description: 'NETC FASTag management',
    status: 'ACTIVE',
    icon: '🚛',
    routeKey: 'toll',
  },
  {
    key: 'toll-validation',
    name: 'Toll Validation',
    description: 'Automated toll dispute & recovery',
    status: 'ACTIVE',
    icon: '⚡',
  },
  {
    key: 'echallan',
    name: 'e-Challan Alerts',
    description: 'Real-time challan notifications',
    status: 'ACTIVE',
    icon: '📄',
    routeKey: 'challan',
  },
  {
    key: 'vahan',
    name: 'VAHAN Compliance',
    description: 'RC document expiry tracking',
    status: 'ACTIVE',
    icon: '🛡️',
    routeKey: 'rc',
  },
  {
    key: 'sarathi',
    name: 'SARATHI Validation',
    description: 'Driver licence verification',
    status: 'ACTIVE',
    icon: '👤',
    routeKey: 'dl',
  },
  {
    key: 'gps-toll',
    name: 'GPS Toll Validation',
    description: 'GPS-based toll reconciliation',
    status: 'INACTIVE',
    icon: '📍',
  },
  {
    key: 'fuel-card',
    name: 'Fuel Card',
    description: 'Fleet fuel savings programme',
    status: 'AVAILABLE',
    icon: '⛽',
    enquiryOption: 'Fuel Card / Savings',
  },
  {
    key: 'insurance',
    name: 'Fleet Insurance',
    description: 'Commercial fleet insurance',
    status: 'AVAILABLE',
    icon: '🛡️',
    enquiryOption: 'Fleet Insurance',
  },
  {
    key: 'adas',
    name: 'ADAS / DMS',
    description: 'Driver & safety monitoring',
    status: 'COMING_SOON',
    icon: '👁️',
  },
];

export function withGpsServiceStatus(
  services: KarinsService[],
  isGpsActive: boolean,
): KarinsService[] {
  return services.map((service) => (
    service.key === 'gps-toll'
      ? { ...service, status: isGpsActive ? 'ACTIVE' : 'INACTIVE' }
      : service
  ));
}
