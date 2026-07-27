/**
 * Device-local low balance alert threshold — UI preference only (no server sync).
 * Scoped per user + customer so admin context switches keep separate limits.
 */

import { Cache } from '../storage/SecureStorage';
import { snapWalletThreshold } from '../../constants/walletThresholdConstants';

function storageKey(userId?: number, customerId?: number): string {
  return `wallet_alert_threshold:${userId ?? 'anon'}:${customerId ?? 'self'}`;
}

export function getSavedWalletAlertThreshold(
  userId?: number,
  customerId?: number,
): number | null {
  const raw = Cache.getJSON<{ threshold: number }>(storageKey(userId, customerId));
  if (raw?.threshold == null) return null;
  return snapWalletThreshold(raw.threshold);
}

export function saveWalletAlertThreshold(
  threshold: number,
  userId?: number,
  customerId?: number,
): number {
  const snapped = snapWalletThreshold(threshold);
  Cache.setJSON(storageKey(userId, customerId), { threshold: snapped });
  return snapped;
}

export interface WalletAlertScope {
  userId?: number;
  customerId?: number;
}
