import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStorefrontVisualDesign,saveStorefrontDesignTemplate,applyStorefrontDesignTemplate,renameStorefrontDesignTemplate,deleteStorefrontDesignTemplate,STOREFRONT_DESIGN_TEMPLATE_LIMIT} from '../src/utils/storefrontVisualDesign.js';
const id='80000000-0000-4000-8000-000000000001';
test('storefront template persists as safe tokens without nesting or content',()=>{
 const d=normalizeStorefrontVisualDesign({theme:{accent:'#abcdef'},typography:{baseFontSize:16},responsive:{mobile:{layout:{sectionGap:22}}},copy:{heroButton:'Keep'},productOrder:['sku']});
 const saved=saveStorefrontDesignTemplate(d,{id,name:'Example'});assert.ok(saved);
 assert.deepEqual(normalizeStorefrontVisualDesign(JSON.parse(JSON.stringify(saved))),saved);
 assert.deepEqual(Object.keys(saved.designTemplates[0].snapshot),['theme','typography','layout','responsive']);
 assert.equal(saved.designTemplates[0].snapshot.responsive.mobile.layout.sectionGap,22);
 assert.equal(saveStorefrontDesignTemplate(saved,{id,name:'Duplicate'}),null);
});
test('apply scopes preserve all unrelated settings',()=>{
 const saved=saveStorefrontDesignTemplate({theme:{accent:'#abcdef'},typography:{baseFontSize:16},layout:{sectionGap:24},responsive:{mobile:{layout:{sectionGap:22}}}},{id,name:'Example'});
 const d=normalizeStorefrontVisualDesign({...saved,theme:{...saved.theme,accent:'#111111'},typography:{...saved.typography,baseFontSize:14},layout:{...saved.layout,sectionGap:42},copy:{heroButton:'Keep'},productOrder:['sku'],hero:{imageUrl:'https://example.invalid/photo.png'},responsive:{...saved.responsive,mobile:{...saved.responsive.mobile,layout:{sectionGap:30}}}});
 const colors=applyStorefrontDesignTemplate(d,id,'theme');assert.equal(colors.theme.accent,'#abcdef');assert.equal(colors.layout.sectionGap,42);assert.equal(colors.typography.baseFontSize,14);
 const fonts=applyStorefrontDesignTemplate(d,id,'typography');assert.equal(fonts.typography.baseFontSize,16);assert.equal(fonts.theme.accent,'#111111');
 const all=applyStorefrontDesignTemplate(d,id);assert.equal(all.responsive.mobile.layout.sectionGap,22);
 for(const k of ['hero','copy','sections','sectionOrder','productOrder','customSections','stylePresets','elementStyles','designTemplates'])assert.deepEqual(all[k],d[k]);
 const renamed=renameStorefrontDesignTemplate(all,id,'Renamed');assert.equal(renamed.designTemplates[0].name,'Renamed');assert.deepEqual(deleteStorefrontDesignTemplate(renamed,id).theme,all.theme);
});
test('unsafe and nested payloads sanitized and bounded',()=>{
 const snapshot={theme:{accent:'url(bad)'},typography:{baseFontSize:1000},layout:{sectionGap:1000},responsive:{},designTemplates:[{}]};
 const templates=Array.from({length:9},(_,i)=>({id:'80000000-0000-4000-8000-00000000000'+i,name:'Template '+i,snapshot}));
 const d=normalizeStorefrontVisualDesign({designTemplates:templates});
 assert.equal(d.designTemplates.length,STOREFRONT_DESIGN_TEMPLATE_LIMIT);assert.match(d.designTemplates[0].snapshot.theme.accent,/^#[0-9a-f]+$/i);assert.ok(d.designTemplates[0].snapshot.layout.sectionGap<=72);assert.equal(d.designTemplates[0].snapshot.designTemplates,undefined);
});
