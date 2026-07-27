import type { CustomerProfileRow, WalletBankDetails } from '../../../services/api/profileApi';

export interface WalletDetailField {
  label: string;
  value: string;
  upiUrl?: string;
}

export interface CustomerProfileView {
  firstName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  defaultBank: string;
  autoFundThreshold: string;
  lowBalanceThreshold: string;
  fastagYesBank: WalletDetailField[];
  fastagIdfc: WalletDetailField[];
  corporateYesBank: WalletDetailField[];
  corporateIdfc: WalletDetailField[];
}

function mapWalletFields(details?: WalletBankDetails): WalletDetailField[] {
  return [
    {
      label: 'AccName',
      value: details?.accountName ?? '',
      upiUrl: details?.upiUrl,
    },
    { label: 'AccNo', value: details?.accountNumber ?? '' },
    { label: 'IFSC', value: details?.ifsc ?? '' },
    { label: 'UPI ID', value: details?.upi ?? '' },
  ];
}

export function mapCustomerProfileRow(data: CustomerProfileRow): CustomerProfileView {
  return {
    firstName: data.firstName ?? '',
    email: data.user?.emailId ?? '',
    phone: data.user?.mobileNumber?.toString() ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    pincode: data.pincode ?? '',
    defaultBank: data.bankId === 2 ? 'YES Bank' : 'IDFC Bank',
    autoFundThreshold: data.fundTransferThreshold?.toString() ?? '',
    lowBalanceThreshold: data.minimumBalance?.toString() ?? '',
    fastagYesBank: mapWalletFields(data.walletDetails),
    fastagIdfc: mapWalletFields(data.idfcWalletDetails),
    corporateYesBank: mapWalletFields(data.corporateWalletDetails),
    corporateIdfc: mapWalletFields(data.idfcCorporateWalletDetails),
  };
}

export function hasWalletValues(fields: WalletDetailField[]): boolean {
  return fields.some((f) => f.value.trim().length > 0);
}
