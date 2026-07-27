/**
 * Toll plaza travel direction — ledger stores single-letter codes from FASTag reads.
 */

const TOLL_DIRECTION_LABELS: Record<string, string> = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
  NE: 'North East',
  NW: 'North West',
  SE: 'South East',
  SW: 'South West',
};

/** Expand plaza direction codes (N → North) for operator-readable detail screens. */
export function formatTollDirection(direction?: string | null): string | null {
  if (!direction?.trim()) return null;

  const trimmed = direction.trim();
  const mapped = TOLL_DIRECTION_LABELS[trimmed.toUpperCase()];
  if (mapped) return mapped;

  // Already a full name or unknown code — show as returned.
  return trimmed;
}
