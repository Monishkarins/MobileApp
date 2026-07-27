/**
 * Registers this handset with the Karins backend so FCM can target it.
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { authApi } from '../api/authApi';
import { SecureStorage } from '../storage/SecureStorage';
import { isFirebaseMessagingAvailable } from './messagingProvider';
import { pushService } from './pushService';

/** Request permission, fetch FCM token, and POST /auth/mobile/register-device. */
export async function registerPushDevice(): Promise<boolean> {
  // Channel must exist before any FCM notification payload lands in the tray.
  await pushService.ensureAndroidChannel();

  const hasPermission = await pushService.ensureNotificationPermission();
  if (!hasPermission && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    if (__DEV__) {
      console.warn('[FCM] POST_NOTIFICATIONS denied — token not registered');
    }
    return false;
  }

  if (!isFirebaseMessagingAvailable()) {
    if (__DEV__) {
      console.warn('[FCM] Firebase Messaging unavailable — check google-services.json');
    }
    return false;
  }

  try {
    const fcmPermission = await pushService.requestPermission();
    if (!fcmPermission && Platform.OS === 'ios') {
      return false;
    }

    const fcmToken = await pushService.getToken();
    if (!fcmToken) {
      if (__DEV__) {
        console.warn('[FCM] getToken() returned empty — device not registered');
      }
      return false;
    }

    const deviceId = await DeviceInfo.getUniqueId();
    await SecureStorage.setDeviceId(deviceId);

    await authApi.registerDevice({
      deviceId,
      deviceModel: DeviceInfo.getModel(),
      osVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      fcmToken,
      ...(Platform.OS === 'ios' ? { apnsToken: fcmToken } : {}),
    });

    if (__DEV__) {
      console.log('[FCM] Device registered with backend');
    }
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[FCM] registerPushDevice failed', error);
    }
    return false;
  }
}
