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
  assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,9);
  for(let i=0;i<CHARACTERS.length;i++)assert.equal(selectCharacter({rotation:'random'},new Date(),()=>(i+.5)/CHARACTERS.length).id,CHARACTERS[i].id);
  assert.equal(selectCharacter({rotation:'fixed',character:'cat'}).id,'cat');
  assert.equal(selectCharacter({rotation:'daypart'},new Date(2026,5,1,9)).id,'fox');
  assert.equal(selectCharacter({rotation:'seasonal'},new Date(2026,11,1)).id,'panda');
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
  assert.deepEqual(a,{desktopSize:144,mobileSize:56,lift:48,fontSize:15,bubbleColor:'#fffdf7',bubbleShape:'rounded'});
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
