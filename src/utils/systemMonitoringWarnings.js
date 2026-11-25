// These are sampled observations, not unique incidents or uptime measurements.
// A threshold is a review hint, not a confirmed outage.
const serverCodes=new Set(['catalogue_upstream_error','catalogue_render_error','sitemap_upstream_error']);
export function recentSystemWarnings(rows,now=Date.now()){
 if(!Array.isArray(rows)||!Number.isFinite(now))return [];
 const current=Math.floor(now/3600000)*3600000;
 return rows.filter(r=>r&&serverCodes.has(r.code)&&Number.isSafeInteger(r.hourAt)&&r.hourAt===current&&Number.isInteger(r.count)&&r.count>=3&&r.count<=1000000)
 .map(r=>({code:r.code,count:r.count}));
}
