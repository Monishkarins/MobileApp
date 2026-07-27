/**
 * Parses the web recharge return URL from POST /transaction/recharge/status:
 * `${FRONTEND_URL}/transaction/recharge/?orderId=...&rechargeStatus=...`
 *
 * App WebView intercepts this URL — backend /status handler is unchanged.
 */

import type { RechargeStartedPayload } from '../types/rechargeTypes';

export function isRechargeReturnUrl(url: string): boolean {
  if (!url || !/[?&]orderId=/i.test(url)) return false;
  return /\/transaction\/recharge\/?(\?|#|$)/i.test(url);
}

function extractRechargeQueryParams(url: string): RechargeStartedPayload | null {
  try {
    const parsed = new URL(url);
    const orderId = parsed.searchParams.get('orderId');
    if (!orderId) return null;

    const amount = parsed.searchParams.get('amount');
    const rechargeStatus = parsed.searchParams.get('rechargeStatus');
    const message = parsed.searchParams.get('message');
    const paymentMode = parsed.searchParams.get('paymentMode');

    return {
      transactionId: orderId,
      ...(amount ? { amount } : {}),
      ...(rechargeStatus ? { rechargeStatus } : {}),
      ...(message ? { message } : {}),
      ...(paymentMode ? { paymentMode } : {}),
    };
  } catch {
    const orderMatch = url.match(/[?&]orderId=([^&]+)/i);
    if (!orderMatch) return null;

    const pick = (key: string) => url.match(new RegExp(`[?&]${key}=([^&]*)`, 'i'))?.[1];

    return {
      transactionId: decodeURIComponent(orderMatch[1]),
      ...(pick('amount') ? { amount: decodeURIComponent(pick('amount')!) } : {}),
      ...(pick('rechargeStatus') ? { rechargeStatus: decodeURIComponent(pick('rechargeStatus')!) } : {}),
      ...(pick('message') ? { message: decodeURIComponent(pick('message')!) } : {}),
      ...(pick('paymentMode') ? { paymentMode: decodeURIComponent(pick('paymentMode')!) } : {}),
    };
  }
}

export function parseRechargeReturnUrl(url: string): RechargeStartedPayload | null {
  if (!isRechargeReturnUrl(url)) return null;
  return extractRechargeQueryParams(url);
}
