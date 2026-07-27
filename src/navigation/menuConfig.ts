// menuConfig.ts
// Mobile menu-mapping layer — mirrors the per-role item visibility in
// karins_fastag_react-main/src/layout/SideNav.tsx so the mobile "More" menu
// matches the web portal exactly.
//
// Key parity rules captured here:
//  • CUSTOMER has NO Claims & Verification (/claim) group — Toll Rates,
//    Toll Search, Verify Toll Rates and Double Debit are commented out of
//    customerMenuItems on the web. Customer only reaches "Claims" via the
//    Claims tab. So the VERIFICATION group below excludes CUSTOMER.
//  • Recharge appears for ADMIN, CUSTOMER, and CUSTOMER_GROUP_ADMIN
//    (guarded again at the screen level via canAccessRecharge).
//  • Challan Payment History is NOT in the VGA menu.
//  • Products / Enquiries are NOT in the VGA menu.
//
// Items that are already first-class bottom tabs (Dashboard, Vehicles, Toll,
// Claims) are not repeated here — this drives the secondary "More" surface.

import type { RoleKey } from '../types/auth';
import type { AccessMenuItem } from '../types/accessMenus';
import { MORE_MENU_PRIVILEGES } from './mobilePrivileges';
import { canAccessByPrivilege } from '../utils/hasAccess';

const ALL_ROLES: RoleKey[] = [
  'ADMIN',
  'EMPLOYEE',
  'AGENT',
  'CUSTOMER',
  'CUSTOMER_GROUP_ADMIN',
  'VEHICLE_GROUP_ADMIN',
];

/** Roles that have the full Claims & Verification (/claim) group — Toll Rates,
 *  Toll Search, Verify Toll Rates and Double Debit. Restricted to internal staff;
 *  CUSTOMER, CUSTOMER_GROUP_ADMIN and VEHICLE_GROUP_ADMIN are all excluded. */
const VERIFICATION_ROLES: RoleKey[] = [
  'ADMIN',
  'EMPLOYEE',
  'AGENT',
];

/** Roles allowed on internal/partner surfaces (Reports, FAQ). Restricted to
 *  internal staff; all customer- and group-admin roles are excluded. */
const NON_CUSTOMER_ROLES: RoleKey[] = [
  'ADMIN',
  'EMPLOYEE',
  'AGENT',
];

/** Navigation target for a menu item. A `tab` jumps across the bottom-tab
 *  navigator into a nested stack screen; otherwise the screen lives in the
 *  current (More) stack. */
export interface MenuTarget {
  tab?: 'Toll' | 'Claims' | 'Vehicles' | 'Dashboard';
  screen: string;
  params?: Record<string, unknown>;
}

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  target: MenuTarget;
  /** Roles allowed to see this item. */
  roles: RoleKey[];
}

export interface MenuSection {
  key: string;
  title: string;
  items: MenuItem[];
}

// Source of truth — declared once, then filtered per role.
const SECTIONS: MenuSection[] = [
  {
    key: 'verification',
    title: 'Claims & Verification',
    items: [
      { key: 'tollRates',    icon: '🧾', label: 'Toll Rates',        target: { tab: 'Toll', screen: 'TollSearch' },     roles: VERIFICATION_ROLES },
      { key: 'tollSearch',   icon: '🔎', label: 'Toll Search',       target: { tab: 'Toll', screen: 'TollSearch' },     roles: VERIFICATION_ROLES },
      { key: 'verifyRates',  icon: '✅', label: 'Verify Toll Rates', target: { tab: 'Toll', screen: 'TollRateVerify' }, roles: VERIFICATION_ROLES },
      { key: 'doubleDebit',  icon: '🔁', label: 'Double Debit',      target: { tab: 'Toll', screen: 'DoubleDebitList' },roles: VERIFICATION_ROLES },
    ],
  },
  {
    key: 'fastag',
    title: 'FASTag & Wallet',
    items: [
      { key: 'wallet',       icon: '💳', label: 'Wallet',        target: { screen: 'WalletHome' },  roles: ['ADMIN', 'EMPLOYEE', 'AGENT', 'CUSTOMER', 'CUSTOMER_GROUP_ADMIN'] },
      // Recharge — ADMIN, CUSTOMER, CUSTOMER_GROUP_ADMIN (guarded again at the screen).
      { key: 'recharge',     icon: '🔄', label: 'Recharge',      target: { screen: 'Recharge' }, roles: ['ADMIN', 'CUSTOMER', 'CUSTOMER_GROUP_ADMIN'] },
      { key: 'tagInventory', icon: '🏷', label: 'Tag Inventory', target: { screen: 'TagInventory' }, roles: ALL_ROLES },
      // Reports live with wallet/tag tools so operators find FASTag analytics in one place.
      { key: 'reports',      icon: '📊', label: 'Fastag Reports', target: { screen: 'Reports' }, roles: ALL_ROLES },
    ],
  },
  {
    key: 'echallan',
    title: 'e-Challan',
    items: [
      { key: 'challans', icon: '⚠️', label: 'e-Challan', target: { screen: 'ChallanList' }, roles: ALL_ROLES },
      // Payment History — not available to VGA.
      { key: 'challanHistory', icon: '🧾', label: 'Payment History', target: { screen: 'PaymentHistory' }, roles: ['ADMIN', 'EMPLOYEE', 'AGENT', 'CUSTOMER', 'CUSTOMER_GROUP_ADMIN'] },
    ],
  },
  {
    key: 'compliance',
    title: 'Compliance',
    items: [
      { key: 'rc', icon: '🚗', label: 'VAHAN RC', target: { screen: 'RCList' }, roles: ALL_ROLES },
      { key: 'dl', icon: '🪪', label: 'SARATHI DL', target: { screen: 'DLList' }, roles: ALL_ROLES },
    ],
  },
  {
    key: 'more',
    title: 'Products',
    items: [
      { key: 'products', icon: '🛍', label: 'Products', target: { screen: 'Products' }, roles: ['ADMIN', 'EMPLOYEE', 'AGENT'] },
    ],
  },
  {
    key: 'account',
    title: 'Account',
    items: [
      { key: 'profile',       icon: '👤', label: 'Profile',       target: { screen: 'Profile' },       roles: ALL_ROLES },
      { key: 'faq',           icon: '❓', label: 'FAQ',           target: { screen: 'FAQ' },           roles: NON_CUSTOMER_ROLES },
      { key: 'notifications', icon: '🔔', label: 'Notifications', target: { screen: 'Notifications' }, roles: ALL_ROLES },
    ],
  },
];

/** Returns the More-menu sections visible to a given role, with empty
 *  sections dropped. Falls back to the customer menu when role is unknown,
 *  matching SideNav.tsx's default branch.
 *
 * When `privilegesLoaded` is true, items mapped in MORE_MENU_PRIVILEGES are
 * also filtered by web Role Management access menus (accessMenusPortal). */
export function getMoreMenu(
  roleKey?: RoleKey,
  accessMenus?: AccessMenuItem[] | null,
  privilegesLoaded = false,
): MenuSection[] {
  const role: RoleKey = roleKey ?? 'CUSTOMER';
  return SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles.includes(role)) return false;
      // Intersect role template with portal privilege IDs when available.
      return canAccessByPrivilege(
        accessMenus,
        privilegesLoaded,
        MORE_MENU_PRIVILEGES[item.key],
      );
    }),
  })).filter((section) => section.items.length > 0);
}
