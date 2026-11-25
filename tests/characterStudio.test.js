import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,normalizeCharacterSettings,selectCharacter,characterMessage,canDisplayCharacter,characterAlreadySeen,getCharacterScenario,resolveCharacterSeason,canShowCharacterReaction,normalizeCharacterAppearance,characterBubbleInk,characterAppearanceStyle,styledCharacter} from '../src/utils/characterStudio.js';
test('mascot is opt-in and strict boolean',()=>{
  assert.equal(normalizeCharacterSettings(null).enabled,false);
  assert.equal(normalizeCharacterSettings({enabled:'true'}).enabled,false);
  assert.equal(normalizeCharacterSettings({enabled:true}).enabled,true);
});
test('invalid settings are constrained and unknown properties dropped',()=>{
  const s=normalizeCharacterSettings({character:'invalid',behavior:'bad',side:'bad',delay:-1,duration:100,message:'x'.repeat(500),unknown:true});
  assert.equal(s.character,'fox');assert.equal(s.behavior,'run-wave');assert.equal(s.side,'left');assert.equal(s.delay,0);assert.equal(s.duration,12);assert.equal(s.message.length,120);assert.equal(s.unknown,undefined);
});
test('rotation selects only the five original characters',()=>{
  assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,12);
  const everyday=CHARACTERS.filter(c=>!c.special);for(let i=0;i<everyday.length;i++)assert.equal(selectCharacter({rotation:'random'},new Date(),()=>(i+.5)/everyday.length).id,everyday[i].id);
  assert.equal(selectCharacter({rotation:'fixed',character:'cat'}).id,'cat');
  assert.equal(selectCharacter({rotation:'daypart'},new Date(2026,5,1,9)).id,'fox');
  assert.equal(selectCharacter({rotation:'seasonal'},new Date(2026,11,1)).id,'santa');
});
test('custom greeting overrides localized preset',()=>{
  const character=CHARACTERS[0];assert.equal(characterMessage({message:'  Hi  '},character,'ka'),'Hi');assert.equal(characterMessage({},character,'en'),character.lines.en);
});
test('never display in blocked views, product routes or disabled devices',()=>{
  const s={enabled:true,pages:'catalogue',mobile:false};
  assert.equal(canDisplayCharacter(s,{route:'home',mobile:false}),true);
  assert.equal(canDisplayCharacter(s,{route:'category',mobile:false}),true);
  assert.equal(canDisplayCharacter(s,{route:'product',mobile:false}),false);
  assert.equal(canDisplayCharacter(s,{route:'home',mobile:true}),false);
  assert.equal(canDisplayCharacter(s,{route:'home',blocked:true}),false);
  assert.equal(canDisplayCharacter({enabled:false},{route:'home'}),false);
  assert.equal(canDisplayCharacter({enabled:true},{route:'category'}),false);
});
test('frequency guard handles invalid stamps and expiry',()=>{
  assert.equal(characterAlreadySeen('1','session'),true);
  assert.equal(characterAlreadySeen(null,'session'),false);
  assert.equal(characterAlreadySeen('100','daily',200),true);
  assert.equal(characterAlreadySeen('100','daily',86400100),false);
  assert.equal(characterAlreadySeen('300','daily',200),false);
  assert.equal(characterAlreadySeen('bad','daily',200),false);
});

