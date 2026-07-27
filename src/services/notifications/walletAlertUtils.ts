/**
 * Wallet low-balance rules — alert limit defaults to minimum balance × 1.5;
 * user override is stored locally on the device (web UI reference, no API sync).
 */

import type { WalletInfo } from '../../types/dashboard';
import { resolveWalletTotalBalance } from '../../features/dashboard/utils/dashboardSummaryUtils';
import { snapWalletThreshold } from '../../constants/walletThresholdConstants';
import {
  getSavedWalletAlertThreshold,
  type WalletAlertScope,
} from './walletAlertPreferences';

export type { WalletAlertScope };

/** Web uses 1.5× the stored minimum balance as the low-balance alert line. */
export const WALLET_ALERT_MULTIPLIER = 1.5;

/** Alert threshold from dashboard minimum balance (×1.5). Returns 0 when min is unset. */
export function computeWalletAlertThreshold(minimumBalance: number | null | undefined): number {
  const base = Number(minimumBalance) || 0;
  if (base <= 0) return 0;
  return Math.round(base * WALLET_ALERT_MULTIPLIER);
}

/** Default alert limit from server minimum balance — before any local override. */
export function resolveDefaultWalletAlertThreshold(
  minimumBalance: number | null | undefined,
): number {
  return snapWalletThreshold(computeWalletAlertThreshold(minimumBalance));
}

/** Effective alert limit: saved slider value first, else minimum × 1.5 default. */
export function resolveWalletAlertThreshold(
  minimumBalance: number | null | undefined,
  scope?: WalletAlertScope,
): number {
  const saved = getSavedWalletAlertThreshold(scope?.userId, scope?.customerId);
  if (saved != null) return saved;
  return resolveDefaultWalletAlertThreshold(minimumBalance);
}

export interface WalletLowBalanceState {
  isLow: boolean;
  isEmpty: boolean;
  totalBalance: number;
  alertThreshold: number;
}

/** True when balance is empty or below the effective alert limit. */
export function evaluateWalletLowBalance(
  wallet?: WalletInfo | null,
  scope?: WalletAlertScope,
): WalletLowBalanceState {
  const totalBalance = resolveWalletTotalBalance(wallet);
  const alertThreshold = resolveWalletAlertThreshold(wallet?.minimumBalance, scope);
  const isEmpty = totalBalance <= 0;

  const belowAlertLimit =
    alertThreshold > 0 && totalBalance < alertThreshold;

  const serverMarkedLow =
    wallet?.walletStatus != null
    && wallet.walletStatus !== 'HEALTHY';

  return {
    isLow: isEmpty || belowAlertLimit || serverMarkedLow,
    isEmpty,
    totalBalance,
    alertThreshold,
  };
}
