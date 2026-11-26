import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO inventory keeps verified recommendation and revision safeguards',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-inventory-summary="history"','data-admin-pro-inventory-summary="planning"','data-admin-pro-inventory-table','data-admin-pro-inventory-delta','data-admin-pro-replenishment-status','!replenishmentSummaryVerified ? "pending"','calculateReplenishmentDraftPreview(position.stock, thresholdValue, targetValue)','saveInventoryReplenishmentSetting(position)','recoverInventoryReplenishmentConflict(position.key)','expectedUpdatedAt','fetchInventoryMovements(inventoryMovementCursor, true)','!hasProductsPermission || hasConflict'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 07')[1];
 assert.ok(css.includes('overflow-x:auto;overscroll-behavior-inline:contain'));
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-stock-bg:#([0-9a-f]{6});--admin-stock-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,4);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