test('contextual scenes are individually opt-in, device-gated and eligible only',()=>{
  assert.equal(getCharacterScenario({enabled:true},'flash',{eligible:true}),null);
  const s={enabled:true,scenarios:{flash:{enabled:true,character:'cat',message:'Sale!'},cart:{enabled:true}}};
  assert.equal(getCharacterScenario(s,'flash',{eligible:true}).character.id,'cat');
  assert.equal(getCharacterScenario(s,'flash',{eligible:true}).message,'Sale!');
  assert.equal(getCharacterScenario(s,'flash',{eligible:false}),null);
  assert.equal(getCharacterScenario({...s,mobile:false},'flash',{eligible:true,mobile:true}),null);
  assert.equal(getCharacterScenario({...s,enabled:false},'cart',{eligible:true}),null);
  assert.equal(getCharacterScenario(s,'cart',{eligible:true}).character.id,'robot');
  assert.equal(getCharacterScenario(s,'wishlist',{eligible:true}),null);
  assert.equal(getCharacterScenario(s,'__proto__',{eligible:true}),null);
});
test('scene normalization bounds text, drops unknown scene keys, preserves greeting',()=>{
  const s=normalizeCharacterSettings({message:'Welcome',scenarios:{flash:{enabled:'true',character:'other',message:'a'.repeat(200)},other:{enabled:true}}});
  assert.equal(s.message,'Welcome');
  assert.equal(s.scenarios.flash.enabled,false);
  assert.equal(s.scenarios.flash.character,'rabbit');
  assert.equal(s.scenarios.flash.message.length,120);
  assert.equal(s.scenarios.other,undefined);
});

test('additional movements, expressions and season presets are strictly bounded',()=>{
  const s=normalizeCharacterSettings({behavior:'dance',emotion:'wink',season:'winter'});
  assert.equal(s.behavior,'dance');assert.equal(s.emotion,'wink');assert.equal(s.season,'winter');
  assert.equal(normalizeCharacterSettings({emotion:'unknown',season:'bad'}).emotion,'happy');
  assert.equal(normalizeCharacterSettings({season:'bad'}).season,'none');
  assert.equal(resolveCharacterSeason('auto',new Date(2026,11,1)),'winter');
  assert.equal(resolveCharacterSeason('auto',new Date(2026,1,1)),'hearts');
  assert.equal(resolveCharacterSeason('auto',new Date(2026,6,1)),'summer');
  assert.equal(resolveCharacterSeason('auto',new Date(2026,9,1)),'autumn');
  assert.equal(resolveCharacterSeason('auto',new Date(2026,3,1)),'none');
});
test('successful commerce reactions are opt-in and rate limited',()=>{
  const s={enabled:true,emotion:'wink',scenarios:{cartAdded:{enabled:true}}};
  assert.equal(getCharacterScenario(s,'cartAdded',{eligible:true}).emotion,'wink');
  assert.equal(getCharacterScenario(s,'wishlistAdded',{eligible:true}),null);
  assert.equal(getCharacterScenario(s,'cartAdded',{eligible:false}),null);
  assert.equal(canShowCharacterReaction(null,100),true);
  assert.equal(canShowCharacterReaction(100,15099),false);
  assert.equal(canShowCharacterReaction(100,15100),true);
});

test('custom mascot appearance clamps geometry and rejects unsafe CSS',()=>{
  const a=normalizeCharacterAppearance({desktopSize:900,mobileSize:-10,lift:999,fontSize:30,bubbleColor:'url(https://example.test)',bubbleShape:'invalid'});
  assert.deepEqual(a,{desktopSize:144,mobileSize:56,lift:48,fontSize:15,bubbleColor:'#fffdf7',bubbleShape:'rounded',renderMode:'auto',lighting:'studio',prominence:'enhanced'});
  assert.equal(characterAppearanceStyle({bubbleColor:'#000000',bubbleShape:'pill'})['--gs-mascot-radius'],'28px');
  assert.equal(characterBubbleInk('#000000'),'#ffffff');
  assert.equal(characterBubbleInk('#ffffff'),'#000000');
  assert.equal(characterBubbleInk('#777777'),'#000000');
});
test('individual character colors survive selection and contextual scenes',()=>{
  const s={enabled:true,character:'fox',palette:{fox:'#123456',cat:'bad',robot:'#aabbcc'},scenarios:{cart:{enabled:true}}};
  assert.equal(selectCharacter(s).color,'#123456');
  assert.equal(styledCharacter(CHARACTERS.find(c=>c.id==='cat'),s).color,'#f472b6');
  assert.equal(getCharacterScenario(s,'cart',{eligible:true}).character.color,'#aabbcc');
});

