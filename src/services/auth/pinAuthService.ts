/**
 * PIN quick-login helpers — account PIN is verified server-side; this module only
 * tracks device preference and coordinates sign-in with /auth/pin/signIn.
 */

import { authApi } from '../api/authApi';
import { SecureStorage } from '../storage/SecureStorage';
import type { LoginResponse } from '../../types/auth';

export type PinSignInResult =
  | { status: 'success'; sessionData: LoginResponse }
  | { status: 'error'; message: string };

export async function fetchPinStatus(mobileNumber: string): Promise<boolean> {
  try {
    const { data } = await authApi.pinStatus(mobileNumber);
    return data.hasPinSet;
  } catch {
    return false;
  }
}

export async function isPinLoginReady(): Promise<boolean> {
  const mobile =
    SecureStorage.getPinLoginMobile() ?? SecureStorage.getLastLoginMobile();

  if (!mobile || mobile.length !== 10) return false;
  if (!SecureStorage.isPinLoginEnabled()) return false;

  return fetchPinStatus(mobile);
}

export async function signInWithPinLogin(
  mobileNumber: string,
  pin: string,
): Promise<PinSignInResult> {
  if (!mobileNumber || mobileNumber.length !== 10) {
    return { status: 'error', message: 'Enter a valid 10-digit mobile number first.' };
  }

  try {
    const { data } = await authApi.pinSignIn({ mobileNumber, pin });
    return { status: 'success', sessionData: data };
  } catch (error: any) {
    return {
      status: 'error',
      message: error?.message ?? 'PIN sign-in failed.',
    };
  }
}

export function enablePinLogin(mobileNumber: string): void {
  SecureStorage.setPinLoginEnabled(true);
  SecureStorage.setPinLoginMobile(mobileNumber);
}

export function disablePinLogin(): void {
  SecureStorage.setPinLoginEnabled(false);
}

export async function syncPinLoginPreference(mobileNumber: string): Promise<void> {
  const hasPinSet = await fetchPinStatus(mobileNumber);
  if (hasPinSet) {
    enablePinLogin(mobileNumber);
  } else {
    disablePinLogin();
  }
}
