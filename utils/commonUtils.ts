/** Small, dependency-free helpers shared by pages, tests and API specs. */

/** Type guard for plain JSON objects returned by APIs. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Asserts that an API payload contains every expected key.
 * Returns the missing keys so a test can assert on an empty array.
 */
export function missingKeys(payload: unknown, expectedKeys: readonly string[]): string[] {
  if (!isRecord(payload)) {
    return [...expectedKeys];
  }
  return expectedKeys.filter((key) => !(key in payload));
}

/** Collapses whitespace so UI text can be compared reliably. */
export function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Filesystem-safe slug, used for screenshot/artifact names. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