test('greeting library is bounded, locale-aware and preserves explicit greeting priority',()=>{
  const c=CHARACTERS[0],s={greetingMode:'library',greetingLibrary:{ka:[' ერთი ','ორი','ერთი','','x'.repeat(200)],en:['Hi there'],ru:[],other:['ignored']}};
  const normalized=normalizeCharacterSettings(s);
  assert.equal(normalized.greetingLibrary.ka.length,3);
  assert.equal(normalized.greetingLibrary.ka[2].length,120);
  assert.equal(characterMessage(s,c,'ka',0),'ერთი');
  assert.equal(characterMessage(s,c,'en',.9),'Hi there');
  assert.equal(characterMessage(s,c,'ru'),c.lines.ru);
  assert.equal(characterMessage({...s,message:'Override'},c,'ka'),'Override');
  assert.equal(characterMessage({greetingMode:'funny'},c,'en',.99),'Don’t mind me, I’m just your friendly mascot!');
  assert.match(characterMessage({greetingMode:'time'},c,'en',0,new Date(2026,10,25,9)),/Good morning/);
});
test('interaction and effects are opt-in and validated',()=>{
  assert.equal(normalizeCharacterSettings({}).waveBack,false);
  assert.equal(normalizeCharacterSettings({waveBack:'true',effect:'bad'}).effect,'none');
  assert.equal(normalizeCharacterSettings({waveBack:true,effect:'hearts',behavior:'celebrate'}).waveBack,true);
  assert.equal(normalizeCharacterSettings({behavior:'sneak'}).behavior,'sneak');
});

import {characterCalendarDay,normalizeCharacterEvents,activeCharacterEvent,applyCharacterEvent} from '../src/utils/characterStudio.js';
test('calendar uses Tbilisi day and inclusive event periods, first match wins',()=>{
  const now=new Date('2026-12-31T20:00:00Z');
  assert.equal(characterCalendarDay(now),'2027-01-01');
  const events=[{id:'first',enabled:true,start:'2027-01-01',end:'2027-01-01',theme:'newyear'},{id:'second',enabled:true,start:'2026-12-30',end:'2027-01-03',theme:'summer'}];
  const s={enabled:true,calendarEnabled:true,events,frequency:'daily',message:'normal'};
  const event=activeCharacterEvent(s,now);
  assert.equal(event.id,'first');
  const effective=applyCharacterEvent(s,event,'en');
  assert.equal(effective.message,'Happy New Year!');
  assert.equal(effective.character,'panda');
  assert.equal(effective.frequency,'daily');
  assert.equal(activeCharacterEvent({...s,calendarEnabled:false},now),null);
  assert.equal(activeCharacterEvent({...s,enabled:false},now),null);
  assert.equal(activeCharacterEvent(s,new Date('2027-01-04T12:00:00Z')),null);
});
test('invalid dates and disabled events cannot activate; limits and localized override hold',()=>{
  const entries=normalizeCharacterEvents([{id:'bad',enabled:true,start:'2026-02-30',end:'2027-01-01'},{id:'bad',enabled:true},{id:'off',enabled:false,start:'2027-01-01',end:'2027-01-01'}]);
  assert.equal(entries.length,2);assert.equal(entries[0].start,'');
  assert.equal(activeCharacterEvent({enabled:true,calendarEnabled:true,events:entries},new Date('2027-01-01T12:00:00Z')),null);
  assert.equal(normalizeCharacterEvents(Array.from({length:20},(_,i)=>({id:'e'+i}))).length,12);
  const event=normalizeCharacterEvents([{theme:'valentine',messages:{ka:'ჩემი ტექსტი',en:'x'.repeat(200)}}])[0];
  assert.equal(applyCharacterEvent({},event,'ka').message,'ჩემი ტექსტი');
  assert.equal(event.messages.en.length,120);
});

