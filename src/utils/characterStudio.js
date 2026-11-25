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
export const DEFAULT_CHARACTER_SETTINGS=Object.freeze({
  enabled:false, character:'fox', rotation:'fixed', behavior:'run-wave', side:'left',
  delay:2, duration:6, frequency:'session', pages:'home', mobile:true, desktop:true, message:''
});
export function normalizeCharacterSettings(raw){
  const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return {
    enabled:s.enabled===true, character:pick(s.character,CHARACTERS.map(c=>c.id),'fox'),
    rotation:pick(s.rotation,['fixed','random','daypart','seasonal'],'fixed'),
    behavior:pick(s.behavior,['run-wave','wave','jump','slide'],'run-wave'),
    side:pick(s.side,['left','right'],'left'),
    delay:bounded(s.delay,0,10,2), duration:bounded(s.duration,3,12,6),
    frequency:pick(s.frequency,['session','daily'],'session'),
    pages:pick(s.pages,['home','catalogue'],'home'),
    mobile:s.mobile!==false, desktop:s.desktop!==false,
    message:typeof s.message==='string'?s.message.trim().slice(0,120):''
  };
}
export function selectCharacter(settings,date=new Date(),random=Math.random){
  const s=normalizeCharacterSettings(settings);
  let id=s.character;
  if(s.rotation==='random') id=CHARACTERS[Math.max(0,Math.min(CHARACTERS.length-1,Math.floor(random()*CHARACTERS.length)))].id;
  if(s.rotation==='daypart') id=date.getHours()<12?'fox':date.getHours()<18?'rabbit':'panda';
  if(s.rotation==='seasonal') id=[ 'panda','panda','rabbit','rabbit','cat','cat','cat','fox','fox','robot','robot','panda' ][date.getMonth()];
  return CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
}
export function characterMessage(settings,character,lang='ka'){
  return normalizeCharacterSettings(settings).message||character.lines[lang]||character.lines.ka;
}
export function canDisplayCharacter(settings,{route,mobile,blocked}={}){
  const s=normalizeCharacterSettings(settings);
  return s.enabled&&!blocked&&(mobile?s.mobile:s.desktop)&&(route==='home'||(s.pages==='catalogue'&&route==='category'));
}
export const CHARACTER_SESSION_KEY='geostore_character_seen_v1';
export function characterAlreadySeen(value,frequency,now=Date.now()){
  if(frequency==='session') return value==='1';
  const stamp=Number(value);
  return value!=null&&value!==''&&Number.isFinite(stamp)&&stamp>0&&stamp<=now&&now-stamp<86400000;
}
