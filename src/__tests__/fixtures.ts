import type { DashboardSummary } from '../types/dashboard';

/** Deterministic dashboard fixture used across unit tests. */
export const sampleSummary: DashboardSummary = {
  customerId: 1,
  customerName: 'Kalaivani Logistics Pvt Ltd',
  generatedAt: '2026-06-26T10:00:00.000Z',
  fyYear: '2026-27',
  fleet: { total: 175, active: 175, inactive: 0, hotlisted: 0 },
  tollSpend: {
    today: { amount: 12000, txnCount: 40 },
    yesterday: { amount: 9000, txnCount: 31 },
    thisMonth: { amount: 480000, txnCount: 1600 },
    thisFY: { amount: 5911000, txnCount: 12900 },
    lastQuarter: { amount: 1500000, txnCount: 5000 },
  },
  wallet: {
    fastagBalance: 120355,
    corporateBalance: 200000,
    totalBalance: 320355,
    minimumBalance: 50000,
    walletStatus: 'HEALTHY',
    isCorporate: true,
  },
  savings: { fyClaimsRecovered: 9000, fyIncentivePaid: 4900, fyTotalSavings: 13900 },
  compliance: {
    fitness: { expired: 3 }, tax: { expired: 0 }, insurance: { expired: 4 },
    pucc: { expired: 2 }, permit: { expired: 1 }, np: { expired: 1 }, totalAlerts: 11,
  },
  challans: { pendingCount: 8, pendingAmount: 75500 },
  drivers: { total: 80, valid: 70, suspended: 0, expiringSoon: 6, expired: 4 },
  claims: { approved: 5, pending: 3, waitingForDoc: 1, rejected: 0, expired: 0, recoveredFY: 9000, total: 9 },
  announcements: [],
};
