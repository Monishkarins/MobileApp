/**
 * DA claims filter form shape — shared by list screen and filter panel.
 */

export interface ClaimFilters {
  customerId: string;
  customerName: string;
  vehicleNo: string;
  tollName: string;
  m2pTollId: string;
  rrn: string;
  claimStatus: string;
  claimType: string;
  exitType: string;
  claimLevel: string;
  dateFilterType: string;
  fromDateTime: string;
  toDateTime: string;
}
