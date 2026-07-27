/**
 * Tickets API — WhatsApp-ticketing REST client (mirrors the web repo's
 * state/tickets/tickets.extraReducers.ts thunks, which call the exact same
 * backend routes documented in
 * karins_fastag_node-main/routes/ticketRoutes.js).
 *
 * `POST /tickets` (direct/app-initiated ticket creation) now exists on the
 * backend — see routes/ticketRoutes.js, controllers/ticketController.js's
 * createTicket, schemas/ticketSchemas.js's createTicketSchema, and
 * services/ticketService.js's createTicketService. It always creates a
 * brand-new ticket row (source: 'portal') — unlike the WAHA-inbound path,
 * there is no "reopen window" merging into an existing ticket (see
 * docs/TICKETING_ARCHITECTURE.md's "Ticket creation has two entry points"
 * section). `raiseTicket` below calls it for real.
 */

import { apiClient } from './client';

// ── Enums — exact string values from constants/index.js (ticketStatus,
// ticketPriority, deliveredStatus). Keep in sync with the backend; these are
// stored/queried as-is, not translated. ──────────────────────────────────
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_on_customer'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketSource = 'whatsapp' | 'email' | 'portal' | 'phone';

// 'portal' added alongside POST /tickets — the first ticket_message row for
// a directly-raised ticket uses channel: 'portal' (see
// backend/migrations/20260722_add_portal_channel_to_ticket_message.sql).
export type TicketMessageChannel = 'whatsapp' | 'internal_note' | 'email' | 'portal';
export type TicketMessageDirection = 'inbound' | 'outbound';
export type TicketMessageSenderType = 'customer' | 'agent' | 'system';

export type TicketDeliveredStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface TicketCustomerUser {
  id: number;
  name?: string;
  mobileNumber?: string;
}

export interface TicketCustomer {
  id: number;
  user?: TicketCustomerUser;
}

export interface TicketWhatsappGroup {
  id: number;
  groupName?: string;
  groupJid?: string;
  sessionId?: string;
}

export interface TicketCategory {
  id: number;
  name?: string;
}

export interface TicketAssignedUser {
  id: number;
  name?: string;
}

export interface TicketMessageRecord {
  id: number;
  ticketId: number;
  direction: TicketMessageDirection;
  channel: TicketMessageChannel;
  whatsappMessageId?: string | null;
  senderType: TicketMessageSenderType;
  senderUserId?: number | null;
  senderPhone?: string | null;
  body: string;
  attachments?: unknown;
  deliveredStatus?: TicketDeliveredStatus | null;
  createdAt: string;
}

export interface TicketRecord {
  id: number;
  ticketNumber: string;
  source: TicketSource;
  whatsappGroupId?: number | null;
  whatsappGroup?: TicketWhatsappGroup | null;
  customerId?: number | null;
  customer?: TicketCustomer | null;
  categoryId?: number | null;
  category?: TicketCategory | null;
  status: TicketStatus;
  priority: TicketPriority;
  subject?: string | null;
  assignedToUserId?: number | null;
  assignedTo?: TicketAssignedUser | null;
  assignedRoleId?: number | null;
  slaDueAt?: string | null;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy?: number | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the GET /tickets/:id detail response
  // (getTicketByIdService includes { model: TicketMessage, as: 'messages' }).
  // This INCLUDES internal_note-channel rows — the backend does not filter
  // them out for any role. Callers (TicketChatScreen) MUST filter
  // `channel === 'internal_note'` out of any customer-facing render, the
  // same way web's TicketDetail.tsx's MessageBubble does.
  messages?: TicketMessageRecord[];
}

export interface TicketAuditLogRecord {
  id: number;
  ticketId: number;
  actorUserId?: number | null;
  actorUser?: { id: number; name?: string } | null;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
}

export interface AssignableAgent {
  id: number;
  name?: string;
  emailId?: string;
}

export interface TicketListQueryParams {
  pageNo?: number;
  pageSize?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number;
  assignedToMe?: boolean;
}

export interface TicketListResponse {
  count: number;
  rows: TicketRecord[];
}

export interface TicketReportSummary {
  totalTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  slaCompliance: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  openTicketsPastSla: number;
}

export interface TicketVolumeQueryParams {
  from?: string;
  to?: string;
  groupBy?: 'status' | 'priority';
}

export interface TicketReportQueryParams {
  from?: string;
  to?: string;
  categoryId?: number;
}

function buildParams<T extends object>(params: T): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value as string | number | boolean;
    }
  });
  return query;
}

