/**
 * Lazy Firebase Messaging access — avoids crashing when google-services.json is missing.
 */

import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

type MessagingModule = typeof import('@react-native-firebase/messaging').default;

let messagingModule: MessagingModule | null | undefined;

function loadMessagingModule(): MessagingModule | null {
  if (messagingModule !== undefined) return messagingModule;

  try {
    const firebaseApp = require('@react-native-firebase/app').default;
    firebaseApp.app();
    messagingModule = require('@react-native-firebase/messaging').default;
  } catch {
    messagingModule = null;
  }

  return messagingModule ?? null;
}

export function loadMessagingModuleForAuthStatus(): MessagingModule | null {
  return loadMessagingModule();
}

/** True when Firebase was initialised from google-services.json / GoogleService-Info.plist. */
export function isFirebaseMessagingAvailable(): boolean {
  return loadMessagingModule() !== null;
}

export function getMessagingInstance() {
  const moduleRef = loadMessagingModule();
  if (!moduleRef) return null;

  try {
    return moduleRef();
  } catch {
    return null;
  }
}

export function registerBackgroundMessageHandler(
  handler: (message: FirebaseMessagingTypes.RemoteMessage) => Promise<void>,
): void {
  const moduleRef = loadMessagingModule();
  if (!moduleRef) return;

  try {
    moduleRef().setBackgroundMessageHandler(handler);
  } catch {
    /* push disabled */
  }
}
