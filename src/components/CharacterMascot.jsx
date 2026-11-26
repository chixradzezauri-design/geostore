import React,{useEffect,useRef,useState} from 'react';
import {CHARACTERS,CHARACTER_SESSION_KEY,characterMessage,normalizeCharacterSettings,selectCharacter,resolveCharacterSeason,characterAppearanceStyle,styledCharacter,characterInteractionCopy,activeCharacterEvent,applyCharacterEvent,winterConciergePresentation,characterSettingsRevision,characterRevisionSeen,CHARACTER_REPEAT_KEY,characterRepeatRecord,characterRepeatDelay,nextConciergeCharacter,conciergePlacement,chooseConciergeTarget,CHARACTER_GUIDE_TARGETS,applyCharacterProfile,chooseCharacterGuideTarget,blackFridayWindow} from '../utils/characterStudio.js';
import './characterStudio.css';
import {chooseConciergeAdvice,CONCIERGE_ADVICE_LABEL,nextConciergeAdvice,CONCIERGE_INTERACTIVE_COPY,conciergeInteractionDeadline,CONCIERGE_HELP_COPY,conciergeHelpChoices,conciergeHelpRequest} from '../utils/characterAdvice.js';
import {conciergeProducts,chooseConciergeProduct,CONCIERGE_PRODUCT_COPY,conciergeSaleProducts,chooseConciergeSale,CONCIERGE_SALE_COPY,conciergeRecommendationPool} from '../utils/characterRecommendations.js';
import {MASCOT_3D_IDS} from '../utils/mascot3DModels.js';
const FlagshipFox3D=React.lazy(()=>import('./FlagshipFox3D.jsx'));
class Mascot3DBoundary extends React.Component{
  constructor(props){super(props);this.state={failed:false};}
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}


