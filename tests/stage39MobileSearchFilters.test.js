import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const h=readFileSync(new URL('../src/components/Header.jsx',import.meta.url),'utf8');
const s=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
const a=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const c=readFileSync(new URL('../src/designSystemV2.css',import.meta.url),'utf8');
const b=readFileSync(new URL('./browser/realStorefrontSmoke.mjs',import.meta.url),'utf8');
test('Stage 39: clear search restores focus and uses the active App search query',()=>{
  assert.match(h,/const searchInputRef = useRef\(null\)/);
  assert.match(h,/ref=\{searchInputRef\}/);
  assert.match(h,/className="gs-header-search-clear"/);
  assert.match(h,/setSearchQuery\?\.\(''\); searchInputRef\.current\?\.focus\(\)/);
  assert.match(b,/await searchClear\.click\(\)/);
});
test('Stage 39: category-safe reset clears query, category, prices, subcategory and sorting',()=>{
  assert.match(a,/filteredProducts=\{filteredProducts\}\s*searchQuery=\{searchQuery\}\s*setSearchQuery=\{setSearchQuery\}/);
  const f=s.slice(s.indexOf('const resetCatalogFilters = () => {'),s.indexOf('const resetCatalogFilters = () => {')+350);
  for(const op of ["setSearchQuery?.('')","selectCatalogueCategory('ყველა')","setMinPrice('')","setMaxPrice('')","setSortBy('default')","setProductPage(1)"]) assert.ok(f.includes(op),op);
  assert.match(s,/const selectCatalogueCategory=\(name,subcategory=null,parentId=null\)=>\{[\s\S]*?setSelectedCategory\(name\);setSelectedSubCategory\(subcategory\);setOpenParentCatId\(parentId\);/);
  assert.match(s,/className="gs-filter-reset-all/);
  assert.match(s,/className="gs-empty-products-reset/);
  assert.match(s,/const validSubcategory = selectedSubCategory && selectedParent/);
});
test('Stage 39: mobile filters are accessible and invalid ranges point to the alert',()=>{
  assert.equal((s.match(/aria-invalid=\{hasInvalidPriceRange\}/g)||[]).length,2);
  assert.equal((s.match(/aria-describedby=\{hasInvalidPriceRange \? 'gs-price-range-error' : undefined\}/g)||[]).length,2);
  assert.match(s,/id="gs-price-range-error"/);
  assert.match(c,/Stage 39 — search clear, filter reset and mobile catalogue controls/);
  assert.match(b,/minFont >= 16 && sortFont >= 16/);
});
