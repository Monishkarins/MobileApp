/**
 * Typed environment + feature flags.
 *
 * SECURITY / CORRECTNESS:
 * - Mock data is gated to DEV builds only. In a release build `__DEV__` is
 *   `false`, so `ENABLE_MOCK_DATA` is always `false` — mock data can never ship.
 * - The API base URL is read from the native env when provided, otherwise the
 *   production host used by the Android APK.
 */

declare const __DEV__: boolean;

export const IS_DEV: boolean =
  typeof __DEV__ !== 'undefined' ? __DEV__ : false;

/**
 * Mock/demo data flag. DEV-ONLY by construction — never true in release.
 * Flip to `false` even in dev once live list endpoints are wired.
 */
export const ENABLE_MOCK_DATA: boolean = IS_DEV;

/**
 * API base URL — same production host as the working Android APK.
 * Override at build time via KARINS_API_URL if needed.
 */
export const API_BASE_URL: string =
  (typeof process !== 'undefined' && process.env && process.env.KARINS_API_URL) ||
  'https://api.karins.in/api';

/** Network request timeout (ms). */
export const API_TIMEOUT_MS = 20000;

/** Block the app on rooted/jailbroken devices (vs. warn). Controlled by env. */
export const BLOCK_ON_ROOT: boolean =
  typeof process !== 'undefined' &&
  !!process.env &&
  process.env.KARINS_BLOCK_ON_ROOT === 'true';


  //https://testapi.karins.in/api
  //https://api.karins.in/api
