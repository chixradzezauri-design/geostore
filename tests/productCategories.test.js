import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccessoryProductCategory,
  isClothingProductCategory,
  isLaptopProductCategory,
  isPhoneProductCategory,
  isShoesProductCategory,
  supportsSizeColorInventoryCategory
} from '../src/utils/productCategories.js';

test('recognizes apparel and footwear categories across supported names', () => {
  assert.equal(isClothingProductCategory('ტანსაცმელი'), true);
  assert.equal(isClothingProductCategory('Clothing'), true);
  assert.equal(isShoesProductCategory('ფეხსაცმელი'), true);
  assert.equal(isShoesProductCategory('Sneakers'), true);
  assert.equal(supportsSizeColorInventoryCategory('ტანსაცმელი'), true);
  assert.equal(supportsSizeColorInventoryCategory('Shoes'), true);
});

test('recognizes phone and laptop categories in Georgian, English and Russian', () => {
  assert.equal(isPhoneProductCategory('ტელეფონები'), true);
  assert.equal(isPhoneProductCategory('Smartphones'), true);
  assert.equal(isPhoneProductCategory('Смартфоны'), true);
  assert.equal(isLaptopProductCategory('ლეპტოპები'), true);
  assert.equal(isLaptopProductCategory('Laptop'), true);
  assert.equal(isLaptopProductCategory('Ноутбук'), true);
});

test('accessory categories take precedence over device words', () => {
  assert.equal(isAccessoryProductCategory('აქსესუარები'), true);
  assert.equal(isPhoneProductCategory('ტელეფონის აქსესუარები'), false);
  assert.equal(isPhoneProductCategory('Phone Accessories'), false);
  assert.equal(isLaptopProductCategory('კომპიუტერის აქსესუარები'), false);
  assert.equal(isLaptopProductCategory('Laptop Accessories'), false);
  assert.equal(isLaptopProductCategory('Аксессуары для ноутбука'), false);
});
