/**
 * ticketCapabilities.ts — the ONE place in this repo that defines which
 * roles can do what in the ticketing UI.
 *
 * WHY THIS FILE EXISTS: this repo previously had a real bug — the "raise a
 * ticket" button was gated by a role list hand-typed directly into
 * TicketListScreen.tsx, and it drifted from what the backend actually
 * enforces (this repo allowed CUSTOMER_GROUP_ADMIN, the backend's
 * canCreateTicket middleware never did). Nobody noticed until someone
 * tried the feature and it 403'd. That's now fixed, but the STRUCTURAL
 * cause — role lists hand-typed directly into screen components instead
 * of one shared definition — was still present everywhere else in this
 * feature (TicketChatScreen.tsx had its own five local literals). This
 * file replaces all of them.
 *
 * Five of the seven lists below are read directly from
 * `ticket-capability-matrix.json` — a file generated from the backend's
 * actual middleware (`middlewares/ticketAccessMW.js` in the node repo),
 * copied into this repo. That means those five values can't silently
 * drift from what the backend enforces without someone visibly re-copying
 * a stale JSON file — which `scripts/check-ticket-rbac-sync.cjs` checks
 * for and fails loudly on.
 *
 * The remaining ones (`CAN_CHANGE_STATUS_ROLES`, `CAN_UPDATE_PRIORITY_ROLES`,
 * `CAN_SEE_INTERNAL_NOTES_ROLES`, `CAN_RAISE_TICKET_ROLES`) are
 * deliberately NARROWER than what the backend technically allows (see
 * their own comments below) — narrowing further in the UI is always safe
 * (it can only restrict, never grant, access beyond what the backend
 * enforces), so those stay hand-maintained here with an explanation, and
 * the sync-check script verifies they never contain a role the backend
 * disallows for the corresponding capability.
 *
 * HOW TO KEEP THIS IN SYNC WHEN THE BACKEND CHANGES:
 * 1. In the node repo, edit the role list in `middlewares/ticketAccessMW.js`.
 * 2. Run `node scripts/generate-ticket-capability-matrix.js` there.
 * 3. Copy the resulting `docs/rbac/ticket-capability-matrix.json` over
 *    `src/rbac/ticket-capability-matrix.json` in THIS repo (and the same
 *    file in the web repo).
 * 4. Run `node scripts/check-ticket-rbac-sync.cjs` here — it will tell you
 *    exactly what's now different and needs review.
 *
 * This is a manual-but-loud process, not a fully automatic one — the
 * backend, web, and mobile repos don't share a package/build system, so
 * there's no way to import one TypeScript module across all three without
 * a bigger restructuring (a shared internal npm package, or a monorepo).
 * If/when that restructuring happens, this file and its web equivalent
 * (`src/rbac/ticketCapabilities.ts` in the web repo) are exactly what
 * would become a single shared module instead of two hand-synced copies.
 */

// This repo's eslint config doesn't flag no-var-requires (confirmed — an
// explicit disable comment here triggered an "unused disable" warning
// instead), so this is a plain require, matching how this repo already
// reads static JSON elsewhere at runtime.
const matrix = require('./ticket-capability-matrix.json');

// NOTE: typed as `string[]`, not a narrowed role union — every call site
// does `SOME_ROLES.includes(roleKey)` against a plain `string` roleKey
// elsewhere in this app. The safety property this file provides is
// "these values match the backend," not compile-time exhaustiveness.

// Directly derived from the copied canonical matrix — these CANNOT drift
// from the backend without the JSON copy itself going stale (which the
// sync-check script catches).
export const CAN_MANAGE_WHATSAPP_GROUPS_ROLES: string[] =
  matrix.capabilities.manageWhatsappGroups.allowedRoles;
export const CAN_MANAGE_TICKET_RULES_ROLES: string[] =
  matrix.capabilities.manageTicketRules.allowedRoles;
export const CAN_VIEW_TICKETS_ROLES: string[] =
  matrix.capabilities.viewTickets.allowedRoles;
export const CAN_ASSIGN_ROLES: string[] = matrix.capabilities.assignTicket.allowedRoles;
export const CAN_REPLY_ROLES: string[] = matrix.capabilities.replyToTicket.allowedRoles;
export const CAN_CLOSE_ROLES: string[] = matrix.capabilities.closeTicket.allowedRoles;
export const CAN_CREATE_TICKET_ROLES_BACKEND: string[] =
  matrix.capabilities.createTicket.allowedRoles;

// --- Deliberately narrower than the backend gate (see reasoning below) ---

// PUT /tickets/:id/status is gated server-side only by canViewTickets
// (CAN_VIEW_TICKETS_ROLES above — broader, includes CUSTOMER). The UI
// intentionally narrows this further so a CUSTOMER never sees a status
// control, mirroring the web repo's identical CAN_CHANGE_STATUS_ROLES
// reasoning verbatim.
export const CAN_CHANGE_STATUS_ROLES: string[] = [
  'ADMIN',
  'EMPLOYEE',
  'AGENT',
  'CUSTOMER_GROUP_ADMIN',
];

// PUT /tickets/:id/priority is gated server-side by canAssignTicket — the
// same middleware as /assign — so this is just an alias, not a separate
// hand-maintained list.
export const CAN_UPDATE_PRIORITY_ROLES = CAN_ASSIGN_ROLES;

// Internal notes are agent/staff-only by product design (never
// customer-visible) — same roles as who can reply, since replying and
// leaving an internal note are both staff actions on this screen.
export const CAN_SEE_INTERNAL_NOTES_ROLES = CAN_REPLY_ROLES;

// Mobile's raise-a-ticket form is intentionally CUSTOMER-only today (see
// the mobile ticketing review report for why — no customer-picker UI
// exists anywhere in this app for ADMIN/EMPLOYEE to log a ticket on
// someone's behalf yet, even though the backend's canCreateTicket
// middleware would technically allow it). This is a strict subset of
// CAN_CREATE_TICKET_ROLES_BACKEND, never a superset.
export const CAN_RAISE_TICKET_ROLES: string[] = ['CUSTOMER'];
