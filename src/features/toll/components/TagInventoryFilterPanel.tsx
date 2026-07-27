/**
 * Tag inventory search filters — mirrors web TagInventoryHeader fields.
 */

import React, { useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { requiresAdminContextPicker } from '../../../types/auth';
import type { RoleKey } from '../../../types/auth';
import {
  EMPTY_TAG_FILTERS,
  TAG_STATUS_OPTIONS,
  type TagInventoryFilters,
} from '../constants/tagInventoryFilters';

export function canShowAgentFilter(roleKey?: RoleKey): boolean {
  return roleKey === 'ADMIN' || roleKey === 'EMPLOYEE';
}

interface AgentOption {
  id: number;
  agentName: string;
}

interface TagInventoryFilterPanelProps {
  roleKey?: RoleKey;
  draft: TagInventoryFilters;
  agentId: string;
  agents: AgentOption[];
  onChange: (next: TagInventoryFilters) => void;
  onAgentChange: (agentId: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function TagInventoryFilterPanel({
  roleKey,
  draft,
  agentId,
  agents,
  onChange,
  onAgentChange,
  onSearch,
  onReset,
}: TagInventoryFilterPanelProps) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [agentOpen, setAgentOpen] = React.useState(false);

  const showAdminStatuses = requiresAdminContextPicker(roleKey);
  const showAgentFilter = canShowAgentFilter(roleKey);

  const statusOptions = useMemo(
    () => TAG_STATUS_OPTIONS.filter((o) => !o.adminOnly || showAdminStatuses),
    [showAdminStatuses],
  );

  const statusLabel = statusOptions.find((o) => o.value === draft.status)?.label ?? 'All status';

  const agentLabel = agents.find((a) => String(a.id) === agentId)?.agentName ?? 'All agents';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Tag ID"
          placeholderTextColor={Colors.text.subtle}
          value={draft.tagId}
          onChangeText={(tagId) => onChange({ ...draft, tagId })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <TextInput
          style={styles.input}
          placeholder="Barcode"
          placeholderTextColor={Colors.text.subtle}
          value={draft.tagBarcode}
          onChangeText={(tagBarcode) => onChange({ ...draft, tagBarcode })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Class e.g. VC4"
          placeholderTextColor={Colors.text.subtle}
          value={draft.tagClass}
          onChangeText={(tagClass) => onChange({ ...draft, tagClass })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <TextInput
          style={styles.input}
          placeholder="VRN"
          placeholderTextColor={Colors.text.subtle}
          value={draft.vrn}
          onChangeText={(vrn) => onChange({ ...draft, vrn })}
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
      </View>

      <TouchableOpacity style={styles.select} onPress={() => setStatusOpen(true)} activeOpacity={0.85}>
        <Text style={styles.selectLabel}>Status</Text>
        <Text style={styles.selectValue} numberOfLines={1}>{statusLabel}</Text>
      </TouchableOpacity>

      {showAgentFilter ? (
        <TouchableOpacity style={styles.select} onPress={() => setAgentOpen(true)} activeOpacity={0.85}>
          <Text style={styles.selectLabel}>Agent</Text>
          <Text style={styles.selectValue} numberOfLines={1}>{agentLabel}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.85}>
          <Text style={styles.searchText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setStatusOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Status</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { onChange({ ...draft, status: '' }); setStatusOpen(false); }}
              >
                <Text style={styles.modalItemText}>All status</Text>
              </TouchableOpacity>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalItem}
                  onPress={() => { onChange({ ...draft, status: opt.value }); setStatusOpen(false); }}
                >
                  <Text style={[styles.modalItemText, draft.status === opt.value && styles.modalItemActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={agentOpen} transparent animationType="fade" onRequestClose={() => setAgentOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAgentOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Agent</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => { onAgentChange(''); setAgentOpen(false); }}
              >
                <Text style={styles.modalItemText}>All agents</Text>
              </TouchableOpacity>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={styles.modalItem}
                  onPress={() => { onAgentChange(String(agent.id)); setAgentOpen(false); }}
                >
                  <Text style={[styles.modalItemText, agentId === String(agent.id) && styles.modalItemActive]}>
                    {agent.agentName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export { EMPTY_TAG_FILTERS };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  select: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectLabel: { fontSize: FontSize.xs, color: Colors.text.label, marginBottom: 2 },
  selectValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  searchBtn: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  resetBtn: {
    flex: 1,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '60%',
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing[3] },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalItemText: { fontSize: FontSize.base, color: Colors.text.secondary },
  modalItemActive: { color: Colors.infoLight, fontWeight: '700' },
});
