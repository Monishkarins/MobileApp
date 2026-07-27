/**
 * Pure ticket UI helpers — status/priority → StatusPill variant + label, and
 * delivered_status → tick-icon mapping. Kept dependency-free (no RN imports)
 * so they're testable the same way as the backend's "pure engine" pattern
 * (see karins_fastag_node-main/docs/TICKETING_ARCHITECTURE.md) and this
 * app's existing dashboardMetrics/dashboardSummaryUtils pure-function style.
 */

import type {
  TicketDeliveredStatus,
  TicketPriority,
  TicketStatus,
} from '../../../services/api/ticketsApi';

export type PillVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'amber';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_on_customer: 'Waiting on Customer',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

const STATUS_VARIANTS: Record<TicketStatus, PillVariant> = {
  open: 'info',
  in_progress: 'amber',
  waiting_on_customer: 'warning',
  resolved: 'success',
  closed: 'neutral',
  reopened: 'danger',
};

export function ticketStatusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function ticketStatusVariant(status: TicketStatus): PillVariant {
  return STATUS_VARIANTS[status] ?? 'neutral';
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_VARIANTS: Record<TicketPriority, PillVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

export function ticketPriorityLabel(priority: TicketPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function ticketPriorityVariant(priority: TicketPriority): PillVariant {
  return PRIORITY_VARIANTS[priority] ?? 'neutral';
}

/**
 * Maps ticket_message.delivered_status (constants/index.js's deliveredStatus
 * enum — pending/sent/delivered/read/failed) to a WhatsApp-style tick glyph
 * + accessibility label for outbound message bubbles. `null`/`undefined`
 * (inbound messages never set this field) renders no tick at all.
 *
 * NOTE: WAHA ack payload shapes are unverified against a live WAHA instance
 * (see TICKETING_ARCHITECTURE.md Sharp Edge #5) — delivered/read status may
 * not always advance past 'sent' in practice. This mapping renders whatever
 * the backend reports; it doesn't assume acks always arrive.
 */
export interface DeliveredStatusTick {
  glyph: string;
  label: string;
  variant: PillVariant;
}

const DELIVERED_STATUS_TICKS: Record<TicketDeliveredStatus, DeliveredStatusTick> = {
  pending: { glyph: '🕓', label: 'Sending…', variant: 'neutral' },
  sent: { glyph: '✓', label: 'Sent', variant: 'neutral' },
  delivered: { glyph: '✓✓', label: 'Delivered', variant: 'neutral' },
  read: { glyph: '✓✓', label: 'Read', variant: 'info' },
  failed: { glyph: '⚠', label: 'Failed to send', variant: 'danger' },
};

export function deliveredStatusTick(
  status: TicketDeliveredStatus | null | undefined,
): DeliveredStatusTick | null {
  if (!status) return null;
  return DELIVERED_STATUS_TICKS[status] ?? null;
}
