import { Page, expect } from '@playwright/test';

/**
 * Shared behaviour for every Page Object: navigation and URL assertions.
 * Subclasses own their locators; no test-case logic lives here.
 */
export abstract class BasePage {
  protected constructor(
    readonly page: Page,
    /** Path relative to `baseURL`, e.g. `/login`. */
    protected readonly path: string,
  ) {}

  /** Navigates to the page's own path (resolved against `baseURL`). */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** Asserts the browser is currently on this page. */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${escapeRegExp(this.path)}/?$`));
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
