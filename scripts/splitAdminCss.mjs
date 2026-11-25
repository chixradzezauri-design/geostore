import postcss from 'postcss';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
// Versioned markers participate in the original Vite content hash. Bump both
// whenever the partition algorithm changes to avoid immutable-cache collisions.
const start='.gs-build-admin-css-start-v3',end='.gs-build-admin-css-end-v3';
// These seven legacy selectors were inspected in adminDashboard.css and
// their classes in AdminDashboardPro.jsx. Never allow arbitrary admin-* prefixes.
const auditedCommandSelectors=new Set([
 '.admin-command-center','.admin-command-hero','.admin-command-kpi',
 '.admin-command-kpi:focus-visible','.admin-command-panel button:focus-visible',
 '.admin-command-panel','.admin-command-panel button'
]);
function isAdminSelector(selector){
 const s=selector.trim();
 return /^\.admin-dashboard-pro\.admin-dashboard-shell(?=$|[\s.#:[>+~])/.test(s)||auditedCommandSelectors.has(s);
}
export function splitCompiledCss(css){
 const root=postcss.parse(css),nodes=root.nodes;
 const markers=selector=>nodes.map((node,index)=>node.type==='rule'&&node.selector===selector?index:-1).filter(i=>i!==-1);
 const starts=markers(start),ends=markers(end);
 if(starts.length!==1||ends.length!==1||starts[0]>=ends[0])throw Error('Admin CSS markers missing or out of order');
 const before=nodes.slice(0,starts[0]),admin=nodes.slice(starts[0]+1,ends[0]),after=nodes.slice(ends[0]+1);
 if(!before.length||!admin.length||!after.length)throw Error('Empty stylesheet partition');
 // Only admin-rooted rules may be delayed; inspect every selector in a
 // conservative manner. The four known files contain no imports/keyframes.
 const guard=node=>{
  if(node.type==='comment')return;
  if(node.type==='atrule'&&['media','supports','container'].includes(node.name)&&node.nodes){node.nodes.forEach(guard);return;}
  if(node.type==='rule'&&postcss.list.comma(node.selector).every(isAdminSelector)&&node.nodes.every(n=>n.type==='decl'))return;
  throw Error('Non-admin or unsupported CSS in deferred partition: '+String(node.selector||node.name||node.type).slice(0,120));
 };
 admin.forEach(guard);
 const serialize=nodes=>postcss.root({nodes:nodes.map(n=>n.clone())}).toString();
 return {before:serialize(before),admin:serialize(admin),after:serialize(after)};
}
export function splitBuild(root='dist'){
 const htmlPath=join(root,'index.html'),assetDir=join(root,'assets');
 let html=readFileSync(htmlPath,'utf8');
 const candidates=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/g)];
 const marked=candidates.filter(m=>readFileSync(join(assetDir,m[1]),'utf8').includes(start));
 if(marked.length!==1)throw Error('Expected one initial stylesheet with admin markers');
 const match=marked[0],original=match[1];
 // Vite's generated preload dependency map legitimately refers to this
 // initial stylesheet. Keep its original name and HTML link, so the loader
 // sees it already present instead of requesting the former full bundle.
 // The versioned markers ensure the input hash differs from unsplit builds.
 if(!/^index-[A-Za-z0-9_-]+\.css$/.test(original))throw Error('Unexpected initial stylesheet name');
 const originalCss=readFileSync(join(assetDir,original),'utf8');
 const parts=splitCompiledCss(originalCss);
 const asset=(prefix,content)=>{
  const name=prefix+'-'+createHash('sha256').update(content).digest('hex').slice(0,20)+'.css';
  return {name,content};
 };
 const before={name:original,content:parts.before},admin=asset('admin-core',parts.admin),after=asset('store-overrides',parts.after);
 const tag=name=>'<link rel="stylesheet" crossorigin href="/assets/'+name+'">';
 html=html.replace(match[0],()=>match[0]+'\n    <meta name="gs-admin-css-slot" content="/assets/'+admin.name+'">\n    '+tag(after.name));
 for(const file of [before,admin,after])writeFileSync(join(assetDir,file.name),file.content);
 writeFileSync(htmlPath,html);
 const size=content=>({bytes:Buffer.byteLength(content),gzipBytes:gzipSync(content).length});
 const originalSize=size(originalCss),beforeSize=size(parts.before),afterSize=size(parts.after);
 console.log('ADMIN CSS DEFERRED '+JSON.stringify({
  original:originalSize,
  initial:{bytes:beforeSize.bytes+afterSize.bytes,gzipBytes:beforeSize.gzipBytes+afterSize.gzipBytes},
  deferred:size(parts.admin),initialParts:[before.name,after.name],admin:admin.name
 }));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)splitBuild();
