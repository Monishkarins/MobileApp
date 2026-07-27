import {
  getLandingRoute,
  canAccessRecharge,
  hidesRechargeCustomerPicker,
  requiresContextSelection,
  isCustomerGroupAdmin,
  requiresAdminContextPicker,
} from '../types/auth';

describe('role landing routes', () => {
  it('VGA lands on Feature Products (/home)', () => {
    expect(getLandingRoute('VEHICLE_GROUP_ADMIN')).toBe('FEATURE_PRODUCTS');
  });
  it('CUSTOMER and CG_ADMIN land on the fleet dashboard', () => {
    expect(getLandingRoute('CUSTOMER')).toBe('FLEET_DASHBOARD');
    expect(getLandingRoute('CUSTOMER_GROUP_ADMIN')).toBe('FLEET_DASHBOARD');
  });
  it('ADMIN/EMPLOYEE/AGENT land on the admin dashboard', () => {
    for (const r of ['ADMIN', 'EMPLOYEE', 'AGENT'] as const) {
      expect(getLandingRoute(r)).toBe('ADMIN_DASHBOARD');
    }
  });
});

describe('recharge guard', () => {
  it('allows ADMIN, CUSTOMER, and CUSTOMER_GROUP_ADMIN', () => {
    expect(canAccessRecharge('ADMIN')).toBe(true);
    expect(canAccessRecharge('CUSTOMER')).toBe(true);
    expect(canAccessRecharge('CUSTOMER_GROUP_ADMIN')).toBe(true);
    for (const r of ['EMPLOYEE', 'AGENT', 'VEHICLE_GROUP_ADMIN'] as const) {
      expect(canAccessRecharge(r)).toBe(false);
    }
  });

  // Web Pay Here: CGA uses header-switched customer — no in-modal picker.
  it('hides recharge customer picker for CUSTOMER and CUSTOMER_GROUP_ADMIN', () => {
    expect(hidesRechargeCustomerPicker('CUSTOMER')).toBe(true);
    expect(hidesRechargeCustomerPicker('CUSTOMER_GROUP_ADMIN')).toBe(true);
    expect(hidesRechargeCustomerPicker('ADMIN')).toBe(false);
    expect(hidesRechargeCustomerPicker('EMPLOYEE')).toBe(false);
  });
});

describe('context selection', () => {
  it('is required for multi-customer roles', () => {
    expect(requiresContextSelection('CUSTOMER_GROUP_ADMIN')).toBe(true);
    expect(requiresContextSelection('CUSTOMER')).toBe(false);
  });

  it('splits admin picker from customer-group-admin global switcher', () => {
    expect(requiresAdminContextPicker('ADMIN')).toBe(true);
    expect(requiresAdminContextPicker('CUSTOMER_GROUP_ADMIN')).toBe(false);
    expect(isCustomerGroupAdmin('CUSTOMER_GROUP_ADMIN')).toBe(true);
  });
});
