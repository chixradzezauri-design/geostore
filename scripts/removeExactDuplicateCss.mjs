// Preserve the cascade: remove only an earlier byte-identical ordinary rule
// when a later identical rule exists in the same parent. Never reorder rules,
// combine selectors, normalize custom property values, or touch keyframes.
const allowedParents=new Set(['media','supports','container','layer']);
export function deduplicateCssRules(root){
 let removed=0;
 function visit(parent){
  const seen=new Set();
  for(const node of [...(parent.nodes||[])].reverse()){
   if(node.type==='atrule'){
    // Do not reason across separately declared conditional blocks or imports.
    seen.clear();
    if(allowedParents.has(node.name.toLowerCase())&&node.nodes)visit(node);
    continue;
   }
   if(node.type!=='rule'||!node.nodes?.length||!node.nodes.every(child=>child.type==='decl')){
    // Unknown syntax, comments and nested constructs form conservative barriers.
    seen.clear();continue;
   }
   const key=node.toString();
   if(seen.has(key)){node.remove();removed++;}
   else seen.add(key);
  }
 }
 visit(root);return removed;
}
export function removeExactDuplicateRules(){
 return {postcssPlugin:'geostore-exact-css-deduplication',OnceExit(root,{result}){
  const removed=deduplicateCssRules(root);
  result.messages.push({type:'geostore-css-deduplication',plugin:'geostore-exact-css-deduplication',removed});
 }};
}
