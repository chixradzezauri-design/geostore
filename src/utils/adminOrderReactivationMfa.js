// Candidate helper for the isolated fresh-password client, not main Auth.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listReactivationTotpFactors(client){
 const r=await client.auth.mfa.listFactors();
 if(r?.error||!Array.isArray(r?.data?.totp))throw Error('ავტორიზაციის მოწყობილობები ვერ დადასტურდა.');
 return r.data.totp.filter(f=>f?.status==='verified'&&typeof f.id==='string'&&uuid.test(f.id))
 .map(f=>({id:f.id,label:typeof f.friendly_name==='string'?f.friendly_name.slice(0,80):''}));
}
export async function verifyReactivationTotp({client,ownerId,factorId,code,isCurrent}){
 const active=()=>{if(typeof isCurrent!=='function'||!isCurrent())throw Error('ადმინისტრატორის სესია შეიცვალა.');};
 active();
 if(typeof ownerId!=='string'||!uuid.test(ownerId)||typeof factorId!=='string'||!uuid.test(factorId)||typeof code!=='string'||!/^\d{6}$/.test(code))throw Error('შეიყვანეთ სწორი უსაფრთხოების კოდი.');
 const before=await client.auth.getUser();active();
 if(before?.error||before?.data?.user?.id!==ownerId||before.data.user.app_metadata?.role!=='admin')throw Error('ადმინისტრატორის სესია ვერ დადასტურდა.');
 const factors=await listReactivationTotpFactors(client);active();
 if(!factors.some(f=>f.id===factorId))throw Error('ავტორიზაციის მოწყობილობა აღარ არის ხელმისაწვდომი.');
 const challenge=await client.auth.mfa.challenge({factorId});active();
 if(challenge?.error||!uuid.test(challenge?.data?.id||''))throw Error('უსაფრთხოების შემოწმება ვერ დაიწყო.');
 const verified=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});active();
 const token=verified?.data?.access_token;
 if(verified?.error||typeof token!=='string'||!token)throw Error('უსაფრთხოების კოდი ვერ დადასტურდა.');
 const session=await client.auth.getSession();active();
 if(session?.error||session?.data?.session?.access_token!==token||session.data.session.user?.id!==ownerId)throw Error('ახალი სესია ვერ დადასტურდა.');
 const user=await client.auth.getUser(token);active();
 if(user?.error||user?.data?.user?.id!==ownerId||user.data.user.app_metadata?.role!=='admin')throw Error('ადმინისტრატორის უფლებები ვერ დადასტურდა.');
 const level=await client.auth.mfa.getAuthenticatorAssuranceLevel();active();
 if(level?.error||level?.data?.currentLevel!=='aal2'||level.data.nextLevel!=='aal2')throw Error('დამატებითი უსაფრთხოება ვერ დადასტურდა.');
 // Server independently validates session, AAL2 and fresh password AMR in the order RPC.
 return token;
}
