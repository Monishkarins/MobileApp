import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { Colors, FontSize, Spacing } from '../../theme';

interface GlassMetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: object;
}

export function GlassMetricCard({
  label, value, sub, variant = 'default', onPress, icon, style,
}: GlassMetricCardProps) {
  const valueColor =
    variant === 'danger'  ? Colors.dangerLight  :
    variant === 'warning' ? Colors.warningLight :
    variant === 'success' ? Colors.successLight :
    variant === 'info'    ? Colors.infoLight    :
    Colors.text.primary;

  // GlassCard fills the wrapper so layout sizing (grid width/height) can live on
  // the outermost element — otherwise pressable vs non-pressable cards (which
  // add a TouchableOpacity wrapper) would render at different widths.
  const card = (
    <GlassCard
      variant={variant === 'default' ? 'default' : variant}
      style={styles.fill}
    >
      {icon && <View style={styles.iconRow}>{icon}</View>}
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
    </GlassCard>
  );

  // Keep the layout style on the outer node in both branches for consistent sizing.
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
        {card}
      </TouchableOpacity>
    );
  }
  return <View style={style}>{card}</View>;
}

const styles = StyleSheet.create({
  // Fill the grid cell's width only; height stays content-driven so tiles don't
  // stretch to fill the row's cross-axis (which blew the cards up full-screen).
  fill: {
    width: '100%',
  },
  iconRow: {
    marginBottom: Spacing[2],
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.text.label,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: FontSize['4xl'] * 1.1,
  },
  sub: {
    fontSize: FontSize.xs,
    color: Colors.text.subtle,
    marginTop: 3,
  },
});
