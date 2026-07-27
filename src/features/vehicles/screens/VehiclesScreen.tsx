/**
 * Fleet Vehicles list — status cards + filter panel scoped to the active customer.
 * Text filters (Vehicle No / Class / Tag ID) debounce and partial-match on the
 * loaded rows; dropdown filters (customer, group, status, agent) hit the API on Search.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vehicleApi } from '../../../services/api/vehicleApi';
import { apiClient, getApiErrorMessage } from '../../../services/api/client';
import { useAppSelector, selectAuthState } from '../../../store';
import { LiquidBackground, GlassCard, SkeletonCard, EmptyState, ScreenHeader } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { downloadBinaryFile } from '../../../utils/fileExport';
import {
  ReportExportDropdown,
  WebDownloadIcon,
} from '../../reports/components/ReportExportMenu';
import { requiresAdminContextPicker } from '../../../types/auth';
import {
  VEHICLE_CARD_ACCENT,
  VEHICLE_STATUS_CARDS,
  type VehicleStatusCard,
} from '../constants/vehicleStatusCards';
import { isVehicleStatusOn, normalizeYapStatus, resolveVehicleStatusDisplay } from '../utils/vehicleStatusUtils';
import { mapVehicleListRow, type VehicleListItem } from '../mapVehicleListRow';
import VehicleFilterPanel from '../components/VehicleFilterPanel';
import { canShowAgentFilter } from '../../toll/components/TagInventoryFilterPanel';
import {
  EMPTY_VEHICLE_FILTERS,
  type VehicleFilters,
  type CustomerFilterOption,
  type AgentFilterOption,
  type VehicleFilterMetaRow,
  type VehicleGroupOption,
} from '../constants/vehicleFilters';

const TEXT_FILTER_DEBOUNCE_MS = 350;

function buildVehicleQueryParams(
  activeCardConfig: VehicleStatusCard,
  filters: VehicleFilters,
  agentId: string,
  dashboardCustomerId: number | undefined,
  canScopeByCustomerId: boolean,
  groupOptions: VehicleGroupOption[] = [],
) {
  // When a single YAP status is picked, it replaces the card CSV so the two
  // filters do not AND-conflict and return an empty list.
  const vehicleStatuses = filters.vehicleStatus.trim()
    ? filters.vehicleStatus.trim()
    : activeCardConfig.filter.join(',');

  // Dropdown filters may be ignored by the API — pull a wider page so client
  // matching still has enough rows to narrow (without the old 500 that timed out).
  const hasDropdownFilters = Boolean(
    filters.group || filters.status || filters.vehicleStatus,
  );

  const params: Record<string, string | number> = {
    pageNo: '1',
    pageSize: hasDropdownFilters ? '250' : '100',
    vehicleStatuses,
  };

  // Filter-form customer uses yapEntityId; otherwise honour dashboard customer scope.
  if (filters.customerId.trim()) {
    params.customerId = filters.customerId.trim();
  } else if (canScopeByCustomerId && dashboardCustomerId) {
    params.customerId = dashboardCustomerId;
  }

  if (agentId) params.agentId = agentId;
  // Short prefixes (e.g. "TN") are exact-match on many backends and return empty —
  // keep those for client-side includes(); send fuller values to the API.
  const vehicleNo = filters.vehicleNo.trim().toUpperCase();
  const vehicleClass = filters.vehicleClass.trim();
  const tagId = filters.tagId.trim();
  if (vehicleNo.length >= 4) params.vehicleNo = vehicleNo;
  if (vehicleClass.length >= 2) params.vehicleClass = vehicleClass;
  if (tagId.length >= 4) params.tagId = tagId;

  // Prefer numeric group id (web/RC parity); also send title for backends that key on name.
  if (filters.group) {
    const match = groupOptions.find((g) => g.title === filters.group || g.id === filters.group);
    if (match?.id) params.vehicleGroupId = match.id;
    const groupTitle = match?.title ?? filters.group;
    params.group = groupTitle;
    // RC list uses groupName — some vehicle-list builds accept the same key.
    params.groupName = groupTitle;
  }

  if (filters.status) params.status = filters.status;
  if (filters.vehicleStatus) params.vehicleStatus = filters.vehicleStatus;

  return params;
}

function hasActiveVehicleFilters(filters: VehicleFilters, agentId: string): boolean {
  return Boolean(
    filters.customerId.trim()
    || filters.vehicleNo.trim()
    || filters.vehicleClass.trim()
    || filters.tagId.trim()
    || filters.group
    || filters.status
    || filters.vehicleStatus
    || agentId,
  );
}

/**
 * Soft partial match on loaded rows so prefixes like "TN" still narrow the list
 * when the API only returns exact vehicle-number matches (or ignores short terms).
 */
