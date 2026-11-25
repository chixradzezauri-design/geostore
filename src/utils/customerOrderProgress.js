const groups=[['ახალი','new','новый'],['მუშავდება','processing','в обработке'],['გაგზავნილი','გზაშია','shipped','on the way','отправлен','в пути'],['დასრულებული','ჩაბარებულია','delivered','completed','доставлен','завершён']];
const cancelled=['გაუქმებული','cancelled','canceled','отменён'];
// Show only the current server status; no invented delivery milestones or dates.
export function customerOrderProgress(status){const key=typeof status==='string'?status.trim().toLowerCase():'';if(cancelled.includes(key))return {kind:'cancelled',index:-1};const index=groups.findIndex(group=>group.includes(key));return {kind:index<0?'unknown':'active',index};}
export function customerOrderStatusTime(value,lang='ka'){if(typeof value!=='string'||!value.trim())return null;const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;return new Intl.DateTimeFormat(lang==='en'?'en-GB':lang==='ru'?'ru-RU':'ka-GE',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tbilisi'}).format(date);}
