import {createAdminSupplierApi} from './adminSupplierApi.js';
const OWNER='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const integer=(v,min,max)=>{if(typeof v==='string'&&/^\d+$/.test(v))v=Number(v);return Number.isSafeInteger(v)&&v>=min&&v<=max?v:null;};
const amount=v=>{if(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v))v=Number(v);return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9&&Math.abs(v*100-Math.round(v*100))<1e-5?v:null;};
const variantId=v=>typeof v==='string'&&v.trim()!==''&&v.length<=120;
export const purchaseLineKey=(product,variant)=>JSON.stringify([product,variant??null]);
export function purchaseCatalogOptions(products,supplierName){
 if(!Array.isArray(products)||!supplierName)return [];
 const options=[],seen=new Set(),duplicates=new Set();
 for(const p of products){
  if(!p||typeof p.id!=='string'||!p.id.trim()||p.vendor!==supplierName||typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.variants))continue;
  if(seen.has(p.id)){duplicates.add(p.id);continue;}seen.add(p.id);
  if(!p.variants.length){if(integer(p.stock,0,1000000)!==null)options.push({product_id:p.id,variant_id:null,label:p.name,stock:Number(p.stock)});continue;}
  const ids=new Set();
  if(p.variants.some(v=>{if(!variantId(v?.id)||ids.has(v.id)||integer(v.stock,0,1000000)===null)return true;ids.add(v.id);return false;}))continue;
  for(const v of p.variants)if(typeof v.name==='string'&&v.name.trim()&&typeof v.variantType==='string'&&v.variantType.trim())options.push({product_id:p.id,variant_id:v.id,label:p.name+' · '+v.name,stock:Number(v.stock)});
 }
 return options.filter(o=>!duplicates.has(o.product_id));
}
const statuses=['draft','approved','partial','received','cancelled'];
export function normalizePurchaseLines(lines){
 if(!Array.isArray(lines)||!lines.length||lines.length>50)return null;
 const ids=new Set(),result=[];
 for(const row of lines){
  const id=row?.product_id,variant=row?.variant_id,key=purchaseLineKey(id,variant),quantity=integer(row?.quantity,1,1000000),unit_cost=amount(row?.unit_cost);
  if(typeof id!=='string'||!id.trim()||ids.has(key)||(variant!=null&&!variantId(variant))||quantity===null||unit_cost===null)return null;
  ids.add(key);result.push({product_id:id,...(variant!=null?{variant_id:variant}:{}),quantity,unit_cost});
 }
 return result;
}
export function verifyPurchaseRows(rows){
 if(!Array.isArray(rows))throw Error('შესყიდვების პასუხი არასწორია.');
 const ids=new Set();
 return rows.map(order=>{
  if(!uuid(order?.id)||ids.has(order.id)||!uuid(order.supplier_id)||typeof order.supplier_name!=='string'||!order.supplier_name.trim()||!statuses.includes(order.status)||!Number.isSafeInteger(order.revision)||order.revision<1||!Number.isFinite(Date.parse(order.created_at))||!Array.isArray(order.admin_purchase_lines)||!Array.isArray(order.admin_purchase_receipts))throw Error('შესყიდვის ჩანაწერი ვერ დადასტურდა.');
  ids.add(order.id);
  const rawLines=order.admin_purchase_lines,normalized=normalizePurchaseLines(rawLines);
  if(!normalized)throw Error('შესყიდვის დეტალები არასრულია.');
  const lineIds=new Set(),receipts=new Set(),sums=new Map();
  const lines=rawLines.map((line,i)=>{
   if(!uuid(line.id)||lineIds.has(line.id)||line.purchase_id!==order.id||typeof line.product_name!=='string'||!line.product_name.trim()||(line.variant_id!=null?(!variantId(line.variant_id)||typeof line.variant_name!=='string'||!line.variant_name.trim()||typeof line.variant_type!=='string'||!line.variant_type.trim()):(line.variant_name!=null||line.variant_type!=null))||integer(line.received_quantity,0,normalized[i].quantity)===null)throw Error('შესყიდვის ხაზი ვერ დადასტურდა.');
   lineIds.add(line.id);return {...line,...normalized[i],received_quantity:Number(line.received_quantity)};
  });
  for(const r of order.admin_purchase_receipts){
   const line=lines.find(l=>l.id===r?.line_id);
   if(!line||!uuid(r.id)||receipts.has(r.id)||r.purchase_id!==order.id||integer(r.quantity,1,1000000)===null||integer(r.stock_before,0,1000000)===null||integer(r.stock_after,0,1000000)===null||Number(r.stock_after)!==Number(r.stock_before)+Number(r.quantity)||amount(r.unit_cost)!==line.unit_cost||!Number.isFinite(Date.parse(r.received_at)))throw Error('მიღების ისტორია ვერ დადასტურდა.');
   receipts.add(r.id);sums.set(line.id,(sums.get(line.id)||0)+Number(r.quantity));
  }
  if(lines.some(l=>l.received_quantity!==(sums.get(l.id)||0)))throw Error('მიღების ისტორია არასრულია.');
  const any=lines.some(l=>l.received_quantity>0),all=lines.every(l=>l.received_quantity===l.quantity);
  if(order.status==='received'?!all:order.status==='partial'?(!any||all):any)throw Error('შესყიდვის სტატუსი არ ემთხვევა მიღებას.');
  return {...order,admin_purchase_lines:lines};
 });
}
const projection='id,supplier_id,supplier_name,status,revision,created_at,admin_purchase_lines(id,purchase_id,product_id,product_name,variant_id,variant_name,variant_type,quantity,received_quantity,unit_cost),admin_purchase_receipts(id,purchase_id,line_id,quantity,stock_before,stock_after,unit_cost,received_at)';
export function createAdminPurchaseApi({loadSession,expectedUserId,supabaseUrl,apiKey,fetchImpl=fetch,isCurrent=()=>true}={}){
 const config={loadSession,expectedUserId,supabaseUrl,apiKey,fetchImpl,isCurrent};
 async function request(path,method='GET',body){
  if(expectedUserId!==OWNER||!isCurrent()||typeof loadSession!=='function'||!supabaseUrl||!apiKey)throw Error('შესყიდვების წვდომა ვერ დადასტურდა.');
  const {data,error}=await loadSession(),s=data?.session;
  if(error||!isCurrent()||s?.user?.id!==OWNER||s.user.app_metadata?.role!=='admin'||typeof s.access_token!=='string'||!s.access_token.trim())throw Error('ადმინისტრატორის სესია ვერ დადასტურდა.');
  const response=await fetchImpl(supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers:{apikey:apiKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!isCurrent()||!response.ok)throw Error('შესყიდვის მოთხოვნა ვერ დადასტურდა (HTTP '+response.status+').');
  const result=await response.json();
  if(!isCurrent())throw Error('სესია შეიცვალა.');
  return result;
 }
 return {
  suppliers:()=>createAdminSupplierApi(config).list(),
  async list(){const data=verifyPurchaseRows(await request('admin_purchase_orders?'+new URLSearchParams({select:projection,order:'created_at.desc,id.desc',limit:'101'})));return {orders:data.slice(0,100),hasMore:data.length>100};},
  async get(id){if(!uuid(id))throw Error('შესყიდვის ID არასწორია.');const rows=verifyPurchaseRows(await request('admin_purchase_orders?'+new URLSearchParams({select:projection,id:'eq.'+id})));if(rows.length>1||rows.some(r=>r.id!==id))throw Error('შესყიდვის პასუხი არასწორია.');return rows[0]??null;},
  async create(id,supplier,lines){const clean=normalizePurchaseLines(lines);if(!uuid(id)||!uuid(supplier)||!clean)throw Error('შესყიდვის მონახაზი არასწორია.');const r=await request('rpc/admin_create_purchase','POST',{p_id:id,p_supplier:supplier,p_lines:clean});if(r?.id!==id||r.supplier_id!==supplier||r.status!=='draft'||r.revision!==1)throw Error('მონახაზი ვერ დადასტურდა.');return r;},
  async transition(order,action){if(!uuid(order?.id)||!Number.isSafeInteger(order.revision)||!['approve','cancel'].includes(action)||!(action==='approve'?order.status==='draft':['draft','approved'].includes(order.status)))throw Error('სტატუსის ცვლილება არასწორია.');const r=await request('rpc/admin_transition_purchase','POST',{p_id:order.id,p_revision:order.revision,p_action:action});if(r?.id!==order.id||r.status!==(action==='approve'?'approved':'cancelled')||r.revision!==order.revision+1)throw Error('სტატუსი ვერ დადასტურდა.');return r;},
  async receive(order,line,id,quantity){const qty=integer(quantity,1,1000000);if(!uuid(id)||!uuid(order?.id)||!uuid(line?.id)||line.purchase_id!==order.id||!Number.isSafeInteger(order.revision)||!['approved','partial'].includes(order.status)||qty===null||qty>line.quantity-line.received_quantity)throw Error('მიღების მონაცემები არასწორია.');const r=await request('rpc/admin_receive_purchase','POST',{p_id:order.id,p_line:line.id,p_receipt:id,p_revision:order.revision,p_quantity:qty});if(r?.id!==id||r.purchase_id!==order.id||r.line_id!==line.id||r.quantity!==qty||integer(r.stock_before,0,1000000)===null||integer(r.stock_after,0,1000000)===null||r.stock_after!==r.stock_before+qty||amount(r.unit_cost)!==line.unit_cost||typeof r.idempotent_replay!=='boolean')throw Error('საქონლის მიღება ვერ დადასტურდა.');return r;}
 };
}
export function purchaseOperationConfirmed(operation,order){
 if(!operation||!order||order.id!==operation.orderId)return false;
 if(operation.type==='receive')return order.admin_purchase_receipts.some(r=>r.id===operation.receiptId&&r.line_id===operation.line.id&&Number(r.quantity)===Number(operation.quantity));
 if(operation.type==='create')return order.supplier_id===operation.supplierId&&operation.lines.length===order.admin_purchase_lines.length&&operation.lines.every(l=>order.admin_purchase_lines.some(x=>purchaseLineKey(x.product_id,x.variant_id)===purchaseLineKey(l.product_id,l.variant_id)&&x.quantity===l.quantity&&x.unit_cost===l.unit_cost));
 if(operation.type==='transition')return order.revision>operation.order.revision&&(operation.action==='cancel'?order.status==='cancelled':['approved','partial','received'].includes(order.status));
 return false;
}
