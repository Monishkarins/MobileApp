import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, AppTypography, Radius } from '../../theme';

type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'amber';

const pillConfig: Record<PillVariant, { bg: string; border: string; text: string; dot: string }> = {
  success: { bg: Colors.successBg, border: Colors.successBorder, text: Colors.successLight, dot: Colors.success },
  warning: { bg: Colors.warningBg, border: Colors.warningBorder, text: Colors.warningLight, dot: Colors.warning },
  danger:  { bg: Colors.dangerBg,  border: Colors.dangerBorder,  text: Colors.dangerLight,  dot: Colors.danger },
  info:    { bg: Colors.infoBg,    border: Colors.infoBorder,    text: Colors.infoLight,    dot: Colors.info },
  neutral: { bg: Colors.glass.bg,  border: Colors.glass.border,  text: Colors.text.secondary, dot: Colors.text.subtle },
  amber:   { bg: Colors.amberBg,   border: Colors.amberBorder,   text: Colors.amber,        dot: Colors.amber },
};

interface StatusPillProps {
  label: string;
  variant?: PillVariant;
  showDot?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function StatusPill({ label, variant = 'neutral', showDot = true, style, small = false }: StatusPillProps) {
  const cfg = pillConfig[variant];
  return (
    <View style={[
      styles.pill,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      small && styles.pillSmall,
      style,
    ]}>
      {showDot && <View style={[styles.dot, { backgroundColor: cfg.dot }]} />}
      <Text style={[styles.text, { color: cfg.text }, small && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillSmall: { paddingHorizontal: 7, paddingVertical: 2 },
  dot:  { width: 6, height: 6, borderRadius: 3 },
  // Status chips are labels/captions, not body copy.
  text: { ...AppTypography.labelCaption },
  textSmall: { fontSize: 11 },
});
