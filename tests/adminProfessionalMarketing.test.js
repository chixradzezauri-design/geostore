import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO marketing retains existing actions and clearly separates drafts from delivery',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-promotion-state="active"','data-admin-pro-promotion-state="scheduled"','data-admin-pro-flash-window','data-admin-pro-banner-image','data-admin-pro-coupon-code','data-admin-pro-coupon-value','data-admin-pro-delivery-disabled','data-admin-pro-message-preview','onSubmit={handleApplyFlashSale}','onSubmit={handleAddBanner}','onSubmit={handleCreateCoupon}','onSubmit={handleSendBroadcast}','onClick={() => handleDeleteCoupon(c.id)}','onClick={() => moveBanner(b.id, -1)}','onClick={() => moveBanner(b.id, 1)}','isOwner && visibleAdminTab === \'users\'','Boolean(flashSalePlannedStart)','მომხმარებლებისთვის რეალური გაგზავნა ჯერ დაკავშირებული არ არის.'])assert.ok(app.includes(term),term);
 const campaigns=read('src/components/AdminMarketingCampaigns.jsx');
 assert.ok(campaigns.includes('შეტყობინებების გაგზავნა გამორთულია'));
 assert.ok(campaigns.includes('disabled={!valid}'));
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 11')[1];
 assert.ok(css);
 for(const term of ['data-admin-video-layout="v1"','object-fit:contain!important','aspect-ratio:16/7','[aria-pressed="true"]','[aria-pressed="false"]','button:disabled','@media(max-width:767px)'])assert.ok(css.includes(term),term);
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--promo-bg:#([0-9a-f]{6});--promo-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,3);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
