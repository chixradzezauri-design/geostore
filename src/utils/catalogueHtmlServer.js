// Pure server response builder, deliberately separate from Vercel routing.
import {catalogueMetadata,productPath,categoryPath,parseCataloguePath,publishedCategoryNames,resolveCatalogueCategory} from './catalogueSeo.js';
import {CATALOGUE_ORIGIN,safeConfig} from './catalogueSitemapServer.js';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export async function fetchPublicProduct(config,id,fetchImpl=fetch){
 if(!productPath(id))return null;
 const {url,key}=safeConfig(config);
 const endpoint=new URL(url+'/rest/v1/products');
 endpoint.searchParams.set('select','id,name,category,description');
 endpoint.searchParams.set('id','eq.'+id);
 endpoint.searchParams.set('limit','2');
 const response=await fetchImpl(endpoint.href,{method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':'public',Accept:'application/json'}});
 if(!response.ok)throw Error('Public product unavailable');
 const rows=await response.json();
 if(!Array.isArray(rows)||rows.length>1)throw Error('Invalid product response');
 if(!rows.length)return null;
 const p=rows[0];
 if(p?.id!==id||typeof p.name!=='string'||!p.name.trim()||p.is_published===false||p.isPublished===false)throw Error('Invalid public product response');
 return {id:p.id,name:p.name,category:p.category,description:typeof p.description==='string'?p.description:''};
}
export function cataloguePageResponse(path,{product=null,products=[],categories=[],upstreamFailed=false}={}){
 const route=parseCataloguePath(path);
 if(upstreamFailed)return {status:503,meta:{title:'GEOSTORE — დროებით მიუწვდომელია',description:'მაღაზიის მონაცემები დროებით მიუწვდომელია.',indexable:false},heading:'მონაცემები დროებით მიუწვდომელია',description:'გთხოვთ, სცადოთ მოგვიანებით.',links:[]};
 if(route?.kind==='product'&&product&&product.id===route.value&&product.isPublished!==false&&product.is_published!==false){
  const meta=catalogueMetadata(route,[product],true);
  return {status:200,meta,canonical:CATALOGUE_ORIGIN+path,heading:product.name,description:product.description,links:categoryPath(product.category)?[{href:categoryPath(product.category),text:product.category}]:[]};
 }
 if(route?.kind==='category'&&publishedCategoryNames(products,categories).includes(route.value)){
  const target=resolveCatalogueCategory(categories,route.value);
  const children=categories.filter(c=>c&&typeof c==='object'&&target.parentId!=null&&String(c.parentId)===String(target.parentId)).map(c=>c.name);
  const matching=products.filter(p=>p&&p.isPublished!==false&&p.is_published!==false&&productPath(p.id)&&(p.category===route.value||(!target.subcategory&&children.includes(p.category))));
  const meta=catalogueMetadata(route,products,true,categories);
  if(meta.indexable)return {status:200,meta,canonical:CATALOGUE_ORIGIN+path,heading:route.value,description:meta.description,links:matching.slice(0,100).map(p=>({href:productPath(p.id),text:p.name||'პროდუქტის ნახვა'}))};
 }
 return {status:404,meta:{title:'GEOSTORE — გვერდი ვერ მოიძებნა',description:'პროდუქტი ან კატეგორია ხელმისაწვდომი აღარ არის.',indexable:false},heading:'გვერდი ვერ მოიძებნა',description:'დაათვალიერეთ მიმდინარე კოლექცია.',links:[]};
}
export function renderCatalogueHtml(shell,page){
 // Require the actual built shell with hashed entry; never use dev index.html.
 if(typeof shell!=='string'||!/<script\b[^>]*src="\/assets\/[^"]+\.js"/.test(shell))throw Error('Built storefront shell required');
 const title=/<title>[^<]*<\/title>/gi,description=/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi,root=/<div id="root"><\/div>/g,head=/<\/head>/gi;
 for(const pattern of [title,description,root,head])if([...shell.matchAll(pattern)].length!==1)throw Error('Unexpected storefront shell');
 if(/<link\b[^>]*rel=["']canonical["']|<meta\b[^>]*name=["']robots["']/i.test(shell))throw Error('Conflicting shell metadata');
 const tags=(page.canonical?'<link rel="canonical" data-gs-canonical href="'+escapeHtml(page.canonical)+'">':'')+
  (!page.meta.indexable?'<meta name="robots" data-gs-route-robots="true" content="noindex, follow">':'')+
  '<meta property="og:title" content="'+escapeHtml(page.meta.title)+'"><meta property="og:description" content="'+escapeHtml(page.meta.description)+'">';
 const links=page.links.map(l=>'<li><a href="'+escapeHtml(l.href)+'">'+escapeHtml(l.text)+'</a></li>').join('');
 const content='<main><h1>'+escapeHtml(page.heading)+'</h1><p>'+escapeHtml(page.description)+'</p><a href="/">GEOSTORE</a><ul>'+links+'</ul></main>';
 return shell.replace(title,()=>'<title>'+escapeHtml(page.meta.title)+'</title>').replace(description,()=>'<meta name="description" content="'+escapeHtml(page.meta.description)+'">').replace(head,()=>tags+'</head>').replace(root,()=>'<div id="root">'+content+'</div>');
}
