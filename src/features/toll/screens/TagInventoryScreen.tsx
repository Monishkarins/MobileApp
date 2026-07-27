/**
 * Tag Inventory — lists FASTag stock from /tag/tagList with web-parity filters
 * (tag ID, barcode, class, VRN, status; agent filter for admin/employee).
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tollApi } from '../../../services/api/tollApi';
import { apiClient } from '../../../services/api/client';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, StatusPill,
  SkeletonCard, EmptyState, ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtDate } from '../../../utils/format';
import { requiresAdminContextPicker } from '../../../types/auth';
import TagInventoryFilterPanel, {
  EMPTY_TAG_FILTERS,
  canShowAgentFilter,
} from '../components/TagInventoryFilterPanel';
import type { TagInventoryFilters } from '../constants/tagInventoryFilters';
import { mapTagInventoryRow, type TagListItem } from '../mapTagInventoryRow';
import type { MoreStackParamList } from '../../../navigation/types';
import { tagStatusDisplay, tagStatusVariant } from '../utils/tagStatusUtils';

const PAGE_SIZE = 25;

interface AgentOption {
  id: number;
  agentName: string;
}

function buildQueryParams(
  filters: TagInventoryFilters,
  agentId: string,
  customerId: number | null | undefined,
  canScopeByCustomerId: boolean,
  pageNo: number,
) {
  const params: Record<string, string | number> = { pageNo, pageSize: PAGE_SIZE };
  if (filters.tagId.trim()) params.tagId = filters.tagId.trim();
  if (filters.tagBarcode.trim()) params.tagBarcode = filters.tagBarcode.trim();
  if (filters.tagClass.trim()) params.tagClass = filters.tagClass.trim();
  if (filters.vrn.trim()) params.vrn = filters.vrn.trim();
  if (filters.status) params.status = filters.status;
  if (agentId) params.agentId = agentId;
  if (canScopeByCustomerId && customerId) params.customerId = customerId;
  return params;
}

function hasActiveTagFilters(filters: TagInventoryFilters, activeAgentId: string): boolean {
  return Boolean(
    filters.tagId.trim()
    || filters.tagBarcode.trim()
    || filters.tagClass.trim()
    || filters.vrn.trim()
    || filters.status
    || activeAgentId,
  );
}

export default function TagInventoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = dashboardContext?.customerId ?? user?.defaultCustomerId;
  const canScopeByCustomerId = requiresAdminContextPicker(user?.roleKey);

  const [draftFilters, setDraftFilters] = useState<TagInventoryFilters>(EMPTY_TAG_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TagInventoryFilters>(EMPTY_TAG_FILTERS);
  const [agentId, setAgentId] = useState('');
  const [appliedAgentId, setAppliedAgentId] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [tags, setTags] = useState<TagListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtersActive = useMemo(
    () => hasActiveTagFilters(appliedFilters, appliedAgentId),
    [appliedFilters, appliedAgentId],
  );

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
      } catch { /* agent list is optional for filtering */ }
    })();
  }, [user?.roleKey]);

  const fetchData = useCallback(async (
    filters: TagInventoryFilters,
    activeAgentId: string,
    isRefresh = false,
  ) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    try {
      const { data } = await tollApi.getTagInventory(
        buildQueryParams(filters, activeAgentId, customerId, canScopeByCustomerId, 1),
      );

      const mapped = (data.tagList ?? []).map(mapTagInventoryRow);
      setTags(mapped);
      setTotal(data.totalCount ?? mapped.length);
    } catch { /* FlatList shows empty state */ }
    finally { setLoading(false); setRefresh(false); }
  }, [canScopeByCustomerId, customerId]);

  useEffect(() => {
    fetchData(appliedFilters, appliedAgentId);
  }, [fetchData, appliedFilters, appliedAgentId]);

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters });
    setAppliedAgentId(agentId);
    setShowFilters(false);
  };

  const handleReset = () => {
    setDraftFilters(EMPTY_TAG_FILTERS);
    setAgentId('');
    setAppliedFilters(EMPTY_TAG_FILTERS);
    setAppliedAgentId('');
  };

  const renderItem = ({ item }: { item: TagListItem }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => nav.navigate('TagDetail', {
        tagId: item.id,
        tag: item.detail,
      })}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.left}>
            <Text style={styles.vehicleNo}>{item.vehicleNo ?? 'Unassigned'}</Text>
            <Text style={styles.serial} numberOfLines={1} selectable>Tag: {item.tagSerial}</Text>
          </View>
          <View style={styles.right}>
            <StatusPill label={tagStatusDisplay(item.status)} variant={tagStatusVariant(item.status)} small />
            <View style={styles.classChip}>
              <Text style={styles.classText}>{item.tagClass}</Text>
            </View>
          </View>
        </View>
        {item.assignedDate && (
          <Text style={styles.meta}>Assigned {fmtDate(item.assignedDate)}</Text>
        )}
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Tag Inventory"
        subtitle={total ? `${total} tags` : undefined}
        showBack
        rightElement={(
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
        )}
      />
      {showFilters ? (
        <TagInventoryFilterPanel
          roleKey={user?.roleKey}
          draft={draftFilters}
          agentId={agentId}
          agents={agents}
          onChange={setDraftFilters}
          onAgentChange={setAgentId}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      ) : null}
      {loading ? (
        <View style={{ padding: Spacing[4], gap: 8 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(appliedFilters, appliedAgentId, true)}
              tintColor={Colors.blue}
            />
          }
          ListEmptyComponent={
            <EmptyState title="No tags found" icon="🏷" subtitle="No FASTags match your filters." />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  filterBtn: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  list: { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], gap: 8, paddingBottom: 32 },
  card: { padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  vehicleNo: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, fontFamily: 'monospace' },
  serial: { fontSize: FontSize.xs, color: Colors.text.subtle, fontFamily: 'monospace' },
  classChip: {
    backgroundColor: Colors.infoBg,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  classText: { fontSize: FontSize.xs, color: Colors.infoLight, fontWeight: '600' },
  meta: { fontSize: FontSize.xs, color: Colors.text.subtle, marginTop: 8 },
});
