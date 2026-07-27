/**
 * Incentive report filters — customer, month range, year, status (web parity).
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { requiresAdminContextPicker, type RoleKey } from '../../../types/auth';
import {
  EMPTY_INCENTIVE_FILTERS,
  INCENTIVE_MONTH_RANGE_OPTIONS,
  INCENTIVE_STATUS_OPTIONS,
  CUSTOMER_INCENTIVE_STATUS_OPTIONS,
  type IncentiveReportFilters,
} from '../constants/incentiveReportFilters';

interface CustomerOption {
  yapEntityId: string;
  firstName: string;
}

interface IncentiveReportFilterPanelProps {
  roleKey?: RoleKey;
  draft: IncentiveReportFilters;
  customers: CustomerOption[];
  onChange: (next: IncentiveReportFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.select} onPress={onPress} activeOpacity={0.85}>
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

export default function IncentiveReportFilterPanel({
  roleKey,
  draft,
  customers,
  onChange,
  onSearch,
  onReset,
}: IncentiveReportFilterPanelProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const showCustomerFilter = requiresAdminContextPicker(roleKey);
  const statusOptions = showCustomerFilter
    ? INCENTIVE_STATUS_OPTIONS
    : CUSTOMER_INCENTIVE_STATUS_OPTIONS;

  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return customers.filter((row) => {
      if (!row.yapEntityId || seen.has(row.yapEntityId)) return false;
      seen.add(row.yapEntityId);
      return true;
    });
  }, [customers]);

  const customerLabel = uniqueCustomers.find((c) => c.yapEntityId === draft.customerId)
    ? `${draft.customerId} - ${uniqueCustomers.find((c) => c.yapEntityId === draft.customerId)?.firstName ?? ''}`
    : 'All customers';
  const monthLabel = INCENTIVE_MONTH_RANGE_OPTIONS.find((o) => o.value === draft.monthRange)?.label ?? 'All quarters';
  const statusLabel = statusOptions.find((o) => o.value === draft.status)?.label ?? 'All status';

  return (
    <View style={styles.wrap}>
      {showCustomerFilter ? (
        <SelectField label="Customer" value={customerLabel} onPress={() => setCustomerOpen(true)} />
      ) : null}

      <SelectField label="Month Range" value={monthLabel} onPress={() => setMonthOpen(true)} />

      <TextInput
        style={styles.input}
        placeholder="Year (e.g. 2025)"
        placeholderTextColor={Colors.text.subtle}
        value={draft.year}
        onChangeText={(year) => onChange({ ...draft, year })}
        keyboardType="number-pad"
        returnKeyType="search"
        onSubmitEditing={onSearch}
      />

      <SelectField label="Status" value={statusLabel} onPress={() => setStatusOpen(true)} />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.85}>
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <PickerModal visible={customerOpen} title="Customer" onClose={() => setCustomerOpen(false)}>
        <TouchableOpacity style={styles.modalItem} onPress={() => { onChange({ ...draft, customerId: '' }); setCustomerOpen(false); }}>
          <Text style={styles.modalItemText}>All customers</Text>
        </TouchableOpacity>
        {uniqueCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.yapEntityId}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, customerId: customer.yapEntityId }); setCustomerOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.customerId === customer.yapEntityId && styles.modalItemActive]}>
              {customer.yapEntityId} - {customer.firstName}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={monthOpen} title="Month Range" onClose={() => setMonthOpen(false)}>
        <TouchableOpacity style={styles.modalItem} onPress={() => { onChange({ ...draft, monthRange: '' }); setMonthOpen(false); }}>
          <Text style={styles.modalItemText}>All quarters</Text>
        </TouchableOpacity>
        {INCENTIVE_MONTH_RANGE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, monthRange: opt.value }); setMonthOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.monthRange === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={statusOpen} title="Status" onClose={() => setStatusOpen(false)}>
        <TouchableOpacity style={styles.modalItem} onPress={() => { onChange({ ...draft, status: '' }); setStatusOpen(false); }}>
          <Text style={styles.modalItemText}>All status</Text>
        </TouchableOpacity>
        {statusOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, status: opt.value }); setStatusOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.status === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>
    </View>
  );
}

export { EMPTY_INCENTIVE_FILTERS };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: 8 },
  input: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  select: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 2 },
  selectValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  searchBtn: { flex: 1, backgroundColor: Colors.blue, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  searchText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  resetBtn: { flex: 1, backgroundColor: Colors.glass.bg, borderWidth: 1, borderColor: Colors.glass.border, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  resetText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '60%', backgroundColor: Colors.navy, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing[4] },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing[3] },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalItemText: { fontSize: FontSize.base, color: Colors.text.secondary },
  modalItemActive: { color: Colors.infoLight, fontWeight: '700' },
});
