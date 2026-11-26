export const AVATAR_BACKGROUNDS=Object.freeze(['sand','rose','mint','sky','violet','graphite','gold','snow']);
export const AVATAR_BG=Object.freeze({sand:'#dfcbb4',rose:'#e9a7b3',mint:'#9cd9bd',sky:'#96c6ed',violet:'#b9a4e6',graphite:'#535769',gold:'#e4bc64',snow:'#e9eef7'});
const themes=[
 ['classic-boy','boy','Classic','კლასიკური ბიჭი','Классический парень'],
 ['classic-girl','girl','Classic','კლასიკური გოგო','Классическая девушка'],
 ['street-boy','boy','Street style','ქუჩის სტილი','Уличный стиль'],
 ['street-girl','girl','Fashion','მოდური გოგო','Модный образ'],
 ['gamer-boy','boy','Gamer','გეიმერი ბიჭი','Геймер'],
 ['gamer-girl','girl','Gamer','გეიმერი გოგო','Геймерша'],
 ['fox','animal','Fox','მელა','Лиса'],
 ['cat','animal','Cat','კატა','Кот'],
 ['robot','fantasy','Robot','რობოტი','Робот'],
 ['astronaut','fantasy','Astronaut','ასტრონავტი','Астронавт']
];
const palettes=[
 ['#f3c4a0','#3f2927','#476c87'],['#ae7856','#251e2d','#b95655'],
 ['#f6d8b7','#bd7942','#56764c'],['#80523d','#231b22','#7d68bb'],
 ['#db9b7f','#663c39','#c69a44'],['#f1b99c','#493f70','#347b81']
];
export const PUBLIC_AVATARS=Object.freeze(themes.flatMap(([style,category,en,ka,ru])=>palettes.map(([skin,hair,shirt],i)=>Object.freeze({id:style+'-'+(i+1),style,category,skin,hair,shirt,label:{ka:ka+' '+(i+1),en:en+' '+(i+1),ru:ru+' '+(i+1)}}))));
export const OWNER_AVATAR_IDS=Object.freeze(['owner-winter','owner-black-friday','owner-signature']);
export const DEFAULT_AVATAR=Object.freeze({id:'classic-boy-1',background:'sand'});
export function normalizeAvatarChoice(input,ownerAllowed=false){
 const id=typeof input?.id==='string'?input.id:'';
 const allowed=PUBLIC_AVATARS.some(a=>a.id===id)||(ownerAllowed&&OWNER_AVATAR_IDS.includes(id));
 return {id:allowed?id:DEFAULT_AVATAR.id,background:AVATAR_BACKGROUNDS.includes(input?.background)?input.background:DEFAULT_AVATAR.background};
}
export function validAvatarChoice(input,ownerAllowed=false){
 const normalized=normalizeAvatarChoice(input,ownerAllowed);
 return normalized.id===input?.id&&normalized.background===input?.background;
}
export const AVATAR_METADATA_KEY='geostore_profile_avatar_v1';
