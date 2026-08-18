import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Environment resolution order (first value wins — dotenv never overwrites an
 * already-defined variable):
 *   1. real process environment / CI secrets
 *   2. config/<TEST_ENV>.local.env   (gitignored — local secrets)
 *   3. config/<TEST_ENV>.env         (gitignored — per-env, non-secret defaults)
 *
 * Switch environment without touching any test code:  TEST_ENV=staging npm test
 */
const TEST_ENV = process.env.TEST_ENV ?? 'development';

dotenv.config({ path: path.join(__dirname, 'config', `${TEST_ENV}.local.env`), quiet: true });
dotenv.config({ path: path.join(__dirname, 'config', `${TEST_ENV}.env`), quiet: true });

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['html', { outputFolder: 'reports/html', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.STORE_BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
