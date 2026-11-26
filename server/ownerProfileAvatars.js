import {isOwnerAdmin} from '../src/utils/adminAccess.js';
import {avatarSvg} from '../src/utils/customerAvatarArt.js';
// Private source art is not imported by the client bundle.
const themes=[
 {id:'owner-winter',label:{ka:'GEOSTORE — ზამთრის გვირგვინი',en:'Winter Crown',ru:'Зимняя корона'},base:{style:'classic-boy',skin:'#e9b08c',hair:'#463138',shirt:'#b72e49'},detail:'<path d="M37 48Q36 12 80 12Q122 12 128 45L113 47 50 47Z" fill="#c52d4b" stroke="#fbd9cf" stroke-width="2"/><path d="M38 46Q80 35 124 46" fill="none" stroke="#fff8ec" stroke-width="11" stroke-linecap="round"/><circle cx="128" cy="20" r="11" fill="#fff8ec"/><path d="M52 116Q80 127 108 116L99 134 61 134Z" fill="#f6dfcb"/><path d="M22 24v14M15 31h14M142 78v16M134 86h16M27 108v12M21 114h12" stroke="#eaf8ff" stroke-width="2.5" stroke-linecap="round"/>'},
 {id:'owner-black-friday',label:{ka:'GEOSTORE — შავი პარასკევი',en:'Black Friday Noir',ru:'Чёрная пятница Noir'},base:{style:'classic-boy',skin:'#d9a180',hair:'#171620',shirt:'#242430'},detail:'<path d="M34 65Q54 48 78 62L82 62Q106 48 126 65L121 87Q101 95 83 77H77Q58 95 39 87Z" fill="#161821" stroke="url(#gold)" stroke-width="3"/><path d="M44 68L66 63M90 68L113 63" stroke="#ffedc0" stroke-opacity=".8" stroke-width="3"/><path d="M55 116L80 133 105 116" stroke="url(#gold)" stroke-width="4" fill="none"/><circle cx="80" cy="137" r="11" fill="url(#gold)" stroke="#fff2c2"/><text x="80" y="141" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#251c15">BF</text>'},
 {id:'owner-signature',label:{ka:'GEOSTORE — Signature მფლობელი',en:'GEOSTORE Signature',ru:'GEOSTORE Signature'},base:{style:'classic-boy',skin:'#efbf9d',hair:'#382b28',shirt:'#4c3930'},detail:'<path d="M38 38L48 12 65 29 80 7 95 29 112 12 122 38Z" fill="url(#gold)" stroke="#8a6439" stroke-width="2"/><circle cx="80" cy="23" r="4" fill="#e9f7f1"/><path d="M53 114L80 140 107 114" fill="#ece3d3" stroke="url(#gold)" stroke-width="3"/><path d="M80 119L72 130 80 145 88 130Z" fill="#29241e"/><circle cx="110" cy="130" r="10" fill="url(#gold)"/><text x="110" y="134" font-family="serif" font-size="13" text-anchor="middle" font-weight="bold" fill="#32251a">G</text>'}
];
export function ownerAvatarPayload(user){
 if(!isOwnerAdmin(user))return null;
 return themes.map(t=>({id:t.id,label:t.label,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(avatarSvg(t.base).replace('</svg>',t.detail+'</svg>'))}));
}
export function createOwnerAvatarHandler({loadUser}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Authorization');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const token=typeof req.headers?.authorization==='string'?req.headers.authorization.match(/^Bearer ([A-Za-z0-9._-]{20,8192})$/)?.[1]:null;
  if(!token)return res.status(401).json({error:'authentication_required'});
  try{
   const user=await loadUser(token);
   const avatars=ownerAvatarPayload(user);
   if(!avatars)return res.status(403).json({error:'not_allowed'});
   return res.status(200).json({avatars});
  }catch{return res.status(503).json({error:'temporarily_unavailable'});}
 };
}
