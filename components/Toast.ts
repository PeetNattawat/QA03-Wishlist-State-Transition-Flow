import { Locator, Page, expect } from '@playwright/test';

/**
 * Global toast area shared by every store screen (Ant Design `message`).
 * Several toasts can be stacked at once, so assertions always filter by text
 * instead of assuming a single element.
 */
export class Toast {
  readonly messages: Locator;

  constructor(page: Page) {
    // Locator priority: getByRole first — Ant Design renders each toast as role="status".
    this.messages = page.getByRole('status');
  }

  /** Asserts a toast containing `text` is currently shown. */
  async expectMessage(text: string | RegExp): Promise<void> {
    await expect(this.messages.filter({ hasText: text }).first()).toBeVisible();
  }
}
