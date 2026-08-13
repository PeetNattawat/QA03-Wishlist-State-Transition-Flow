/**
 * Environment access helpers.
 *
 * Every URL / credential / token used by the suite MUST come from the
 * environment (config/<TEST_ENV>.env, config/<TEST_ENV>.local.env, or CI secrets).
 * Nothing in this repository is allowed to hard-code a real value.
 */

/** Loads a required environment variable, failing loudly when it is missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Set it in config/<TEST_ENV>.env, config/<TEST_ENV>.local.env, or as a CI secret. ` +
        `See .env.example for the full list.`,
    );
  }
  return value;
}

/** Loads an optional environment variable, returning undefined when unset/blank. */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
}

/** Base URL of the store demo front-end used by the wishlist/cart suite. */
export function storeBaseUrl(): string {
  return requireEnv('STORE_BASE_URL');
}
