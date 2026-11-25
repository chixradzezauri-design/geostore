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
  if (typeof value !== 'string' || value.length > 2048) return '';
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
