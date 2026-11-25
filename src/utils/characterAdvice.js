// Editorial advice only; no personal profiling, invented savings or urgency.
export const CONCIERGE_ADVICE=Object.freeze({
 style:{label:'სტილი',lines:[
 {ka:'ყოველდღიური სტილისთვის შეარჩიე ნივთი, რომელიც უკვე არსებულ სამოსს მოუხდება.',en:'Choose an everyday piece that complements what you already wear.',ru:'Выбирай вещь, которая дополнит твой повседневный гардероб.'},
 {ka:'ნეიტრალური ფერები მარტივად ერწყმის სხვადასხვა სამოსს.',en:'Neutral colours are easy to pair with different outfits.',ru:'Нейтральные цвета легко сочетать с разными образами.'}]},
 gifts:{label:'საჩუქრები',lines:[
 {ka:'საჩუქრის არჩევისას გაითვალისწინე ადამიანის ინტერესები და ყოველდღიური საჭიროებები.',en:'For a gift, think about the recipient’s interests and everyday needs.',ru:'Выбирая подарок, учитывай интересы и повседневные потребности человека.'},
 {ka:'ჯერ შეარჩიე ბიუჯეტი, შემდეგ დაათვალიერე შესაბამისი ნივთები.',en:'Set a gift budget first, then explore suitable items.',ru:'Сначала определи бюджет подарка, затем посмотри подходящие товары.'}]},
 details:{label:'პროდუქტის დეტალები',lines:[
 {ka:'შეძენამდე გადაამოწმე აღწერა, მასალა და შენთვის საჭირო ზომა.',en:'Check the description, materials and size before buying.',ru:'Перед покупкой проверь описание, материал и нужный размер.'},
 {ka:'პროდუქტის ფოტოებსა და აღწერას ერთად გადახედე — დეტალები მნიშვნელოვანია.',en:'Review both the product photos and description; details matter.',ru:'Посмотри и фотографии, и описание товара — детали важны.'}]},
 prices:{label:'ფასები და შეთავაზებები',lines:[
 {ka:'ფასდაკლებისას შეადარე მიმდინარე ფასი და შენს ბიუჯეტს მოარგე არჩევანი.',en:'Compare the current price with your budget when exploring offers.',ru:'При выборе по акции сравни текущую цену со своим бюджетом.'},
 {ka:'კარგი შეთავაზება ისაა, რომელიც შენს საჭიროებას შეესაბამება.',en:'A good offer is one that matches your needs.',ru:'Хорошее предложение — то, что соответствует твоим потребностям.'}]},
 favourites:{label:'ფავორიტები',lines:[
 {ka:'თუ არჩევანში ჯერ არ ხარ დარწმუნებული, შეინახე ნივთი ფავორიტებში და მოგვიანებით დაუბრუნდი.',en:'Not sure yet? Save an item to your favourites and revisit it later.',ru:'Не уверен в выборе? Сохрани товар в избранном и вернись позже.'},
 {ka:'შეინახე რამდენიმე რჩეული და მშვიდად შეადარე მათი დეტალები.',en:'Save a few favourites and compare their details at your own pace.',ru:'Сохрани несколько понравившихся товаров и спокойно сравни детали.'}]}
});
const topics=Object.keys(CONCIERGE_ADVICE);
const langs=['ka','en','ru'];
export function normalizeConciergeAdvice(raw){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {enabled:s.enabled===true,topic:topics.includes(s.topic)?s.topic:'auto',
 custom:Object.fromEntries(topics.map(topic=>[topic,Object.fromEntries(langs.map(lang=>[lang,typeof s.custom?.[topic]?.[lang]==='string'?s.custom[topic][lang].trim().slice(0,120):'']))]))};
}
export function chooseConciergeAdvice(raw,{characterId='',target=null,index=0,lang='ka',hasProduct=false}={}){
 const s=normalizeConciergeAdvice(raw);
 if(!s.enabled)return null;
 const locale=langs.includes(lang)?lang:'ka';
 const n=Number.isFinite(index)?Math.max(0,Math.floor(index)):0;
 const preference=characterId==='santa'||characterId==='snowman'?'gifts':characterId==='deal'||target==='flash'?'prices':hasProduct?'details':characterId==='cat'?'style':null;
 const topic=s.topic!=='auto'?s.topic:preference||topics[n%topics.length];
 const lines=CONCIERGE_ADVICE[topic].lines;
 return {topic,text:s.custom[topic][locale]||lines[(s.topic!=='auto'||preference?n:Math.floor(n/topics.length))%lines.length][locale]};
}
export const CONCIERGE_ADVICE_LABEL={ka:'პატარა რჩევა',en:'A little tip',ru:'Небольшой совет'};

