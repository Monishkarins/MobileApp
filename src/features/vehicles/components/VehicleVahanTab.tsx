/**
 * VAHAN tab — registration certificate fields for the selected vehicle.
 * Also reports a compact header summary so VehicleDetailScreen can swap the top card
 * to show per-document expiry status (Fitness / Insurance / PUCC / Permit / Tax / NP).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { complianceApi } from '../../../services/api/complianceApi';
import { EmptyState } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtDate } from '../../../utils/format';
import { DetailSection } from './vehicleDetailUi';
import type { VehicleVahanDocStatus } from '../../../types/vehicleSearch';

type RcRecord = Record<string, unknown>;

export interface VehicleVahanDocExpiry {
  key: 'fitness' | 'insurance' | 'pucc' | 'permit' | 'tax' | 'np';
  label: string;
  status: VehicleVahanDocStatus;
  date: string;
}

export interface VehicleVahanHeaderSummary {
  loading: boolean;
  error: boolean;
  ownerName?: string;
  makerModel?: string;
  registeredAt?: string;
  rcStatus?: string;
  /** Per-document expiry derived from RC upto dates (30-day expiring window). */
  docs: VehicleVahanDocExpiry[];
}

/** Same six VAHAN documents the compliance dashboard tracks, mapped to RC date fields. */
const VAHAN_DOC_FIELDS: {
  key: VehicleVahanDocExpiry['key'];
  label: string;
  field: string;
}[] = [
  { key: 'fitness', label: 'Fitness', field: 'rcFitUpto' },
  { key: 'insurance', label: 'Insurance', field: 'rcInsuranceUpto' },
  { key: 'pucc', label: 'PUCC', field: 'rcPuccUpto' },
  { key: 'permit', label: 'Permit', field: 'rcPermitValidUpto' },
  { key: 'tax', label: 'Tax', field: 'rcTaxUpto' },
  { key: 'np', label: 'NP', field: 'rcNpUpto' },
];

function asDate(value?: string | null): string {
  if (!value) return '';
  const formatted = fmtDate(value);
  return formatted && formatted !== 'Invalid Date' ? formatted : '';
}

function asText(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value);
}

/**
 * Classifies an RC "upto" date into valid / expiring (≤30 days) / expired —
 * matches the operational window used on the RC list and compliance cards.
 */
