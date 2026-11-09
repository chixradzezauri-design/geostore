import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isClothingProductCategory,
  isShoesProductCategory,
  supportsSizeColorInventoryCategory
} from './productCategories.js';

test('recognizes common Georgian clothing category and subcategory names', () => {
  for (const name of ['ტანსაცმელი', 'ქალის ჯინსი', 'მაისურები', 'ჰუდები', 'პერანგები', 'კაბები']) {
    assert.equal(isClothingProductCategory(name), true, name);
    assert.equal(supportsSizeColorInventoryCategory(name), true, name);
  }
});

test('recognizes Georgian and English footwear category names', () => {
  for (const name of ['ფეხსაცმელი', 'სპორტული ფეხსაცმელი', 'სანდლები', 'Sneakers', 'Boots']) {
    assert.equal(isShoesProductCategory(name), true, name);
    assert.equal(supportsSizeColorInventoryCategory(name), true, name);
  }
});

test('does not enable size/color inventory for unrelated product categories', () => {
  for (const name of ['ლეპტოპები', 'ტელეფონები', 'აქსესუარები', 'ზურგჩანთები']) {
    assert.equal(supportsSizeColorInventoryCategory(name), false, name);
  }
});