export const ticketsApi = {
  /** GET /tickets — RBAC-scoped server-side (see ticketAccessMW.js canViewTickets). */
  getTicketList: (params: TicketListQueryParams = {}) =>
    apiClient.get<{ success: boolean; message: string; data: TicketListResponse }>(
      '/tickets',
      { params: buildParams(params) },
    ),

  /** GET /tickets/priority-list — same list, always ordered by priority. */
  getTicketPriorityList: (params: TicketListQueryParams = {}) =>
    apiClient.get<{ success: boolean; message: string; data: TicketListResponse }>(
      '/tickets/priority-list',
      { params: buildParams(params) },
    ),

  /** GET /tickets/:id — includes ALL messages (whatsapp + internal_note channels). */
  getTicketById: (id: number | string) =>
    apiClient.get<{ success: boolean; message: string; data: TicketRecord }>(`/tickets/${id}`),

  /** GET /tickets/:id/audit-log — newest first. */
  getTicketAuditLog: (id: number | string) =>
    apiClient.get<{ success: boolean; message: string; data: TicketAuditLogRecord[] }>(
      `/tickets/${id}/audit-log`,
    ),

  /** GET /tickets/assignable-agents — canAssignTicket only (ADMIN/EMPLOYEE/CUSTOMER_GROUP_ADMIN). */
  getAssignableAgents: () =>
    apiClient.get<{ success: boolean; message: string; data: AssignableAgent[] }>(
      '/tickets/assignable-agents',
    ),

  /** PUT /tickets/:id/assign — canAssignTicket only. */
  assignTicket: (id: number | string, body: { assignedToUserId?: number | null; assignedRoleId?: number | null }) =>
    apiClient.put<{ success: boolean; message: string }>(`/tickets/${id}/assign`, body),

  /** PUT /tickets/:id/status — canViewTickets server-side; UI narrows further (see TicketChatScreen). */
  updateTicketStatus: (id: number | string, status: TicketStatus) =>
    apiClient.put<{ success: boolean; message: string }>(`/tickets/${id}/status`, { status }),

  /** PUT /tickets/:id/priority — canAssignTicket only (same gate as /assign). */
  updateTicketPriority: (id: number | string, priority: TicketPriority) =>
    apiClient.put<{ success: boolean; message: string }>(`/tickets/${id}/priority`, { priority }),

  /** PUT /tickets/:id/close — canCloseTicket only (ADMIN/EMPLOYEE). */
  closeTicket: (id: number | string) =>
    apiClient.put<{ success: boolean; message: string }>(`/tickets/${id}/close`, {}),

  /**
   * POST /tickets/:id/reply — sends an outbound WhatsApp message to the
   * customer. canReplyToTicket only (ADMIN/EMPLOYEE/AGENT) — a CUSTOMER
   * calling this gets a 403 from the backend; the UI never shows this
   * control to CUSTOMER (see TicketChatScreen's CAN_REPLY_ROLES gate).
   */
  addReply: (id: number | string, body: string) =>
    apiClient.post<{ success: boolean; message: string; data: TicketMessageRecord }>(
      `/tickets/${id}/reply`,
      { body },
    ),

  /**
   * POST /tickets/:id/internal-note — agent-only, never delivered to the
   * customer over WhatsApp. Same canReplyToTicket gate as addReply. This
   * function must never be called from a customer-facing surface — see
   * TicketChatScreen's role gating, which hides the entire internal-note
   * composer (not just disables it) for CUSTOMER.
   */
  addInternalNote: (id: number | string, body: string) =>
    apiClient.post<{ success: boolean; message: string; data: TicketMessageRecord }>(
      `/tickets/${id}/internal-note`,
      { body },
    ),

  /** GET /tickets/reports/summary — canViewTickets; row-scoped like the list. */
  getReportSummary: (params: TicketReportQueryParams = {}) =>
    apiClient.get<{ success: boolean; message: string; data: TicketReportSummary }>(
      '/tickets/reports/summary',
      { params: buildParams(params) },
    ),

  /** GET /tickets/reports/volume — daily creation buckets, optional status/priority split. */
  getReportVolume: (params: TicketVolumeQueryParams = {}) =>
    apiClient.get<{ success: boolean; message: string; data: unknown }>(
      '/tickets/reports/volume',
      { params: buildParams(params) },
    ),

  /**
   * POST /tickets — direct/app-initiated ticket creation. Gated server-side
   * by canCreateTicket (CUSTOMER, ADMIN, EMPLOYEE only — see
   * middlewares/ticketAccessMW.js). Field names must match
   * schemas/ticketSchemas.js's createTicketSchema exactly: `subject`
   * (required), `message` (required), `categoryId` (optional).
   *
   * Deliberately NO `customerId` parameter here. The schema/service accept
   * one for ADMIN/EMPLOYEE creating a ticket "on behalf of" a customer, but
   * this mobile app has no staff-side customer-picker UI anywhere, and
   * RaiseTicketScreen is CUSTOMER-only (see its own doc comment) — so the
   * mobile client never has a legitimate customerId to send. Omitting the
   * field entirely (rather than accepting-but-not-sending it) means a
   * CUSTOMER caller can never accidentally pass one, matching the backend's
   * own ignore-for-CUSTOMER behavior belt-and-braces.
   */
  raiseTicket: (input: { subject: string; message: string; categoryId?: number }) =>
    apiClient.post<{ success: boolean; message: string; data: TicketRecord }>('/tickets', {
      subject: input.subject,
      message: input.message,
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    }),
};
