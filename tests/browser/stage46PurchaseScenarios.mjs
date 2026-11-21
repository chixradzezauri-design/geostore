import assert from 'node:assert/strict';

// Stage 46 browser contract: deterministic, data-populated customer journeys.
// Every Supabase request is intercepted in the browser. No live account,
// inventory, order, checkout, database or Storage mutation is possible.
const supabaseOrigin = 'https://xmtnszxtnfxnrojionoa.supabase.co';
export const stage49FixtureProductRows = [
  {
    id: 'stage46-simple', name: 'Stage46 Everyday Wallet', category: 'აქსესუარები',
    price_gel: 35, old_price_gel: 45, stock: 3,
    flash_sale_started_at: new Date(Date.now() - 3600000).toISOString(),
    flash_sale_ends_at: new Date(Date.now() + 86400000).toISOString(),
    flash_sale_percent: 22, variants: [], available_sizes: [], available_colors: []
  },
  {
    id: 'stage46-custom', name: 'Stage46 Personalised Premium Bag',
    category: 'აქსესუარები', price_gel: 70, stock: 2,
    variants: [
      { id: 'custom-in-stock', name: 'Premium personalised option with a long name', stock: 2, priceGEL: 90 },
      { id: 'custom-sold-out', name: 'Unavailable custom option', stock: 0, priceGEL: 80 }
    ],
    available_sizes: [], available_colors: []
  },
  {
    id: 'stage46-matrix', name: 'Stage46 Matrix Jacket', category: 'ტანსაცმელი',
    price_gel: 110, stock: 3,
    variants: [
      { id: 'm-black', name: 'M / Black', variantType: 'size_color', size: 'M', color: 'შავი', stock: 1, priceGEL: 101 },
      { id: 'l-blue', name: 'L / Blue', variantType: 'size_color', size: 'L', color: 'ლურჯი', stock: 2, priceGEL: 115 },
      { id: 'm-blue', name: 'M / Blue', variantType: 'size_color', size: 'M', color: 'ლურჯი', stock: 0, priceGEL: 105 }
    ],
    available_sizes: [], available_colors: []
  },
  {
    id: 'stage46-empty', name: 'Stage46 Out Of Stock Item', category: 'აქსესუარები',
    price_gel: 25, stock: 0, variants: [], available_sizes: [], available_colors: []
  }
].map((row, index) => ({
  created_at: new Date(Date.now() - index * 60000).toISOString(),
  image: null, gallery: [], tags: [], vendor: 'GEOSTORE',
  is_featured: false, description: 'Controlled browser test item, no live order.',
  ...row
}));
const localCache = productRows.map(row => ({
  id: row.id, name: row.name, category: row.category,
  priceGEL: row.price_gel, oldPriceGEL: row.old_price_gel ?? null,
  stock: row.stock, variants: row.variants,
  availableSizes: row.available_sizes, availableColors: row.available_colors,
  flashSaleStartedAt: row.flash_sale_started_at ?? null,
  flashSaleEndsAt: row.flash_sale_ends_at ?? null,
  flashSalePercent: row.flash_sale_percent ?? null,
  image: null, gallery: [], tags: []
}));

async function openProduct(page, name) {
  const card = page.locator('.gs-catalog-product-card').filter({ hasText: name });
  const trigger = card.locator('.gs-catalog-product-title-action');
  await trigger.waitFor({ state: 'visible', timeout: 20000 });
  await trigger.click();
  const dialog = page.locator('.gs-product-dialog');
  await dialog.waitFor({ state: 'visible' });
  assert.ok((await dialog.locator('.gs-product-detail-title').innerText()).includes(name),
    'Opened the correct product: ' + name);
  return dialog;
}

async function addSelectedProduct(page) {
  const button = page.locator('.gs-product-dialog .gs-modal-add-to-cart');
  assert.equal(await button.isEnabled(), true, 'Available option should be purchasable');
  await button.click();
  await page.locator('.gs-product-dialog').waitFor({ state: 'detached', timeout: 10000 });
}

