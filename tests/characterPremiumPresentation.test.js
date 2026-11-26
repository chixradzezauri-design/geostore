import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('premium public character actions are opt-in and the text does not bounce',()=>{
 const jsx=read('src/components/CharacterMascot.jsx'),css=read('src/components/characterStudio.css'),smoke=read('tests/browser/characterStudioSmoke.mjs');
 for(const term of ['const [detailsOpen,setDetailsOpen]=useState(false)','const expanded=preview||detailsOpen','aria-expanded={expanded}','aria-controls={detailsId}','hidden={!expanded}','data-character-product','data-character-help','gs-character-mute','gs-character-dismiss'])assert.ok(jsx.includes(term),term);
 assert.ok(css.includes('.gs-character-details[hidden]{display:none!important}'));
 assert.ok(css.includes('animation:none!important;transform:none!important;box-sizing:border-box'));
 assert.ok(smoke.includes('Recommendations do not occupy catalogue space before opening'));
 assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled['internal-character-premium-2026-11-26'],false);
});
