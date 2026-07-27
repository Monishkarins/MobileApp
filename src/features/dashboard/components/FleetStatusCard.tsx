/**
 * Fleet Status card — mirrors web FleetDashboard FleetStatusCard.
 * Surfaces active/inactive/hotlisted split, operational %, and Fleet Utilisation
 * bars (Today, Yesterday, This Mon, Last Mon) from toll vehicle counts.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import type { FleetStats, FleetUtilDateRange, TollSpend, UtilChartColumn } from '../../../types/dashboard';
import {
  buildFleetUtilOverviewColumns,
  resolveFleetUtilization,
  resolveUtilBarHeight,
} from '../utils/fleetUtilizationUtils';
import { dashboardHeader, dashboardContentFont, DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';

interface FleetStatusCardProps {
  fleet?: FleetStats | null;
  tollSpend?: TollSpend | null;
  loading?: boolean;
  onPressActive?: () => void;
  onUtilColumnPress?: (dateRange: FleetUtilDateRange) => void;
}

const LEGENDS: { key: keyof FleetStats; label: string; color: string }[] = [
  { key: 'active', label: 'Active', color: Colors.success },
  { key: 'inactive', label: 'Inactive', color: Colors.warning },
  { key: 'hotlisted', label: 'Hotlisted', color: Colors.danger },
];

// SVG donut geometry — viewBox stays 100x100; DONUT_SIZE scales the rendered ring.
const DONUT_SIZE = 108;
const DONUT_RADIUS = 28;
const DONUT_STROKE = 6;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/**
 * Renders the fleet split (active/inactive/hotlisted) as a coloured donut.
 * Each arc length is proportional to its share of the total; segments are laid
 * out sequentially from the top so the ring reads clockwise like the web chart.
 */
function FleetDonut({ fleet, total }: { fleet?: FleetStats | null; total: number }) {
  // Guard against divide-by-zero when no vehicles exist — keeps the base ring visible.
  const safeTotal = total || 1;

  // Track how much of the ring is already consumed so the next arc starts where
  // the previous one ended (strokeDashoffset is rotated by the running total).
  let accumulated = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg viewBox="0 0 100 100" width={DONUT_SIZE} height={DONUT_SIZE}>
        {/* Base ring — fills the gap left by empty/partial segments. */}
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
            const value = (fleet?.[leg.key] as number) ?? 0;
            const dash = (value / safeTotal) * DONUT_CIRCUMFERENCE;
            // Offset by a quarter-turn so the first arc begins at 12 o'clock.
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
      {/* Number layer is centered on the ring; the FLEET label sits just below
          so the count itself reads dead-centre of the donut. */}
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
      </View>
      {/* <View style={styles.donutLabelWrap}>
        <Text style={styles.donutLabel}>FLEET</Text>
      </View> */}
    </View>
  );
}

function UtilBarColumn({
  column,
  maxPct,
  onPress,
}: {
  column: UtilChartColumn;
  maxPct: number;
  onPress?: () => void;
}) {
  const barHeight = resolveUtilBarHeight(column.pct, column.vehicleCount, maxPct);
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.utilCol}
      {...(onPress ? { onPress, activeOpacity: 0.85 } : {})}
    >
      <Text style={styles.utilPct}>{column.pct}%</Text>
      <View style={styles.utilTrack}>
        <View style={[styles.utilBar, { height: barHeight }]} />
      </View>
      <Text style={styles.utilCount}>{column.vehicleCount}</Text>
      <Text style={styles.utilLabel} numberOfLines={1}>{column.label}</Text>
    </Wrapper>
  );
}