import {characterSettingsRevision,characterRevisionSeen} from '../src/utils/characterStudio.js';
test('new published character configurations can greet without repeating identical refreshes',()=>{
  const original={enabled:true,character:'fox'},same={character:'fox',enabled:true};
  const key=characterSettingsRevision(original);
  assert.equal(key,characterSettingsRevision(same));
  assert.notEqual(key,characterSettingsRevision({...original,character:'cat'}));
  const record=JSON.stringify({revision:key,seen:true,at:1000});
  assert.equal(characterRevisionSeen(record,'session',key),true);
  assert.equal(characterRevisionSeen(record,'session',characterSettingsRevision({...original,character:'cat'})),false);
  assert.equal(characterRevisionSeen(record,'daily',key,2000),true);
  assert.equal(characterRevisionSeen(record,'daily',key,86401000),false);
  assert.equal(characterRevisionSeen('1','session',key),false);
});

test('all nine mascot identities are selectable, recolourable and localized',()=>{for(const c of CHARACTERS){assert.equal(selectCharacter({character:c.id}).id,c.id);assert.equal(styledCharacter(c,{palette:{[c.id]:'#123456'}}).color,'#123456');for(const lang of ['ka','en','ru'])assert.ok(c.lines[lang].length>0);}});

import {CHARACTER_MOTIONS} from '../src/utils/characterStudio.js';
test('all motion modes including new articulated choreography survive normalization and calendar selection',()=>{assert.equal(CHARACTER_MOTIONS.length,13);for(const behavior of CHARACTER_MOTIONS){assert.equal(normalizeCharacterSettings({behavior}).behavior,behavior);assert.equal(normalizeCharacterSettings({events:[{id:'motion',behavior}]}).events[0].behavior,behavior);}assert.equal(normalizeCharacterSettings({behavior:'unsafe'}).behavior,'run-wave');});

import {CHARACTER_GREETING_TONES,CHARACTER_INTERACTIONS,characterInteractionCopy} from '../src/utils/characterStudio.js';
test('curated greeting tones are localized and explicit copy remains authoritative',()=>{for(const [mode,lines] of Object.entries(CHARACTER_GREETING_TONES)){assert.equal(normalizeCharacterSettings({greetingMode:mode}).greetingMode,mode);for(const lang of ['ka','en','ru']){for(let i=0;i<lines.length;i++){assert.equal(characterMessage({greetingMode:mode},CHARACTERS[0],lang,(i+.5)/lines.length),lines[i][lang]);assert.ok(lines[i][lang].length<=120);}assert.equal(characterMessage({greetingMode:mode,message:'Custom'},CHARACTERS[0],lang),'Custom');}}});
test('all interaction modes are opt-in and produce localized, bounded gesture choices',()=>{for(const interaction of CHARACTER_INTERACTIONS){const settings=normalizeCharacterSettings({interaction,waveBack:true});assert.equal(settings.interaction,interaction);for(const lang of ['ka','en','ru']){const copy=characterInteractionCopy(interaction,lang);assert.ok(copy.button&&copy.reply);assert.ok(CHARACTER_MOTIONS.includes(copy.motion));}}assert.equal(normalizeCharacterSettings({interaction:'unknown'}).interaction,'wave');assert.equal(normalizeCharacterSettings({interaction:'cheer'}).waveBack,false);});

test('product and empty-search scenes are opt-in, localized and device/eligibility gated',()=>{for(const key of ['product','searchEmpty']){const settings={enabled:true,scenarios:{[key]:{enabled:true}}};assert.equal(getCharacterScenario({},key,{eligible:true}),null);assert.equal(getCharacterScenario(settings,key,{eligible:false}),null);assert.equal(getCharacterScenario({...settings,mobile:false},key,{eligible:true,mobile:true}),null);const scene=getCharacterScenario(settings,key,{eligible:true});assert.ok(scene.character);for(const lang of ['ka','en','ru'])assert.ok(scene.lines[lang].length<=120&&scene.lines[lang].length>0);}});

