import React,{useEffect,useState} from 'react';
import {CHARACTER_SESSION_KEY,characterMessage,normalizeCharacterSettings,selectCharacter,resolveCharacterSeason,characterAppearanceStyle,styledCharacter,characterWaveCopy,activeCharacterEvent,applyCharacterEvent,characterSettingsRevision,characterRevisionSeen} from '../utils/characterStudio.js';
import './characterStudio.css';

const lastSeen={session:null,daily:null};
function seen(frequency,revision){
  if(characterRevisionSeen(lastSeen[frequency],frequency,revision))return true;
  try{return characterRevisionSeen((frequency==='daily'?localStorage:sessionStorage).getItem(CHARACTER_SESSION_KEY),frequency,revision);}catch{return false;}
}
function markSeen(frequency,revision){
  const record={revision,seen:true,at:Date.now()};
  lastSeen[frequency]=record;
  try{(frequency==='daily'?localStorage:sessionStorage).setItem(CHARACTER_SESSION_KEY,JSON.stringify(record));}catch{/* in-memory fallback */}
}
// Original toy-like dimensional vector figures. No WebGL or external assets.
export function CharacterArt({character,emotion='happy',season='none'}){
  const uid=React.useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const {id,color}=character;
  const robot=id==='robot',panda=id==='panda',rabbit=id==='rabbit',cat=id==='cat',fox=id==='fox',monkey=id==='monkey',bear=id==='bear',owl=id==='owl',cheetah=id==='cheetah';
  const g=n=>'url(#'+uid+'-'+n+')';
  const theme=resolveCharacterSeason(season);
  const eye=(x,y,wink=false)=><g transform={'translate('+x+' '+y+')'}>
    {wink?<path d="M-8 0Q0-8 8 0" fill="none" stroke={robot?'#99f6ff':'#35283b'} strokeWidth="3.8" strokeLinecap="round"/>:robot?
      <><rect x="-7" y="-9" width="14" height="18" rx="6" fill={g('cyan')}/><rect x="-4" y="-6" width="3" height="5" rx="1.5" fill="#fff" opacity=".75"/></>:
      <><ellipse rx={emotion==='surprise'?10:9} ry={emotion==='surprise'?13:11.5} fill={g('ivory')}/><ellipse cx="1" cy="1" rx="6.4" ry="8.4" fill={g('eye')}/><ellipse cx="-1.2" cy="-2.5" rx="2.7" ry="3.3" fill="#fff"/><circle cx="4" cy="5" r="1.2" fill="#fff" opacity=".8"/></>}
  </g>;
  return <svg className="gs-character-art" data-character-model={id} data-character-render="dimensional" viewBox="0 0 160 176" aria-hidden="true" focusable="false">
    <defs>
      {[
        ['body','#fff4db',color,'#34283a'],['fur','#fff2d7',color,'#423039'],['ivory','#fff','#fff9e9','#cdbbad'],
        ['dark','#747b91','#34364e','#121323'],['pink','#ffe0df','#f1a3b6','#b45a85'],
        ['eye','#796248','#352e3c','#111322'],['visor','#5e6d90','#273653','#101a31'],
        ['cyan','#e3ffff','#67e8f9','#0891b2'],['gold','#fff4a1','#eab54d','#a65e21']
      ].map(([name,light,mid,dark])=><radialGradient key={name} id={uid+'-'+name} cx="30%" cy="18%" r="95%"><stop offset="0" stopColor={light}/><stop offset=".48" stopColor={mid}/><stop offset="1" stopColor={dark}/></radialGradient>)}
      <radialGradient id={uid+'-shadow'}><stop stopColor="#1f2937" stopOpacity=".38"/><stop offset="1" stopColor="#1f2937" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse className="gs-character-ground" cx="80" cy="163" rx="53" ry="9" fill={g('shadow')}/>
    {fox&&<g><path d="M54 143C10 153 0 116 16 95C20 115 54 104 64 128Q69 140 54 143" fill={g('fur')}/><path d="M16 95C9 110 11 122 21 131Q23 117 38 116Q20 110 16 95" fill={g('ivory')}/></g>}
    {cat&&<path d="M104 139Q149 146 140 112Q137 103 132 109" fill="none" stroke={g('body')} strokeWidth="13" strokeLinecap="round"/>}
    {rabbit&&<circle cx="105" cy="135" r="15" fill={g('ivory')}/>}
    {monkey&&<path d="M108 143C151 158 155 113 137 112C123 110 122 130 135 128" fill="none" stroke={g('fur')} strokeWidth="11" strokeLinecap="round"/>}
    {cheetah&&<g><path d="M105 141Q147 145 145 112" stroke={g('fur')} strokeWidth="11" strokeLinecap="round" fill="none"/><path d="M145 112l-1 7" stroke="#48342a" strokeWidth="10" strokeLinecap="round"/></g>}
    <g className="gs-character-leg gs-character-leg-left"><ellipse cx="61" cy="150" rx={rabbit?19:16} ry="11" fill={g(panda||robot?'dark':'body')}/><ellipse cx="57" cy="147" rx="9" ry="3.2" fill="#fff" opacity=".2"/></g>
    <g className="gs-character-leg gs-character-leg-right"><ellipse cx="98" cy="150" rx={rabbit?19:16} ry="11" fill={g(panda||robot?'dark':'body')}/><ellipse cx="94" cy="147" rx="9" ry="3.2" fill="#fff" opacity=".2"/></g>
    {robot?<><rect x="47" y="99" width="66" height="46" rx="18" fill={g('body')}/><rect x="60" y="111" width="40" height="23" rx="8" fill={g('visor')}/><path d="M72 123h5l4-6 4 10 4-4h5" stroke="#8cf9ff" strokeWidth="2" fill="none" strokeLinecap="round"/></>:
      <><ellipse cx="80" cy="122" rx={panda?39:32} ry="30" fill={g(panda?'dark':'body')}/><ellipse cx="80" cy="128" rx={panda?29:19} ry="19" fill={g('ivory')}/></>}
    <path d="M49 112Q33 123 37 136" stroke={g(panda?'dark':'body')} strokeWidth="16" strokeLinecap="round" fill="none"/>
    <ellipse cx="36" cy="137" rx="9" ry="8" fill={g(panda?'dark':'ivory')}/>
    <g className="gs-character-hand"><path d="M108 115Q133 110 132 86" fill="none" stroke={g(panda?'dark':'body')} strokeWidth="17" strokeLinecap="round"/><ellipse cx="132" cy="82" rx="11" ry="12" transform="rotate(18 132 82)" fill={g(panda?'dark':'ivory')}/><path d="M126 79l-1-6m6 4 1-6m5 9 3-5" stroke={panda?'#9da4b3':'#ae8d7c'} strokeWidth="1.6" strokeLinecap="round" opacity=".65"/></g>
    {fox&&<><path d="M37 54Q23 29 28 9Q43 10 64 35M97 36Q115 10 132 12Q134 38 119 56" fill={g('fur')}/><path d="M36 42L35 22Q46 26 52 38M109 40l15-16-2 22" fill={g('pink')}/></>}
    {cat&&<><path d="M30 56L26 22Q26 15 34 19L66 40M94 40l31-21q8-4 8 4l-3 34" fill={g('fur')}/><path d="M35 43l-1-13 20 12M106 42l19-12-2 16" fill={g('pink')}/></>}
    {rabbit&&<><g transform="rotate(-13 57 37)"><rect x="43" y="3" width="26" height="61" rx="15" fill={g('fur')}/><rect x="51" y="11" width="11" height="42" rx="6" fill={g('pink')}/></g><g transform="rotate(13 102 37)"><rect x="89" y="3" width="26" height="61" rx="15" fill={g('fur')}/><rect x="96" y="11" width="11" height="42" rx="6" fill={g('pink')}/></g></>}
    {panda&&<><circle cx="37" cy="43" r="23" fill={g('dark')}/><circle cx="123" cy="43" r="23" fill={g('dark')}/><circle cx="37" cy="42" r="12" fill={color} opacity=".48"/><circle cx="123" cy="42" r="12" fill={color} opacity=".48"/></>}
    {(bear||monkey||cheetah)&&<g>{[37,123].map(x=><g key={x}><circle cx={x} cy={monkey?72:43} r={monkey?21:bear?20:15} fill={g('fur')}/><circle cx={x} cy={monkey?72:43} r={monkey?12:bear?11:8} fill={g('pink')} opacity=".7"/></g>)}</g>}
    {owl&&<g fill={g('fur')}><path d="M31 55L34 19 65 40Z"/><path d="M95 40l31-21 3 36Z"/></g>}
    {robot&&<><path d="M81 33V14" stroke={g('dark')} strokeWidth="6" strokeLinecap="round"/><circle cx="81" cy="12" r="10" fill={g('gold')}/><rect x="15" y="59" width="22" height="34" rx="10" fill={g('dark')}/><rect x="123" y="59" width="22" height="34" rx="10" fill={g('dark')}/></>}
    {robot?<><rect x="27" y="30" width="106" height="78" rx="30" fill={g('body')}/><rect x="36" y="39" width="88" height="59" rx="24" fill={g('visor')}/><path d="M43 58Q47 46 68 46H100" stroke="#fff" strokeOpacity=".23" strokeWidth="3" strokeLinecap="round" fill="none"/></>:
      <><ellipse cx="80" cy={rabbit?73:71} rx={bear?54:panda?52:owl?48:50} ry={monkey?43:41} fill={g(panda?'ivory':'fur')}/>
      {fox?<path d="M33 77Q49 63 79 81Q108 63 128 77Q123 105 80 111Q39 106 33 77" fill={g('ivory')}/>:!panda&&<ellipse cx="80" cy="88" rx={rabbit?30:34} ry="21" fill={g('ivory')}/>}
      {panda&&<><ellipse cx="56" cy="71" rx="16" ry="21" transform="rotate(20 56 71)" fill={g('dark')}/><ellipse cx="104" cy="71" rx="16" ry="21" transform="rotate(-20 104 71)" fill={g('dark')}/></>}
      {monkey&&<path d="M80 56C54 31 31 61 43 80Q39 108 80 111Q122 108 117 80C129 61 105 31 80 56Z" fill={g('ivory')}/>}
      {bear&&<ellipse cx="80" cy="91" rx="29" ry="19" fill={g('ivory')}/>}
      {owl&&<g fill={g('ivory')}><ellipse cx="58" cy="67" rx="25" ry="29" transform="rotate(13 58 67)"/><ellipse cx="102" cy="67" rx="25" ry="29" transform="rotate(-13 102 67)"/></g>}
      {cheetah&&<g fill="#493427" opacity=".83">{[[44,49,3],[56,42,2.5],[76,39,3],[94,44,2.6],[116,51,3],[36,63,2.7],[124,63,2.7],[44,79,2],[116,79,2]].map(([x,y,r],j)=><circle key={j} cx={x} cy={y} r={r}/>)}<path d="M52 75q1 13 9 18l-3-13M108 75q-1 13-9 18l3-13"/></g>}
      {!panda&&!owl&&!cheetah&&<><ellipse cx="47" cy="88" rx="9" ry="4" fill="#ef83a1" opacity=".42"/><ellipse cx="113" cy="88" rx="9" ry="4" fill="#ef83a1" opacity=".42"/></>}
      <path d="M42 53Q55 37 75 37" fill="none" stroke="#fff" strokeWidth="3.5" strokeOpacity=".36" strokeLinecap="round"/></>}
    <g className="gs-character-eyes">{eye(60,robot?66:69)}{eye(100,robot?66:69,emotion==='wink')}</g>
    {!robot&&(owl?<path d="M73 81Q80 76 87 81L80 95Z" fill={g('gold')}/>:<path d="M72 83Q80 78 88 83Q88 89 80 91Q72 89 72 83" fill={g('dark')}/>)}
    {emotion==='surprise'?<ellipse cx="80" cy={robot?84:99} rx="5.5" ry="7" fill={robot?'#92f9ff':'#543344'}/>:robot?<path d="M71 83Q80 92 89 83" fill="none" stroke="#8ef7ff" strokeWidth="3.4" strokeLinecap="round"/>:<g><path d="M71 95Q80 110 89 95Q80 100 71 95" fill="#60354a"/><path d="M76 102Q80 99 84 102L80 105Z" fill="#f7a5ad"/>{rabbit&&<rect x="77" y="95" width="6" height="4" rx="1" fill="#fff"/>}</g>}
    {cat&&<path d="M43 88l-14-4m15 9-15 2m88-7 14-4m-15 9 15 2" stroke="#633949" strokeWidth="1.4" strokeLinecap="round" opacity=".65"/>}
    {fox&&<path d="M74 115l12 3-6 8z" fill={g('gold')}/>}
    {cat&&<g fill={g('gold')}><path d="M70 117l10 6 10-6v12l-10-5-10 5z"/><circle cx="80" cy="123" r="3"/></g>}
    {owl&&<g stroke="#806651" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".75">{[0,1,2].map(j=><path key={j} d={'M'+(67+j*3)+' '+(118+j*8)+'q10 10 20 0'}/>)}</g>}
    {bear&&<g fill={g('gold')}><path d="M61 112l19 9 19-9-7 15H68Z"/><circle cx="80" cy="123" r="5"/></g>}
    {cheetah&&<g fill="#493427" opacity=".8">{[[52,118],[58,134],[105,116],[103,139],[74,149],[96,151]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r="2.6"/>)}</g>}
    {!robot&&!cat&&!fox&&!bear&&!owl&&<g><circle cx="80" cy="128" r="8" fill={g('gold')}/><text x="80" y="131.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#563719">G</text></g>}
    {theme==='winter'&&<g><path d="M45 108Q80 120 115 108L111 119Q80 130 49 119Z" fill="#be123c"/><path d="M99 119l-3 22 12 3 5-23" fill="#be123c"/><path d="M97 137l12 3" stroke="#fff" strokeWidth="3"/></g>}
    {theme==='hearts'&&<path d="M15 23C2 10-3 31 15 39C33 31 28 10 15 23Z" fill={g('pink')}/>}
    {theme==='summer'&&<g fill={g('gold')}><circle cx="145" cy="20" r="9"/><path d="M145 5v5m0 20v5M130 20h5m20 0h5M134 9l4 4m14 14 4 4M134 31l4-4m14-14 4-4" stroke="#d79a22" strokeWidth="2" strokeLinecap="round"/></g>}
    {theme==='autumn'&&<path d="M136 10Q159 6 151 28Q132 33 136 10Z" fill={g('gold')}/>}
  </svg>;
}
function CharacterEffects({effect}){
  if(!['sparkles','hearts','confetti'].includes(effect))return null;
  return <span className="gs-character-effects" data-effect={effect} aria-hidden="true">{Array.from({length:5},(_,i)=><span key={i} style={{'--gs-effect-i':i}}>{effect==='hearts'?'♥':effect==='sparkles'?'✦':'●'}</span>)}</span>;
}
export function CharacterScene({character,settings,lang='ka',preview=false,onClose}){
  const [variant]=useState(()=>Math.random());
  const [greetingDate]=useState(()=>new Date());
  const [waved,setWaved]=useState(false);
  const wave=characterWaveCopy(lang);
  const interactive=settings.waveBack&&settings.behavior!=='still';
  return <div className={'gs-character-scene'+(preview?' gs-character-preview-scene':'')} data-side={settings.side} data-motion={waved?'celebrate':settings.behavior} style={characterAppearanceStyle(settings.appearance)}>
    <div className="gs-character-figure" key={waved?'reply':'greeting'}><div className="gs-character-body-rig"><CharacterArt character={styledCharacter(character,settings)} emotion={waved?'happy':settings.emotion} season={settings.season}/></div>{settings.behavior!=='still'&&<CharacterEffects effect={waved?'sparkles':settings.effect}/>}</div>
    <div className="gs-character-bubble">
      <strong>{character.name}</strong><span aria-live={interactive?'polite':undefined}>{waved?wave.reply:characterMessage(settings,character,lang,variant,greetingDate)}</span>
      {interactive&&!waved&&<button type="button" className="gs-character-wave-back" onClick={()=>setWaved(true)}>{wave.button} 👋</button>}
      {!preview&&<button type="button" className="gs-character-dismiss" aria-label={lang==='ka'?'მისალმების დახურვა':lang==='ru'?'Закрыть приветствие':'Close greeting'} onClick={onClose}>×</button>}
    </div>
  </div>;
}
// Contextual characters are in-flow decorations, not additional floating popups.
export function CharacterContextCard({scenario,lang='ka'}){
  if(!scenario)return null;
  return <div className="gs-character-context" style={characterAppearanceStyle(scenario.appearance)}>
    <div className="gs-character-context-art"><CharacterArt character={scenario.character} emotion={scenario.emotion} season={scenario.season}/></div>
    <div className="gs-character-context-copy"><strong>{scenario.character.name}</strong><span>{scenario.message||scenario.lines[lang]||scenario.lines.ka}</span></div>
  </div>;
}
export function CharacterReaction({scenario,lang='ka'}){
  if(!scenario)return null;
  return <span className="gs-character-reaction">
    <span className="gs-character-reaction-art"><CharacterArt character={scenario.character} emotion={scenario.emotion} season={scenario.season}/></span>
    <span className="gs-character-reaction-copy">{scenario.message||scenario.lines[lang]||scenario.lines.ka}</span>
  </span>;
}
export default function CharacterMascot({settings,lang}){
  const s=normalizeCharacterSettings(settings);
  const [presentation,setPresentation]=useState(null);
  const settingsKey=JSON.stringify(s);
  useEffect(()=>{
    setPresentation(null);
    const current=JSON.parse(settingsKey);
    const revision=characterSettingsRevision(current);
    if(!current.enabled||seen(current.frequency,revision))return;
    let closeTimer;
    const showTimer=setTimeout(()=>{
      if(seen(current.frequency,revision))return;
      markSeen(current.frequency,revision);
      const now=new Date();
      const effective=applyCharacterEvent(current,activeCharacterEvent(current,now),lang);
      setPresentation({character:selectCharacter(effective,now),settings:effective});
      closeTimer=setTimeout(()=>setPresentation(null),current.duration*1000);
    },current.delay*1000);
    return()=>{clearTimeout(showTimer);clearTimeout(closeTimer);};
  },[settingsKey,lang]);
  return presentation?<CharacterScene character={presentation.character} settings={presentation.settings} lang={lang} onClose={()=>setPresentation(null)}/>:null;
}
