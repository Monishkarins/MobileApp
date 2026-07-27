/**
 * Challan Payment History — settled/in-progress e-Challan payments from
 * /echallan/payment. Renders the web ChallanPayment table data as cards (like
 * the rest of the mobile menus) with a tap-to-expand payment breakdown and a
 * receipt link for successful payments.
 *
 * Search debounces while typing and partial-matches loaded rows (vehicle /
 * challan / request id) so short prefixes still narrow the list when the API
 * only supports exact equality.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
  TextInput, Modal, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { challanApi } from '../../../services/api/challanApi';
import type { ChallanPaymentRow } from '../../../services/api/challanApi';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, StatusPill, SkeletonCard, EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR, fmtDateTime } from '../../../utils/format';
import {
  requiresAdminContextPicker, resolveActiveCustomerId, isCustomerGroupAdmin,
} from '../../../types/auth';

const PAGE_SIZE = 100;
/** Wait for typing to settle before applying the vehicle/challan filter. */
const SEARCH_DEBOUNCE_MS = 350;

// Normalized payment row decoupled from raw API keys; amounts are coerced once
// here so the card and modal can format them directly.
interface PaymentItem {
  id: string;
  challanNumber: string;
  vehicleNo: string;
  requestId: string;
  paymentStatus: string;
  fineImposed: number;
  refundAmount: number;
  convenienceFee: number;
  paymentGatewayFee: number;
  totalAmount: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
}

const toNum = (v: unknown): number => {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

/** Uppercase trim so vehicle/challan matching stays consistent with ledger storage. */
function normalizeSearchTerm(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Partial match across the fields operators type into the search box.
 * Runs on already-loaded rows so prefixes like "TN" still filter when the API
 * only returns exact vehicle/challan matches.
 */
function matchesPaymentSearch(item: PaymentItem, term: string): boolean {
  if (!term) return true;
  return (
    item.vehicleNo.toUpperCase().includes(term)
    || item.challanNumber.toUpperCase().includes(term)
    || item.requestId.toUpperCase().includes(term)
  );
}

// "Success" is the only state with a receipt and is the sole green/settled
// status; everything else (in-progress, hold, failed, refund) is treated as
// non-final and rendered in a neutral/warning tone.
const isSuccess = (status: string) => status.toUpperCase() === 'SUCCESS';

function paymentVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'SUCCESS') return 'success';
  if (s.includes('FAIL')) return 'danger';
  if (s.includes('REFUND') || s.includes('HOLD') || s.includes('PROGRESS')) return 'warning';
  return 'neutral';
}

function mapRow(row: ChallanPaymentRow, index: number): PaymentItem {
  return {
    id: String(row.id ?? row.requestId ?? index),
    challanNumber: row.challanNumber ?? '',
    vehicleNo: row.vehicleNo ?? '',
    requestId: row.requestId ?? '',
    paymentStatus: row.paymentStatus ?? '',
    fineImposed: toNum(row.fineImposed),
    refundAmount: toNum(row.refundAmount),
    convenienceFee: toNum(row.convenienceFee),
    paymentGatewayFee: toNum(row.paymentGatewayFee),
    totalAmount: toNum(row.totalAmount),
    comment: row.comment ?? '',
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
    customerName: row.customer?.firstName ?? '',
  };
}

