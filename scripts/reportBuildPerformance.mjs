// Reproducible output size measurement, not a claim of real-world speed.
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const root='dist',assetDir=join(root,'assets');
const shell=readFileSync(join(root,'index.html'),'utf8');
const initial=new Set([...shell.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map(m=>m[1]));
const rows=readdirSync(assetDir).filter(name=>/\.(?:js|css)$/.test(name)&&statSync(join(assetDir,name)).isFile()).map(name=>{
 const contents=readFileSync(join(assetDir,name));
 return {name,initial:initial.has(name),bytes:contents.length,gzipBytes:gzipSync(contents).length};
}).sort((a,b)=>b.bytes-a.bytes);
if(!initial.size||[...initial].some(name=>!rows.some(row=>row.name===name)))throw Error('Missing initial build assets');
const total=(entries)=>entries.reduce((a,r)=>({bytes:a.bytes+r.bytes,gzipBytes:a.gzipBytes+r.gzipBytes}),{bytes:0,gzipBytes:0});
console.log('GEOSTORE build resource sizes (bytes; gzip estimate, not network timings)');
for(const row of rows)console.log(JSON.stringify(row));
console.log('INITIAL '+JSON.stringify(total(rows.filter(r=>r.initial))));
console.log('ALL_JS_CSS '+JSON.stringify(total(rows)));
