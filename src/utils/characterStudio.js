// Shared, bounded configuration; unconfigured storefronts remain unchanged.
export const CHARACTERS = Object.freeze([
  { id:'fox', name:'GeoFox', label:'მელა', color:'#f59e0b', lines:{ka:'გამარჯობა! დღეს რა მაგარს ვიპოვით?',en:'Hi! Let’s find something great today!',ru:'Привет! Найдём что-нибудь классное?'} },
  { id:'panda', name:'Tech Panda', label:'პანდა', color:'#64748b', lines:{ka:'მოგესალმები! მშვიდად დაათვალიერე ყველაფერი.',en:'Welcome! Make yourself at home.',ru:'Добро пожаловать! Осмотрись.'} },
  { id:'rabbit', name:'Flash Rabbit', label:'კურდღელი', color:'#a78bfa', lines:{ka:'ჰოპ! აქციების ნახვა არ დაგავიწყდეს!',en:'Hop! Don’t miss the offers!',ru:'Прыг! Не пропусти акции!'} },
  { id:'robot', name:'Mini Robot', label:'რობოტი', color:'#22d3ee', lines:{ka:'ბიპ-ბუპ! კარგი არჩევანი გელოდება.',en:'Beep boop! Great finds await.',ru:'Бип-буп! Отличные находки ждут.'} },
  { id:'cat', name:'Style Cat', label:'კატა', color:'#f472b6', lines:{ka:'მიაუ! დღეს სტილურად გამოვიყურებით!',en:'Meow! Let’s find your style.',ru:'Мяу! Найдём твой стиль!'} },
]);
const pick=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const bounded=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;
export const CHARACTER_SCENARIOS=Object.freeze({
  flash:{character:'rabbit',label:'ფლეშ აქციები',lines:{ka:'ჰოპ! მოქმედი აქციები აქაა!',en:'Hop! Explore the current offers!',ru:'Прыг! Здесь действующие акции!'}},
  cart:{character:'robot',label:'ცარიელი კალათა',lines:{ka:'ბიპ-ბუპ! კალათა ჯერ ცარიელია.',en:'Beep boop! Your basket is still empty.',ru:'Бип-буп! Корзина пока пуста.'}},
  wishlist:{character:'cat',label:'ცარიელი ფავორიტები',lines:{ka:'მიაუ! აქ შენი რჩეულები შეინახება.',en:'Meow! Your favourites will live here.',ru:'Мяу! Здесь будут твои избранные товары.'}},
  cartAdded:{character:'fox',label:'კალათაში დამატება',lines:{ka:'ვაშა! კარგი არჩევანია!',en:'Hooray! Great choice!',ru:'Ура! Отличный выбор!'}},
  wishlistAdded:{character:'cat',label:'ფავორიტებში დამატება',lines:{ka:'მიაუ! რჩეული შენახულია!',en:'Meow! Favourite saved!',ru:'Мяу! Избранное сохранено!'}}
});
function normalizeScenarios(raw){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return Object.fromEntries(Object.entries(CHARACTER_SCENARIOS).map(([key,preset])=>{
    const value=source[key]&&typeof source[key]==='object'&&!Array.isArray(source[key])?source[key]:{};
    return [key,{enabled:value.enabled===true,character:pick(value.character,CHARACTERS.map(c=>c.id),preset.character),message:typeof value.message==='string'?value.message.trim().slice(0,120):''}];
  }));
}
const hexColor=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
export const DEFAULT_CHARACTER_APPEARANCE=Object.freeze({desktopSize:116,mobileSize:76,lift:0,bubbleColor:'#fffdf7',bubbleShape:'rounded',fontSize:13});
export function normalizeCharacterAppearance(raw){
  const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {desktopSize:bounded(v.desktopSize,80,144,116),mobileSize:bounded(v.mobileSize,56,100,76),
    lift:bounded(v.lift,0,48,0),bubbleColor:hexColor(v.bubbleColor,'#fffdf7'),
    bubbleShape:pick(v.bubbleShape,['rounded','pill','square'],'rounded'),fontSize:bounded(v.fontSize,12,15,13)};
}
export function normalizeCharacterPalette(raw){
  const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return Object.fromEntries(CHARACTERS.map(c=>[c.id,hexColor(v[c.id],c.color)]));
}
export function styledCharacter(character,settings){
  return {...character,color:normalizeCharacterPalette(settings?.palette)[character.id]||character.color};
}
// WCAG relative luminance: choose the stronger of black/white text contrast.
export function characterBubbleInk(value){
  const hex=hexColor(value,'#fffdf7');
  const [r,g,b]=[1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
  return .2126*r+.7152*g+.0722*b>.179?'#000000':'#ffffff';
}
export function characterAppearanceStyle(raw){
  const a=normalizeCharacterAppearance(raw);
  return {'--gs-mascot-desktop':a.desktopSize+'px','--gs-mascot-mobile':a.mobileSize+'px','--gs-mascot-lift':a.lift+'px',
    '--gs-mascot-bubble':a.bubbleColor,'--gs-mascot-ink':characterBubbleInk(a.bubbleColor),
    '--gs-mascot-radius':{rounded:'16px',pill:'28px',square:'6px'}[a.bubbleShape],
    '--gs-mascot-font':a.fontSize+'px'};
}
export const DEFAULT_CHARACTER_SETTINGS=Object.freeze({
  enabled:false, character:'fox', rotation:'fixed', behavior:'run-wave', side:'left',
  delay:2, duration:6, frequency:'session', pages:'home', mobile:true, desktop:true, message:''
});
export function normalizeCharacterSettings(raw){
  const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {
    enabled:s.enabled===true, character:pick(s.character,CHARACTERS.map(c=>c.id),'fox'),
    rotation:pick(s.rotation,['fixed','random','daypart','seasonal'],'fixed'),
    behavior:pick(s.behavior,['run-wave','wave','jump','slide','dance','peek','bow'],'run-wave'),
    emotion:pick(s.emotion,['happy','wink','surprise'],'happy'),
    season:pick(s.season,['none','auto','winter','hearts','summer','autumn'],'none'),
    side:pick(s.side,['left','right'],'left'),
    delay:bounded(s.delay,0,10,2), duration:bounded(s.duration,3,12,6),
    frequency:pick(s.frequency,['session','daily'],'session'),
    pages:pick(s.pages,['home','catalogue'],'home'),
    mobile:s.mobile!==false, desktop:s.desktop!==false,
    message:typeof s.message==='string'?s.message.trim().slice(0,120):'',
    scenarios:normalizeScenarios(s.scenarios),appearance:normalizeCharacterAppearance(s.appearance),palette:normalizeCharacterPalette(s.palette)
  };
}
export function selectCharacter(settings,date=new Date(),random=Math.random){
  const s=normalizeCharacterSettings(settings);
  let id=s.character;
  if(s.rotation==='random') id=CHARACTERS[Math.max(0,Math.min(CHARACTERS.length-1,Math.floor(random()*CHARACTERS.length)))].id;
  if(s.rotation==='daypart') id=date.getHours()<12?'fox':date.getHours()<18?'rabbit':'panda';
  if(s.rotation==='seasonal') id=[ 'panda','panda','rabbit','rabbit','cat','cat','cat','fox','fox','robot','robot','panda' ][date.getMonth()];
  return styledCharacter(CHARACTERS.find(c=>c.id===id)||CHARACTERS[0],s);
}
export function resolveCharacterSeason(value,date=new Date()){
  const season=pick(value,['none','auto','winter','hearts','summer','autumn'],'none');
  if(season!=='auto')return season;
  const month=date.getMonth();
  if(month===11||month===0)return 'winter';
  if(month===1)return 'hearts';
  if(month>=5&&month<=7)return 'summer';
  if(month>=8&&month<=10)return 'autumn';
  return 'none';
}
export function canShowCharacterReaction(lastAt,now=Date.now()){
  return Number.isFinite(now)&&(!Number.isFinite(lastAt)||now<lastAt||now-lastAt>=15000);
}
export function characterMessage(settings,character,lang='ka'){
  return normalizeCharacterSettings(settings).message||character.lines[lang]||character.lines.ka;
}
export function canDisplayCharacter(settings,{route,mobile,blocked}={}){
  const s=normalizeCharacterSettings(settings);
  return s.enabled&&!blocked&&(mobile?s.mobile:s.desktop)&&(route==='home'||(s.pages==='catalogue'&&route==='category'));
}
export function getCharacterScenario(settings,key,{mobile=false,eligible=false}={}){
  const s=normalizeCharacterSettings(settings);
  if(!Object.hasOwn(CHARACTER_SCENARIOS,key)||!s.enabled||!eligible||!(mobile?s.mobile:s.desktop)||!s.scenarios[key].enabled)return null;
  return {character:styledCharacter(CHARACTERS.find(c=>c.id===s.scenarios[key].character),s),message:s.scenarios[key].message,lines:CHARACTER_SCENARIOS[key].lines,emotion:s.emotion,season:s.season,appearance:s.appearance};
}
export const CHARACTER_SESSION_KEY='geostore_character_seen_v1';
export function characterAlreadySeen(value,frequency,now=Date.now()){
  if(frequency==='session') return value==='1';
  const stamp=Number(value);
  return value!=null&&value!==''&&Number.isFinite(stamp)&&stamp>0&&stamp<=now&&now-stamp<86400000;
}
