/**
 * Vehicle detail — FASTag, VAHAN, and e-Challan data for a single vehicle in segmented tabs.
 * The upper summary card swaps subtitle + status pills to match the active tab's domain.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  LiquidBackground, GlassCard, StatusPill, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { formatINR } from '../../../utils/format';
import { vehicleApi } from '../../../services/api/vehicleApi';
import { resolveVehicleStatusDisplay } from '../utils/vehicleStatusUtils';
import { mapVehicleListRow } from '../mapVehicleListRow';
import type { VehiclesStackParamList } from '../../../navigation/types';
import type { VehicleDetailPayload } from '../types/vehicleDetail';
import { VehicleFastagTab } from '../components/VehicleFastagTab';
import {
  VehicleVahanTab,
  type VehicleVahanHeaderSummary,
} from '../components/VehicleVahanTab';
import {
  VehicleChallanTab,
  type VehicleChallanHeaderSummary,
} from '../components/VehicleChallanTab';

type VehicleDetailTab = 'fastag' | 'vahan' | 'challan';
type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'amber';

interface HeaderPill {
  label: string;
  variant: PillVariant;
}

interface HeaderStatLine {
  label: string;
  value: string;
  variant: PillVariant;
}

interface HeaderCardModel {
  subtitle?: string;
  /** Capsule status rows used by the Challan tab summary (same border style as StatusPill). */
  statLines?: HeaderStatLine[];
  pills: HeaderPill[];
  loading?: boolean;
}

/** Maps a document expiry status onto StatusPill variants. */
function resolveDocExpiryPill(
  label: string,
  status: 'valid' | 'expiring' | 'expired',
): HeaderPill {
  if (status === 'expired') return { label: `${label} Expired`, variant: 'danger' };
  if (status === 'expiring') return { label: `${label} Expiring`, variant: 'warning' };
  return { label: `${label} Valid`, variant: 'success' };
}

/** Builds a one-line expiry rollup for the VAHAN header subtitle. */
function buildVahanExpirySubtitle(docs: { status: 'valid' | 'expiring' | 'expired' }[]): string {
  const expired = docs.filter((d) => d.status === 'expired').length;
  const expiring = docs.filter((d) => d.status === 'expiring').length;
  const valid = docs.filter((d) => d.status === 'valid').length;

  if (docs.length === 0) return 'No expiry dates on record';
  if (expired === 0 && expiring === 0) return 'All documents valid';

  const parts: string[] = [];
  if (expired > 0) parts.push(`${expired} expired`);
  if (expiring > 0) parts.push(`${expiring} expiring`);
  if (valid > 0) parts.push(`${valid} valid`);
  return parts.join(' · ');
}