function matchesVehicleTextFilters(item: VehicleListItem, filters: VehicleFilters): boolean {
  const vehicleNo = filters.vehicleNo.trim().toUpperCase();
  const vehicleClass = filters.vehicleClass.trim().toUpperCase();
  const tagId = filters.tagId.trim().toUpperCase();

  if (vehicleNo && !(item.vehicleNo ?? '').toUpperCase().includes(vehicleNo)) {
    return false;
  }
  // profileId is the class code shown on the FASTag tab (web parity).
  if (vehicleClass && !(item.detail.profileId ?? '').toUpperCase().includes(vehicleClass)) {
    return false;
  }
  if (tagId && !(item.detail.yapKitNumber ?? '').toUpperCase().includes(tagId)) {
    return false;
  }
  return true;
}

/** Group / ON-OFF / YAP status — applied client-side so dropdown Search always narrows the list. */
function matchesVehicleDropdownFilters(item: VehicleListItem, filters: VehicleFilters): boolean {
  if (filters.group) {
    const groupName = (item.vehicleGroupName ?? item.detail.vehicleGroupName ?? '').trim();
    if (groupName.toLowerCase() !== filters.group.trim().toLowerCase()) {
      return false;
    }
  }

  // Prefer raw yapStatus — tagStatus can fall back to a display label and break matching.
  const yapStatus = item.detail.yapStatus ?? item.tagStatus;

  // Status dropdown: ACTIVE = switch ON, INACTIVE = switch OFF (derived from yapStatus).
  if (filters.status === 'ACTIVE' && !isVehicleStatusOn(yapStatus)) {
    return false;
  }
  if (filters.status === 'INACTIVE' && isVehicleStatusOn(yapStatus)) {
    return false;
  }

  if (filters.vehicleStatus) {
    if (normalizeYapStatus(yapStatus) !== normalizeYapStatus(filters.vehicleStatus)) {
      return false;
    }
  }

  return true;
}

function matchesVehicleFilters(item: VehicleListItem, filters: VehicleFilters): boolean {
  return matchesVehicleTextFilters(item, filters) && matchesVehicleDropdownFilters(item, filters);
}

function uniqueCustomers(rows: CustomerFilterOption[]): CustomerFilterOption[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.yapEntityId || seen.has(row.yapEntityId)) return false;
    seen.add(row.yapEntityId);
    return true;
  });
}

function normalizeTextFilters(filters: VehicleFilters): Pick<VehicleFilters, 'vehicleNo' | 'vehicleClass' | 'tagId'> {
  return {
    vehicleNo: filters.vehicleNo.trim().toUpperCase(),
    vehicleClass: filters.vehicleClass.trim().toUpperCase(),
    tagId: filters.tagId.trim().toUpperCase(),
  };
}