function resolveExpiryStatus(dateStr?: string): VehicleVahanDocStatus | null {
  if (!dateStr?.trim()) return null;
  const millis = new Date(dateStr).getTime();
  if (Number.isNaN(millis)) return null;
  const days = (millis - Date.now()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}

function buildDocExpiries(rc: RcRecord | null): VehicleVahanDocExpiry[] {
  if (!rc) return [];

  return VAHAN_DOC_FIELDS.flatMap(({ key, label, field }) => {
    const raw = asText(rc[field]);
    const status = resolveExpiryStatus(raw);
    // Skip docs with no usable date so the header only shows real expiry signals.
    if (!status || !raw) return [];
    return [{ key, label, status, date: asDate(raw) || raw }];
  });
}

function VahanSections({ rc }: { rc: RcRecord }) {
  return (
    <>
      <DetailSection
        title="Registration Info"
        rows={[
          ['RC No', asText(rc.rcRegnNo)],
          ['Regn. Date', asDate(asText(rc.rcRegnDt))],
          ['Registered At', asText(rc.rcRegisteredAt)],
          ['Purchase Date', asDate(asText(rc.rcPurchaseDt))],
          ['Tax Upto', asDate(asText(rc.rcTaxUpto))],
          ['Tax Mode', asText(rc.rcTaxMode)],
        ]}
      />

      <DetailSection
        title="Owner Info"
        rows={[
          ['Owner Name', asText(rc.rcOwnerName)],
          ['Owner Sr', asText(rc.rcOwnerSr)],
          ['Ownership Type', asText(rc.rcOwnerCdDesc)],
          ['Ownership Category', asText(rc.rcOwnCatgDesc)],
          ['Present Address', asText(rc.rcPresentAddress)],
          ['Permanent Address', asText(rc.rcPermanentAddress)],
          ['District Code', asText(rc.rcCurrentaddDistrictcode)],
        ]}
      />

      <DetailSection
        title="Vehicle Info"
        rows={[
          ['Maker', asText(rc.rcMakerDesc)],
          ['Model', asText(rc.rcMakerModel)],
          ['Fuel', asText(rc.rcFuelDesc)],
          ['Color', asText(rc.rcColor)],
          ['Chassis No', asText(rc.rcChasiNo)],
          ['Engine No', asText(rc.rcEngNo)],
          ['Body Type', asText(rc.rcBodyTypeDesc)],
          ['Vehicle Category', asText(rc.rcVchCatgDesc)],
          ['Vehicle Class', asText(rc.rcVhClassDesc)],
          ['Vehicle Type', asText(rc.rcVhType)],
          ['Norms', asText(rc.rcNormsDesc)],
          ['Seat Capacity', asText(rc.rcSeatCap)],
          ['Cubic Capacity', asText(rc.rcCubicCap)],
          ['GVW', asText(rc.rcGvw)],
          ['Unladen Weight', asText(rc.rcUnldWt)],
          ['Manufactured (MM/YY)', asText(rc.rcManuMonthYr)],
        ]}
      />

      <DetailSection
        title="Fitness & PUCC"
        rows={[
          ['Fitness Upto', asDate(asText(rc.rcFitUpto))],
          ['Fitness Result', asText(rc.rcFitnessResult)],
          ['PUCC No', asText(rc.rcPuccNo)],
          ['PUCC Upto', asDate(asText(rc.rcPuccUpto))],
        ]}
      />

      <DetailSection
        title="Insurance Info"
        rows={[
          ['Insurer', asText(rc.rcInsuranceComp)],
          ['Policy No', asText(rc.rcInsurancePolicyNo)],
          ['Valid Upto', asDate(asText(rc.rcInsuranceUpto))],
        ]}
      />

      <DetailSection
        title="Permit Info"
        rows={[
          ['Permit No', asText(rc.rcPermitNo)],
          ['Permit Type', asText(rc.rcPermitType)],
          ['Valid From', asDate(asText(rc.rcPermitValidFrom))],
          ['Valid Upto', asDate(asText(rc.rcPermitValidUpto))],
          ['Permit Category', asText(rc.rcPermitCatg)],
          ['Issued By', asText(rc.rcPermitIssuingAuthority)],
        ]}
      />

      <DetailSection
        title="National Permit"
        rows={[
          ['NP Upto', asDate(asText(rc.rcNpUpto))],
          ['NP Issued By', asText(rc.rcNpIssuedBy)],
        ]}
      />

      <DetailSection
        title="Additional Info"
        rows={[
          ['Financer', asText(rc.rcFinancer)],
          ['NCRB Status', asText(rc.rcNcrbStatus)],
          ['Blacklist Status', asText(rc.rcBlacklistStatus)],
          ['NOC Details', asText(rc.rcNocDetails)],
          ['HSRP Affixed', asText(rc.rcHsrpAffixed)],
        ]}
      />
    </>
  );
}

function buildVahanHeader(rc: RcRecord | null, loading: boolean, error: boolean): VehicleVahanHeaderSummary {
  const maker = asText(rc?.rcMakerDesc);
  const model = asText(rc?.rcMakerModel);
  const makerModel = [maker, model].filter(Boolean).join(' · ') || undefined;

  return {
    loading,
    error,
    ownerName: asText(rc?.rcOwnerName),
    makerModel,
    registeredAt: asText(rc?.rcRegisteredAt),
    rcStatus: asText(rc?.rcStatus),
    docs: buildDocExpiries(rc),
  };
}

interface VehicleVahanTabProps {
  vehicleNo: string;
  /** Pushes RC owner/status/expiry into the parent header card when this tab is active. */
  onHeaderSummaryChange?: (summary: VehicleVahanHeaderSummary) => void;
}

export function VehicleVahanTab({ vehicleNo, onHeaderSummaryChange }: VehicleVahanTabProps) {
  const [rc, setRc] = useState<RcRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const publishHeader = useCallback((nextRc: RcRecord | null, nextLoading: boolean, nextError: boolean) => {
    onHeaderSummaryChange?.(buildVahanHeader(nextRc, nextLoading, nextError));
  }, [onHeaderSummaryChange]);

  const fetchVahan = useCallback(async () => {
    const query = vehicleNo.trim();
    if (!query) {
      setRc(null);
      setError(true);
      setLoading(false);
      publishHeader(null, false, true);
      return;
    }

    setLoading(true);
    setError(false);
    publishHeader(null, true, false);

    try {
      const { data } = await complianceApi.getRCList({
        vehicleNo: query,
        pageNo: 1,
        pageSize: 1,
      });
      const row = data.records?.[0];
      if (!row || typeof row !== 'object') {
        setRc(null);
        setError(true);
        publishHeader(null, false, true);
      } else {
        const next = row as RcRecord;
        setRc(next);
        publishHeader(next, false, false);
      }
    } catch {
      setRc(null);
      setError(true);
      publishHeader(null, false, true);
    } finally {
      setLoading(false);
    }
  }, [vehicleNo, publishHeader]);

  useEffect(() => {
    fetchVahan();
  }, [fetchVahan]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.blue} size="large" />
        <Text style={styles.loadingText}>Loading VAHAN data…</Text>
      </View>
    );
  }

  if (error || !rc) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="No VAHAN record"
          icon="🛡"
          subtitle="No registration certificate was found for this vehicle."
        />
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVahan} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <VahanSections rc={rc} />;
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
});
