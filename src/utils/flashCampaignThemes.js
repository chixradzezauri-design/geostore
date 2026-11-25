// Allowlisted campaign-only palettes. No arbitrary CSS, price or schedule changes.
export const FLASH_CAMPAIGN_THEMES = Object.freeze([
  {id:'inherit',label:'საიტის სტილი',background:'#fffdfa',ink:'#29241f',accent:'#92785f'},
  {"id":"black-friday","label":"Black Friday","background":"#171717","ink":"#ffffff","accent":"#f7ca76"},
  {"id":"luxury-gold","label":"Luxury Gold","background":"#f7efdf","ink":"#352619","accent":"#825b24"},
  {"id":"holiday","label":"საახალწლო","background":"#163e32","ink":"#ffffff","accent":"#f5d69a"},
  {"id":"minimal","label":"მინიმალისტური","background":"#f5f5f5","ink":"#222222","accent":"#333333"},
  {"id":"ruby","label":"Ruby Sale","background":"#fff1f1","ink":"#631e2b","accent":"#a52740"}
].map(Object.freeze));

export function normalizeFlashCampaignTheme(value) {
  return FLASH_CAMPAIGN_THEMES.some(theme=>theme.id===value) ? value : 'inherit';
}

export function normalizeFlashCampaignLayout(value) {
  return ['grid','compact'].includes(value) ? value : 'inherit';
}
export function normalizeFlashCampaignBanner(value) {
  if (typeof value !== 'string' || value.length > 1400000) return '';
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value)) return value;
  if (value.length > 2048) return '';
  try { const url = new URL(value.trim()); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

export const FLASH_TIMER_STYLES=Object.freeze([
 {id:'inherit',label:'არსებული',sample:'08 : 42 : 19'},
 {id:'outline',label:'თხელი ჩარჩო',sample:'08 : 42 : 19'},
 {id:'pills',label:'მომრგვალებული',sample:'08 : 42 : 19'},
 {id:'digital',label:'ციფრული',sample:'08 : 42 : 19'}
].map(Object.freeze));
export function normalizeFlashTimerStyle(value){
 return FLASH_TIMER_STYLES.some(style=>style.id===value)?value:'inherit';
}
export function normalizeFlashTimerMotion(value){
 return value==='reveal'?'reveal':'none';
}

export const FLASH_PRODUCT_APPEARANCE=Object.freeze([
 {key:'flashCardStyle',label:'პროდუქტის ბარათი',options:[['inherit','არსებული'],['editorial','ელეგანტური'],['soft','რბილი'],['minimal','მინიმალური']]},
 {key:'flashDiscountStyle',label:'ფასდაკლების ნიშანი',options:[['inherit','არსებული'],['pill','მომრგვალებული'],['ticket','ბილეთი'],['gold','ოქროსფერი']]},
 {key:'flashButtonStyle',label:'შესაძენი ღილაკი',options:[['inherit','არსებული'],['outline','ჩარჩო'],['rounded','მომრგვალებული'],['gold','ოქროსფერი']]}
].map(group=>Object.freeze({...group,options:Object.freeze(group.options.map(Object.freeze))})));
export function normalizeFlashProductAppearance(key,value){
 const group=FLASH_PRODUCT_APPEARANCE.find(group=>group.key===key);
 return group?.options.some(([id])=>id===value)?value:'inherit';
}

export const FLASH_BANNER_MAX_BYTES=1024*1024;
export function normalizeFlashBannerAppearance(value){
 const raw=value&&typeof value==='object'?value:{};
 const result={};
 for(const key of ['desktopHeight','tabletHeight','mobileHeight','positionX','positionY','radius']){
  const limits=key.endsWith('Height')?[80,360]:key==='radius'?[0,32]:[0,100];
  if(typeof raw[key]==='number'&&Number.isFinite(raw[key]))result[key]=Math.round(Math.max(limits[0],Math.min(limits[1],raw[key])));
 }
 if(['cover','contain'].includes(raw.fit))result.fit=raw.fit;
 if(['above','below'].includes(raw.placement))result.placement=raw.placement;
 return result;
}
export function flashBannerStyle(value,viewport){
 const a=normalizeFlashBannerAppearance(value);
 const h=viewport==='mobile'?a.mobileHeight??a.desktopHeight:viewport==='tablet'?a.tabletHeight??a.desktopHeight:a.desktopHeight;
 return {...(h!=null?{height:h+'px'}:{}),...(a.fit?{objectFit:a.fit}:{}),
  ...(a.positionX!=null||a.positionY!=null?{objectPosition:(a.positionX??50)+'% '+(a.positionY??50)+'%'}:{}),
  ...(a.radius!=null?{borderRadius:a.radius+'px'}:{})};
}
