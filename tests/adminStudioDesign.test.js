import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAdminPanelVisualDesign,buildAdminPanelVisualStyle} from '../src/utils/adminPanelVisualDesign.js';
import {resolveAdminStudioAppearance,ADMIN_STUDIO_PALETTE} from '../src/utils/adminStudioDesign.js';
test('Studio is a complete appearance projection, not a destructive migration',()=>{
 const raw=normalizeAdminPanelVisualDesign({theme:{canvas:'#000000',accent:'#ff0000'},layout:{cardPadding:40},content:{ordersTitle:'ჩემი შეკვეთები'},components:{orders:{backgroundColor:'#000000'}},elementStyles:{orderCard:{backgroundColor:'#ff0000'}},responsive:{mobile:{theme:{canvas:'#333333'},layout:{cardPadding:30}}}});
 const snapshot=structuredClone(raw), studio=resolveAdminStudioAppearance(raw);
 assert.deepEqual(raw,snapshot);
 assert.equal(studio.theme.canvas,ADMIN_STUDIO_PALETTE.canvas);
 assert.equal(studio.theme.navInactiveBackground,'#23242b');
 assert.equal(studio.theme.primaryButtonBackground,'#5042a6');
 assert.equal(studio.components.orders.backgroundColor,'#ffffff');
 assert.equal(studio.elementStyles.orderCard.backgroundColor,'#ffffff');
 assert.equal(studio.content.ordersTitle,raw.content.ordersTitle);
 for(const key of ['stylePresets','designTemplates'])assert.deepEqual(studio[key],raw[key]);
 const styles=buildAdminPanelVisualStyle(studio);
 assert.equal(styles['--admin-vd-mobile-canvas'],studio.theme.canvas);
 assert.equal(styles['--admin-vd-mobile-cardPadding'],styles['--admin-vd-cardPadding']);
});
test('Studio palette pairs meet AA',()=>{
 const t=resolveAdminStudioAppearance({}).theme;
 const l=c=>c.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
 for(const [a,b] of [['text','panel'],['muted','canvas'],['navInactiveText','navInactiveBackground'],['navActiveText','navActiveBackground'],['primaryButtonText','primaryButtonBackground'],['inputText','inputBackground'],['inputPlaceholder','inputBackground']]){const [hi,lo]=[l(t[a]),l(t[b])].sort((a,b)=>b-a);assert.ok((hi+.05)/(lo+.05)>=4.5,a+' / '+b);}
});


test('Studio cascade stays last and operational selectors cannot leak into the saved appearance',()=>{
 const css=readFileSync(new URL('../src/adminStudioWorkspace.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
 const root='.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"]';
 const studio=root+'[data-admin-appearance="studio"] ';
 const shared=root+':is([data-admin-appearance="studio"],[data-admin-appearance="saved"]) ';
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectors.length>200);
 for(const selector of selectors){
  if(selector.startsWith(shared)){assert.match(selector.slice(shared.length),/^\.admin-studio-appearance-(?:control|options)\b/);}
  else assert.ok(selector.startsWith(studio)||selector.startsWith(studio.trim()+' {'),selector);
 }
 const imports=['adminPanelVisualDesign.css','adminVideoRedesign.css','adminUnifiedWorkspace.css','adminStudioWorkspace.css'].map(name=>app.indexOf("import '../"+name+"'"));
 assert.ok(imports.every((index,i)=>index>=0&&(i===0||index>imports[i-1])),'Studio follows legacy admin styles');
 const title=studio+'.admin-studio-page-header .admin-pro-page-identity > h2 {';
 assert.equal(css.split(title).length,2,'One canonical page title rule');
 assert.ok(css.includes(':not(:where(.gs-visual-preview-frame *, .gs-character-preview *, .geostore-fashion-store *)):not(:where(.sr-only, .sr-only *))'));
});
