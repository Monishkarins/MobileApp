/**
 * FASTag tab — tag, customer and history from the fleet vehicle list row.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { fmtDateTime } from '../../../utils/format';
import { resolveVehicleStatusDisplay } from '../utils/vehicleStatusUtils';
import type { VehicleDetailPayload, VehicleHistoryRow } from '../types/vehicleDetail';
import { DetailRow, DetailSection } from './vehicleDetailUi';

function HistoryCard({ row }: { row: VehicleHistoryRow }) {
  return (
    <GlassCard style={styles.historyCard}>
      <DetailRow label="Tag ID" value={row.yapKitNumber} />
      <DetailRow label="Status" value={row.yapStatus} />
      <DetailRow
        label="Registered Date"
        value={row.yapRegisteredDate ? fmtDateTime(row.yapRegisteredDate) : '—'}
      />
      <DetailRow
        label="Created Date"
        value={row.createdAt ? fmtDateTime(row.createdAt) : '—'}
      />
    </GlassCard>
  );
}

export function VehicleFastagTab({ vehicle }: { vehicle: VehicleDetailPayload }) {
  const statusDisplay = resolveVehicleStatusDisplay(vehicle.yapStatus);
  const history = vehicle.history ?? [];
  const activeLabel = (vehicle.statusOnOff === 'ON' || statusDisplay.isActive)
    ? 'Active'
    : 'Inactive';

  return (
    <View>
      <DetailSection
        title="Vehicle Info"
        rows={[
          ['Vehicle No', vehicle.vehicleNo],
          ['Class', vehicle.profileId],
          ['Tag ID', vehicle.yapKitNumber],
          ['Group', vehicle.vehicleGroupName],
          ['Status', activeLabel],
          ['Vehicle Status', vehicle.yapStatus],
          ['Registered Date', vehicle.yapRegisteredDate ? fmtDateTime(vehicle.yapRegisteredDate) : '—'],
          ['Created Date', vehicle.createdAt ? fmtDateTime(vehicle.createdAt) : '—'],
        ]}
      />

      <DetailSection
        title="Customer Info"
        rows={[
          ['Customer Name', vehicle.customerName],
          ['Customer ID', vehicle.customerId],
        ]}
      />

      {history.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>TAG HISTORY</Text>
          {history.map((row, index) => (
            <HistoryCard key={`${row.yapKitNumber ?? 'tag'}-${index}`} row={row} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.text.label,
    marginBottom: Spacing[2],
  },
  historyCard: { marginBottom: Spacing[2], padding: Spacing[3] },
});
