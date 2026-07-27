import { getMoreMenu } from '../navigation/menuConfig';
import type { RoleKey } from '../types/auth';

const labels = (role: RoleKey) =>
  getMoreMenu(role).flatMap((s) => s.items.map((i) => i.label));

describe('role-aware More menu (SideNav.tsx parity)', () => {
  it('CUSTOMER has no Claims & Verification group', () => {
    const l = labels('CUSTOMER');
    for (const item of ['Toll Rates', 'Toll Search', 'Verify Toll Rates', 'Double Debit']) {
      expect(l).not.toContain(item);
    }
  });

  it('only internal staff roles keep the verification group', () => {
    for (const role of ['ADMIN', 'EMPLOYEE', 'AGENT'] as RoleKey[]) {
      expect(labels(role)).toContain('Double Debit');
    }

    for (const role of ['CUSTOMER', 'CUSTOMER_GROUP_ADMIN', 'VEHICLE_GROUP_ADMIN'] as RoleKey[]) {
      expect(labels(role)).not.toContain('Double Debit');
    }
  });

  it('Recharge tile is shown for ADMIN, CUSTOMER, and CUSTOMER_GROUP_ADMIN', () => {
    expect(labels('ADMIN')).toContain('Recharge');
    expect(labels('CUSTOMER')).toContain('Recharge');
    expect(labels('CUSTOMER_GROUP_ADMIN')).toContain('Recharge');
    for (const role of ['VEHICLE_GROUP_ADMIN', 'EMPLOYEE', 'AGENT'] as RoleKey[]) {
      expect(labels(role)).not.toContain('Recharge');
    }
  });

  it('VGA menu excludes Payment History and Products', () => {
    const l = labels('VEHICLE_GROUP_ADMIN');
    expect(l).not.toContain('Payment History');
    expect(l).not.toContain('Products');
  });

  it('no empty sections are returned', () => {
    for (const role of ['ADMIN', 'CUSTOMER', 'VEHICLE_GROUP_ADMIN'] as RoleKey[]) {
      for (const section of getMoreMenu(role)) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});
