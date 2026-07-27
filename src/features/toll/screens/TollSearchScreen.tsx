import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { tollApi } from '../../../services/api';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, StatusPill,
  EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR, fmtDateTime } from '../../../utils/format';

export default function TollSearchScreen({ navigation }: any) {
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = dashboardContext?.customerId ?? user?.defaultCustomerId ?? undefined;

  const [vehicleNo, setVehicleNo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const vno = vehicleNo.trim();
    if (!vno) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const { data } = await tollApi.getTransactions({
        customerId,
        vehicleNo: vno,
        pageNo: 1,
        pageSize: 25,
      });
      setRows(data?.rows ?? []);
    } catch {
      setError('Unable to search toll transactions. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleNo, customerId]);

  const mapRowToDetail = (row: any) => ({
    ...row,
    vehicleNo: row.vehicle?.vehicleNo ?? vehicleNo,
    txnAmount: Number(row.txnAmount),
    balance: Number(row.balance),
    tollPlaza: row.locationName,
    txnType: row.txnType,
    locationLat: row.locationLat,
    locationLng: row.locationLang,
    locationLang: row.locationLang,
    lane: row.lan,
    tollId: row.tollId,
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('TollDetail', { transaction: mapRowToDetail(item) as any })}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.location} numberOfLines={1}>{item?.locationName ?? '—'}</Text>
            <Text style={styles.direction}>{item?.direction ?? '—'}</Text>
            {item?.rrn ? <Text style={styles.rrn} selectable>RRN: {item.rrn}</Text> : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formatINR(Number(item?.txnAmount ?? 0))}</Text>
            {item?.txnType ? <StatusPill label={String(item.txnType)} variant="info" small /> : null}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.datetime}>{fmtDateTime(item?.txnDateTime)}</Text>
          <Text style={styles.balance}>Bal: {formatINR(Number(item?.balance ?? 0))}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <LiquidBackground>
      <ScreenHeader title="Toll Search" showBack />

      <View style={styles.searchSection}>
        <GlassCard style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter vehicle number"
            placeholderTextColor={Colors.text.subtle}
            value={vehicleNo}
            onChangeText={setVehicleNo}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </GlassCard>
        <TouchableOpacity
          style={[styles.searchBtn, !vehicleNo.trim() && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!vehicleNo.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Colors.blue} size="large" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearch} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !searched ? (
        <EmptyState
          title="Search toll transactions"
          subtitle="Enter a vehicle number to begin"
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => String(row?.id ?? index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No transactions found"
              subtitle={`No toll transactions for ${vehicleNo.trim()}.`}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  searchSection:    { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchCard:       { flex: 1, paddingVertical: 4 },
  searchInput:      { fontSize: FontSize.base, color: Colors.white, fontFamily: 'monospace' },
  searchBtn:        { backgroundColor: Colors.yellow, borderRadius: Radius.lg, paddingHorizontal: Spacing[5], paddingVertical: 14 },
  searchBtnDisabled:{ opacity: 0.5 },
  searchBtnText:    { fontSize: FontSize.base, fontWeight: '700', color: Colors.navy },
  centerContainer:  { paddingTop: Spacing[6], alignItems: 'center', justifyContent: 'center' },
  errorContainer:   { paddingHorizontal: Spacing[6], paddingTop: Spacing[6], alignItems: 'center', gap: Spacing[4] },
  errorText:        { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  retryBtn:         { backgroundColor: Colors.yellow, borderRadius: Radius.md, paddingHorizontal: Spacing[6], paddingVertical: Spacing[3] },
  retryText:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.navy },
  listContent:      { paddingHorizontal: Spacing[4], paddingTop: Spacing[4], gap: 8, paddingBottom: 32 },
  card:             { padding: 13 },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardLeft:         { flex: 1, gap: 2 },
  cardRight:        { alignItems: 'flex-end', gap: 4 },
  location:         { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
  direction:        { fontSize: FontSize.sm, color: Colors.text.secondary },
  rrn:              { fontSize: FontSize.xs, color: Colors.text.subtle, fontFamily: 'monospace' },
  amount:           { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  cardBottom:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datetime:         { fontSize: FontSize.xs, color: Colors.text.subtle },
  balance:          { fontSize: FontSize.xs, color: Colors.text.subtle, fontWeight: '600' },
});
