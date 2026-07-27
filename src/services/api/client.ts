import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../config/env';
import { SecureStorage } from '../storage/SecureStorage';

// fleet.karins.in serves the web SPA (nginx returns 405 on POST); API lives on testapi.
const BASE_URL = API_BASE_URL;
const TIMEOUT_MS = 15_000;

// Queue of requests waiting for token refresh
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// After sign-out or before password sign-in, block silent cookie refresh — otherwise
// the HTTP-only refresh cookie resurrects a cleared Keychain session.
let sessionInvalidated = true;
let sessionActivatedAt = 0;
const SESSION_LOGOUT_GRACE_MS = 20_000;

export function invalidateApiSession(): void {
  sessionInvalidated = true;
  sessionActivatedAt = 0;
}

export function markApiSessionActive(): void {
  sessionInvalidated = false;
  sessionActivatedAt = Date.now();
}

function canForceLogoutFromInterceptor(): boolean {
  if (!SecureStorage.isSessionRestorable()) return false;
  if (sessionActivatedAt <= 0) return true;
  return Date.now() - sessionActivatedAt > SESSION_LOGOUT_GRACE_MS;
}

function processQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  refreshQueue = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  withCredentials: true, // send HTTP-only cookie for refresh token
  headers: {
    'Content-Type': 'application/json',
    'X-App-Platform': 'mobile',
    'X-App-Version': process.env.KARINS_APP_VERSION ?? '2.1.0',
  },
});

// Routes that must not carry a stale Bearer token (e.g. after logout).
const PUBLIC_AUTH_PATHS = [
  '/auth/signIn',
  '/auth/mobile/refresh',
  // Password reset runs while signed out; a leftover token here would make the
  // server scope the reset to the old session instead of the submitted number.
  '/user/forgot-password',
  '/auth/sendOtp',
  // Request Demo (web /signup) — public lead capture before any session exists.
  '/enquiry/submit',
  // Featured module list for the demo form; admin create/update live under
  // /product/create and /product/update/:id and must still send Bearer.
  '/product',
];

// 401 on these paths must never trigger cookie refresh (wrong password, logout, etc.).
const NO_REFRESH_ON_401_PATHS = [
  ...PUBLIC_AUTH_PATHS,
  '/auth/mobile/logout',
  '/auth/mobile/revoke-device',
];

/**
 * Strip query/hash so `/product?featured=true` matches `/product` while
 * `/product/create` does not — includes()-based matching would treat both
 * as public and drop the admin Bearer token on mutations.
 */
function requestPathname(url?: string): string {
  if (!url) return '';
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).pathname;
    }
  } catch {
    // Fall through to the relative-path branch below.
  }
  return url.split('?')[0].split('#')[0];
}

function pathMatchesExact(url: string | undefined, candidates: string[]): boolean {
  const pathname = requestPathname(url);
  return candidates.some((candidate) => (
    pathname === candidate || pathname.endsWith(candidate)
  ));
}

function isPublicAuthRequest(url?: string): boolean {
  return pathMatchesExact(url, PUBLIC_AUTH_PATHS);
}

function shouldAttemptTokenRefresh(url?: string): boolean {
  if (!url) return false;
  if (sessionInvalidated) return false;
  if (pathMatchesExact(url, NO_REFRESH_ON_401_PATHS)) return false;
  return true;
}

/** Mobile sign-in stores Bearer tokens; cookie refresh may be unavailable on APK. */
async function refreshAccessTokenWithBearer(): Promise<string | null> {
  const existingToken = await SecureStorage.getAccessToken();
  if (!existingToken) return null;

  try {
    const res = await axios.post<{ accessToken?: string }>(
      `${BASE_URL}/auth/refreshToken`,
      { accessToken: existingToken },
      {
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'X-App-Platform': 'mobile',
          'X-App-Version': process.env.KARINS_APP_VERSION ?? '2.1.0',
        },
      },
    );
    return res.data.accessToken ?? null;
  } catch {
    return null;
  }
}

async function refreshAccessTokenWithCookie(): Promise<string | null> {
  try {
    const res = await axios.post<{ accessToken: string }>(
      `${BASE_URL}/auth/mobile/refresh`,
      {},
      { withCredentials: true, timeout: TIMEOUT_MS },
    );
    return res.data.accessToken ?? null;
  } catch {
    return null;
  }
}

async function persistRefreshedAccessToken(newToken: string): Promise<void> {
  if (SecureStorage.isSessionRestorable()) {
    await SecureStorage.setAccessToken(newToken);
  }
}

// ── Request interceptor: inject access token ─────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicAuthRequest(config.url)) {
      return config;
    }

    const token = await SecureStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Default JSON Content-Type breaks binary export GETs on some gateways —
    // drop it when the caller asked for an arraybuffer/blob body.
    if (
      config.responseType === 'arraybuffer'
      || config.responseType === 'blob'
    ) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401, refresh token ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!shouldAttemptTokenRefresh(originalRequest.url)) {
        return Promise.reject(normalizeError(error));
      }

      const storedToken = await SecureStorage.getAccessToken();
      if (!storedToken) {
        return Promise.reject(normalizeError(error));
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let newToken = await refreshAccessTokenWithBearer();
        if (!newToken) {
          newToken = await refreshAccessTokenWithCookie();
        }
        if (!newToken) {
          throw new Error('Session refresh failed');
        }

        await persistRefreshedAccessToken(newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        invalidateApiSession();
        if (canForceLogoutFromInterceptor()) {
          await SecureStorage.clearAll();
          require('../../store').store.dispatch(
            require('../../store/slices/authSlice').logout(),
          );
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/** Reads user-facing text from normalized ApiError or raw axios failures. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message
      ?? error.response?.data?.error
      ?? error.message
      ?? fallback
    );
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Decode JSON error bodies when the request used responseType: 'arraybuffer'. */
function messageFromResponseData(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as { message?: string; error?: string };
      return parsed.message || parsed.error || data.slice(0, 200);
    } catch {
      return data.slice(0, 200);
    }
  }
  if (typeof data === 'object' && !(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
    const obj = data as { message?: string; error?: string; code?: string };
    return obj.message || obj.error;
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    try {
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer);
      const text = String.fromCharCode(...bytes.subarray(0, Math.min(bytes.byteLength, 4000)));
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed) as { message?: string; error?: string };
        return parsed.message || parsed.error;
      }
      if (trimmed) return trimmed.slice(0, 200);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return {
      status: error.response?.status ?? 0,
      message:
        messageFromResponseData(data) ??
        error.message ??
        'Network error',
      code: typeof data === 'object' && data && 'code' in data
        ? String((data as { code?: string }).code ?? '')
        : undefined,
    };
  }
  return { status: 0, message: String(error) };
}
