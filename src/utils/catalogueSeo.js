// Public catalogue URL contract. No user data, storage or network access.
const MAX_SEGMENT=200;
function segment(value){
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const raw=String(value);
 if(!raw||raw!==raw.trim()||raw.length>MAX_SEGMENT||raw==='.'||raw==='..'||/[\/\\\u0000-\u001f\u007f]/u.test(raw))return null;
 try{return encodeURIComponent(raw)}catch{return null}
}
export function productPath(id){const s=segment(id);return s?'/product/'+s:null;}
export function categoryPath(name){const s=segment(name);return s&&name!=='ყველა'?'/category/'+s:null;}
export function parseCataloguePath(path){
 if(typeof path!=='string')return null;
 if(path==='/')return {kind:'home'};
 const match=/^\/(product|category)\/([^/]+)$/.exec(path);
 if(!match)return null;
 try{
  const value=decodeURIComponent(match[2]);
  const canonical=match[1]==='product'?productPath(value):categoryPath(value);
  if(!canonical||canonical!==path)return null;
  return {kind:match[1],value};
 }catch{return null}
}
// The caller MUST supply a successful, complete anonymous published catalogue
// snapshot. Never feed admin products, cached products, or account collections.
export function cataloguePaths(publicProducts){
 if(!Array.isArray(publicProducts))throw Error('Published catalogue required');
 const paths=new Set(['/']);
 for(const p of publicProducts){
  if(!p||p.isPublished===false||p.is_published===false)continue;
  const product=productPath(p.id),category=categoryPath(p.category);
  if(product)paths.add(product);
  if(category)paths.add(category);
 }
 return [...paths].sort();
}
const xmlEscape=s=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export function buildCatalogueSitemap(origin,publicProducts){
 let u;try{u=new URL(origin)}catch{throw Error('Invalid canonical origin')}
 if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Invalid canonical origin');
 const paths=cataloguePaths(publicProducts);
 // Use sitemap indexes rather than silently truncating a larger catalogue.
 if(paths.length>50000)throw Error('Sitemap URL limit exceeded');
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(p=>'  <url><loc>'+xmlEscape(origin+p)+'</loc></url>').join('\n')+'\n</urlset>\n';
 if(new TextEncoder().encode(xml).length>50000000)throw Error('Sitemap byte limit exceeded');
 return xml;
}

export function catalogueRouteFromLocation(location){
 if(!location||new URLSearchParams(location.search||'').get('admin')==='secret')return null;
 return parseCataloguePath(location.pathname);
}
export function catalogueNavigationTarget(location,path){
 if(!catalogueRouteFromLocation(location)||!parseCataloguePath(path))return null;
 return path+(location.search||'')+(location.hash||'');
}
export function findPublishedRouteProduct(products,id,ready){
 if(!ready||!productPath(id)||!Array.isArray(products))return null;
 return products.find(p=>p&&p.isPublished!==false&&p.is_published!==false&&String(p.id)===String(id))||null;
}
export function resolveCatalogueCategory(categories,name){
 const items=(Array.isArray(categories)?categories:[]).map(c=>typeof c==='string'?{id:c,name:c}:c).filter(c=>c&&typeof c.name==='string');
 const item=items.find(c=>c.name===name);
 if(!item)return {category:name,subcategory:null,parentId:null};
 const parent=item.parentId==null?null:items.find(c=>String(c.id||c.name)===String(item.parentId));
 return parent?{category:parent.name,subcategory:item.name,parentId:parent.id||parent.name}:{category:item.name,subcategory:null,parentId:item.id||item.name};
}
