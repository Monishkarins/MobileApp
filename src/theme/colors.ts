/**
 * Karins Fleet premium dark theme.
 *
 * The palette keeps the existing Karins navy/blue/yellow identity while adding
 * semantic surfaces for a restrained glass UI. All business states consume
 * these aliases so warning, critical, success, and informational colours stay
 * consistent across dashboard, reports, and detail screens.
 */
export const Colors = {
  navy: '#001F4E',
  blue: '#0071C5',
  blueBright: '#2F80FF',
  cyan: '#63E6FF',
  yellow: '#FFC107',
  white: '#FFFFFF',

  bg: {
    d0: '#010E1C',
    d1: '#021426',
    d2: '#041C33',
    d3: '#06264A',
    d4: '#08345E',
    elevated: '#082442',
    overlay: 'rgba(1,12,24,0.72)',
  },

  text: {
    primary: '#F8FAFC',
    secondary: '#B7C5D6',
    subtle: '#9FB0C3',
    muted: '#8295AA',
    disabled: '#53677D',
    label: '#C9D5E3',
    inverse: '#071727',
    link: '#61B9FF',
  },

  glass: {
    bg: 'rgba(255,255,255,0.070)',
    bgMedium: 'rgba(255,255,255,0.095)',
    bgStrong: 'rgba(255,255,255,0.120)',
    bgDark: 'rgba(4,24,44,0.82)',
    interactive: 'rgba(0,113,197,0.16)',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(132,208,255,0.22)',
    highlight: 'rgba(255,255,255,0.14)',
  },

  navBg: 'rgba(3,20,38,0.92)',
  navBorder: 'rgba(255,255,255,0.11)',
  divider: 'rgba(255,255,255,0.09)',
  tabActive: '#FFC107',
  tabInactive: '#9FB0C3',

  input: {
    placeholder: '#8295AA',
  },

  success: '#2BD576',
  successLight: '#7CEBAA',
  successBg: 'rgba(43,213,118,0.14)',
  successBorder: 'rgba(43,213,118,0.32)',

  warning: '#FFC857',
  warningLight: '#FFD978',
  warningBg: 'rgba(255,200,87,0.15)',
  warningBorder: 'rgba(255,200,87,0.34)',

  danger: '#FF6B6B',
  dangerLight: '#FF8A8A',
  dangerBg: 'rgba(255,107,107,0.14)',
  dangerBorder: 'rgba(255,107,107,0.32)',

  info: '#42A5FF',
  infoLight: '#78C2FF',
  infoBg: 'rgba(66,165,255,0.15)',
  infoBorder: 'rgba(66,165,255,0.30)',

  amber: '#FFC857',
  amberBg: 'rgba(255,200,87,0.15)',
  amberBorder: 'rgba(255,200,87,0.34)',
} as const;

export type AppColors = typeof Colors;
