/**
 * Wallet summary cards — web WalletTransactionReport credit/debit card row parity.
 */

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { formatWalletAmount } from '../constants/walletReportFilters';
import type { WalletReportDateRange } from '../constants/walletReportFilters';

export interface WalletSummaryCard {
  title: string;
  dateRange: WalletReportDateRange;
  credit: number;
  debit: number;
}

interface WalletSummaryCardsProps {
  cards: WalletSummaryCard[];
  activeDateRange?: WalletReportDateRange | '';
  onSelect: (dateRange: WalletReportDateRange) => void;
}

export function buildWalletSummaryCards(cards?: {
  today?: { creditAmount?: number; debitAmount?: number };
  yesterday?: { creditAmount?: number; debitAmount?: number };
  thisWeek?: { creditAmount?: number; debitAmount?: number };
  thisMonth?: { creditAmount?: number; debitAmount?: number };
}): WalletSummaryCard[] {
  return [
    {
      title: 'Today',
      dateRange: 'today',
      credit: cards?.today?.creditAmount ?? 0,
      debit: cards?.today?.debitAmount ?? 0,
    },
    {
      title: 'Yesterday',
      dateRange: 'yesterday',
      credit: cards?.yesterday?.creditAmount ?? 0,
      debit: cards?.yesterday?.debitAmount ?? 0,
    },
    {
      title: 'This Week',
      dateRange: 'last7',
      credit: cards?.thisWeek?.creditAmount ?? 0,
      debit: cards?.thisWeek?.debitAmount ?? 0,
    },
    {
      title: 'This Month',
      dateRange: 'thisMonth',
      credit: cards?.thisMonth?.creditAmount ?? 0,
      debit: cards?.thisMonth?.debitAmount ?? 0,
    },
  ];
}

export default function WalletSummaryCards({ cards, activeDateRange, onSelect }: WalletSummaryCardsProps) {
  if (!cards.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {cards.map((card) => {
        const isActive = activeDateRange === card.dateRange;
        return (
          <TouchableOpacity key={card.dateRange} activeOpacity={0.85} onPress={() => onSelect(card.dateRange)}>
            <GlassCard style={[styles.card, isActive && styles.cardActive]}>
              <Text style={styles.title}>{card.title}</Text>
              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Credit</Text>
                  <Text style={styles.footerValue}>{formatWalletAmount(card.credit)}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>Debit</Text>
                  <Text style={styles.footerValue}>{formatWalletAmount(card.debit)}</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing[4], gap: 10, paddingBottom: Spacing[2] },
  card: { width: 168, padding: 12 },
  cardActive: { borderColor: Colors.infoBorder, backgroundColor: Colors.infoBg },
  title: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  footerItem: { flex: 1, gap: 2 },
  footerLabel: { fontSize: FontSize.xs, color: Colors.text.subtle },
  footerValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.infoLight },
});
