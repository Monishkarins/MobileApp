import {Platform} from 'react-native';

/**
 * Typography tokens.
 *
 * Audiowide is the Karins wordmark/logo face. Inter and Manrope are the UI
 * families. System aliases keep the app readable when native font assets are absent.
 */
const systemRegular = Platform.select({ios: 'System', android: 'sans-serif'}) ?? 'System';
const systemMedium = Platform.select({ios: 'System', android: 'sans-serif-medium'}) ?? 'System';

export const FontFamily = {
  logo: 'Audiowide-Regular',
  displayRegular: 'Manrope-Regular',
  displaySemibold: 'Manrope-SemiBold',
  displayBold: 'Manrope-Bold',
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
  system: systemRegular,
  systemMedium,
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 42,
  hero: 52,
} as const;

export const LineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  loose: 1.7,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.4,
  wider: 1.2,
  widest: 2,
} as const;

export const AppTypography = {
  mainPageTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 28,
  },
  sectionHeading: {
    fontFamily: FontFamily.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
  },
  cardTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  bodyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonText: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  labelCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  financialAmount: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    fontVariant: ['tabular-nums'] as const,
  },
  largeKpiValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'] as const,
  },
} as const;
