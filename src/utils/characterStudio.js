// Shared, bounded configuration; unconfigured storefronts remain unchanged.
export const CHARACTERS = Object.freeze([
  { id:'fox', name:'GeoFox', label:'მელა', color:'#f59e0b', lines:{ka:'გამარჯობა! დღეს რა მაგარს ვიპოვით?',en:'Hi! Let’s find something great today!',ru:'Привет! Найдём что-нибудь классное?'} },
  { id:'panda', name:'Tech Panda', label:'პანდა', color:'#64748b', lines:{ka:'მოგესალმები! მშვიდად დაათვალიერე ყველაფერი.',en:'Welcome! Make yourself at home.',ru:'Добро пожаловать! Осмотрись.'} },
  { id:'rabbit', name:'Flash Rabbit', label:'კურდღელი', color:'#a78bfa', lines:{ka:'ჰოპ! აქციების ნახვა არ დაგავიწყდეს!',en:'Hop! Don’t miss the offers!',ru:'Прыг! Не пропусти акции!'} },
  { id:'robot', name:'Mini Robot', label:'რობოტი', color:'#22d3ee', lines:{ka:'ბიპ-ბუპ! კარგი არჩევანი გელოდება.',en:'Beep boop! Great finds await.',ru:'Бип-буп! Отличные находки ждут.'} },
  { id:'cat', name:'Style Cat', label:'კატა', color:'#f472b6', lines:{ka:'მიაუ! დღეს სტილურად გამოვიყურებით!',en:'Meow! Let’s find your style.',ru:'Мяу! Найдём твой стиль!'} },
  { id:'monkey', name:'Trend Monkey', label:'მაიმუნი', color:'#a8764e', lines:{ka:'ჰეი! მოდი, ერთად აღმოვაჩინოთ ახალი ამბები.',en:'Hey! Let’s discover something new.',ru:'Привет! Давай найдём что-нибудь новое.'} },
  { id:'bear', name:'Luxury Bear', label:'დათვი', color:'#926b48', lines:{ka:'კეთილი იყოს შენი მობრძანება. საუკეთესო არჩევანს დრო სჭირდება.',en:'Welcome. Take your time finding your favourite.',ru:'Добро пожаловать. Выбирай с удовольствием.'} },
  { id:'owl', name:'Smart Owl', label:'ბუ', color:'#8c735e', lines:{ka:'გამარჯობა! კარგი აღმოჩენა პატარა დეტალით იწყება.',en:'Hello! Great finds start with the little details.',ru:'Привет! Отличные находки начинаются с мелочей.'} },
  { id:'cheetah', name:'Speed Cheetah', label:'გეპარდი', color:'#dca94f', lines:{ka:'მოვირბინე, რომ სასიამოვნო აღმოჩენები გისურვო!',en:'I dashed over to wish you happy browsing!',ru:'Прибежал пожелать приятных находок!'} },
]);
export const CHARACTER_MOTIONS=Object.freeze(['run-wave','wave','jump','slide','dance','peek','bow','celebrate','sneak','walk-wave','look-around','point','patrol']);
const pick=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const bounded=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;
export const CHARACTER_SCENARIOS=Object.freeze({
  flash:{character:'rabbit',label:'ფლეშ აქციები',lines:{ka:'აღმოაჩინე მიმდინარე შეთავაზებები — იქნებ შენი რჩეულიც აქაა.',en:'Hop! Explore the current offers!',ru:'Прыг! Здесь действующие акции!'}},
  cart:{character:'robot',label:'ცარიელი კალათა',lines:{ka:'შენი კალათა ჯერ ცარიელია. მოდი, სასურველი ნივთები აღმოვაჩინოთ.',en:'Beep boop! Your basket is still empty.',ru:'Бип-буп! Корзина пока пуста.'}},
  wishlist:{character:'cat',label:'ცარიელი ფავორიტები',lines:{ka:'რაც მოგეწონება, აქ შეინახე და ნებისმიერ დროს დაუბრუნდი.',en:'Meow! Your favourites will live here.',ru:'Мяу! Здесь будут твои избранные товары.'}},
  cartAdded:{character:'fox',label:'კალათაში დამატება',lines:{ka:'შესანიშნავია! შენი ნივთი კალათაშია.',en:'Hooray! Great choice!',ru:'Ура! Отличный выбор!'}},
  product:{character:'owl',label:'პროდუქტის დათვალიერება',lines:{ka:'დააკვირდი დეტალებს და შეარჩიე შენთვის შესაფერისი ვარიანტი.',en:'Explore the details and choose the option that suits you.',ru:'Посмотри детали и выбери подходящий вариант.'}},
  searchEmpty:{character:'fox',label:'ძიება შედეგის გარეშე',lines:{ka:'ჯერ ვერ ვიპოვეთ. სხვა სიტყვით ან ნაკლები ფილტრით ვცადოთ?',en:'Nothing found yet. Try a different word or fewer filters?',ru:'Пока ничего не нашли. Попробуем другое слово или меньше фильтров?'}},
  wishlistAdded:{character:'cat',label:'ფავორიტებში დამატება',lines:{ka:'შენი რჩეული შენახულია — კარგი აღმოჩენაა!',en:'Meow! Favourite saved!',ru:'Мяу! Избранное сохранено!'}}
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
export const CHARACTER_GREETING_LANGS=['ka','en','ru'];
export const FUNNY_GREETINGS=Object.freeze([
  {ka:'ჰეი! დღეს განსაკუთრებით კარგ ხასიათზე ვარ.',en:'Hey! I’m in an especially good mood today.',ru:'Привет! Сегодня у меня отличное настроение.'},
  {ka:'ჩემი მისიაა: ერთი ღიმილი მაინც მოგგვარო!',en:'My mission: make you smile at least once!',ru:'Моя миссия — вызвать хотя бы одну улыбку!'},
  {ka:'ვცადე სერიოზულად შემოსვლა… არ გამომივიდა!',en:'I tried to make a serious entrance… didn’t work!',ru:'Хотел появиться серьёзно… не получилось!'},
  {ka:'ფეხები დავიღალე, მაგრამ მისალმება ღირდა!',en:'My feet are tired, but saying hello was worth it!',ru:'Лапки устали, но поздороваться стоило!'},
  {ka:'გამარჯობა! დღეს ოფიციალურად კარგი განწყობის დღეა.',en:'Hello! Today is officially a good-mood day.',ru:'Привет! Сегодня официально день хорошего настроения.'},
  {ka:'არ შეგეშინდეს, უბრალოდ მეგობარი პერსონაჟი ვარ!',en:'Don’t mind me, I’m just your friendly mascot!',ru:'Не пугайся, я просто дружелюбный талисман!'}
]);
export const CHARACTER_GREETING_TONES=Object.freeze({
  friendly:[
    {ka:'რა კარგია, რომ შემოიარე! აქ შენი შემდეგი საყვარელი ნივთი გელოდება.',en:'Lovely to see you! Your next favourite might be right here.',ru:'Как здорово, что ты заглянул! Возможно, здесь твоя новая любимая вещь.'},
    {ka:'კეთილი იყოს შენი მობრძანება! დაათვალიერე ყველაფერი შენს ტემპში.',en:'Welcome! Explore at your own pace.',ru:'Добро пожаловать! Выбирай в своём темпе.'},
    {ka:'მიხარია შენი ნახვა! სასიამოვნო აღმოჩენებს გისურვებ.',en:'Glad you’re here! Enjoy discovering something new.',ru:'Рад тебя видеть! Приятных открытий!'},
    {ka:'დღეს რა განწყობაზე ხარ? იქნებ რაღაც განსაკუთრებულს გადააწყდე.',en:'What are you in the mood for today? Something special might catch your eye.',ru:'Какое сегодня настроение? Вдруг найдётся что-то особенное.'}
  ],
  premium:[
    {ka:'აღმოაჩინე დეტალები, რომლებიც შენს ყოველდღიურობას განსაკუთრებულს ხდის.',en:'Discover details that make every day feel special.',ru:'Открой детали, которые делают каждый день особенным.'},
    {ka:'კარგი არჩევანი შენი სტილით იწყება. კეთილი იყოს შენი მობრძანება.',en:'Great choices begin with your own style. Welcome.',ru:'Хороший выбор начинается с твоего стиля. Добро пожаловать.'},
    {ka:'შეარჩიე ის, რაც ნამდვილად შენია. სასიამოვნო შოპინგს გისურვებ.',en:'Find what truly feels like you. Enjoy browsing.',ru:'Найди то, что подходит именно тебе. Приятного выбора.'},
    {ka:'პატარა დეტალები, დიდი შთაბეჭდილებები. აღმოაჩინე შენი სტილი.',en:'Small details, lasting impressions. Discover your style.',ru:'Маленькие детали, яркие впечатления. Найди свой стиль.'}
  ],
  minimal:[
    {ka:'კეთილი იყოს შენი მობრძანება!',en:'Welcome!',ru:'Добро пожаловать!'},
    {ka:'აღმოაჩინე შენი რჩეული.',en:'Discover your favourite.',ru:'Найди своё любимое.'},
    {ka:'სასიამოვნო შოპინგს გისურვებ!',en:'Enjoy exploring!',ru:'Приятного выбора!'},
    {ka:'მიხარია შენი ნახვა.',en:'Lovely to see you.',ru:'Рад тебя видеть.'}
  ]
});
export const CHARACTER_INTERACTIONS=Object.freeze(['wave','high-five','cheer']);
function normalizeGreetingLibrary(raw){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  return Object.fromEntries(CHARACTER_GREETING_LANGS.map(lang=>[lang,Array.isArray(source[lang])?[...new Set(source[lang].slice(0,8).filter(x=>typeof x==='string').map(x=>x.trim().slice(0,120)).filter(Boolean))]:[]]));
}
export const CHARACTER_EVENT_LIMIT=12;
export const CHARACTER_EVENT_THEMES=Object.freeze({
  custom:{label:'ინდივიდუალური',character:'fox',season:'none',effect:'none',behavior:'wave',lines:{}},
  newyear:{label:'ახალი წელი',character:'panda',season:'winter',effect:'confetti',behavior:'celebrate',lines:{ka:'გილოცავ ახალ წელს!',en:'Happy New Year!',ru:'С Новым годом!'}},
  valentine:{label:'ვალენტინობა',character:'cat',season:'hearts',effect:'hearts',behavior:'wave',lines:{ka:'სიყვარულით, GEOSTORE!',en:'With love, GEOSTORE!',ru:'С любовью, GEOSTORE!'}},
  summer:{label:'ზაფხული',character:'rabbit',season:'summer',effect:'sparkles',behavior:'dance',lines:{ka:'მზიანი განწყობა გელოდება!',en:'Sunny vibes await!',ru:'Солнечное настроение ждёт!'}},
  celebration:{label:'სადღესასწაულო დღე',character:'robot',season:'none',effect:'confetti',behavior:'celebrate',lines:{ka:'დღეს განსაკუთრებული დღეა!',en:'Today is a special day!',ru:'Сегодня особенный день!'}}
});
function validEventDate(value){
  if(typeof value!=='string'||!/^20\d\d-\d\d-\d\d$/.test(value))return '';
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:'';
}
export function characterCalendarDay(now=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tbilisi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const get=type=>parts.find(p=>p.type===type)?.value;
    return get('year')+'-'+get('month')+'-'+get('day');
  }catch{return '';}
}
export function normalizeCharacterEvents(raw){
  if(!Array.isArray(raw))return [];
  const used=new Set();
  return raw.slice(0,CHARACTER_EVENT_LIMIT).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).flatMap((event,i)=>{
    const id=typeof event.id==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(event.id)?event.id:'event-'+i;
    if(used.has(id))return [];used.add(id);
    const theme=pick(event.theme,Object.keys(CHARACTER_EVENT_THEMES),'custom'),preset=CHARACTER_EVENT_THEMES[theme];
    const start=validEventDate(event.start),end=validEventDate(event.end);
    return [{id,title:typeof event.title==='string'?event.title.trim().slice(0,60):'',enabled:event.enabled===true,start,end,theme,
      character:pick(event.character,CHARACTERS.map(c=>c.id),preset.character),
      season:pick(event.season,['none','auto','winter','hearts','summer','autumn'],preset.season),
      effect:pick(event.effect,['none','sparkles','hearts','confetti'],preset.effect),
      behavior:pick(event.behavior,CHARACTER_MOTIONS,preset.behavior),
      messages:Object.fromEntries(CHARACTER_GREETING_LANGS.map(lang=>[lang,typeof event.messages?.[lang]==='string'?event.messages[lang].trim().slice(0,120):'']))}];
  });
}
export function activeCharacterEvent(settings,now=new Date()){
  const day=characterCalendarDay(now);
  if(!day||settings?.calendarEnabled!==true||settings?.enabled!==true)return null;
  return normalizeCharacterEvents(settings.events).find(event=>event.enabled&&event.start&&event.end&&event.start<=day&&day<=event.end)||null;
}
export function applyCharacterEvent(settings,event,lang='ka'){
  const s=normalizeCharacterSettings(settings);
  if(!event)return s;
  const locale=CHARACTER_GREETING_LANGS.includes(lang)?lang:'ka';
  const message=event.messages?.[locale]||CHARACTER_EVENT_THEMES[event.theme]?.lines?.[locale]||s.message;
  return {...s,character:event.character,rotation:'fixed',season:event.season,effect:event.effect,behavior:event.behavior,message};
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
    behavior:pick(s.behavior,CHARACTER_MOTIONS,'run-wave'),
    greetingMode:pick(s.greetingMode,['character','funny','time','library',...Object.keys(CHARACTER_GREETING_TONES)],'character'),
    greetingLibrary:normalizeGreetingLibrary(s.greetingLibrary),
    calendarEnabled:s.calendarEnabled===true,events:normalizeCharacterEvents(s.events),
    effect:pick(s.effect,['none','sparkles','hearts','confetti'],'none'),waveBack:s.waveBack===true,
    interaction:pick(s.interaction,CHARACTER_INTERACTIONS,'wave'),
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
export function characterMessage(settings,character,lang='ka',variant=0,date=new Date()){
  const s=normalizeCharacterSettings(settings),locale=CHARACTER_GREETING_LANGS.includes(lang)?lang:'ka';
  if(s.message)return s.message;
  const index=Number.isFinite(variant)?Math.max(0,Math.min(.999999,variant)):0;
  if(s.greetingMode==='funny')return FUNNY_GREETINGS[Math.floor(index*FUNNY_GREETINGS.length)][locale];
  if(Object.hasOwn(CHARACTER_GREETING_TONES,s.greetingMode)){const lines=CHARACTER_GREETING_TONES[s.greetingMode];return lines[Math.floor(index*lines.length)][locale];}
  if(s.greetingMode==='library'&&s.greetingLibrary[locale].length){
    const lines=s.greetingLibrary[locale];return lines[Math.floor(index*lines.length)];
  }
  if(s.greetingMode==='time'){
    const hour=date.getHours();
    const group=hour<12?{ka:'დილა მშვიდობისა! კარგი დღე გქონდეს.',en:'Good morning! Have a lovely day.',ru:'Доброе утро! Хорошего дня!'}:hour<18?{ka:'გამარჯობა! სასიამოვნო დღე გქონდეს.',en:'Good afternoon! Enjoy your day.',ru:'Добрый день! Приятного дня!'}:{ka:'საღამო მშვიდობისა! მიხარია შენი ნახვა.',en:'Good evening! Lovely to see you.',ru:'Добрый вечер! Рад тебя видеть.'};
    return group[locale];
  }
  return character.lines[locale]||character.lines.ka;
}
export function characterWaveCopy(lang='ka'){
  return ({ka:{button:'ხელის დაქნევა',reply:'ვაშა! მეც გესალმები!'},en:{button:'Wave back',reply:'Yay! Hello to you too!'},ru:{button:'Помахать в ответ',reply:'Ура! И тебе привет!'}})[CHARACTER_GREETING_LANGS.includes(lang)?lang:'ka'];
}
export function characterInteractionCopy(mode,lang='ka'){
  const locale=CHARACTER_GREETING_LANGS.includes(lang)?lang:'ka';
  if(mode==='high-five')return {
    ka:{button:'მომეცი ხუთიანი',reply:'ხუთიანი! მშვენიერი გუნდი ვართ.',emoji:'✋',motion:'celebrate',effect:'confetti'},
    en:{button:'High five',reply:'High five! We make a great team.',emoji:'✋',motion:'celebrate',effect:'confetti'},
    ru:{button:'Дай пять',reply:'Дай пять! Отличная команда!',emoji:'✋',motion:'celebrate',effect:'confetti'}
  }[locale];
  if(mode==='cheer')return {
    ka:{button:'გამამხნევე',reply:'დღეს შენს მხარეს ვარ! კარგ განწყობას გისურვებ.',emoji:'✨',motion:'dance',effect:'hearts'},
    en:{button:'Cheer me up',reply:'I’m on your team today! Sending good vibes.',emoji:'✨',motion:'dance',effect:'hearts'},
    ru:{button:'Подбодри меня',reply:'Сегодня я на твоей стороне! Отличного настроения.',emoji:'✨',motion:'dance',effect:'hearts'}
  }[locale];
  return {...characterWaveCopy(locale),emoji:'👋',motion:'celebrate',effect:'sparkles'};
}
export function characterDisplayReason(settings,{route='home',mobile=false,blocked=false}={}){
  if(settings==null)return 'unconfirmed';
  const s=normalizeCharacterSettings(settings);
  if(!s.enabled)return 'disabled';
  if(!(mobile?s.mobile:s.desktop))return 'device';
  if(blocked)return 'blocked';
  if(!(route==='home'||(s.pages==='catalogue'&&route==='category')))return 'page';
  return 'ready';
}
export function canDisplayCharacter(settings,options={}){
  return characterDisplayReason(settings,{...options,route:options.route??'unknown'})==='ready';
}
export function getCharacterScenario(settings,key,{mobile=false,eligible=false}={}){
  const s=normalizeCharacterSettings(settings);
  if(!Object.hasOwn(CHARACTER_SCENARIOS,key)||!s.enabled||!eligible||!(mobile?s.mobile:s.desktop)||!s.scenarios[key].enabled)return null;
  return {character:styledCharacter(CHARACTERS.find(c=>c.id===s.scenarios[key].character),s),message:s.scenarios[key].message,lines:CHARACTER_SCENARIOS[key].lines,emotion:s.emotion,season:s.season,appearance:s.appearance};
}
// A new published configuration can greet again; identical refreshes cannot.
export function characterSettingsRevision(settings){
  const input=JSON.stringify(normalizeCharacterSettings(settings));
  let hash=2166136261;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36)+'-'+input.length;
}
export function characterRevisionSeen(value,frequency,revision,now=Date.now()){
  try{
    const record=typeof value==='string'?JSON.parse(value):value;
    if(!record||record.revision!==revision)return false;
    return frequency==='session'?record.seen===true:characterAlreadySeen(record.at,frequency,now);
  }catch{return false;}
}
export const CHARACTER_SESSION_KEY='geostore_character_seen_v1';
export function characterAlreadySeen(value,frequency,now=Date.now()){
  if(frequency==='session') return value==='1';
  const stamp=Number(value);
  return value!=null&&value!==''&&Number.isFinite(stamp)&&stamp>0&&stamp<=now&&now-stamp<86400000;
}
