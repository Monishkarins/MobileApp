/**
 * WhatsApp-style message bubble — inbound left, outbound right, internal
 * note as a centered agent-only card. Mirrors web's TicketDetail.tsx
 * MessageBubble (colors translated to this app's dark glass theme).
 *
 * SAFETY: this component does not decide whether an internal-note message
 * is visible — the caller (TicketChatScreen) never puts internal_note
 * messages into the array passed to a CUSTOMER render at all, so a
 * CUSTOMER-facing chat never even calls this component with one. The
 * internal-note branch below only exists for the staff render path.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../../theme';
import { fmtDateTime } from '../../../utils/format';
import type { TicketMessageRecord } from '../../../services/api/ticketsApi';
import { deliveredStatusTick } from '../utils/ticketUiHelpers';

interface MessageBubbleProps {
  message: TicketMessageRecord;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isInternalNote = message.channel === 'internal_note';
  const isInbound = message.direction === 'inbound';

  if (isInternalNote) {
    return (
      <View style={styles.noteRow}>
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Note (internal only — not sent to customer)</Text>
          <Text style={styles.noteBody}>{message.body}</Text>
          <Text style={styles.noteTime}>{fmtDateTime(message.createdAt)}</Text>
        </View>
      </View>
    );
  }

  const tick = !isInbound ? deliveredStatusTick(message.deliveredStatus) : null;

  return (
    <View style={[styles.row, isInbound ? styles.rowInbound : styles.rowOutbound]}>
      <View style={[styles.bubble, isInbound ? styles.bubbleInbound : styles.bubbleOutbound]}>
        <Text style={styles.body}>{message.body}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{fmtDateTime(message.createdAt)}</Text>
          {tick ? (
            <Text
              style={[styles.tick, tick.variant === 'danger' && styles.tickFailed, tick.variant === 'info' && styles.tickRead]}
              accessibilityLabel={tick.label}
            >
              {tick.glyph}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 4, flexDirection: 'row' },
  rowInbound: { justifyContent: 'flex-start' },
  rowOutbound: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
  },
  bubbleInbound: {
    backgroundColor: Colors.glass.bg,
    borderColor: Colors.glass.border,
    borderTopLeftRadius: 4,
  },
  bubbleOutbound: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
    borderTopRightRadius: 4,
  },
  body: { color: Colors.text.primary, fontSize: FontSize.base, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  time: { color: Colors.text.muted, fontSize: FontSize.xs },
  tick: { color: Colors.text.muted, fontSize: FontSize.xs },
  tickRead: { color: Colors.infoLight },
  tickFailed: { color: Colors.dangerLight },
  noteRow: { alignItems: 'center', marginVertical: Spacing[2] },
  noteCard: {
    maxWidth: '92%',
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  noteLabel: { color: Colors.warningLight, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  noteBody: { color: Colors.text.primary, fontSize: FontSize.sm },
  noteTime: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
});
