import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectReferencedProductImageUrls,
  collectReferencedOrderImageUrls,
  collectOrderProductIdsWithoutImageSnapshot,
  collectReferencedStorefrontImageUrls,
  collectReferencedLegacyMessageImageUrls,
  collectReferencedProductImagePaths,
  collectReferencedMediaStoragePaths
} from '../src/utils/productImageCleanup.js';

const prefix = 'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/product-images/';

test('product image references preserve other products and exclude only the edited product', () => {
  const refs = collectReferencedProductImageUrls([
    { id: 'p1', image: 'https://cdn.test/one.webp', gallery: ['https://cdn.test/two.webp'] },
    { id: 'p2', image: 'https://cdn.test/three.webp', gallery: [] }
  ], 'p1');
  assert.deepEqual([...refs], ['https://cdn.test/three.webp']);
});

test('order snapshots retain image and gallery references across supported legacy field names', () => {
  const refs = collectReferencedOrderImageUrls([
    { items: [
      { image: 'https://cdn.test/a.webp', gallery: ['https://cdn.test/b.webp'] },
      { image_url: 'https://cdn.test/c.webp' },
      { imageUrl: 'https://cdn.test/d.webp' }
    ] }
  ]);
  assert.deepEqual([...refs].sort(), [
    'https://cdn.test/a.webp',
    'https://cdn.test/b.webp',
    'https://cdn.test/c.webp',
    'https://cdn.test/d.webp'
  ]);
});

test('legacy order lines without image snapshots retain their product images', () => {
  const refs = collectOrderProductIdsWithoutImageSnapshot([
    { items: [{ id: 'old-product' }, { product_id: 'saved-image', image: 'https://cdn.test/a.webp' }] }
  ]);
  assert.deepEqual([...refs], ['old-product']);
});

test('storefront snapshots and legacy messages retain every HTTP image reference', () => {
  const storefront = collectReferencedStorefrontImageUrls(
    { hero: 'https://cdn.test/hero.webp', nested: [{ image: 'https://cdn.test/card.webp' }] }
  );
  const messages = collectReferencedLegacyMessageImageUrls([
    { image: 'https://cdn.test/chat.webp' },
    { image: 'data:image/png;base64,AAAA' }
  ]);
  assert.deepEqual([...storefront].sort(), ['https://cdn.test/card.webp', 'https://cdn.test/hero.webp']);
  assert.deepEqual([...messages], ['https://cdn.test/chat.webp']);
});

test('storage path matching normalizes query strings and percent encoding', () => {
  const refs = collectReferencedProductImagePaths([
    prefix + 'products/p1/front%20view.webp?width=600',
    prefix + 'products/p1/back.webp#preview',
    'https://other.example.test/storage/v1/object/public/product-images/products/p1/no.webp'
  ], prefix);
  assert.deepEqual([...refs].sort(), ['products/p1/back.webp', 'products/p1/front view.webp']);
});

test('storage path matching rejects traversal and malformed URLs', () => {
  const refs = collectReferencedProductImagePaths([
    prefix + 'products/p1/%2e%2e/other.webp',
    prefix + 'products/p1/%2F%2e%2e%2Fother.webp',
    'not-a-url'
  ], prefix);
  // URL parsing canonicalizes dot-segment traversal before extraction. The
  // normalized result may be a valid path elsewhere in the bucket, but it
  // must never resolve to a path still inside the original product folder.
  assert.equal([...refs].some(path => path.startsWith('products/p1/')), false);
});

test('storage path matching rejects non-HTTP prefixes and cross-origin URLs', () => {
  const refs = collectReferencedProductImagePaths([
    prefix + 'products/p1/front.webp',
    'https://attacker.example/products/p1/front.webp'
  ], 'javascript:alert(1)');
  assert.equal(refs.size, 0);
});

test('ambiguous upload failures are tracked before the Storage request for guarded cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const uploadStart = admin.indexOf('const uploadProductImage =');
  const uploadEnd = admin.indexOf('const deleteProductImages =', uploadStart);
  assert.ok(uploadStart >= 0 && uploadEnd > uploadStart);
  const upload = admin.slice(uploadStart, uploadEnd);
  const tracked = upload.indexOf('trackedUploads.push(publicUrl)');
  const request = upload.indexOf('await fetch(');
  assert.ok(tracked >= 0 && request > tracked, 'track the unique path before any uncertain network result');
  assert.match(upload, /if \(!response\.ok\)/);
  const saveStart = admin.indexOf('const handleSaveProduct =');
  const saveEnd = admin.indexOf('const handleExportProducts =', saveStart);
  const save = admin.slice(saveStart, saveEnd);
  assert.match(save, /!productSaveCommitted && !productSaveRequestStarted && newlyUploadedImages\.length > 0/);
  assert.match(save, /await deleteProductImages\(newlyUploadedImages, prodId\)/);
});

