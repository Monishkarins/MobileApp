import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, icon = '📭', actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.btn} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing[12], paddingHorizontal: Spacing[8] },
  icon:      { fontSize: 44, marginBottom: Spacing[4] },
  title:     { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.secondary, textAlign: 'center' },
  subtitle:  { fontSize: FontSize.base, color: Colors.text.subtle, textAlign: 'center', marginTop: Spacing[2], lineHeight: 22 },
  btn: {
    marginTop: Spacing[5],
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  btnText: { color: Colors.infoLight, fontSize: FontSize.base, fontWeight: '600' },
});
