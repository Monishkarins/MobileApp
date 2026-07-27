/**
 * DA claims search filters — mirrors web DAClaimHeader field layout and enums.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { requiresAdminContextPicker, type RoleKey } from '../../../types/auth';
import { claimsApi } from '../../../services/api/claimsApi';
import {
  CLAIM_DATE_FILTER_OPTIONS,
  CLAIM_EXIT_TYPE_OPTIONS,
  CLAIM_LEVEL_OPTIONS,
  CLAIM_STATUS_OPTIONS,
  CLAIM_TYPE_OPTIONS,
  EMPTY_CLAIM_FILTERS,
  type ClaimCustomerOption,
  type ClaimFilters,
} from '../constants/claimFilters';

interface ClaimFilterPanelProps {
  roleKey?: RoleKey;
  draft: ClaimFilters;
  customers: ClaimCustomerOption[];
  onChange: (next: ClaimFilters) => void;
  /** Receives the filters to apply so Search is not blocked waiting on draft state. */
  onSearch: (next?: ClaimFilters) => void;
  onReset: () => void;
}

function SelectField({
  label,
  value,
  onPress,
  disabled = false,
  inRow = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  inRow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.select, inRow && styles.selectInRow, disabled && styles.selectDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.85}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={[styles.selectValue, disabled && styles.selectValueDisabled]} numberOfLines={1}>
        {value}
      </Text>
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
  // Backdrop and sheet are siblings so a suggestion tap cannot fall through
  // to From/To date fields underneath (common Android transparent-modal bug).
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ClaimFilterPanel({
  roleKey,
  draft,
  customers,
  onChange,
  onSearch,
  onReset,
}: ClaimFilterPanelProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [dateTypeOpen, setDateTypeOpen] = useState(false);
  const [tollIdOpen, setTollIdOpen] = useState(false);
  const [vrnOpen, setVrnOpen] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [tollSuggestions, setTollSuggestions] = useState<string[]>([]);
  const [vrnSuggestions, setVrnSuggestions] = useState<string[]>([]);
  const [DatePickerComponent, setDatePickerComponent] = useState<React.ComponentType<any> | null>(null);

  const showCustomerFilter = requiresAdminContextPicker(roleKey);
  const datesEnabled = Boolean(draft.dateFilterType);

  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return customers.filter((row) => {
      if (!row.yapEntityId || seen.has(row.yapEntityId)) return false;
      seen.add(row.yapEntityId);
      return true;
    });
  }, [customers]);

  const customerLabel = draft.customerName
    ? `${draft.customerId || uniqueCustomers.find((c) => c.firstName === draft.customerName)?.yapEntityId || ''} - ${draft.customerName}`.replace(/^ - /, '')
    : 'All customers';
  const statusLabel = CLAIM_STATUS_OPTIONS.find((o) => o.value === draft.claimStatus)?.label ?? 'All status';
  const typeLabel = CLAIM_TYPE_OPTIONS.find((o) => o.value === draft.claimType)?.label ?? 'All claim types';
  const exitLabel = CLAIM_EXIT_TYPE_OPTIONS.find((o) => o.value === draft.exitType)?.label ?? 'All exit types';
  const levelLabel = CLAIM_LEVEL_OPTIONS.find((o) => o.value === draft.claimLevel)?.label ?? 'All levels';
  const dateTypeLabel =
    draft.dateFilterType === 'transactionDate' && !draft.fromDateTime && !draft.toDateTime
      ? 'All dates (no range)'
      : (CLAIM_DATE_FILTER_OPTIONS.find((o) => o.value === draft.dateFilterType)?.label
        ?? (draft.dateFilterType || 'All dates (no range)'));
  // Empty From/To = no range (show all). Placeholders only hint the date type, not a preset window.
  const fromDateLabel = draft.fromDateTime
    ? dayjs(draft.fromDateTime, 'YYYY-MM-DD').format('DD MMM YYYY')
    : 'Any date';
  const toDateLabel = draft.toDateTime
    ? dayjs(draft.toDateTime, 'YYYY-MM-DD').format('DD MMM YYYY')
    : 'Any date';

  useEffect(() => {
    const query = draft.m2pTollId.trim();
    if (query.length < 1) {
      setTollSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      claimsApi.getTollPlazaCodes(query)
        .then(({ data }) => setTollSuggestions((data ?? []).map((row) => String(row.tollId))))
        .catch(() => setTollSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [draft.m2pTollId]);

  useEffect(() => {
    const query = draft.vehicleNo.trim();
    if (query.length < 1) {
      setVrnSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      claimsApi.getVrnList(query)
        .then(({ data }) => setVrnSuggestions((data ?? []).map((row) => row.vehicleNo)))
        .catch(() => setVrnSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [draft.vehicleNo]);

  const ensureDatePicker = () => {
    if (DatePickerComponent) return;
    import('@react-native-community/datetimepicker')
      .then((mod) => setDatePickerComponent(() => mod.default))
      .catch(() => { /* picker unavailable */ });
  };

  const handleSearch = () => {
    // VRN / Toll / RRN search must work with no date window. A half-filled
    // From/To range is cleared instead of blocking with a date alert.
    const hasPartialDate = Boolean(
      (draft.fromDateTime && !draft.toDateTime) || (!draft.fromDateTime && draft.toDateTime),
    );
    const next: ClaimFilters = hasPartialDate
      ? { ...draft, fromDateTime: '', toDateTime: '' }
      : draft;

    if (hasPartialDate) onChange(next);
    onSearch(next);
  };

  const renderDatePicker = (
    field: 'fromDateTime' | 'toDateTime',
    visible: boolean,
    onClose: () => void,
  ) => {
    if (!visible || !datesEnabled) return null;

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
          maximumDate={new Date()}
          onChange={(_: unknown, date?: Date) => {
            onClose();
            if (!date) return;
            onChange({ ...draft, [field]: dayjs(date).format('YYYY-MM-DD') });
          }}
        />
      );
    }

    if (!DatePickerComponent) {
      ensureDatePicker();
      return null;
    }

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.iosDateWrap}>
          <View style={styles.iosDateSheet}>
            <DatePickerComponent
              value={currentValue}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_: unknown, date?: Date) => {
                if (date) onChange({ ...draft, [field]: dayjs(date).format('YYYY-MM-DD') });
              }}
            />
            <TouchableOpacity style={styles.iosDateDone} onPress={onClose}>
              <Text style={styles.iosDateDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputInRow]}
          placeholder="Toll ID"
          placeholderTextColor={Colors.text.subtle}
          value={draft.m2pTollId}
          onChangeText={(m2pTollId) => onChange({ ...draft, m2pTollId })}
          onFocus={() => setTollIdOpen(true)}
        />
        <TextInput
          style={[styles.input, styles.inputInRow]}
          placeholder="Toll Name"
          placeholderTextColor={Colors.text.subtle}
          value={draft.tollName}
          onChangeText={(tollName) => onChange({ ...draft, tollName })}
        />
      </View>

      {showCustomerFilter ? (
        <SelectField label="Customer" value={customerLabel} onPress={() => setCustomerOpen(true)} />
      ) : null}

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputInRow]}
          placeholder="VRN"
          placeholderTextColor={Colors.text.subtle}
          value={draft.vehicleNo}
          onChangeText={(vehicleNo) => onChange({ ...draft, vehicleNo })}
          onFocus={() => setVrnOpen(true)}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, styles.inputInRow]}
          placeholder="RRN"
          placeholderTextColor={Colors.text.subtle}
          value={draft.rrn}
          onChangeText={(rrn) => onChange({ ...draft, rrn })}
        />
      </View>

      <SelectField label="Status" value={statusLabel} onPress={() => setStatusOpen(true)} />
      <SelectField label="Claim Type" value={typeLabel} onPress={() => setTypeOpen(true)} />

      <View style={styles.row}>
        <SelectField label="Exit Type" value={exitLabel} onPress={() => setExitOpen(true)} inRow />
        <SelectField label="Claim Level" value={levelLabel} onPress={() => setLevelOpen(true)} inRow />
      </View>

      <SelectField label="Date Filter Type" value={dateTypeLabel} onPress={() => setDateTypeOpen(true)} />

      <View style={styles.row}>
        <SelectField
          label="From Date"
          value={fromDateLabel}
          onPress={() => { ensureDatePicker(); setFromDateOpen(true); }}
          disabled={!datesEnabled}
          inRow
        />
        <SelectField
          label="To Date"
          value={toDateLabel}
          onPress={() => { ensureDatePicker(); setToDateOpen(true); }}
          disabled={!datesEnabled}
          inRow
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <PickerModal visible={tollIdOpen && tollSuggestions.length > 0} title="Toll ID" onClose={() => setTollIdOpen(false)}>
        {tollSuggestions.map((tollId) => (
          <TouchableOpacity
            key={tollId}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, m2pTollId: tollId }); setTollIdOpen(false); }}
          >
            <Text style={styles.modalItemText}>{tollId}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={vrnOpen && vrnSuggestions.length > 0} title="VRN" onClose={() => setVrnOpen(false)}>
        {vrnSuggestions.map((vehicleNo) => (
          <TouchableOpacity
            key={vehicleNo}
            style={styles.modalItem}
            onPress={() => {
              // Apply VRN only — leave From/To untouched so Search is not date-gated.
              onChange({ ...draft, vehicleNo });
              setVrnOpen(false);
              setFromDateOpen(false);
              setToDateOpen(false);
            }}
          >
            <Text style={styles.modalItemText}>{vehicleNo}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={customerOpen} title="Customer" onClose={() => setCustomerOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => {
            onChange({ ...draft, customerId: '', customerName: '' });
            setCustomerOpen(false);
          }}
        >
          <Text style={styles.modalItemText}>All customers</Text>
        </TouchableOpacity>
        {uniqueCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.yapEntityId}
            style={styles.modalItem}
            onPress={() => {
              onChange({
                ...draft,
                customerId: customer.yapEntityId,
                customerName: customer.firstName,
              });
              setCustomerOpen(false);
            }}
          >
            <Text style={styles.modalItemText}>{customer.yapEntityId} - {customer.firstName}</Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={statusOpen} title="Status" onClose={() => setStatusOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, claimStatus: '' }); setStatusOpen(false); }}
        >
          <Text style={styles.modalItemText}>All statuses</Text>
        </TouchableOpacity>
        {CLAIM_STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, claimStatus: opt.value }); setStatusOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.claimStatus === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={typeOpen} title="Claim Type" onClose={() => setTypeOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, claimType: '' }); setTypeOpen(false); }}
        >
          <Text style={styles.modalItemText}>All claim types</Text>
        </TouchableOpacity>
        {CLAIM_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, claimType: opt.value }); setTypeOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.claimType === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={exitOpen} title="Exit Type" onClose={() => setExitOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, exitType: '' }); setExitOpen(false); }}
        >
          <Text style={styles.modalItemText}>All exit types</Text>
        </TouchableOpacity>
        {CLAIM_EXIT_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, exitType: opt.value }); setExitOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.exitType === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={levelOpen} title="Claim Level" onClose={() => setLevelOpen(false)}>
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => { onChange({ ...draft, claimLevel: '' }); setLevelOpen(false); }}
        >
          <Text style={styles.modalItemText}>All levels</Text>
        </TouchableOpacity>
        {CLAIM_LEVEL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => { onChange({ ...draft, claimLevel: opt.value }); setLevelOpen(false); }}
          >
            <Text style={[styles.modalItemText, draft.claimLevel === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      <PickerModal visible={dateTypeOpen} title="Date Filter Type" onClose={() => setDateTypeOpen(false)}>
        {/* Same as Reset dates: keep default type but clear From/To so the list is uncapped. */}
        <TouchableOpacity
          style={styles.modalItem}
          onPress={() => {
            onChange({
              ...draft,
              dateFilterType: 'transactionDate',
              fromDateTime: '',
              toDateTime: '',
            });
            setDateTypeOpen(false);
          }}
        >
          <Text style={[
            styles.modalItemText,
            draft.dateFilterType === 'transactionDate' && !draft.fromDateTime && !draft.toDateTime && styles.modalItemActive,
          ]}>
            All dates (no range)
          </Text>
        </TouchableOpacity>
        {CLAIM_DATE_FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.modalItem}
            onPress={() => {
              onChange({
                ...draft,
                dateFilterType: opt.value,
                // Switching type does not invent dates — user must pick From/To explicitly.
              });
              setDateTypeOpen(false);
            }}
          >
            <Text style={[styles.modalItemText, draft.dateFilterType === opt.value && styles.modalItemActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </PickerModal>

      {renderDatePicker('fromDateTime', fromDateOpen, () => setFromDateOpen(false))}
      {renderDatePicker('toDateTime', toDateOpen, () => setToDateOpen(false))}
    </View>
  );
}

export { EMPTY_CLAIM_FILTERS };

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
  inputInRow: { flex: 1 },
  select: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectInRow: { flex: 1 },
  selectDisabled: { opacity: 0.5 },
  selectLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 2 },
  selectValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  selectValueDisabled: { color: Colors.text.subtle },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  searchBtn: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  resetBtn: {
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    justifyContent: 'center',
  },
  resetBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: FontSize.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bg.d1,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing[4],
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing[3],
  },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.glass.border },
  modalItemText: { fontSize: FontSize.sm, color: Colors.text.secondary },
  modalItemActive: { color: Colors.infoLight, fontWeight: '700' },
  iosDateWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  iosDateSheet: { backgroundColor: Colors.bg.d1, paddingBottom: Spacing[4] },
  iosDateDone: { alignItems: 'center', paddingVertical: 12 },
  iosDateDoneText: { color: Colors.blue, fontWeight: '700', fontSize: FontSize.base },
});
