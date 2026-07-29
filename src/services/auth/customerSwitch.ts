/**
 * Customer-group-admin switch flow — mirrors the web header:
 * 1) PUT /user/set-default-user-id  { selectedCustomerId }
 * 2) Update the local session so the UI scopes to that customer
 *
 * Backend APIs re-read `defaultCustomerId` from the User row on every request
 * (JWT only carries userId), so a fresh access token is not required for the
 * switch to take effect. Web achieves the same via page reload.
 *
 * `/auth/refreshToken` is cookie-only and unreliable on React Native, so it is
 * attempted as a best-effort UI sync and never blocks a successful set-default.
 */

import { authApi } from '../api/authApi';
import { SecureStorage } from '../storage/SecureStorage';
import type { RefreshTokenResponse, RoleKey } from '../../types/auth';

type SessionUserSnapshot = {
  userId: number;
  roleId: number;
  roleKey: RoleKey;
  mobileVerified: boolean;
  customerName: string;
  defaultCustomerId: number | null;
  eligibleForCommissionReport: boolean;
};

/**
 * Build a client-side session payload when cookie refresh is unavailable —
 * same shape as /auth/refreshToken so Redux applyRefreshedSession stays happy.
 */
function buildLocalScopedSession(
  sessionUser: SessionUserSnapshot,
  selectedCustomerId: number,
  accessToken: string,
): RefreshTokenResponse {
  return {
    accessToken,
    userId: sessionUser.userId,
    roleId: sessionUser.roleId,
    roleKey: sessionUser.roleKey,
    mobileVerified: sessionUser.mobileVerified,
    // Keep the signed-in account name; callers label the picker with the
    // selected customer's display name separately.
    customerName: sessionUser.customerName,
    defaultCustomerId: selectedCustomerId,
    eligibleForCommissionReport: sessionUser.eligibleForCommissionReport,
  };
}

/**
 * Optional cookie refresh after set-default. Returns null when the HTTP-only
 * refresh cookie is missing (common on mobile) so the local session path runs.
 */
async function tryCookieRefreshSession(): Promise<RefreshTokenResponse | null> {
  try {
    const { data } = await authApi.refreshToken();
    if (!data?.accessToken || data.accessToken.split('.').length !== 3) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function switchActiveCustomer(
  selectedCustomerId: number,
): Promise<RefreshTokenResponse> {
  const accessToken = await SecureStorage.getAccessToken();
  if (!accessToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  const sessionUser = SecureStorage.getSessionUser<SessionUserSnapshot>();
  if (!sessionUser?.userId) {
    throw new Error('Session expired. Please sign in again.');
  }

  // Persist the chosen customer first — subsequent APIs read this from the DB.
  await authApi.setDefaultCustomer(selectedCustomerId);

  // Prefer a server refresh when cookies work (web parity); otherwise keep the
  // current Bearer token and update local defaultCustomerId for the UI.
  const refreshed = await tryCookieRefreshSession();
  const data = refreshed ?? buildLocalScopedSession(
    sessionUser,
    selectedCustomerId,
    accessToken,
  );

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
