import {readFileSync} from 'node:fs';
import {readPublicConfig} from '../scripts/advancedAdminDataApiProbe.mjs';
import {createOwnerAvatarHandler} from '../server/ownerProfileAvatars.js';
export default createOwnerAvatarHandler({loadUser:async token=>{
 const {url,key}=readPublicConfig(readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8'));
 const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(response.status===401||response.status===403)return null;
 if(!response.ok)throw Error('auth_unavailable');
 return response.json();
}});
