/**
 * Fleet utilisation — mirrors web fleetUtilizationUtils.ts.
 * Utilisation = (distinct vehicles with toll activity in period ÷ total fleet) × 100.
 */

import type {
  FleetStats,
  FleetUtilization,
  TollSpend,
  UtilChartColumn,
} from '../../../types/dashboard';

const clampPct = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const readCount = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed);
};

export function computeUtilizationPct(filteredVehicles: number, totalVehicles: number): number {
  if (totalVehicles <= 0) return 0;
  const utilized = Math.min(filteredVehicles, totalVehicles);
  return clampPct((utilized / totalVehicles) * 100);
}

function readVehicleCount(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const count = readCount(source[key]);
    if (count !== null) return count;
  }
  return null;
}

function readNestedVehicleCount(source: Record<string, unknown>, periodKey: string): number | null {
  const nested = source[periodKey] ?? source[`${periodKey}Vehicles`];
  if (typeof nested === 'number') return readCount(nested);
  if (nested && typeof nested === 'object') {
    const record = nested as Record<string, unknown>;
    return readCount(record.vehicleCount ?? record.vehicles ?? record.count);
  }
  return null;
}

export function normalizeFleetUtilization(
  raw: unknown,
  totalVehicles: number,
): FleetUtilization | null {
  if (!raw || typeof raw !== 'object' || totalVehicles <= 0) return null;

  const source = raw as Record<string, unknown>;

  const todayVehicles = readVehicleCount(source, ['todayVehicles', 'today_vehicles'])
    ?? readNestedVehicleCount(source, 'today');
  const yesterdayVehicles = readVehicleCount(source, ['yesterdayVehicles', 'yesterday_vehicles'])
    ?? readNestedVehicleCount(source, 'yesterday');
  const last7DaysVehicles = readVehicleCount(source, [
    'last7DaysVehicles', 'last_7_days_vehicles', 'last7DaysVehicleCount', 'last_7_days_vehicle_count',
  ]) ?? readNestedVehicleCount(source, 'last7Days') ?? readNestedVehicleCount(source, 'last_7_days');
  const thisMonthVehicles = readVehicleCount(source, ['thisMonthVehicles', 'this_month_vehicles'])
    ?? readNestedVehicleCount(source, 'thisMonth') ?? readNestedVehicleCount(source, 'this_month');
  const lastMonthVehicles = readVehicleCount(source, ['lastMonthVehicles', 'last_month_vehicles'])
    ?? readNestedVehicleCount(source, 'lastMonth') ?? readNestedVehicleCount(source, 'last_month');

  const vehicleCounts = {
    today: todayVehicles,
    yesterday: yesterdayVehicles,
    last7Days: last7DaysVehicles,
    thisMonth: thisMonthVehicles,
    lastMonth: lastMonthVehicles,
  };

  if (Object.values(vehicleCounts).every((value) => value === null)) return null;

  const trendRaw = source.last7DayVehicleTrend
    ?? source.last_7_day_vehicle_trend
    ?? source.last7DayTrend
    ?? source.last_7_day_trend;

  const last7DayVehicleTrend = Array.isArray(trendRaw)
    ? trendRaw.map((point) => readCount(point) ?? 0)
    : undefined;

  const last7DayTrend = last7DayVehicleTrend?.map((count) =>
    computeUtilizationPct(count, totalVehicles),
  );

  const toPct = (count: number | null) =>
    (count !== null ? computeUtilizationPct(count, totalVehicles) : 0);

  return {
    today: toPct(todayVehicles),
    yesterday: toPct(yesterdayVehicles),
    last7Days: toPct(last7DaysVehicles),
    thisMonth: toPct(thisMonthVehicles),
    lastMonth: toPct(lastMonthVehicles),
    last7DayTrend,
    last7DayVehicleTrend,
    vehicleCounts: {
      today: todayVehicles ?? 0,
      yesterday: yesterdayVehicles ?? 0,
      last7Days: last7DaysVehicles ?? 0,
      thisMonth: thisMonthVehicles ?? 0,
      lastMonth: lastMonthVehicles ?? 0,
    },
  };
}

