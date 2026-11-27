import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
function assertContrast(bg,fg,label){
 const a=luminance(bg),b=luminance(fg);
 assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,label+' normal text contrast');
}
test('admin semantic status palettes keep readable fixed foreground/background pairs',()=>{
 const css=read('src/adminVideoRedesign.css');
 const groups=new Map();
 for(const [,name,bg,fg] of css.matchAll(/--(admin-(?:pro-order|product-status|stock|contact))-bg:\s*(#[0-9a-f]{6});\s*--\1-fg:\s*(#[0-9a-f]{6})/gi)){
  assertContrast(bg,fg,name);
  groups.set(name,(groups.get(name)||0)+1);
 }
 for(const [name,min] of [['admin-pro-order',5],['admin-product-status',3],['admin-stock',4],['admin-contact',5]])assert.ok((groups.get(name)||0)>=min,name+' palette coverage');
});
test('staff, flash promotions and design sync captions retain explicit contrast independently of theme',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 for(const selector of ['[data-admin-staff-auth="confirmed"]','[data-admin-staff-auth="pending"]','[data-admin-staff-auth="missing"]','.gs-admin-flash-schedule-status[data-status="pending"]','.gs-admin-flash-schedule-status[data-status="started"]','[data-admin-flash-price-risk="normal"] .admin-unified-flash-price-pair > span:nth-child(2)','[data-admin-flash-price-risk="increase"] .admin-unified-flash-price-pair > span:nth-child(2)','[data-admin-pro-editor-sync="saved"]',':is([data-admin-pro-editor-sync="loading"],[data-admin-pro-editor-sync="saving"])',':is([data-admin-pro-editor-sync="error"],[data-admin-pro-editor-sync="conflict"])']){
  const matches=rules.filter(m=>m[1].trim().endsWith(selector));
  assert.equal(matches.length,1,selector+' has one semantic rule');
  const body=matches[0][2];
  const bg=body.match(/(?:^|;)\s*background:\s*(#[0-9a-f]{6})\s*!important/i)?.[1];
  const fg=body.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})\s*!important/i)?.[1];
  assert.ok(bg&&fg,selector+' requires a fixed color pair');
  assertContrast(bg,fg,selector);
 }
});


test('final responsive refinement preserves preview boundaries and accessible hidden labels',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),helper=read('tests/browser/adminVisualBaseline.mjs'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.match(css,/\.gs-character-admin label:not\(:where\(\.gs-character-preview \*\)\) \{[^}]*font-size:12px !important/);
 assert.match(css,/\.gs-visual-editor-controls button \{[^}]*min-inline-size:44px/);
 assert.ok(helper.includes("allTextNodes.filter(el=>!el.closest('.sr-only'))"));
 assert.ok(smoke.includes('srOnlyTextElements:sample.srOnlyTextElements'));
 assert.ok(smoke.includes('character settings labels stay readable'));
});
