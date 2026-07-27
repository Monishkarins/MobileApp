import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { tollApi } from '../../../services/api';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, StatusPill,
  SkeletonCard, EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR, fmtDateTime } from '../../../utils/format';

export default function DoubleDebitScreen() {
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = dashboardContext?.customerId ?? user?.defaultCustomerId ?? undefined;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { data } = await tollApi.getDoubleDebits({ customerId });
      // The paginated wrapper shape is unknown; accept the common variants.
      const list: any[] =
        (data as any)?.data ??
        (data as any)?.rows ??
        (Array.isArray(data) ? (data as any) : []);
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError('Unable to load double debits. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = ({item}: {item: any}) => {
    const count = Number(item?.count ?? item?.debitCount ?? 0);
    const amount = Number(item?.txnAmount ?? item?.amount ?? 0);
    const plaza = item?.tollPlaza ?? item?.locationName ?? '—';
    const vehicleNo = item?.vehicleNo ?? item?.vehicle?.vehicleNo ?? '—';
    return (
      <GlassCard variant={count > 1 ? 'warning' : 'default'} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.vehicleNo}>{vehicleNo}</Text>
            <Text style={styles.plaza} numberOfLines={1}>{plaza}</Text>
            {item?.rrn ? <Text style={styles.rrn} selectable>RRN: {item.rrn}</Text> : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formatINR(amount)}</Text>
            <StatusPill label="Double Debit" variant="danger" small />
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.datetime}>
            {fmtDateTime(item?.txnDateTime ?? item?.date)}
          </Text>
          {count > 1 ? (
            <Text style={styles.countText}>{count}× debited</Text>
          ) : null}
        </View>
      </GlassCard>
    );
  };

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Double Debit"
        subtitle="Duplicate toll deductions"
        showBack
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} style={styles.skeleton} />)}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => String(row?.id ?? index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            rows.length > 0 ? (
              <GlassCard variant="info" style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{rows.length}</Text>
                <Text style={styles.summaryLabel}>
                  {rows.length === 1 ? 'record found' : 'records found'}
                </Text>
              </GlassCard>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No double debits found"
              subtitle="There are no duplicate toll deductions on this account."
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={Colors.blue}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { padding: Spacing[4], gap: 8 },
  skeleton:         { marginBottom: 2 },
  errorContainer:   { paddingHorizontal: Spacing[6], paddingTop: Spacing[6], alignItems: 'center', gap: Spacing[4] },
  errorText:        { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  retryBtn:         { backgroundColor: Colors.yellow, borderRadius: Radius.md, paddingHorizontal: Spacing[6], paddingVertical: Spacing[3] },
  retryText:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.navy },
  listContent:      { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], gap: 8, paddingBottom: 32 },
  summaryCard:      { alignItems: 'center', marginBottom: 8 },
  summaryValue:     { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.infoLight },
  summaryLabel:     { fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  card:             { padding: 13 },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardLeft:         { flex: 1, gap: 2 },
  cardRight:        { alignItems: 'flex-end', gap: 4 },
  vehicleNo:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, fontFamily: 'monospace' },
  plaza:            { fontSize: FontSize.sm, color: Colors.text.secondary },
  rrn:              { fontSize: FontSize.xs, color: Colors.text.subtle, fontFamily: 'monospace' },
  amount:           { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  cardBottom:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datetime:         { fontSize: FontSize.xs, color: Colors.text.subtle },
  countText:        { fontSize: FontSize.xs, color: Colors.warningLight, fontWeight: '600' },
});
