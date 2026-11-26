import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_AVATARS,OWNER_AVATAR_IDS,AVATAR_BACKGROUNDS,normalizeAvatarChoice,validAvatarChoice,AVATAR_METADATA_KEY} from '../src/utils/customerAvatarCatalog.js';
import {avatarSvg} from '../src/utils/customerAvatarArt.js';
import {ownerAvatarPayload,createOwnerAvatarHandler} from '../server/ownerProfileAvatars.js';
import {saveAvatarProfile} from '../src/utils/customerAvatarProfile.js';
const owner={id:'1060de3d-d28a-45f8-9a64-5e0368cffc4b',app_metadata:{role:'admin'}};
test('60 distinct public portraits, boy and girl choices and eight backgrounds',()=>{
 assert.equal(PUBLIC_AVATARS.length,60);assert.equal(new Set(PUBLIC_AVATARS.map(a=>a.id)).size,60);
 assert.equal(new Set(PUBLIC_AVATARS.map(avatarSvg)).size,60);
 assert.equal(PUBLIC_AVATARS.filter(a=>a.category==='boy').length,18);
 assert.equal(PUBLIC_AVATARS.filter(a=>a.category==='girl').length,18);
 assert.equal(AVATAR_BACKGROUNDS.length,8);
 assert.ok(PUBLIC_AVATARS.every(a=>!OWNER_AVATAR_IDS.includes(a.id)));
});
test('owner-only art rejects staff and forged metadata; three distinct exclusive assets',()=>{
 assert.equal(ownerAvatarPayload({id:'other',app_metadata:{role:'admin'}}),null);
 assert.equal(ownerAvatarPayload({id:owner.id,user_metadata:{role:'admin'}}),null);
 const rows=ownerAvatarPayload(owner);assert.equal(rows.length,3);assert.equal(new Set(rows.map(a=>a.src)).size,3);
 assert.equal(validAvatarChoice({id:OWNER_AVATAR_IDS[0],background:'sand'},false),false);
 assert.equal(normalizeAvatarChoice({id:OWNER_AVATAR_IDS[0],background:'bad'},false).id,PUBLIC_AVATARS[0].id);
});
test('private avatar endpoint is no-store and authorization-gated',async()=>{
 let response;const res={setHeader(k,v){this[k]=v},status(n){this.code=n;return this},json(data){response=data;return this}};
 const handler=createOwnerAvatarHandler({loadUser:async token=>token.startsWith('owner')?owner:{id:'customer'}});
 await handler({method:'GET',headers:{}},res);assert.equal(res.code,401);
 await handler({method:'GET',headers:{authorization:'Bearer customer-token-123456789'}},res);assert.equal(res.code,403);assert.equal(response.avatars,undefined);
 await handler({method:'GET',headers:{authorization:'Bearer owner-token-123456789'}},res);assert.equal(res.code,200);assert.equal(response.avatars.length,3);assert.match(res['Cache-Control'],/no-store/);
});
test('save binds preference to verified owner and sends only avatar metadata',async()=>{
 const user={id:'customer',user_metadata:{name:'Name'}};
 const auth={getSession:async()=>({data:{session:{user,access_token:'token'}}}),getUser:async()=>({data:{user}})};
 const config={auth,ownerId:user.id,isCurrentOwner:()=>true,supabaseUrl:'https://example.com',apiKey:'public'};
 const choice={id:'classic-girl-2',background:'mint'};let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.deepEqual(JSON.parse(options.body),{data:{[AVATAR_METADATA_KEY]:choice}});return {ok:true,json:async()=>({...user,user_metadata:{...user.user_metadata,[AVATAR_METADATA_KEY]:choice}})}};
 assert.deepEqual(await saveAvatarProfile(config,choice,fetcher),choice);
 await assert.rejects(saveAvatarProfile(config,{id:OWNER_AVATAR_IDS[0],background:'sand'},fetcher));
 assert.equal(calls,1);
});
