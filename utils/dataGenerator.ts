import { randomUUID } from 'node:crypto';

/**
 * Generators for data that must be unique per run.
 * Never hard-code unique values (emails, phone numbers) inside a test.
 */

/** Short, collision-resistant suffix usable inside identifiers. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;
}

/** Unique, non-routable e-mail address (RFC 2606 reserved domain). */
export function uniqueEmail(prefix = 'qa'): string {
  return `${prefix}.${uniqueSuffix()}@example.com`;
}

/** Unique display name, e.g. `QA Bot 1x2y3z`. */
export function uniqueName(prefix = 'QA Bot'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

/** Random integer in the inclusive range [min, max]. */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('randomInt requires integer bounds');
  }
  if (min > max) {
    throw new Error(`randomInt: min (${String(min)}) must be <= max (${String(max)})`);
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Deterministic string of a given length — for boundary-value tests. */
export function stringOfLength(length: number, char = 'a'): string {
  if (length < 0) {
    throw new Error('stringOfLength requires a non-negative length');
  }
  return char.repeat(length);
}
