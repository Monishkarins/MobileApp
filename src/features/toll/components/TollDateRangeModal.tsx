/**
 * Custom toll date-range picker — mirrors web From/To with calendar selection.
 * Tapping a date field opens a native calendar; times default to 00:00 (from) and
 * 23:59 (to) to match the web DatePicker defaults.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';

const EARLIEST_TOLL_FROM_DATE = dayjs('2025-04-01');
const MAX_CUSTOM_RANGE_DAYS = 60;

export interface TollCustomDateRange {
  fromDate: string;
  toDate: string;
}

interface TollDateRangeModalProps {
  visible: boolean;
  initialRange?: TollCustomDateRange | null;
  onClose: () => void;
  onApply: (range: TollCustomDateRange) => void;
}

type ActivePicker = 'from' | 'to' | null;

type DatePickerComponent = React.ComponentType<{
  value: Date;
  mode: 'date';
  display: 'inline' | 'calendar' | 'default';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  themeVariant?: 'dark' | 'light';
}>;

// FY window caps selectable dates the same way the web DatePicker disabledDate does.
function getMaxSelectableDate(): Date {
  const today = dayjs();
  const fyEndYear = (today.month() >= 3 ? today.year() : today.year() - 1) + 1;
  const fyEnd = dayjs(`${fyEndYear}-03-31`).endOf('day');
  return (today.isBefore(fyEnd) ? today : fyEnd).toDate();
}

function parseInitialDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : null;
}

function formatDisplayDate(date: Date | null): string {
  return date ? dayjs(date).format('DD MMM YYYY') : '';
}

interface DateFieldProps {
  label: string;
  value: Date | null;
  placeholder: string;
  isActive: boolean;
  onPress: () => void;
}

function DateField({ label, value, placeholder, isActive, onPress }: DateFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, isActive && styles.inputActive]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={value ? styles.inputText : styles.placeholder}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TollDateRangeModal({
  visible,
  initialRange,
  onClose,
  onApply,
}: TollDateRangeModalProps) {
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [DatePickerComponent, setDatePickerComponent] = useState<DatePickerComponent | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDate = useMemo(() => getMaxSelectableDate(), []);
  const minFromDate = EARLIEST_TOLL_FROM_DATE.toDate();
  const minToDate = useMemo(() => {
    if (fromDate && dayjs(fromDate).isAfter(EARLIEST_TOLL_FROM_DATE, 'day')) {
      return fromDate;
    }
    return minFromDate;
  }, [fromDate, minFromDate]);

  useEffect(() => {
    if (!visible) return;
    setFromDate(parseInitialDate(initialRange?.fromDate));
    setToDate(parseInitialDate(initialRange?.toDate));
    setActivePicker(null);
    setDatePickerComponent(null);
    setError(null);
  }, [visible, initialRange]);

  // Load the native calendar only when a field is tapped — keeps the toll screen
  // import graph light and avoids startup crashes before a native rebuild.
  useEffect(() => {
    if (!activePicker) {
      setDatePickerComponent(null);
      setPickerLoading(false);
      return;
    }

    let cancelled = false;
    setPickerLoading(true);

    import('@react-native-community/datetimepicker')
      .then((mod) => {
        if (!cancelled) {
          setDatePickerComponent(() => mod.default);
          setPickerLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Calendar is unavailable — please rebuild the app.');
          setActivePicker(null);
          setPickerLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [activePicker]);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android closes the dialog after selection; iOS keeps the inline picker open.
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }

    if (event.type === 'dismissed' || !selected) return;

    if (activePicker === 'from') {
      setFromDate(selected);
      // Clear an invalid to-date when the new from-date moves past it.
      if (toDate && dayjs(toDate).isBefore(selected, 'day')) {
        setToDate(null);
      }
    } else if (activePicker === 'to') {
      setToDate(selected);
    }

    setError(null);
  };

  const handleApply = () => {
    if (!fromDate || !toDate) {
      setError('Select both From and To dates');
      return;
    }

    const fromStr = `${dayjs(fromDate).format('YYYY-MM-DD')} 00:00`;
    const toStr = `${dayjs(toDate).format('YYYY-MM-DD')} 23:59`;

    if (dayjs(fromStr).isBefore(EARLIEST_TOLL_FROM_DATE, 'day')) {
      setError('From date cannot be before 01-04-2025');
      return;
    }

    if (dayjs(toStr).isBefore(dayjs(fromStr))) {
      setError('To date must be on or after From date');
      return;
    }

    if (dayjs(toStr).diff(dayjs(fromStr), 'day') > MAX_CUSTOM_RANGE_DAYS) {
      setError('Selected range should not exceed 60 days');
      return;
    }

    onApply({ fromDate: fromStr, toDate: toStr });
    onClose();
  };

  const pickerValue = activePicker === 'to'
    ? (toDate ?? minToDate)
    : (fromDate ?? minFromDate);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Custom Date Range</Text>
          <Text style={styles.hint}>Tap a field to open the calendar</Text>

          <DateField
            label="From"
            value={fromDate}
            placeholder="Select from date"
            isActive={activePicker === 'from'}
            onPress={() => setActivePicker('from')}
          />

          <DateField
            label="To"
            value={toDate}
            placeholder="Select to date"
            isActive={activePicker === 'to'}
            onPress={() => setActivePicker('to')}
          />

          {activePicker ? (
            <View style={styles.pickerWrap}>
              {pickerLoading || !DatePickerComponent ? (
                <ActivityIndicator color={Colors.blue} style={styles.pickerLoader} />
              ) : (
                <DatePickerComponent
                  value={pickerValue}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  minimumDate={activePicker === 'from' ? minFromDate : minToDate}
                  maximumDate={maxDate}
                  onChange={handlePickerChange}
                  themeVariant="dark"
                />
              )}
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.donePickerBtn}
                  onPress={() => setActivePicker(null)}
                >
                  <Text style={styles.donePickerText}>Done</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1A33',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.text.subtle,
    marginBottom: Spacing[2],
  },
  fieldWrap: { marginTop: 8 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.infoBg,
  },
  inputText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  placeholder: {
    color: Colors.text.subtle,
    fontSize: FontSize.base,
  },
  calendarIcon: { fontSize: 16 },
  pickerWrap: {
    marginTop: Spacing[2],
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.glass.bg,
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerLoader: { paddingVertical: Spacing[3] },
  donePickerBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  donePickerText: {
    color: Colors.infoLight,
    fontWeight: '700',
    fontSize: FontSize.base,
  },
  error: {
    fontSize: FontSize.sm,
    color: Colors.dangerLight,
    marginTop: Spacing[2],
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing[4],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: 'center',
  },
  applyText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
