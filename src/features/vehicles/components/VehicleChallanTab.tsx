/**
 * Vehicle detail Challan tab — lists e-Challans for the selected vehicle.
 * Reuses challan list APIs and payment flows so behaviour matches the More → e-Challan screen.
 * Also reports pending totals so VehicleDetailScreen can swap the top status card.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { challanApi } from '../../../services/api/challanApi';
import { useAppSelector } from '../../../store';
import { GlassCard, StatusPill, EmptyState } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR, fmtDate } from '../../../utils/format';
import {
  requiresAdminContextPicker,
  resolveActiveCustomerId,
  isCustomerGroupAdmin,
} from '../../../types/auth';
import { mapChallanListRow, type ChallanListItem } from '../../challan/mapChallanRow';
import ChallanPaymentCheckoutModal from '../../challan/components/ChallanPaymentCheckoutModal';
import { canPayChallan, hasChallanReceipt } from '../../challan/utils/challanPaymentRules';
import { checkChallanStatus, openChallanReceipt } from '../../challan/utils/challanPaymentAlerts';
import { useChallanPaymentFlow } from '../../challan/hooks/useChallanPaymentFlow';

type ChallanFilter = 'pending' | 'disposed' | 'all';

const FILTERS: { key: ChallanFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'disposed', label: 'Disposed' },
  { key: 'all', label: 'All' },
];

export interface VehicleChallanHeaderSummary {
  loading: boolean;
  error: boolean;
  pendingCount: number;
  pendingAmount: number;
  /** Disposed challans are treated as paid in this product. */
  paidAmount: number;
  totalCount: number;
}

function challanDisplay(item: ChallanListItem) {
  if (item.isDisposed) {
    return { label: 'Disposed', pill: 'success' as const, card: 'success' as const };
  }
  if (item.isPending) {
    return { label: 'Pending', pill: 'danger' as const, card: 'danger' as const };
  }
  const label = item.status?.trim() || 'Unknown';
  return { label, pill: 'neutral' as const, card: 'default' as const };
}

interface VehicleChallanTabProps {
  vehicleNo: string;
  /** Pushes pending totals into the parent header card when this tab is active. */
  onHeaderSummaryChange?: (summary: VehicleChallanHeaderSummary) => void;
}

