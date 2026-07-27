/**
 * Vehicle summary cards — mirrors web VehicleContainer vehicleCardDatas buckets
 * and the #0093FF accent used for counts/icons on the portal.
 */

export const VEHICLE_CARD_ACCENT = '#0093FF';

export interface VehicleStatusCard {
  key: string;
  title: string;
  icon: string;
  summaryKey: string;
  /** yapStatus values sent as vehicleStatuses CSV to /vehicle/vehicle-list */
  filter: string[];
}

export const VEHICLE_STATUS_CARDS: VehicleStatusCard[] = [
  {
    key: 'total',
    title: 'Total',
    icon: '🚗',
    summaryKey: 'Total Vehicles',
    filter: [
      'ALLOCATED',
      'NETC_NOTEXCEPTION',
      'NETC_LOWBALANCE',
      'NETC_FORCED_HOTLIST',
      'NETC_HOTLIST',
      'NETC_BLACKLIST',
    ],
  },
  {
    key: 'active',
    title: 'Active',
    icon: '✅',
    summaryKey: 'Active',
    filter: ['ALLOCATED', 'NETC_NOTEXCEPTION'],
  },
  {
    key: 'blacklist',
    title: 'Black List',
    icon: '⛔',
    summaryKey: 'Black List',
    filter: ['NETC_BLACKLIST'],
  },
  {
    key: 'forcedHotlist',
    title: 'Forced HL',
    icon: '⚠️',
    summaryKey: 'Forced Hot List',
    filter: ['NETC_FORCED_HOTLIST'],
  },
  {
    key: 'hotlist',
    title: 'Hot List',
    icon: '🔥',
    summaryKey: 'Hot List',
    filter: ['NETC_HOTLIST'],
  },
  {
    key: 'lowBalance',
    title: 'Low Bal',
    icon: '💰',
    summaryKey: 'Low Balance',
    filter: ['NETC_LOWBALANCE'],
  },
  {
    key: 'closed',
    title: 'Closed',
    icon: '🛑',
    summaryKey: 'Closed',
    filter: [
      'NETC_CLOSED_OR_REPLACED',
      'NETC_FORCED_CLOSED',
      'NETC_FORCED_LOWBALANCE',
    ],
  },
];
