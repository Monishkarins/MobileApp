/**
 * Shared label/value rows for vehicle detail tabs (FASTag + VAHAN).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';

export function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable numberOfLines={4}>
        {value?.toString().trim() ? value : '—'}
      </Text>
    </View>
  );
}

export function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | undefined | null][];
}) {
  return (
    <GlassCard style={styles.section} noPadding>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        {rows.map(([label, value], index) => (
          <DetailRow key={`${label}-${index}`} label={label} value={value} />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing[3], overflow: 'hidden' },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing[3],
    paddingVertical: 8,
  },
  sectionBody: { paddingHorizontal: Spacing[3], paddingVertical: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing[3],
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.text.label, flex: 1 },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontWeight: '600',
    flex: 1.3,
    textAlign: 'right',
  },
});
