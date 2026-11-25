import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Signature service strip uses existing modal routes rather than advertising unverified benefits',()=>{
 const view=read('src/components/StoreView.jsx'),app=read('src/App.jsx'),editor=read('src/components/StorefrontVisualEditor.jsx');
 for(const name of ['onOpenTracker','onOpenTerms','onOpenPrivacy','onOpenSupport']){
   assert.ok(view.includes('action:'+name));
   assert.ok(app.includes(name+'={() =>'));
   assert.ok(editor.includes(name+'={NOOP}'));
 }
 assert.ok(view.includes("typeof service.action==='function'"));
 assert.ok(view.includes('onClick={action}'));
 assert.ok(view.includes('rel="noopener noreferrer"'));
 assert.ok(view.includes("renderCustomSections('after-banners')"));
 assert.ok(read('src/storefrontVideoRedesign.css').includes('gs-signature-service-strip'));
});
