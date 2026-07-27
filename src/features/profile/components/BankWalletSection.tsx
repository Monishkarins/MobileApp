/**
 * Bank / wallet account blocks on Profile — mirrors web UserProfile wallet grids.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import type { WalletDetailField } from '../utils/mapCustomerProfile';

const ADMIN_WALLET = {
  accountNumber: 'QWALLET01LQPARTNER20',
  ifsc: 'YESB0CMSNOC',
  upiId: 'QWALLET01LQPARTNER20@yesbankltd',
};

async function copyText(label: string, value: string) {
  if (!value.trim()) return;
  try {
    await Share.share({ message: value });
  } catch {
    Alert.alert(label, value);
  }
}

async function copyAll(fields: WalletDetailField[], title: string) {
  const text = fields
    .filter((f) => f.value.trim())
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n');
  if (!text) return;
  try {
    await Share.share({ message: `${title}\n${text}` });
  } catch {
    Alert.alert(title, text);
  }
}

function DetailRow({
  label,
  yesValue,
  idfcValue,
  onCopyYes,
  onCopyIdfc,
  large = false,
}: {
  label: string;
  yesValue: string;
  idfcValue: string;
  onCopyYes: () => void;
  onCopyIdfc: () => void;
  large?: boolean;
}) {
  const isUpiId = label === 'UPI ID';
  const expandYesOverIdfc = isUpiId && !idfcValue.trim();
  const isAccName = label === 'AccName';
  const isAccountNumber = label === 'AccNo';
  const isCompactValue = isAccName || isAccountNumber || label === 'IFSC';

  const renderValue = (value: string, wide = false, compact = false) => (
    <Text
      style={[
        styles.valueText,
        large && styles.valueTextLarge,
        wide && styles.valueTextWide,
        compact && styles.valueTextCompact,
        large && compact && styles.valueTextCompactLarge,
        isAccountNumber && styles.valueTextAccountNumber,
        large && isAccountNumber && styles.valueTextAccountNumberLarge,
      ]}
      selectable
      numberOfLines={1}
      adjustsFontSizeToFit={isCompactValue || wide}
      minimumFontScale={compact ? 0.5 : 0.6}
    >
      {value || '—'}
    </Text>
  );

  return (
    <View style={[styles.row, large && styles.rowLarge]}>
      <Text style={[styles.rowLabel, large && styles.rowLabelLarge]}>{label}</Text>
      <TouchableOpacity
        style={[styles.valueCol, expandYesOverIdfc && styles.valueColWide]}
        onPress={onCopyYes}
        disabled={!yesValue}
      >
        {renderValue(yesValue, expandYesOverIdfc)}
      </TouchableOpacity>
      {expandYesOverIdfc ? null : (
        <TouchableOpacity style={styles.valueCol} onPress={onCopyIdfc} disabled={!idfcValue}>
          {renderValue(idfcValue, false, isAccName)}
        </TouchableOpacity>
      )}
    </View>
  );
}

function UpiBox({
  yesLabel,
  idfcLabel,
  yesUpi,
  idfcUpi,
  large = false,
}: {
  yesLabel: string;
  idfcLabel: string;
  yesUpi: string;
  idfcUpi: string;
  large?: boolean;
}) {
  // Render UPI IDs in their own full-width card so long handles are fully readable
  const hasYes = yesUpi.trim().length > 0;
  const hasIdfc = idfcUpi.trim().length > 0;

  if (!hasYes && !hasIdfc) return null;

  return (
    <GlassCard style={styles.upiBox} noPadding>
      <View style={styles.upiBoxHeader}>
        <Text style={[styles.upiBoxHeaderText, large && styles.upiBoxHeaderTextLarge]}>UPI ID</Text>
      </View>
      {hasYes ? (
        <TouchableOpacity
          style={styles.upiRow}
          onPress={() => copyText('UPI ID', yesUpi)}
          activeOpacity={0.7}
        >
          <Text style={[styles.upiValue, large && styles.upiValueLarge]} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {yesUpi}
          </Text>
        </TouchableOpacity>
      ) : null}
      {hasYes && hasIdfc ? <View style={styles.upiDivider} /> : null}
      {hasIdfc ? (
        <TouchableOpacity
          style={styles.upiRow}
          onPress={() => copyText('UPI ID', idfcUpi)}
          activeOpacity={0.7}
        >
          <Text style={[styles.upiValue, large && styles.upiValueLarge]} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {idfcUpi}
          </Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

function WalletGrid({
  title,
  yesLabel,
  idfcLabel,
  yesBank,
  idfcBank,
  large = false,
}: {
  title: string;
  yesLabel: string;
  idfcLabel: string;
  yesBank: WalletDetailField[];
  idfcBank: WalletDetailField[];
  large?: boolean;
}) {
  // Separate UPI fields out so they get their own full-width box below the grid
  const nonUpiYes = yesBank.filter((f) => f.label !== 'UPI ID');
  const nonUpiIdfc = idfcBank.filter((f) => f.label !== 'UPI ID');
  const yesUpi = yesBank.find((f) => f.label === 'UPI ID')?.value ?? '';
  const idfcUpi = idfcBank.find((f) => f.label === 'UPI ID')?.value ?? '';

  return (
  <View style={styles.block}>
    <View style={styles.blockHead}>
      <Text style={[styles.blockTitle, large && styles.blockTitleLarge]}>{title}</Text>
      <View style={styles.copyActions}>
        <TouchableOpacity onPress={() => copyAll(yesBank, yesLabel)}>
          <Text style={[styles.copyLink, large && styles.copyLinkLarge]}>Copy YES</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyAll(idfcBank, idfcLabel)}>
          <Text style={[styles.copyLink, large && styles.copyLinkLarge]}>Copy IDFC</Text>
        </TouchableOpacity>
      </View>
    </View>
    <GlassCard style={styles.gridCard} noPadding>
      <View style={[styles.row, styles.headerRow, large && styles.headerRowLarge]}>
        <Text style={[styles.headerCell, styles.headerCellField, large && styles.headerCellLarge, large && styles.headerCellFieldLarge]}>Field</Text>
        <Text style={[styles.headerCell, large && styles.headerCellLarge]}>{yesLabel}</Text>
        <Text style={[styles.headerCell, large && styles.headerCellLarge, large && styles.headerCellIdfc]}>{idfcLabel}</Text>
      </View>
      {nonUpiYes.map((item, index) => (
        <DetailRow
          key={item.label}
          label={item.label}
          yesValue={nonUpiYes[index]?.value ?? ''}
          idfcValue={nonUpiIdfc[index]?.value ?? ''}
          onCopyYes={() => copyText(item.label, nonUpiYes[index]?.value ?? '')}
          onCopyIdfc={() => copyText(item.label, nonUpiIdfc[index]?.value ?? '')}
          large={large}
        />
      ))}
    </GlassCard>
    <UpiBox
      yesLabel={yesLabel}
      idfcLabel={idfcLabel}
      yesUpi={yesUpi}
      idfcUpi={idfcUpi}
      large={large}
    />
  </View>
  );
}

export function AdminWalletSection() {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Admin Wallet Details</Text>
      <GlassCard style={styles.adminCard}>
        <TouchableOpacity onPress={() => copyText('AccNo', ADMIN_WALLET.accountNumber)}>
          <Text style={styles.adminLabel}>AccNo</Text>
          <Text style={styles.adminValue} selectable>{ADMIN_WALLET.accountNumber}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyText('IFSC', ADMIN_WALLET.ifsc)}>
          <Text style={styles.adminLabel}>IFSC</Text>
          <Text style={styles.adminValue} selectable>{ADMIN_WALLET.ifsc}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyText('UPI ID', ADMIN_WALLET.upiId)}>
          <Text style={styles.adminLabel}>UPI ID</Text>
          <Text style={styles.adminValue} selectable>{ADMIN_WALLET.upiId}</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

export function AgentWalletSection({
  accountNumber,
  ifsc,
  upiId,
}: {
  accountNumber: string;
  ifsc: string;
  upiId: string;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Agent Wallet Details</Text>
      <GlassCard style={styles.adminCard}>
        <TouchableOpacity onPress={() => copyText('AccNo', accountNumber)}>
          <Text style={styles.adminLabel}>AccNo</Text>
          <Text style={styles.adminValue} selectable>{accountNumber || '—'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyText('IFSC', ifsc)}>
          <Text style={styles.adminLabel}>IFSC</Text>
          <Text style={styles.adminValue} selectable>{ifsc || '—'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyText('UPI ID', upiId)}>
          <Text style={styles.adminLabel}>UPI ID</Text>
          <Text style={styles.adminValue} selectable>{upiId || '—'}</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

export function CustomerWalletSections({
  fastagYesBank,
  fastagIdfc,
  corporateYesBank,
  corporateIdfc,
  showCorporate,
}: {
  fastagYesBank: WalletDetailField[];
  fastagIdfc: WalletDetailField[];
  corporateYesBank: WalletDetailField[];
  corporateIdfc: WalletDetailField[];
  showCorporate: boolean;
}) {
  return (
    <>
      <WalletGrid
        title="FASTag Account Information"
        yesLabel="FASTag YES Bank"
        idfcLabel="FASTag IDFC"
        yesBank={fastagYesBank}
        idfcBank={fastagIdfc}
        large
      />
      {showCorporate ? (
        <WalletGrid
          title="Corporate Account Information"
          yesLabel="Corp. YES Bank"
          idfcLabel="Corp. IDFC"
          yesBank={corporateYesBank}
          idfcBank={corporateIdfc}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing[4] },
  blockHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.infoLight,
  },
  blockTitleLarge: {
    fontSize: FontSize.base,
  },
  copyActions: { flexDirection: 'row', gap: 12 },
  copyLink: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '600' },
  copyLinkLarge: { fontSize: FontSize.sm },
  gridCard: { overflow: 'hidden' },
  headerRow: { backgroundColor: Colors.blue, paddingVertical: 8 },
  headerRowLarge: { paddingVertical: 10 },
  headerCell: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'left',
    paddingLeft: 4,
  },
  headerCellLarge: {
    fontSize: FontSize.sm,
  },
  headerCellIdfc: {
    fontSize: FontSize.xs,
  },
  headerCellField: {
    flex: 0,
    width: 72,
    textAlign: 'left',
    paddingLeft: 4,
  },
  headerCellFieldLarge: {
    width: 84,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  rowLarge: {
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  rowLabel: {
    width: 72,
    flexShrink: 0,
    fontSize: FontSize.xs,
    color: Colors.text.subtle,
    fontWeight: '600',
    textAlign: 'left',
  },
  rowLabelLarge: {
    width: 84,
    fontSize: FontSize.sm,
  },
  valueCol: {
    flex: 1,
    paddingHorizontal: 4,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // UPI row: span YES + empty IDFC so the full handle is readable.
  valueColWide: { flex: 2 },
  valueText: {
    width: '100%',
    fontSize: FontSize.xs,
    color: Colors.white,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  valueTextLarge: {
    fontSize: FontSize.sm,
  },
  valueTextCompact: {
    fontSize: 10,
  },
  valueTextCompactLarge: {
    fontSize: FontSize.xs,
  },
  valueTextAccountNumber: {
    fontSize: 9,
  },
  valueTextAccountNumberLarge: {
    fontSize: 10,
  },
  valueTextWide: {
    width: '100%',
    textAlign: 'left',
  },
  upiBox: { marginTop: 8, overflow: 'hidden' },
  upiBoxHeader: {
    backgroundColor: Colors.blue,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  upiBoxHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  upiBoxHeaderTextLarge: { fontSize: FontSize.sm },
  upiRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  upiValue: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontFamily: 'monospace',
  },
  upiValueLarge: { fontSize: FontSize.sm },
  upiDivider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: 12 },
  adminCard: { gap: 12, padding: Spacing[4] },
  adminLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 2 },
  adminValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600', fontFamily: 'monospace' },
});
