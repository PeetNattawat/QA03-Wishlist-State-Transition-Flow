import { test, expect } from '../../../fixtures/test.fixture';
import wishlistData from '../../../test-data/wishlist.json';

const { productA, productB, messages, headings } = wishlistData;

test.describe('Wishlist & Cart', () => {
  test.beforeEach(async ({ page, productsPage }) => {
    await productsPage.goto();
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });
// happy-path flow.
  test('User can move a wishlist product to the cart and update its quantity @smoke @critical @regression @ui', async ({
    page,
    productsPage,
    wishlistPage,
    cartPage,
    increaseCartQuantity,
  }) => {

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

    await test.step(`Change the quantity by ${productA.increaseCartQuantity} and verify subtotal = unit price × new quantity`, async () => {
      await increaseCartQuantity(productA.name, productA.increaseCartQuantity, productA.price);
    });

    await test.step('Return to the wishlist and verify the final wishlist state', async () => {
      await wishlistPage.goto();
      await wishlistPage.expectContains(productA.name);
      await wishlistPage.expectInCart(productA.name);
      await wishlistPage.expectItemCount(1);
    });
  });
// เพิ่มสินค้าลงใน Wishlist เเละตรวจสอบชื่อเเละราคา
  test('Product added to the wishlist keeps its catalog name and price @regression @ui', async ({
    productsPage,
    wishlistPage,
  }) => {
    // AC-2 — TC2.
    let catalogPrice = '';

    await test.step('Read the catalog price of product A and add it to the wishlist', async () => {
      catalogPrice = await productsPage.priceText(productB.name);
      await productsPage.toggleWishlist(productB.name);
      await productsPage.expectToast(messages.addedToWishlist);
    });

    await test.step('Verify the wishlist shows the same name and unit price', async () => {
      await wishlistPage.goto();
      await wishlistPage.expectContains(productB.name);
      await expect(wishlistPage.price(productB.name)).toHaveText(catalogPrice);
      await wishlistPage.expectItemCount(1);
    });
  });
//  ลบสินค้าออกจาก Wishlist เเละตรวจสอบว่ามีการอัพเดททันที
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
// ตรวจสอบว่า Wishlist ยังคงอยู่หลังจากรีเฟรชหน้า
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
// ย้ายสินค้าใน Wishlist ไปยัง Cart เเละตรวจสอบว่ามีการอัพเดทเป็น In Cart เเละเพิ่มไปยัง Cart
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
// เพิ่มจำนวนสินค้าใน Cart เเละตรวจสอบว่ามีการคำนวณ Subtotal เเละ Order Summary ใหม่
  test('Increasing the cart quantity recalculates row subtotal and order summary @regression @ui', async ({
    productsPage,
    cartPage,
    increaseCartQuantity,
  }) => {
    // AC-6 — TC6: subtotal = unit price × quantity, row and order summary must agree.
    await test.step('Seed the cart with product A at its default quantity of 1', async () => {
      await productsPage.addToCart(productA.name);
      await productsPage.expectToast(messages.addedToCart);
      await cartPage.goto();
      await cartPage.expectQuantityAndTotals(productA.name, 1, productA.price);
    });

    await test.step(`Increase the quantity by ${productA.increaseCartQuantity} and verify row subtotal and order summary recalculate`, async () => {
      await increaseCartQuantity(productA.name, productA.increaseCartQuantity, productA.price);
    });
  });
// ลดจำนวนสินค้าใน Cart เเละตรวจสอบว่ามีการคำนวณ Subtotal เเละ Order Summary ใหม่
  test('Decreasing the cart quantity recalculates row subtotal and order summary @regression @ui', async ({
    productsPage,
    cartPage,
    increaseCartQuantity,
    decreaseCartQuantity,
  }) => {
    // AC-6 — TC6: subtotal = unit price × quantity, row and order summary must agree.
    await test.step(`Seed the cart with product A at quantity ${1 + productA.increaseCartQuantity}`, async () => {
      await productsPage.addToCart(productA.name);
      await productsPage.expectToast(messages.addedToCart);
      await cartPage.goto();
      await increaseCartQuantity(productA.name, productA.increaseCartQuantity, productA.price);
    });

    await test.step(`Decrease the quantity by ${productA.decreaseCartQuantity} and verify row subtotal and order summary recalculate`, async () => {
      await decreaseCartQuantity(productA.name, productA.decreaseCartQuantity, productA.price);
    });
  });
// เปลี่ยนจำนวนสินค้าชิ้นหนึ่งเมื่อมีหลายสินค้าอยู่ใน Cart พร้อมกัน เเละตรวจสอบว่า Order Summary รวมยอดทุกเเถวถูกต้อง
  test('Order summary sums subtotals across multiple cart line items @regression @ui', async ({
    productsPage,
    cartPage,
  }) => {
    const productAQty = 1 + productA.increaseCartQuantity;
    const productBQty = 1 + productB.increaseCartQuantity;

    await test.step(`Seed the cart with product A (qty ${productAQty}) and product B (qty ${productBQty})`, async () => {
      await productsPage.addToCart(productA.name);
      await productsPage.expectToast(messages.addedToCart);
      await productsPage.addToCart(productB.name);
      await productsPage.expectToast(messages.addedToCart);
      await cartPage.goto();
      await cartPage.setQuantity(productA.name, productAQty);
      await cartPage.setQuantity(productB.name, productBQty);
    });

    await test.step('Verify each row subtotal and that the order summary sums both rows together', async () => {
      await cartPage.expectRowSubtotal(productA.name, productA.price * productAQty);
      await cartPage.expectRowSubtotal(productB.name, productB.price * productBQty);
      await cartPage.expectOrderSummary(productA.price * productAQty + productB.price * productBQty);
    });
  });
// สินค้าเดียวกันห้ามมี 2 แถวซ้ำใน wishlist
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
});
