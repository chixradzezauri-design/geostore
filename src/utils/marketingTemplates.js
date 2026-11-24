import {normalizeCampaignFields} from './marketingCampaigns.js';
export const templateCategories={welcome:'მისალმება',loyalty:'ლოიალობა',promotion:'აქცია',reactivation:'დაბრუნება',other:'სხვა'};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const count=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v);
export function normalizeTemplate(form){
 if(!form||!['name','segment','subject','body'].every(k=>typeof form[k]==='string')||!Object.hasOwn(templateCategories,form.category))return null;
 const fields=normalizeCampaignFields({...form,planned_at:null});
 if(!fields)return null;
 const {planned_at,...content}=fields;return {...content,category:form.category};
}
export function verifyTemplate(row){
 const f=normalizeTemplate(row);
 if(!uuid(row?.id)||!count(row.revision)||row.revision==='0'||typeof row.archived!=='boolean'||!Number.isFinite(Date.parse(row.recorded_at))||!f||Object.keys(f).some(k=>f[k]!==row[k]))throw Error('Invalid template');
 return row;
}
export function verifyTemplateList(data,id=null){
 if(!count(data?.total)||!Array.isArray(data.templates)||BigInt(data.templates.length)!==(BigInt(data.total)>100n?100n:BigInt(data.total))||(id!==null&&BigInt(data.total)>1n))throw Error('Invalid template list');
 const ids=new Set();for(const row of data.templates){verifyTemplate(row);if(ids.has(row.id)||(id!==null&&row.id!==id))throw Error('Invalid template scope');ids.add(row.id);}return data;
}
export function templateRequest(op){
 if(!uuid(op?.id)||!uuid(op.requestId)||!count(op.revision)||!['create','edit','archive'].includes(op.operation)||(op.operation==='create'?op.revision!=='0':op.revision==='0'))throw Error('Invalid template operation');
 const fields=op.operation==='archive'?{}:normalizeTemplate(op.fields);if(!fields)throw Error('Invalid template fields');
 return {p_id:op.id,p_request:op.requestId,p_revision:op.revision,p_operation:op.operation,p_fields:fields};
}
export function templateConfirmed(row,op){
 if(!row||row.id!==op.id||row.revision!==(BigInt(op.revision)+1n).toString())return false;
 if(op.operation==='archive')return row.archived===true;
 const f=normalizeTemplate(op.fields);return !!f&&!row.archived&&Object.keys(f).every(k=>row[k]===f[k]);
}
export function verifyTemplateAck(row,op){verifyTemplate(row);if(row.request_id!==op.requestId||typeof row.idempotent_replay!=='boolean'||!templateConfirmed(row,op))throw Error('Template acknowledgement mismatch');return row;}
