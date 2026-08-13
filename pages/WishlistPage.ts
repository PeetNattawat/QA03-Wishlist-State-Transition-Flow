import { Locator, Page, expect } from '@playwright/test';
import { Toast } from '../components/Toast';
import { storeBaseUrl } from '../utils/env';
import { BasePage } from './BasePage';

/** Page Object for the wishlist screen. Locators + actions only — no test logic. */
export class WishlistPage extends BasePage {
  readonly toast: Toast;
  readonly title: Locator;
  readonly itemCount: Locator;
  readonly productNames: Locator;
  readonly emptyStateHeading: Locator;
  readonly shopNowButton: Locator;
  readonly viewCartButton: Locator;
  readonly headerWishlistCount: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    super(page, `${storeBaseUrl()}/wishlist`);
    this.toast = new Toast(page);
    // Locator priority: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > CSS.
    this.emptyStateHeading = page.getByRole('heading', { name: 'Your wishlist is empty' });
    this.shopNowButton = page.getByRole('button', { name: 'Shop Now' });
    this.title = page.getByTestId('wishlist-title');
    this.itemCount = page.getByTestId('wishlist-item-count');
    this.productNames = page.getByTestId('wishlist-product-name');
    this.viewCartButton = page.getByTestId('wishlist-view-cart-button');
    // Header badge — rendered only while the wishlist is non-empty.
    this.headerWishlistCount = page.getByTestId('header-wishlist-count');
    // CSS is the last resort but unavoidable here: the app exposes no per-row
    // testid, and `div.group` is exactly one element per wishlist card.
    this.rows = page.locator('div.group');
  }

  /** The wishlist row of `productName`. */
  row(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  /** Trash icon of `productName` (icon only, no accessible name). */
  removeButton(productName: string): Locator {
    return this.row(productName).getByTestId('wishlist-remove-button');
  }

  /**
   * The text "Add to Cart" button of `productName`.
   * `wishlist-add-to-cart-button` appears twice per row (icon + text button),
   * so the accessible name is used to disambiguate.
   */
  addToCartButton(productName: string): Locator {
    return this.row(productName).getByRole('button', { name: 'Add to Cart', exact: true });
  }

  /** The same button after the product has been added to the cart. */
  inCartButton(productName: string): Locator {
    return this.row(productName).getByRole('button', { name: 'In Cart', exact: true });
  }

  /** Price element of `productName` as displayed in the wishlist, e.g. `$240`. */
  price(productName: string): Locator {
    return this.row(productName).getByTestId('wishlist-product-price');
  }

  /** Removes `productName` from the wishlist. */
  async removeItem(productName: string): Promise<void> {
    await this.removeButton(productName).click();
  }

  /** Moves `productName` to the cart (the row itself stays in the wishlist). */
  async moveToCart(productName: string): Promise<void> {
    await this.addToCartButton(productName).click();
  }

  /** Price text of `productName` as shown in the wishlist. */
  async priceText(productName: string): Promise<string> {
    return this.price(productName).innerText();
  }

  /** Asserts `productName` has exactly one row in the wishlist (no duplicates). */
  async expectContains(productName: string): Promise<void> {
    await expect(this.row(productName)).toHaveCount(1);
    await expect(this.row(productName)).toBeVisible();
  }

  /** Asserts `productName` is not listed in the wishlist. */
  async expectNotContains(productName: string): Promise<void> {
    await expect(this.row(productName)).toHaveCount(0);
  }

  /** Asserts the row count, the "N item(s)" label and the header badge all agree. */
  async expectItemCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
    await expect(this.itemCount).toHaveText(`${String(count)} ${count === 1 ? 'item' : 'items'}`);
    await expect(this.headerWishlistCount).toHaveText(String(count));
  }

  /** Asserts `productName` is already in the cart (button switched to "In Cart"). */
  async expectInCart(productName: string): Promise<void> {
    await expect(this.inCartButton(productName)).toBeVisible();
    await expect(this.addToCartButton(productName)).toHaveCount(0);
  }

  /** Asserts the empty-state message is shown and no rows/count badge are rendered. */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateHeading).toBeVisible();
    await expect(this.shopNowButton).toBeVisible();
    await expect(this.rows).toHaveCount(0);
    await expect(this.itemCount).toHaveCount(0);
    await expect(this.headerWishlistCount).toHaveCount(0);
  }

  /** Asserts a toast containing `message` is shown. */
  async expectToast(message: string | RegExp): Promise<void> {
    await this.toast.expectMessage(message);
  }
}
