import React from 'react';
import Svg, { Text as SvgText, Rect, Path, G } from 'react-native-svg';
import { Colors, FontFamily } from '../../theme';

/**
 * Karins wordmark as a vector asset (not plain RN <Text>) so it scales crisply
 * and carries the "fleet pulling toward the future" route + truck motif.
 * Swap in the official brand SVG/PNG here when supplied — keep the same props.
 */
export interface KarinsLogoProps {
  width?: number;
  /** wordmark colour */
  color?: string;
  /** accent (route + truck) colour */
  accent?: string;
  showTagline?: boolean;
}

export function KarinsLogo({
  width = 220,
  color = Colors.white,
  accent = Colors.yellow,
  showTagline = false,
}: KarinsLogoProps) {
  const viewBoxWidth = showTagline ? 300 : 220;
  const viewBoxHeight = showTagline ? 96 : 78;
  const height = width * (viewBoxHeight / viewBoxWidth);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
      {/* route line sweeping forward */}
      <Path
        d="M6 70 H150 q14 0 18 -14"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        strokeDasharray="2 7"
      />
      {/* truck moving along the route */}
      <G>
        <Rect x="150" y="50" width="24" height="14" rx="2" fill={accent} />
        <Rect x="174" y="55" width="10" height="9" rx="1.5" fill={accent} />
        <Path d="M153 64 a3 3 0 1 0 0.01 0z M178 64 a3 3 0 1 0 0.01 0z" fill={color} />
      </G>
      {/* wordmark */}
      <SvgText
        x="4"
        y="40"
        fill={color}
        fontSize="40"
        fontFamily={FontFamily.logo}
        letterSpacing="1"
      >
        Karins
      </SvgText>
      {showTagline && (
        <SvgText
          x={viewBoxWidth / 2}
          y="88"
          textAnchor="middle"
          fill={Colors.text.subtle}
          fontSize="10"
          fontWeight="600"
          letterSpacing="1.6"
          fontFamily="System"
        >
          FLEET INTELLIGENCE PLATFORM
        </SvgText>
      )}
    </Svg>
  );
}