const lastSeen={session:null,daily:null};
let lastForcedReplay=null;
let repeatMemory=null;
function readRepeat(revision){
  try{const stored=sessionStorage.getItem(CHARACTER_REPEAT_KEY);if(stored)return characterRepeatRecord(stored,revision);}catch{}
  return characterRepeatRecord(repeatMemory,revision);
}
function saveRepeat(record){repeatMemory=record;try{sessionStorage.setItem(CHARACTER_REPEAT_KEY,JSON.stringify(record));}catch{}}
function visibleGuideTarget(key){
  const entry=Object.hasOwn(CHARACTER_GUIDE_TARGETS,key)?CHARACTER_GUIDE_TARGETS[key]:null;
  if(!entry)return null;
  const node=document.querySelector('.geostore-storefront '+entry.selector);
  return node&&node.getClientRects().length&&node.offsetWidth>0&&node.offsetHeight>0&&getComputedStyle(node).visibility!=='hidden'?node:null;
}
function guideToSection(key){
  const node=visibleGuideTarget(key);if(!node)return false;
  node.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  const focus=node.querySelector('button:not([disabled]),a[href]');if(focus)focus.focus({preventScroll:true});
  return true;
}
function visitorBusy(){const el=document.activeElement;return document.visibilityState!=='visible'||Boolean(el?.matches?.('input,textarea,select,[contenteditable="true"]'));}
function seen(frequency,revision){
  if(characterRevisionSeen(lastSeen[frequency],frequency,revision))return true;
  try{return characterRevisionSeen((frequency==='daily'?localStorage:sessionStorage).getItem(CHARACTER_SESSION_KEY),frequency,revision);}catch{return false;}
}
function markSeen(frequency,revision){
  const record={revision,seen:true,at:Date.now()};
  lastSeen[frequency]=record;
  try{(frequency==='daily'?localStorage:sessionStorage).setItem(CHARACTER_SESSION_KEY,JSON.stringify(record));}catch{/* in-memory fallback */}
}
// Original articulated dimensional vector figures; species-specific silhouette and material details. No WebGL or external assets.
export function CharacterArt({character,emotion='happy',season='none'}){
  const uid=React.useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const {id,color}=character;
  const santa=id==='santa',snow=id==='snowman',deal=id==='deal';
  const robot=id==='robot'||deal,panda=id==='panda',rabbit=id==='rabbit',cat=id==='cat',fox=id==='fox',monkey=id==='monkey',bear=id==='bear'||santa||snow,owl=id==='owl',cheetah=id==='cheetah';
  const g=n=>'url(#'+uid+'-'+n+')';
  const theme=resolveCharacterSeason(season);
  const bodyWidth=bear?40:panda?39:owl?34:cheetah?26:monkey?27:32;
  const eyeSize=owl?1.32:bear?.88:cheetah?.85:fox?.94:1;
  const muzzle=fox||cheetah||bear||cat;
  const textureStroke=panda?'#675b5a':color;
  const eye=(x,y,wink=false)=><g transform={'translate('+x+' '+y+') scale('+eyeSize+')'}>
    {wink?<path d="M-8 0Q0-8 8 0" fill="none" stroke={robot?'#99f6ff':'#35283b'} strokeWidth="3.8" strokeLinecap="round"/>:robot?
      <><rect x="-7" y="-9" width="14" height="18" rx="6" fill={g('cyan')}/><rect x="-4" y="-6" width="3" height="5" rx="1.5" fill="#fff" opacity=".75"/></>:
      <><ellipse rx={emotion==='surprise'?10:9} ry={emotion==='surprise'?13:11.5} fill={g('ivory')}/><ellipse cx="1" cy="1" rx="6.4" ry="8.4" fill={g('eye')}/><ellipse cx="-1.2" cy="-2.5" rx="2.7" ry="3.3" fill="#fff"/><circle cx="4" cy="5" r="1.2" fill="#fff" opacity=".8"/></>}
  </g>;
  return <svg className="gs-character-art" data-character-model={id} data-character-render="dimensional" data-character-material={robot?'metal':owl?'feathers':snow?'snow':santa?'fabric':'fur'} viewBox="0 0 160 176" aria-hidden="true" focusable="false">
    <defs>
      {[
        ['body','#fff4db',color,'#34283a'],['fur','#fff2d7',color,'#423039'],['ivory','#fff','#fff9e9','#cdbbad'],
        ['dark','#747b91','#34364e','#121323'],['pink','#ffe0df','#f1a3b6','#b45a85'],
        ['eye','#796248','#352e3c','#111322'],['visor','#5e6d90','#273653','#101a31'],
        ['cyan','#e3ffff','#67e8f9','#0891b2'],['gold','#fff4a1','#eab54d','#a65e21']
      ].map(([name,light,mid,dark])=><radialGradient key={name} id={uid+'-'+name} cx="30%" cy="18%" r="95%"><stop offset="0" stopColor={light}/><stop offset=".48" stopColor={mid}/><stop offset="1" stopColor={dark}/></radialGradient>)}
      <radialGradient id={uid+'-shadow'}><stop stopColor="#1f2937" stopOpacity=".38"/><stop offset="1" stopColor="#1f2937" stopOpacity="0"/></radialGradient>
      <linearGradient id={uid+'-metal'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".22" stopColor={color}/><stop offset=".55" stopColor="#617188"/><stop offset=".72" stopColor={color}/><stop offset="1" stopColor="#202b3d"/></linearGradient>
      <radialGradient id={uid+'-muzzle'} cx="38%" cy="25%" r="76%"><stop stopColor="#fffaf1"/><stop offset=".65" stopColor="#e7d3b5"/><stop offset="1" stopColor="#a79079"/></radialGradient>
    </defs>
    <ellipse className="gs-character-ground" cx="80" cy="163" rx="53" ry="9" fill={g('shadow')}/>
    {fox&&<g className="gs-character-tail"><path d="M54 143C10 153 0 116 16 95C20 115 54 104 64 128Q69 140 54 143" fill={g('fur')}/><path d="M16 95C9 110 11 122 21 131Q23 117 38 116Q20 110 16 95" fill={g('ivory')}/></g>}
    {cat&&<path className="gs-character-tail" d="M104 139Q149 146 140 112Q137 103 132 109" fill="none" stroke={g('body')} strokeWidth="13" strokeLinecap="round"/>}
    {rabbit&&<circle cx="105" cy="135" r="15" fill={g('ivory')}/>}
    {monkey&&<path className="gs-character-tail" d="M108 143C151 158 155 113 137 112C123 110 122 130 135 128" fill="none" stroke={g('fur')} strokeWidth="11" strokeLinecap="round"/>}
    {cheetah&&<g className="gs-character-tail"><path d="M105 141Q147 145 145 112" stroke={g('fur')} strokeWidth="11" strokeLinecap="round" fill="none"/><path d="M145 112l-1 7" stroke="#48342a" strokeWidth="10" strokeLinecap="round"/></g>}
    <g className="gs-character-leg gs-character-leg-left"><ellipse cx="61" cy="150" rx={rabbit?19:16} ry="11" fill={g(panda||robot?'dark':'body')}/><ellipse cx="57" cy="147" rx="9" ry="3.2" fill="#fff" opacity=".2"/></g>
    <g className="gs-character-leg gs-character-leg-right"><ellipse cx="98" cy="150" rx={rabbit?19:16} ry="11" fill={g(panda||robot?'dark':'body')}/><ellipse cx="94" cy="147" rx="9" ry="3.2" fill="#fff" opacity=".2"/></g>
    {robot?<><rect x="47" y="99" width="66" height="46" rx="18" fill={g('body')}/><rect x="60" y="111" width="40" height="23" rx="8" fill={g('visor')}/><path d="M72 123h5l4-6 4 10 4-4h5" stroke="#8cf9ff" strokeWidth="2" fill="none" strokeLinecap="round"/></>:
      <><ellipse cx="80" cy="122" rx={bodyWidth} ry={cheetah||monkey?32:30} fill={g(panda?'dark':'body')}/><ellipse cx="80" cy="128" rx={panda?29:19} ry="19" fill={g('ivory')}/></>}
    <g className="gs-character-arm-free">{owl?<path d="M51 108Q24 117 30 142Q47 135 56 117Z" fill={g('fur')}/>:<><path d="M49 112Q33 123 37 136" stroke={g(robot?'metal':panda?'dark':'body')} strokeWidth={monkey?11:16} strokeLinecap="round" fill="none"/><ellipse cx="36" cy="137" rx="9" ry="8" fill={g(panda?'dark':'ivory')}/></>}</g>
    <g className="gs-character-hand"><path d="M108 115Q133 110 132 86" fill="none" stroke={g(panda?'dark':'body')} strokeWidth="17" strokeLinecap="round"/><ellipse cx="132" cy="82" rx="11" ry="12" transform="rotate(18 132 82)" fill={g(panda?'dark':'ivory')}/><path d="M126 79l-1-6m6 4 1-6m5 9 3-5" stroke={panda?'#9da4b3':'#ae8d7c'} strokeWidth="1.6" strokeLinecap="round" opacity=".65"/></g>
    <g className="gs-character-head">
    {fox&&<><path d="M37 54Q23 29 28 9Q43 10 64 35M97 36Q115 10 132 12Q134 38 119 56" fill={g('fur')}/><path d="M36 42L35 22Q46 26 52 38M109 40l15-16-2 22" fill={g('pink')}/></>}
    {cat&&<><path d="M30 56L26 22Q26 15 34 19L66 40M94 40l31-21q8-4 8 4l-3 34" fill={g('fur')}/><path d="M35 43l-1-13 20 12M106 42l19-12-2 16" fill={g('pink')}/></>}
    {rabbit&&<><g transform="rotate(-13 57 37)"><rect x="43" y="3" width="26" height="61" rx="15" fill={g('fur')}/><rect x="51" y="11" width="11" height="42" rx="6" fill={g('pink')}/></g><g transform="rotate(13 102 37)"><rect x="89" y="3" width="26" height="61" rx="15" fill={g('fur')}/><rect x="96" y="11" width="11" height="42" rx="6" fill={g('pink')}/></g></>}
    {panda&&<><circle cx="37" cy="43" r="23" fill={g('dark')}/><circle cx="123" cy="43" r="23" fill={g('dark')}/><circle cx="37" cy="42" r="12" fill={color} opacity=".48"/><circle cx="123" cy="42" r="12" fill={color} opacity=".48"/></>}
    {(bear||monkey||cheetah)&&!santa&&!snow&&<g>{[37,123].map(x=><g key={x}><circle cx={x} cy={monkey?72:43} r={monkey?21:bear?20:15} fill={g('fur')}/><circle cx={x} cy={monkey?72:43} r={monkey?12:bear?11:8} fill={g('pink')} opacity=".7"/></g>)}</g>}
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
    {muzzle&&<g className="gs-character-muzzle"><ellipse cx="70" cy="88" rx={fox?17:13} ry="11" fill={g('muzzle')}/><ellipse cx="90" cy="88" rx={fox?17:13} ry="11" fill={g('muzzle')}/></g>}
    {!robot&&!owl&&<g fill="none" stroke={textureStroke} strokeWidth=".8" opacity=".42" strokeLinecap="round">{Array.from({length:10},(_,i)=><path key={i} d={'M'+(42+i*8)+' '+(47+Math.abs(4.5-i)*2.3)+'q-2 -3 1 -7'}/>)}</g>}
    {robot&&<g stroke="#7e95ac" strokeWidth="1.2" opacity=".7"><path d="M32 49l8-9M120 43l8 9M32 91l9 8M119 99l9-8"/><circle cx="32" cy="72" r="2" fill="#c9dae5"/><circle cx="128" cy="72" r="2" fill="#c9dae5"/></g>}
    <g className="gs-character-eyes">{eye(60,robot?66:69)}{eye(100,robot?66:69,emotion==='wink')}</g>
    {!robot&&(owl?<path d="M73 81Q80 76 87 81L80 95Z" fill={g('gold')}/>:<path d="M72 83Q80 78 88 83Q88 89 80 91Q72 89 72 83" fill={g('dark')}/>)}
    {emotion==='surprise'?<ellipse cx="80" cy={robot?84:99} rx="5.5" ry="7" fill={robot?'#92f9ff':'#543344'}/>:robot?<path d="M71 83Q80 92 89 83" fill="none" stroke="#8ef7ff" strokeWidth="3.4" strokeLinecap="round"/>:<g><path d="M71 95Q80 110 89 95Q80 100 71 95" fill="#60354a"/><path d="M76 102Q80 99 84 102L80 105Z" fill="#f7a5ad"/>{rabbit&&<rect x="77" y="95" width="6" height="4" rx="1" fill="#fff"/>}</g>}
    {cat&&<path d="M43 88l-14-4m15 9-15 2m88-7 14-4m-15 9 15 2" stroke="#633949" strokeWidth="1.4" strokeLinecap="round" opacity=".65"/>}
    {(fox||cheetah)&&<g fill="#6b5243" opacity=".75">{[[62,89],[67,91],[62,94],[98,89],[93,91],[98,94]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r=".9"/>)}</g>}
    </g>
    {!robot&&!owl&&<g stroke={textureStroke} strokeWidth=".8" fill="none" opacity=".35" strokeLinecap="round">{Array.from({length:7},(_,i)=><path key={i} d={'M'+(52+i*9)+' 137l2 4'}/>)}</g>}
    {fox&&<path d="M74 115l12 3-6 8z" fill={g('gold')}/>}
    {cat&&<g fill={g('gold')}><path d="M70 117l10 6 10-6v12l-10-5-10 5z"/><circle cx="80" cy="123" r="3"/></g>}
    {owl&&<g stroke="#806651" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".75">{[0,1,2].map(j=><path key={j} d={'M'+(67+j*3)+' '+(118+j*8)+'q10 10 20 0'}/>)}</g>}
    {bear&&<g fill={g('gold')}><path d="M61 112l19 9 19-9-7 15H68Z"/><circle cx="80" cy="123" r="5"/></g>}
    {cheetah&&<g fill="#493427" opacity=".8">{[[52,118],[58,134],[105,116],[103,139],[74,149],[96,151]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r="2.6"/>)}</g>}
    {!robot&&!cat&&!fox&&!bear&&!owl&&<g><circle cx="80" cy="128" r="8" fill={g('gold')}/><text x="80" y="131.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#563719">G</text></g>}
    {santa&&<g><path d="M40 47Q45 4 88 8Q125 9 126 44L111 39Q104 17 95 30L95 45Z" fill="#c82438"/><path d="M39 43Q78 36 120 43L120 54Q78 48 39 55Z" fill={g('ivory')}/><circle cx="126" cy="45" r="9" fill={g('ivory')}/><path d="M42 88Q51 122 80 119Q110 122 118 88Q100 101 91 94Q80 108 69 94Q56 101 42 88" fill={g('ivory')}/><path d="M50 126h60v8H50z" fill="#20232d"/><rect x="74" y="124" width="13" height="12" rx="2" fill={g('gold')}/></g>}
    {snow&&<g><path d="M43 43h74v8H43z" fill="#283344"/><rect x="56" y="15" width="48" height="32" rx="6" fill={g('dark')}/><path d="M56 38h48v7H56z" fill="#c72839"/><path d="M78 83l27 7-27 6z" fill="#f39a2d"/><circle cx="80" cy="122" r="3" fill="#293040"/><circle cx="80" cy="139" r="3" fill="#293040"/></g>}
    {deal&&<g><path d="M92 112l30-12 17 14-17 28-30-11z" fill="#e5b74c"/><circle cx="124" cy="111" r="3" fill="#25242a"/><text x="113" y="127" fontSize="19" fontWeight="900" textAnchor="middle" fill="#25242a">%</text></g>}
    {theme==='winter'&&<g><path d="M45 108Q80 120 115 108L111 119Q80 130 49 119Z" fill="#be123c"/><path d="M99 119l-3 22 12 3 5-23" fill="#be123c"/><path d="M97 137l12 3" stroke="#fff" strokeWidth="3"/></g>}
    {theme==='hearts'&&<path d="M15 23C2 10-3 31 15 39C33 31 28 10 15 23Z" fill={g('pink')}/>}
    {theme==='summer'&&<g fill={g('gold')}><circle cx="145" cy="20" r="9"/><path d="M145 5v5m0 20v5M130 20h5m20 0h5M134 9l4 4m14 14 4 4M134 31l4-4m14-14 4-4" stroke="#d79a22" strokeWidth="2" strokeLinecap="round"/></g>}
    {theme==='autumn'&&<path d="M136 10Q159 6 151 28Q132 33 136 10Z" fill={g('gold')}/>}
  </svg>;
}
function CharacterEffects({effect}){
  const symbols={sparkles:['✦'],hearts:['♥'],confetti:['●'],snow:['❄','·','❅'],festive:['✦','✧','●']};
  if(!Object.hasOwn(symbols,effect))return null;
  const seasonal=effect==='snow'||effect==='festive';
  return <span className="gs-character-effects" data-effect={effect} aria-hidden="true">{Array.from({length:seasonal?8:5},(_,i)=><span key={i} style={{'--gs-effect-i':i,'--gs-effect-x':(i*37)%93+'%','--gs-effect-delay':(i%4)*.22+'s'}}>{symbols[effect][i%symbols[effect].length]}</span>)}</span>;
}
export function CharacterScene({character,settings,lang='ka',preview=false,interactivePreview=false,visitorPreview=false,onClose,onMute,guideTarget=null,onGuide,recommendation=null,onRecommend,advice=null,onNextTip,onNextProduct,onThanks,onActivity,onHelp,interactionNotice='',actionCount=0}){
  const [variant]=useState(()=>Math.random());
  const [greetingDate]=useState(()=>new Date());
  const [waved,setWaved]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const detailsId=React.useId();
  const copy=CONCIERGE_INTERACTIVE_COPY[lang]||CONCIERGE_INTERACTIVE_COPY.ka;
  const helpCopy=CONCIERGE_HELP_COPY[lang]||CONCIERGE_HELP_COPY.ka;
  const helpOptions=onHelp?conciergeHelpChoices(settings):[];
  const showActions=!preview||interactivePreview;
  const hasGuideActions=showActions&&settings.interactiveGuide&&actionCount<4;
  const wave=characterInteractionCopy(settings.interaction,lang);
  const target=Object.hasOwn(CHARACTER_GUIDE_TARGETS,guideTarget)?CHARACTER_GUIDE_TARGETS[guideTarget]:null;
  const location=conciergePlacement(settings,0);
  const productCopy=CONCIERGE_PRODUCT_COPY[lang]||CONCIERGE_PRODUCT_COPY.ka;
  const saleCopy=CONCIERGE_SALE_COPY[lang]||CONCIERGE_SALE_COPY.ka;
  const money=value=>new Intl.NumberFormat(lang==='ka'?'ka-GE':lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:2}).format(value)+' ₾';
  const interactive=settings.waveBack&&settings.behavior!=='still';
  const hasDetails=Boolean(interactive||showActions&&(recommendation&&onRecommend||target&&onGuide||hasGuideActions)||onMute);
  const expanded=(preview&&!visitorPreview)||detailsOpen;
  const detailsCopy=lang==='en'?['Show options','Hide options']:lang==='ru'?['Показать действия','Скрыть действия']:['მოქმედებები','დაკეცვა'];
  const artCharacter=styledCharacter(character,settings);
  const artEmotion=waved?'happy':settings.emotion;
  const fallback=<CharacterArt character={artCharacter} emotion={artEmotion} season={settings.season}/>;
  const use3D=MASCOT_3D_IDS.includes(character.id)&&settings.behavior!=='still'&&settings.appearance?.renderMode!=='vector'&&['none','winter'].includes(resolveCharacterSeason(settings.season));
  return <div className={'gs-character-scene'+(preview?' gs-character-preview-scene':'')} data-character-depth="grounded" data-character-visitor-preview={preview&&visitorPreview?'true':undefined} data-character-details={expanded?'expanded':'compact'} data-prominence={settings.appearance?.prominence||'enhanced'} data-side={location.side} data-placement={location.placement} data-concierge-active={showActions&&(recommendation||hasGuideActions||target)?'true':undefined} data-motion={waved?wave.motion:settings.behavior} style={characterAppearanceStyle(settings.appearance)}>
    <div className="gs-character-figure" key={waved?'reply':'greeting'}><div className="gs-character-body-rig">{use3D?<Mascot3DBoundary fallback={fallback}><React.Suspense fallback={fallback}><FlagshipFox3D characterId={character.id} color={artCharacter.color} emotion={artEmotion} behavior={waved?wave.motion:settings.behavior} season={resolveCharacterSeason(settings.season)} lighting={settings.appearance?.lighting} fallback={fallback}/></React.Suspense></Mascot3DBoundary>:fallback}</div>{settings.behavior!=='still'&&<CharacterEffects effect={waved?wave.effect:settings.effect}/>} {actionCount>0&&settings.interactiveGuide&&<span key={'reaction-'+actionCount} className="gs-character-action-spark" aria-hidden="true">{interactionNotice===copy.reply?'♥':'✦'}</span>}</div>
    <div className="gs-character-bubble">
      <div className="gs-character-name-row"><strong>{character.name}</strong>{showActions&&(recommendation||hasGuideActions||target)&&<small className="gs-character-role-label">{recommendation?.sale?(lang==='en'?'Offers':lang==='ru'?'Акции':'აქციები'):(lang==='en'?'Guide':lang==='ru'?'Помощник':'დამხმარე')}</small>}</div>{!waved&&advice&&<small className="gs-character-advice-label">{CONCIERGE_ADVICE_LABEL[lang]||CONCIERGE_ADVICE_LABEL.ka}</small>}<span className="gs-character-message" aria-live={interactive?'polite':undefined} data-character-advice={waved?undefined:advice?.topic}>{waved?wave.reply:advice?.text||characterMessage(settings,character,lang,variant,greetingDate)}</span>
      {(!preview||visitorPreview)&&hasDetails&&<button type="button" className="gs-character-details-toggle" aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setDetailsOpen(open=>!open)}>{detailsCopy[expanded?1:0]} <span aria-hidden="true">{expanded?'−':'+'}</span></button>}
      <div id={detailsId} className="gs-character-details" hidden={!expanded}>
      {interactive&&!waved&&<button type="button" className="gs-character-wave-back" onClick={()=>{setWaved(true);onActivity?.();}}>{wave.button} {wave.emoji}</button>}
      {showActions&&recommendation&&onRecommend&&<div className="gs-character-recommendation" data-character-sale={recommendation.sale?'true':undefined}><span>{recommendation.sale?saleCopy.intro:productCopy.intro}</span><strong>{recommendation.name}</strong>{recommendation.sale&&<div className="gs-character-sale-prices"><b>{money(recommendation.price)}</b><del>{money(recommendation.oldPrice)}</del><small>{saleCopy.saving}: {money(recommendation.savings)}</small></div>}<button type="button" className="gs-character-guide-action" data-character-product={recommendation.id} onClick={onRecommend}>{recommendation.sale?saleCopy.action:productCopy.action} <span aria-hidden="true">↗</span></button></div>}
      {showActions&&!recommendation&&target&&onGuide&&<button type="button" className="gs-character-guide-action" data-character-guide={guideTarget} onClick={onGuide}><span aria-hidden="true">↗</span>{target.copy[lang]||target.copy.ka}</button>}
      {hasGuideActions&&<div className="gs-character-quick-actions" aria-label={lang==='en'?'Assistant actions':lang==='ru'?'Действия помощника':'დამხმარის მოქმედებები'}>
        {settings.advice?.enabled&&onNextTip&&<button type="button" data-character-next-tip onClick={()=>{setWaved(false);onNextTip();}}>{copy.tip}</button>}
        {(settings.recommendProducts||settings.saleGuide)&&onNextProduct&&<button type="button" data-character-next-product onClick={()=>{setWaved(false);onNextProduct();}}>{recommendation?.sale?copy.offer:copy.product}</button>}
        {onThanks&&<button type="button" data-character-thanks onClick={onThanks}>{copy.thanks}</button>}
      </div>}
      {hasGuideActions&&helpOptions.length>0&&<div className="gs-character-help-options"><small>{helpCopy.title}</small><div>{helpOptions.map(type=><button key={type} type="button" data-character-help={type} onClick={()=>{setWaved(false);onHelp(type);}}>{helpCopy[type]}</button>)}</div></div>}
      {interactionNotice&&<small className="gs-character-interaction-notice" role="status">{interactionNotice}</small>}
      {!preview&&onMute&&<button type="button" className="gs-character-mute" onClick={onMute}>{lang==='en'?'Hide for this visit':lang==='ru'?'Скрыть на этот визит':'ამ ვიზიტზე დამალვა'}</button>}
      </div>
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
export default function CharacterMascot({settings,lang,forceReplay=null,products=[],catalogueReady=false,category='',onOpenProduct}){
  const s=normalizeCharacterSettings(settings);
  const [presentation,setPresentation]=useState(null);
  const [saleClock,setSaleClock]=useState(()=>Date.now());
  const dismissRef=useRef(null);
  const extendRef=useRef(null);
  const actionsRef=useRef(0);
  const shownAtRef=useRef(0);
  const catalogueRef=useRef(null);
  catalogueRef.current={products,ready:catalogueReady,category,onOpenProduct};
  const lastRecommendedId=useRef(null);
  const closeAtRef=useRef(0);
  const intervalRef=useRef(0);
  const settingsKey=JSON.stringify(s);
  useEffect(()=>{
    setPresentation(null);shownAtRef.current=0;
    const current=JSON.parse(settingsKey);
    const revision=characterSettingsRevision(current);
    const repeat=current.frequency==='repeat';
    let forced=forceReplay!=null&&forceReplay!==lastForcedReplay;
    if(!current.enabled||(!repeat&&!forced&&seen(current.frequency,revision)))return;
    let showTimer,closeTimer,disposed=false;
    const readyDeadline=Date.now()+current.delay*1000+8000;
    const clear=()=>{clearTimeout(showTimer);clearTimeout(closeTimer);};
    const schedule=()=>{
      if(disposed)return;
      clear();
      const wait=forced?current.delay*1000:repeat?characterRepeatDelay(current,readRepeat(revision)):current.delay*1000;
      if(wait!==null)showTimer=setTimeout(show,wait);
    };
    const close=(mute=false)=>{
      clear();setPresentation(null);
      if(repeat){
        const record=readRepeat(revision);
        if(record.count&&shownAtRef.current&&record.at===shownAtRef.current){saveRepeat({...record,cooldownUntil:Math.max(record.cooldownUntil||0,Date.now()+intervalRef.current),muted:mute||record.muted});}
        else if(mute)saveRepeat({...record,muted:true});
        shownAtRef.current=0;
        if(mute)return;
        schedule();
      }else shownAtRef.current=0;
    };
    dismissRef.current=close;
    extendRef.current=()=>{
      const next=actionsRef.current+1;
      const wait=conciergeInteractionDeadline(shownAtRef.current,Date.now(),next);
      if(wait===null||wait<=0)return false;
      actionsRef.current=next;
      clearTimeout(closeTimer);
      const nextClose=Math.max(closeAtRef.current,Date.now()+wait);
      closeAtRef.current=nextClose;
      if(repeat){const record=readRepeat(revision);if(record.at===shownAtRef.current)saveRepeat({...record,cooldownUntil:Math.max(record.cooldownUntil||0,nextClose+intervalRef.current)});}
      closeTimer=setTimeout(()=>close(false),Math.max(0,nextClose-Date.now()));
      return true;
    };
    function show(){
      if(disposed)return;
      if(visitorBusy()){showTimer=setTimeout(show,5000);return;}
      if((current.recommendProducts||current.saleGuide||current.guideLinks)&&!catalogueRef.current.ready&&Date.now()<readyDeadline){showTimer=setTimeout(show,250);return;}
      if(forced&&lastForcedReplay===forceReplay){forced=false;return;}
      const record=readRepeat(revision);
      if(!forced&&repeat){
        const wait=characterRepeatDelay(current,record);
        if(wait===null)return;
        // First delay was already observed; subsequent appearances must respect persisted cooldown.
        if(record.count>0&&wait>0){showTimer=setTimeout(show,wait);return;}
      }
      if(!forced&&!repeat&&seen(current.frequency,revision))return;
      const wasForced=forced;
      if(forced){lastForcedReplay=forceReplay;forced=false;}
      const now=new Date();
      const event=activeCharacterEvent(current,now);
      const winter=winterConciergePresentation(current,{now,index:repeat?record.count:0,lang,event});
      const baseEffective=winter||applyCharacterEvent(current,event,lang);
      let character=repeat?nextConciergeCharacter(baseEffective,record,now):selectCharacter(baseEffective,now);
      let effective=applyCharacterProfile(baseEffective,character.id,lang,{preserveEvent:!!(event||winter)});
      const catalogue=catalogueRef.current;
      const seasonalSale=effective.blackFridayBoost&&blackFridayWindow(now);
      const saleEligible=effective.saleGuide&&typeof catalogue.onOpenProduct==='function'&&(seasonalSale||effective.saleGuidePriority==='always'||character.id==='deal'||(effective.saleGuidePriority==='alternate'&&repeat&&record.count%2===1));
      let sale=saleEligible?chooseConciergeSale(catalogue.products,{ready:catalogue.ready,now:now.getTime(),index:record.count,excludeId:lastRecommendedId.current,mode:effective.recommendationMode,category:catalogue.category,budget:effective.recommendationBudget}):null;
      if(sale&&!event&&!winter&&baseEffective.rotation!=='fixed'){
        const dealSettings=applyCharacterProfile(baseEffective,'deal',lang);
        if(dealSettings.saleGuide){const verified=chooseConciergeSale(catalogue.products,{ready:catalogue.ready,now:now.getTime(),index:record.count,excludeId:lastRecommendedId.current,mode:dealSettings.recommendationMode,category:catalogue.category,budget:dealSettings.recommendationBudget});if(verified){sale=verified;character=selectCharacter({...dealSettings,rotation:'fixed',character:'deal'},now);effective=dealSettings;}else sale=null;}
        else sale=null;
      }
      if(repeat){
        if(!wasForced||(!record.muted&&record.count<current.repeatLimit))saveRepeat({...record,count:Math.min(8,record.count+1),at:now.getTime(),cooldownUntil:now.getTime()+(effective.duration+effective.repeatInterval)*1000,lastId:character.id,lastRegularId:CHARACTERS.find(c=>c.id===character.id)?.special?record.lastRegularId||(CHARACTERS.find(c=>c.id===record.lastId&&!c.special)?.id??null):character.id});
      }else markSeen(current.frequency,revision);
      const placement=conciergePlacement(effective,repeat?record.count:0);
      const guideTarget=effective.guideLinks?chooseCharacterGuideTarget(effective,character.id,Object.keys(CHARACTER_GUIDE_TARGETS).filter(key=>visibleGuideTarget(key)),repeat?record.count:0):null;
      const recommendation=sale||(effective.recommendProducts&&typeof catalogue.onOpenProduct==='function'?chooseConciergeProduct(catalogue.products,{ready:catalogue.ready,mode:effective.recommendationMode,category:catalogue.category,budget:effective.recommendationBudget,index:repeat?record.count:0,excludeId:lastRecommendedId.current}):null);
      if(recommendation)lastRecommendedId.current=recommendation.id;
      const profileMessage=effective.profiles[character.id]?.enabled&&effective.profiles[character.id]?.messages[lang];
      const advice=!event&&!winter&&!profileMessage&&(!repeat||record.count>0)?chooseConciergeAdvice(effective.advice,{characterId:character.id,target:guideTarget,index:record.count,lang,hasProduct:!!recommendation}):null;
      actionsRef.current=0;shownAtRef.current=now.getTime();
      setPresentation({character,settings:{...effective,...placement},guideTarget,recommendationId:recommendation?.id,sale:!!sale,advice,key:now.getTime(),actionCount:0});
      setSaleClock(now.getTime());
      intervalRef.current=effective.repeatInterval*1000;
      closeAtRef.current=now.getTime()+effective.duration*1000;
      closeTimer=setTimeout(()=>close(false),effective.duration*1000);
    }
    schedule();
    const visibility=()=>{if(document.visibilityState==='hidden'&&(repeat||shownAtRef.current)){close(false);}};
    const focus=()=>{if(shownAtRef.current&&visitorBusy())close(false);};
    document.addEventListener('visibilitychange',visibility);
    document.addEventListener('focusin',focus);
    return()=>{disposed=true;clear();dismissRef.current=null;extendRef.current=null;document.removeEventListener('visibilitychange',visibility);document.removeEventListener('focusin',focus);};
  },[settingsKey,lang,forceReplay]);
  const recommendation=presentation?.recommendationId?conciergeRecommendationPool(presentation.sale?conciergeSaleProducts(products,catalogueReady,saleClock):conciergeProducts(products,catalogueReady),{mode:presentation.helpFilter?.mode??presentation.settings.recommendationMode,category,budget:presentation.helpFilter?.budget??presentation.settings.recommendationBudget}).find(p=>p.id===presentation.recommendationId)||null:null;
  useEffect(()=>{
    if(!recommendation?.sale)return;
    const timer=setTimeout(()=>setSaleClock(Date.now()),Math.min(24000,Math.max(0,recommendation.endsAt-Date.now()+1)));
    return()=>clearTimeout(timer);
  },[recommendation?.sale,recommendation?.endsAt,saleClock]);
  const act=(type,helpType)=>{
    if(!presentation||!presentation.settings.interactiveGuide)return;
    const request=type==='help'?conciergeHelpRequest(presentation.settings,helpType):null;
    if(type==='help'&&!request)return;
    if(!extendRef.current?.())return;
    const current=catalogueRef.current;
    const copy=CONCIERGE_INTERACTIVE_COPY[lang]||CONCIERGE_INTERACTIVE_COPY.ka;
    const actionCount=actionsRef.current;
    if(type==='help'){
      const now=Date.now();const options={ready:current.ready,now,mode:request.mode,category:current.category,budget:request.budget,index:actionCount-1};
      const next=request.sale?chooseConciergeSale(current.products,options):chooseConciergeProduct(current.products,options);
      const words=CONCIERGE_HELP_COPY[lang]||CONCIERGE_HELP_COPY.ka;
      const tip=presentation.settings.advice.enabled?chooseConciergeAdvice({...presentation.settings.advice,topic:request.topic},{lang,index:actionCount,hasProduct:!!next}):null;
      if(next){lastRecommendedId.current=next.id;setSaleClock(now);}
      setPresentation(previous=>previous?{...previous,recommendationId:next?.id,sale:request.sale,helpFilter:request,advice:tip||previous.advice,interactionNotice:next?(helpType==='budget'?words.budgetTip:''):(request.sale?words.noSale:words.noGift),actionCount}:previous);
    }else if(type==='tip'){
      const tip=nextConciergeAdvice({...presentation.settings.advice,...(presentation.helpFilter?{topic:presentation.helpFilter.topic}:{})},presentation.advice,{lang,index:actionCount});
      setPresentation(previous=>previous?{...previous,advice:tip||previous.advice,interactionNotice:'',actionCount}:previous);
    }else if(type==='product'){
      const now=Date.now();
      const saleOnly=presentation.helpFilter?.sale??(presentation.sale||(!presentation.settings.recommendProducts&&presentation.settings.saleGuide));
      const available=conciergeRecommendationPool(saleOnly?conciergeSaleProducts(current.products,current.ready,now):conciergeProducts(current.products,current.ready),{mode:presentation.helpFilter?.mode??presentation.settings.recommendationMode,category:current.category,budget:presentation.helpFilter?.budget??presentation.settings.recommendationBudget});
      const alternatives=available.filter(p=>p.id!==presentation.recommendationId);
      const next=alternatives.length?alternatives[(actionCount-1)%alternatives.length]:null;
      if(next){lastRecommendedId.current=next.id;setSaleClock(now);}
      setPresentation(previous=>previous?{...previous,...(next?{recommendationId:next.id,sale:!!next.sale}:{}),interactionNotice:next?'':copy.noMore,actionCount}:previous);
    }else{
      setPresentation(previous=>previous?{...previous,interactionNotice:type==='thanks'?copy.reply:'',actionCount}:previous);
    }
  };
  return presentation?<CharacterScene key={presentation.key} character={presentation.character} settings={presentation.settings} lang={lang} advice={presentation.advice} recommendation={recommendation} actionCount={presentation.actionCount} interactionNotice={presentation.interactionNotice} onNextTip={()=>act('tip')} onNextProduct={()=>act('product')} onThanks={()=>act('thanks')} onHelp={type=>act('help',type)} onActivity={()=>act('gesture')} onRecommend={()=>{const current=catalogueRef.current;const product=conciergeRecommendationPool(presentation.sale?conciergeSaleProducts(current.products,current.ready,Date.now()):conciergeProducts(current.products,current.ready),{mode:presentation.helpFilter?.mode??presentation.settings.recommendationMode,category:current.category,budget:presentation.helpFilter?.budget??presentation.settings.recommendationBudget}).find(p=>p.id===presentation.recommendationId);if(product&&current.onOpenProduct?.(product.path))dismissRef.current?.(false);else if(!product){setSaleClock(Date.now());setPresentation(previous=>previous?{...previous,recommendationId:null,interactionNotice:(CONCIERGE_HELP_COPY[lang]||CONCIERGE_HELP_COPY.ka)[previous.sale?'noSale':'noGift']}:previous);}}} guideTarget={presentation.guideTarget} onGuide={()=>{if(guideToSection(presentation.guideTarget))dismissRef.current?.(false);}} onClose={()=>dismissRef.current?.(false)} onMute={s.frequency==='repeat'?()=>dismissRef.current?.(true):undefined}/>:null;
}
