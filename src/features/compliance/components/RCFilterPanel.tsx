/**
 * VAHAN RC search filters — mirrors web VehicleRcsHeader (customer, vehicle no,
 * expiry type + date range, RC status, vehicle group).
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { requiresAdminContextPicker, type RoleKey } from '../../../types/auth';
import {
  EMPTY_RC_FILTERS,
  RC_EXPIRY_TYPE_OPTIONS,
  RC_STATUS_OPTIONS,
  type RCFilters,
  type RcCustomerOption,
  type RcGroupOption,
} from '../constants/rcFilters';

interface RCFilterPanelProps {
  roleKey?: RoleKey;
  draft: RCFilters;
  customers: RcCustomerOption[];
  groups: RcGroupOption[];
  onChange: (next: RCFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

function SelectField({
  label,
  value,
  onPress,
  hasError,
  inRow,
}: {
  label: string;
  value: string;
  onPress: () => void;
  hasError?: boolean;
  // Row-paired fields share width via flex; standalone fields must keep their
  // intrinsic height (flex:1 in a column collapses the field and hides text).
  inRow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.select, inRow && styles.selectInRow, hasError && styles.selectError]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={styles.selectValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

function PickerModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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

export default function RCFilterPanel({
  roleKey,
  draft,
  customers,
  groups,
  onChange,
  onSearch,
  onReset,
}: RCFilterPanelProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [DatePickerComponent, setDatePickerComponent] = useState<React.ComponentType<any> | null>(null);

  const showCustomerFilter = requiresAdminContextPicker(roleKey);

  const customerLabel = customers.find((c) => c.firstName === draft.customerName)
    ? `${customers.find((c) => c.firstName === draft.customerName)?.yapEntityId} - ${draft.customerName}`
    : 'All customers';

  const expiryLabel = RC_EXPIRY_TYPE_OPTIONS.find((o) => o.value === draft.expiryType)?.label ?? 'All expiry types';
  const statusLabel = RC_STATUS_OPTIONS.find((o) => o.value === draft.status)?.label ?? 'All status';
  const groupLabel = groups.find((g) => g.id === draft.groupName)?.title ?? 'All groups';

  const fromDateLabel = draft.fromDate
    ? dayjs(draft.fromDate, 'YYYY-MM-DD').format('DD MMM YYYY')
    : 'From date';
  const toDateLabel = draft.toDate
    ? dayjs(draft.toDate, 'YYYY-MM-DD').format('DD MMM YYYY')
    : 'To date';

  const ensureDatePicker = () => {
    if (DatePickerComponent) return;
    import('@react-native-community/datetimepicker')
      .then((mod) => setDatePickerComponent(() => mod.default))
      .catch(() => { /* date picker unavailable — user can still search without dates */ });
  };

  const handleSearch = () => {
    // Web requires both dates when an expiry type is selected.
    if (draft.expiryType && (!draft.fromDate || !draft.toDate)) {
      setDateError(true);
      return;
    }
    setDateError(false);
    onSearch();
  };

  const renderDatePicker = (
    field: 'fromDate' | 'toDate',
    visible: boolean,
    onClose: () => void,
  ) => {
    if (!visible) return null;

    const currentValue = draft[field]
      ? dayjs(draft[field], 'YYYY-MM-DD').toDate()
      : new Date();

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
          onChange={(_event: any, date?: Date) => {
            onClose();
            if (date) {
              onChange({ ...draft, [field]: dayjs(date).format('YYYY-MM-DD') });
              setDateError(false);
            }
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
                onChange={(_event: any, date?: Date) => {
                  if (date) {
                    onChange({ ...draft, [field]: dayjs(date).format('YYYY-MM-DD') });
                    setDateError(false);
                  }
                }}
              />
            ) : (
              <Text style={styles.dateLoading}>Loading calendar…</Text>
            )}
            <TouchableOpacity style={styles.searchBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.searchText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.wrap}>
      {showCustomerFilter ? (
        <SelectField label="Customer" value={customerLabel} onPress={() => setCustomerOpen(true)} />
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Vehicle No"
        placeholderTextColor={Colors.text.subtle}
        value={draft.vehicleNo}
        onChangeText={(vehicleNo) => onChange({ ...draft, vehicleNo })}
        autoCapitalize="characters"
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />

      <SelectField label="Expiry Type" value={expiryLabel} onPress={() => setExpiryOpen(true)} />

      <View style={styles.row}>
        <SelectField
          label="From Date"
          value={fromDateLabel}
          onPress={() => { ensureDatePicker(); setFromDateOpen(true); }}
          hasError={dateError && !draft.fromDate}
          inRow
        />
        <SelectField
          label="To Date"
          value={toDateLabel}
          onPress={() => { ensureDatePicker(); setToDateOpen(true); }}
          hasError={dateError && !draft.toDate}
          inRow
        />
      </View>

      {dateError ? (
        <Text style={styles.errorText}>Select from and to dates when filtering by expiry type.</Text>
      ) : null}

      <View style={styles.row}>
        <SelectField label="Status" value={statusLabel} onPress={() => setStatusOpen(true)} inRow />
        <SelectField label="Group" value={groupLabel} onPress={() => setGroupOpen(true)} inRow />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => { setDateError(false); onReset(); }}
          activeOpacity={0.85}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <PickerModal visible={customerOpen} title="Customer" onClose={() => setCustomerOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, customerName: '' }); setCustomerOpen(false); }}
        >
          <Text style={styles.modalItemText}>All customers</Text>
        </TouchableOpacity>
        {customers.map((customer) => (
          <TouchableOpacity
            key={customer.yapEntityId}
            style={styles.modalItem}
            onPress={() => {
              // Web sends customerName (firstName) to /vehicleRc/rcList.
              onChange({ ...draft, customerName: customer.firstName });
              setCustomerOpen(false);
            }}
          >
            <Text style={[styles.modalItemText, draft.customerName === customer.firstName && styles.modalItemActive]}>
              {customer.yapEntityId} - {customer.firstName}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={expiryOpen} title="Expiry Type" onClose={() => setExpiryOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, expiryType: '' }); setExpiryOpen(false); }}
        >
          <Text style={styles.modalItemText}>All expiry types</Text>
        </TouchableOpacity>
        {RC_EXPIRY_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, expiryType: opt.value }); setExpiryOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.expiryType === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={statusOpen} title="Status" onClose={() => setStatusOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, status: '' }); setStatusOpen(false); }}
        >
          <Text style={styles.modalItemText}>All status</Text>
        </TouchableOpacity>
        {RC_STATUS_OPTIONS.map((opt) => (
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

      <PickerModal visible={groupOpen} title="Group" onClose={() => setGroupOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, groupName: '' }); setGroupOpen(false); }}
        >
          <Text style={styles.modalItemText}>All groups</Text>
        </TouchableOpacity>
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, groupName: group.id }); setGroupOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.groupName === group.id && styles.modalItemActive]}>
              {group.title}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      {renderDatePicker('fromDate', fromDateOpen, () => setFromDateOpen(false))}
      {renderDatePicker('toDate', toDateOpen, () => setToDateOpen(false))}
    </View>
  );
}

export { EMPTY_RC_FILTERS };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
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
  selectInRow: { flex: 1 },
  selectError: { borderColor: Colors.danger },
  selectLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 2 },
  selectValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  errorText: { fontSize: FontSize.xs, color: Colors.dangerLight, marginTop: -2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  searchBtn: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  resetBtn: {
    flex: 1,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '60%',
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
  },
  dateSheet: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
    paddingBottom: Spacing[6],
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing[3] },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalItemText: { fontSize: FontSize.base, color: Colors.text.secondary },
  modalItemActive: { color: Colors.infoLight, fontWeight: '700' },
  dateLoading: { fontSize: FontSize.sm, color: Colors.text.subtle, textAlign: 'center', paddingVertical: Spacing[4] },
});
