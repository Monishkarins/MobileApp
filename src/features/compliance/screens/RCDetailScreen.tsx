/**
 * VAHAN RC detail — mirrors the web VehicleRcs view modal: the full registration
 * certificate grouped into Registration, Owner, Vehicle, Fitness/PUCC, Insurance,
 * Permit, National Permit, Finance and Additional sections.
 *
 * The list row already carries every rc* field, so this screen renders the
 * passed record directly and only falls back to /vehicleRc/:id when opened via
 * a deep link without a record.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { complianceApi } from '../../../services/api/complianceApi';
import {
  LiquidBackground, GlassCard, SkeletonCard, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtDate } from '../../../utils/format';

type RCData = Record<string, any>;

// Renders a date field consistently; blank/invalid dates collapse to an em dash.
function asDate(value?: string | null): string {
  if (!value) return '';
  const formatted = fmtDate(value);
  return formatted && formatted !== 'Invalid Date' ? formatted : '';
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable numberOfLines={4}>
        {value?.toString().trim() ? value : '—'}
      </Text>
    </View>
  );
}

// One titled section (blue header) wrapping its label/value rows — matches the
// web modal's grouped Descriptions blocks.
function Section({ title, rows }: { title: string; rows: [string, any][] }) {
  return (
    <GlassCard style={styles.section} noPadding>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        {rows.map(([label, value], i) => (
          <DetailRow key={`${label}-${i}`} label={label} value={value == null ? '' : String(value)} />
        ))}
      </View>
    </GlassCard>
  );
}

export default function RCDetailScreen({ route }: any) {
  const rcId: number = route.params?.rcId;
  const passedRc: RCData | undefined = route.params?.rc;

  const [rc, setRc] = useState<RCData | null>(passedRc ?? null);
  const [loading, setLoading] = useState(!passedRc);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await complianceApi.getRCById(rcId);
      const payload = (data as any)?.result ?? data;
      if (payload && typeof payload === 'object') setRc(payload as RCData);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [rcId]);

  // Only hit the network when we arrived without a pre-loaded row (deep link).
  useEffect(() => {
    if (!passedRc) fetchData();
  }, [fetchData, passedRc]);

  return (
    <LiquidBackground>
      <ScreenHeader title="RC Information" showBack />

      {loading ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error || !rc ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Could not load this RC.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Section
            title="Registration Info"
            rows={[
              ['RC No', rc.rcRegnNo],
              ['Regn. Date', asDate(rc.rcRegnDt)],
              ['Registered At', rc.rcRegisteredAt],
              ['Purchase Date', asDate(rc.rcPurchaseDt)],
              ['Tax Upto', asDate(rc.rcTaxUpto)],
              ['Tax Mode', rc.rcTaxMode],
            ]}
          />

          <Section
            title="Owner Info"
            rows={[
              ['Owner Name', rc.rcOwnerName],
              ['Owner Sr', rc.rcOwnerSr],
              ['Ownership Type', rc.rcOwnerCdDesc],
              ['Ownership Category', rc.rcOwnCatgDesc],
              ['Present Address', rc.rcPresentAddress],
              ['Permanent Address', rc.rcPermanentAddress],
              ['District Code', rc.rcCurrentaddDistrictcode],
            ]}
          />

          <Section
            title="Vehicle Info"
            rows={[
              ['Maker', rc.rcMakerDesc],
              ['Model', rc.rcMakerModel],
              ['Fuel', rc.rcFuelDesc],
              ['Color', rc.rcColor],
              ['Chassis No', rc.rcChasiNo],
              ['Engine No', rc.rcEngNo],
              ['Body Type', rc.rcBodyTypeDesc],
              ['Vehicle Category', rc.rcVchCatgDesc],
              ['Vehicle Class', rc.rcVhClassDesc],
              ['Vehicle Type', rc.rcVhType],
              ['Norms', rc.rcNormsDesc],
              ['Seat Capacity', rc.rcSeatCap],
              ['Cubic Capacity', rc.rcCubicCap],
              ['GVW', rc.rcGvw],
              ['Unladen Weight', rc.rcUnldWt],
              ['Manufactured (MM/YY)', rc.rcManuMonthYr],
            ]}
          />

          <Section
            title="Fitness & PUCC"
            rows={[
              ['Fitness Upto', asDate(rc.rcFitUpto)],
              ['Fitness Result', rc.rcFitnessResult],
              ['PUCC No', rc.rcPuccNo],
              ['PUCC Upto', asDate(rc.rcPuccUpto)],
            ]}
          />

          <Section
            title="Insurance Info"
            rows={[
              ['Insurer', rc.rcInsuranceComp],
              ['Policy No', rc.rcInsurancePolicyNo],
              ['Valid Upto', asDate(rc.rcInsuranceUpto)],
            ]}
          />

          <Section
            title="Permit Info"
            rows={[
              ['Permit No', rc.rcPermitNo],
              ['Permit Type', rc.rcPermitType],
              ['Valid From', asDate(rc.rcPermitValidFrom)],
              ['Valid Upto', asDate(rc.rcPermitValidUpto)],
              ['Permit Category', rc.rcPermitCatg],
              ['Issued By', rc.rcPermitIssuingAuthority],
            ]}
          />

          <Section
            title="National Permit"
            rows={[
              ['NP Upto', asDate(rc.rcNpUpto)],
              ['NP Issued By', rc.rcNpIssuedBy],
            ]}
          />

          <Section
            title="Additional Info"
            rows={[
              ['Financer', rc.rcFinancer],
              ['NCRB Status', rc.rcNcrbStatus],
              ['Blacklist Status', rc.rcBlacklistStatus],
              ['NOC Details', rc.rcNocDetails],
              ['HSRP Affixed', rc.rcHsrpAffixed],
            ]}
          />

          <View style={{ height: Spacing[6] }} />
        </ScrollView>
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { padding: Spacing[4], gap: Spacing[2] },
  errorWrap: { alignItems: 'center', paddingVertical: Spacing[6], paddingHorizontal: Spacing[5] },
  errorText: { color: Colors.text.secondary, fontSize: FontSize.base, marginBottom: Spacing[4] },
  retryBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  retryText: { color: Colors.navy, fontSize: FontSize.base, fontWeight: '700' },

  scroll: { padding: Spacing[4], paddingBottom: Spacing[6] },
  section: { marginBottom: Spacing[3], overflow: 'hidden' },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing[3],
    paddingVertical: 8,
  },
  sectionBody: { paddingHorizontal: Spacing[3], paddingVertical: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing[3],
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.text.label, flex: 1 },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1.3,
    textAlign: 'right',
  },
});
