/**
 * Wallet transaction report filters — customer, date range, txn type, wallet type (web parity).
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { requiresAdminContextPicker, type RoleKey } from '../../../types/auth';
import { canShowAgentFilter } from '../../toll/components/TagInventoryFilterPanel';
import {
  WALLET_REPORT_DATE_RANGES,
  WALLET_TXN_TYPE_OPTIONS,
  WALLET_TYPE_OPTIONS,
  EARLIEST_WALLET_REPORT_FROM_DATE,
  buildWalletReportDateValue,
  formatWalletReportDateLabel,
  getWalletReportMaxSelectableDate,
  getWalletReportMinToDate,
  parseWalletReportDate,
  validateWalletReportFilters,
  type WalletReportFilters,
} from '../constants/walletReportFilters';

interface CustomerOption {
  yapEntityId: string;
  firstName: string;
}

interface AgentOption {
  id: number;
  agentName: string;
}

interface WalletTransactionFilterPanelProps {
  roleKey?: RoleKey;
  draft: WalletReportFilters;
  customers: CustomerOption[];
  agents: AgentOption[];
  onChange: (next: WalletReportFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

function SelectField({
  label,
  value,
  onPress,
  inRow,
}: {
  label: string;
  value: string;
  onPress: () => void;
  inRow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.select, inRow && styles.selectInRow]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={styles.selectValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

function PickerModal({
  visible, title, onClose, children,
}: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView>{children}</ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function WalletTransactionFilterPanel({
  roleKey,
  draft,
  customers,
  agents,
  onChange,
  onSearch,
  onReset,
}: WalletTransactionFilterPanelProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [txnTypeOpen, setTxnTypeOpen] = useState(false);
  const [walletTypeOpen, setWalletTypeOpen] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [DatePickerComponent, setDatePickerComponent] = useState<React.ComponentType<any> | null>(null);

  const showCustomerFilter = requiresAdminContextPicker(roleKey);
  const showAgentFilter = canShowAgentFilter(roleKey);

  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return customers.filter((row) => {
      if (!row.yapEntityId || seen.has(row.yapEntityId)) return false;
      seen.add(row.yapEntityId);
      return true;
    });
  }, [customers]);

  const customerLabel = draft.customerName
    ? uniqueCustomers.find((row) => row.firstName === draft.customerName)?.firstName ?? draft.customerName
    : 'All customers';

  const agentLabel = draft.agentId
    ? agents.find((row) => String(row.id) === draft.agentId)?.agentName ?? draft.agentId
    : 'All agents';

  const rangeLabel = WALLET_REPORT_DATE_RANGES.find((row) => row.value === draft.dateRange)?.label ?? 'Any period';
  const txnTypeLabel = WALLET_TXN_TYPE_OPTIONS.find((row) => row.value === draft.txnType)?.label ?? 'All txn types';
  const walletTypeLabel = WALLET_TYPE_OPTIONS.find((row) => row.value === draft.walletType)?.label ?? 'All wallet types';
  const fromDateLabel = formatWalletReportDateLabel(draft.fromDate, 'From date');
  const toDateLabel = formatWalletReportDateLabel(draft.toDate, 'To date');

  const minFromDate = dayjs(EARLIEST_WALLET_REPORT_FROM_DATE).toDate();
  const maxDate = getWalletReportMaxSelectableDate();
  const minToDate = getWalletReportMinToDate(draft.fromDate);

  const ensureDatePicker = () => {
    if (DatePickerComponent) return;
    import('@react-native-community/datetimepicker')
      .then((mod) => setDatePickerComponent(() => mod.default))
      .catch(() => { /* picker unavailable */ });
  };

  const applyCustomDate = (field: 'fromDate' | 'toDate', date: Date) => {
    const nextValue = buildWalletReportDateValue(field === 'fromDate' ? 'from' : 'to', date);
    onChange({
      ...draft,
      [field]: nextValue,
      dateRange: '',
      ...(field === 'fromDate' && draft.toDate
        ? (() => {
          const from = dayjs(nextValue);
          const to = dayjs(draft.toDate, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD'], true);
          return to.isValid() && to.isBefore(from, 'day') ? { toDate: '' } : {};
        })()
        : {}),
    });
  };

  const handleSearchPress = () => {
    const validationError = validateWalletReportFilters(draft);
    if (validationError) {
      Alert.alert('Invalid date range', validationError);
      return;
    }
    onSearch();
  };

  const renderDatePicker = (
    field: 'fromDate' | 'toDate',
    visible: boolean,
    onClose: () => void,
  ) => {
    if (!visible) return null;

    const currentValue = parseWalletReportDate(draft[field]);
    const minimumDate = field === 'fromDate' ? minFromDate : minToDate;

    if (Platform.OS === 'android') {
      if (!DatePickerComponent) {
        ensureDatePicker();
        return null;
      }
      return (
        <DatePickerComponent
          value={currentValue}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maxDate}
          onChange={(_event: any, date?: Date) => {
            onClose();
            if (date) applyCustomDate(field, date);
          }}
        />
      );
    }

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
          <View style={styles.dateSheet}>
            <Text style={styles.modalTitle}>{field === 'fromDate' ? 'From Date' : 'To Date'}</Text>
            {DatePickerComponent ? (
              <DatePickerComponent
                value={currentValue}
                mode="date"
                display="spinner"
                themeVariant="dark"
                minimumDate={minimumDate}
                maximumDate={maxDate}
                onChange={(_event: any, date?: Date) => {
                  if (date) applyCustomDate(field, date);
                }}
              />
            ) : (
              <Text style={styles.dateLoading}>Loading calendar…</Text>
            )}
            <TouchableOpacity style={styles.searchBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.searchBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.panel}>
      {showCustomerFilter ? (
        <SelectField label="Customer" value={customerLabel} onPress={() => setCustomerOpen(true)} />
      ) : null}

      {showAgentFilter ? (
        <SelectField label="Agent" value={agentLabel} onPress={() => setAgentOpen(true)} />
      ) : null}

      <SelectField label="Date Range" value={rangeLabel} onPress={() => setRangeOpen(true)} />

      <View style={styles.row}>
        <SelectField
          label="From Date"
          value={fromDateLabel}
          onPress={() => { ensureDatePicker(); setFromDateOpen(true); }}
          inRow
        />
        <SelectField
          label="To Date"
          value={toDateLabel}
          onPress={() => { ensureDatePicker(); setToDateOpen(true); }}
          inRow
        />
      </View>

      <SelectField label="Txn Type" value={txnTypeLabel} onPress={() => setTxnTypeOpen(true)} />
      <SelectField label="Wallet Type" value={walletTypeLabel} onPress={() => setWalletTypeOpen(true)} />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchPress} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <PickerModal visible={customerOpen} title="Customer" onClose={() => setCustomerOpen(false)}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onChange({ ...draft, customerName: '' }); setCustomerOpen(false); }}
        >
          <Text style={styles.optionText}>All customers</Text>
        </TouchableOpacity>
        {uniqueCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.yapEntityId}
            style={styles.option}
            onPress={() => { onChange({ ...draft, customerName: customer.firstName }); setCustomerOpen(false); }}
          >
            <Text style={styles.optionText}>{customer.yapEntityId} - {customer.firstName}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={agentOpen} title="Agent" onClose={() => setAgentOpen(false)}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onChange({ ...draft, agentId: '' }); setAgentOpen(false); }}
        >
          <Text style={styles.optionText}>All agents</Text>
        </TouchableOpacity>
        {agents.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            style={styles.option}
            onPress={() => { onChange({ ...draft, agentId: String(agent.id) }); setAgentOpen(false); }}
          >
            <Text style={styles.optionText}>{agent.agentName}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={rangeOpen} title="Date Range" onClose={() => setRangeOpen(false)}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onChange({ ...draft, dateRange: '', fromDate: '', toDate: '' }); setRangeOpen(false); }}
        >
          <Text style={styles.optionText}>Any period</Text>
        </TouchableOpacity>
        {WALLET_REPORT_DATE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.value}
            style={styles.option}
            onPress={() => { onChange({ ...draft, dateRange: range.value, fromDate: '', toDate: '' }); setRangeOpen(false); }}
          >
            <Text style={styles.optionText}>{range.label}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={txnTypeOpen} title="Txn Type" onClose={() => setTxnTypeOpen(false)}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onChange({ ...draft, txnType: '' }); setTxnTypeOpen(false); }}
        >
          <Text style={styles.optionText}>All txn types</Text>
        </TouchableOpacity>
        {WALLET_TXN_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.option}
            onPress={() => { onChange({ ...draft, txnType: option.value }); setTxnTypeOpen(false); }}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={walletTypeOpen} title="Wallet Type" onClose={() => setWalletTypeOpen(false)}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { onChange({ ...draft, walletType: '' }); setWalletTypeOpen(false); }}
        >
          <Text style={styles.optionText}>All wallet types</Text>
        </TouchableOpacity>
        {WALLET_TYPE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.option}
            onPress={() => { onChange({ ...draft, walletType: option.value }); setWalletTypeOpen(false); }}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      {renderDatePicker('fromDate', fromDateOpen, () => setFromDateOpen(false))}
      {renderDatePicker('toDate', toDateOpen, () => setToDateOpen(false))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], gap: 10 },
  select: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
  },
  selectInRow: { flex: 1 },
  selectLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 4, fontWeight: '600' },
  selectValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  dateSheet: {
    backgroundColor: Colors.bg.d2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing[4],
    paddingBottom: Spacing[6],
  },
  dateLoading: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  searchBtn: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  resetBtn: {
    flex: 1,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetBtnText: { color: Colors.text.secondary, fontWeight: '700', fontSize: FontSize.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: Colors.bg.d2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing[4],
  },
  modalTitle: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing[3],
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionText: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
