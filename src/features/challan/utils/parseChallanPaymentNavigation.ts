/**
 * Detects challan gateway result URLs when checkout loads as a direct payment link
 * instead of injected Razorpay HTML (no postMessage hooks available).
 */

import type { ChallanPaymentEventType } from '../components/ChallanPaymentCheckoutModal';

export function parseChallanPaymentNavigation(url: string): ChallanPaymentEventType | null {
  if (!url?.trim()) return null;

  const lower = url.toLowerCase();

  if (
    /payment(success|successful)|paymentsuccess|status=success|status=captured/.test(lower)
  ) {
    return 'PAYMENT_SUCCESS';
  }

  if (
    /payment(fail|failed)|paymentfail|status=fail|status=failed/.test(lower)
  ) {
    return 'PAYMENT_FAILED';
  }

  if (
    /payment(cancel|cancelled)|paymentcancel|status=cancel/.test(lower)
  ) {
    return 'PAYMENT_CANCEL';
  }

  return null;
}

/** UPI / wallet / Android intent links must leave the WebView for native payment apps. */
export function shouldOpenPaymentExternally(url: string): boolean {
  if (!url?.trim()) return false;
  return /^(upi:|tez:|phonepe:|paytmmp:|paytm:|gpay:|bhim:|intent:|market:)/i.test(url.trim());
}
