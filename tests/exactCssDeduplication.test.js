import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {deduplicateCssRules,removeExactDuplicateRules} from '../scripts/removeExactDuplicateCss.mjs';
const optimize=css=>{const root=postcss.parse(css);const removed=deduplicateCssRules(root);return {css:root.toString(),removed};};
test('only earlier exact duplicate is removed, later cascade order unchanged',()=>{
 const result=optimize('.x{color:red}.x{color:blue}.x{color:red}');
 assert.deepEqual(result,{css:'.x{color:blue}.x{color:red}',removed:1});
 assert.equal(optimize(result.css).removed,0);
});
test('preserve distinct values, specificity, declarations and important flags',()=>{
 for(const css of ['.x{color:red}.x{color:red!important}','.x{--space:  1}.x{--space: 1}','.x{color:red}.y{color:red}','.x{margin:0;color:red}.x{color:red;margin:0}','.x{display:-webkit-box;display:flex}.x{display:flex}']){
  assert.deepEqual(optimize(css),{css,removed:0});
 }
});
test('conditional block scopes, keyframes, comments and nested rules are conservative barriers',()=>{
 const css='@media (min-width:600px){.x{color:red}.x{color:red}}@media (min-width:600px){.x{color:red}}@keyframes spin{0%{opacity:0}0%{opacity:0}}.x{color:red}/* keep */.x{color:red}.nest{& .x{color:red}& .x{color:red}}';
 const result=optimize(css);
 assert.equal(result.removed,1);
 assert.equal(result.css,css.replace('.x{color:red}.x{color:red}}','.x{color:red}}'));
});
test('PostCSS integration records exact removal count',async()=>{
 const result=await postcss([removeExactDuplicateRules()]).process('.a{padding:0}.a{padding:0}',{from:undefined});
 assert.equal(result.css,'.a{padding:0}');
 assert.equal(result.messages.find(m=>m.type==='geostore-css-deduplication').removed,1);
});
