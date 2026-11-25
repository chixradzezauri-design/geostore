// Server-only, unapplied release candidate. Never import into storefront code.
// No automatic execution, credentials, schedule, or arbitrary caller path.
const BUCKET='customer-wardrobe-private';
const pattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;
export async function runWardrobeErasureBatch({enabled=false,client,limit=10}={}){
 if(enabled!==true)return {status:'disabled',erased:0,pending:0};
 if(!Number.isSafeInteger(limit)||limit<1||limit>20)return {status:'blocked',erased:0,pending:0};
 let jobs;
 try{
  const result=await client.rpc('customer_wardrobe_erasure_batch',{p_limit:limit});
  if(result?.error||!Array.isArray(result?.data)||result.data.length>limit)return {status:'blocked',erased:0,pending:0};
  jobs=result.data;
  if(jobs.some(j=>typeof j?.path!=='string'||!pattern.test(j.path))||new Set(jobs.map(j=>j.path)).size!==jobs.length)
   return {status:'blocked',erased:0,pending:0};
 }catch{return {status:'blocked',erased:0,pending:0};}
 let erased=0,pending=0;
 for(const {path} of jobs){
  try{
   const removed=await client.storage.from(BUCKET).remove([path]);
   // Missing/ambiguous responses stay pending. Reconciliation must not
   // infer physical erasure solely from an absent metadata row.
   if(removed?.error||!Array.isArray(removed?.data)||removed.data.length!==1||removed.data[0]?.name!==path){pending++;continue;}
   const ack=await client.rpc('customer_wardrobe_confirm_erasure',{p_path:path});
   if(ack?.error||ack?.data?.status!=='erased'){pending++;continue;}
   erased++;
  }catch{pending++;}
 }
 return {status:pending?'pending':'complete',erased,pending};
}
