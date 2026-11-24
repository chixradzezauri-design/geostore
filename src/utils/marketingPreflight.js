import {campaignSegments} from './marketingCampaigns.js';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const count=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v);
const revision=v=>count(v)&&v!=='0';
export const preflightBlockers={
 delivery_disabled:'გაგზავნა გამორთულია',
 provider_not_configured:'ელფოსტის მომწოდებელი არ არის კონფიგურირებული',
 sender_not_verified:'გამგზავნის მისამართი არ არის დადასტურებული',
 unsubscribe_not_verified:'გამოწერის გაუქმების მექანიზმი არ არის შემოწმებული',
 suppression_not_verified:'გამორიცხვის წესები საბოლოოდ არ არის შემოწმებული',
 privacy_review_pending:'კონფიდენციალურობის შემოწმება დარჩენილია',
 delivery_recheck_not_implemented:'გაგზავნამდე ხელახალი შემოწმება არ არის დანერგილი',
 no_consent_candidates:'თანხმობის კანდიდატები არ მოიძებნა',
 campaign_archived:'კამპანია არქივშია',
 planned_time_elapsed:'დაგეგმილი დრო გასულია'
};
const mandatory=Object.keys(preflightBlockers).slice(0,7);
export function verifyPreflight(row,id){
 if(!uuid(row?.request_id)||!uuid(id)||row.campaign_id!==id||!revision(row.campaign_revision)||!Object.hasOwn(campaignSegments,row.segment)||!count(row.accounts)||!count(row.consent_candidates)||BigInt(row.consent_candidates)>BigInt(row.accounts)||row.status!=='blocked'||row.delivery_enabled!==false||row.is_send_authorization!==false||!Array.isArray(row.blockers)||new Set(row.blockers).size!==row.blockers.length||!row.blockers.every(k=>Object.hasOwn(preflightBlockers,k))||!mandatory.every(k=>row.blockers.includes(k))||(row.consent_candidates==='0')!==row.blockers.includes('no_consent_candidates')||!Number.isFinite(Date.parse(row.audience_as_of))||!Number.isFinite(Date.parse(row.checked_at))||Date.parse(row.audience_as_of)>Date.parse(row.checked_at))throw Error('Invalid preflight');
 return row;
}
export function preflightRequest(op){
 if(!uuid(op?.id)||!uuid(op.requestId)||!revision(op.revision))throw Error('Invalid preflight request');
 return {p_id:op.id,p_revision:op.revision,p_request:op.requestId};
}
export function preflightConfirmed(row,op){
 return !!row&&row.campaign_id===op.id&&row.request_id===op.requestId&&row.campaign_revision===op.revision&&row.delivery_enabled===false&&row.is_send_authorization===false;
}
export function verifyPreflightAck(row,op){
 verifyPreflight(row,op.id);
 if(!preflightConfirmed(row,op)||typeof row.idempotent_replay!=='boolean')throw Error('Preflight acknowledgement mismatch');
 return row;
}
export function verifyPreflightHistory(data,id,requestId=null){
 if(!uuid(id)||(requestId!==null&&!uuid(requestId))||data?.campaign_id!==id||!revision(data.current_revision)||data.delivery_enabled!==false||!count(data.total)||!Array.isArray(data.checks)||BigInt(data.checks.length)!==(BigInt(data.total)>100n?100n:BigInt(data.total))||(requestId!==null&&BigInt(data.total)>1n))throw Error('Invalid preflight history');
 const ids=new Set();
 for(const row of data.checks){verifyPreflight(row,id);if(ids.has(row.request_id)||BigInt(row.campaign_revision)>BigInt(data.current_revision)||(requestId!==null&&row.request_id!==requestId))throw Error('Invalid preflight history scope');ids.add(row.request_id);}
 return data;
}
