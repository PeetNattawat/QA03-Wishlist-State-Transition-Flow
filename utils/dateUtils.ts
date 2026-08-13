/** Date helpers. All formatting is ISO-based to stay locale independent. */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Formats a date as `YYYY-MM-DD`. */
export function toIsoDate(date: Date = new Date()): string {
  const iso = date.toISOString().split('T')[0];
  if (iso === undefined) {
    throw new Error('Unable to format date');
  }
  return iso;
}

/** Returns a new date shifted by `days` (negative shifts into the past). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** `YYYY-MM-DD` for today. */
export function today(): string {
  return toIsoDate();
}

/** Whole days between two dates (b - a), truncated. */
export function daysBetween(a: Date, b: Date): number {
  return Math.trunc((b.getTime() - a.getTime()) / MS_PER_DAY);
}
