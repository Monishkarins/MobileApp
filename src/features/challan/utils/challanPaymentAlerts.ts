/**
 * User-facing alerts for e-Challan payment helpers — mirrors web EchallanContainer
 * notifications for check-status and receipt flows.
 */

import { Alert, Linking } from 'react-native';
import axios from 'axios';
import { challanApi } from '../../../services/api/challanApi';
import { getApiErrorMessage, type ApiError } from '../../../services/api/client';
import { normalizeChallanNo, normalizeChallanVehicleNo } from './challanApiNormalize';

function readHttpStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    return Number((error as ApiError).status) || 0;
  }
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? 0;
  }
  return 0;
}

export async function checkChallanStatus(vehicleNo: string, challanNo: string): Promise<boolean> {
  try {
    const { data: status } = await challanApi.checkStatus({
      vehicleNo: normalizeChallanVehicleNo(vehicleNo),
      challanNo: normalizeChallanNo(challanNo),
    });

    if (status === 'disposed') {
      Alert.alert('PAID', 'Challan has been already paid.');
      return true;
    }
    if (status === 'pending') {
      Alert.alert('PENDING', 'Challan is pending payment. Use Pay to open the payment portal.');
      return true;
    }
    if (status) {
      Alert.alert('UNKNOWN', 'Challan status unknown');
      return true;
    }
    return false;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      Alert.alert('Timeout', 'Request timed out. Please try again.');
      return false;
    }

    const httpStatus = readHttpStatus(error);

    if (httpStatus === 401 || httpStatus === 403) {
      Alert.alert('ULIP Unauthorized', 'You are not authorized.');
      return false;
    }
    if (httpStatus === 500) {
      Alert.alert('ULIP Server Error', 'Something went wrong on the server. Please try again later.');
      return false;
    }
    if (httpStatus === 400) {
      Alert.alert('Invalid Format', '5-11 characters, uppercase letters/digits, no spaces.');
      return false;
    }
    if (httpStatus === 502) {
      Alert.alert('ULIP Server Unavailable', 'Our service is temporarily unavailable. Please try again shortly.');
      return false;
    }
    if (httpStatus === 404) {
      Alert.alert('Not Found', getApiErrorMessage(error, 'Challan not found for this vehicle.'));
      return false;
    }

    Alert.alert('Error!', getApiErrorMessage(error, 'An unexpected error occurred.'));
    return false;
  }
}

export async function openChallanReceipt(requestId: string, challanNumber: string): Promise<void> {
  try {
    const { data } = await challanApi.getPaymentReceipt({ challanNumber, requestId });
    if (data.message === 'succesfully fetched url' && data.url) {
      await Linking.openURL(data.url);
      return;
    }
    Alert.alert('Receipt unavailable', 'No receipt is available for this payment yet.');
  } catch (error) {
    const httpStatus = readHttpStatus(error);
    if (httpStatus && [101, 400, 401, 403, 404, 500].includes(httpStatus)) {
      Alert.alert('Error!', getApiErrorMessage(error, 'Error occurred'));
      return;
    }
    Alert.alert('Error!', getApiErrorMessage(error, 'Error occurred'));
  }
}
