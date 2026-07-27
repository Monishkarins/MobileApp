/**
 * Ticket Chat — the "WhatsApp Window" in-app chat thread. Talks to the
 * existing /tickets REST API (GET :id, POST :id/reply, POST
 * :id/internal-note, PUT :id/status, PUT :id/priority, PUT :id/assign, PUT
 * :id/close), NOT the real WhatsApp app — see this repo's task brief for
 * why (bypassing the backend would skip everything the ticketing system was
 * built for). Mirrors web's Tickets/TicketDetail.tsx feature-for-feature,
 * with the same UI-side role gates (CAN_REPLY_ROLES etc. below mirror
 * middlewares/ticketAccessMW.js — the backend is the real enforcement,
 * these only control what's shown here) and a CUSTOMER-focused layout that
 * drops the agent-only controls entirely rather than disabling them.
 *
 * Internal notes: GET /tickets/:id returns ALL ticket_message rows,
 * including channel: 'internal_note' ones — the backend does not filter by
 * role (see ticketsApi.ts's TicketRecord doc comment). This screen strips
 * internal_note messages out of the array BEFORE they are ever mapped to a
 * rendered bubble for a role that cannot see them (visibleMessages below),
 * so a CUSTOMER render path never even constructs a bubble for one — not
 * just a style/visibility toggle on an already-rendered node.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { LiquidBackground, ScreenHeader } from '../../../components';
import { StatusPill } from '../../../components/common/StatusPill';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  addInternalNoteToTicket,
  assignTicketThunk,
  clearTicketDetail,
  closeTicketThunk,
  fetchTicketAuditLog,
  fetchTicketById,
  replyToTicket,
  updateTicketPriorityThunk,
  updateTicketStatusThunk,
} from '../../../store/slices/ticketsSlice';
import { ticketsApi, type AssignableAgent, type TicketMessageRecord, type TicketPriority, type TicketStatus } from '../../../services/api/ticketsApi';
import type { MoreStackParamList } from '../../../navigation/types';
import { MessageBubble } from '../components/MessageBubble';
import { ticketPriorityLabel, ticketPriorityVariant, ticketStatusLabel, ticketStatusVariant } from '../utils/ticketUiHelpers';
import {
  CAN_REPLY_ROLES,
  CAN_ASSIGN_ROLES,
  CAN_CLOSE_ROLES,
  CAN_CHANGE_STATUS_ROLES,
  CAN_UPDATE_PRIORITY_ROLES,
  CAN_SEE_INTERNAL_NOTES_ROLES,
} from '../../../rbac/ticketCapabilities';

type TicketChatRoute = RouteProp<MoreStackParamList, 'TicketChat'>;

// Interim polling interval — matches web's TicketDetail.tsx
// TICKET_DETAIL_POLL_INTERVAL_MS. No websockets yet (see
// TICKETING_ARCHITECTURE.md Sharp Edge #9); this is an honest reflection of
// that, not a workaround pretending to be real-time.
const TICKET_CHAT_POLL_INTERVAL_MS = 10000;

// Role gates now come from src/rbac/ticketCapabilities.ts (the single
// source of truth, synced from the backend's actual middleware via the
// generator script) — see that file's header comment for why this used to
// be six local literals here and why that was a real structural risk.

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed', 'reopened'];
const PRIORITY_OPTIONS: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];

export default function TicketChatScreen() {
  const route = useRoute<TicketChatRoute>();
  const { ticketId } = route.params;
  const dispatch = useAppDispatch();
  const roleKey = useAppSelector((s) => s.auth.user?.roleKey) || '';
  const { detail: ticket, detailLoading, replyLoading } = useAppSelector((s) => s.tickets);

  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [assignableAgents, setAssignableAgents] = useState<AssignableAgent[]>([]);

  const canReply = CAN_REPLY_ROLES.includes(roleKey);
  const canAssign = CAN_ASSIGN_ROLES.includes(roleKey);
  const canClose = CAN_CLOSE_ROLES.includes(roleKey);
  const canChangeStatus = CAN_CHANGE_STATUS_ROLES.includes(roleKey);
  const canUpdatePriority = CAN_UPDATE_PRIORITY_ROLES.includes(roleKey);
  const canSeeInternalNotes = CAN_SEE_INTERNAL_NOTES_ROLES.includes(roleKey);
  // A CUSTOMER (or any non-staff role) gets the focused "raise and follow
  // up" layout — no status/priority/assign controls at all.
  const isStaffView = canReply || canAssign || canChangeStatus;

  const load = useCallback(() => {
    dispatch(fetchTicketById(ticketId));
  }, [dispatch, ticketId]);

  useEffect(() => {
    load();
    dispatch(fetchTicketAuditLog(ticketId));
    return () => {
      dispatch(clearTicketDetail());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      const intervalId = setInterval(load, TICKET_CHAT_POLL_INTERVAL_MS);
      return () => clearInterval(intervalId);
    }, [load]),
  );

  useEffect(() => {
    if (!canAssign) return;
    ticketsApi.getAssignableAgents()
      .then(({ data }) => setAssignableAgents(data.data))
      .catch(() => { /* non-fatal — the picker simply stays empty */ });
  }, [canAssign]);

  // See file header comment — messages that a role has no right to see are
  // removed from the array here, before anything downstream ever renders
  // them, rather than filtered per-bubble.
  const visibleMessages = useMemo<TicketMessageRecord[]>(() => {
    const messages = ticket?.messages || [];
    const sorted = [...messages].sort((a, b) => a.id - b.id);
    if (canSeeInternalNotes) return sorted;
    return sorted.filter((m) => m.channel !== 'internal_note');
  }, [ticket?.messages, canSeeInternalNotes]);

  const handleSendReply = async () => {
    const body = replyText.trim();
    if (!body) return;
    setReplyText('');
    try {
      await dispatch(replyToTicket({ id: ticketId, body })).unwrap();
    } catch (err) {
      Alert.alert('Reply failed', (err as string) || 'Failed to send reply');
    }
  };

  const handleAddNote = async () => {
    const body = noteText.trim();
    if (!body) return;
    setSendingNote(true);
    try {
      await dispatch(addInternalNoteToTicket({ id: ticketId, body })).unwrap();
      setNoteText('');
      setNoteMode(false);
    } catch (err) {
      Alert.alert('Add note failed', (err as string) || 'Failed to add internal note');
    } finally {
      setSendingNote(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    setStatusPickerOpen(false);
    try {
      await dispatch(updateTicketStatusThunk({ id: ticketId, status })).unwrap();
      dispatch(fetchTicketAuditLog(ticketId));
    } catch (err) {
      Alert.alert('Update failed', (err as string) || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    setPriorityPickerOpen(false);
    try {
      await dispatch(updateTicketPriorityThunk({ id: ticketId, priority })).unwrap();
      dispatch(fetchTicketAuditLog(ticketId));
    } catch (err) {
      Alert.alert('Update failed', (err as string) || 'Failed to update priority');
    }
  };

  const handleAssign = async (agent: AssignableAgent | null) => {
    setAssignPickerOpen(false);
    try {
      await dispatch(assignTicketThunk({ id: ticketId, assignedToUserId: agent?.id ?? null })).unwrap();
      dispatch(fetchTicketAuditLog(ticketId));
    } catch (err) {
      Alert.alert('Assign failed', (err as string) || 'Failed to assign ticket');
    }
  };

  const handleClose = () => {
    Alert.alert('Close ticket', 'Close this ticket? The customer will no longer be able to reply through this thread.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close ticket',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(closeTicketThunk(ticketId)).unwrap();
            dispatch(fetchTicketAuditLog(ticketId));
          } catch (err) {
            Alert.alert('Close failed', (err as string) || 'Failed to close ticket');
          }
        },
      },
    ]);
  };

  if (detailLoading && !ticket) {
    return (
      <LiquidBackground>
        <ScreenHeader title="Ticket" showBack />
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.blue} />
        </View>
      </LiquidBackground>
    );
  }

  if (!ticket) {
    return (
      <LiquidBackground>
        <ScreenHeader title="Ticket" showBack />
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Ticket not found</Text>
        </View>
      </LiquidBackground>
    );
  }

  return (
    <LiquidBackground>
      <ScreenHeader
        title={ticket.ticketNumber}
        subtitle={ticket.subject || undefined}
        showBack
        rightElement={(
          <View style={styles.headerPills}>
            <StatusPill label={ticketStatusLabel(ticket.status)} variant={ticketStatusVariant(ticket.status)} small />
            <StatusPill label={ticketPriorityLabel(ticket.priority)} variant={ticketPriorityVariant(ticket.priority)} small />
          </View>
        )}
      />

      {isStaffView ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlsRow}>
          {canChangeStatus ? (
            <TouchableOpacity style={styles.controlChip} onPress={() => setStatusPickerOpen(true)}>
              <Text style={styles.controlChipLabel}>Status: {ticketStatusLabel(ticket.status)}</Text>
            </TouchableOpacity>
          ) : null}
          {canUpdatePriority ? (
            <TouchableOpacity style={styles.controlChip} onPress={() => setPriorityPickerOpen(true)}>
              <Text style={styles.controlChipLabel}>Priority: {ticketPriorityLabel(ticket.priority)}</Text>
            </TouchableOpacity>
          ) : null}
          {canAssign ? (
            <TouchableOpacity style={styles.controlChip} onPress={() => setAssignPickerOpen(true)}>
              <Text style={styles.controlChipLabel}>
                Assigned: {ticket.assignedTo?.name || 'Unassigned'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canClose && ticket.status !== 'closed' ? (
            <TouchableOpacity style={[styles.controlChip, styles.closeChip]} onPress={handleClose}>
              <Text style={styles.closeChipLabel}>Close ticket</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={visibleMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet</Text>}
        />

        {canReply ? (
          <View style={styles.composerWrap}>
            {noteMode ? (
              <View style={styles.noteComposer}>
                <Text style={styles.noteComposerLabel}>Internal note (not sent to customer)</Text>
                <View style={styles.composerRow}>
                  <TextInput
                    style={styles.input}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="Note visible only to agents..."
                    placeholderTextColor={Colors.input.placeholder}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, styles.noteSendBtn]}
                    onPress={handleAddNote}
                    disabled={!noteText.trim() || sendingNote}
                  >
                    {sendingNote ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.sendBtnText}>Add</Text>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setNoteMode(false)}>
                  <Text style={styles.modeToggle}>Back to reply</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.input}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Reply to customer over WhatsApp..."
                  placeholderTextColor={Colors.input.placeholder}
                  multiline
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleSendReply}
                  disabled={!replyText.trim() || replyLoading}
                >
                  {replyLoading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.sendBtnText}>Send</Text>}
                </TouchableOpacity>
              </View>
            )}
            {!noteMode ? (
              <TouchableOpacity onPress={() => setNoteMode(true)}>
                <Text style={styles.modeToggle}>+ Add internal note instead</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.composerWrap}>
            <Text style={styles.readOnlyNote}>
              {ticket.status === 'closed'
                ? 'This ticket is closed.'
                : 'Replies are sent from our support team over WhatsApp — reply there to continue this conversation.'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <PickerModal
        visible={statusPickerOpen}
        title="Change status"
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: ticketStatusLabel(s) }))}
        onSelect={(value) => handleStatusChange(value as TicketStatus)}
        onClose={() => setStatusPickerOpen(false)}
      />
      <PickerModal
        visible={priorityPickerOpen}
        title="Change priority"
        options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: ticketPriorityLabel(p) }))}
        onSelect={(value) => handlePriorityChange(value as TicketPriority)}
        onClose={() => setPriorityPickerOpen(false)}
      />
      <PickerModal
        visible={assignPickerOpen}
        title="Assign to"
        options={[
          { value: '', label: 'Unassigned' },
          ...assignableAgents.map((a) => ({ value: String(a.id), label: `${a.name || 'Agent'} (${a.emailId || ''})` })),
        ]}
        onSelect={(value) => {
          const agent = assignableAgents.find((a) => String(a.id) === value) || null;
          handleAssign(agent);
        }}
        onClose={() => setAssignPickerOpen(false)}
      />
    </LiquidBackground>
  );
}

