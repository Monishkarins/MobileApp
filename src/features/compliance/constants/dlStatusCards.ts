/**
 * SARATHI summary cards — mirrors web DrivingLicenseContainer cardData buckets.
 */

export const DL_CARD_ACCENT = '#0093FF';

export interface DLStatusCounts {
  Active?: number;
  Suspended?: number;
}

export interface DLExpiryBucket {
  expiringSoon?: number;
  expired?: number;
}

export interface DLExpiryCounts {
  dlTrValdtoDt?: DLExpiryBucket;
  dlNtValdtoDt?: DLExpiryBucket;
  dlHzValdtoDt?: DLExpiryBucket;
  dlHlValdtoDt?: DLExpiryBucket;
}

export interface DLExpiryFilter {
  expiryStatus: string;
  expiryType: string;
}

export interface DLSummaryCard {
  key: string;
  title: string;
  icon: string;
  expiryType: string;
  leftLabel: string;
  rightLabel: string;
  leftFilter: DLExpiryFilter;
  rightFilter: DLExpiryFilter;
  readCounts: (status: DLStatusCounts | null, expiry: DLExpiryCounts | null) => {
    left: number;
    right: number;
  };
}

export const DL_SUMMARY_CARDS: DLSummaryCard[] = [
  {
    key: 'total',
    title: 'Total Drivers',
    icon: '👤',
    expiryType: 'dlStatus',
    leftLabel: 'Active',
    rightLabel: 'Suspend',
    leftFilter: { expiryStatus: 'active', expiryType: 'dlStatus' },
    rightFilter: { expiryStatus: 'suspended', expiryType: 'dlStatus' },
    readCounts: (status) => ({
      left: status?.Active ?? 0,
      right: status?.Suspended ?? 0,
    }),
  },
  {
    key: 'transport',
    title: 'Transport Expiry',
    icon: '🚛',
    expiryType: 'dlTrValdtoDt',
    leftLabel: 'Expiring',
    rightLabel: 'Expired',
    leftFilter: { expiryStatus: 'expiring', expiryType: 'dlTrValdtoDt' },
    rightFilter: { expiryStatus: 'expired', expiryType: 'dlTrValdtoDt' },
    readCounts: (_, expiry) => ({
      left: expiry?.dlTrValdtoDt?.expiringSoon ?? 0,
      right: expiry?.dlTrValdtoDt?.expired ?? 0,
    }),
  },
  {
    key: 'nonTransport',
    title: 'Non-Transport',
    icon: '📦',
    expiryType: 'dlNtValdtoDt',
    leftLabel: 'Expiring',
    rightLabel: 'Expired',
    leftFilter: { expiryStatus: 'expiring', expiryType: 'dlNtValdtoDt' },
    rightFilter: { expiryStatus: 'expired', expiryType: 'dlNtValdtoDt' },
    readCounts: (_, expiry) => ({
      left: expiry?.dlNtValdtoDt?.expiringSoon ?? 0,
      right: expiry?.dlNtValdtoDt?.expired ?? 0,
    }),
  },
  {
    key: 'hazardous',
    title: 'Hazardous Expiry',
    icon: '⚠️',
    expiryType: 'dlHzValdtoDt',
    leftLabel: 'Expiring',
    rightLabel: 'Expired',
    leftFilter: { expiryStatus: 'expiring', expiryType: 'dlHzValdtoDt' },
    rightFilter: { expiryStatus: 'expired', expiryType: 'dlHzValdtoDt' },
    readCounts: (_, expiry) => ({
      left: expiry?.dlHzValdtoDt?.expiringSoon ?? 0,
      right: expiry?.dlHzValdtoDt?.expired ?? 0,
    }),
  },
  {
    key: 'hills',
    title: 'Hills Expiry',
    icon: '⛰️',
    expiryType: 'dlHlValdtoDt',
    leftLabel: 'Expiring',
    rightLabel: 'Expired',
    leftFilter: { expiryStatus: 'expiring', expiryType: 'dlHlValdtoDt' },
    rightFilter: { expiryStatus: 'expired', expiryType: 'dlHlValdtoDt' },
    readCounts: (_, expiry) => ({
      left: expiry?.dlHlValdtoDt?.expiringSoon ?? 0,
      right: expiry?.dlHlValdtoDt?.expired ?? 0,
    }),
  },
];
