/**
 * Reports hub — entry point for toll, wallet and incentive reports (web Fastag › Reports parity).
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LiquidBackground, GlassCard, ScreenHeader } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import type { MoreStackParamList } from '../../../navigation/types';

type ReportScreen = keyof Pick<
  MoreStackParamList,
  'VehicleTollSummary' | 'CustomerTollSummary' | 'IncentiveReport' | 'WalletTransactionReport'
>;

const REPORT_ITEMS: Array<{
  key: string;
  title: string;
  desc: string;
  screen: ReportScreen;
}> = [
  {
    key: 'vehicle-toll-summary',
    title: 'Vehicle Toll Transactions Summary',
    desc: 'Per-vehicle toll debit/credit totals grouped by month.',
    screen: 'VehicleTollSummary',
  },
  {
    key: 'customer-toll-summary',
    title: 'Customer Toll Transactions Summary',
    desc: 'Customer-level toll expenses, claim amounts and balance summary.',
    screen: 'CustomerTollSummary',
  },
  {
    key: 'wallet-transaction-report',
    title: 'Wallet Transactions',
    desc: 'FASTag and corporate wallet credits, debits and balance history.',
    screen: 'WalletTransactionReport',
  },
  {
    key: 'incentive-report',
    title: 'Incentive Report',
    desc: 'Quarterly incentive amounts, adjustments and payment status.',
    screen: 'IncentiveReport',
  },
];

export default function ReportsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  const handleNavigate = (screen: ReportScreen) => {
    nav.navigate(screen);
  };

  return (
    <LiquidBackground>
      <ScreenHeader title="Fastag Reports" subtitle="Fleet toll, wallet & incentive reports" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {REPORT_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            onPress={() => handleNavigate(item.screen)}
          >
            <GlassCard style={styles.row}>
              <View style={styles.rowInner}>
                <Text style={styles.icon}>📊</Text>
                <View style={styles.rowText}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[6], gap: Spacing[3] },
  row: { padding: Spacing[3] },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  icon: { fontSize: 22 },
  rowText: { flex: 1 },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  desc: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
  chevron: { fontSize: FontSize.xl, color: Colors.text.subtle },
});
