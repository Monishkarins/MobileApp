/**
 * Shared export menu for report screens — Excel/PDF download parity with web.
 * Download control uses the same Lucide-style tray+arrow icon as the web portal
 * (VehicleTransactionReportContainer Download from lucide-react).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';

interface ReportExportMenuProps {
  showMenu: boolean;
  exporting: 'excel' | 'pdf' | null;
  onToggleMenu: () => void;
  onExportExcel: () => void;
  onExportPdf?: () => void;
  /** Incentive report is Excel-only on web. */
  excelOnly?: boolean;
}

/** Lucide `Download` paths — arrow into tray, same mark used on web reports. */
export function WebDownloadIcon({
  color = Colors.blue,
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="7 10 12 15 17 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={15}
        x2={12}
        y2={3}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReportHeaderActions({
  showMenu,
  exporting,
  onToggleMenu,
  filterButton,
}: ReportExportMenuProps & { filterButton: React.ReactNode }) {
  const iconColor = showMenu ? Colors.infoLight : Colors.blue;

  return (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={[styles.iconBtn, showMenu && styles.iconBtnActive]}
        onPress={onToggleMenu}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Download report"
      >
        {exporting ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <WebDownloadIcon color={iconColor} size={18} />
        )}
      </TouchableOpacity>
      {filterButton}
    </View>
  );
}

export function ReportExportDropdown({
  showMenu,
  onExportExcel,
  onExportPdf,
  excelOnly = false,
}: Pick<ReportExportMenuProps, 'showMenu' | 'onExportExcel' | 'onExportPdf' | 'excelOnly'>) {
  if (!showMenu) return null;

  return (
    <View style={styles.exportMenu}>
      <TouchableOpacity style={styles.exportOption} onPress={onExportExcel}>
        <Text style={styles.exportOptionText}>Export Excel</Text>
      </TouchableOpacity>
      {!excelOnly && onExportPdf ? (
        <TouchableOpacity style={styles.exportOption} onPress={onExportPdf}>
          <Text style={styles.exportOptionText}>Export PDF</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ReportFilterButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>Filters</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  // Compact hit target; icon itself matches web (#0474CF Lucide Download).
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnActive: { backgroundColor: Colors.infoBg, borderColor: Colors.infoBorder },
  filterBtn: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  filterBtnActive: { backgroundColor: Colors.infoBg, borderColor: Colors.infoBorder },
  filterBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary },
  filterBtnTextActive: { color: Colors.infoLight },
  exportMenu: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    backgroundColor: Colors.bg.d2,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  exportOption: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  exportOptionText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.infoLight },
});
