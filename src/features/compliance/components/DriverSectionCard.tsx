/**
 * Dashboard DRIVER / SARATHI section — mirrors web FleetDashboard DriverSection:
 * donut-style summary with tappable counts that open the filtered DL list.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import type { DriverStats } from '../../../types/dashboard';
import { getDriverOpenAlertCount } from '../../dashboard/utils/dashboardSummaryUtils';
import {
  buildDLListParams,
  buildDLListParamsFromDashboardStats,
  type DLListNavParams,
  type DriverLicenseFilterKey,
} from '../utils/driverNavigationUtils';
import { dashboardHeader, dashboardSubheading, dashboardContentFont, DASHBOARD_LIGHT_WHITE } from '../../dashboard/dashboardTypography';

interface DriverSectionCardProps {
  drivers: DriverStats | null | undefined;
  onNavigate: (params: DLListNavParams) => void;
}

const LEGENDS: {
  key: DriverLicenseFilterKey;
  label: string;
  color: string;
}[] = [
  { key: 'valid', label: 'Valid', color: '#28A745' },
  { key: 'suspended', label: 'Suspended', color: '#6B7891' },
  { key: 'expiring', label: 'Expiring 30 Days', color: '#F5A623' },
  { key: 'expired', label: 'Expired', color: '#FF2B2B' },
];

// SVG donut geometry — mirrors the web DriverSection ring (viewBox 100x100).
const DONUT_SIZE = 82;
const DONUT_RADIUS = 30;
const DONUT_STROKE = 8;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/**
 * Renders the driver licence split (valid/suspended/expiring/expired) as a
 * coloured donut. Each arc is proportional to its share of the total fleet of
 * drivers, drawn sequentially from the top like the web Sarathi chart.
 */
function DriverDonut({
  values,
  total,
}: {
  values: Record<DriverLicenseFilterKey, number>;
  total: number;
}) {
  // Avoid divide-by-zero when no drivers exist so the base ring still renders.
  const safeTotal = total || 1;
  let accumulated = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg viewBox="0 0 100 100" width={DONUT_SIZE} height={DONUT_SIZE}>
        {/* Base ring fills the gaps left by empty/partial segments. */}
        <Circle
          cx={50}
          cy={50}
          r={DONUT_RADIUS}
          fill="none"
          stroke={Colors.glass.border}
          strokeWidth={DONUT_STROKE}
        />
        {total > 0
          ? LEGENDS.map((leg) => {
            const value = values[leg.key] ?? 0;
            const dash = (value / safeTotal) * DONUT_CIRCUMFERENCE;
            // Quarter-turn offset starts the first arc at 12 o'clock.
            const offset = DONUT_CIRCUMFERENCE / 4 - accumulated;
            accumulated += dash;
            // Skip zero-value categories so they don't draw a stray dot.
            if (dash <= 0) return null;

            return (
              <Circle
                key={leg.key}
                cx={50}
                cy={50}
                r={DONUT_RADIUS}
                fill="none"
                stroke={leg.color}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })
          : null}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>TOTAL</Text>
      </View>
    </View>
  );
}

function DriverSectionCard({ drivers, onNavigate }: DriverSectionCardProps) {
  const total = drivers?.total ?? 0;
  const valid = drivers?.valid ?? 0;
  const suspended = drivers?.suspended ?? 0;
  const expiring = drivers?.expiringSoon ?? 0;
  const expired = drivers?.expired ?? 0;
  const alerts = getDriverOpenAlertCount(drivers);

  const values: Record<DriverLicenseFilterKey, number> = {
    total,
    valid,
    suspended,
    expiring,
    expired,
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.headLabel}>Driver / Sarathi</Text>
          <View style={styles.headStat}>
            {/* Keep count and alerts on separate lines — no middle-dot separator. */}
            <Text style={styles.headValue}>Total Drivers : {total}</Text>
            {alerts > 0 ? (
              <Text style={styles.alertText}>Total Alerts : {alerts}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => onNavigate(buildDLListParamsFromDashboardStats({
            suspended,
            expired,
            expiringSoon: expiring,
          }))}
          activeOpacity={0.85}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <DriverDonut values={values} total={total} />
        <View style={styles.legendCol}>
          {LEGENDS.map((leg) => {
            const value = values[leg.key];
            const canTap = value > 0 && leg.key !== 'total';

            return (
              <View key={leg.key} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: leg.color }]} />
                  <Text style={styles.legendLabel}>{leg.label}</Text>
                </View>
                {canTap ? (
                  <TouchableOpacity
                    onPress={() => onNavigate(buildDLListParams(leg.key))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.legendValueTap}>{value}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.legendValue}>{value}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Match sibling dashboard cards: only bottom spacing. The parent ScrollView
  // already supplies horizontal padding, so a horizontal margin here would
  // double-inset this card and make it narrower than the rest.
  card: { marginBottom: Spacing[3], padding: 0, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,113,197,.15)',
    backgroundColor: 'rgba(0,113,197,.06)',
  },
  headLeft: { flex: 1, gap: 4 },
  headLabel: {
    ...dashboardHeader,
  },
  headStat: { gap: 2 },
  headValue: { ...dashboardHeader, fontWeight: '300' },
  alertText: { ...dashboardSubheading, color: Colors.dangerLight },
  viewBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  viewBtnText: { color: Colors.white, fontWeight: '700', fontSize: dashboardContentFont.sm },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: Spacing[4] },
  donutWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Overlay the total/label centred on the SVG ring without affecting layout.
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Driver metrics stay regular under the bold section heading.
  donutValue: { fontSize: FontSize.xl, fontWeight: '400', color: Colors.white },
  donutLabel: { fontSize: dashboardContentFont.micro, fontWeight: '400', color: DASHBOARD_LIGHT_WHITE, letterSpacing: 0.5 },
  legendCol: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 2 },
  legendLabel: { fontSize: dashboardContentFont.xs, color: DASHBOARD_LIGHT_WHITE },
  legendValue: { fontSize: dashboardContentFont.sm, fontWeight: '400', color: Colors.white },
  legendValueTap: { fontSize: dashboardContentFont.sm, fontWeight: '400', color: Colors.infoLight },
});

export default React.memo(DriverSectionCard);
