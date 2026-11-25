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
export function cataloguePaths(publicProducts,categories=[]){
 if(!Array.isArray(publicProducts))throw Error('Published catalogue required');
 const paths=new Set(['/']);
 for(const p of publicProducts){
  if(!p||p.isPublished===false||p.is_published===false)continue;
  const product=productPath(p.id),category=categoryPath(p.category);
  if(product)paths.add(product);
  if(category)paths.add(category);
 }
 for(const name of publishedCategoryNames(publicProducts,categories))paths.add(categoryPath(name));
 return [...paths].sort();
}
const xmlEscape=s=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export function buildCatalogueSitemap(origin,publicProducts,categories=[]){
 let u;try{u=new URL(origin)}catch{throw Error('Invalid canonical origin')}
 if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Invalid canonical origin');
 const paths=cataloguePaths(publicProducts,categories);
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

export function shouldHandleCatalogueClick(event){
 return !!event&&!event.defaultPrevented&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;
}
const cleanMeta=(value,max)=>String(value??'').replace(/\s+/gu,' ').trim().slice(0,max);
export function catalogueMetadata(route,products,ready,categories=[]){
 const home={title:'GEOSTORE — Fashion, Shoes & Accessories',description:'აღმოაჩინე GEOSTORE — ტანსაცმელი, ფეხსაცმელი და აქსესუარები ქალებისა და მამაკაცებისთვის.',indexable:true};
 if(!route||route.kind==='home')return home;
 if(route.kind==='product'){
  const product=findPublishedRouteProduct(products,route.value,ready);
  if(!product)return {...home,title:'GEOSTORE — '+(ready?'პროდუქტი მიუწვდომელია':'იტვირთება'),indexable:false};
  const name=cleanMeta(product.name,100);
  return {title:name+' | GEOSTORE',description:cleanMeta(product.description,155)||name+' — GEOSTORE',indexable:true};
 }
 if(route.kind==='category'){
  const target=resolveCatalogueCategory(categories,route.value);
  const childNames=categories.filter(c=>c&&typeof c==='object'&&target.parentId!=null&&String(c.parentId)===String(target.parentId)).map(c=>c.name);
  const exists=ready&&products.some(p=>p&&p.isPublished!==false&&p.is_published!==false&&(p.category===route.value||(!target.subcategory&&childNames.includes(p.category))));
  const name=cleanMeta(route.value,100);
  return exists?{title:name+' | GEOSTORE',description:name+' — აღმოაჩინე კოლექცია GEOSTORE-ზე.',indexable:true}:{...home,indexable:false};
 }
 return {...home,indexable:false};
}

// Include only configured parents which actually contain published products.
// Treat ambiguous category names/IDs conservatively and never traverse cycles.
export function publishedCategoryNames(publicProducts,categories=[]){
 const names=new Set(publicProducts.filter(p=>p&&p.isPublished!==false&&p.is_published!==false&&categoryPath(p.category)).map(p=>p.category));
 const items=(Array.isArray(categories)?categories:[]).map(c=>typeof c==='string'?{id:c,name:c}:c).filter(c=>c&&categoryPath(c.name));
 const unique=(arr)=>arr.length===1?arr[0]:null;
 const direct=[...names];
 for(const name of direct){
  const child=unique(items.filter(c=>c.name===name));
  if(child?.parentId==null)continue;
  const parent=unique(items.filter(c=>String(c.id||c.name)===String(child.parentId)));
  // StoreView supports one parent/child level; don't invent deeper routes.
  if(parent&&parent!==child&&parent.parentId==null&&unique(items.filter(c=>c.name===parent.name)))names.add(parent.name);
 }
 return [...names].sort();
}
