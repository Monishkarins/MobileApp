/**
 * Standalone Recharge screen — wallet top-up flow (separate from the Wallet
 * transaction history list). ADMIN, CUSTOMER, and CUSTOMER_GROUP_ADMIN — same
 * roles as web SideNav /transaction/recharge. CGA uses header-switched session.
 */

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  LiquidBackground, ScreenHeader, UnauthorizedScreen,
} from '../../../components';
import { Colors } from '../../../theme';
import { useAppSelector } from '../../../store';
import { canAccessRecharge } from '../../../types/auth';
import WalletRechargeTab from '../../wallet/components/WalletRechargeTab';

export default function RechargeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAppSelector((s) => s.auth);
  const canRecharge = canAccessRecharge(user?.roleKey);

  return (
    <LiquidBackground>
      <ScreenHeader title="Recharge" showBack />
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          !canRecharge ? (
            <UnauthorizedScreen message="Recharge is available to Admin, Customer, and Customer Group Admin accounts only." />
          ) : (
            <WalletRechargeTab
              roleKey={user?.roleKey}
              onRechargeStarted={(payload) => nav.navigate('RechargeStatus', payload)}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => {}} tintColor={Colors.blue} />
        }
        showsVerticalScrollIndicator={false}
      />
    </LiquidBackground>
  );
}
