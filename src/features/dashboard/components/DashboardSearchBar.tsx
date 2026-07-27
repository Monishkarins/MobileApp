/**
 * Fleet dashboard command search — web GlobalCommandSearch parity.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../../../theme';
import {ChevronRightIcon, SearchIcon, TruckIcon} from '../../../components/icons';
import { DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';
import { useVehicle360Search } from '../hooks/useVehicle360Search';
import { riskOf } from '../utils/vehicleSearchUtils';
import type { VehicleSearchRecord } from '../../../types/vehicleSearch';

interface DashboardSearchBarProps {
  onOpenVehicle: (record: VehicleSearchRecord) => void;
}

// The shared riskOf() palette is tuned for the light Vehicle 360 modal, so on the
// dark dropdown we remap by label to the app's dark-theme status tokens for contrast.
const RISK_PILL_THEME: Record<string, { bg: string; border: string; fg: string }> = {
  'At Risk': { bg: Colors.dangerBg, border: Colors.dangerBorder, fg: Colors.dangerLight },
  Watch: { bg: Colors.warningBg, border: Colors.warningBorder, fg: Colors.warningLight },
  Healthy: { bg: Colors.successBg, border: Colors.successBorder, fg: Colors.successLight },
};

export default function DashboardSearchBar({ onOpenVehicle }: DashboardSearchBarProps) {
  const { query, setQuery, results, isSearching } = useVehicle360Search();
  const [isFocused, setIsFocused] = useState(false);

  const showDropdown = isFocused && query.trim().length > 0;
  const matchLabel = isSearching
    ? 'Searching…'
    : results.length
      ? `${results.length} vehicle${results.length > 1 ? 's' : ''} found`
      : 'Vehicle 360 search';

  const handleSelect = (record: VehicleSearchRecord) => {
    onOpenVehicle(record);
    setQuery('');
    setIsFocused(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <SearchIcon size={20} color={Colors.text.muted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          placeholder="Search vehicle, challan, driver / txn"
          placeholderTextColor={Colors.input.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHead}>
            <Text style={styles.dropdownHeadLabel}>{matchLabel}</Text>
            <Text style={styles.dropdownHeadMeta}>Karins Search API</Text>
          </View>

          <ScrollView
            style={styles.resultsScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {results.map((record) => {
              const risk = riskOf(record);
              const pill = RISK_PILL_THEME[risk.label] ?? RISK_PILL_THEME.Healthy;
              const summary = `${record.tolls.length} tolls · ${record.challans.length} challans · ${record.claims.length} claims`;
              return (
                <TouchableOpacity
                  key={record.reg}
                  style={styles.resultRow}
                  activeOpacity={0.85}
                  onPress={() => handleSelect(record)}
                >
                  <View style={styles.resultIcon}><TruckIcon size={18} color={Colors.infoLight} /></View>
                  <View style={styles.resultBody}>
                    <View style={styles.resultTop}>
                      <Text style={styles.resultReg}>{record.reg}</Text>
                      <View style={[styles.riskPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
                        <Text style={[styles.riskPillText, { color: pill.fg }]}>{risk.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.resultSub} numberOfLines={1}>
                      {record.driver} · {summary}
                    </Text>
                  </View>
                  <ChevronRightIcon size={18} color={Colors.infoLight} />
                </TouchableOpacity>
              );
            })}

            {!isSearching && results.length === 0 ? (
              <Text style={styles.emptyText}>
                No matches. Try a vehicle number, challan no, or plaza name.
              </Text>
            ) : null}

            {isSearching ? (
              <Text style={styles.emptyText}>Searching across fleet…</Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {showDropdown ? (
        <Pressable style={styles.backdrop} onPress={() => setIsFocused(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: Spacing[3],
    zIndex: 20,
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.bgMedium,
    borderWidth: 1,
    borderColor: Colors.glass.borderStrong,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    minHeight: 48,
    gap: 10,
  },
  // Take every remaining pixel of the search bar after the icon.
  input: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    fontSize: FontSize.base,
    color: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 0,
    margin: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    top: 56,
    zIndex: -1,
  },
  dropdown: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    // Solid dark navy (not translucent glass) so list rows stay legible over
    // whatever dashboard card scrolls behind the floating dropdown.
    backgroundColor: Colors.bg.d2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glass.borderStrong,
    overflow: 'hidden',
    maxHeight: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  dropdownHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  dropdownHeadLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: DASHBOARD_LIGHT_WHITE,
  },
  dropdownHeadMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: DASHBOARD_LIGHT_WHITE,
  },
  resultsScroll: { maxHeight: 260 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 10,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.infoBg,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  resultBody: { flex: 1, minWidth: 0 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultReg: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  riskPillText: { fontSize: 9, fontWeight: '800' },
  resultSub: { fontSize: FontSize.sm, color: DASHBOARD_LIGHT_WHITE, marginTop: 2 },
  emptyText: {
    padding: Spacing[4],
    fontSize: FontSize.sm,
    color: DASHBOARD_LIGHT_WHITE,
    textAlign: 'center',
  },
});
