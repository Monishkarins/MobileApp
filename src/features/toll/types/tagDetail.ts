/**
 * Tag detail payload — fields shown in the web Tag Details modal when viewing
 * a row from /tag/tagList.
 */

export interface TagDetailPayload {
  id: string;
  tagId: string;
  tagBarcode: string;
  tagClass: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
  vrn: string | null;
  assignedDate: string | null;
  allocatedDate: string | null;
}