export function nextConciergeAdvice(raw,previous,{lang='ka',index=0}={}){
 const s=normalizeConciergeAdvice(raw);
 if(!s.enabled)return null;
 const locale=langs.includes(lang)?lang:'ka';
 const allowed=s.topic==='auto'?topics:[s.topic];
 const options=allowed.flatMap(topic=>{
  const custom=s.custom[topic][locale];
  return [...new Set([custom,...CONCIERGE_ADVICE[topic].lines.map(line=>line[locale])].filter(Boolean))].map(text=>({topic,text}));
 }).filter(item=>item.text!==previous?.text);
 const n=Number.isFinite(index)?Math.max(0,Math.floor(index)):0;
 return options.length?options[n%options.length]:null;
}
export const CONCIERGE_INTERACTIVE_COPY=Object.freeze({
 ka:{tip:'სხვა რჩევა',product:'სხვა ნივთი',offer:'სხვა აქცია',thanks:'მადლობა!',reply:'სასიამოვნოა შენი დახმარება!',noMore:'სხვა ხელმისაწვდომი შეთავაზება ჯერ არ არის.'},
 en:{tip:'Another tip',product:'Another item',offer:'Another offer',thanks:'Thanks!',reply:'Happy to help!',noMore:'No other available offer right now.'},
 ru:{tip:'Другой совет',product:'Другой товар',offer:'Другая акция',thanks:'Спасибо!',reply:'Рад помочь!',noMore:'Других доступных предложений пока нет.'}
});
export function conciergeInteractionDeadline(start,now,actions){
 if(!Number.isFinite(start)||!Number.isFinite(now)||now<start||!Number.isInteger(actions)||actions<1||actions>4)return null;
 return Math.max(0,Math.min(24000-(now-start),9000));
}

export const CONCIERGE_HELP_COPY=Object.freeze({
 ka:{title:'რით დაგეხმარო?',gift:'საჩუქრის იდეა',budget:'ბიუჯეტური ნივთი',sale:'მოქმედი აქცია',noGift:'ამ პირობებით ნივთი ჯერ არ არის ხელმისაწვდომი.',noSale:'ამ პირობებით მოქმედი აქცია არ მოიძებნა.',budgetTip:'ბიუჯეტის ფარგლებში შეარჩიე სასურველი ნივთი.'},
 en:{title:'How can I help?',gift:'Gift idea',budget:'Budget item',sale:'Current offer',noGift:'No available item matches these settings.',noSale:'No current offer matches these settings.',budgetTip:'Choose an item within your budget.'},
 ru:{title:'Чем помочь?',gift:'Идея подарка',budget:'Недорогой товар',sale:'Текущая акция',noGift:'Нет доступного товара по этим условиям.',noSale:'Нет действующей акции по этим условиям.',budgetTip:'Выбирай товар в пределах бюджета.'}
});
export function conciergeHelpChoices(settings){
 if(!settings?.interactiveGuide||!settings.helpChoices)return [];
 return [...(settings.recommendProducts?['gift','budget']:[]),...(settings.saleGuide?['sale']:[])];
}
export function conciergeHelpRequest(settings,type){
 if(!conciergeHelpChoices(settings).includes(type))return null;
 const cap=Number.isFinite(settings.recommendationBudget)&&settings.recommendationBudget>0?settings.recommendationBudget:0;
 return {sale:type==='sale',mode:settings.recommendationMode==='context'?'context':type==='sale'?settings.recommendationMode:'variety',budget:type==='budget'?(cap?Math.min(cap,50):50):cap,topic:type==='gift'?'gifts': 'prices'};
}
