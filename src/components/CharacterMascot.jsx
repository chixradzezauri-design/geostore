import React,{useEffect,useState} from 'react';
import {CHARACTER_SESSION_KEY,characterAlreadySeen,characterMessage,normalizeCharacterSettings,selectCharacter} from '../utils/characterStudio.js';
import './characterStudio.css';

let seenInMemory=false;
let seenDaily=0;
function seen(frequency){
  if(frequency==='session'&&seenInMemory)return true;
  if(frequency==='daily'&&characterAlreadySeen(seenDaily,frequency))return true;
  try{return characterAlreadySeen(frequency==='daily'?localStorage.getItem(CHARACTER_SESSION_KEY):sessionStorage.getItem(CHARACTER_SESSION_KEY),frequency);}catch{return false;}
}
function markSeen(frequency){
  seenInMemory=true;
  if(frequency==='daily')seenDaily=Date.now();
  try{
    if(frequency==='daily')localStorage.setItem(CHARACTER_SESSION_KEY,String(seenDaily));
    else sessionStorage.setItem(CHARACTER_SESSION_KEY,'1');
  }catch{/* storage may be unavailable; the in-memory guard still applies */}
}
export function CharacterArt({character}){
  const {id,color}=character;
  const robot=id==='robot', panda=id==='panda', rabbit=id==='rabbit',cat=id==='cat',fox=id==='fox';
  const dark='#17233b', cream='#fff4dc';
  return <svg className="gs-character-art" viewBox="0 0 120 130" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="121" rx="37" ry="5" fill="#17233b" opacity=".15"/>
    {fox&&<path d="M39 103Q3 107 8 76Q19 69 37 84L51 93" fill={color} stroke={dark} strokeWidth="3" strokeLinejoin="round"/>}
    {cat&&<path d="M81 100Q114 100 104 75" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"/>}
    <g className="gs-character-leg"><path d="M45 103l-7 13h16l3-13" fill={dark}/><path d="M65 103l3 13h16l-7-13" fill={dark}/></g>
    <rect x="35" y="73" width="50" height="37" rx="18" fill={color} stroke={dark} strokeWidth="3"/>
    <path d="M49 82h22v13q-11 11-22 0z" fill={cream}/>
    <path d="M43 86Q25 93 26 102" stroke={dark} strokeWidth="10" strokeLinecap="round" fill="none"/>
    <path d="M43 86Q25 93 26 102" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
    <g className="gs-character-hand"><path d="M79 87Q101 84 100 61" fill="none" stroke={dark} strokeWidth="12" strokeLinecap="round"/><path d="M79 87Q101 84 100 61" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"/><circle cx="100" cy="58" r="7" fill={cream} stroke={dark} strokeWidth="2"/></g>
    {(fox||cat)&&<><path d="M30 40L24 10 51 28M69 28L96 10 90 40" fill={color} stroke={dark} strokeWidth="3" strokeLinejoin="round"/><path d="M30 29l-2-11 12 11M80 29l12-11-2 11" fill="#ffd8ce"/></>}
    {rabbit&&<><rect x="35" y="3" width="17" height="43" rx="9" fill={color} stroke={dark} strokeWidth="3" transform="rotate(-12 43 25)"/><rect x="67" y="3" width="17" height="43" rx="9" fill={color} stroke={dark} strokeWidth="3" transform="rotate(12 75 25)"/><path d="M42 13l3 20M77 13l-4 20" stroke="#ffd8ef" strokeWidth="5" strokeLinecap="round"/></>}
    {panda&&<><circle cx="30" cy="32" r="14" fill={dark}/><circle cx="90" cy="32" r="14" fill={dark}/></>}
    {robot&&<><path d="M60 25V10" stroke={dark} strokeWidth="3"/><circle cx="60" cy="8" r="5" fill="#facc15" stroke={dark} strokeWidth="2"/><rect x="16" y="43" width="12" height="23" rx="5" fill={color} stroke={dark} strokeWidth="2"/><rect x="92" y="43" width="12" height="23" rx="5" fill={color} stroke={dark} strokeWidth="2"/></>}
    <rect x="24" y="25" width="72" height="57" rx={robot?13:29} fill={panda?'#fafaf9':color} stroke={dark} strokeWidth="3"/>
    {robot?<rect x="33" y="35" width="54" height="34" rx="10" fill={dark}/>:<path d="M31 58Q45 47 60 58Q75 47 89 58Q88 77 60 79Q32 77 31 58" fill={cream}/>}
    {panda&&<><ellipse cx="44" cy="49" rx="11" ry="13" fill={dark} transform="rotate(18 44 49)"/><ellipse cx="76" cy="49" rx="11" ry="13" fill={dark} transform="rotate(-18 76 49)"/></>}
    <circle cx="44" cy="49" r="4.5" fill={robot||panda?'#fff':dark}/><circle cx="76" cy="49" r="4.5" fill={robot||panda?'#fff':dark}/>
    {!robot&&<path d="M55 60q5-5 10 0l-5 4z" fill={dark}/>}
    <path d={robot?'M52 60q8 7 16 0':'M53 67q7 8 14 0'} fill="none" stroke={robot?'#67e8f9':dark} strokeWidth="2.5" strokeLinecap="round"/>
    {cat&&<path d="M32 60l-10-3m11 9-11 3m66-9 10-3m-11 9 11 3" fill="none" stroke={dark} strokeWidth="1.5" strokeLinecap="round"/>}
    <text x="60" y="94" textAnchor="middle" fontSize="10" fontWeight="900" fill={dark}>G</text>
  </svg>;
}
export function CharacterScene({character,settings,lang='ka',preview=false,onClose}){
  return <div className={'gs-character-scene'+(preview?' gs-character-preview-scene':'')} data-side={settings.side} data-motion={settings.behavior}>
    <div className="gs-character-figure"><CharacterArt character={character}/></div>
    <div className="gs-character-bubble">
      <strong>{character.name}</strong><span>{characterMessage(settings,character,lang)}</span>
      {!preview&&<button type="button" className="gs-character-dismiss" aria-label={lang==='ka'?'მისალმების დახურვა':lang==='ru'?'Закрыть приветствие':'Close greeting'} onClick={onClose}>×</button>}
    </div>
  </div>;
}
export default function CharacterMascot({settings,lang}){
  const s=normalizeCharacterSettings(settings);
  const [character,setCharacter]=useState(null);
  useEffect(()=>{
    if(!s.enabled||seen(s.frequency))return;
    let closeTimer;
    const showTimer=setTimeout(()=>{
      if(seen(s.frequency))return;
      markSeen(s.frequency);
      setCharacter(selectCharacter(s));
      closeTimer=setTimeout(()=>setCharacter(null),s.duration*1000);
    },s.delay*1000);
    return()=>{clearTimeout(showTimer);clearTimeout(closeTimer);};
  },[s.enabled,s.character,s.rotation,s.behavior,s.side,s.delay,s.duration,s.frequency,s.message]);
  return character?<CharacterScene character={character} settings={s} lang={lang} onClose={()=>setCharacter(null)}/>:null;
}
