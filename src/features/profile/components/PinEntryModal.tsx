import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../../theme';

interface PinEntryModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
}

export function PinEntryModal({
  visible,
  title = 'Enter PIN',
  subtitle = 'Use your 4-digit account PIN',
  isLoading = false,
  onCancel,
  onSubmit,
}: PinEntryModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    if (digits.length === 4) {
      onSubmit(digits);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            editable={!isLoading}
            placeholder="••••"
            placeholderTextColor={Colors.text.subtle}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (pin.length !== 4 || isLoading) && styles.submitBtnDisabled]}
              onPress={() => onSubmit(pin)}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.submitText}>Continue</Text>
              )}
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
    justifyContent: 'center',
    padding: Spacing[5],
  },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.glass.borderStrong,
    padding: Spacing[5],
    gap: Spacing[3],
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.subtle, lineHeight: 20 },
  input: {
    textAlign: 'center',
    letterSpacing: 12,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[4],
  },
  actions: { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[2] },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  cancelText: { color: Colors.white, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.yellow,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: Colors.navy, fontWeight: '800' },
});
