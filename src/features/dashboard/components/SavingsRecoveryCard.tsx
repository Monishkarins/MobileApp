/**
 * Savings & Recovery card — FY toggle plus the savings figures shown as compact
 * stat cards (total savings, claims recovered, incentive when enabled).
 * Each stat deep-links to its menu (Claims / Incentive Report).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, Spacing, Radius } from '../../../theme';
import { formatINR } from '../../../utils/format';
import type { FySavingsSummary } from '../utils/fySavingsUtils';
import { dashboardHeader, dashboardSubheading, dashboardContentFont, DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';

type SavingsRange = 'fy' | 'last';

/** Which destination a savings tile opens. */
export type SavingsNavTarget = 'claims' | 'incentive';

interface SavingsRecoveryCardProps {
  fySavings: FySavingsSummary | null;
  loading?: boolean;
  /** Customer is on the incentive program — always show Incentive Paid (₹0 when none paid). */
  hasIncentiveProgram?: boolean;
  /** Opens Claims (recovered/total) or Incentive Report for the matching tile. */
  onNavigate?: (target: SavingsNavTarget) => void;
}

interface SavingsStat {
  key: string;
  label: string;
  value: number;
  color: string;
  target: SavingsNavTarget;
}

/** Fixed label height keeps currency values aligned across cards in a row. */
const STAT_LABEL_LINES = 2;
const STAT_LABEL_LINE_HEIGHT = 12;
const STAT_LABEL_BOX_HEIGHT = STAT_LABEL_LINES * STAT_LABEL_LINE_HEIGHT;

/** Single savings figure — grid tile on wide screens, full-width row when cramped. */
function StatCard({
  label,
  value,
  color,
  compact,
  onPress,
}: {
  label: string;
  value: number;
  color: string;
  compact?: boolean;
  onPress?: () => void;
}) {
  const amount = formatINR(value, true);
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.75, accessibilityRole: 'button' as const }
    : {};

  if (compact) {
    return (
      <Wrapper style={styles.statRow} {...wrapperProps}>
        <Text style={styles.statRowLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text
          style={[styles.statRowValue, { color }, onPress && styles.statValueTap]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {amount}
        </Text>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={styles.statCard} {...wrapperProps}>
      <View style={styles.statLabelBox}>
        <Text style={styles.statLabel} numberOfLines={STAT_LABEL_LINES}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.statValue, { color }, onPress && styles.statValueTap]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {amount}
      </Text>
    </Wrapper>
  );
}

function SavingsRecoveryCard({
  fySavings,
  loading,
  hasIncentiveProgram = false,
  onNavigate,
}: SavingsRecoveryCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [range, setRange] = useState<SavingsRange>('fy');
  const isFy = range === 'fy';

  const yearData = isFy ? fySavings?.thisYear : fySavings?.lastYear;
  const total = yearData?.totalSavings ?? 0;
  const recovered = yearData?.claimsRecovered ?? 0;
  const incentive = hasIncentiveProgram ? (yearData?.incentiveAmount ?? 0) : 0;
  // Keep Incentive Paid visible for program customers even when payout is zero.
  const showIncentiveCard = hasIncentiveProgram;
  const displayTotal = showIncentiveCard ? total : recovered;
  const fyLabel = yearData?.fyLabel ?? '';

  // Total + recovered open Claims; incentive opens the Incentive Report menu.
  const stats: SavingsStat[] = [
    {
      key: 'total',
      label: 'Total Savings',
      value: displayTotal,
      color: Colors.success,
      target: 'claims',
    },
    {
      key: 'recovered',
      label: 'Claims Recovered',
      value: recovered,
      color: Colors.success,
      target: 'claims',
    },
  ];

  if (showIncentiveCard) {
    stats.push({
      key: 'incentive',
      label: 'Incentive Paid',
      value: incentive,
      color: Colors.success,
      target: 'incentive',
    });
  }

  // Three tiles overflow on phones under ~420dp — stack as label/value rows instead.
  const useCompactStats = screenWidth < 420 && stats.length >= 3;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.accent} />

      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.title}>Savings & Recovery</Text>
          {fyLabel ? <Text style={styles.subtitle}>FY {fyLabel}</Text> : null}
        </View>
        <View style={styles.seg}>
          <TouchableOpacity
            style={[styles.segBtn, isFy && styles.segBtnActive]}
            onPress={() => setRange('fy')}
          >
            <Text style={[styles.segText, isFy && styles.segTextActive]}>This FY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, !isFy && styles.segBtnActive]}
            onPress={() => setRange('last')}
          >
            <Text style={[styles.segText, !isFy && styles.segTextActive]}>Last FY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !fySavings ? (
        <Text style={styles.loadingText}>Loading savings…</Text>
      ) : (
        <View style={[styles.statGrid, useCompactStats && styles.statGridCompact]}>
          {stats.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              compact={useCompactStats}
              onPress={onNavigate ? () => onNavigate(stat.target) : undefined}
            />
          ))}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing[3], overflow: 'hidden' },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.yellow,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
    gap: Spacing[2],
  },
  headCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...dashboardHeader,
  },
  subtitle: {
    ...dashboardSubheading,
    marginTop: 2,
  },
  seg: {
    flexDirection: 'row',
    flexShrink: 0,
    backgroundColor: Colors.glass.bgDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    padding: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  segBtnActive: {
    backgroundColor: Colors.infoBg,
  },
  segText: {
    fontSize: dashboardContentFont.xs,
    color: DASHBOARD_LIGHT_WHITE,
    fontWeight: '600',
  },
  segTextActive: {
    color: Colors.infoLight,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: dashboardContentFont.sm,
    color: DASHBOARD_LIGHT_WHITE,
    paddingVertical: Spacing[3],
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  statGridCompact: {
    flexDirection: 'column',
    gap: 6,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.glass.bgDark,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  statLabelBox: {
    height: STAT_LABEL_BOX_HEIGHT,
    justifyContent: 'flex-start',
  },
  statLabel: {
    fontSize: dashboardContentFont.tiny,
    lineHeight: STAT_LABEL_LINE_HEIGHT,
    fontWeight: '400',
    color: DASHBOARD_LIGHT_WHITE,
    letterSpacing: 0.2,
  },
  // Stat numbers stay regular — only the card title is bold.
  statValue: {
    fontSize: dashboardContentFont.sm,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 2,
  },
  statValueTap: {
    textDecorationLine: 'none',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
    backgroundColor: Colors.glass.bgDark,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statRowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: dashboardContentFont.xs,
    lineHeight: 14,
    fontWeight: '400',
    color: DASHBOARD_LIGHT_WHITE,
  },
  statRowValue: {
    flexShrink: 0,
    fontSize: dashboardContentFont.sm,
    fontWeight: '400',
    textAlign: 'right',
    maxWidth: '42%',
  },
});

export default React.memo(SavingsRecoveryCard);
