/**
 * Shared helpers for customer scope pickers — normalizes /user/associated-customers
 * payloads from both admin and customer-group-admin roles.
 */

export interface CustomerOption {
  customerId: number;
  customerName: string;
  mobileNumber?: number | string;
}

/** BDM account label — must not appear as a selectable fleet customer. */
const CUSTOMER_GROUP_ADMIN_LABEL = /customer\s*group\s*admin/i;

export function isCustomerGroupAdminLabel(name: string): boolean {
  return CUSTOMER_GROUP_ADMIN_LABEL.test(name.trim());
}

/**
 * Drop the group-admin's own row from associated-customers so the picker only
 * lists real fleet customers (web header parity).
 */
export function filterAssociatedCustomers(
  list: CustomerOption[],
  options?: { excludeUserId?: number },
): CustomerOption[] {
  return list.filter((row) => {
    if (!Number.isFinite(row.customerId) || !row.customerName.trim()) return false;
    if (options?.excludeUserId != null && row.customerId === options.excludeUserId) {
      return false;
    }
    if (isCustomerGroupAdminLabel(row.customerName)) return false;
    return true;
  });
}

export function resolveDefaultCustomerOption(
  list: CustomerOption[],
  defaultCustomerId?: number | null,
  cachedCustomerId?: number | null,
): CustomerOption | undefined {
  if (cachedCustomerId != null) {
    const fromCache = list.find((c) => c.customerId === cachedCustomerId);
    if (fromCache) return fromCache;
  }
  if (defaultCustomerId != null) {
    const fromDefault = list.find((c) => c.customerId === defaultCustomerId);
    if (fromDefault) return fromDefault;
  }
  if (list.length === 1) return list[0];
  return undefined;
}

export function formatCustomerLabel(option: CustomerOption): string {
  if (option.mobileNumber != null && option.mobileNumber !== '') {
    return `${option.customerName || 'No Name'}-${option.mobileNumber}`;
  }
  return option.customerName;
}

export function normalizeCustomers(payload: unknown): CustomerOption[] {
  if (Array.isArray(payload)) {
    return payload
      .map((row: any) => {
        const nested = row.customer ?? row;
        return {
          customerId: Number(
            nested.customerId ?? nested.id ?? row.customerId ?? row.id,
          ),
          customerName: String(
            nested.customerName ?? nested.firstName ?? nested.name ??
            row.customerName ?? row.firstName ?? row.name ?? '',
          ).trim(),
          mobileNumber:
            nested.mobileNumber ?? row.mobileNumber ?? undefined,
        };
      })
      .filter((row) => Number.isFinite(row.customerId) && row.customerName);
  }

  const rows =
    (payload as any)?.rows ??
    (payload as any)?.result ??
    (payload as any)?.data ??
    (payload as any)?.associatedCustomers ??
    [];
  return normalizeCustomers(rows);
}
