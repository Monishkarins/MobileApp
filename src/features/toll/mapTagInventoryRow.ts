/**
 * Maps a raw /tag/tagList row into list + detail shapes for Tag Inventory.
 */

import type { TagInventoryRow } from '../../services/api/tollApi';
import type { TagDetailPayload } from './types/tagDetail';

export interface TagListItem {
  id: string;
  tagSerial: string;
  vehicleNo: string | null;
  tagClass: string;
  status: string;
  assignedDate: string | null;
  detail: TagDetailPayload;
}

export function mapTagInventoryRow(row: TagInventoryRow): TagListItem {
  const tagId = row.tagId ?? String(row.id ?? '');
  const tagBarcode = row.tagBarcode ?? tagId;

  const detail: TagDetailPayload = {
    id: String(row.id ?? tagId),
    tagId,
    tagBarcode,
    tagClass: row.tagClass ?? '—',
    status: row.status ?? '—',
    customerId: row.customerYapEntityId ?? row.mobileNumber ?? null,
    customerName: row.customerName ?? row.name ?? null,
    vrn: row.vrn ?? null,
    assignedDate: row.assignedDate ?? null,
    allocatedDate: row.allocatedDate ?? null,
  };

  return {
    id: detail.id,
    tagSerial: tagBarcode,
    vehicleNo: detail.vrn,
    tagClass: detail.tagClass,
    status: detail.status,
    assignedDate: detail.assignedDate,
    detail,
  };
}
