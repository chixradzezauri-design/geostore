import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Signature mobile navigation uses existing actions and stays out of admin and modal workflows',()=>{
 const header=read('src/components/Header.jsx'),app=read('src/App.jsx'),css=read('src/storefrontVideoRedesign.css'),editor=read('src/components/StorefrontVisualEditor.jsx');
 for(const token of ['SignatureMobileNav','!visualEditorViewport && !mobileNavBlocked','onProfile={openProfile}',"onWishlist={() => goTo('wishlist')}",'onCategories={() =>','aria-expanded={menuOpen}']) assert.ok(header.includes(token),token);
 assert.ok(app.includes('mobileNavBlocked={Boolean(supportOpen || isCheckoutOpen'));
 assert.ok(css.includes(':has(.gs-product-modal) .gs-signature-mobile-nav'));
 assert.ok(css.includes('env(safe-area-inset-bottom)'));
 assert.ok(editor.includes('previewDesign.signature2026 === true && previewMode === "mobile"'));
});
