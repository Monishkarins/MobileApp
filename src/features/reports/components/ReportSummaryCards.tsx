/**
 * Period summary cards for toll reports — mirrors web Vehicle/Customer txn card row.
 */

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { formatINR } from '../../../utils/format';
import type { TollReportDateRange } from '../constants/tollReportFilters';
import type { TollReportPeriodCard } from '../../../services/api/reportApi';

export interface ReportSummaryCardConfig {
  title: string;
  dateRange: TollReportDateRange;
  headline: number;
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}

interface ReportSummaryCardsProps {
  cards: ReportSummaryCardConfig[];
  activeDateRange?: TollReportDateRange | '';
  onSelect: (dateRange: TollReportDateRange) => void;
}

export function buildVehicleSummaryCards(cards?: {
  today?: TollReportPeriodCard;
  yesterday?: TollReportPeriodCard;
  thisWeek?: TollReportPeriodCard;
  thisMonth?: TollReportPeriodCard;
}): ReportSummaryCardConfig[] {
  return [
    {
      title: 'Today',
      dateRange: 'today',
      headline: cards?.today?.debitAmount ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.today?.noOfTolls ?? 0,
      rightLabel: 'Credit',
      rightValue: cards?.today?.creditAmount ?? 0,
    },
    {
      title: 'Yesterday',
      dateRange: 'yesterday',
      headline: cards?.yesterday?.debitAmount ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.yesterday?.noOfTolls ?? 0,
      rightLabel: 'Credit',
      rightValue: cards?.yesterday?.creditAmount ?? 0,
    },
    {
      title: 'This Week',
      dateRange: 'last7',
      headline: cards?.thisWeek?.debitAmount ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.thisWeek?.noOfTolls ?? 0,
      rightLabel: 'Credit',
      rightValue: cards?.thisWeek?.creditAmount ?? 0,
    },
    {
      title: 'This Month',
      dateRange: 'thisMonth',
      headline: cards?.thisMonth?.debitAmount ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.thisMonth?.noOfTolls ?? 0,
      rightLabel: 'Credit',
      rightValue: cards?.thisMonth?.creditAmount ?? 0,
    },
  ];
}

export function buildCustomerSummaryCards(cards?: {
  today?: TollReportPeriodCard;
  yesterday?: TollReportPeriodCard;
  thisWeek?: TollReportPeriodCard;
  thisMonth?: TollReportPeriodCard;
}): ReportSummaryCardConfig[] {
  return [
    {
      title: 'Today',
      dateRange: 'today',
      headline: cards?.today?.tollExpenses ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.today?.noOfTolls ?? 0,
      rightLabel: 'Claim Amt',
      rightValue: cards?.today?.claimAmount ?? 0,
    },
    {
      title: 'Yesterday',
      dateRange: 'yesterday',
      headline: cards?.yesterday?.tollExpenses ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.yesterday?.noOfTolls ?? 0,
      rightLabel: 'Claim Amt',
      rightValue: cards?.yesterday?.claimAmount ?? 0,
    },
    {
      title: 'This Week',
      dateRange: 'last7',
      headline: cards?.thisWeek?.tollExpenses ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.thisWeek?.noOfTolls ?? 0,
      rightLabel: 'Claim Amt',
      rightValue: cards?.thisWeek?.claimAmount ?? 0,
    },
    {
      title: 'This Month',
      dateRange: 'thisMonth',
      headline: cards?.thisMonth?.tollExpenses ?? 0,
      leftLabel: 'Tolls',
      leftValue: cards?.thisMonth?.noOfTolls ?? 0,
      rightLabel: 'Claim Amt',
      rightValue: cards?.thisMonth?.claimAmount ?? 0,
    },
  ];
}

export default function ReportSummaryCards({ cards, activeDateRange, onSelect }: ReportSummaryCardsProps) {
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
              <Text style={styles.headline}>{formatINR(card.headline)}</Text>
              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>{card.leftLabel}</Text>
                  <Text style={styles.footerValue}>{card.leftValue}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerLabel}>{card.rightLabel}</Text>
                  <Text style={styles.footerValue}>{formatINR(card.rightValue)}</Text>
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
  title: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  headline: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.infoLight, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  footerItem: { flex: 1, gap: 2 },
  footerLabel: { fontSize: FontSize.xs, color: Colors.text.subtle },
  footerValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.infoLight },
});
