/**
 * SARATHI driver name — prefers bioFullName from the licence payload, then composes
 * first/middle/last, then falls back to the list-row driverName.
 */

import type { DLDetailPayload } from '../types/dlDetail';

/** SARATHI list rows often store a masked driverName (e.g. "D****"); skip those for display. */
function isMaskedDriverName(name?: string | null): boolean {
  if (!name?.trim()) return false;
  const trimmed = name.trim();
  if (trimmed.includes('*')) return true;
  return /^[a-zA-Z]\.+\.?$/.test(trimmed);
}

export function resolveDriverFullName(
  detail?: DLDetailPayload | null,
  fallbackName?: string | null,
  registeredFirstName?: string | null,
): string {
  const personal = detail?.personalDetails;

  const composed = [
    personal?.bioFirstName,
    personal?.bioMiddleName,
    personal?.bioLastName,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  const candidates = [
    personal?.bioFullName,
    composed,
    registeredFirstName,
    fallbackName,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !isMaskedDriverName(trimmed)) return trimmed;
  }

  return candidates.map((c) => c?.trim()).find(Boolean) ?? '';
}