export default function PaymentHistoryScreen() {
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = resolveActiveCustomerId(dashboardContext, user?.defaultCustomerId);
  // Admin roles drill in by explicit customerId; session-scoped roles (CUSTOMER,
  // CUSTOMER_GROUP_ADMIN) must omit it or the ledger comes back empty.
  const canScopeByCustomerId = requiresAdminContextPicker(user?.roleKey);
  const needsCustomerScope =
    canScopeByCustomerId || (user ? isCustomerGroupAdmin(user.roleKey) : false);

  const [items, setItems] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentItem | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const reqIdRef = useRef(0);

  // Soft client narrowing so type-ahead works even when the API is exact-match.
  const visibleItems = useMemo(() => {
    const term = normalizeSearchTerm(search);
    if (!term) return items;
    return items.filter((item) => matchesPaymentSearch(item, term));
  }, [items, search]);

  const visibleTotal = useMemo(() => {
    const term = normalizeSearchTerm(search);
    if (!term) return total;
    return visibleItems.length;
  }, [search, total, visibleItems.length]);

  // Debounce typing — clear applies immediately; typed terms wait so we don't
  // spam the list filter on every key.
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    const next = normalizeSearchTerm(searchInput);
    if (!next) {
      setSearch((prev) => (prev === '' ? prev : ''));
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearch((prev) => (prev === next ? prev : next));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [searchInput]);

  const fetchData = useCallback(async (isRefresh = false) => {
    // Group-admin roles must wait for a customer scope before any rows load.
    if (needsCustomerScope && !customerId) { setLoading(false); return; }

    // Keep cards visible while re-filtering so typing does not flash skeletons.
    const softReload = hasLoadedOnceRef.current && !isRefresh;
    if (isRefresh) setRefreshing(true);
    else if (!softReload) setLoading(true);

    const reqId = ++reqIdRef.current;

    try {
      // Type-ahead search is applied client-side on these rows — do not send the
      // typed term to the API (exact-match backends empty the list on "TN").
      const { data } = await challanApi.getPaymentHistory({
        ...(canScopeByCustomerId && customerId ? { customerId } : {}),
        pageNo: 1,
        pageSize: PAGE_SIZE,
      });

      if (reqId !== reqIdRef.current) return;

      const rows = data.rows ?? [];
      setItems(rows.map(mapRow));
      setTotal(data.count ?? rows.length);
      hasLoadedOnceRef.current = true;
    } catch { /* FlatList shows the empty state on failure */ }
    finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [canScopeByCustomerId, customerId, needsCustomerScope]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applySearchNow = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setSearch(normalizeSearchTerm(searchInput));
  };

  const clearSearch = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setSearchInput('');
    setSearch('');
  };

  // Receipt links are short-lived signed URLs fetched on demand, so we resolve
  // the URL only when the user taps and open it in the device browser.
  const handleViewReceipt = useCallback(async (item: PaymentItem) => {
    if (!isSuccess(item.paymentStatus)) return;
    setReceiptLoading(true);
    try {
      const { data } = await challanApi.getPaymentReceipt({
        challanNumber: item.challanNumber,
        requestId: item.requestId,
      });
      if (data.url) Linking.openURL(data.url);
      else Alert.alert('Receipt unavailable', 'No receipt is available for this payment yet.');
    } catch {
      Alert.alert('Receipt unavailable', 'Could not fetch the payment receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
    }
  }, []);

  const renderItem = ({ item }: { item: PaymentItem }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setSelected(item)}>
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.left}>
            <Text style={styles.vehicleNo}>{item.vehicleNo || '—'}</Text>
            <Text style={styles.challanNo} numberOfLines={1} selectable>
              {item.challanNumber || '—'}
            </Text>
            {item.customerName ? (
              <Text style={styles.customer} numberOfLines={1}>{item.customerName}</Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text style={styles.amount}>{formatINR(item.totalAmount || item.fineImposed)}</Text>
            <StatusPill
              label={item.paymentStatus || '—'}
              variant={paymentVariant(item.paymentStatus)}
              small
            />
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.date}>{item.createdAt ? fmtDateTime(item.createdAt) : '—'}</Text>
          {isSuccess(item.paymentStatus) ? (
            <Text style={styles.receiptHint}>View details ›</Text>
          ) : null}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search vehicle or challan no…"
        placeholderTextColor={Colors.text.subtle}
        value={searchInput}
        onChangeText={(text) => setSearchInput(text.toUpperCase())}
        returnKeyType="search"
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={applySearchNow}
      />
      {searchInput.length > 0 ? (
        <TouchableOpacity onPress={clearSearch} hitSlop={8} accessibilityLabel="Clear search">
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const subtitle = normalizeSearchTerm(search)
    ? `${visibleTotal} matching`
    : (total ? `${total} payments` : undefined);

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Payment History"
        subtitle={subtitle}
        showBack
      />

      {needsCustomerScope && !customerId ? (
        <View style={styles.promptWrap}>
          <GlassCard style={styles.promptCard}>
            <Text style={styles.promptTitle}>Select a customer</Text>
            <Text style={styles.promptText}>
              Choose a customer from the Dashboard to view their payment history.
            </Text>
          </GlassCard>
        </View>
      ) : loading && items.length === 0 ? (
        <View style={{ padding: Spacing[4], gap: 8 }}>
          {listHeader}
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.blue} />
          }
          ListEmptyComponent={<EmptyState title="No payments found" icon="🧾" />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PaymentDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onViewReceipt={handleViewReceipt}
        receiptLoading={receiptLoading}
      />
    </LiquidBackground>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

function PaymentDetailModal({
  item, onClose, onViewReceipt, receiptLoading,
}: {
  item: PaymentItem | null;
  onClose: () => void;
  onViewReceipt: (item: PaymentItem) => void;
  receiptLoading: boolean;
}) {
  const showReceipt = useMemo(() => !!item && isSuccess(item.paymentStatus), [item]);

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Payment Details</Text>
          {item ? (
            <>
              <DetailRow label="Challan Number" value={item.challanNumber} />
              <DetailRow label="Vehicle No" value={item.vehicleNo} />
              <DetailRow label="Payment Status" value={item.paymentStatus.toUpperCase()} />
              <DetailRow label="Request ID" value={item.requestId} />
              <DetailRow label="Fine Amount" value={formatINR(item.fineImposed)} />
              <DetailRow label="Refund Amount" value={formatINR(item.refundAmount)} />
              <DetailRow label="Convenience Fee" value={formatINR(item.convenienceFee)} />
              <DetailRow label="Payment Gateway Fee" value={formatINR(item.paymentGatewayFee)} />
              <DetailRow label="Total Amount" value={formatINR(item.totalAmount)} />
              {item.comment ? <DetailRow label="Comments" value={item.comment} /> : null}
              <DetailRow label="Created At" value={item.createdAt ? fmtDateTime(item.createdAt) : ''} />
              <DetailRow label="Updated At" value={item.updatedAt ? fmtDateTime(item.updatedAt) : ''} />

              {showReceipt ? (
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => onViewReceipt(item)}
                  disabled={receiptLoading}
                  activeOpacity={0.85}
                >
                  {receiptLoading
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.receiptBtnText}>View Receipt</Text>}
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing[4], gap: 8, paddingBottom: 32 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.white },
  clearText: { fontSize: FontSize.base, color: Colors.text.subtle, paddingHorizontal: 4 },
  card: { padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  left: { flex: 1, gap: 2, paddingRight: 8 },
  right: { alignItems: 'flex-end', gap: 4, maxWidth: '42%' },
  vehicleNo: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, fontFamily: 'monospace' },
  challanNo: { fontSize: FontSize.xs, color: Colors.text.subtle, fontFamily: 'monospace' },
  customer: { fontSize: FontSize.sm, color: Colors.text.secondary },
  amount: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: FontSize.xs, color: Colors.text.subtle },
  receiptHint: { fontSize: FontSize.xs, color: Colors.infoLight, fontWeight: '600' },
  promptWrap: { padding: Spacing[4] },
  promptCard: { padding: Spacing[4] },
  promptTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  promptText: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,11,31,0.85)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bg.d2,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
    paddingBottom: Spacing[6],
    maxHeight: '85%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.glass.border,
    marginBottom: Spacing[3],
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.text.label, flex: 1 },
  detailValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600', flex: 1, textAlign: 'right' },
  receiptBtn: {
    marginTop: Spacing[4],
    backgroundColor: Colors.blue,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  receiptBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
});