export default function VehiclesScreen() {
  const nav = useNavigation<any>();
  const { user, dashboardContext } = useAppSelector(selectAuthState);
  const customerId = dashboardContext?.customerId ?? user?.defaultCustomerId;
  const canScopeByCustomerId = requiresAdminContextPicker(user?.roleKey);

  const [activeCard, setActiveCard] = useState<string>('total');
  const [draftFilters, setDraftFilters] = useState<VehicleFilters>(EMPTY_VEHICLE_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<VehicleFilters>(EMPTY_VEHICLE_FILTERS);
  const [agentId, setAgentId] = useState('');
  const [appliedAgentId, setAppliedAgentId] = useState('');
  const [customers, setCustomers] = useState<CustomerFilterOption[]>([]);
  const [agents, setAgents] = useState<AgentFilterOption[]>([]);
  const [groupOptions, setGroupOptions] = useState<VehicleGroupOption[]>([]);
  const [vehicleStatusOptions, setVehicleStatusOptions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [summaryMap, setSummaryMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [togglingVehicleNo, setTogglingVehicleNo] = useState<string | null>(null);
  const textDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtersActive = useMemo(
    () => hasActiveVehicleFilters(appliedFilters, appliedAgentId),
    [appliedFilters, appliedAgentId],
  );

  const activeCardConfig = useMemo(
    () => VEHICLE_STATUS_CARDS.find((c) => c.key === activeCard) ?? VEHICLE_STATUS_CARDS[0],
    [activeCard],
  );

  // Soft client narrowing for text + Group / Status / Vehicle Status on top of API results.
  const visibleVehicles = useMemo(
    () => vehicles.filter((item) => matchesVehicleFilters(item, appliedFilters)),
    [vehicles, appliedFilters],
  );

  useEffect(() => {
    if (!requiresAdminContextPicker(user?.roleKey)) return;
    (async () => {
      try {
        const { data } = await vehicleApi.getCustomerVehicleGroups();
        const mapped: CustomerFilterOption[] = (data ?? []).map((row: any) => ({
          yapEntityId: String(row.yapEntityId ?? ''),
          firstName: row.firstName ?? '',
        }));
        setCustomers(uniqueCustomers(mapped));
      } catch { /* optional filter source */ }
    })();
  }, [user?.roleKey]);

  useEffect(() => {
    if (!canShowAgentFilter(user?.roleKey)) return;
    (async () => {
      try {
        const { data } = await apiClient.get<any>('/agent/');
        const rows = data?.data?.rows ?? [];
        setAgents(rows.map((item: any) => ({
          id: item.id,
          agentName: item.agentName,
        })));
      } catch { /* optional filter source */ }
    })();
  }, [user?.roleKey]);

  useEffect(() => {
    (async () => {
      try {
        // Prefer id+title from group-names (same source RC filters use) so we can
        // send vehicleGroupId; fall back to titles from /vehicle/filters.
        const [metaRes, groupRes] = await Promise.all([
          vehicleApi.getFilterMeta(),
          vehicleApi.getGroupNames().catch(() => ({ data: null })),
        ]);

        const metaRows: VehicleFilterMetaRow[] = Array.isArray(metaRes.data)
          ? metaRes.data
          : Array.isArray((metaRes.data as any)?.data)
            ? (metaRes.data as any).data
            : [];
        const statuses = [...new Set(metaRows.map((row) => row.yapStatus).filter(Boolean))];
        setVehicleStatusOptions(statuses);

        // Axios body may be `{ data: [...] }` or a bare array depending on gateway wrap.
        const groupBody = (groupRes as any)?.data;
        const namedGroups = Array.isArray(groupBody?.data)
          ? groupBody.data
          : Array.isArray(groupBody)
            ? groupBody
            : [];
        if (namedGroups.length > 0 && namedGroups[0]?.title) {
          const mapped: VehicleGroupOption[] = namedGroups
            .map((g: any) => ({
              id: String(g.id ?? ''),
              title: String(g.title ?? '').trim(),
            }))
            .filter((g: VehicleGroupOption) => g.title);
          setGroupOptions(mapped);
        } else {
          const titles = [
            ...new Set(
              metaRows.flatMap((row) =>
                row.customer?.vehicleGroups?.map((g) => g.title) ?? [],
              ),
            ),
          ].filter(Boolean) as string[];
          setGroupOptions(titles.map((title) => ({ id: '', title })));
        }
      } catch { /* optional filter source */ }
    })();
  }, []);

  const fetchData = useCallback(async (
    filters: VehicleFilters,
    activeAgentId: string,
    cardConfig: VehicleStatusCard,
    isRefresh = false,
  ) => {
    isRefresh ? setRefresh(true) : setLoading(true);

    try {
      const { data } = await vehicleApi.getList(
        buildVehicleQueryParams(
          cardConfig,
          filters,
          activeAgentId,
          customerId ?? undefined,
          canScopeByCustomerId,
          groupOptions,
        ) as any,
      );

      const mapped = (data.result?.rows ?? []).map(mapVehicleListRow);
      setVehicles(mapped);

      const nextSummary: Record<string, number> = {};
      (data.statusSummary ?? []).forEach((item) => {
        nextSummary[item.status] = item.count;
      });
      setSummaryMap(nextSummary);
    } catch {
      /* empty state */
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [customerId, canScopeByCustomerId, groupOptions]);

  useEffect(() => {
    fetchData(appliedFilters, appliedAgentId, activeCardConfig);
  }, [fetchData, appliedFilters, appliedAgentId, activeCardConfig]);

  // Live debounce for text fields — updates applied filters so list refreshes while typing.
  useEffect(() => {
    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current);
      textDebounceRef.current = null;
    }

    const nextText = normalizeTextFilters(draftFilters);
    const appliedText = normalizeTextFilters(appliedFilters);
    const textUnchanged =
      nextText.vehicleNo === appliedText.vehicleNo
      && nextText.vehicleClass === appliedText.vehicleClass
      && nextText.tagId === appliedText.tagId;

    if (textUnchanged) return;

    const applyText = () => {
      setAppliedFilters((prev) => ({
        ...prev,
        vehicleNo: nextText.vehicleNo,
        vehicleClass: nextText.vehicleClass,
        tagId: nextText.tagId,
      }));
    };

    // Clear applies immediately; typed terms wait so we don't spam the API per key.
    if (!nextText.vehicleNo && !nextText.vehicleClass && !nextText.tagId) {
      applyText();
      return;
    }

    textDebounceRef.current = setTimeout(applyText, TEXT_FILTER_DEBOUNCE_MS);
    return () => {
      if (textDebounceRef.current) {
        clearTimeout(textDebounceRef.current);
        textDebounceRef.current = null;
      }
    };
  }, [
    draftFilters.vehicleNo,
    draftFilters.vehicleClass,
    draftFilters.tagId,
    appliedFilters.vehicleNo,
    appliedFilters.vehicleClass,
    appliedFilters.tagId,
  ]);

  const handleCardPress = (card: VehicleStatusCard) => {
    setActiveCard((prev) => (prev === card.key ? 'total' : card.key));
  };

  const handleDraftChange = (next: VehicleFilters) => {
    setDraftFilters({
      ...next,
      vehicleNo: next.vehicleNo.toUpperCase(),
    });
  };

  /** Search applies every draft field (dropdowns + text) and closes the panel. */
  const handleSearch = () => {
    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current);
      textDebounceRef.current = null;
    }
    const nextFilters: VehicleFilters = {
      ...draftFilters,
      ...normalizeTextFilters(draftFilters),
    };
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setAppliedAgentId(agentId);
    setShowFilters(false);
  };

  const handleReset = () => {
    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current);
      textDebounceRef.current = null;
    }
    setDraftFilters(EMPTY_VEHICLE_FILTERS);
    setAgentId('');
    setAppliedFilters(EMPTY_VEHICLE_FILTERS);
    setAppliedAgentId('');
  };

  // Export uses the same filter scope as the list — Excel and PDF for any filters.
  const handleExport = async (format: 'excel' | 'pdf') => {
    if (exporting) return;

    const listParams = buildVehicleQueryParams(
      activeCardConfig,
      appliedFilters,
      appliedAgentId,
      customerId ?? undefined,
      canScopeByCustomerId,
      groupOptions,
    );
    const exportParams = {...listParams};
    delete exportParams.pageNo;
    delete exportParams.pageSize;

    setShowExportMenu(false);
    setExporting(format);
    try {
      const response = format === 'excel'
        ? await vehicleApi.exportVehiclesExcel(exportParams)
        : await vehicleApi.exportVehiclesPdf(exportParams);
      const filename = format === 'excel' ? 'Vehicles.xlsx' : 'Vehicles.pdf';
      const mimeType = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const location = await downloadBinaryFile(response.data, filename, mimeType);
      Alert.alert('Download complete', `${filename} saved to ${location}.`);
    } catch (err: unknown) {
      Alert.alert(
        'Export failed',
        getApiErrorMessage(err, `Could not export ${format.toUpperCase()} file. Please try again.`),
      );
    } finally {
      setExporting(null);
    }
  };

  const confirmVehicleToggle = useCallback((item: VehicleListItem, checked: boolean) => {
    const yapKitNo = item.detail.yapKitNumber?.trim();
    if (!yapKitNo) {
      Alert.alert('Unavailable', 'Tag ID is missing for this vehicle.');
      return;
    }

    Alert.alert(
      checked ? 'Activate Vehicle Status' : 'Deactivate Vehicle Status',
      `Are you sure you want to ${checked ? 'activate' : 'deactivate'} vehicle ${item.vehicleNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: checked ? 'Activate' : 'Deactivate',
          style: checked ? 'default' : 'destructive',
          onPress: async () => {
            setTogglingVehicleNo(item.vehicleNo);
            try {
              await vehicleApi.updateTagStatus(yapKitNo, checked);
              await fetchData(appliedFilters, appliedAgentId, activeCardConfig, true);
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message ?? 'Failed to update vehicle tag status.',
              );
            } finally {
              setTogglingVehicleNo(null);
            }
          },
        },
      ],
    );
  }, [activeCardConfig, appliedAgentId, appliedFilters, fetchData]);

  const renderItem = ({ item }: { item: VehicleListItem }) => {
    const statusDisplay = resolveVehicleStatusDisplay(item.tagStatus);
    const isStatusOn = isVehicleStatusOn(item.tagStatus);
    const isToggling = togglingVehicleNo === item.vehicleNo;

    return (
      <GlassCard
        variant={statusDisplay.tone === 'danger' ? 'danger' : statusDisplay.tone === 'warning' ? 'warning' : 'default'}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <TouchableOpacity
            style={styles.left}
            activeOpacity={0.8}
            onPress={() => nav.navigate('VehicleDetail', {
              vehicleNo: item.vehicleNo,
              vehicle: item.detail,
            })}
          >
            <Text style={styles.vehicleNo}>{item.vehicleNo}</Text>
            <Text style={styles.customer} numberOfLines={1}>{item.customerName}</Text>
            {item.vehicleGroupName ? (
              <Text style={styles.group}>{item.vehicleGroupName ? `Group: ${item.vehicleGroupName}` : ''}</Text>
            ) : null}
          </TouchableOpacity>
          <View style={styles.right}>
            <Switch
              value={isStatusOn}
              onValueChange={(checked) => confirmVehicleToggle(item, checked)}
              disabled={isToggling}
              trackColor={{
                false: Colors.dangerLight,
                true: Colors.success,
              }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.dangerLight}
            />
            <Text style={styles.yapStatus} numberOfLines={1}>{item.tagStatus}</Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  const listHeader = (
    <View style={styles.header}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        {VEHICLE_STATUS_CARDS.map((card) => {
          const isActive = activeCard === card.key;
          const count = summaryMap[card.summaryKey] ?? 0;

          return (
            <TouchableOpacity
              key={card.key}
              style={styles.statTile}
              activeOpacity={0.85}
              onPress={() => handleCardPress(card)}
            >
              <GlassCard
                style={[styles.statChip, isActive && styles.statChipActive]}
              >
                <View style={styles.statChipHead}>
                  <Text style={styles.statChipIcon}>{card.icon}</Text>
                  <Text style={styles.statChipTitle} numberOfLines={1}>{card.title}</Text>
                </View>
                <Text style={styles.statChipValue}>{count}</Text>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Fleet Vehicles"
        rightElement={(
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.downloadBtn, showExportMenu && styles.downloadBtnActive]}
              onPress={() => setShowExportMenu((open) => !open)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Download vehicles"
              disabled={!!exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={showExportMenu ? Colors.infoLight : Colors.blue} />
              ) : (
                <WebDownloadIcon
                  color={showExportMenu ? Colors.infoLight : Colors.blue}
                  size={18}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, (showFilters || filtersActive) && styles.filterBtnActive]}
              onPress={() => setShowFilters((open) => !open)}
              activeOpacity={0.85}
              accessibilityLabel="Toggle filters"
            >
              <Text style={[styles.filterBtnText, (showFilters || filtersActive) && styles.filterBtnTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <ReportExportDropdown
        showMenu={showExportMenu}
        onExportExcel={() => handleExport('excel')}
        onExportPdf={() => handleExport('pdf')}
      />

      {showFilters ? (
        <VehicleFilterPanel
          roleKey={user?.roleKey}
          draft={draftFilters}
          agentId={agentId}
          customers={customers}
          agents={agents}
          groupOptions={groupOptions}
          vehicleStatusOptions={vehicleStatusOptions}
          onChange={handleDraftChange}
          onAgentChange={setAgentId}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      ) : null}

      {loading && vehicles.length === 0 ? (
        <View style={{ padding: Spacing[4], gap: 8 }}>
          {listHeader}
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visibleVehicles}
          keyExtractor={(v) => `${v.vehicleNo}-${v.id}`}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(appliedFilters, appliedAgentId, activeCardConfig, true)}
              tintColor={Colors.blue}
            />
          }
          ListEmptyComponent={<EmptyState title="No vehicles found" icon="🚛" />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
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
  downloadBtn: {
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
  downloadBtnActive: { backgroundColor: Colors.infoBg, borderColor: Colors.infoBorder },
  filterBtn: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  filterBtnActive: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
  },
  filterBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  filterBtnTextActive: {
    color: Colors.infoLight,
  },
  header: { marginBottom: Spacing[2] },
  statsRow: {
    gap: 8,
    paddingRight: Spacing[4],
    marginBottom: 10,
  },
  statTile: { width: 130 },
  statChip: {
    minHeight: 78,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  statChipActive: {
    borderColor: VEHICLE_CARD_ACCENT,
    backgroundColor: Colors.infoBg,
  },
  statChipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statChipIcon: { fontSize: 14 },
  statChipTitle: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  statChipValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: VEHICLE_CARD_ACCENT,
    marginTop: 6,
  },
  list: { paddingHorizontal: Spacing[4], gap: 8, paddingBottom: 32 },
  card: { padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flex: 1, gap: 2, paddingRight: 8 },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 4, maxWidth: '42%' },
  vehicleNo: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'monospace',
  },
  customer: { fontSize: FontSize.sm, color: Colors.text.secondary },
  group: { fontSize: FontSize.xs, color: Colors.text.subtle },
  yapStatus: {
    fontSize: FontSize.xs,
    color: Colors.text.subtle,
    textAlign: 'right',
  },
});