function FleetStatusCard({
  fleet,
  tollSpend,
  loading,
  onPressActive,
  onUtilColumnPress,
}: FleetStatusCardProps) {
  const total = fleet?.total ?? 0;
  const utilization = useMemo(
    () => resolveFleetUtilization(fleet ?? null, tollSpend ?? null),
    [fleet, tollSpend],
  );

  const chartColumns = useMemo(
    () => buildFleetUtilOverviewColumns(utilization),
    [utilization],
  );

  const maxPct = Math.max(...chartColumns.map((c) => c.pct), 1);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.headLabel}>Fleet Status</Text>
      
      </View>

      <View style={styles.body}>
        <FleetDonut fleet={fleet} total={total} />

        <View style={styles.legendCol}>
          {LEGENDS.map((leg) => {
            const value = (fleet?.[leg.key] as number) ?? 0;
            const canTap = leg.key === 'active' && value > 0 && !!onPressActive;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
              <View key={leg.key} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: leg.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>{leg.label}</Text>
                </View>
                <View style={styles.legendRight}>
                  {canTap ? (
                    <TouchableOpacity
                      onPress={onPressActive}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.legendValueTap}>{value}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.legendValue}>{value}</Text>
                  )}
                  <Text style={styles.legendPct}>{total > 0 ? `${pct}%` : '—'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.utilSection}>
        <Text style={styles.utilTitle}>Fleet Utilization</Text>
        <View style={styles.utilChart}>
          {chartColumns.map((column) => (
            <UtilBarColumn
              key={column.label}
              column={column}
              maxPct={maxPct}
              onPress={
                column.dateRange && onUtilColumnPress
                  ? () => onUtilColumnPress(column.dateRange!)
                  : undefined
              }
            />
          ))}
        </View>
      </View>

      {loading && !fleet ? <Text style={styles.loadingText}>Loading fleet…</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing[3], padding: Spacing[4] },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[3] },
  headLabel: { ...dashboardHeader },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillHealthy: { backgroundColor: Colors.successBg },
  pillWatch: { backgroundColor: Colors.warningBg },
  pillText: { fontSize: dashboardContentFont.tiny, fontWeight: '400' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donutWrap: {
    width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // Overlay the total on top of the SVG ring, centred on the ring's midpoint.
  // Explicit absolute coords (not absoluteFillObject) so the layer reliably
  // overlays the ring instead of flowing beneath it on this RN setup.
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // FLEET caption pinned just below the centred number, still inside the ring.
  donutLabelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  // Metrics stay regular so only the card heading reads bold.
  donutValue: { fontSize: FontSize['2xl'], fontWeight: '400', color: Colors.white, lineHeight: FontSize['2xl'] + 2 },
  donutLabel: { fontSize: dashboardContentFont.micro, fontWeight: '400', color: DASHBOARD_LIGHT_WHITE, letterSpacing: 0.5 },
  legendCol: { flex: 1, minWidth: 0, gap: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 2, flexShrink: 0 },
  legendLabel: { fontSize: dashboardContentFont.sm, color: DASHBOARD_LIGHT_WHITE, flexShrink: 1 },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  legendValue: { fontSize: dashboardContentFont.base, fontWeight: '400', color: Colors.white },
  legendValueTap: { fontSize: dashboardContentFont.base, fontWeight: '400', color: Colors.infoLight },
  legendPct: { fontSize: dashboardContentFont.xs, color: DASHBOARD_LIGHT_WHITE, minWidth: 28, textAlign: 'right' },
  utilSection: {
    marginTop: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  utilTitle: {
    ...dashboardHeader,
    marginBottom: Spacing[3],
  },
  utilChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 120,
  },
  utilCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  utilPct: {
    fontSize: dashboardContentFont.xs,
    fontWeight: '400',
    color: Colors.infoLight,
    marginBottom: 4,
  },
  utilTrack: {
    width: '100%',
    height: 56,
    justifyContent: 'flex-end',
    backgroundColor: Colors.glass.bg,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginBottom: 4,
  },
  utilBar: {
    width: '100%',
    backgroundColor: Colors.blue,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    minHeight: 2,
  },
  utilCount: {
    fontSize: dashboardContentFont.xs,
    fontWeight: '400',
    color: Colors.white,
    marginBottom: 2,
  },
  utilLabel: {
    fontSize: dashboardContentFont.tiny,
    fontWeight: '400',
    color: DASHBOARD_LIGHT_WHITE,
    textAlign: 'center',
  },
  loadingText: { fontSize: dashboardContentFont.sm, color: DASHBOARD_LIGHT_WHITE, marginTop: Spacing[3] },
});

export default React.memo(FleetStatusCard);
