/**
 * Indian financial year helpers — Apr–Mar labelling for savings cards.
 */

export function getIndianFYStartYear(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3 ? year : year - 1;
}

export function formatIndianFYLabel(fyStartYear: number): string {
  const endSuffix = String(fyStartYear + 1).slice(-2);
  return `${fyStartYear}-${endSuffix}`;
}
