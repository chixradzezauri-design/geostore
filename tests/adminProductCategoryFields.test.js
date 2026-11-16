import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/utils/productCategories.js', import.meta.url), 'utf8');

test('clothing and shoe categories retain dedicated size and color inventory controls', () => {
  assert.match(categories, /isClothingProductCategory/);
  assert.match(categories, /isShoesProductCategory/);
  assert.match(categories, /supportsSizeColorInventoryCategory/);
  assert.match(admin, /isShoesProductCategory\(catName\)/);
  assert.match(admin, /isClothingProductCategory\(catName\)/);
  assert.match(admin, /\['XS', 'S', 'M', 'L', 'XL', 'XXL'\]/);
  assert.match(admin, /\['38', '39', '40', '41', '42', '43', '44'\]/);
  assert.match(admin, /ზომები \(EU\)/);
  assert.match(admin, /available_sizes: availableSizes/);
  assert.match(admin, /available_colors: availableColors/);
});

test('phone, laptop, and accessory categories keep their category-specific options', () => {
  assert.match(admin, /catLower\.includes\('ტელეფონ'\)/);
  assert.match(admin, /catLower\.includes\('სმარტფონ'\)/);
  assert.match(admin, /catLower\.includes\('ლეპტოპ'\)/);
  assert.match(admin, /catLower\.includes\('კომპიუტერ'\)/);
  assert.match(admin, /\['128GB', '256GB', '512GB', '1TB'\]/);
  assert.match(admin, /RAM/);
  assert.match(admin, /\['Standard \/ One Size'\]/);
  assert.match(admin, /პროცესორი \(CPU\)/);
  assert.match(admin, /RAM/);
  assert.match(admin, /გრაფიკა \(GPU\)/);
  assert.match(admin, /ეკრანის ზომა/);
  assert.match(admin, /ოპერაციული სისტემა/);
  const laptopSection = admin.slice(admin.indexOf('{isLaptop && ('), admin.indexOf('{isPhone && ('));
  const phoneSection = admin.slice(admin.indexOf('{isPhone && ('), admin.indexOf('{!isClothing && !isShoes && !isLaptop && !isPhone && ('));
  assert.match(laptopSection, /productForm\.gpu/);
  assert.match(laptopSection, /productForm\.screenSize/);
  assert.match(laptopSection, /productForm\.os/);
  assert.match(phoneSection, /productForm\.cpu/);
  assert.match(phoneSection, /productForm\.screenSize/);
  assert.match(phoneSection, /productForm\.os/);
  assert.match(phoneSection, /მეხსიერების ვარიანტები/);
});

test('product save payload preserves all category-specific technical specifications', () => {
  for (const field of ['material', 'durability', 'model', 'cpu', 'ram', 'storage', 'gpu', 'screen_size', 'os']) {
    assert.match(admin, new RegExp(`\\b${field}: productForm\\.`));
  }
});
