import { Locator, Page, expect } from '@playwright/test';
import { Toast } from '../components/Toast';
import { storeBaseUrl } from '../utils/env';
import { BasePage } from './BasePage';

/** Page Object for the shopping cart screen. Locators + actions only — no test logic. */
export class CartPage extends BasePage {
  readonly toast: Toast;
  readonly title: Locator;
  readonly summarySubtotal: Locator;
  readonly summaryShipping: Locator;
  readonly summaryTotal: Locator;
  readonly checkoutButton: Locator;
  readonly emptyStateHeading: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    super(page, `${storeBaseUrl()}/cart`);
    this.toast = new Toast(page);
    // Locator priority: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > CSS.
    this.emptyStateHeading = page.getByRole('heading', { name: 'Your cart is empty' });
    this.title = page.getByTestId('cart-title');
    this.summarySubtotal = page.getByTestId('cart-order-summary-subtotal-value');
    this.summaryShipping = page.getByTestId('cart-order-summary-shipping-value');
    this.summaryTotal = page.getByTestId('cart-order-summary-total-value');
    this.checkoutButton = page.getByTestId('cart-checkout-button');
    // CSS is the last resort but unavoidable here: the cart is a div grid (no
    // table roles) and exposes no per-row testid. One `.grid-cols-12` per line item.
    this.rows = page.locator('div.grid-cols-12');
  }

  /** The cart line of `productName`. */
  row(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  /** Unit price cell of `productName`. */
  price(productName: string): Locator {
    return this.row(productName).getByTestId('cart-price');
  }

  /** Quantity cell of `productName`. */
  quantity(productName: string): Locator {
    return this.row(productName).getByTestId('cart-quantity');
  }

  /** Row subtotal cell of `productName` (unit price × quantity). */
  subtotal(productName: string): Locator {
    return this.row(productName).getByTestId('cart-subtotal');
  }

  /** `-` button of `productName` (disabled by the app while quantity is 1). */
  decrementButton(productName: string): Locator {
    return this.row(productName).getByTestId('cart-decrement-button');
  }

  /** `+` button of `productName`. */
  incrementButton(productName: string): Locator {
    return this.row(productName).getByTestId('cart-increment-button');
  }

  /** Trash icon of `productName` (icon only, no accessible name). */
  removeButton(productName: string): Locator {
    return this.row(productName).getByTestId('cart-delete-button');
  }

  /** Increases the quantity of `productName` by one. */
  async increaseQuantity(productName: string): Promise<void> {
    await this.incrementButton(productName).click();
  }

  /** Decreases the quantity of `productName` by one. */
  async decreaseQuantity(productName: string): Promise<void> {
    await this.decrementButton(productName).click();
  }

  /**
   * Sets the quantity of `productName` to `targetQuantity` by repeatedly clicking
   * +/-, since the app renders quantity as text with no editable input field.
   * Waits for each click's UI update before the next, so the run stays in sync
   * even if the app debounces the subtotal recalculation.
   */
  async setQuantity(productName: string, targetQuantity: number): Promise<void> {
    if (targetQuantity < 1) {
      throw new Error(`setQuantity: targetQuantity must be >= 1, got ${targetQuantity}`);
    }
    let current = Number(await this.quantity(productName).innerText());
    while (current !== targetQuantity) {
      if (current < targetQuantity) {
        await this.increaseQuantity(productName);
        current += 1;
      } else {
        await this.decreaseQuantity(productName);
        current -= 1;
      }
      await expect(this.quantity(productName)).toHaveText(String(current));
    }
  }

  /** Removes `productName` from the cart. */
  async removeItem(productName: string): Promise<void> {
    await this.removeButton(productName).click();
  }

  /** Asserts `productName` has exactly one line in the cart. */
  async expectContains(productName: string): Promise<void> {
    await expect(this.row(productName)).toHaveCount(1);
    await expect(this.row(productName)).toBeVisible();
  }

  /** Asserts `productName` is not in the cart. */
  async expectNotContains(productName: string): Promise<void> {
    await expect(this.row(productName)).toHaveCount(0);
  }

  /** Asserts the displayed quantity of `productName`. */
  async expectQuantity(productName: string, quantity: number): Promise<void> {
    await expect(this.quantity(productName)).toHaveText(String(quantity));
  }

  /** Asserts the unit price of `productName` (amount in USD). */
  async expectUnitPrice(productName: string, amount: number): Promise<void> {
    await expect(this.price(productName)).toHaveText(formatUsd(amount));
  }

  /** Asserts the row subtotal of `productName` (amount in USD). */
  async expectRowSubtotal(productName: string, amount: number): Promise<void> {
    await expect(this.subtotal(productName)).toHaveText(formatUsd(amount));
  }

  /** Asserts the order-summary subtotal and total (shipping is free on this store). */
  async expectOrderSummary(amount: number): Promise<void> {
    await expect(this.summarySubtotal).toHaveText(formatUsd(amount));
    await expect(this.summaryTotal).toHaveText(formatUsd(amount));
  }

  /**
   * Asserts `productName`'s quantity, row subtotal (unitPrice × quantity), and the
   * order summary all agree — the standard set of checks after setQuantity/increaseQuantity/
   * decreaseQuantity change the cart state.
   */
  async expectQuantityAndTotals(
    productName: string,
    quantity: number,
    unitPrice: number
  ): Promise<void> {
    await this.expectQuantity(productName, quantity);
    await this.expectRowSubtotal(productName, unitPrice * quantity);
    await this.expectOrderSummary(unitPrice * quantity);
  }

  /**
   * Sets `productName`'s quantity to `targetQuantity` and asserts quantity, row
   * subtotal, and order summary all agree — so the target quantity is written once
   * instead of once per call.
   */
  async setQuantityAndVerify(
    productName: string,
    targetQuantity: number,
    unitPrice: number
  ): Promise<void> {
    await this.setQuantity(productName, targetQuantity);
    await this.expectQuantityAndTotals(productName, targetQuantity, unitPrice);
  }

  /** Asserts the empty-state message is shown and no line items are rendered. */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateHeading).toBeVisible();
    await expect(this.rows).toHaveCount(0);
  }

  /** Asserts a toast containing `message` is shown. */
  async expectToast(message: string | RegExp): Promise<void> {
    await this.toast.expectMessage(message);
  }
}

/** Renders an amount the way the store does, e.g. `1560` → `$1,560`. */
function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}
