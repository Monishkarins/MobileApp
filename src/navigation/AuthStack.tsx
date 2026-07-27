/**
 * Auth flow stack — login, OTP, password recovery, and public Request Demo.
 * Screens are imported eagerly so native-stack can mount them inside
 * FrameSizeProvider / navigation context (React.lazy breaks that tree).
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { ErrorBoundary } from '../components';
import LoginScreen from '../features/auth/screens/LoginScreen';
import OTPScreen from '../features/auth/screens/OTPScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import RequestDemoScreen from '../features/auth/screens/RequestDemoScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <ErrorBoundary label="Sign-in ran into a problem">
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          // slide_from_right — fade composites against the Activity window, and
          // Android's default windowBackground is white, which flashes (or sticks)
          // as a blank white screen when pushing Forgot Password / Request Demo.
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#000B1F' },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTPVerify" component={OTPScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="RequestDemo" component={RequestDemoScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
}
