/**
 * Shared dashboard typography — one hierarchy for titles, subheads, and body
 * copy so every card reads consistently on the navy glass UI.
 */

import type { TextStyle } from 'react-native';
import { Colors, AppTypography, FontFamily } from '../../theme';

/** Soft white used for subheads and body copy (solid white stays on titles only). */
export const DASHBOARD_LIGHT_WHITE = 'rgba(255,255,255,0.85)';

/**
 * Content sizes only — topics (`dashboardHeader`) and sub-topics
 * (`dashboardSubheading`) stay on the global scale; everything else in cards
 * uses this +1px bump for readability.
 */
export const dashboardContentFont = {
  micro: 11,
  tiny: 12,
  xs: 13,
  sm: 15,
  base: 16,
} as const;

/** Primary card / section title — bold white, shared size across the dashboard. */
export const dashboardHeader: TextStyle = {
  ...AppTypography.cardTitle,
  // Bold so every dashboard card/section heading reads with equal weight.
  fontFamily: FontFamily.bold,
  fontWeight: '800',
  color: Colors.white,
  letterSpacing: 0.4,
};

/** Secondary line under a header — one step smaller, light white vs solid header. */
export const dashboardSubheading: TextStyle = {
  ...AppTypography.labelCaption,
  color: DASHBOARD_LIGHT_WHITE,
};

/** Body / paragraph copy — bumped content size; topics/sub-topics stay unchanged. */
export const dashboardBody: TextStyle = {
  ...AppTypography.bodyText,
  color: DASHBOARD_LIGHT_WHITE,
};
