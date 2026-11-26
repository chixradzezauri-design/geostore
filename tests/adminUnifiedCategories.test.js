import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('category presentation retains all draft mutations and sibling boundary checks',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const area=app.slice(app.indexOf('className="admin-category-manager'),app.indexOf("{(visibleAdminTab === 'coupons'",app.indexOf('className="admin-category-manager')));
 for(const term of ['onSubmit={handleAddCategory}','moveCategory(parentCat.id, -1)','moveCategory(parentCat.id, 1)','moveCategory(sub.id, -1)','moveCategory(sub.id, 1)','mainCategories[0]?.id === parentCat.id','subCats[0]?.id === sub.id','handleSaveEditedCategory(parentCat.id)','handleSaveEditedCategory(sub.id)','handleDeleteCategory(parentCat.id, parentCat.name)','handleDeleteCategory(sub.id, sub.name)','categoryPhotoRequestRef.current.edit++','data-admin-category-level="parent"','data-admin-category-level="child"','მონახაზის შენახვა','გამოქვეყნება'])assert.ok(area.includes(term),term);
 assert.equal((area.match(/data-admin-category-action="save"/g)||[]).length,2);
});
test('category layout reserves name width and responsive action columns without clipping',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 08 — category hierarchy.')[1];
 for(const term of ['@container (min-width: 560px)','@media (max-width: 359px)','grid-template-columns: minmax(0,1fr) auto','min-height: 44px','word-break: normal','admin-unified-category-field'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