test('RPC HTTP errors remain ambiguous and never authorize uploaded-image cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const saveStart = admin.indexOf('const handleSaveProduct =');
  const saveEnd = admin.indexOf('const handleExportProducts =', saveStart);
  const save = admin.slice(saveStart, saveEnd);
  assert.match(save, /if \(!updateResponse\.ok\) \{\s*\/\/ The request reached the RPC endpoint/);
  assert.match(save, /if \(!createResponse\.ok\) \{\s*\/\/ Treat every post-request failure as ambiguous/);
  assert.doesNotMatch(save, /if \(!(?:updateResponse|createResponse)\.ok\) \{\s*productSaveRequestStarted = false/);
  assert.match(save, /const outcomeUnknown = productSaveRequestStarted && !productSaveCommitted/);
});

test('product save ignores rapid duplicate submissions and always releases its lock', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  assert.match(admin, /const productSaveInFlight = useRef\(false\)/);
  const saveStart = admin.indexOf('const handleSaveProduct =');
  const saveEnd = admin.indexOf('const handleExportProducts =', saveStart);
  const save = admin.slice(saveStart, saveEnd);
  assert.match(save, /if \(productSaveInFlight\.current\) return/);
  assert.match(save, /productSaveInFlight\.current = true;\s*try \{/);
  assert.match(save, /finally \{\s*productSaveInFlight\.current = false;/);
});

test('product image uploads remain sequential and session expiry never cleans uncertain saves', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const saveStart = admin.indexOf('const handleSaveProduct =');
  const saveEnd = admin.indexOf('const handleExportProducts =', saveStart);
  const save = admin.slice(saveStart, saveEnd);
  assert.match(save, /for \(let index = 0; index < sourceImages\.length; index \+= 1\) \{[\s\S]*?await uploadProductImage\(/);
  assert.match(save, /if \(!isCurrentSession\(\)\) return;[\s\S]*?productSaveRequestStarted = true;/);
  assert.match(save, /!productSaveCommitted && !productSaveRequestStarted && newlyUploadedImages\.length > 0/);
  assert.match(save, /if \(productSaveCommitted \|\| productSaveRequestStarted\)/);
});


test('owned product image cleanup rejects traversal, encoded separators and foreign product folders', async () => {
  const { collectOwnedProductImagePaths } = await import('../src/utils/productImageCleanup.js');
  const ownedPrefix = 'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/storefront-media/';
  const paths = collectOwnedProductImagePaths([
    ownedPrefix + 'products/p1/front.webp?width=600',
    ownedPrefix + 'products/p1/subfolder/back.webp',
    ownedPrefix + 'products/p1/%2e%2e/p2/other.webp',
    ownedPrefix + 'products/p1/%2F..%2Fp2/other.webp',
    ownedPrefix + 'products/p2/other.webp',
    'https://attacker.example/storage/v1/object/public/storefront-media/products/p1/evil.webp',
    ownedPrefix + 'products/p1/%ZZ.webp'
  ], ownedPrefix, 'p1');
  assert.deepEqual([...paths].sort(), [
    'products/p1/front.webp',
    'products/p1/subfolder/back.webp'
  ]);
});


test('media registry object paths remain protected from product cleanup', () => {
  const refs = collectReferencedMediaStoragePaths([
    { storage_path: 'products/p1/front.webp' },
    { storage_path: '/products/p2/back.webp' },
    { storage_path: 'products/p3/../private.webp' },
    { storage_path: 'products/p4/%2Fprivate.webp' },
    { storage_path: '' },
    null
  ]);
  assert.deepEqual([...refs].sort(), [
    'products/p1/front.webp',
    'products/p2/back.webp',
    'products/p4/%2Fprivate.webp'
  ]);
});


test('old product photos are considered for cleanup only after the new product row is confirmed', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const saveStart = admin.indexOf('const handleSaveProduct =');
  const saveEnd = admin.indexOf('const handleExportProducts =', saveStart);
  const save = admin.slice(saveStart, saveEnd);
  const persisted = save.indexOf('productSaveCommitted = true;');
  const rowValidated = save.indexOf('String(savedProductRow.id ?? \'\') !== String(prodId)');
  const oldPhotoCleanup = save.indexOf('await deleteProductImages(removedImages, prodId)');
  assert.ok(persisted >= 0 && rowValidated > persisted && oldPhotoCleanup > rowValidated,
    'confirm the database write and returned product identity before attempting old-photo cleanup');
  assert.match(save, /const removedImages = previousImages\.filter\(url => !galleryImages\.includes\(url\)\)/);
});

test('product deletion confirms the database RPC before attempting photo cleanup', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const start = admin.indexOf('const handleDeleteProduct =');
  const end = admin.indexOf('const handleToggleProductPublished =', start);
  const remove = admin.slice(start, end);
  const requestConfirmed = remove.indexOf('if (await res.json() !== true)');
  const cleanup = remove.indexOf('await deleteProductImages(productImages, id)');
  assert.ok(requestConfirmed >= 0 && cleanup > requestConfirmed,
    'never clean product images before the database confirms product deletion');
});

test('product image cleanup checks every independent reference source before Storage deletion', async () => {
  const { readFile } = await import('node:fs/promises');
  const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const cleanupStart = admin.indexOf('const deleteProductImages =');
  const cleanupEnd = admin.indexOf('const getOrderStatusClasses =', cleanupStart);
  const cleanup = admin.slice(cleanupStart, cleanupEnd);
  for (const table of ['products', 'orders', 'storefront_config', 'storefront_versions', 'messages', 'storefront_media']) {
    assert.ok(cleanup.includes(`fetchAllRows('${table}'`) || cleanup.includes(`/rest/v1/${table}?`),
      `cleanup must inspect ${table} references`);
  }
  assert.match(cleanup, /const safePaths = hasLegacyOrderFallback\s*\? \[\]\s*:/);
  assert.match(cleanup, /const response = await fetch\(\x60\$\{SUPABASE_URL\}\/storage\/v1\/object\/\$\{PRODUCT_IMAGE_BUCKET\}\x60/);
  assert.match(cleanup, /if \(!response\.ok\) throw new Error/);
});
