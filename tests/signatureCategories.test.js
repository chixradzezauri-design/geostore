import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const view=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/storefrontVideoRedesign.css',import.meta.url),'utf8');
test('Signature category cards retain the real catalogue and every existing selection action',()=>{
 for(const token of ['data-signature-categories={signatureHero ? "true" : undefined}','cat.image || cat.img || getCategoryImage(catName)','selectCatalogueCategory(catName,null,isOpen ? null : catId)','selectCatalogueCategory(selectedCategory,sub.name,openParentCatId)','shouldHandleCatalogueClick(event)','aria-expanded={subCats.length > 0 ? isOpen : undefined}','gs-signature-all-categories','gs-signature-category-arrow'])assert.ok(view.includes(token),token);
 assert.ok(view.includes("(!signatureHero || !(mainCategories.length || categories?.length))"));
 assert.ok(css.includes('repeat(var(--gs-category-columns,4),minmax(0,1fr))'));
 assert.ok(css.includes('var(--gs-video-category-title-fontSize,'));
});