export async function runStage46ProductPurchaseScenarios(browser, host, widths = [320, 390, 768, 1440]) {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 850 }, reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    const blockedWrites = [];
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(String(error?.message || error)));
    try {
      // Never permit the test to reach live Supabase, including read-only RPCs.
      await context.route(supabaseOrigin + '/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/rest/v1/products' && request.method() === 'GET') {
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify(productRows) });
        }
        if (request.method() !== 'GET' &&
            !(/^\/rest\/v1\/rpc\/(?:get_|list_|lookup_)/.test(url.pathname))) {
          blockedWrites.push(request.method() + ' ' + url.pathname);
          return route.fulfill({ status: 403, contentType: 'application/json',
            body: JSON.stringify({ message: 'Blocked isolated browser test write' }) });
        }
        // Other anonymous config reads get a deterministic empty response.
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      await page.addInitScript(seed => {
        localStorage.setItem('geostore_lang', 'ka');
        localStorage.setItem('geostore_products', JSON.stringify(seed));
        localStorage.setItem('geostore_cart:guest', '[]');
        localStorage.setItem('geostore_cart', '[]');
        localStorage.setItem('geostore_wishlist:guest', '[]');
        localStorage.setItem('geostore_comparison:guest', '[]');
      }, localCache);

      const response = await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response?.status(), 200);
      await page.locator('.geostore-storefront').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('.gs-catalog-product-card').filter({ hasText: 'Stage46 Matrix Jacket' })
        .waitFor({ state: 'visible', timeout: 20000 });
      assert.equal(await page.locator('.gs-catalog-product-card').count(), 4,
        'All four deterministic catalogue products are visible');

      // Keyboard quick detail and return-to-launcher focus.
      const simpleTrigger = page.locator('.gs-catalog-product-card')
        .filter({ hasText: 'Stage46 Everyday Wallet' }).locator('.gs-catalog-product-title-action');
      await simpleTrigger.focus();
      await page.keyboard.press('Enter');
      await page.locator('.gs-product-dialog').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.gs-product-modal-close').evaluate(node => document.activeElement === node), true,
        'Quick-view close control receives initial keyboard focus');
      await page.keyboard.press('Escape');
      await page.locator('.gs-product-dialog').waitFor({ state: 'detached' });
      assert.equal(await simpleTrigger.evaluate(node => document.activeElement === node), true,
        'Quick view returns focus to its originating product');

      await openProduct(page, 'Stage46 Everyday Wallet');
      await addSelectedProduct(page);
      assert.ok((await page.locator('[role="status"]').allTextContents())
        .some(text => text.includes('Stage46 Everyday Wallet')),
        'Successful cart message contains the product name');

      // Long custom variants, sold-out choice disabled and cumulative stock limit.
      for (let attempt = 0; attempt < 3; attempt++) {
        const custom = await openProduct(page, 'Stage46 Personalised Premium Bag');
        const unavailable = custom.locator('.gs-custom-variant-option').filter({ hasText: 'Unavailable custom option' });
        assert.equal(await unavailable.isDisabled(), true);
        const selected = custom.locator('.gs-custom-variant-option').filter({ hasText: 'Premium personalised option' });
        assert.equal(await selected.getAttribute('aria-pressed'), 'true');
        assert.ok(await selected.evaluate(node => node.getBoundingClientRect().height >= 43),
          'Custom option has a phone-safe touch target');
        if (attempt < 2) {
          await addSelectedProduct(page);
        } else {
          await custom.locator('.gs-modal-add-to-cart').click();
          await page.locator('[role="alert"]').filter({ hasText: '0 ცალი' })
            .waitFor({ state: 'visible', timeout: 5000 });
          assert.equal(await custom.isVisible(), true,
            'An unsuccessful add does not close the product dialog');
          await custom.locator('.gs-product-modal-close').click();
        }
      }

      const matrix = await openProduct(page, 'Stage46 Matrix Jacket');
      // A size unavailable in the current color is intentionally hidden.
      // Choose an in-stock color first; the UI selects its available size.
      assert.equal(await matrix.locator('.gs-size-option').filter({ hasText: /^L$/ }).count(), 0);
      await matrix.locator('.gs-color-option').filter({ hasText: 'ლურჯი' }).click();
      assert.equal(await matrix.locator('.gs-color-option[aria-pressed="true"]').innerText(), 'ლურჯი',
        'Selected color is available');
      assert.equal(await matrix.locator('.gs-size-option[aria-pressed="true"]').innerText(), 'L',
        'Choosing a color automatically selects its in-stock size');
      assert.equal(await matrix.locator('.gs-modal-add-price').innerText().then(s => s.includes('115')), true,
        'Selected variant price is reflected in the action');
      await addSelectedProduct(page);

      const empty = await openProduct(page, 'Stage46 Out Of Stock Item');
      assert.equal(await empty.locator('.gs-modal-add-to-cart').isDisabled(), true,
        'Unavailable stock cannot be submitted');
      assert.ok((await empty.locator('#gs-product-purchase-hint').innerText()).includes('მარაგში'),
        'Unavailable product explains why its action is disabled');
      await empty.locator('.gs-product-modal-close').click();

      // Reaching checkout is safe, but the test NEVER submits the form.
      await page.locator('.gs-menu-toggle').click();
      await page.locator('#geostore-main-menu .gs-menu-link').filter({ hasText: 'კალათა' }).click();
      await page.locator('.gs-cart-page').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.gs-cart-item').count(), 3,
        'Simple item, merged custom option and size-color item create three cart lines');
      const snapshot = await page.evaluate(() => {
        const raw = localStorage.getItem('geostore_cart:guest');
        return raw ? JSON.parse(raw) : [];
      });
      const customItem = snapshot.find(item => item.id === 'stage46-custom');
      const matrixItem = snapshot.find(item => item.id === 'stage46-matrix');
      assert.equal(customItem?.quantity, 2, 'Repeated custom option adds merge until stock exhausted');
      assert.equal(customItem?.customVariantId, 'custom-in-stock');
      assert.equal(customItem?.priceGEL, 90);
      assert.equal(matrixItem?.selectedSize, 'L');
      assert.equal(matrixItem?.selectedColor, 'ლურჯი');
      assert.equal(matrixItem?.customVariantId, 'l-blue');
      assert.equal(matrixItem?.priceGEL, 115);

      await page.locator('.gs-cart-checkout').click();
      await page.locator('.gs-checkout-dialog').waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await page.locator('.gs-checkout-form').count(), 1,
        'Checkout form opens without creating an order');
      const checkout = page.locator('.gs-checkout-dialog');
      const nameInput = checkout.locator('input[name="name"]');
      await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'name');
      // Invalid contact data passes native length checks but is rejected by
      // the shared validator before any live checkout request.
      await nameInput.fill('Stage47 Test Customer');
      await checkout.locator('input[name="phone"]').fill('++995555123456');
      await checkout.locator('input[name="email"]').fill('buyer@example.com');
      await checkout.locator('input[name="address"]').fill('Test address 123');
      await checkout.locator('.gs-checkout-submit-area button').click();
      await checkout.locator('#geostore-checkout-error').waitFor({ state: 'visible', timeout: 8000 });
      await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'phone');
      assert.equal(await checkout.locator('input[name="phone"]').getAttribute('aria-invalid'), 'true');
      assert.equal(await checkout.locator('input[name="phone"]').getAttribute('aria-describedby'), 'geostore-checkout-error');
      assert.equal(await page.locator('.gs-cart-item').count(), 3,
        'Invalid contact keeps cart contents unchanged');
      await checkout.locator('input[name="phone"]').fill('+995 555 123 456');
      await checkout.locator('#geostore-checkout-error').waitFor({ state: 'detached' });
      assert.notEqual(await checkout.locator('input[name="phone"]').getAttribute('aria-invalid'), 'true');
      assert.equal(await nameInput.inputValue(), 'Stage47 Test Customer',
        'Editing one field keeps other checkout inputs');

      // Tab and Escape remain within the modal lifecycle.
      const closeButton = checkout.locator('.gs-checkout-close');
      await closeButton.focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.closest('.gs-checkout-dialog') !== null), true);
      await page.keyboard.press('Escape');
      await checkout.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.classList?.contains('gs-cart-checkout'));
      await page.locator('.gs-cart-checkout').click();
      await checkout.waitFor({ state: 'visible' });
      assert.equal(await checkout.locator('input[name="phone"]').inputValue(), '+995 555 123 456',
        'Checkout retry preserves corrected contact values');
      assert.equal(await checkout.locator('#geostore-checkout-error').count(), 0,
        'Reopened checkout has no stale validation error');
      await checkout.locator('.gs-checkout-close').click();
      await checkout.waitFor({ state: 'detached' });

      assert.deepEqual(blockedWrites, [], 'No live Supabase mutations at width ' + width);
      assert.deepEqual(browserErrors, [], 'No uncaught JavaScript errors at width ' + width);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
        'No horizontal page overflow at width ' + width);
      console.log('PASS Stage46 isolated purchase flow at ' + width +
        'px (4 products, stock limit, variants, cart, checkout open; no live writes)');
    } finally {
      await context.close();
    }
  }
}
