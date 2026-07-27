import { decodeEscapedPaymentHtml, shouldBlockPayNowCheckout } from '../challanApiNormalize';

describe('decodeEscapedPaymentHtml', () => {
  it('unwraps quoted Razorpay HTML from /echallan/paynow', () => {
    const raw = '"<!doctype html>\\n<html lang=\\"en\\"><head>\\n<script src=\\"https://checkout.razorpay.com/v1/checkout.js\\"></script>';

    const decoded = decodeEscapedPaymentHtml(raw);

    expect(decoded.toLowerCase().startsWith('<!doctype html>')).toBe(true);
    expect(decoded).toContain('checkout.razorpay.com/v1/checkout.js');
    expect(decoded).not.toMatch(/^["']/);
  });

  it('is idempotent on already-decoded HTML', () => {
    const html = '<!doctype html><html><script src="https://checkout.razorpay.com/v1/checkout.js"></script>';
    expect(decodeEscapedPaymentHtml(html)).toBe(html);
  });
});

describe('shouldBlockPayNowCheckout', () => {
  it('does not block when paymentUrl is present (web parity)', () => {
    expect(shouldBlockPayNowCheckout('<html>', 'paid')).toBe(false);
  });

  it('blocks only when paid and no payment page', () => {
    expect(shouldBlockPayNowCheckout('', 'paid')).toBe(true);
    expect(shouldBlockPayNowCheckout('', 'unpaid')).toBe(false);
  });
});