function vehicleCountFromTollPeriod(
  tollSpend: TollSpend | null,
  key: 'today' | 'yesterday' | 'thisMonth' | 'last7Days' | 'lastMonth',
): number {
  const period = tollSpend?.[key];
  if (!period || typeof period !== 'object') return 0;
  return period.vehicleCount ?? 0;
}

/** Prefer BFF utilisation payload; fall back to toll-spend vehicle counts per period. */
export function resolveFleetUtilization(
  fleet: FleetStats | null,
  tollSpend: TollSpend | null,
): FleetUtilization {
  const total = fleet?.total ?? 0;

  const fromApi = fleet?.utilization
    ? normalizeFleetUtilization(fleet.utilization, total)
    : null;

  if (fromApi) return fromApi;

  const todayVehicles = vehicleCountFromTollPeriod(tollSpend, 'today');
  const yesterdayVehicles = vehicleCountFromTollPeriod(tollSpend, 'yesterday');
  const last7DaysVehicles = vehicleCountFromTollPeriod(tollSpend, 'last7Days');
  const thisMonthVehicles = vehicleCountFromTollPeriod(tollSpend, 'thisMonth');
  const lastMonthVehicles = vehicleCountFromTollPeriod(tollSpend, 'lastMonth');

  return {
    today: computeUtilizationPct(todayVehicles, total),
    yesterday: computeUtilizationPct(yesterdayVehicles, total),
    last7Days: computeUtilizationPct(last7DaysVehicles, total),
    thisMonth: computeUtilizationPct(thisMonthVehicles, total),
    lastMonth: computeUtilizationPct(lastMonthVehicles, total),
    vehicleCounts: {
      today: todayVehicles,
      yesterday: yesterdayVehicles,
      last7Days: last7DaysVehicles,
      thisMonth: thisMonthVehicles,
      lastMonth: lastMonthVehicles,
    },
  };
}

/** Overview row — Today, Yesterday, This Mon, Last Mo (web FleetUtilChartPanel). */
export function buildFleetUtilOverviewColumns(utilization: FleetUtilization): UtilChartColumn[] {
  const counts = utilization.vehicleCounts ?? {
    today: 0,
    yesterday: 0,
    last7Days: 0,
    thisMonth: 0,
    lastMonth: 0,
  };

  return [
    {
      pct: utilization.today,
      label: 'Today',
      vehicleCount: counts.today,
      dateRange: 'today',
    },
    {
      pct: utilization.yesterday,
      label: 'Yesterday',
      vehicleCount: counts.yesterday,
      highlight: true,
      dateRange: 'yesterday',
    },
    {
      pct: utilization.thisMonth,
      label: 'This Mon',
      vehicleCount: counts.thisMonth,
      dateRange: 'thisMonth',
    },
    {
      pct: utilization.lastMonth,
      label: 'Last Mon',
      vehicleCount: counts.lastMonth,
      dateRange: 'lastMonth',
    },
  ];
}

function resolveBarHeight(pct: number, vehicleCount: number, _maxPct: number): `${number}%` {
  // Empty periods render a thin stub so the track isn't visually empty.
  if (vehicleCount <= 0 && pct <= 0) return '4%';
  // Scale the bar against the full 0–100 axis (not the tallest column) so an
  // 80% utilisation fills 80% of the track instead of the entire height.
  const clamped = Math.min(Math.max(pct, 0), 100);
  // Keep a small floor so very low (but non-zero) utilisation stays visible.
  return `${Math.max(clamped, 6)}%`;
}

export function resolveUtilBarHeight(
  pct: number,
  vehicleCount: number,
  maxPct: number,
): `${number}%` {
  return resolveBarHeight(pct, vehicleCount, maxPct);
}

/** Distinct vehicles with toll activity on the previous calendar day. */
export function resolveYesterdayVehicleCount(
  fleet: FleetStats | null | undefined,
  tollSpend: TollSpend | null | undefined,
): number {
  const utilization = resolveFleetUtilization(fleet ?? null, tollSpend ?? null);
  return utilization.vehicleCounts?.yesterday ?? 0;
}
