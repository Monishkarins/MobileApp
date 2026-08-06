/**
 * Custom toll date-range picker — mirrors web From/To with calendar selection.
 * Tapping a date field opens a native calendar; times default to 00:00 (from) and
 * 23:59 (to) to match the web DatePicker defaults.
 * No min/max calendar window — any month/year/date is selectable.
 *
 * Android DateTimePicker is rendered outside this Modal: nesting the system
 * dialog inside an RN Modal often auto-dismisses and sticks near "today".
 */

import React, { useEffect, useState } from 'react';
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
  display: 'inline' | 'calendar' | 'spinner' | 'default';
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  themeVariant?: 'dark' | 'light';
}>;

function parseInitialDate(value?: string): Date | null {
  if (!value) return null;
  // Prefer the leading YYYY-MM-DD so "YYYY-MM-DD HH:mm" never depends on Date.parse.
  const ymd = value.trim().slice(0, 10);
  const parsed = dayjs(ymd);
  if (parsed.isValid() && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date(parsed.year(), parsed.month(), parsed.date(), 12, 0, 0, 0);
  }
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.toDate() : null;
}

/** Format a Date using local calendar parts — avoids UTC day-shift on Android. */
function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  useEffect(() => {
    if (!visible) {
      setActivePicker(null);
      return;
    }
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
    // Android dialog is one-shot — close only after confirm or cancel.
    // Ignoring non-set events prevents spinner wheel ticks from dismissing early.
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setActivePicker(null);
        return;
      }
      if (event.type && event.type !== 'set') {
        return;
      }
      setActivePicker(null);
    }

    if (event.type === 'dismissed' || !selected) return;

    // Rebuild from local Y/M/D so Android timezone quirks cannot shift the day
    // when selecting older months/years.
    const localDate = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      12, 0, 0, 0,
    );

    if (activePicker === 'from') {
      setFromDate(localDate);
      // Clear an invalid to-date when the new from-date moves past it.
      if (toDate && dayjs(toDate).isBefore(localDate, 'day')) {
        setToDate(null);
      }
    } else if (activePicker === 'to') {
      setToDate(localDate);
    }

    setError(null);
  };

  const handleApply = () => {
    if (!fromDate || !toDate) {
      setError('Select both From and To dates');
      return;
    }

    // Match web TollTxnReportHeader: `YYYY-MM-DD HH:mm` (backend moment expands to seconds).
    const fromStr = `${formatLocalYmd(fromDate)} 00:00`;
    const toStr = `${formatLocalYmd(toDate)} 23:59`;

    if (formatLocalYmd(toDate) < formatLocalYmd(fromDate)) {
      setError('To date must be on or after From date');
      return;
    }

    onApply({ fromDate: fromStr, toDate: toStr });
    onClose();
  };

  // Fall back to today so the first open starts on a sensible month/year.
  const pickerValue = activePicker === 'to'
    ? (toDate ?? fromDate ?? new Date())
    : (fromDate ?? new Date());

  // Keep calendar/default (not spinner): spinner can fire onChange on every wheel
  // tick and dismiss before the user reaches 2022. Calendar confirms only on OK.
  const androidPicker = Platform.OS === 'android'
    && visible
    && activePicker
    && DatePickerComponent
    && !pickerLoading
    ? (
      <DatePickerComponent
        value={pickerValue}
        mode="date"
        display="default"
        onChange={handlePickerChange}
      />
    )
    : null;

  return (
    <>
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

            {Platform.OS === 'ios' && activePicker ? (
              <View style={styles.pickerWrap}>
                {pickerLoading || !DatePickerComponent ? (
                  <ActivityIndicator color={Colors.blue} style={styles.pickerLoader} />
                ) : (
                  <>
                    <DatePickerComponent
                      value={pickerValue}
                      mode="date"
                      display="spinner"
                      onChange={handlePickerChange}
                      themeVariant="dark"
                    />
                    <TouchableOpacity
                      style={styles.donePickerBtn}
                      onPress={() => setActivePicker(null)}
                    >
                      <Text style={styles.donePickerText}>Done</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}

            {Platform.OS === 'android' && activePicker && pickerLoading ? (
              <ActivityIndicator color={Colors.blue} style={styles.pickerLoader} />
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

      {/* Must sit outside Modal — nested Android dialogs drop/alter the chosen date. */}
      {androidPicker}
    </>
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
