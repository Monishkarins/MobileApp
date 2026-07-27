/**
 * Tag inventory filter options — mirrors web TagInventoryHeader status dropdown.
 */

export interface TagStatusOption {
  value: string;
  label: string;
  adminOnly?: boolean;
}

export const TAG_STATUS_OPTIONS: TagStatusOption[] = [
  { value: 'assigned', label: 'ASSIGNED' },
  { value: 'allocated', label: 'ALLOCATED' },
  { value: 'allocated_closed', label: 'ALLOCATED - CLOSED' },
  { value: 'unassigned', label: 'UNASSIGNED', adminOnly: true },
  { value: 'unknown', label: 'UNKNOWN', adminOnly: true },
  { value: 'assigned_missing', label: 'ASSIGNED - MISSING', adminOnly: true },
  { value: 'assigned_closed', label: 'ASSIGNED - CLOSED', adminOnly: true },
  { value: 'assigned_closed_refund', label: 'ASSIGNED - CLOSED -REFUND', adminOnly: true },
  { value: 'assigned_missing_refund', label: 'ASSIGNED - MISSING - REFUND', adminOnly: true },
];

export interface TagInventoryFilters {
  tagId: string;
  tagBarcode: string;
  tagClass: string;
  vrn: string;
  status: string;
}

export const EMPTY_TAG_FILTERS: TagInventoryFilters = {
  tagId: '',
  tagBarcode: '',
  tagClass: '',
  vrn: '',
  status: '',
};
