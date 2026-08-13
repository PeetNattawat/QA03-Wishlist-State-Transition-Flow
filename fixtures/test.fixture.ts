import { test as base } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { ProductsPage } from '../pages/ProductsPage';
import { WishlistPage } from '../pages/WishlistPage';

/**
 * Composition point for Page Objects / components / API client.
 * Only add a fixture when more than one spec really needs it — this is not a DI container.
 */
type Fixtures = {
  productsPage: ProductsPage;
  wishlistPage: WishlistPage;
  cartPage: CartPage;
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
});

export { expect } from '@playwright/test';
