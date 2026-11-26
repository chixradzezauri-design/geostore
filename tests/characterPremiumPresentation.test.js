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

test('premium responsive footprint preserves size variables and keeps dismissal outside the scrolling details',()=>{
 const jsx=read('src/components/CharacterMascot.jsx'),css=read('src/components/characterStudio.css').split('/* Premium phase 2:')[1],smoke=read('tests/browser/characterStudioSmoke.mjs');
 assert.ok(jsx.includes('className="gs-character-message"'));
 for(const term of ['--gs-premium-room','100dvh','env(safe-area-inset-bottom,0px)','var(--gs-mascot-mobile,76px)','var(--gs-mascot-desktop,116px)','258px','max-height:480px','.gs-character-details{','overflow:auto','.gs-character-dismiss{'])assert.ok(css.includes(term),term);
 assert.ok(smoke.includes('Compact concierge stays in viewport'));
 assert.ok(smoke.includes('Dismiss remains reachable'));
});

test('premium depth uses non-interactive contact layers in the existing figure',()=>{
 const jsx=read('src/components/CharacterMascot.jsx'),css=read('src/components/characterStudio.css').split('/* Premium phase 3:')[1],smoke=read('tests/browser/characterStudioSmoke.mjs');
 assert.ok(jsx.includes('data-character-depth="grounded"'));
 for(const term of ['isolation:isolate;pointer-events:none','gs-character-figure::before','gs-character-figure::after','radial-gradient(ellipse','gs-character-body-rig{position:relative;z-index:1}','drop-shadow','prefers-reduced-motion:reduce'])assert.ok(css.includes(term),term);
 assert.ok(!css.includes('position:fixed'));
 assert.ok(smoke.includes('Contact plane exists in all render modes'));
 assert.ok(smoke.includes('Character is in front of the contact plane'));
});
