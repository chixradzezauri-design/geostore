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

test('sculpted eyes and species meshes retain finite bounded geometry, expressions and existing model roster',async()=>{
 const {drawPremiumMascotEye,drawMascot3DModel,MASCOT_3D_IDS}=await import('../src/utils/mascot3DModels.js');
 const {mascotPose}=await import('../src/utils/mascot3DGeometry.js');
 const collect=()=>{const parts=[];return {parts,draw:(...args)=>parts.push(args)}};
 const opened=collect(),closed=collect();
 drawPremiumMascotEye(opened.draw,{x:.3,y:.62,z:.49,radius:.165});
 drawPremiumMascotEye(closed.draw,{x:.3,y:.62,z:.49,radius:.165,closed:true});
 assert.equal(opened.parts.length,6);assert.equal(closed.parts.length,1);
 assert.ok(opened.parts[3][0][2]>opened.parts[2][0][2],'pupil projects ahead of iris');
 assert.equal(MASCOT_3D_IDS.length,12);
 for(const id of MASCOT_3D_IDS.filter(id=>id!=='fox'))for(const emotion of ['happy','wink','surprise']){
   const {parts,draw}=collect();
   drawMascot3DModel(id,draw,[.65,.4,.2],mascotPose(id,.7,'wave'),{emotion});
   assert.ok(parts.length>=12&&parts.length<=100,id);
   for(const [center,scale,tint,tilt=0,gloss=0,fur=0] of parts){
     assert.ok([...center,...scale,...tint,tilt,gloss,fur].every(Number.isFinite),id);
     assert.ok(scale.every(v=>v>0&&v<=1),id);
     assert.ok(center.every(v=>Math.abs(v)<=2.2),id);
   }
 }
 const renderer=read('src/components/FlagshipFox3D.jsx');
 assert.ok(renderer.includes('drawPremiumMascotEye(draw'));
 assert.ok(renderer.includes('gl.enable(gl.DEPTH_TEST)'));
});

test('premium gestures settle, preserve reduced motion and use bounded rendering',async()=>{
 const {mascotPose,premiumMascotPose,premiumMascotBlink,PREMIUM_MASCOT_MOTION_SECONDS}=await import('../src/utils/mascot3DGeometry.js');
 const {MASCOT_3D_IDS}=await import('../src/utils/mascot3DModels.js');
 const {MASCOT_LIGHTING}=await import('../src/utils/mascot3DLighting.js');
 for(const id of MASCOT_3D_IDS)for(const behavior of ['run-wave','walk-wave','patrol','jump','dance','celebrate','wave','bow','look-around','point','peek','slide','sneak','still']){
   for(const t of [0,.2,.7,1.4,2.6,4,6,8,15]){
     const p=premiumMascotPose(id,t,behavior),legacy=mascotPose(id,Math.min(t,8),behavior);
     for(const key of Object.keys(p)){assert.ok(Number.isFinite(p[key]),id+' '+key);assert.ok(Math.abs(p[key])<=Math.abs(legacy[key])+1e-8,key);}
     assert.ok(p.lift<=.06400001);
   }
   assert.ok(Object.values(premiumMascotPose(id,8,behavior)).every(v=>v===0));
   assert.ok(Object.values(premiumMascotPose(id,2,behavior,true)).every(v=>v===0));
 }
 assert.equal(PREMIUM_MASCOT_MOTION_SECONDS,8);
 assert.equal(premiumMascotBlink(2.4),true);assert.equal(premiumMascotBlink(2.4,true),false);assert.equal(premiumMascotBlink(8),false);
 for(const light of Object.values(MASCOT_LIGHTING))assert.ok([...light.key,...light.fill,...light.rim,...light.strength,light.ambient].every(v=>v>=0&&v<=1));
 const renderer=read('src/components/FlagshipFox3D.jsx'),css=read('src/components/characterStudio.css');
 assert.ok(renderer.includes('elapsed<PREMIUM_MASCOT_MOTION_SECONDS'));
 assert.ok(renderer.includes('premiumMascotBlink(elapsed,motion.matches)'));
 assert.ok(renderer.includes('Math.min(256,Math.max(64'));
 assert.ok(css.includes('gs-premium-figure-arrive'));
});