import {characterDisplayReason} from '../src/utils/characterStudio.js';
test('published visibility diagnostic and actual rendering share the same gates',()=>{assert.equal(characterDisplayReason(null),'unconfirmed');assert.equal(characterDisplayReason({enabled:false}),'disabled');assert.equal(characterDisplayReason({enabled:true,mobile:false},{mobile:true}),'device');assert.equal(characterDisplayReason({enabled:true},{blocked:true}),'blocked');assert.equal(characterDisplayReason({enabled:true},{route:'product'}),'page');assert.equal(characterDisplayReason({enabled:true},{route:'home'}),'ready');assert.equal(canDisplayCharacter({enabled:true},{}),false);});

import {sphereMesh,mascotRgb,foxPose} from '../src/utils/mascot3DGeometry.js';
test('flagship mesh is bounded, depth-bearing and has valid triangle indices',()=>{const mesh=sphereMesh();assert.equal(mesh.positions.length,19*25*3);assert.equal(mesh.indices.length,18*24*6);assert.ok(mesh.indices.every(i=>i<mesh.positions.length/3));assert.ok(mesh.positions.some(x=>x<-.9)&&mesh.positions.some(x=>x>.9));assert.deepEqual(mascotRgb('#ff0000'),[1,0,0]);assert.deepEqual(foxPose(8,'wave',true),foxPose(0,'wave',true));assert.notDeepEqual(foxPose(.2,'run-wave'),foxPose(.8,'run-wave'));assert.equal(normalizeCharacterAppearance({renderMode:'unsafe'}).renderMode,'auto');assert.equal(normalizeCharacterAppearance({renderMode:'vector'}).renderMode,'vector');});

import {MASCOT_3D_IDS,drawMascot3DModel} from '../src/utils/mascot3DModels.js';
test('all twelve characters have supported 3D identities and bounded distinct model geometry',()=>{assert.deepEqual(MASCOT_3D_IDS,CHARACTERS.map(c=>c.id));const signatures=new Set();for(const id of MASCOT_3D_IDS.filter(id=>id!=='fox')){const parts=[];drawMascot3DModel(id,(...args)=>parts.push(args),[.6,.4,.2],{step:.2,wave:.1,tail:.1,breath:.01},{emotion:'happy'});assert.ok(parts.length>=15&&parts.length<=65);for(const [center,scale,tint,tilt,gloss,fur] of parts){assert.ok(center.every(Number.isFinite));assert.ok(scale.every(v=>Number.isFinite(v)&&v>0));assert.ok(tint.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok([tilt,gloss,fur].every(Number.isFinite));}signatures.add(JSON.stringify(parts));}assert.equal(signatures.size,11);});

import {mascotPose,mascotLimb} from '../src/utils/mascot3DGeometry.js';
test('species-specific pose timing, finite gestures and connected limb pivots',()=>{for(const id of MASCOT_3D_IDS){const motions=new Set();for(const behavior of CHARACTER_MOTIONS){const pose=mascotPose(id,.61,behavior);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.lift>=0&&pose.lift<=.20);assert.ok(Object.values(mascotPose(id,2,behavior,true)).every(v=>v===0));motions.add(JSON.stringify(pose));}assert.ok(motions.size>=10);assert.equal(mascotPose(id,4,'run-wave').step,0);}assert.notDeepEqual(mascotPose('rabbit',.6,'run-wave'),mascotPose('bear',.6,'run-wave'));const limb=mascotLimb([.4,.1,.2],.7,1.5);assert.ok(Math.abs(Math.hypot(...limb.tip.map((v,i)=>v-[.4,.1,.2][i]))-.7)<1e-8);assert.ok(limb.center.every((v,i)=>Math.abs(v-(limb.tip[i]+[.4,.1,.2][i])*.5)<1e-8));});

