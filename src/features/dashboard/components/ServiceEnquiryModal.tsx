/**
 * Service enquiry modal — submits product interest to /fleet-dashboard/service-enquiry.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { dashboardApi } from '../../../services/api/dashboardApi';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';
import { SERVICE_REQUEST_OPTIONS } from '../constants/karinsServices';

interface ServiceEnquiryModalProps {
  visible: boolean;
  onClose: () => void;
  fleetSize?: number;
  initialService?: string;
}

export default function ServiceEnquiryModal({
  visible,
  onClose,
  fleetSize,
  initialService,
}: ServiceEnquiryModalProps) {
  const [service, setService] = useState(SERVICE_REQUEST_OPTIONS[0]);
  const [contact, setContact] = useState('');
  const [fleetSizeValue, setFleetSizeValue] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setContact('');
      setNote('');
      setFleetSizeValue(fleetSize ? String(fleetSize) : '');
      return;
    }

    const preset = initialService && SERVICE_REQUEST_OPTIONS.includes(initialService)
      ? initialService
      : SERVICE_REQUEST_OPTIONS[0];
    setService(preset);
    setFleetSizeValue(fleetSize ? String(fleetSize) : '');
    setNote('');
  }, [visible, initialService, fleetSize]);

  const handleSubmit = async () => {
    const normalizedMobile = contact.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      Alert.alert('Invalid mobile', 'Enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await dashboardApi.submitServiceEnquiry({
        serviceName: service,
        mobileNumber: normalizedMobile,
        fleetSize: fleetSizeValue ? Number(fleetSizeValue) : undefined,
        message: note.trim() || undefined,
      });

      if (!data?.enquiryId) {
        Alert.alert('Request failed', 'Request could not be saved. Please try again.');
        return;
      }

      Alert.alert(
        'Request submitted',
        'Our team will reach out shortly.',
        [{ text: 'OK', onPress: onClose }],
      );
    } catch {
      Alert.alert('Request failed', 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Request a Service</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.label}>Service</Text>
            <View style={styles.chips}>
              {SERVICE_REQUEST_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, service === option && styles.chipActive]}
                  onPress={() => setService(option)}
                >
                  <Text style={[styles.chipText, service === option && styles.chipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mobile number</Text>
            <TextInput
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              placeholder="10-digit mobile"
              placeholderTextColor={DASHBOARD_LIGHT_WHITE}
              maxLength={10}
            />

            <Text style={styles.label}>Fleet size (optional)</Text>
            <TextInput
              style={styles.input}
              value={fleetSizeValue}
              onChangeText={setFleetSizeValue}
              keyboardType="number-pad"
              placeholder="Number of vehicles"
              placeholderTextColor={DASHBOARD_LIGHT_WHITE}
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Tell us what you need"
              placeholderTextColor={DASHBOARD_LIGHT_WHITE}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.submitText}>Submit Request</Text>
            )}
          </TouchableOpacity>
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
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  close: {
    fontSize: FontSize.xl,
    color: DASHBOARD_LIGHT_WHITE,
    paddingHorizontal: 4,
  },
  body: { padding: Spacing[4], gap: 8 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: DASHBOARD_LIGHT_WHITE,
    marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bg,
  },
  chipActive: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: DASHBOARD_LIGHT_WHITE,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.infoLight,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.white,
    fontSize: FontSize.base,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  submitBtn: {
    margin: Spacing[4],
    marginTop: 0,
    backgroundColor: Colors.yellow,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.navy,
  },
});
