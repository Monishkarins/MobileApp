/**
 * Customer-group-admin switch flow — mirrors the web app:
 * 1) PUT /user/set-default-user-id  { selectedCustomerId }
 * 2) POST /auth/refreshToken       { accessToken }
 *
 * The refresh response carries the customer-scoped token + defaultCustomerId
 * that toll/vehicle/claims endpoints actually honour.
 *
 * Live DB often lags the set-default write; an immediate refreshToken then
 * returns 500. We retry refresh briefly so the first UI attempt succeeds.
 */

import { authApi } from '../api/authApi';
import type { ApiError } from '../api/client';
import { SecureStorage } from '../storage/SecureStorage';
import type { RefreshTokenResponse } from '../../types/auth';

/** How many times to re-call refresh after set-default before surfacing failure. */
const REFRESH_MAX_ATTEMPTS = 3;

/** Base delay (ms); grows per attempt so the primary write can become readable. */
const REFRESH_RETRY_BASE_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Treat 5xx / network failures as retryable — those match the race we see on
 * the first switch. Auth/validation errors (4xx) must fail immediately.
 */
function isRetryableSwitchError(error: unknown): boolean {
  const status = (error as ApiError)?.status;
  if (typeof status !== 'number') return true;
  return status === 0 || status >= 500;
}

/**
 * Issues a scoped session after set-default. Retries only the refresh step
 * because the customer id is already persisted on the first successful write.
 */
async function refreshScopedSession(
  accessToken: string,
): Promise<RefreshTokenResponse> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data } = await authApi.refreshToken(accessToken);
      return data;
    } catch (error) {
      lastError = error;
      // Exhausted retries or a non-transient error — bubble up to the UI.
      if (!isRetryableSwitchError(error) || attempt === REFRESH_MAX_ATTEMPTS) {
        throw error;
      }
      // Back off so the set-default commit is visible before the next refresh.
      await delay(REFRESH_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

export async function switchActiveCustomer(
  selectedCustomerId: number,
): Promise<RefreshTokenResponse> {
  // Persist the chosen customer first — refreshToken reads this server-side.
  await authApi.setDefaultCustomer(selectedCustomerId);

  const accessToken = await SecureStorage.getAccessToken();
  if (!accessToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  const data = await refreshScopedSession(accessToken);

  if (data.accessToken) {
    await SecureStorage.setAccessToken(data.accessToken);
  }

  SecureStorage.setSessionUser({
    userId: data.userId,
    roleId: data.roleId,
    roleKey: data.roleKey,
    mobileVerified: data.mobileVerified,
    customerName: data.customerName,
    defaultCustomerId: data.defaultCustomerId,
    eligibleForCommissionReport: data.eligibleForCommissionReport,
  });
  SecureStorage.setSessionRestorable(true);

  return data;
}