import {MASCOT_LIGHTING,mascotLighting} from '../src/utils/mascot3DLighting.js';
test('lighting presets are distinct, finite and restricted to known safe values',()=>{assert.equal(normalizeCharacterAppearance({lighting:'invalid'}).lighting,'studio');assert.equal(mascotLighting('__proto__'),MASCOT_LIGHTING.studio);const seen=new Set();for(const [name,light] of Object.entries(MASCOT_LIGHTING)){assert.equal(normalizeCharacterAppearance({lighting:name}).lighting,name);assert.equal(mascotLighting(name),light);assert.ok([light.ambient,...light.key,...light.fill,...light.rim,...light.strength].every(x=>Number.isFinite(x)&&x>=0&&x<=1));seen.add(JSON.stringify(light));}assert.equal(seen.size,3);});

test('seasonal mascots are selectable without advertising fictitious discounts, with compact or enhanced sizes',()=>{for(const id of ['santa','snowman','deal'])assert.equal(selectCharacter({character:id}).id,id);assert.equal(selectCharacter({rotation:'seasonal'},new Date(2027,0,1)).id,'snowman');assert.equal(characterAppearanceStyle({mobileSize:76})['--gs-mascot-mobile'],'92px');assert.equal(characterAppearanceStyle({mobileSize:76,prominence:'compact'})['--gs-mascot-mobile'],'76px');assert.equal(normalizeCharacterAppearance({prominence:'bad'}).prominence,'enhanced');});

import {characterRepeatRecord,characterRepeatDelay,nextConciergeCharacter} from '../src/utils/characterStudio.js';
test('repeat mode persists count and cooldown, limits interruptions and supports mute',()=>{const s=normalizeCharacterSettings({enabled:true,frequency:'repeat',repeatInterval:1,repeatLimit:50,delay:2,duration:6});assert.equal(s.repeatInterval,30);assert.equal(s.repeatLimit,8);const revision=characterSettingsRevision(s);const initial=characterRepeatRecord(null,revision);assert.equal(characterRepeatDelay(s,initial,1000),2000);const record={...initial,count:1,at:1000,lastId:'fox'};assert.deepEqual(characterRepeatRecord(JSON.stringify(record),revision),record);assert.equal(characterRepeatDelay(s,record,11000),26000);assert.equal(characterRepeatDelay(s,record,37000),0);assert.equal(characterRepeatDelay(s,{...record,muted:true},99999),null);assert.equal(characterRepeatDelay(s,{...record,count:8},99999),null);assert.equal(characterRepeatRecord(record,'different').count,0);assert.equal(normalizeCharacterSettings({}).frequency,'session');});
test('concierge rotation avoids consecutive repeats and excludes seasonal specials from ordinary rotation',()=>{const record={lastId:'fox'};assert.equal(nextConciergeCharacter({rotation:'sequence'},record).id,'panda');assert.notEqual(nextConciergeCharacter({rotation:'random'},record,new Date(),()=>0).id,'fox');assert.equal(nextConciergeCharacter({rotation:'fixed',character:'santa'},record).id,'santa');assert.equal(nextConciergeCharacter({rotation:'sequence'},{lastId:'cheetah'}).id,'fox');});

import {conciergePlacement,chooseConciergeTarget,CHARACTER_GUIDE_TARGETS} from '../src/utils/characterStudio.js';
test('concierge locations alternate safely and navigation accepts only available known sections',()=>{assert.deepEqual(conciergePlacement({side:'alternate',placement:'roam'},0),{side:'left',placement:'bottom'});assert.deepEqual(conciergePlacement({side:'alternate',placement:'roam'},1),{side:'right',placement:'middle'});assert.deepEqual(conciergePlacement({side:'bad',placement:'bad'},2),{side:'left',placement:'bottom'});assert.equal(chooseConciergeTarget(['__proto__','products'],0),'products');assert.equal(chooseConciergeTarget(['categories','flash'],1),'flash');assert.equal(chooseConciergeTarget([],0),null);assert.equal(normalizeCharacterSettings({guideLinks:'true'}).guideLinks,false);assert.equal(normalizeCharacterSettings({guideLinks:true}).guideLinks,true);assert.equal(Object.keys(CHARACTER_GUIDE_TARGETS).length,3);});

