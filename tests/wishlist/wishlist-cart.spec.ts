import { test, expect } from '../../fixtures/test.fixture';
import wishlistData from '../../test-data/wishlist.json';

/**
 * Wishlist ↔ Cart state transition — automation of the confirmed manual test cases
 * (qa/test-cases/testdino-exercise/wishlist-state-transition-th.md, TC1-TC7 + TC9).
 *
 * Acceptance Criteria coverage
 *  AC-1  Full flow: add A+B to wishlist → survives refresh → move A to cart →
 *        remove B → cart holds A with the correct price → qty 2 recalculates the subtotal. (TC1)
 *  AC-2  A product added to the wishlist shows the same name and unit price as the catalog. (TC2)
 *  AC-3  Removing a wishlist item takes effect immediately, without a reload. (TC3)
 *  AC-4  Wishlist state survives a full page reload. (TC4)
 *  AC-5  Moving a wishlist item to the cart puts it in the cart with qty 1. (TC5)
 *  AC-6  Changing the cart quantity recalculates the row subtotal and the order summary. (TC6)
 *  AC-7  The same product can never occupy two wishlist rows. (TC7)
 *  AC-9  An empty wishlist shows an empty-state message (no broken table / NaN). (TC9)
 *
 * Real-behaviour notes (verified live — they differ from the manual test-case wording):
 *  - No authentication is required: wishlist and cart work as a guest and persist in
 *    localStorage, so this suite runs in the unauthenticated browser projects.
 *  - "Move to cart" does NOT remove the row from the wishlist. The row stays and its
 *    button switches from "Add to Cart" to "In Cart" (AC-5 / TC5 asserts that behaviour).
 *  - The catalog heart button is a TOGGLE: clicking it again removes the product from
 *    the wishlist ("Removed from wishlist"), which is how AC-7 / TC7 is exercised.
 *  - The product detail page (/product/<slug>) renders a blank page, so the catalog grid
 *    is used as the add-to-wishlist entry point. See the report/defect list.
 */
const { productA, productB, messages, headings } = wishlistData;

