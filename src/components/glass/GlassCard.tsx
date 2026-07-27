import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {Colors, Radius, Shadow} from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?:
    | 'default'
    | 'strong'
    | 'hero'
    | 'dark'
    | 'danger'
    | 'success'
    | 'warning'
    | 'info';
  radius?: number;
  padding?: number;
  noPadding?: boolean;
  /**
   * Real blur is deliberately opt-in. Dense scrolling cards use the translucent
   * fallback to avoid Android GPU jank; hero/navigation surfaces can enable it.
   */
  blur?: boolean;
  blurAmount?: number;
  /** Adds a restrained liquid-glass highlight on the top edge. */
  highlight?: boolean;
}

const variantStyles: Record<
  NonNullable<GlassCardProps['variant']>,
  {bg: string; border: string}
> = {
  default: {bg: Colors.glass.bg, border: Colors.glass.border},
  strong: {bg: Colors.glass.bgStrong, border: Colors.glass.borderStrong},
  hero: {bg: 'rgba(8,36,66,0.78)', border: Colors.glass.borderStrong},
  dark: {bg: Colors.glass.bgDark, border: Colors.glass.border},
  danger: {bg: Colors.dangerBg, border: Colors.dangerBorder},
  success: {bg: Colors.successBg, border: Colors.successBorder},
  warning: {bg: Colors.warningBg, border: Colors.warningBorder},
  info: {bg: Colors.infoBg, border: Colors.infoBorder},
};

export function GlassCard({
  children,
  style,
  variant = 'default',
  radius = Radius.xl,
  padding = 16,
  noPadding = false,
  blur = false,
  blurAmount = 18,
  highlight = true,
}: GlassCardProps) {
  const tone = variantStyles[variant];
  const useNativeBlur = blur && Platform.OS === 'ios';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderRadius: radius,
          padding: noPadding ? 0 : padding,
        },
        Platform.OS === 'android' ? styles.androidFlat : Shadow.sm,
        style,
      ]}>
      {useNativeBlur ? (
        <BlurView
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor={Colors.bg.elevated}
        />
      ) : null}
      {highlight ? <View pointerEvents="none" style={styles.topHighlight} /> : null}
      {variant === 'hero' ? <View pointerEvents="none" style={styles.heroGlow} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  androidFlat: {
    elevation: 0,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: '14%',
    right: '30%',
    height: 1,
    backgroundColor: Colors.glass.highlight,
    opacity: 0.72,
  },
  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -80,
    top: -75,
    backgroundColor: 'rgba(47,128,255,0.13)',
  },
});
