// Read-only lexical triage, not a PostgreSQL SQL parser or release authority.
// Preserves SQL literal and dollar-quoted PL/pgSQL contents, tokenizing bodies recursively.
export function executableTokens(sql, depth=0){
 if(typeof sql!=='string'||depth>16)throw Error('invalid SQL/depth');
 const t=[];
 for(let i=0;i<sql.length;){
  const ch=sql[i],next=sql[i+1],s=sql.slice(i);
  if(/\s/.test(ch)){i++;continue}
  if(ch==='-'&&next==='-'){i+=2;while(i<sql.length&&sql[i]!=='\n')i++;continue}
  if(ch==='/'&&next==='*'){i+=2;let n=1;while(i<sql.length&&n){if(sql.slice(i,i+2)==='/*'){n++;i+=2}else if(sql.slice(i,i+2)==='*/'){n--;i+=2}else i++}if(n)throw Error('unclosed comment');continue}
  if(ch==='$'){
   const d=/^(?:\$\$|\$[A-Za-z_][A-Za-z_0-9]*\$)/.exec(s)?.[0];
   if(d){const e=sql.indexOf(d,i+d.length);if(e<0)throw Error('unclosed dollar body');t.push(d,...executableTokens(sql.slice(i+d.length,e),depth+1),d);i=e+d.length;continue}
  }
  if(ch==="'"||ch==='"'){
   let j=i+1,closed=false;
   const escaped=ch==="'"&&/[eE]/.test(sql[i-1]||'')&&(i===1||!/[A-Za-z0-9_]/.test(sql[i-2]));
   while(j<sql.length){if(sql[j]==='\\'&&escaped){j+=2;continue}if(sql[j]===ch){if(sql[j+1]===ch){j+=2;continue}j++;closed=true;break}j++}
   if(!closed)throw Error('unclosed literal');t.push(sql.slice(i,j));i=j;continue;
  }
  const x=/^[A-Za-z_][A-Za-z0-9_$]*/.exec(s)?.[0]||
     /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(s)?.[0]||
     /^[~!@#%^&|?+\-*/<>=:]+/.exec(s)?.[0]||ch;
  t.push(x);i+=x.length;
 }
 return t;
}
export function executableTokenEquality(a,b){
 const x=executableTokens(a),y=executableTokens(b);
 return x.length===y.length&&x.every((t,i)=>t===y[i]);
}
