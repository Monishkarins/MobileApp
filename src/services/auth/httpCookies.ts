/**
 * Clears OkHttp / NSURL cookie jars used by React Native networking.
 * Required on logout — the HTTP-only refresh cookie otherwise survives local
 * Keychain wipes and blocks password sign-in or silently restores the session.
 */

import { NativeModules } from 'react-native';

export function clearHttpCookies(): Promise<void> {
  return new Promise((resolve) => {
    const networking =
      NativeModules.NativeNetworkingAndroid ??
      NativeModules.Networking ??
      NativeModules.RCTNetworking;

    const clear = networking?.clearCookies;
    if (typeof clear !== 'function') {
      resolve();
      return;
    }

    clear((_cleared: boolean) => resolve());
  });
}
