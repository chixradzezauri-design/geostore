// Owner-bound supplier API. The database RLS is the authorization boundary.
const OWNER='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const commissionValue=value=>{
  if(typeof value==='string'&&/^\d+(?:\.\d{1,2})?$/.test(value.trim()))value=Number(value);
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100&&Math.abs(value*100-Math.round(value*100))<1e-8?value:null;
};
export function normalizeSupplierDraft(input){
  const name=typeof input?.name==='string'?input.name.trim():'';
  const commission=commissionValue(input?.commission);
  if(!name||Array.from(name).length>100||commission===null)return null;
  return {name,commission};
}
const key=name=>name.trim().toLowerCase();
export function verifySupplierRows(rows){
  if(!Array.isArray(rows))throw Error('მომწოდებლების პასუხი არასწორია.');
  const ids=new Set(),names=new Set();
  return rows.map(row=>{
    const draft=normalizeSupplierDraft(row);
    if(!draft||draft.name!==row.name||typeof row.id!=='string'||!uuid.test(row.id)||ids.has(row.id.toLowerCase())||names.has(key(draft.name))||
      typeof row.is_active!=='boolean'||!Number.isSafeInteger(row.revision)||row.revision<1||typeof row.updated_at!=='string'||!Number.isFinite(Date.parse(row.updated_at)))throw Error('მომწოდებლის ჩანაწერი ვერ დადასტურდა.');
    ids.add(row.id.toLowerCase());names.add(key(draft.name));
    return {...draft,id:row.id,is_active:row.is_active,revision:row.revision,updated_at:row.updated_at};
  });
}
// Never overwrite or automatically upload legacy/default rows; present a
// reviewable plan and preserve same-name conflicts as separate decisions.
export function planLegacySupplierImport(localRows,serverRows){
  const verified=verifySupplierRows(serverRows);
  const existing=new Map(verified.map(row=>[key(row.name),row]));
  const grouped=new Map(),invalid=[];
  for(const row of Array.isArray(localRows)?localRows:[]){
    const draft=normalizeSupplierDraft(row);
    if(!draft){invalid.push(row);continue;}
    const k=key(draft.name);const entries=grouped.get(k)||[];entries.push(draft);grouped.set(k,entries);
  }
  const candidates=[],conflicts=[],already=[];
  for(const [k,entries] of grouped){
    const server=existing.get(k);
    if(entries.length!==1){conflicts.push({local:entries,server:server??null});continue;}
    const local=entries[0];
    if(!server)candidates.push(local);
    else if(server.name===local.name&&server.commission===local.commission&&server.is_active)already.push(local);
    else conflicts.push({local:entries,server});
  }
  return {candidates,conflicts,already,invalid};
}
export function createAdminSupplierApi({loadSession,expectedUserId,supabaseUrl,apiKey,fetchImpl=fetch,isCurrent=()=>true}={}){
  async function request(method,query,body){
    if(expectedUserId!==OWNER||!isCurrent()||typeof loadSession!=='function'||!supabaseUrl||!apiKey)throw Error('მომწოდებლების წვდომა ვერ დადასტურდა.');
    const {data,error}=await loadSession();const session=data?.session;
    if(error||!isCurrent()||session?.user?.id!==expectedUserId||session.user.app_metadata?.role!=='admin'||typeof session.access_token!=='string'||!session.access_token.trim())throw Error('ადმინისტრატორის სესია ვერ დადასტურდა.');
    const response=await fetchImpl(supabaseUrl.replace(/\/$/,'')+'/rest/v1/admin_suppliers?'+query.toString(),{method,headers:{apikey:apiKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
    if(!isCurrent())throw Error('ადმინისტრატორის სესია შეიცვალა.');
    if(!response.ok)throw Error('მომწოდებლის მოთხოვნა ვერ შესრულდა (HTTP '+response.status+').');
    const payload=await response.json();
    if(!isCurrent())throw Error('ადმინისტრატორის სესია შეიცვალა.');
    return verifySupplierRows(payload);
  }
  return {
    async list(){
      const all=[];
      for(let offset=0;offset<10000;offset+=200){
        const rows=await request('GET',new URLSearchParams({select:'id,name,commission,is_active,revision,updated_at',order:'id.asc',limit:'200',offset:String(offset)}));
        all.push(...rows);
        if(rows.length<200)return verifySupplierRows(all);
      }
      throw Error('მომწოდებლების სრული სია ვერ დადასტურდა.');
    },
    async create(input){
      const draft=normalizeSupplierDraft(input);if(!draft)throw Error('მომწოდებლის მონაცემები არასწორია.');
      const rows=await request('POST',new URLSearchParams({select:'id,name,commission,is_active,revision,updated_at'}),{...draft,is_active:true});
      if(rows.length!==1||rows[0].name!==draft.name||rows[0].commission!==draft.commission||!rows[0].is_active||rows[0].revision!==1)throw Error('შენახვა ვერ დადასტურდა.');
      return rows[0];
    },
    async update(row,{commission,is_active}){
      const [before]=verifySupplierRows([row]);const amount=commissionValue(commission);
      if(amount===null||typeof is_active!=='boolean')throw Error('მომწოდებლის ცვლილება არასწორია.');
      const rows=await request('PATCH',new URLSearchParams({id:'eq.'+before.id,revision:'eq.'+before.revision,select:'id,name,commission,is_active,revision,updated_at'}),{commission:amount,is_active});
      if(rows.length!==1||rows[0].id!==before.id||rows[0].name!==before.name||rows[0].revision!==before.revision+1||rows[0].commission!==amount||rows[0].is_active!==is_active)throw Error('ცვლილება ვერ დადასტურდა. განაახლეთ სია.');
      return rows[0];
    }
  };
}