import {conciergeProducts,chooseConciergeProduct} from '../src/utils/characterRecommendations.js';
test('recommendations use verified available published products and exclude previous suggestion where possible',()=>{const rows=[{id:'a',name:'Wallet',category:'Accessories',priceGEL:20,stock:3,isFeatured:true},{id:'b',name:'Coat',category:'Clothes',priceGEL:40,stock:2},{id:'c',name:'Draft',priceGEL:20,stock:5,isPublished:false},{id:'d',name:'Sold out',priceGEL:10,stock:0}];assert.deepEqual(conciergeProducts(rows,false),[]);assert.deepEqual(conciergeProducts(rows,true).map(p=>p.id),['a','b']);assert.equal(chooseConciergeProduct(rows,{ready:true,mode:'featured'}).id,'a');assert.equal(chooseConciergeProduct(rows,{ready:true,mode:'category',category:'Clothes'}).id,'b');assert.equal(chooseConciergeProduct(rows,{ready:true,excludeId:'a'}).id,'b');assert.equal(chooseConciergeProduct(rows,{ready:false}),null);assert.equal(normalizeCharacterSettings({recommendProducts:'true'}).recommendProducts,false);assert.equal(normalizeCharacterSettings({recommendationMode:'invalid'}).recommendationMode,'featured');});

import {CONCIERGE_ADVICE,normalizeConciergeAdvice,chooseConciergeAdvice} from '../src/utils/characterAdvice.js';
test('concierge advice is opt-in, localized, bounded, editable and contextual',()=>{assert.equal(chooseConciergeAdvice({}),null);assert.equal(normalizeConciergeAdvice({enabled:'true'}).enabled,false);const s={enabled:true};assert.equal(chooseConciergeAdvice(s,{characterId:'santa'}).topic,'gifts');assert.equal(chooseConciergeAdvice(s,{characterId:'deal'}).topic,'prices');assert.equal(chooseConciergeAdvice(s,{hasProduct:true}).topic,'details');assert.equal(chooseConciergeAdvice(s,{characterId:'cat'}).topic,'style');assert.equal(chooseConciergeAdvice({...s,topic:'favourites'},{characterId:'deal'}).topic,'favourites');for(const topic of Object.keys(CONCIERGE_ADVICE))for(const lang of ['ka','en','ru'])for(const index of [0,5]){const advice=chooseConciergeAdvice({...s,topic},{lang,index});assert.ok(advice.text.length>0&&advice.text.length<=160);}assert.equal(chooseConciergeAdvice({...s,topic:'style',custom:{style:{ka:'  '+ 'x'.repeat(200)}}},{lang:'ka'}).text.length,120);assert.equal(normalizeCharacterSettings({advice:{enabled:true}}).advice.enabled,true);assert.equal(normalizeConciergeAdvice({topic:'__proto__'}).topic,'auto');});

import {conciergeSaleProducts,chooseConciergeSale} from '../src/utils/characterRecommendations.js';
test('Deal Hunter selects only current unambiguous published in-stock flash offers and derives truthful savings',()=>{const now=1000000,base={id:'sale',name:'Wallet',priceGEL:25,oldPriceGEL:40,stock:2,flashSaleStartedAt:now-1000,flashSaleEndsAt:now+5000,flashSalePercent:99};const rows=[base,{...base,id:'expired',flashSaleEndsAt:now},{...base,id:'future',flashSaleStartedAt:now+1000},{...base,id:'draft',isPublished:false},{...base,id:'empty',stock:0},{...base,id:'invalid',oldPriceGEL:20},{...base,id:'variant',variants:[{}]}];assert.deepEqual(conciergeSaleProducts(rows,false,now),[]);const offers=conciergeSaleProducts(rows,true,now);assert.deepEqual(offers.map(p=>p.id),['sale']);assert.equal(offers[0].savings,15);assert.equal(offers[0].price,25);assert.equal(chooseConciergeSale(rows,{ready:true,now}).id,'sale');assert.equal(chooseConciergeSale([base],{ready:true,now:now+5000}),null);assert.equal(normalizeCharacterSettings({saleGuide:'true'}).saleGuide,false);assert.equal(normalizeCharacterSettings({saleGuidePriority:'invalid'}).saleGuidePriority,'alternate');});

