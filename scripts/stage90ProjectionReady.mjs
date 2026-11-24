// Only a read-only API probe is retried, and only while PostgREST's
// schema cache has not yet registered a freshly committed function.
// Permission, SQL, invalid shape and other errors fail immediately.
export async function requireProjectionReady(probe,{attempts=30,pause=()=>new Promise(r=>setTimeout(r,500))}={}){
 if(typeof probe!=='function'||!Number.isSafeInteger(attempts)||attempts<1||attempts>60)throw new Error('Invalid readiness probe');
 for(let i=0;i<attempts;i++){
  const response=await probe();
  if(response?.error?.code==='PGRST202'){
   if(i+1===attempts)throw new Error('Projection API not ready: PostgREST schema cache still missing RPC');
   await pause();
   continue;
  }
  if(response?.error||!Array.isArray(response?.data))throw new Error('Projection readiness failed: '+(response?.error?.code||'invalid response'));
  return response.data;
 }
}
