import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {GlassCard} from '../../../components';
import {ChevronRightIcon, WarningIcon} from '../../../components/icons';
import {Colors, FontSize, Radius, Spacing} from '../../../theme';
import {fmtNum} from '../../../utils/format';

interface CriticalActionStripProps {
  count: number;
  onPress?: () => void;
}

export default function CriticalActionStrip({count, onPress}: CriticalActionStripProps) {
  if (count <= 0) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.84 : 1}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${count} compliance actions require attention`}>
      <GlassCard
        variant="danger"
        radius={Radius.xl}
        padding={0}
        highlight={false}
        style={styles.card}>
        <View style={styles.iconWrap}>
          <WarningIcon size={22} color={Colors.dangerLight} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{fmtNum(count)} compliance actions require attention</Text>
          <Text style={styles.subtitle}>Review expiries to prevent penalties and service disruption.</Text>
        </View>
        {onPress ? (
          <View style={styles.action}>
            <Text style={styles.actionText}>View</Text>
            <ChevronRightIcon size={17} color={Colors.dangerLight} />
          </View>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.13)',
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  copy: {flex: 1, minWidth: 0},
  title: {color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '700', lineHeight: 17},
  subtitle: {color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 16, marginTop: 2},
  action: {flexDirection: 'row', alignItems: 'center', gap: 1},
  actionText: {color: Colors.dangerLight, fontSize: FontSize.sm, fontWeight: '700'},
});
