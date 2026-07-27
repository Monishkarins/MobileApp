/**
 * Toll transaction detail — shows the full breakdown of a single toll debit.
 * Data is passed from the list row (no separate fetch) because the ledger
 * endpoint already returns every field operators need to audit a transaction.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  LiquidBackground, GlassCard, StatusPill, ScreenHeader,
} from '../../../components';
import TollPlazaMap from '../components/TollPlazaMap';
import { Colors, FontSize, Spacing } from '../../../theme';
import { formatINR, fmtDateTime } from '../../../utils/format';
import { formatTollDirection } from '../utils/tollDirectionUtils';
import { resolveTollTxnBadge, isTollCreditTxn } from '../utils/tollTxnBadgeUtils';
import type { TollScreenProps } from '../../../navigation/types';

type Props = TollScreenProps<'TollDetail'>;

// Backend names longitude `locationLang`; list rows may pass either key.
function resolveTollLongitude(txn: { locationLng?: string | null; locationLang?: string | null }) {
  return txn.locationLng ?? txn.locationLang ?? null;
}

/** Format a coordinate for display; blank when the ledger had no GPS fix. */
function formatCoordinate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return parsed.toFixed(6);
}

/**
 * Label + value locked to one horizontal line.
 * On narrow screens the value column shrinks/fits instead of wrapping under the label.
 */
function DetailRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {/* minWidth:0 lets the flex child shrink below its intrinsic text width on small screens */}
      <View style={styles.rowValueWrap}>
        <Text
          style={[styles.rowValue, mono && styles.mono]}
          selectable
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function TollDetailScreen({ route }: Props) {
  const txn = route.params.transaction;

  const badge = resolveTollTxnBadge(txn);
  const isCredit = isTollCreditTxn(txn.txnType);
  const latitude = formatCoordinate(txn.locationLat);
  const longitude = formatCoordinate(resolveTollLongitude(txn));

  return (
    <LiquidBackground>
      <ScreenHeader title="Toll Transaction" showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount hero */}
        <GlassCard style={styles.heroCard}>
          <Text style={styles.heroAmount}>{formatINR(txn.txnAmount)}</Text>
          <Text style={styles.heroVehicle}>{txn.vehicleNo}</Text>
          <Text style={styles.heroPlaza}>{txn.tollPlaza}</Text>
          <View style={styles.heroMeta}>
            <StatusPill label={badge.label} variant={badge.variant} />
          </View>
        </GlassCard>

        {/* Timing sits directly under the hero so reader vs txn times are first to audit */}
        <Text style={styles.sectionLabel}>TIMING</Text>
        <GlassCard style={styles.section}>
          <DetailRow
            label="Reader Date Time"
            value={txn.txnReaderTime ? fmtDateTime(txn.txnReaderTime) : '—'}
          />
          <DetailRow
            label="Txn DateTime"
            value={txn.txnDateTime ? fmtDateTime(txn.txnDateTime) : '—'}
          />
        </GlassCard>

        {/* Transaction identifiers */}
        <Text style={styles.sectionLabel}>TRANSACTION</Text>
        <GlassCard style={styles.section}>
          <DetailRow label="RRN" value={txn.rrn} mono />
          <DetailRow label="Reference No." value={txn.txnRefNo} mono />
          <DetailRow label="Type" value={txn.txnType?.replace(/_/g, ' ')} />
          <DetailRow label="Direction" value={formatTollDirection(txn.direction)} />
          <DetailRow label="Lane" value={txn.lane} />
        </GlassCard>

        {/* Wallet — debit/credit and balance-after */}
        <Text style={styles.sectionLabel}>WALLET</Text>
        <GlassCard style={styles.section}>
          <DetailRow
            label={isCredit ? 'Credit Amount' : 'Debit Amount'}
            value={formatINR(txn.txnAmount)}
          />
          <DetailRow label="Balance After" value={formatINR(txn.balance)} />
        </GlassCard>

        {/* Vehicle & tag */}
        <Text style={styles.sectionLabel}>VEHICLE & TAG</Text>
        <GlassCard style={styles.section}>
          <DetailRow label="Vehicle No." value={txn.vehicleNo} mono />
          <DetailRow label="Vehicle Class" value={txn.vehicleProfileId} />
          <DetailRow label="FASTag Kit" value={txn.kitNumber} mono />
          <DetailRow label="Barcode" value={txn.barcode} mono />
        </GlassCard>

        {/* Plaza location — lat/lng as separate scan lines above a compact map */}
        <Text style={styles.sectionLabel}>TOLL PLAZA</Text>
        <GlassCard style={styles.section}>
          <DetailRow label="Plaza Name" value={txn.tollPlaza} />
          <DetailRow label="Toll ID" value={txn.tollId} mono />
          <DetailRow label="Latitude" value={latitude} mono />
          <DetailRow label="Longitude" value={longitude} mono />
          <TollPlazaMap
            latitude={txn.locationLat}
            longitude={resolveTollLongitude(txn)}
            plazaName={txn.tollPlaza}
          />
        </GlassCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingHorizontal: Spacing[4], paddingTop: Spacing[2] },
  heroCard:     { alignItems: 'center', paddingVertical: Spacing[5], marginBottom: Spacing[3] },
  heroAmount:   { fontSize: FontSize['5xl'], fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  heroVehicle:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, fontFamily: 'monospace', marginTop: 6 },
  heroPlaza:    { fontSize: FontSize.base, color: Colors.text.secondary, marginTop: 2, textAlign: 'center' },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: Spacing[3] },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary, letterSpacing: 1.2, marginBottom: Spacing[2], marginTop: Spacing[1] },
  section:      { marginBottom: Spacing[3], gap: 12 },
  // Single-line rows: label fixed-width left, value shrinks/fits on the right.
  row:          {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
  },
  rowLabel:     {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '40%',
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  rowValueWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  rowValue:     {
    width: '100%',
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: '600',
    textAlign: 'right',
  },
  mono:         { fontFamily: 'monospace', fontSize: FontSize.sm },
});
