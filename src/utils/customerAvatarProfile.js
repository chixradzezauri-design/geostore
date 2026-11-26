import {AVATAR_METADATA_KEY,normalizeAvatarChoice,validAvatarChoice,OWNER_AVATAR_IDS} from './customerAvatarCatalog.js';
import {isOwnerAdmin} from './adminAccess.js';
async function verifiedSession({auth,ownerId,isCurrentOwner}){
 if(!ownerId||!isCurrentOwner())throw Error('avatar_session_changed');
 const {data,error}=await auth.getSession();
 const session=data?.session;
 if(error||!session?.access_token||session.user?.id!==ownerId||!isCurrentOwner())throw Error('avatar_session_changed');
 const verified=await auth.getUser(session.access_token);
 if(verified.error||verified.data?.user?.id!==ownerId||!isCurrentOwner())throw Error('avatar_session_changed');
 return {token:session.access_token,user:verified.data.user};
}
export async function loadAvatarProfile(config,fetchImpl=fetch){
 const {token,user}=await verifiedSession(config);
 let exclusive=[];
 let exclusiveUnavailable=false;
 if(isOwnerAdmin(user)){
  try{
   const response=await fetchImpl('/api/owner-profile-avatars',{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error'});
   if(!response.ok)throw Error('owner_avatars_unavailable');
   const result=await response.json();
   if(!Array.isArray(result.avatars)||result.avatars.length!==3||new Set(result.avatars.map(a=>a.id)).size!==3||!result.avatars.every(a=>OWNER_AVATAR_IDS.includes(a.id)&&typeof a.src==='string'&&a.src.startsWith('data:image/svg+xml;charset=utf-8,')))throw Error('owner_avatars_unverified');
   exclusive=result.avatars;
  }catch{exclusiveUnavailable=true;}
 }
 if(!config.isCurrentOwner())throw Error('avatar_session_changed');
 const raw=user.user_metadata?.[AVATAR_METADATA_KEY];
 return {choice:normalizeAvatarChoice(raw,isOwnerAdmin(user)),exclusive,exclusiveUnavailable};
}
export async function saveAvatarProfile(config,choice,fetchImpl=fetch){
 const {token,user}=await verifiedSession(config);
 if(!validAvatarChoice(choice,isOwnerAdmin(user))||!config.isCurrentOwner())throw Error('avatar_choice_invalid');
 const value=normalizeAvatarChoice(choice,isOwnerAdmin(user));
 const response=await fetchImpl(config.supabaseUrl+'/auth/v1/user',{method:'PUT',headers:{apikey:config.apiKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({data:{[AVATAR_METADATA_KEY]:value}}),cache:'no-store',redirect:'error'});
 if(!response.ok)throw Error('avatar_save_failed');
 const updated=await response.json();
 if(updated.id!==config.ownerId||!config.isCurrentOwner()||updated.user_metadata?.[AVATAR_METADATA_KEY]?.id!==value.id||updated.user_metadata?.[AVATAR_METADATA_KEY]?.background!==value.background)throw Error('avatar_save_unverified');
 const confirmed=await auth.getUser(token);
 if(confirmed.error||confirmed.data?.user?.id!==config.ownerId||!config.isCurrentOwner()||!validAvatarChoice(value,isOwnerAdmin(confirmed.data.user))||confirmed.data.user.user_metadata?.[AVATAR_METADATA_KEY]?.id!==value.id||confirmed.data.user.user_metadata?.[AVATAR_METADATA_KEY]?.background!==value.background)throw Error('avatar_save_unverified');
 return value;
}
