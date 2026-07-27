/**
 * Wallet menu — balance card plus a single Recent Transactions feed that
 * merges wallet debits/credits and recharge history, newest first.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  walletApi,
  mapWalletTransactionRow,
  mapRechargeTransactionRow,
  mergeRecentWalletTransactions,
} from '../../../services/api/walletApi';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, SkeletonCard, EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { formatINR, fmtDateTime } from '../../../utils/format';
import { canAccessRecharge, requiresAdminContextPicker } from '../../../types/auth';
import type { WalletTransaction } from '../../../types/dashboard';
import WalletBalanceCard from '../../dashboard/components/WalletBalanceCard';
import { useDashboardWallet } from '../hooks/useDashboardWallet';

const RECENT_PAGE_SIZE = 30;

function TransactionDivider() {
  return <View style={styles.divider} />;
}

export default function WalletScreen() {
  const nav = useNavigation<any>();
  const { user } = useAppSelector((s) => s.auth);
  const {
    wallet,
    loading: walletLoading,
    refreshing: walletRefreshing,
    error: walletError,
    customerId,
    needsCustomerScope,
    refetch: refetchWallet,
  } = useDashboardWallet();

  const canScopeByCustomerId = requiresAdminContextPicker(user?.roleKey);
  const canRecharge = canAccessRecharge(user?.roleKey);

  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (needsCustomerScope && !customerId) return;
    isRefresh ? setRefreshing(true) : setTxnsLoading(true);

    const scopeParams = canScopeByCustomerId && customerId ? { customerId } : {};

    try {
      const [walletRes, rechargeRes] = await Promise.all([
        walletApi.getTransactions({
          pageNo: 1,
          pageSize: RECENT_PAGE_SIZE,
          ...scopeParams,
        }),
        walletApi.getRecharges({
          pageNo: 1,
          pageSize: RECENT_PAGE_SIZE,
          ...scopeParams,
        }),
      ]);

      const walletRows = (walletRes.data.rows ?? []).map(mapWalletTransactionRow);
      const rechargeRows = (rechargeRes.data.rows ?? []).map(mapRechargeTransactionRow);
      setTxns(mergeRecentWalletTransactions(walletRows, rechargeRows));
    } catch {
      setTxns([]);
    } finally {
      setTxnsLoading(false);
      setRefreshing(false);
    }
  }, [canScopeByCustomerId, customerId, needsCustomerScope]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchWallet(true),
      fetchTransactions(true),
    ]);
    setRefreshing(false);
  }, [refetchWallet, fetchTransactions]);

  const renderTxn = ({ item }: { item: WalletTransaction }) => (
    <View style={styles.txnRow}>
      <View style={[styles.txnIcon, item.transactionType === 'CR' ? styles.txnIconCr : styles.txnIconDr]}>
        <Text style={styles.txnArrow}>{item.transactionType === 'CR' ? '↑' : '↓'}</Text>
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnDesc} numberOfLines={1}>{item.description}</Text>
        {item.vehicleNo ? (
          <Text style={styles.txnVehicle}>{item.vehicleNo}</Text>
        ) : null}
        <Text style={styles.txnDate}>{fmtDateTime(item.transactionDate)}</Text>
      </View>
      <Text style={[styles.txnAmount, item.transactionType === 'CR' ? styles.txnAmtCr : styles.txnAmtDr]}>
        {item.transactionType === 'CR' ? '+' : '-'}{formatINR(item.amount)}
      </Text>
    </View>
  );

  const isLoading = walletLoading || txnsLoading;
  const isRefreshing = walletRefreshing || refreshing;

  const listHeader = (
    <>
      {needsCustomerScope && !customerId ? (
        <GlassCard style={styles.promptCard}>
          <Text style={styles.promptTitle}>Select a customer</Text>
          <Text style={styles.promptText}>
            Go to Dashboard and select a customer to view this wallet.
          </Text>
        </GlassCard>
      ) : (
        <>
          <WalletBalanceCard
            wallet={wallet}
            loading={walletLoading}
            onRecharge={canRecharge ? () => nav.navigate('Recharge') : undefined}
            style={styles.balanceCard}
          />
          {walletError ? (
            <GlassCard variant="danger" style={styles.errorCard}>
              <Text style={styles.errorText}>{walletError}</Text>
            </GlassCard>
          ) : null}
        </>
      )}

      <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>
    </>
  );

  return (
    <LiquidBackground>
      <ScreenHeader title="Wallet" showBack />
      <FlatList
        data={txns}
        keyExtractor={(t, i) => `${t.source ?? 'wallet'}-${t.referenceNo || t.transactionDate}-${t.id}-${i}`}
        renderItem={renderTxn}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.blue}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: Spacing[4], gap: 8 }}>
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState title="No transactions" icon="💳" />
          )
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={TransactionDivider}
        showsVerticalScrollIndicator={false}
      />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  balanceCard: { marginHorizontal: Spacing[4] },
  promptCard: { marginHorizontal: Spacing[4], marginBottom: Spacing[3], padding: Spacing[4] },
  promptTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  promptText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  errorCard: { marginHorizontal: Spacing[4], marginBottom: Spacing[3], padding: Spacing[3] },
  errorText: { color: Colors.dangerLight, fontSize: FontSize.sm },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.label,
    letterSpacing: 1.2,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    marginTop: Spacing[3],
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing[4],
    paddingVertical: 12,
  },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txnIconCr: { backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.successBorder },
  txnIconDr: { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder },
  txnArrow: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  txnInfo: { flex: 1, gap: 2 },
  txnDesc: { fontSize: FontSize.base, fontWeight: '600', color: Colors.white },
  txnVehicle: { fontSize: FontSize.sm, color: Colors.text.secondary, fontFamily: 'monospace' },
  txnDate: { fontSize: FontSize.xs, color: Colors.text.subtle },
  txnAmount: { fontSize: FontSize.base, fontWeight: '700' },
  txnAmtCr: { color: Colors.successLight },
  txnAmtDr: { color: Colors.dangerLight },
  divider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing[4] },
});
