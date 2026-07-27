/**
 * Fleet Health hero card — command-center summary for the active customer.
 * Surfaces health score, open actions, and the review CTA so operators can
 * jump straight into compliance work from the dashboard.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import {GlassCard} from '../../../components';
import {ChevronRightIcon, WarningIcon} from '../../../components/icons';
import {Colors, FontFamily, FontSize, Radius, Spacing} from '../../../theme';
import type {DashboardSummary} from '../../../types/dashboard';
import {fmtNum} from '../../../utils/format';
import type {FleetIntelligence, MetricTone} from '../dashboardMetrics';

interface FleetHealthHeroCardProps {
  summary: DashboardSummary;
  intelligence: FleetIntelligence;
  onReviewActions?: () => void;
}

const RING_RADIUS = 34;
const RING_STROKE = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function toneColor(tone: MetricTone): string {
  switch (tone) {
    case 'success':
      return Colors.success;
    case 'warning':
      return Colors.warning;
    case 'danger':
      return Colors.danger;
    case 'info':
      return Colors.info;
    default:
      return Colors.text.primary;
  }
}

function HealthRing({
  score,
  tone,
  size,
}: {
  score: number;
  tone: MetricTone;
  size: number;
}) {
  const progress = Math.max(0, Math.min(100, score));
  const dash = (progress / 100) * RING_CIRCUMFERENCE;
  const color = toneColor(tone);

  return (
    <View style={[styles.ringWrap, {width: size, height: size}]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeDasharray={`${dash} ${RING_CIRCUMFERENCE - dash}`}
          strokeDashoffset={RING_CIRCUMFERENCE / 4}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text
          style={[styles.score, {color, fontSize: size < 90 ? 28 : 32}]}
          maxFontSizeMultiplier={1.05}>
          {score}
        </Text>
        <Text style={styles.scoreOutOf}>/100</Text>
      </View>
    </View>
  );
}

/** Glowing shield + EKG mark — visual anchor matching the fleet-health mock. */
function FleetShield({size = 56}: {size?: number}) {
  return (
    <View style={[styles.shieldWrap, {width: size, height: size * 1.1}]}>
      <View style={[styles.shieldGlow, {width: size * 0.72, height: size * 0.72}]} />
      <Svg width={size} height={size * 1.1} viewBox="0 0 80 88">
        <Defs>
          <LinearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7EE7FF" stopOpacity="0.45" />
            <Stop offset="45%" stopColor="#2F7BFF" stopOpacity="0.32" />
            <Stop offset="100%" stopColor="#0B1F4A" stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="shieldStroke" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#B7F1FF" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#4B93FF" stopOpacity="0.75" />
          </LinearGradient>
        </Defs>
        <Path
          d="M40 4 L68 16 V40 C68 58 56 72 40 82 C24 72 12 58 12 40 V16 Z"
          fill="url(#shieldFill)"
          stroke="url(#shieldStroke)"
          strokeWidth={2.4}
        />
        <Path
          d="M22 44 H32 L36 34 L42 56 L48 40 L52 44 H58"
          fill="none"
          stroke="#8FF0FF"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function FleetHealthHeroCard({
  summary,
  intelligence,
  onReviewActions,
}: FleetHealthHeroCardProps) {
  const {width} = useWindowDimensions();
  // Shrink gauge/shield on narrow phones so mid-column copy stays fully visible on one line
  const isNarrow = width < 390;
  const ringSize = isNarrow ? 86 : 98;
  const shieldSize = isNarrow ? 42 : 54;
  const activeVehicles = summary.fleet?.active ?? 0;
  const fyLabel = summary.fyYear ? `FY ${summary.fyYear}` : null;
  const warnTone = intelligence.tone === 'warning' || intelligence.tone === 'danger';

  return (
    <GlassCard
      variant="hero"
      blur
      blurAmount={22}
      radius={Radius['2xl']}
      style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Health</Text>
        {fyLabel ? (
          <>
            <Text style={styles.titleSep}>•</Text>
            <Text style={styles.fy}>{fyLabel}</Text>
          </>
        ) : null}
      </View>

      <View style={[styles.heroRow, isNarrow && styles.heroRowNarrow]}>
        <HealthRing score={intelligence.score} tone={intelligence.tone} size={ringSize} />

        <View style={styles.heroMid}>
          <View
            style={[
              styles.attentionPill,
              warnTone ? styles.attentionPillWarn : styles.attentionPillNeutral,
            ]}>
            {warnTone ? <WarningIcon size={11} color={Colors.warning} /> : null}
            <Text
              style={[
                styles.attentionText,
                warnTone ? styles.attentionTextWarn : styles.attentionTextNeutral,
              ]}>
              {intelligence.healthLabel}
            </Text>
          </View>

          {/* Full phrases kept on one line — layout shrinks visuals instead of truncating */}
          <Text style={[styles.statLine, isNarrow && styles.statLineNarrow]}>
            <Text style={styles.statValue}>{fmtNum(activeVehicles)}</Text>
            {' active vehicles'}
          </Text>
          <Text style={[styles.statLine, isNarrow && styles.statLineNarrow]}>
            <Text style={styles.statValueWarn}>{fmtNum(intelligence.openAlerts)}</Text>
            {' actions required'}
          </Text>
        </View>

        <View style={styles.heroRight}>
          <FleetShield size={shieldSize} />
        </View>
      </View>

      {onReviewActions ? (
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={onReviewActions}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Review ${intelligence.openAlerts} fleet actions`}>
          <Text style={styles.reviewButtonText}>Review Actions</Text>
          <ChevronRightIcon size={16} color={Colors.infoLight} />
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing[3],
    padding: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
    gap: 6,
  },
  title: {
    color: Colors.text.primary,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  titleSep: {
    color: Colors.text.muted,
    fontSize: FontSize.sm,
  },
  fy: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  heroRowNarrow: {
    gap: Spacing[2],
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Score digits stay regular; bold weight is reserved for the hero title.
  score: {
    fontFamily: FontFamily.displayRegular,
    fontWeight: '400',
    lineHeight: 34,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  scoreOutOf: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
    marginTop: -1,
  },
  heroMid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  attentionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  attentionPillWarn: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  attentionPillNeutral: {
    backgroundColor: Colors.glass.bg,
    borderColor: Colors.glass.border,
  },
  attentionText: {
    fontSize: 11,
    fontWeight: '400',
  },
  attentionTextWarn: {
    color: Colors.warningLight,
  },
  attentionTextNeutral: {
    color: Colors.text.secondary,
  },
  statLine: {
    color: Colors.text.secondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
    flexShrink: 0,
  },
  statLineNarrow: {
    fontSize: 12,
    lineHeight: 16,
  },
  statValue: {
    color: Colors.text.primary,
    fontWeight: '400',
  },
  statValueWarn: {
    color: Colors.warning,
    fontWeight: '400',
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shieldWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldGlow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(70, 170, 255, 0.28)',
  },
  reviewButton: {
    minHeight: 40,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.infoBg,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  reviewButtonText: {
    color: Colors.infoLight,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
