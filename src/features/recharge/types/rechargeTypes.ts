export interface RechargeStartedPayload {
  transactionId: string;
  amount?: string | number;
  rechargeStatus?: string;
  message?: string;
  paymentMode?: string;
}
