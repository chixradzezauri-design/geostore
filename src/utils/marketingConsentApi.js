import {verifyCampaignList,campaignRequest,verifyCampaignAck} from './marketingCampaigns.js';
import {verifyTemplateList,templateRequest,verifyTemplateAck} from './marketingTemplates.js';
import {preflightRequest,verifyPreflightAck,verifyPreflightHistory} from './marketingPreflight.js';
const OWNER='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
export const MARKETING_POLICY='email-marketing-v1';
export const segmentKeys=['all','vip','new','no_purchase','one_purchase','repeat','inactive'];
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const count=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v);
export function verifyConsent(data){
 if(!data||!['not_set','withdrawn','reconfirmation_required','opted_in'].includes(data.status)||data.policy_version!==MARKETING_POLICY||typeof data.can_opt_in!=='boolean'||(data.status==='not_set'?(data.event_id!==null||data.recorded_at!==null):(!uuid(data.event_id)||!Number.isFinite(Date.parse(data.recorded_at))))||(data.status==='opted_in'&&!data.can_opt_in))throw Error('Invalid consent snapshot');
 return data;
}
export function verifySegments(data){
 if(!data||data.timezone!=='Asia/Tbilisi'||data.new_days!==30||data.inactive_days!==90||!Number.isFinite(Date.parse(data.as_of))||!data.segments||Object.keys(data.segments).length!==segmentKeys.length)throw Error('Invalid segment snapshot');
 for(const key of segmentKeys){const row=data.segments[key];if(!count(row?.accounts)||!count(row?.consent_candidates)||BigInt(row.consent_candidates)>BigInt(row.accounts))throw Error('Invalid segment counts');}
 const a=data.segments.all;
 for(const key of segmentKeys){const row=data.segments[key];if(BigInt(row.accounts)>BigInt(a.accounts)||BigInt(row.consent_candidates)>BigInt(a.consent_candidates))throw Error('Inconsistent segment totals');}
 for(const field of ['accounts','consent_candidates'])if(['no_purchase','one_purchase','repeat'].reduce((n,k)=>n+BigInt(data.segments[k][field]),0n)!==BigInt(a[field]))throw Error('Inconsistent purchase groups');
 return data;
}
export function createMarketingApi({expectedUserId,loadSession,supabaseUrl,apiKey,isCurrent=()=>true,fetchImpl=fetch}={}){
 async function request(name,body,owner=false){
  if(!uuid(expectedUserId)||!isCurrent()||!supabaseUrl||!apiKey||typeof loadSession!=='function'||(owner&&expectedUserId!==OWNER))throw Error('Session unavailable');
  const {data,error}=await loadSession(),s=data?.session;
  if(error||!isCurrent()||s?.user?.id!==expectedUserId||typeof s.access_token!=='string'||!s.access_token.trim()||(owner&&s.user.app_metadata?.role!=='admin'))throw Error('Session unavailable');
  const response=await fetchImpl(supabaseUrl.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:apiKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  if(!isCurrent()||!response.ok)throw Error('Request unavailable');
  const result=await response.json();if(!isCurrent())throw Error('Session changed');return result;
 }
 return {
  async readConsent(){return verifyConsent(await request('my_marketing_email_consent',{}));},
  async setConsent(id,optedIn){
   if(!uuid(id)||typeof optedIn!=='boolean')throw Error('Invalid consent request');
   const r=verifyConsent(await request('set_my_marketing_email_consent',{p_event:id,p_opted_in:optedIn,p_policy_version:MARKETING_POLICY}));
   if(r.acknowledged_event_id!==id||typeof r.idempotent_replay!=='boolean')throw Error('Consent acknowledgement mismatch');
   return r;
  },
  async segments(){return verifySegments(await request('admin_marketing_segments',{},true));},
  async campaigns(id=null){if(id!==null&&!uuid(id))throw Error('Invalid campaign ID');return verifyCampaignList(await request('admin_read_marketing_campaigns',{p_id:id},true),id);},
  async saveCampaign(op){return verifyCampaignAck(await request('admin_save_marketing_campaign',campaignRequest(op),true),op);},
  async templates(id=null){if(id!==null&&!uuid(id))throw Error('Invalid template ID');return verifyTemplateList(await request('admin_read_marketing_templates',{p_id:id},true),id);},
  async saveTemplate(op){return verifyTemplateAck(await request('admin_save_marketing_template',templateRequest(op),true),op);},
  async preflights(id,requestId=null){if(!uuid(id)||(requestId!==null&&!uuid(requestId)))throw Error('Invalid preflight scope');return verifyPreflightHistory(await request('admin_read_marketing_preflights',{p_id:id,p_request:requestId},true),id,requestId);},
  async checkCampaign(op){return verifyPreflightAck(await request('admin_check_marketing_campaign',preflightRequest(op),true),op);}
 };
}
