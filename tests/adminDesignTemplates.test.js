import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAdminPanelVisualDesign,saveAdminDesignTemplate,applyAdminDesignTemplate,renameAdminDesignTemplate,deleteAdminDesignTemplate,ADMIN_DESIGN_TEMPLATE_LIMIT} from '../src/utils/adminPanelVisualDesign.js';
const id='80000000-0000-4000-8000-000000000001',meta={id,name:'Example',savedAt:'2026-11-24T12:00:00Z'};
test('global templates roundtrip through existing cloud normalizer without nesting or content',()=>{
 const original=normalizeAdminPanelVisualDesign({theme:{accent:'#abcdef'},layout:{fontSize:16},responsive:{mobile:{theme:{accent:'#123456'},layout:{fontSize:12}}}});
 const saved=saveAdminDesignTemplate(original,meta);assert.ok(saved);
 assert.deepEqual(normalizeAdminPanelVisualDesign(JSON.parse(JSON.stringify(saved))),saved);
 assert.deepEqual(Object.keys(saved.designTemplates[0].snapshot),['theme','layout','responsive']);
 assert.equal(saved.designTemplates[0].snapshot.responsive.mobile.theme.accent,'#123456');
 assert.equal(saveAdminDesignTemplate(saved,{...meta,id:'80000000-0000-4000-8000-000000000002'}),null);
});
test('apply only selected scope, preserve unrelated content, element styles and preset collections',()=>{
 const saved=saveAdminDesignTemplate({theme:{accent:'#abcdef'},layout:{fontSize:16},responsive:{mobile:{layout:{fontSize:12}}}},meta);
 assert.ok(saved);
 const changed=normalizeAdminPanelVisualDesign({...saved,theme:{...saved.theme,accent:'#111111'},layout:{...saved.layout,fontSize:13},elementStyles:{...saved.elementStyles,orderCard:{...saved.elementStyles.orderCard,fontSize:20}},responsive:{...saved.responsive,mobile:{...saved.responsive.mobile,layout:{fontSize:14}}}});
 const colors=applyAdminDesignTemplate(changed,id,'theme');assert.equal(colors.theme.accent,'#abcdef');assert.equal(colors.layout.fontSize,13);assert.deepEqual(colors.responsive.mobile.layout,changed.responsive.mobile.layout);
 const all=applyAdminDesignTemplate(changed,id);assert.equal(all.layout.fontSize,16);assert.equal(all.responsive.mobile.layout.fontSize,12);
 for(const k of ['content','components','elementStyles','stylePresets','stylePresetBackups','moduleDesignBackups','designTemplates'])assert.deepEqual(all[k],changed[k]);
 const renamed=renameAdminDesignTemplate(all,id,'Renamed');assert.equal(renamed.designTemplates[0].name,'Renamed');assert.deepEqual(deleteAdminDesignTemplate(renamed,id).theme,all.theme);
});
test('normalization bounds and sanitizes malformed template tokens',()=>{
 const snapshot={theme:{accent:'url(javascript:bad)'},layout:{fontSize:99999},responsive:{},designTemplates:[{}]};
 const entries=Array.from({length:10},(_,i)=>({...meta,id:'80000000-0000-4000-8000-00000000000'+i,name:'Template '+i,snapshot}));
 const result=normalizeAdminPanelVisualDesign({designTemplates:entries});
 assert.equal(result.designTemplates.length,ADMIN_DESIGN_TEMPLATE_LIMIT);
 assert.match(result.designTemplates[0].snapshot.theme.accent,/^#[0-9a-f]+$/i);
 assert.ok(result.designTemplates[0].snapshot.layout.fontSize<99999);
 assert.equal(result.designTemplates[0].snapshot.designTemplates,undefined);
});
