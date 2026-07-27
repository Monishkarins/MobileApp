/**
 * Normalizes gateway HTML from /echallan/paynow and injects React Native WebView
 * callbacks — same branding and setMsg hooks as web EchallanContainer.
 */

import { decodeEscapedPaymentHtml } from './challanApiNormalize';

function createPaymentMessageToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function injectRnPostMessage(type: string, paymentTokenJs: string): string {
  return `); try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: '${type}', paymentMessageToken: ${paymentTokenJs} })); } catch(e) { console.error(e); } //`;
}

/** Polls #msg — Razorpay gateway updates this via setMsg(t, err) with dynamic text. */
function injectPaymentStatusPoller(html: string, paymentTokenJs: string): string {
  const poller = `
<script>
(function () {
  var token = ${paymentTokenJs};
  var done = false;
  function notify(type) {
    if (done) return;
    done = true;
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: type,
        paymentMessageToken: token
      }));
    } catch (e) {}
  }
  function poll() {
    if (done) return;
    try {
      var el = document.getElementById('msg');
      var text = (el && el.textContent ? el.textContent : '').toLowerCase().replace(/\\s+/g, '');
      if (/payment(success|successful)|paymentsuccess|successful|captured/.test(text)) {
        return notify('PAYMENT_SUCCESS');
      }
      if (/payment(fail|failed)|paymentfail|failed|declined/.test(text)) {
        return notify('PAYMENT_FAILED');
      }
      if (/payment(cancel|cancelled)|paymentcancel|cancelled|canceled/.test(text)) {
        return notify('PAYMENT_CANCEL');
      }
    } catch (e) {}
    setTimeout(poll, 400);
  }
  poll();
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${poller}</body>`);
  }
  return `${html}${poller}`;
}

export function prepareChallanPaymentHtml(paymentUrl: string): {
  html: string;
  paymentMessageToken: string;
} {
  if (!paymentUrl?.trim()) {
    throw new Error('Payment page HTML is missing');
  }

  const paymentMessageToken = createPaymentMessageToken();
  const paymentTokenJs = JSON.stringify(paymentMessageToken);

  let cleanHtml = decodeEscapedPaymentHtml(paymentUrl);

  const logoUrl = 'https://fleet.karins.in/images/logo.png';
  cleanHtml = cleanHtml
    .replace(/Invincible ocean/gi, 'Karins')
    .replace(/image\s*:\s*"[^"]*"/gi, `image: "${logoUrl}"`);

  // Gateway setMsg strings include spaces; normalize so success/fail hooks match.
  cleanHtml = cleanHtml.replace(
    /setMsg\s*\(\s*(['"])([^'"]*)\1/gi,
    (_match, quote: string, content: string) => {
      const normalized = content.replace(/\s+/g, '');
      return `setMsg(${quote}${normalized}${quote}`;
    },
  );

  cleanHtml = cleanHtml.replace(
    /setMsg\s*\(\s*['"][^'"]*payment(success|successful)[^'"]*['"]/gi,
    `$& /* SUCCESS_INJECTED */${injectRnPostMessage('PAYMENT_SUCCESS', paymentTokenJs)}`,
  );

  cleanHtml = cleanHtml.replace(
    /setMsg\s*\(\s*['"][^'"]*payment(fail|failed)[^'"]*['"]/gi,
    `$& /* FAIL_INJECTED */${injectRnPostMessage('PAYMENT_FAILED', paymentTokenJs)}`,
  );

  cleanHtml = cleanHtml.replace(
    /setMsg\s*\(\s*['"][^'"]*payment(cancel|cancelled)[^'"]*['"]/gi,
    `$& /* CANCEL_INJECTED */${injectRnPostMessage('PAYMENT_CANCEL', paymentTokenJs)}`,
  );

  cleanHtml = injectPaymentStatusPoller(cleanHtml, paymentTokenJs);

  return { html: cleanHtml, paymentMessageToken };
}
