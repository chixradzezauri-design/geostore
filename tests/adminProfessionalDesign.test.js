import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyAdminProfessionalDesign,ADMIN_PRO_PALETTE} from '../src/utils/adminProfessionalDesign.js';
import {DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,normalizeAdminPanelVisualDesign,buildAdminPanelVisualStyle} from '../src/utils/adminPanelVisualDesign.js';
test('PRO preset provides a complete compatible light palette and compact design',()=>{
 const before=normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
 const after=applyAdminProfessionalDesign(before);
 assert.deepEqual(Object.keys(after.theme),Object.keys(before.theme));
 assert.equal(after.theme.canvas,ADMIN_PRO_PALETTE.canvas);
 assert.equal(after.theme.navInactiveBackground,ADMIN_PRO_PALETTE.nav);
 assert.equal(after.theme.primaryButtonText,'#ffffff');
 assert.equal(after.layout.titleFontSize,22);
 assert.equal(after.layout.inputHeight,44);
 assert.equal(after.components.orders.backgroundColor,'#ffffff');
 assert.equal(after.elementStyles.orderCard.textColor,'#182230');
 assert.equal(buildAdminPanelVisualStyle(after)['--admin-vd-orders-backgroundColor'],'#ffffff');
 assert.deepEqual(applyAdminProfessionalDesign(after),after);
});
test('PRO opt-in preserves custom element fields, device overrides, content and existing libraries',()=>{
 const raw=normalizeAdminPanelVisualDesign({content:{ordersTitle:'ჩემი შეკვეთები'},components:{orders:{padding:33,backgroundColor:'#112233'}},elementStyles:{orderCard:{fontSize:19,backgroundColor:'#123456'}},responsive:{mobile:{layout:{titleFontSize:17},theme:{accent:'#abcdef'},elementStyles:{orderCard:{fontSize:15}}}}});
 const snapshot=structuredClone(raw);
 const after=applyAdminProfessionalDesign(raw);
 assert.deepEqual(raw,snapshot);
 assert.equal(after.components.orders.padding,33);
 assert.equal(after.components.orders.backgroundColor,'#112233');
 assert.equal(after.elementStyles.orderCard.fontSize,19);
 assert.equal(after.elementStyles.orderCard.backgroundColor,'#123456');
 for(const k of ['content','responsive','stylePresets','designTemplates'])assert.deepEqual(after[k],raw[k]);
});
const luminance=color=>{const channels=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
test('PRO preset semantic text and control pairs meet AA contrast on token colors',()=>{
 const t=applyAdminProfessionalDesign({}).theme;
 for(const [a,b] of [['text','panel'],['muted','canvas'],['navInactiveText','navInactiveBackground'],['navActiveText','navActiveBackground'],['primaryButtonText','primaryButtonBackground'],['inputPlaceholder','inputBackground']]){
  const l=[luminance(t[a]),luminance(t[b])].sort((x,y)=>y-x);
  assert.ok((l[0]+0.05)/(l[1]+0.05)>=4.5,a+' / '+b);
 }
 const editor=readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx',import.meta.url),'utf8');
 assert.ok(editor.includes('commitChange(applyAdminProfessionalDesign(normalized))'));
 assert.ok(editor.includes("disabled={viewport!=='desktop'}"));
});
