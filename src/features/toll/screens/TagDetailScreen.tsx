/**
 * Tag detail — mirrors the web Tag Inventory view modal. The list row already
 * carries every field from /tag/tagList, so render the passed record directly.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  LiquidBackground, GlassCard, StatusPill, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { fmtDate } from '../../../utils/format';
import type { MoreStackParamList } from '../../../navigation/types';
import type { TagDetailPayload } from '../types/tagDetail';
import {
  tagStatusDisplay,
  tagStatusVariant,
  tagYearLabel,
} from '../utils/tagStatusUtils';

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable numberOfLines={3}>
        {value?.toString().trim() ? value : '—'}
      </Text>
    </View>
  );
}

export default function TagDetailScreen() {
  const route = useRoute<RouteProp<MoreStackParamList, 'TagDetail'>>();
  const tag: TagDetailPayload | undefined = route.params?.tag;

  if (!tag) {
    return (
      <LiquidBackground>
        <ScreenHeader title="Tag Details" showBack />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Tag details are not available.</Text>
        </View>
      </LiquidBackground>
    );
  }

  return (
    <LiquidBackground>
      <ScreenHeader title="Tag Details" showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard variant="strong" style={styles.headerCard}>
          <Text style={styles.tagId} selectable>{tag.tagBarcode}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {[tag.vrn, tag.customerName].filter(Boolean).join(' · ') || 'Unassigned tag'}
          </Text>
          <View style={styles.pillRow}>
            <StatusPill
              label={tagStatusDisplay(tag.status)}
              variant={tagStatusVariant(tag.status)}
              small
            />
            {tag.tagClass ? (
              <StatusPill label={tag.tagClass} variant="info" small />
            ) : null}
          </View>
        </GlassCard>

        <GlassCard style={styles.section} noPadding>
          <Text style={styles.sectionTitle}>Tag Info</Text>
          <View style={styles.sectionBody}>
            <DetailRow label="Tag ID" value={tag.tagId} />
            <DetailRow label="Barcode" value={tag.tagBarcode} />
            <DetailRow label="Class" value={tag.tagClass} />
            <DetailRow label="Status" value={tagStatusDisplay(tag.status)} />
            <DetailRow label="Year" value={tagYearLabel(tag.allocatedDate)} />
            <DetailRow label="VRN" value={tag.vrn} />
            <DetailRow
              label="Assigned Date"
              value={tag.assignedDate ? fmtDate(tag.assignedDate) : '—'}
            />
            <DetailRow
              label="Allocated Date"
              value={tag.allocatedDate ? fmtDate(tag.allocatedDate) : '—'}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.section} noPadding>
          <Text style={styles.sectionTitle}>Customer Info</Text>
          <View style={styles.sectionBody}>
            <DetailRow label="Customer ID" value={tag.customerId} />
            <DetailRow label="Customer Name" value={tag.customerName} />
          </View>
        </GlassCard>

        <View style={{ height: Spacing[6] }} />
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing[4], paddingBottom: Spacing[6] },
  headerCard: { marginBottom: Spacing[3] },
  tagId: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, fontFamily: 'monospace' },
  subtitle: { fontSize: FontSize.sm, color: Colors.text.subtle, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginTop: Spacing[3] },

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

  errorWrap: { alignItems: 'center', paddingVertical: Spacing[6], paddingHorizontal: Spacing[5] },
  errorText: { color: Colors.text.secondary, fontSize: FontSize.base },
});
