/**
 * Wallet transaction detail modal — web WalletTransactionReport detail view parity.
 */

import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtDateTime } from '../../../utils/format';
import type { WalletReportRow } from '../../../services/api/walletApi';
import { formatWalletAmount, walletTypeLabel } from '../constants/walletReportFilters';

interface WalletTransactionDetailModalProps {
  record: WalletReportRow | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value != null && value !== '' ? String(value) : '—'}</Text>
    </View>
  );
}

export default function WalletTransactionDetailModal({
  record,
  onClose,
}: WalletTransactionDetailModalProps) {
  if (!record) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={styles.scrimTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.headTitle}>Wallet Transaction Detail</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <DetailRow label="Customer ID" value={record.customer?.yapEntityId} />
            <DetailRow label="Customer Name" value={record.customer?.firstName} />
            <DetailRow label="Txn Amount" value={formatWalletAmount(record.txnAmount)} />
            <DetailRow label="Txn Date" value={record.txnDate ? fmtDateTime(record.txnDate) : '—'} />
            <DetailRow label="Txn Ref No" value={record.txnRefNo} />
            <DetailRow label="Txn Type" value={record.txnType} />
            <DetailRow label="Txn Status" value={record.txnStatus} />
            <DetailRow label="Wallet Type" value={walletTypeLabel(record.walletType)} />
            <DetailRow label="Balance" value={formatWalletAmount(record.balance)} />
            <DetailRow label="Merchant ID" value={record.merchantId} />
            <DetailRow label="Merchant Name" value={record.merchantLocation} />
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
    maxHeight: '82%',
    backgroundColor: Colors.bg.d1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white, flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glass.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  body: { padding: Spacing[4], gap: 10, paddingBottom: 32 },
  detailRow: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
  },
  detailLabel: { fontSize: FontSize.xs, color: Colors.text.label, fontWeight: '700' },
  detailValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
});
