/**
 * Normalizes challan pay/status API fields — web sends trimmed uppercase vehicle numbers.
 */

export function normalizeChallanVehicleNo(vehicleNo: string): string {
  return String(vehicleNo ?? '').trim().toUpperCase();
}

export function normalizeChallanNo(challanNo: string): string {
  return String(challanNo ?? '').trim();
}

/**
 * Gateway paymentUrl often arrives JSON-escaped — e.g. `"<!doctype html>\\n..."`.
 * Peel quotes and expand \\n, \\" sequences before WebView load (web does the same).
 */
export function decodeEscapedPaymentHtml(raw: string): string {
  let value = String(raw ?? '').trim();
  if (!value) return '';

  for (let i = 0; i < 3; i++) {
    const unwrapped = value.replace(/^["']+|["']+$/g, '').trim();
    if (unwrapped === value) break;
    value = unwrapped;
  }

  for (let i = 0; i < 4; i++) {
    const next = value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
    if (next === value) break;
    value = next;
  }

  return value.replace(/^["']+|["']+$/g, '').trim();
}

interface RawPayNowResponse {
  paymentUrl?: string;
  payment_url?: string;
  paymentLink?: string;
  payment_link?: string;
  url?: string;
  html?: string;
  requestId?: string;
  request_id?: string;
  amountDetails?: { details?: Array<{ status?: string }> };
  amountDetail?: { details?: Array<{ status?: string }> };
  data?: RawPayNowResponse;
  result?: RawPayNowResponse;
}

function unwrapPayNowBody(data: unknown): RawPayNowResponse {
  if (!data || typeof data !== 'object') return {};
  const body = data as RawPayNowResponse;

  const nested =
    body.data && typeof body.data === 'object'
      ? body.data
      : body.result && typeof body.result === 'object'
        ? body.result
        : null;

  if (!nested) return body;

  // Keep top-level paynow fields when the gateway nests the payload under data/result.
  return {
    ...nested,
    paymentUrl: nested.paymentUrl ?? body.paymentUrl,
    payment_url: nested.payment_url ?? body.payment_url,
    paymentLink: nested.paymentLink ?? body.paymentLink,
    payment_link: nested.payment_link ?? body.payment_link,
    url: nested.url ?? body.url,
    html: nested.html ?? body.html,
    requestId: nested.requestId ?? body.requestId,
    request_id: nested.request_id ?? body.request_id,
    amountDetail: nested.amountDetail ?? body.amountDetail,
    amountDetails: nested.amountDetails ?? body.amountDetails,
  };
}

export function parsePayNowResponse(data: unknown) {
  const body = unwrapPayNowBody(data);

  const paymentUrl = (
    body.paymentUrl
    ?? body.payment_url
    ?? body.paymentLink
    ?? body.payment_link
    ?? body.url
    ?? body.html
    ?? ''
  ).trim();

  const requestId = String(body.requestId ?? body.request_id ?? '').trim();

  // External gateway field is amountDetail (singular). Web reads amountDetails
  // (typo) so it never blocks; prefer amountDetail here for accurate logging only.
  const initialChallanStatus =
    body.amountDetail?.details?.[0]?.status?.toLowerCase()
    ?? body.amountDetails?.details?.[0]?.status?.toLowerCase();

  return { paymentUrl, requestId, initialChallanStatus };
}

/** Block checkout only when the gateway sent no page and marks the challan settled. */
export function shouldBlockPayNowCheckout(
  paymentUrl: string,
  initialChallanStatus?: string,
): boolean {
  if (paymentUrl.trim()) return false;
  return String(initialChallanStatus ?? '').trim().toLowerCase() === 'paid';
}