import {winterConciergePresentation} from '../src/utils/characterStudio.js';
test('recurring winter concierge uses Tbilisi calendar, alternates festive characters and respects explicit events',()=>{const s={enabled:true,winterCelebration:true};const dec=new Date('2026-11-30T20:00:00Z');assert.equal(winterConciergePresentation(s,{now:dec,index:0}).character,'santa');assert.equal(winterConciergePresentation(s,{now:dec,index:1}).effect,'snow');assert.equal(winterConciergePresentation(s,{now:new Date('2027-01-14T19:59:59Z')}).character,'santa');assert.equal(winterConciergePresentation(s,{now:new Date('2027-01-14T20:00:00Z')}),null);assert.equal(winterConciergePresentation(s,{now:dec,event:{id:'explicit'}}),null);assert.equal(winterConciergePresentation({...s,winterEffects:false,winterStyle:'snowman'},{now:dec}).effect,'none');assert.equal(winterConciergePresentation({...s,winterCelebration:false},{now:dec}),null);assert.equal(normalizeCharacterSettings({effect:'snow'}).effect,'snow');assert.equal(normalizeCharacterSettings({effect:'festive'}).effect,'festive');});

import {nextConciergeAdvice,conciergeInteractionDeadline} from '../src/utils/characterAdvice.js';
test('interactive concierge picks a distinct tip and bounds active time and actions',()=>{const s={enabled:true,topic:'style'};const first=chooseConciergeAdvice(s,{lang:'en'});const next=nextConciergeAdvice(s,first,{lang:'en'});assert.equal(next.topic,'style');assert.notEqual(next.text,first.text);assert.equal(nextConciergeAdvice({enabled:false},first),null);assert.equal(conciergeInteractionDeadline(1000,5000,1),9000);assert.equal(conciergeInteractionDeadline(1000,23000,4),2000);assert.equal(conciergeInteractionDeadline(1000,26000,4),0);assert.equal(conciergeInteractionDeadline(1000,5000,5),null);assert.equal(normalizeCharacterSettings({interactiveGuide:'true'}).interactiveGuide,false);assert.equal(normalizeCharacterSettings({interactiveGuide:true}).interactiveGuide,true);});

import {CONCIERGE_PRESETS,applyConciergePreset} from '../src/utils/characterStudio.js';
test('admin concierge presets are bounded, preserve content and never enable or publish automatically',()=>{const raw={enabled:false,mobile:false,desktop:true,message:'Keep text',palette:{fox:'#112233'},advice:{custom:{gifts:{ka:'Keep advice'}}},events:[{id:'keep',theme:'newyear'}],scenarios:{flash:{character:'rabbit',message:'Keep scene'}}};for(const key of Object.keys(CONCIERGE_PRESETS)){const s=applyConciergePreset(raw,key);assert.equal(s.enabled,false);assert.equal(s.mobile,false);assert.equal(s.desktop,true);assert.equal(s.message,'Keep text');assert.equal(s.palette.fox,'#112233');assert.equal(s.advice.custom.gifts.ka,'Keep advice');assert.equal(s.events[0].id,'keep');assert.equal(s.scenarios.flash.message,'Keep scene');assert.ok(s.repeatInterval>=30&&s.repeatLimit<=8);}assert.equal(applyConciergePreset(raw,'active').frequency,'repeat');assert.equal(applyConciergePreset(raw,'quiet').interactiveGuide,false);assert.equal(applyConciergePreset(raw,'winter').winterCelebration,true);assert.equal(applyConciergePreset(raw,'sale').character,'deal');assert.deepEqual(applyConciergePreset(raw,'__proto__'),normalizeCharacterSettings(raw));});
