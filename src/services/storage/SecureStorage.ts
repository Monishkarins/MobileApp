import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { clearHttpCookies } from '../auth/httpCookies';

// MMKV for non-sensitive cache (last dashboard snapshot, etc.)
export const mmkvCache = new MMKV({ id: 'karins-fleet-cache' });

// Separate store for the restore gate — not wiped by mmkvCache.clearAll() so logout
// can block cold-start re-login even if a cookie refresh writes a stray token.
const authMeta = new MMKV({ id: 'karins-fleet-auth-meta' });
const CAN_RESTORE_SESSION_KEY = 'can_restore_session';
/** Device-level — remembers the mobile used for quick PIN login. */
const PIN_LOGIN_MOBILE_KEY = 'pin_login_mobile_number';
const PIN_LOGIN_ENABLED_KEY = 'pin_login_enabled';

const KEYCHAIN_SERVICE = 'com.karins.fleet';
const KEYCHAIN_KEYS = {
  accessToken: 'access_token',
  deviceId: 'device_id',
} as const;

// Non-secret session metadata (role, customer, display name) kept in MMKV so the
// app can rehydrate the logged-in user on cold start without a network round-trip.
const SESSION_USER_KEY = 'session_user';
const DASHBOARD_CONTEXT_KEY = 'dashboard_context';

// Last successful password login mobile — used for PIN setup and quick login.
const LAST_LOGIN_MOBILE_KEY = 'last_login_mobile';

export const SecureStorage = {
  // ── Access Token ─────────────────────────────────────────────────────────
  async setAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword(
      KEYCHAIN_KEYS.accessToken,
      token,
      {
        service: KEYCHAIN_SERVICE,
        // WHEN_UNLOCKED is more reliable on release Android APKs than device-only scope.
        accessible: Platform.OS === 'android'
          ? Keychain.ACCESSIBLE.WHEN_UNLOCKED
          : Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  },

  async getAccessToken(): Promise<string | null> {
    try {
      const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (creds && creds.username === KEYCHAIN_KEYS.accessToken) return creds.password;
      return null;
    } catch {
      return null;
    }
  },

  async removeAccessToken(): Promise<void> {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  },

  // ── Quick PIN login preference (device-level) ────────────────────────────
  isPinLoginEnabled(): boolean {
    return mmkvCache.getBoolean(PIN_LOGIN_ENABLED_KEY) ?? false;
  },

  setPinLoginEnabled(enabled: boolean): void {
    if (enabled) {
      mmkvCache.set(PIN_LOGIN_ENABLED_KEY, true);
    } else {
      mmkvCache.delete(PIN_LOGIN_ENABLED_KEY);
    }
  },

  setPinLoginMobile(mobile: string): void {
    mmkvCache.set(PIN_LOGIN_MOBILE_KEY, mobile);
  },

  getPinLoginMobile(): string | null {
    return mmkvCache.getString(PIN_LOGIN_MOBILE_KEY) ?? null;
  },

  clearPinLoginMobile(): void {
    mmkvCache.delete(PIN_LOGIN_MOBILE_KEY);
  },

  setLastLoginMobile(mobile: string): void {
    mmkvCache.set(LAST_LOGIN_MOBILE_KEY, mobile);
  },

  getLastLoginMobile(): string | null {
    return mmkvCache.getString(LAST_LOGIN_MOBILE_KEY) ?? null;
  },

  // ── Session User (non-secret display/routing metadata) ───────────────────
  // Persisted alongside the Keychain token so a cold start can restore the
  // session UI immediately; the token in Keychain remains the source of truth.
  setSessionUser(user: unknown): void {
    mmkvCache.set(SESSION_USER_KEY, JSON.stringify(user));
  },

  getSessionUser<T>(): T | null {
    const raw = mmkvCache.getString(SESSION_USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; }
    catch { return null; }
  },

  clearSessionUser(): void {
    mmkvCache.delete(SESSION_USER_KEY);
  },

  // ── Device ID ────────────────────────────────────────────────────────────
  async setDeviceId(id: string): Promise<void> {
    await Keychain.setInternetCredentials(
      KEYCHAIN_KEYS.deviceId,
      KEYCHAIN_KEYS.deviceId,
      id,
    );
  },

  async getDeviceId(): Promise<string | null> {
    try {
      const creds = await Keychain.getInternetCredentials(KEYCHAIN_KEYS.deviceId);
      return creds ? creds.password : null;
    } catch {
      return null;
    }
  },

  /** Marks whether cold start may rehydrate a saved session. */
  setSessionRestorable(canRestore: boolean): void {
    authMeta.set(CAN_RESTORE_SESSION_KEY, canRestore);
  },

  isSessionRestorable(): boolean {
    return authMeta.getBoolean(CAN_RESTORE_SESSION_KEY) ?? false;
  },

  /** True once the user has signed in or out with the restore gate in place. */
  hasSessionRestorePreference(): boolean {
    return authMeta.contains(CAN_RESTORE_SESSION_KEY);
  },

  /** Drop any saved credentials before a fresh password sign-in. */
  async prepareForSignIn(): Promise<void> {
    SecureStorage.setSessionRestorable(false);
    await clearHttpCookies();
    await SecureStorage.removeAccessToken();
    SecureStorage.clearSessionUser();
  },

  /**
   * Full local sign-out — removes tokens and session user only.
   * PIN login preference is kept so the login screen can still offer PIN sign-in.
   */
  async clearSession(): Promise<void> {
    SecureStorage.setSessionRestorable(false);
    await clearHttpCookies();
    await SecureStorage.removeAccessToken();
    SecureStorage.clearSessionUser();
    mmkvCache.delete(DASHBOARD_CONTEXT_KEY);
  },

  // ── Clear All (on logout) ────────────────────────────────────────────────
  async clearAll(): Promise<void> {
    const pinLoginEnabled = SecureStorage.isPinLoginEnabled();
    const pinLoginMobile = SecureStorage.getPinLoginMobile();
    const lastLoginMobile = SecureStorage.getLastLoginMobile();

    await SecureStorage.clearSession();
    mmkvCache.clearAll();

    if (pinLoginEnabled && pinLoginMobile) {
      SecureStorage.setPinLoginEnabled(true);
      SecureStorage.setPinLoginMobile(pinLoginMobile);
    }
    if (lastLoginMobile) {
      SecureStorage.setLastLoginMobile(lastLoginMobile);
    }
  },
};

// ── MMKV Cache Helpers ────────────────────────────────────────────────────
export const Cache = {
  setJSON<T>(key: string, value: T): void {
    mmkvCache.set(key, JSON.stringify(value));
  },

  getJSON<T>(key: string): T | null {
    const v = mmkvCache.getString(key);
    if (!v) return null;
    try { return JSON.parse(v) as T; }
    catch { return null; }
  },

  set(key: string, value: string | number | boolean): void {
    if (typeof value === 'string') mmkvCache.set(key, value);
    else if (typeof value === 'number') mmkvCache.set(key, value);
    else mmkvCache.set(key, value);
  },

  getString(key: string): string | null {
    return mmkvCache.getString(key) ?? null;
  },

  delete(key: string): void {
    mmkvCache.delete(key);
  },
};