export function VehicleChallanTab({ vehicleNo, onHeaderSummaryChange }: VehicleChallanTabProps) {
  const nav = useNavigation<any>();
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = resolveActiveCustomerId(dashboardContext, user?.defaultCustomerId);
  const canScopeByCustomerId = requiresAdminContextPicker(user?.roleKey);
  // Group admins must always send customer scope; bare customer roles rely on the session.
  const needsCustomerScope =
    canScopeByCustomerId || (user ? isCustomerGroupAdmin(user.roleKey) : false);

  const [filter, setFilter] = useState<ChallanFilter>('pending');
  const [challans, setChallans] = useState<ChallanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checkingStatusNo, setCheckingStatusNo] = useState<string | null>(null);

  const publishHeader = useCallback((summary: VehicleChallanHeaderSummary) => {
    onHeaderSummaryChange?.(summary);
  }, [onHeaderSummaryChange]);

  const buildListParams = useCallback((
    status: 'Pending' | 'Disposed' | 'All',
    pageSize = 25,
  ) => ({
    ...(canScopeByCustomerId && customerId ? { customerId } : {}),
    vehicleNo: vehicleNo.trim(),
    status,
    pageNo: 1,
    pageSize,
  }), [canScopeByCustomerId, customerId, vehicleNo]);

  // Header must reflect true pending + disposed (paid) exposure even when the list filter changes.
  const fetchHeaderSummary = useCallback(async () => {
    const query = vehicleNo.trim();
    if (!query || (needsCustomerScope && !customerId)) {
      publishHeader({
        loading: false, error: true, pendingCount: 0, pendingAmount: 0, paidAmount: 0, totalCount: 0,
      });
      return;
    }

    publishHeader({
      loading: true, error: false, pendingCount: 0, pendingAmount: 0, paidAmount: 0, totalCount: 0,
    });

    try {
      // Larger pageSize for the upper card so totals are not capped at the list page.
      const [pendingRes, disposedRes, allRes] = await Promise.all([
        challanApi.getList(buildListParams('Pending', 500)),
        challanApi.getList(buildListParams('Disposed', 500)),
        challanApi.getList(buildListParams('All', 500)),
      ]);
      const pendingRows: any[] = pendingRes.data.data ?? pendingRes.data.rows ?? [];
      const disposedRows: any[] = disposedRes.data.data ?? disposedRes.data.rows ?? [];
      const allRows: any[] = allRes.data.data ?? allRes.data.rows ?? [];
      const pendingMapped = pendingRows.map(mapChallanListRow);
      const disposedMapped = disposedRows.map(mapChallanListRow);

      publishHeader({
        loading: false,
        error: false,
        pendingCount: pendingMapped.length,
        pendingAmount: pendingMapped.reduce((sum, c) => sum + c.fineImposed, 0),
        // Disposed status is the paid set for this vehicle's upper card.
        paidAmount: disposedMapped.reduce((sum, c) => sum + c.fineImposed, 0),
        totalCount: allRows.length,
      });
    } catch {
      publishHeader({
        loading: false, error: true, pendingCount: 0, pendingAmount: 0, paidAmount: 0, totalCount: 0,
      });
    }
  }, [vehicleNo, needsCustomerScope, customerId, buildListParams, publishHeader]);

  const fetchChallans = useCallback(async () => {
    const query = vehicleNo.trim();
    if (!query) {
      setChallans([]);
      setError(true);
      setLoading(false);
      return;
    }

    // Admins without an active customer context cannot safely query fleet-wide challans.
    if (needsCustomerScope && !customerId) {
      setChallans([]);
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const statusParam = filter === 'pending' ? 'Pending' : filter === 'disposed' ? 'Disposed' : 'All';
      const { data } = await challanApi.getList(buildListParams(statusParam));
      const rows: any[] = data.data ?? data.rows ?? [];
      setChallans(rows.map(mapChallanListRow));
    } catch {
      setChallans([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [vehicleNo, filter, customerId, needsCustomerScope, buildListParams]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchChallans(), fetchHeaderSummary()]);
  }, [fetchChallans, fetchHeaderSummary]);

  const {
    loadingPayButton,
    checkout,
    startPayment,
    handlePaymentEvent,
    handleClosePayment,
  } = useChallanPaymentFlow({ onRefresh: refreshAll });

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  useEffect(() => {
    fetchHeaderSummary();
  }, [fetchHeaderSummary]);

  const handleOpenDetail = (item: ChallanListItem) => {
    // Challan detail lives on the More stack — jump tabs so Pay/Receipt still work there.
    nav.navigate('More', {
      screen: 'ChallanDetail',
      params: { challan: item.detail },
    });
  };

  const handlePay = (item: ChallanListItem) => {
    if (!canPayChallan(item.detail)) return;
    startPayment(item.challanNo, item.vehicleNo);
  };

  const handleCheckStatus = async (item: ChallanListItem) => {
    setCheckingStatusNo(item.challanNo);
    const shouldRefresh = await checkChallanStatus(item.vehicleNo, item.challanNo);
    setCheckingStatusNo(null);
    if (shouldRefresh) refreshAll();
  };

  const handleReceipt = async (item: ChallanListItem) => {
    const requestId = item.detail.paymentRequestId;
    if (!requestId) return;
    await openChallanReceipt(requestId, item.challanNo);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} size="large" />
        <Text style={styles.loadingText}>Loading challans…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Unable to load challans"
          icon="📜"
          subtitle="Challan data could not be loaded for this vehicle."
        />
        <TouchableOpacity style={styles.retryBtn} onPress={refreshAll} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && (
                f.key === 'disposed' ? styles.filterActiveDisposed :
                f.key === 'pending' ? styles.filterActivePending :
                styles.filterActiveAll
              ),
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && (
                  f.key === 'disposed' ? styles.filterTextDisposed :
                  f.key === 'pending' ? styles.filterTextPending :
                  styles.filterTextAll
                ),
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {challans.length === 0 ? (
        <EmptyState title="No challans found" icon="📜" subtitle="No e-Challans match this filter for the vehicle." />
      ) : (
        // Mapped cards (not FlatList) — parent VehicleDetailScreen already scrolls.
        <View style={styles.list}>
          {challans.map((item) => {
            const display = challanDisplay(item);
            const showPay = canPayChallan(item.detail);
            const showReceipt = hasChallanReceipt(item.detail.paymentStatus);
            const isPayLoading = loadingPayButton === item.challanNo;
            const isStatusLoading = checkingStatusNo === item.challanNo;

            return (
              <GlassCard key={String(item.id ?? item.challanNo)} variant={display.card} style={styles.card}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenDetail(item)}>
                  <View style={styles.cardTop}>
                    <View style={styles.left}>
                      <Text style={styles.state}>{item.state} · {item.department}</Text>
                      <Text style={styles.challanNo} selectable numberOfLines={1}>
                        {item.challanNo}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text style={[styles.amount, item.isPending && { color: Colors.dangerLight }]}>
                        {formatINR(item.fineImposed)}
                      </Text>
                      <StatusPill label={display.label} variant={display.pill} small />
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.cardBottom}>
                  <Text style={styles.date}>{fmtDate(item.challanDateTime)}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => handleCheckStatus(item)}
                      disabled={isStatusLoading}
                    >
                      {isStatusLoading
                        ? <ActivityIndicator size="small" color={Colors.blue} />
                        : <Text style={styles.secondaryBtnText}>Status</Text>}
                    </TouchableOpacity>

                    {showReceipt ? (
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleReceipt(item)}>
                        <Text style={styles.secondaryBtnText}>Receipt</Text>
                      </TouchableOpacity>
                    ) : null}

                    {showPay ? (
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handlePay(item)}
                        disabled={isPayLoading}
                      >
                        {isPayLoading
                          ? <ActivityIndicator size="small" color={Colors.white} />
                          : <Text style={styles.payBtnText}>Pay</Text>}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      )}

      <ChallanPaymentCheckoutModal
        checkout={checkout}
        onEvent={handlePaymentEvent}
        onClose={handleClosePayment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[3],
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.text.subtle,
  },
  retryBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  retryText: {
    color: Colors.navy,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing[3],
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.full,
  },
  filterActivePending: { backgroundColor: Colors.dangerBg, borderColor: Colors.dangerBorder },
  filterActiveDisposed: { backgroundColor: Colors.successBg, borderColor: Colors.successBorder },
  filterActiveAll: { backgroundColor: Colors.infoBg, borderColor: Colors.infoBorder },
  filterText: { fontSize: FontSize.sm, color: Colors.text.subtle, fontWeight: '500' },
  filterTextPending: { color: Colors.dangerLight, fontWeight: '700' },
  filterTextDisposed: { color: Colors.successLight, fontWeight: '700' },
  filterTextAll: { color: Colors.infoLight, fontWeight: '700' },
  list: { gap: 8 },
  card: { padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  left: { flex: 1, gap: 2, paddingRight: Spacing[2] },
  right: { alignItems: 'flex-end', gap: 4 },
  state: { fontSize: FontSize.sm, color: Colors.text.secondary },
  challanNo: { fontSize: FontSize.xs, color: Colors.text.subtle, fontFamily: 'monospace' },
  amount: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  date: { fontSize: FontSize.xs, color: Colors.text.subtle, flexShrink: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 58,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.blue },
  payBtn: {
    backgroundColor: '#3eb901',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 52,
    alignItems: 'center',
  },
  payBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
