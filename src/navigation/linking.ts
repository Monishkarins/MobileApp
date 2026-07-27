/**
 * Optional deep link when app is opened via web return URL (same path as /status redirect).
 */

import type { LinkingOptions } from '@react-navigation/native';
import type { MainTabParamList } from './types';

export const linking: LinkingOptions<MainTabParamList> = {
  prefixes: [
    'https://fleet.karins.in',
    'https://testfleet.karins.in',
    'http://localhost:3000',
  ],
  config: {
    screens: {
      More: {
        screens: {
          RechargeStatus: 'transaction/recharge',
        },
      },
    },
  },
};
