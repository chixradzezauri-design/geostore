import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('shared feedback preserves error precedence and image fallback is display-only and keyed by source',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['<AdminThumbnailImage key={src} src={src}','src={failed ? ADMIN_THUMBNAIL_FALLBACK : src}','onError={failed ? undefined : () => setFailed(true)}','data:image/svg+xml,','supportTicketsLoading ? "loading" : supportTicketsError ? "error"','crmLoading ? "loading" : crmError ? "error"','<AdminSectionLoading label="მარაგის ისტორია იტვირთება…"/>','onClick={() => void fetchTickets()}','onClick={() => void fetchAdminCustomers()}','setAdminVisualReloadKey(value => value + 1)'])assert.ok(app.includes(term),term);
 assert.equal((app.match(/<AdminThumbnail data-admin-pro-/g)||[]).length,9);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 14')[1];assert.ok(css);
 for(const term of ['[data-admin-pro-feedback="error"]','[data-admin-pro-image-fallback="true"]',':focus-visible','prefers-reduced-motion: reduce'])assert.ok(css.includes(term),term);
 const lum=h=>h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const pairs=[...css.matchAll(/--feedback-bg:#([0-9a-f]{6});--feedback-fg:#([0-9a-f]{6})/g)];assert.equal(pairs.length,2);for(const [,bg,fg] of pairs)assert.ok((lum(bg)+.05)/(lum(fg)+.05)>=4.5);
});
