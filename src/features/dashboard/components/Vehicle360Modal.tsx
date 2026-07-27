/**
 * Vehicle 360 detail modal — web FleetDashboard Vehicle360Modal parity.
 * Surfaces VAHAN docs, challans, tolls and claims for a searched vehicle.
 */

import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';
import type { VehicleSearchRecord } from '../../../types/vehicleSearch';
import {
  riskOf, vahanChip, challanPill, claimPill,
} from '../utils/vehicleSearchUtils';

interface Vehicle360ModalProps {
  record: VehicleSearchRecord | null;
  onClose: () => void;
}

const DOC_ORDER: { key: keyof VehicleSearchRecord['vahan']; label: string }[] = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'pucc', label: 'PUCC' },
  { key: 'permit', label: 'Permit' },
  { key: 'tax', label: 'Tax' },
  { key: 'np', label: 'NP' },
];

function SectionHead({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// vahanChip()/claimPill()/challanPill() palettes are tuned for the light web modal.
// On this dark sheet we remap by state to the app's dark-theme status tokens so the
// chips keep enough contrast against the navy surface.
const DOC_CHIP_THEME: Record<string, { bg: string; border: string; fg: string }> = {
  VALID: { bg: Colors.successBg, border: Colors.successBorder, fg: Colors.successLight },
  EXPIRING: { bg: Colors.warningBg, border: Colors.warningBorder, fg: Colors.warningLight },
  EXPIRED: { bg: Colors.dangerBg, border: Colors.dangerBorder, fg: Colors.dangerLight },
};

const PILL_THEME: Record<string, { bg: string; border: string; fg: string }> = {
  APPROVED: { bg: Colors.successBg, border: Colors.successBorder, fg: Colors.successLight },
  DISPOSED: { bg: Colors.successBg, border: Colors.successBorder, fg: Colors.successLight },
  PENDING: { bg: Colors.warningBg, border: Colors.warningBorder, fg: Colors.warningLight },
  WAITING: { bg: Colors.infoBg, border: Colors.infoBorder, fg: Colors.infoLight },
  REJECTED: { bg: Colors.dangerBg, border: Colors.dangerBorder, fg: Colors.dangerLight },
  EXPIRED: { bg: Colors.dangerBg, border: Colors.dangerBorder, fg: Colors.dangerLight },
};

function ThemedPill({ label }: { label: string }) {
  const theme = PILL_THEME[label] ?? { bg: Colors.glass.bg, border: Colors.glass.border, fg: Colors.text.secondary };
  return (
    <View style={[styles.pill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[styles.pillText, { color: theme.fg }]}>{label}</Text>
    </View>
  );
}

export default function Vehicle360Modal({ record, onClose }: Vehicle360ModalProps) {
  const nav = useNavigation<any>();

  if (!record) return null;

  const risk = riskOf(record);

  const handleViewToll = (toll: { rrn: string }) => {
    onClose();
    nav.navigate('Toll', {
      screen: 'TollList',
      params: { initialRrn: toll.rrn, initialVehicleNo: record.reg },
    });
  };

  const handleViewChallan = (challan: { no: string; status?: string }) => {
    onClose();
    const status = challan.status?.trim().toLowerCase();
    nav.navigate('More', {
      screen: 'ChallanList',
      params: {
        initialVehicleNo: record.reg,
        initialChallanNo: challan.no,
        initialStatus: status === 'disposed' ? 'Disposed' : 'Pending',
      },
    });
  };

  const handleViewClaim = (claim: { plaza: string }) => {
    onClose();
    nav.navigate('Claims', {
      screen: 'ClaimsList',
      params: { initialVehicleNo: record.reg, initialTollName: claim.plaza },
    });
  };

  const handleOpenVehicle = () => {
    onClose();
    nav.navigate('Vehicles', {
      screen: 'VehicleDetail',
      params: { vehicleNo: record.reg },
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={styles.scrimTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.headMain}>
              <Text style={styles.headIcon}>🚛</Text>
              <View style={styles.headText}>
                <View style={styles.headTop}>
                  <Text style={styles.reg}>{record.reg}</Text>
                  <View style={styles.headRiskPill}>
                    <Text style={styles.headRiskPillText}>{risk.label}</Text>
                  </View>
                </View>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {record.owner} · Driver: {record.driver}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.vehicleLink} onPress={handleOpenVehicle}>
            <Text style={styles.vehicleLinkText}>Open vehicle profile ›</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.panel}>
              <SectionHead title="VAHAN Compliance" />
              <View style={styles.docGrid}>
                {DOC_ORDER.map(({ key, label }) => {
                  const doc = record.vahan[key];
                  const chip = vahanChip(doc.status);
                  const theme = DOC_CHIP_THEME[chip.status] ?? DOC_CHIP_THEME.EXPIRED;
                  return (
                    <View
                      key={key}
                      style={[styles.docTile, { borderColor: theme.border, backgroundColor: theme.bg }]}
                    >
                      <Text style={styles.docLabel}>{label}</Text>
                      <Text style={[styles.docStatus, { color: theme.fg }]}>{chip.status}</Text>
                      <Text style={styles.docDate}>{doc.date || '—'}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel}>
              <SectionHead title="Challans" />
              {record.challans.length === 0 ? (
                <Text style={styles.emptyOk}>No pending challans — clean record.</Text>
              ) : (
                record.challans.map((challan) => {
                  const pill = challanPill(challan.status);
                  return (
                    <View key={challan.no} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowPrimary}>{challan.no}</Text>
                        <Text style={styles.rowSecondary}>{challan.date}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.amountDanger}>{challan.amount}</Text>
                        <View style={styles.rowActions}>
                          <ThemedPill label={pill.label} />
                          <TouchableOpacity onPress={() => handleViewChallan(challan)}>
                            <Text style={styles.link}>View</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.panel}>
              <SectionHead title="Recent Tolls" />
              {record.tolls.length === 0 ? (
                <Text style={styles.emptyMuted}>No recent toll transactions.</Text>
              ) : (
                record.tolls.map((toll) => (
                  <View key={toll.rrn} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowPrimary}>{toll.plaza}</Text>
                      <Text style={styles.rowSecondary}>{toll.time} · {toll.rrn}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.amountDanger}>{toll.amount}</Text>
                      <TouchableOpacity onPress={() => handleViewToll(toll)}>
                        <Text style={styles.link}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.panel}>
              <SectionHead title="Claims" />
              {record.claims.length === 0 ? (
                <Text style={styles.emptyOk}>No claims on record.</Text>
              ) : (
                record.claims.map((claim, index) => {
                  const pill = claimPill(claim.status);
                  return (
                    <View key={`${claim.plaza}-${index}`} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowPrimary}>{claim.plaza}</Text>
                        <Text style={styles.rowSecondary}>{claim.updated}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.amountDanger}>{claim.amount}</Text>
                        <View style={styles.rowActions}>
                          <ThemedPill label={pill.label} />
                          <TouchableOpacity onPress={() => handleViewClaim(claim)}>
                            <Text style={styles.link}>View</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.6)' },
  scrimTap: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: Colors.bg.d1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: Colors.blue,
  },
  headMain: { flexDirection: 'row', gap: 12, flex: 1 },
  headIcon: { fontSize: 28 },
  headText: { flex: 1 },
  headTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reg: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  headRiskPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  headRiskPillText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,.82)', marginTop: 4 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  vehicleLink: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 11,
    backgroundColor: Colors.glass.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  vehicleLinkText: { color: Colors.infoLight, fontWeight: '700', fontSize: FontSize.sm },
  body: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 32 },
  panel: {
    backgroundColor: Colors.glass.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    padding: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: DASHBOARD_LIGHT_WHITE,
    marginBottom: 10,
  },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docTile: {
    width: '31%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  docLabel: { fontSize: 9, fontWeight: '700', color: DASHBOARD_LIGHT_WHITE, marginBottom: 3 },
  docStatus: { fontSize: 10, fontWeight: '800' },
  docDate: { fontSize: 9, color: DASHBOARD_LIGHT_WHITE, marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bgMedium,
    borderRadius: 9,
    padding: 10,
    marginBottom: 7,
  },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowPrimary: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  rowSecondary: { fontSize: FontSize.xs, color: DASHBOARD_LIGHT_WHITE, marginTop: 2 },
  amountDanger: { fontSize: FontSize.base, fontWeight: '800', color: Colors.dangerLight },
  link: { fontSize: FontSize.xs, color: Colors.infoLight, fontWeight: '700' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 9, fontWeight: '800' },
  emptyOk: { fontSize: FontSize.sm, color: Colors.successLight, fontWeight: '600', textAlign: 'center', padding: 12 },
  emptyMuted: { fontSize: FontSize.sm, color: DASHBOARD_LIGHT_WHITE, textAlign: 'center', padding: 12 },
});
