const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const count=v=>typeof v==='string'&&/^(0|[1-9]\d{0,18})$/.test(v);
export const campaignSegments={all:'ყველა მომხმარებელი',vip:'VIP',new:'ახალი მომხმარებელი',no_purchase:'შესყიდვის გარეშე',one_purchase:'ერთჯერადი მყიდველი',repeat:'განმეორებითი მყიდველი',inactive:'არააქტიური'};
export const campaignTemplates=[
 {id:'welcome',label:'მისასალმებელი შეთავაზება',segment:'new',subject:'მოგესალმებით GEOSTORE-ში',body:'გმადლობთ, რომ შემოგვიერთდით. დაათვალიერეთ ჩვენი ახალი კოლექცია და შეარჩიეთ თქვენთვის სასურველი პროდუქტი.'},
 {id:'vip',label:'VIP შეთავაზება',segment:'vip',subject:'შეთავაზება ჩვენი VIP მომხმარებლებისთვის',body:'გმადლობთ ნდობისთვის. გაეცანით GEOSTORE-ის მიმდინარე შეთავაზებებს.'},
 {id:'return',label:'დაბრუნების მოწვევა',segment:'inactive',subject:'აღმოაჩინეთ GEOSTORE-ის სიახლეები',body:'გაეცანით ახალ პროდუქტებსა და მიმდინარე შეთავაზებებს. მოხარული ვიქნებით თქვენი დაბრუნებით.'}
];
const textValid=(v,max,multiline=false)=>typeof v==='string'&&v.trim()===v&&v.length>0&&[...v].length<=max&&!(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/:/[\u0000-\u001f\u007f-\u009f]/).test(v);
export function tbilisiPlanToIso(value){
 if(value==='')return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return undefined;
 const time=Date.parse(value+':00+04:00');
 if(!Number.isFinite(time)||new Date(time+4*3600000).toISOString().slice(0,16)!==value)return undefined;
 return new Date(time).toISOString();
}
export function isoToTbilisiPlan(value){
 if(value===null)return '';
 const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms+4*3600000).toISOString().slice(0,16):'';
}
export function normalizeCampaignFields(form){
 const fields={name:form?.name?.trim(),segment:form?.segment,subject:form?.subject?.trim(),body:form?.body?.trim(),planned_at:form?.planned_at};
 if(!textValid(fields.name,120)||!Object.hasOwn(campaignSegments,fields.segment)||!textValid(fields.subject,160)||!textValid(fields.body,10000,true)||(fields.planned_at!==null&&(typeof fields.planned_at!=='string'||!Number.isFinite(Date.parse(fields.planned_at)))))return null;
 return fields;
}
export function verifyCampaign(row){
 if(!uuid(row?.id)||!count(row.revision)||row.revision==='0'||typeof row.archived!=='boolean'||row.delivery_enabled!==false||!Number.isFinite(Date.parse(row.created_at))||!Number.isFinite(Date.parse(row.updated_at))||!normalizeCampaignFields(row)||(row.archived&&row.planned_at!==null))throw Error('Invalid campaign response');
 return row;
}
export function verifyCampaignList(data,id=null){
 if(data?.delivery_enabled!==false||!count(data.total)||!Array.isArray(data.campaigns)||BigInt(data.campaigns.length)!==(BigInt(data.total)>100n?100n:BigInt(data.total)))throw Error('Invalid campaign list');
 const ids=new Set();
 for(const row of data.campaigns){verifyCampaign(row);if(ids.has(row.id)||(id!==null&&row.id!==id))throw Error('Invalid campaign identity');ids.add(row.id);}
 if(id!==null&&BigInt(data.total)>1n)throw Error('Invalid campaign scope');
 return data;
}
export function campaignRequest(op){
 if(!uuid(op?.id)||!uuid(op.requestId)||!count(op.revision)||!['create','edit','archive'].includes(op.operation)||(op.operation==='create'?op.revision!=='0':op.revision==='0'))throw Error('Invalid campaign operation');
 const f=op.operation==='archive'?{name:null,segment:null,subject:null,body:null,planned_at:null}:normalizeCampaignFields(op.fields);
 if(!f)throw Error('Invalid campaign fields');
 return {p_id:op.id,p_request:op.requestId,p_revision:op.revision,p_operation:op.operation,p_name:f.name,p_segment:f.segment,p_subject:f.subject,p_body:f.body,p_planned_at:f.planned_at};
}
export function campaignConfirmed(row,op){
 if(!row||row.id!==op.id||row.revision!==(BigInt(op.revision)+1n).toString()||row.delivery_enabled!==false)return false;
 if(op.operation==='archive')return row.archived===true&&row.planned_at===null;
 const f=normalizeCampaignFields(op.fields);
 return !!f&&!row.archived&&['name','segment','subject','body'].every(k=>row[k]===f[k])&&(f.planned_at===null?row.planned_at===null:Date.parse(row.planned_at)===Date.parse(f.planned_at));
}
export function verifyCampaignAck(row,op){
 verifyCampaign(row);
 if(row.request_id!==op.requestId||typeof row.idempotent_replay!=='boolean'||!campaignConfirmed(row,op))throw Error('Campaign acknowledgement mismatch');
 return row;
}
