import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO editor chrome uses existing sync, device and publication states',()=>{
 const admin=read('src/components/AdminPanelVisualEditor.jsx'), store=read('src/components/StorefrontVisualEditor.jsx'), character=read('src/components/AdminCharacterStudio.jsx');
 for(const term of ['data-admin-pro-editor-sync={syncStatus}','data-admin-pro-editor-devices','data-admin-pro-editor-preview-tools','onClick={undoChange}','onClick={redoChange}','onClick={onRetrySave}','onReloadRemote?.()','onClick={() => setViewport(item.id)}','onChange={commitChange}'])assert.ok(admin.includes(term),term);
 for(const term of ['data-admin-pro-editor-history','data-admin-pro-editor-devices','data-admin-pro-editor-save','onClick={saveDraft}','onClick={publish}','!isOwner || storefrontDraftBusy','onClick={restoreSelectedStorefrontVersion}','onClick={clearViewportOverrides}'])assert.ok(store.includes(term),term);
 for(const term of ['data-admin-pro-character-state={!publishedKnown?"unknown":draftDiffers?"draft":"published"}','data-character-live-test','onClick={onTestPublishedCharacter}','onClick={undoPreset}','onClick={()=>applyPreset()}'])assert.ok(character.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 13')[1];assert.ok(css);
 for(const term of ['[aria-pressed="true"]','min-height:44px',':focus-visible','@media(max-width:767px)','[data-admin-pro-editor-sync="conflict"]'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/\.gs-visual-preview-frame|\.gs-character-preview(?:\s|[.:>])/);
 const lum=h=>h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const pairs=[...css.matchAll(/--editor-bg:#([0-9a-f]{6});--editor-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,4);for(const [,bg,fg] of pairs)assert.ok((lum(bg)+.05)/(lum(fg)+.05)>=4.5);
});
