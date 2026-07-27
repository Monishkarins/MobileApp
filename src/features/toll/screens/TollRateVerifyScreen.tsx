import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { tollApi } from '../../../services/api';
import {
  LiquidBackground, GlassCard, StatusPill,
  EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR } from '../../../utils/format';

export default function TollRateVerifyScreen() {
  const [plazaId, setPlazaId] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitted(true);
    try {
      const { data } = await tollApi.getTollRates({
        plazaId: Number(plazaId) || undefined,
        vehicleClass: vehicleClass.trim() || undefined,
      });
      setRates(Array.isArray(data) ? data : []);
    } catch {
      setError('Rate lookup is currently unavailable. Please try again later.');
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [plazaId, vehicleClass]);

  const renderItem = ({ item }: { item: any }) => {
    const rate = Number(item?.rate ?? item?.amount ?? 0);
    return (
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.plaza} numberOfLines={2}>{item?.plazaName ?? '—'}</Text>
            {item?.vehicleClass ? (
              <View style={styles.pillRow}>
                <StatusPill label={String(item.vehicleClass)} variant="info" small />
              </View>
            ) : null}
          </View>
          <Text style={styles.rate}>{formatINR(rate)}</Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Verify Toll Rates"
        subtitle="Check the correct plaza rate"
        showBack
      />

      <View style={styles.form}>
        <GlassCard style={styles.inputCard}>
          <Text style={styles.label}>Plaza ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1024"
            placeholderTextColor={Colors.text.subtle}
            value={plazaId}
            onChangeText={setPlazaId}
            keyboardType="number-pad"
          />
        </GlassCard>
        <GlassCard style={styles.inputCard}>
          <Text style={styles.label}>Vehicle Class</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. VC4"
            placeholderTextColor={Colors.text.subtle}
            value={vehicleClass}
            onChangeText={setVehicleClass}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </GlassCard>
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Colors.blue} size="large" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleVerify} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !submitted ? (
        <EmptyState
          title="Verify a toll rate"
          subtitle="Enter a Plaza ID and Vehicle Class, then tap Verify."
        />
      ) : (
        <FlatList
          data={rates}
          keyExtractor={(row, index) => String(row?.id ?? row?.plazaId ?? index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            rates.length > 0 ? (
              <GlassCard variant="success" style={styles.noteCard}>
                <Text style={styles.noteText}>
                  {rates.length} matching {rates.length === 1 ? 'rate' : 'rates'} found.
                </Text>
              </GlassCard>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No rates found"
              subtitle="No published rate matches the Plaza ID and Vehicle Class entered."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  form:             { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], gap: 8 },
  inputCard:        { paddingVertical: 10 },
  label:            { fontSize: FontSize.xs, color: Colors.text.label, fontWeight: '600', marginBottom: 4 },
  input:            { fontSize: FontSize.base, color: Colors.white },
  verifyBtn:        { backgroundColor: Colors.yellow, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  verifyBtnText:    { fontSize: FontSize.base, fontWeight: '700', color: Colors.navy },
  centerContainer:  { paddingTop: Spacing[6], alignItems: 'center', justifyContent: 'center' },
  errorContainer:   { paddingHorizontal: Spacing[6], paddingTop: Spacing[6], alignItems: 'center', gap: Spacing[4] },
  errorText:        { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  retryBtn:         { backgroundColor: Colors.yellow, borderRadius: Radius.md, paddingHorizontal: Spacing[6], paddingVertical: Spacing[3] },
  retryText:        { fontSize: FontSize.base, fontWeight: '700', color: Colors.navy },
  listContent:      { paddingHorizontal: Spacing[4], paddingTop: Spacing[4], gap: 8, paddingBottom: 32 },
  noteCard:         { marginBottom: 8 },
  noteText:         { fontSize: FontSize.sm, color: Colors.successLight, fontWeight: '600' },
  card:             { padding: 13 },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardLeft:         { flex: 1, gap: 6 },
  plaza:            { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
  pillRow:          { flexDirection: 'row' },
  rate:             { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
});
