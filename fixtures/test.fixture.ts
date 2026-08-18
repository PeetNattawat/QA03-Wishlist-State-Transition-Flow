import { test as base } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { ProductsPage } from '../pages/ProductsPage';
import { WishlistPage } from '../pages/WishlistPage';

/** Reads productName's current cart quantity, then sets and verifies it at current ± delta. */
type CartQuantityDelta = (productName: string, delta: number, price: number) => Promise<void>;

/**
 * Composition point for Page Objects / components / API client.
 * Only add a fixture when more than one spec really needs it — this is not a DI container.
 */
type Fixtures = {
  productsPage: ProductsPage;
  wishlistPage: WishlistPage;
  cartPage: CartPage;
  increaseCartQuantity: CartQuantityDelta;
  decreaseCartQuantity: CartQuantityDelta;
};

export const test = base.extend<Fixtures>({
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },

  wishlistPage: async ({ page }, use) => {
    await use(new WishlistPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  increaseCartQuantity: async ({ cartPage }, use) => {
    await use(async (productName, delta, price) => {
      const current = Number(await cartPage.quantity(productName).innerText());
      await cartPage.setQuantityAndVerify(productName, current + delta, price);
    });
  },

  decreaseCartQuantity: async ({ cartPage }, use) => {
    await use(async (productName, delta, price) => {
      const current = Number(await cartPage.quantity(productName).innerText());
      await cartPage.setQuantityAndVerify(productName, current - delta, price);
    });
  },
});

export { expect } from '@playwright/test';
