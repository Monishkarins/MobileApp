/**
 * Wallet type display helpers — backend/YAP codes (e.g. businessCW) are mapped to
 * operator-friendly labels used across Wallet, recharge, and report screens.
 */

const CORPORATE_CODES = new Set([
  '2',
  'CORPORATE',
  'CORP',
  'BUSINESSCW',
  'BUSINESS_CW',
  'BUSINESS CW',
]);

const FASTAG_CODES = new Set(['1', 'FASTAG', 'FAST_TAG', 'FAST TAG']);

function normalizeWalletTypeCode(value?: string | number | null): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

/** Human label for a wallet bucket — businessCW and legacy codes resolve to Corporate. */
export function formatWalletTypeLabel(value?: string | number | null): string {
  if (value == null || value === '') return '—';

  const code = normalizeWalletTypeCode(value);
  if (!code) return '—';

  if (CORPORATE_CODES.has(code) || code.includes('BUSINESSCW')) return 'Corporate';
  if (FASTAG_CODES.has(code)) return 'FASTag';

  // Preserve unknown backend codes with light formatting rather than raw camelCase.
  return String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}
