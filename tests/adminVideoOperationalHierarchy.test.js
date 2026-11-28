import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('operational hierarchy uses neutral category and assistant surfaces without changing actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminUnifiedWorkspace.css').split('/* Video stage 10')[1];
 for(const cls of ['admin-category-entry-surface','admin-category-list-surface','admin-unified-category-photo-field','admin-ai-analyst','admin-ai-chat','admin-ai-bubble']){
  const classes=[...app.matchAll(/className="([^"]+)"/g)].map(m=>m[1]).filter(s=>s.split(/\s+/).includes(cls));
  assert.ok(classes.length,cls);
  assert.ok(classes.every(s=>!/(bg-slate-9|shadow-)/.test(s)),cls);
 }
 for(const term of ['onSubmit={handleAddCategory}','onSubmit={handleAiAsk}','handleCategoryFileChange(e, false)','moveCategory(parentCat.id, -1)','data-admin-pro-assistant-role'])assert.ok(app.includes(term),term);
 assert.ok(css.includes('word-break: normal !important'));
 assert.ok(css.includes('font-size: clamp(15px,var(--admin-vd-titleFontSize-active,18px),20px)'));
 assert.ok(css.includes('grid-template-columns: repeat(auto-fit,minmax(min(100%,140px),1fr))'));
});
