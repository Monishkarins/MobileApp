/**
 * Fleet wallet summary card — shared by Dashboard and Wallet menu so both
 * screens show the same balances, status pill, and recharge entry point.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { GlassCard, StatusPill } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR } from '../../../utils/format';
import { resolveWalletTotalBalance } from '../utils/dashboardSummaryUtils';
import type { WalletInfo } from '../../../types/dashboard';
import { dashboardHeader, dashboardContentFont } from '../dashboardTypography';

interface WalletBalanceCardProps {
  wallet?: WalletInfo | null;
  loading?: boolean;
  onRecharge?: () => void;
  style?: ViewStyle;
}

function walletStatusVariant(
  status?: WalletInfo['walletStatus'],
): 'success' | 'warning' | 'danger' {
  if (status === 'HEALTHY') return 'success';
  if (status === 'LOW') return 'warning';
  return 'danger';
}

function walletStatusLabel(status?: WalletInfo['walletStatus']): string {
  if (status === 'HEALTHY') return 'Healthy';
  return status ?? 'Loading';
}

function formatWalletAmount(amount: number, loading?: boolean, hasData?: boolean): string {
  if (loading && !hasData) return '—';
  return formatINR(amount);
}

function WalletBalanceCard({
  wallet,
  loading,
  onRecharge,
  style,
}: WalletBalanceCardProps) {
  const hasData = wallet != null;
  const totalBalance = resolveWalletTotalBalance(wallet);
  const fastagBalance = wallet?.fastagBalance ?? 0;
  const corporateBalance = wallet?.corporateBalance ?? 0;
  const minimumBalance = wallet?.minimumBalance ?? 0;

  return (
    <GlassCard style={[styles.walletCard, style]} variant="hero" blur blurAmount={18}>
      <View style={styles.walletTop}>
        <View style={styles.walletHero}>
          <Text style={styles.walletLabel}>Total Wallet Balance</Text>
          <Text
            style={styles.walletAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            maxFontSizeMultiplier={1.15}
          >
            {formatWalletAmount(totalBalance, loading, hasData)}
          </Text>
          <StatusPill
            label={loading ? 'Loading' : walletStatusLabel(wallet?.walletStatus)}
            variant={loading ? 'neutral' : walletStatusVariant(wallet?.walletStatus)}
            style={{ marginTop: 6 }}
          />
        </View>
        {onRecharge ? (
          <TouchableOpacity style={styles.rechargeBtn} onPress={onRecharge}>
            <Text style={styles.rechargeBtnText}>Recharge</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Min. balance</Text>
          <Text style={styles.breakdownValue}>
            {formatWalletAmount(minimumBalance, loading, hasData)}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>FASTag</Text>
          <Text style={styles.breakdownValue}>
            {formatWalletAmount(fastagBalance, loading, hasData)}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Corporate</Text>
          <Text style={styles.breakdownValue}>
            {formatWalletAmount(corporateBalance, loading, hasData)}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  walletCard: {marginBottom: Spacing[3], borderColor: Colors.infoBorder},
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  walletHero: { flex: 1, minWidth: 0, paddingRight: Spacing[2] },
  breakdown: {
    marginTop: Spacing[4],
    flexDirection: 'row',
    gap: Spacing[2],
  },
  breakdownItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 66,
    paddingHorizontal: 9,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: 'rgba(0,11,31,0.28)',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: dashboardContentFont.xs,
    color: Colors.text.muted,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: dashboardContentFont.xs,
    // Amounts stay regular — bold is reserved for the wallet heading.
    fontWeight: '400',
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  walletLabel: {
    ...dashboardHeader,
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: FontSize['5xl'],
    fontWeight: '400',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  rechargeBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md,
    minHeight: 40,
    paddingHorizontal: 15,
    paddingVertical: 9,
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  rechargeBtnText: {
    fontSize: dashboardContentFont.sm,
    fontWeight: '700',
    color: Colors.navy,
  },
});

export default React.memo(WalletBalanceCard);