function PickerModal({
  visible, title, options, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity key={opt.value} style={styles.modalOption} onPress={() => onSelect(opt.value)}>
              <Text style={styles.modalOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.text.subtle, fontSize: FontSize.base, textAlign: 'center', marginTop: Spacing[8] },
  headerPills: { flexDirection: 'row', gap: 6 },
  controlsRow: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: Spacing[2] },
  controlChip: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  controlChipLabel: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
  closeChip: { backgroundColor: Colors.dangerBg, borderColor: Colors.dangerBorder },
  closeChipLabel: { color: Colors.dangerLight, fontSize: FontSize.sm, fontWeight: '700' },
  messagesContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], paddingBottom: Spacing[4], flexGrow: 1 },
  composerWrap: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[4],
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2] },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    color: Colors.text.primary,
    fontSize: FontSize.base,
  },
  sendBtn: {
    minWidth: 64,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  noteSendBtn: { backgroundColor: Colors.warning },
  sendBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
  modeToggle: { color: Colors.infoLight, fontSize: FontSize.sm, marginTop: Spacing[2], textAlign: 'right' },
  noteComposer: {},
  noteComposerLabel: { color: Colors.warningLight, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 6 },
  readOnlyNote: { color: Colors.text.subtle, fontSize: FontSize.sm, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: Colors.bg.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bg.elevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
    paddingBottom: Spacing[8],
  },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing[3] },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalOptionText: { color: Colors.text.primary, fontSize: FontSize.base },
});