export default function VehicleDetailScreen() {
  const route = useRoute<RouteProp<VehiclesStackParamList, 'VehicleDetail'>>();
  const initialVehicle = route.params?.vehicle;
  const vehicleNo = initialVehicle?.vehicleNo ?? route.params?.vehicleNo ?? 'Vehicle';

  const [activeTab, setActiveTab] = useState<VehicleDetailTab>('fastag');
  const [vehicle, setVehicle] = useState<VehicleDetailPayload | null>(initialVehicle ?? null);
  const [loadingVehicle, setLoadingVehicle] = useState(!initialVehicle && !!route.params?.vehicleNo);
  const [vahanHeader, setVahanHeader] = useState<VehicleVahanHeaderSummary | null>(null);
  const [challanHeader, setChallanHeader] = useState<VehicleChallanHeaderSummary | null>(null);

  const fetchVehicle = useCallback(async () => {
    const query = route.params?.vehicleNo?.trim();
    if (!query || initialVehicle) return;

    setLoadingVehicle(true);
    try {
      const { data } = await vehicleApi.getList({
        pageNo: '1',
        pageSize: '1',
        vehicleNo: query,
      });
      const row = data.result?.rows?.[0];
      setVehicle(row ? mapVehicleListRow(row, 0).detail : null);
    } catch {
      setVehicle(null);
    } finally {
      setLoadingVehicle(false);
    }
  }, [initialVehicle, route.params?.vehicleNo]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const handleVahanHeaderChange = useCallback((summary: VehicleVahanHeaderSummary) => {
    setVahanHeader(summary);
  }, []);

  const handleChallanHeaderChange = useCallback((summary: VehicleChallanHeaderSummary) => {
    setChallanHeader(summary);
  }, []);

  // Build tab-specific header content so subtitle + status pills always match the active domain.
  const headerCard = useMemo<HeaderCardModel>(() => {
    if (activeTab === 'fastag') {
      if (loadingVehicle) return { loading: true, pills: [] };
      if (!vehicle) return { subtitle: 'FASTag details unavailable', pills: [] };

      const statusDisplay = resolveVehicleStatusDisplay(vehicle.yapStatus);
      const isActive = vehicle.statusOnOff === 'ON' || statusDisplay.isActive;
      const pills: HeaderPill[] = [
        { label: isActive ? 'Active' : 'Inactive', variant: isActive ? 'success' : 'danger' },
      ];
      if (vehicle.yapStatus) {
        pills.push({ label: vehicle.yapStatus, variant: statusDisplay.tone });
      }

      return {
        subtitle: [vehicle.customerName, vehicle.vehicleGroupName].filter(Boolean).join(' · ') || undefined,
        pills,
      };
    }

    if (activeTab === 'vahan') {
      if (!vahanHeader || vahanHeader.loading) return { loading: true, pills: [] };
      if (vahanHeader.error) {
        return { subtitle: 'No VAHAN record found', pills: [{ label: 'Unavailable', variant: 'neutral' }] };
      }

      // Document expiry pills only — RC "ACTIVE" status is omitted from this header.
      const pills: HeaderPill[] = [];
      const sortedDocs = [...(vahanHeader.docs ?? [])].sort((a, b) => {
        const rank = { expired: 0, expiring: 1, valid: 2 };
        return rank[a.status] - rank[b.status];
      });
      for (const doc of sortedDocs) {
        pills.push(resolveDocExpiryPill(doc.label, doc.status));
      }

      if (pills.length === 0) {
        pills.push({ label: 'VAHAN', variant: 'info' });
      }

      const ownerLine = [vahanHeader.ownerName, vahanHeader.makerModel]
        .filter(Boolean)
        .join(' · ');
      const expiryLine = buildVahanExpirySubtitle(vahanHeader.docs ?? []);

      return {
        subtitle: [ownerLine || 'VAHAN registration', expiryLine].filter(Boolean).join('\n'),
        pills,
      };
    }

    // challan — capsule pills matching StatusPill border (ACTIVE-style).
    if (!challanHeader || challanHeader.loading) return { loading: true, pills: [] };
    if (challanHeader.error) {
      return { subtitle: 'Unable to load challans', pills: [{ label: 'Unavailable', variant: 'neutral' }] };
    }

    const pendingCount = challanHeader.pendingCount;
    const hasPending = pendingCount > 0;

    return {
      pills: [],
      statLines: [
        {
          label: 'Total Pending Challan',
          value: String(pendingCount),
          // Red when there is exposure; green when the vehicle is clear.
          variant: hasPending ? 'danger' : 'success',
        },
        {
          label: 'Total Pending Amount',
          value: formatINR(challanHeader.pendingAmount, true),
          variant: hasPending ? 'danger' : 'success',
        },
        {
          // Disposed challans are shown as paid on this card (same rule as e-Challan menu).
          label: 'Total Challan Payment Paid',
          value: formatINR(challanHeader.paidAmount, true),
          variant: 'success',
        },
      ],
    };
  }, [activeTab, vehicle, loadingVehicle, vahanHeader, challanHeader]);

  return (
    <LiquidBackground>
      <ScreenHeader title={vehicleNo} showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard variant="strong" style={styles.headerCard}>
          <Text style={styles.vehicleNo}>{vehicleNo}</Text>
          {headerCard.loading ? (
            <View style={styles.headerLoading}>
              <ActivityIndicator color={Colors.blue} size="small" />
              <Text style={styles.subtitle}>Updating summary…</Text>
            </View>
          ) : (
            <>
              
              {headerCard.statLines && headerCard.statLines.length > 0 ? (
                <View style={styles.statPills}>
                  {headerCard.statLines.map((line) => (
                    <StatusPill
                      key={line.label}
                      label={`${line.label} : ${line.value}`}
                      variant={line.variant}
                      showDot
                    />
                  ))}
                </View>
              ) : null}
              {headerCard.pills.length > 0 ? (
                <View style={styles.pillRow}>
                  {headerCard.pills.map((pill) => (
                    <StatusPill
                      key={`${pill.label}-${pill.variant}`}
                      label={pill.label}
                      variant={pill.variant}
                      small
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </GlassCard>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'fastag' && styles.tabBtnActive]}
            onPress={() => setActiveTab('fastag')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === 'fastag' && styles.tabTextActive]}>
              FASTag
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'vahan' && styles.tabBtnActive]}
            onPress={() => setActiveTab('vahan')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === 'vahan' && styles.tabTextActive]}>
              VAHAN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'challan' && styles.tabBtnActive]}
            onPress={() => setActiveTab('challan')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === 'challan' && styles.tabTextActive]}>
              Challan
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'fastag' ? (
          loadingVehicle ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.blue} size="large" />
              <Text style={styles.loadingText}>Loading FASTag details…</Text>
            </View>
          ) : vehicle ? (
            <VehicleFastagTab vehicle={vehicle} />
          ) : (
            <View style={styles.centered}>
              <Text style={styles.errorText}>FASTag vehicle details are not available.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchVehicle} activeOpacity={0.85}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )
        ) : activeTab === 'vahan' ? (
          <VehicleVahanTab
            vehicleNo={vehicleNo}
            onHeaderSummaryChange={handleVahanHeaderChange}
          />
        ) : (
          <VehicleChallanTab
            vehicleNo={vehicleNo}
            onHeaderSummaryChange={handleChallanHeaderChange}
          />
        )}

        <View style={{ height: Spacing[6] }} />
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing[4], paddingBottom: Spacing[6] },
  headerCard: { marginBottom: Spacing[3] },
  vehicleNo: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.subtle,
    marginTop: 4,
    lineHeight: 20,
  },
  // Challan totals reuse StatusPill capsules (dot + rounded border) like ACTIVE.
  statPills: {
    marginTop: Spacing[2],
    gap: Spacing[2],
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginTop: Spacing[3] },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.glass.bgDark,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    padding: 2,
    marginBottom: Spacing[3],
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.infoBg,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.text.subtle,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.infoLight,
    fontWeight: '700',
  },

  centered: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
    gap: Spacing[3],
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.text.subtle,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: FontSize.base,
    textAlign: 'center',
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
