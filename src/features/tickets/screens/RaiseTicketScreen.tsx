/**
 * Raise a ticket — CUSTOMER entry point for starting a new support ticket.
 *
 * Calls the real `POST /tickets` endpoint (routes/ticketRoutes.js,
 * gated by canCreateTicket) via the `raiseTicket` thunk. Every submit
 * always creates a brand-new ticket — the backend does NOT run the
 * WAHA-inbound path's "reopen window" merging here (see
 * karins_fastag_node-main/docs/TICKETING_ARCHITECTURE.md's "Ticket
 * creation has two entry points" section), so this never gets folded into
 * an existing ticket.
 *
 * CUSTOMER-only by design: the backend's createTicketSchema accepts an
 * optional `customerId` so ADMIN/EMPLOYEE can log a ticket on a customer's
 * behalf, but there is no staff-side customer-picker UI anywhere in this
 * app, and building one wasn't a request — this screen (and
 * ticketsApi.raiseTicket) intentionally never sends or exposes a
 * customerId field. Staff-on-behalf-of-customer creation is left
 * unimplemented on mobile; see TicketListScreen's CAN_RAISE_TICKET_ROLES
 * for the matching CUSTOMER-only gate on who can even reach this screen.
 *
 * No category picker: GET /ticket-keyword-rules/categories/list is gated
 * by canManageTicketRules (ADMIN/EMPLOYEE only — see
 * middlewares/ticketAccessMW.js), so a CUSTOMER can't fetch the category
 * list without a 403. Tickets raised here are left uncategorized
 * (categoryId omitted); services/ticketService.js#createTicketService
 * handles that as the "no SLA category" default, same as elsewhere in this
 * codebase.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LiquidBackground, GlassCard, ScreenHeader } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../store';
import { raiseTicket } from '../../../store/slices/ticketsSlice';
import type { MoreStackParamList } from '../../../navigation/types';

type RaiseTicketNav = NativeStackNavigationProp<MoreStackParamList, 'RaiseTicket'>;

export default function RaiseTicketScreen() {
  const nav = useNavigation<RaiseTicketNav>();
  const dispatch = useAppDispatch();
  const raiseLoading = useAppSelector((s) => s.tickets.raiseLoading);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !raiseLoading;

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    if (subject.trim().length === 0 || message.trim().length === 0 || raiseLoading) return;

    const result = await dispatch(
      raiseTicket({ subject: subject.trim(), message: message.trim() }),
    );

    if (raiseTicket.fulfilled.match(result)) {
      nav.replace('TicketChat', { ticketId: result.payload.id });
    } else {
      setSubmitError(result.payload || 'Failed to raise ticket. Please try again.');
    }
  };

  return (
    <LiquidBackground>
      <ScreenHeader title="Raise a Ticket" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <GlassCard style={styles.formCard}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary of your issue"
              placeholderTextColor={Colors.input.placeholder}
              editable={!raiseLoading}
            />
            {submitAttempted && subject.trim().length === 0 ? (
              <Text style={styles.errorText}>A subject is required.</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: Spacing[3] }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={Colors.input.placeholder}
              multiline
              editable={!raiseLoading}
            />
            {submitAttempted && message.trim().length === 0 ? (
              <Text style={styles.errorText}>A message is required.</Text>
            ) : null}
          </GlassCard>

          {submitError ? (
            <GlassCard variant="danger" style={styles.errorCard}>
              <Text style={styles.errorCardText}>{submitError}</Text>
            </GlassCard>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {raiseLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], gap: Spacing[4] },
  formCard: { padding: Spacing[4] },
  label: { color: Colors.text.label, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.glass.bg,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    color: Colors.text.primary,
    fontSize: FontSize.base,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  errorText: { color: Colors.dangerLight, fontSize: FontSize.xs, marginTop: 6 },
  errorCard: { padding: Spacing[3] },
  errorCardText: { color: Colors.dangerLight, fontSize: FontSize.sm },
  submitBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
