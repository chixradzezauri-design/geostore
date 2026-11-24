import postcss from 'postcss';
import {readFileSync,readdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const start='.gs-build-admin-css-start',end='.gs-build-admin-css-end';
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
  if(node.type==='rule'&&node.selector.split(/,(?![^()]*\))/).every(s=>s.trim().startsWith('.admin-dashboard-pro.admin-dashboard-shell'))&&node.nodes.every(n=>n.type==='decl'))return;
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
 // No JS or secondary CSS may depend on the replaced original asset path.
 for(const name of readdirSync(assetDir).filter(n=>n!==original&&/\.(?:js|css)$/.test(n))){
  if(readFileSync(join(assetDir,name),'utf8').includes(original))throw Error('Original stylesheet referenced by another build asset');
 }
 const parts=splitCompiledCss(readFileSync(join(assetDir,original),'utf8'));
 const asset=(prefix,content)=>{
  const name=prefix+'-'+createHash('sha256').update(content).digest('hex').slice(0,20)+'.css';
  return {name,content};
 };
 const before=asset('store-base',parts.before),admin=asset('admin-core',parts.admin),after=asset('store-overrides',parts.after);
 const tag=name=>'<link rel="stylesheet" crossorigin href="/assets/'+name+'">';
 html=html.replace(match[0],()=>tag(before.name)+'\n    <meta name="gs-admin-css-slot" content="/assets/'+admin.name+'">\n    '+tag(after.name));
 for(const file of [before,admin,after])writeFileSync(join(assetDir,file.name),file.content);
 writeFileSync(htmlPath,html);unlinkSync(join(assetDir,original));
 console.log('ADMIN CSS DEFERRED '+JSON.stringify({bytes:Buffer.byteLength(parts.admin),initialParts:[before.name,after.name],admin:admin.name}));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)splitBuild();
