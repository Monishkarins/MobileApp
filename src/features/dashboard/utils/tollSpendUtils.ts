/**
 * Toll spend normalization — mirrors web FleetDashboard/utils/tollSpendUtils.ts
 * so mobile dashboard cards read the same period amounts and txn counts.
 */

import type { TollPeriodData, TollSpend } from '../../../types/dashboard';

type TollSpendPeriodKey =
  | 'today'
  | 'yesterday'
  | 'thisMonth'
  | 'thisFY'
  | 'lastQuarter';

const PERIOD_KEY_ALIASES: Record<TollSpendPeriodKey, string[]> = {
  today: ['today'],
  yesterday: ['yesterday'],
  thisMonth: ['thisMonth', 'this_month', 'month'],
  thisFY: ['thisFY', 'thisFy', 'thisFinancialYear', 'this_financial_year'],
  lastQuarter: ['lastQuarter', 'last_quarter'],
};

function readNumber(value: unknown): number {
  if (value == null || value === '') return 0;
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function readPeriodAmount(source: Record<string, unknown>): number {
  return readNumber(
    source.amount
    ?? source.txnAmount
    ?? source.debitAmount
    ?? source.tollExpenses
    ?? source.debit,
  );
}

export function readPeriodTxnCount(
  source: TollPeriodData | Record<string, unknown> | null | undefined,
): number {
  if (!source || typeof source !== 'object') return 0;

  const record = source as Record<string, unknown>;
  const count = readNumber(
    record.txnCount
    ?? record.transactions
    ?? record.transactionCount
    ?? record.noOfTolls
    ?? record.no_of_tolls
    ?? record.txn_count,
  );
  return Math.round(count);
}

function normalizePeriodData(raw: unknown): TollPeriodData {
  if (typeof raw === 'number') {
    return { amount: raw, txnCount: 0 };
  }

  if (!raw || typeof raw !== 'object') {
    return { amount: 0, txnCount: 0 };
  }

  const source = raw as Record<string, unknown>;
  return {
    amount: Math.round(readPeriodAmount(source)),
    txnCount: readPeriodTxnCount(source),
    vehicleCount: readNumber(source.vehicleCount ?? source.vehicles) || undefined,
  };
}

function resolvePeriodRaw(
  source: Record<string, unknown>,
  periodKey: TollSpendPeriodKey,
): unknown {
  for (const alias of PERIOD_KEY_ALIASES[periodKey]) {
    if (source[alias] != null) return source[alias];
  }
  return undefined;
}

function resolveFinancialYearBranch(source: Record<string, unknown>): unknown {
  const financialYear = source.financialYear;
  if (!financialYear || typeof financialYear !== 'object') return undefined;

  const fy = financialYear as Record<string, unknown>;
  return fy.this ?? fy.current ?? fy.thisYear;
}

function resolvePeriod(
  source: Record<string, unknown>,
  periodKey: TollSpendPeriodKey,
): unknown {
  const direct = resolvePeriodRaw(source, periodKey);
  if (direct != null) return direct;

  if (periodKey === 'thisFY') {
    return resolveFinancialYearBranch(source);
  }

  return undefined;
}

export function normalizeTollSpend(raw: unknown): TollSpend {
  if (!raw || typeof raw !== 'object') {
    return {
      today: { amount: 0, txnCount: 0 },
      yesterday: { amount: 0, txnCount: 0 },
      thisMonth: { amount: 0, txnCount: 0 },
      thisFY: { amount: 0, txnCount: 0 },
      lastQuarter: { amount: 0, txnCount: 0 },
      lastMonth: { amount: 0, txnCount: 0 },
    };
  }

  const source = raw as Record<string, unknown>;

  return {
    today: normalizePeriodData(resolvePeriod(source, 'today')),
    yesterday: normalizePeriodData(resolvePeriod(source, 'yesterday')),
    thisMonth: normalizePeriodData(resolvePeriod(source, 'thisMonth')),
    thisFY: normalizePeriodData(resolvePeriod(source, 'thisFY')),
    lastQuarter: normalizePeriodData(resolvePeriod(source, 'lastQuarter')),
    last7Days: normalizePeriodData(source.last7Days ?? source.last_7_days),
    lastMonth: normalizePeriodData(source.lastMonth ?? source.last_month),
  };
}

export function normalizeTollSpendFromSummary(summary: unknown): TollSpend {
  if (!summary || typeof summary !== 'object') {
    return normalizeTollSpend(null);
  }

  const source = summary as Record<string, unknown>;
  return normalizeTollSpend(source.tollSpend ?? source.toll_spend);
}

export function readTollSpendTxnCount(
  tollSpend: TollSpend | null | undefined,
  period: 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'THIS_FY' | 'LAST_QUARTER',
): number {
  if (!tollSpend) return 0;

  switch (period) {
    case 'TODAY':
      return readPeriodTxnCount(tollSpend.today);
    case 'YESTERDAY':
      return readPeriodTxnCount(tollSpend.yesterday);
    case 'THIS_MONTH':
      return readPeriodTxnCount(tollSpend.thisMonth);
    case 'THIS_FY':
      return readPeriodTxnCount(tollSpend.thisFY);
    case 'LAST_QUARTER':
      return readPeriodTxnCount(tollSpend.lastQuarter);
  }
}

export function readTollSpendAmount(
  tollSpend: TollSpend | null | undefined,
  period: 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'THIS_FY' | 'LAST_QUARTER',
): number {
  if (!tollSpend) return 0;

  switch (period) {
    case 'TODAY':
      return tollSpend.today.amount;
    case 'YESTERDAY':
      return tollSpend.yesterday.amount;
    case 'THIS_MONTH':
      return tollSpend.thisMonth.amount;
    case 'THIS_FY':
      return tollSpend.thisFY.amount;
    case 'LAST_QUARTER':
      return tollSpend.lastQuarter?.amount ?? 0;
  }
}
