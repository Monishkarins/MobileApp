/**
 * DA-claim detail — renders the full claim ledger row passed from the list.
 * Level 1/2/3 submitted and rejection data mirrors web DAClaim view modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { claimsApi } from '../../../services/api';
import {
  LiquidBackground,
  GlassCard,
  SkeletonCard,
  ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtClaimDate, fmtClaimDateTime, fmtDecimalAmount } from '../../../utils/format';
import { formatClaimType } from '../claimStatus';
import { mapClaimListRow } from '../mapClaimRow';
import type { ClaimListRow } from '../../../services/api/claimsApi';
import type { ClaimRecord } from '../../../types/dashboard';

function DetailRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, mono && styles.mono]}
        selectable
        numberOfLines={4}
      >
        {value?.trim() ? value : '—'}
      </Text>
    </View>
  );
}

/** Level block — only rendered when at least one level field is populated (web parity). */
function ClaimLevelSection({
  level,
  submittedDate,
  rejectedDate,
  rejectedReason,
}: {
  level: number;
  submittedDate?: string;
  rejectedDate?: string;
  rejectedReason?: string;
}) {
  const hasData = Boolean(submittedDate?.trim() || rejectedDate?.trim() || rejectedReason?.trim());
  if (!hasData) return null;

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.levelTitle}>Level {level}</Text>
      <DetailRow label="Claim Submitted Date" value={fmtClaimDate(submittedDate)} />
      {rejectedDate?.trim() ? (
        <DetailRow label="Claim Rejected Date" value={fmtClaimDate(rejectedDate)} />
      ) : null}
      {rejectedReason?.trim() ? (
        <DetailRow label="Claim Rejected Reason" value={rejectedReason} />
      ) : null}
    </GlassCard>
  );
}

export default function ClaimDetailScreen({ route }: any) {
  const claimId = route.params.claimId;
  const passedClaim: ClaimRecord | undefined = route.params.claim;

  const [claim, setClaim] = useState<ClaimRecord | null>(passedClaim ?? null);
  const [loading, setLoading] = useState(!passedClaim);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await claimsApi.getById(claimId);
      if (data && typeof data === 'object') {
        setClaim(mapClaimListRow(data as ClaimListRow));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (!passedClaim) fetchData();
  }, [fetchData, passedClaim]);

  const statusCode = claim?.rawClaimStatus || claim?.claimStatus;

  return (
    <LiquidBackground>
      <ScreenHeader title="Claim Information" showBack />

      {loading ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error || !claim ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Could not load this claim.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.card}>
            <DetailRow label="VRN Number" value={claim.vehicleNo} mono />
            <DetailRow label="RRN Number" value={claim.rrn} mono />
            <DetailRow label="Reader Date Time" value={fmtClaimDateTime(claim.readerDateTime)} />
            <DetailRow label="Transaction Date Time" value={fmtClaimDateTime(claim.transactionDateTime)} />
            <DetailRow label="Mapper Class" value={claim.mapperClass} />
            <DetailRow label="Axle" value={claim.axle} />
            <DetailRow label="Transaction Amount" value={fmtDecimalAmount(claim.amount)} />
            <DetailRow label="Reference Amount" value={fmtDecimalAmount(claim.referenceAmount)} />
            <DetailRow label="Toll Id" value={claim.tollId} mono />
            <DetailRow label="Toll Plaza Name" value={claim.tollPlaza} />
            <DetailRow label="Status" value={statusCode} />
            <DetailRow label="Claim Type" value={formatClaimType(claim.claimType, 'view')} />
            <DetailRow label="Claim Requested Date" value={fmtClaimDate(claim.requestedDate)} />
          </GlassCard>

          <ClaimLevelSection
            level={1}
            submittedDate={claim.submittedDate}
            rejectedDate={claim.rejectedDate}
            rejectedReason={claim.rejectedReason}
          />
          <ClaimLevelSection
            level={2}
            submittedDate={claim.submittedDateLevel2}
            rejectedDate={claim.rejectedDateLevel2}
            rejectedReason={claim.rejectedReasonLevel2}
          />
          <ClaimLevelSection
            level={3}
            submittedDate={claim.submittedDateLevel3}
            rejectedDate={claim.rejectedDateLevel3}
            rejectedReason={claim.rejectedReasonLevel3}
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
  card: { marginBottom: Spacing[3], gap: Spacing[1] },
  levelTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing[1],
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing[3],
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.text.label, flex: 1 },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
  mono: { fontFamily: 'monospace', letterSpacing: 0.3 },
});
