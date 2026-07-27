/**
 * e-Challan card — mirrors web FleetDashboard ChallanSection.
 * Header shows pending count + fine; body tabs switch between top vehicles by
 * fine and the latest pending challans so users can jump into filtered lists.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, Spacing, Radius } from '../../../theme';
import { formatINR, fmtDate } from '../../../utils/format';
import type {
  ChallanSummary,
  RecentChallanItem,
  TopVehicleChallanFine,
} from '../../../types/dashboard';
import {
  dashboardHeader,
  dashboardSubheading,
  dashboardContentFont,
  DASHBOARD_LIGHT_WHITE,
} from '../dashboardTypography';

type ChallanTab = 'top' | 'recent';

interface ChallanFilterParams {
  vehicleNo?: string;
  challanNo?: string;
  status?: 'Pending' | 'Disposed' | 'All';
}

interface ChallanCardProps {
  challans?: ChallanSummary | null;
  loading?: boolean;
  onPay?: () => void;
  onFilter?: (params: ChallanFilterParams) => void;
}

const MAX_FONT_SCALE = 1.2;

function challanPill(status?: string): { bg: string; fg: string; label: string } {
  const normalized = (status || 'Pending').trim().toLowerCase();

  if (normalized === 'disposed') {
    return { bg: 'rgba(40,167,69,0.15)', fg: '#1e7a37', label: 'DISPOSED' };
  }
  if (normalized === 'pending') {
    return {bg: Colors.warningBg, fg: Colors.warning, label: 'PENDING'};
  }
  return {
    bg: 'rgba(115,136,160,0.16)',
    fg: '#5a6b80',
    label: (status || 'UNKNOWN').toUpperCase(),
  };
}

function AmtBar({
  vehicle,
  max,
  onPress,
  isCompact,
}: {
  vehicle: TopVehicleChallanFine;
  max: number;
  onPress?: () => void;
  isCompact: boolean;
}) {
  const vehicleNo = vehicle.vehicleNo?.trim() || '—';
  const amount = vehicle.amount ?? 0;
  const widthPct = max > 0 ? Math.max((amount / max) * 100, 3) : 0;

  return (
    <TouchableOpacity
      style={styles.amtRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text
        style={[
          styles.amtVehicle,
          isCompact && styles.amtVehicleCompact,
          onPress ? styles.linkText : null,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {vehicleNo}
      </Text>
      <View style={styles.amtTrack}>
        <View style={[styles.amtFill, { width: `${widthPct}%` }]} />
      </View>
      <Text
        style={[styles.amtValue, isCompact && styles.amtValueCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {formatINR(amount, true)}
      </Text>
    </TouchableOpacity>
  );
}

function RecentRow({
  item,
  onPress,
}: {
  item: RecentChallanItem;
  onPress?: () => void;
}) {
  const pill = challanPill(item.status);
  const vehicleNo = item.vehicleNo?.trim() || '—';
  const challanNo = item.challanNo?.trim() || '—';

  return (
    <TouchableOpacity
      style={styles.recentRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.recentMain}>
        <View style={styles.recentTop}>
          <Text
            style={[styles.recentVehicle, onPress ? styles.linkText : null]}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {vehicleNo}
          </Text>
          <View style={[styles.pill, {backgroundColor: pill.bg, borderColor: pill.fg}]}>
            <Text style={[styles.pillText, { color: pill.fg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {pill.label}
            </Text>
          </View>
        </View>
        <Text style={styles.recentMeta} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {fmtDate(item.date)}
        </Text>
      </View>
      <Text
        style={[styles.amtValue, styles.recentAmount]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {formatINR(item.amount, true)}
      </Text>
    </TouchableOpacity>
  );
}

function ChallanCard({ challans, loading = false, onPay, onFilter }: ChallanCardProps) {
  const [activeTab, setActiveTab] = useState<ChallanTab>('recent');
  const { width: screenWidth } = useWindowDimensions();
  // Stack Pay below stats so pending amount never competes with the CTA for width.
  const isNarrow = screenWidth < 380;

  const count = challans?.pendingCount ?? 0;
  const amount = challans?.pendingAmount ?? 0;
  const topVehicles = (challans?.topVehiclesByFine ?? []).slice(0, 3);
  const recentChallans = (challans?.recentPending ?? []).slice(0, 3);
  const hasPending = count > 0;
  const maxAmt = useMemo(() => topVehicles[0]?.amount ?? 0, [topVehicles]);

  const payButton = onPay ? (
    <TouchableOpacity
      style={[styles.payBtn, isNarrow && styles.payBtnFull]}
      onPress={onPay}
      activeOpacity={0.85}
    >
      <Text style={styles.payBtnText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Pay Now →</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.head, isNarrow && styles.headNarrow]}>
        <View style={styles.headMain}>
          <Text style={styles.headLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>E-Challan</Text>
          <Text style={styles.headStatLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Pending Challans : {count}
          </Text>
          <Text style={styles.headStatLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Pending Amt : {formatINR(amount, true)}
          </Text>
        </View>
        {!isNarrow ? payButton : null}
      </View>
      {isNarrow && payButton ? <View style={styles.payWrap}>{payButton}</View> : null}

      <View style={styles.body}>
        <View style={styles.seg}>
          <TouchableOpacity
            style={[styles.segBtn, activeTab === 'recent' && styles.segBtnActive]}
            onPress={() => setActiveTab('recent')}
          >
            <Text
              style={[styles.segText, activeTab === 'recent' && styles.segTextActive]}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              Recent E-Challan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, activeTab === 'top' && styles.segBtnActive]}
            onPress={() => setActiveTab('top')}
          >
            <Text
              style={[styles.segText, activeTab === 'top' && styles.segTextActive]}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              Top Vehicles
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : null}

          {!loading && activeTab === 'top' && !hasPending ? (
            <Text style={styles.clearText}>No pending challans.</Text>
          ) : null}

          {!loading && activeTab === 'top'
            ? topVehicles.map((vehicle) => {
              const vehicleNo = vehicle.vehicleNo?.trim() || '';
              const canFilter = Boolean(vehicleNo && vehicleNo !== '—');

              return (
                <AmtBar
                  key={`${vehicleNo}-${vehicle.amount}`}
                  vehicle={vehicle}
                  max={Math.max(maxAmt, 1)}
                  isCompact={isNarrow}
                  onPress={
                    canFilter && onFilter
                      ? () => onFilter({ vehicleNo, status: 'Pending' })
                      : undefined
                  }
                />
              );
            })
            : null}

          {!loading && activeTab === 'recent' && recentChallans.length === 0 ? (
            <Text style={[styles.muted, !hasPending && styles.clearText]}>
              {hasPending ? 'No recent challans to show.' : 'No pending challans.'}
            </Text>
          ) : null}

          {!loading && activeTab === 'recent'
            ? recentChallans.map((item) => {
              const vehicleNo = item.vehicleNo?.trim() || '';
              const challanNo = item.challanNo?.trim() || '';
              const canFilter = Boolean(vehicleNo && vehicleNo !== '—');

              return (
                <RecentRow
                  key={item.id ?? `${vehicleNo}-${challanNo}-${item.date}`}
                  item={item}
                  onPress={
                    canFilter && onFilter
                      ? () => onFilter({
                        vehicleNo,
                        challanNo: challanNo || undefined,
                        status: 'Pending',
                      })
                      : undefined
                  }
                />
              );
            })
            : null}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing[3], padding: 0, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: 'rgba(66,165,255,0.035)',
  },
  headNarrow: { alignItems: 'flex-start' },
  headMain: { flex: 1, minWidth: 0, gap: 2 },
  headLabel: {
    ...dashboardHeader,
    marginBottom: 2,
  },
  headStatLine: { ...dashboardSubheading },
  headStatValue: { ...dashboardSubheading, fontWeight: '400', color: '#FF2B2B' },
  payWrap: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: 'rgba(66,165,255,0.035)',
  },
  payBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignSelf: 'center',
    flexShrink: 0,
  },
  payBtnFull: { alignSelf: 'stretch', alignItems: 'center' },
  payBtnText: { color: Colors.white, fontWeight: '700', fontSize: dashboardContentFont.sm },
  body: { paddingHorizontal: Spacing[4], paddingTop: 11, paddingBottom: 13, gap: 9 },
  seg: {
    flexDirection: 'row',
    backgroundColor: Colors.glass.bg,
    borderRadius: Radius.md,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segBtnActive: {backgroundColor: Colors.infoBg, borderWidth: 1, borderColor: Colors.infoBorder},
  segText: { fontSize: dashboardContentFont.xs, fontWeight: '600', color: DASHBOARD_LIGHT_WHITE },
  segTextActive: {color: Colors.infoLight},
  list: { gap: 7 },
  muted: { fontSize: dashboardContentFont.sm, color: DASHBOARD_LIGHT_WHITE },
  clearText: { fontSize: dashboardContentFont.sm, color: Colors.success, fontWeight: '500' },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  // Vehicle/amount rows stay regular under the bold E-Challan heading.
  amtVehicle: {
    minWidth: 72,
    maxWidth: 92,
    flexShrink: 0,
    fontSize: dashboardContentFont.xs,
    fontWeight: '400',
    color: Colors.white,
  },
  amtVehicleCompact: { minWidth: 64, maxWidth: 78 },
  linkText: { color: Colors.white },
  amtTrack: {
    flex: 1,
    minWidth: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(236,240,245,0.18)',
    overflow: 'hidden',
  },
  amtFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  amtValue: {
    minWidth: 48,
    maxWidth: 68,
    textAlign: 'right',
    fontSize: dashboardContentFont.xs,
    fontWeight: '400',
    color: Colors.white,
    flexShrink: 0,
  },
  amtValueCompact: { minWidth: 44, maxWidth: 58 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 58,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  recentMain: { flex: 1, minWidth: 0, gap: 2 },
  recentTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentVehicle: {
    flexShrink: 1,
    fontSize: dashboardContentFont.xs,
    fontWeight: '400',
    color: Colors.white,
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
    borderWidth: 1,
  },
  pillText: {fontSize: dashboardContentFont.micro, fontWeight: '400', letterSpacing: 0.3},
  recentMeta: { fontSize: dashboardContentFont.xs, color: DASHBOARD_LIGHT_WHITE },
  // Recent tab amounts stay white so they don’t compete with the red Top Vehicles bars.
  recentAmount: { color: Colors.white },
});

export default React.memo(ChallanCard);
