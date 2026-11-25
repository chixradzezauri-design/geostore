// Presentation state only. Never use this state to authorize admin requests.
export const initialMfaView=()=>({stage:'idle',factors:[],factorId:'',secret:'',notice:''});
export const normalizeMfaCode=value=>String(value??'').replace(/[^0-9]/g,'').slice(0,6);
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function reduceMfaResult(previous,result,scope){
 const status=result?.status;
 if(status==='challenge-required'){
  const factors=Array.isArray(result.factors)?result.factors.filter(f=>typeof f?.id==='string'&&idPattern.test(f.id)).map(f=>({id:f.id,label:typeof f.label==='string'?f.label.slice(0,80):''})):[];
  if(!factors.length)return {...initialMfaView(),stage:'blocked',notice:'blocked'};
  return {...initialMfaView(),stage:'challenge',factors,factorId:factors[0].id};
 }
 if(status==='enrollment-required')return {...initialMfaView(),stage:'setup'};
 if(status==='enrollment-pending'){
  if(result.ownerId===scope?.ownerId&&result.epoch===scope?.epoch&&typeof result.factorId==='string'&&idPattern.test(result.factorId)&&typeof result.secret==='string'&&/^[A-Z2-7]{16,128}={0,6}$/i.test(result.secret))
   return {...initialMfaView(),stage:'enroll',factorId:result.factorId,secret:result.secret};
  // An earlier enrollment whose secret was cleared must not be recreated automatically.
  return {...initialMfaView(),stage:'blocked',notice:'enrollment-pending'};
 }
 if(status==='verified'||status==='recheck-required'||status==='refresh-required')
  return {...initialMfaView(),stage:'recheck',notice:status};
 if(status==='inactive'||status==='disabled')return {...initialMfaView(),stage:'blocked',notice:status};
 if(['verification-failed','invalid','busy','blocked'].includes(status))return {...previous,notice:status};
 return {...initialMfaView(),stage:'blocked',notice:'blocked'};
}
