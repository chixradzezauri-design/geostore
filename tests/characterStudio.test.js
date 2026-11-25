import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,normalizeCharacterSettings,selectCharacter,characterMessage,canDisplayCharacter,characterAlreadySeen,getCharacterScenario,resolveCharacterSeason,canShowCharacterReaction} from '../src/utils/characterStudio.js';
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
  assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,5);
  for(let i=0;i<5;i++)assert.equal(selectCharacter({rotation:'random'},new Date(),()=>i/5).id,CHARACTERS[i].id);
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