test.describe('Wishlist ↔ Cart', () => {
  test.beforeEach(async ({ page, productsPage }) => {
    // The store has no logout/reset endpoint — wishlist and cart live entirely in
    // localStorage (keys `wishlistItems` / `cartItems`). Clearing them after the first
    // navigation (the origin must exist before localStorage is reachable) is the only
    // way to make every test start from an empty, independent state.
    await productsPage.goto();
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('User can move a wishlist product to the cart and update its quantity @smoke @critical @regression @ui', async ({
    page,
    productsPage,
    wishlistPage,
    cartPage,
  }) => {
    // AC-1 — TC1, full happy-path flow.
    await test.step('Add product A and product B to the wishlist from the catalog', async () => {
      await productsPage.expectProductVisible(productA.name);
      await productsPage.toggleWishlist(productA.name);
      await productsPage.expectToast(messages.addedToWishlist);
      await productsPage.toggleWishlist(productB.name);
      await productsPage.expectToast(messages.addedToWishlist);
    });

    await test.step('Verify both products are listed in the wishlist', async () => {
      await wishlistPage.goto();
      await expect(wishlistPage.title).toHaveText(headings.wishlist);
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectContains(productB.name);
      await wishlistPage.expectItemCount(2);
    });

    await test.step('Reload the page and verify the wishlist is unchanged', async () => {
      await page.reload();
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectContains(productB.name);
      await wishlistPage.expectItemCount(2);
    });

    await test.step('Move product A to the cart', async () => {
      await wishlistPage.moveToCart(productA.name);
      await wishlistPage.expectToast(messages.addedToCart);
      await wishlistPage.expectInCart(productA.name);
    });

    await test.step('Remove product B from the wishlist', async () => {
      await wishlistPage.removeItem(productB.name);
      await wishlistPage.expectToast(messages.removedFromWishlist);
      await wishlistPage.expectNotContains(productB.name);
      await wishlistPage.expectItemCount(1);
    });

    await test.step('Verify the cart holds product A with quantity 1 and the right price', async () => {
      await cartPage.goto();
      await expect(cartPage.title).toHaveText(headings.cart);
      await cartPage.expectContains(productA.name);
      await cartPage.expectNotContains(productB.name);
      await cartPage.expectUnitPrice(productA.name, productA.price);
      await cartPage.expectQuantity(productA.name, 1);
      await cartPage.expectRowSubtotal(productA.name, productA.price);
    });

    await test.step('Change the quantity to 2 and verify subtotal = unit price × 2', async () => {
      await cartPage.increaseQuantity(productA.name);
      await cartPage.expectQuantity(productA.name, 2);
      await cartPage.expectRowSubtotal(productA.name, productA.price * 2);
      await cartPage.expectOrderSummary(productA.price * 2);
    });
  });

  test('Product added to the wishlist keeps its catalog name and price @regression @ui', async ({
    productsPage,
    wishlistPage,
  }) => {
    // AC-2 — TC2.
    let catalogPrice = '';

    await test.step('Read the catalog price of product A and add it to the wishlist', async () => {
      await productsPage.page.waitForTimeout(5000);
      catalogPrice = await productsPage.priceText(productA.name);
      await productsPage.toggleWishlist(productA.name);
      await productsPage.expectToast(messages.addedToWishlist);
    });

    await test.step('Verify the wishlist shows the same name and unit price', async () => {
      await wishlistPage.goto();
      await wishlistPage.expectContains(productA.name);
      await expect(wishlistPage.price(productA.name)).toHaveText(catalogPrice);
      await wishlistPage.expectItemCount(1);
    });
  });

  test('Removing a product from the wishlist takes effect immediately @regression @ui', async ({
    productsPage,
    wishlistPage,
  }) => {
    // AC-3 — TC3: the row must disappear without any reload.
    await test.step('Seed the wishlist with product A and product B', async () => {
      await productsPage.toggleWishlist(productA.name);
      await productsPage.toggleWishlist(productB.name);
      await wishlistPage.goto();
      await wishlistPage.expectItemCount(2);
    });

    await test.step('Remove product B', async () => {
      await wishlistPage.removeItem(productB.name);
      await wishlistPage.expectToast(messages.removedFromWishlist);
    });

    await test.step('Verify product B is gone and the item count is updated', async () => {
      await wishlistPage.expectNotContains(productB.name);
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectItemCount(1);
    });
  });

  test('Wishlist content survives a page reload @regression @ui', async ({
    page,
    productsPage,
    wishlistPage,
  }) => {
    // AC-4 — TC4: state persistence, not just transient UI state.
    await test.step('Add product A and product B to the wishlist', async () => {
      await productsPage.toggleWishlist(productA.name);
      await productsPage.toggleWishlist(productB.name);
    });

    await test.step('Open the wishlist and confirm both products are listed', async () => {
      await wishlistPage.goto();
      await wishlistPage.expectItemCount(2);
    });

    await test.step('Reload the browser and verify both products are still listed', async () => {
      await page.reload();
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectContains(productB.name);
      await wishlistPage.expectItemCount(2);
    });
  });

  test('Moving a wishlist product to the cart marks it as In Cart and adds it to the cart @regression @ui', async ({
    productsPage,
    wishlistPage,
    cartPage,
  }) => {
    // AC-5 — TC5. The manual case allowed either behaviour ("removed OR marked");
    // the implemented behaviour is "marked", so that is what is asserted.
    await test.step('Seed the wishlist with product A', async () => {
      await productsPage.toggleWishlist(productA.name);
      await wishlistPage.goto();
      await wishlistPage.expectContains(productA.name);
    });

    await test.step('Move product A to the cart', async () => {
      await wishlistPage.moveToCart(productA.name);
      await wishlistPage.expectToast(messages.addedToCart);
    });

    await test.step('Verify the wishlist row stays and now reads "In Cart"', async () => {
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectInCart(productA.name);
      await wishlistPage.expectItemCount(1);
      await expect(wishlistPage.viewCartButton).toHaveText('View Cart (1)');
    });

    await test.step('Verify the cart holds product A with quantity 1 and the right price', async () => {
      await cartPage.goto();
      await cartPage.expectContains(productA.name);
      await cartPage.expectQuantity(productA.name, 1);
      await cartPage.expectUnitPrice(productA.name, productA.price);
      await cartPage.expectRowSubtotal(productA.name, productA.price);
    });
  });

  test('Changing the cart quantity recalculates row subtotal and order summary @regression @ui', async ({
    productsPage,
    cartPage,
  }) => {
    // AC-6 — TC6: subtotal = unit price × quantity, row and order summary must agree.
    await test.step('Seed the cart with product A', async () => {
      await productsPage.addToCart(productA.name);
      await productsPage.expectToast(messages.addedToCart);
      await cartPage.goto();
      await cartPage.expectQuantity(productA.name, 1);
      await cartPage.expectRowSubtotal(productA.name, productA.price);
      await cartPage.expectOrderSummary(productA.price);
    });

    await test.step('Increase the quantity from 1 to 2', async () => {
      await cartPage.increaseQuantity(productA.name);
      await cartPage.expectQuantity(productA.name, 2);
    });

    await test.step('Verify row subtotal and order summary are both unit price × 2', async () => {
      await cartPage.expectRowSubtotal(productA.name, productA.price * 2);
      await cartPage.expectOrderSummary(productA.price * 2);
    });

    await test.step('Decrease back to 1 and verify the amounts revert', async () => {
      await cartPage.decreaseQuantity(productA.name);
      await cartPage.expectQuantity(productA.name, 1);
      await cartPage.expectRowSubtotal(productA.name, productA.price);
      await cartPage.expectOrderSummary(productA.price);
    });
  });

  test('The same product never gets two wishlist rows @regression @ui', async ({
    productsPage,
    wishlistPage,
  }) => {
    // AC-7 — TC7. The catalog heart is a toggle, so "adding twice" is add → remove → add.
    // Whatever the sequence, the wishlist must never hold two rows of the same product.
    await test.step('Add product A to the wishlist', async () => {
      await productsPage.toggleWishlist(productA.name);
      await productsPage.expectToast(messages.addedToWishlist);
      await wishlistPage.goto();
      await wishlistPage.expectItemCount(1);
    });

    await test.step('Click the wishlist button of product A a second time', async () => {
      await productsPage.goto();
      await productsPage.toggleWishlist(productA.name);
      await productsPage.expectToast(messages.removedFromWishlist);
    });

    await test.step('Verify the second click toggled the product off instead of duplicating it', async () => {
      await wishlistPage.goto();
      await wishlistPage.expectNotContains(productA.name);
      await wishlistPage.expectEmptyState();
    });

    await test.step('Add product A again and verify it still occupies exactly one row', async () => {
      await productsPage.goto();
      await productsPage.toggleWishlist(productA.name);
      await wishlistPage.goto();
      await wishlistPage.expectContains(productA.name);
      await expect(wishlistPage.productNames).toHaveCount(1);
      await wishlistPage.expectItemCount(1);
    });
  });

  test('Empty wishlist shows the empty-state message @regression @ui', async ({ wishlistPage }) => {
    // AC-9 — TC9: empty state, no broken table and no NaN values.
    await test.step('Open the wishlist without adding anything', async () => {
      await wishlistPage.goto();
    });

    await test.step('Verify the empty-state message and that no item data is rendered', async () => {
      await expect(wishlistPage.title).toHaveText(headings.wishlist);
      await wishlistPage.expectEmptyState();
      await expect(wishlistPage.page.getByText(/NaN|undefined|\$NaN/)).toHaveCount(0);
    });
  });
});
