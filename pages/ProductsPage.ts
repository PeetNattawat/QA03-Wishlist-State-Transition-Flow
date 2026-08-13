import { Locator, Page, expect } from '@playwright/test';
import { Toast } from '../components/Toast';
import { storeBaseUrl } from '../utils/env';
import { BasePage } from './BasePage';

/** Page Object for the "All Products" grid. Locators + actions only — no test logic. */
export class ProductsPage extends BasePage {
  readonly toast: Toast;
  readonly productCards: Locator;

  constructor(page: Page) {
    super(page, `${storeBaseUrl()}/products`);
    this.toast = new Toast(page);
    // Locator priority: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > CSS.
    this.productCards = page
      .getByRole('link')
      .filter({ has: page.getByTestId('all-products-header') });
  }

  /** The card (product link) of `productName`. */
  productCard(productName: string): Locator {
    return this.productCards.filter({ hasText: productName });
  }

  /**
   * Heart button of `productName`.
   * The testid repeats once per card, so it is always scoped to a single card.
   */
  wishlistButton(productName: string): Locator {
    return this.productCard(productName).getByTestId('all-products-wishlist-button');
  }

  /** Direct add-to-cart button of `productName` (icon only, no accessible name). */
  cartButton(productName: string): Locator {
    return this.productCard(productName).getByTestId('all-products-cart-button');
  }

  /** Price element of `productName` as displayed in the grid, e.g. `$240`. */
  price(productName: string): Locator {
    return this.productCard(productName).getByTestId('all-products-price');
  }

  /** Adds (or, because the heart is a toggle, removes) `productName` to the wishlist. */
  async toggleWishlist(productName: string): Promise<void> {
    await this.wishlistButton(productName).click();
  }

  /** Adds `productName` straight to the cart from the grid. */
  async addToCart(productName: string): Promise<void> {
    await this.cartButton(productName).click();
  }

  /** Price text of `productName` as shown in the grid. */
  async priceText(productName: string): Promise<string> {
    return this.price(productName).innerText();
  }

  /** Asserts the grid is rendered with at least the expected product visible. */
  async expectProductVisible(productName: string): Promise<void> {
    await expect(this.productCard(productName)).toHaveCount(1);
    await expect(this.productCard(productName)).toBeVisible();
  }

  /** Asserts a toast containing `message` is shown. */
  async expectToast(message: string | RegExp): Promise<void> {
    await this.toast.expectMessage(message);
  }
}
