// Read-only presentation of the current authenticated server snapshot.
export function filterCustomerNotifications(rows,filter='all',search=''){
 const query=typeof search==='string'?search.trim().replace(/^#/,'').toLowerCase():'';
 return (Array.isArray(rows)?rows:[]).filter(row=>row&&
  (filter==='all'||(filter==='unread'&&!row.read)||(filter==='read'&&!!row.read))&&
  (!query||String(row.orderId??'').toLowerCase().includes(query)));
}
export function summarizeSupportReplies(rows){
 const seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(typeof row?.ticket_id==='string'&&row.ticket_id&&Number.isFinite(Number(row.unread_count))&&Number(row.unread_count)>0)seen.add(row.ticket_id);
 }
 return seen.size;
}
