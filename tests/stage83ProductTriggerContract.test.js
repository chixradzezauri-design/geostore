import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,functionSql} from '../scripts/stage83ExtractTriggers.mjs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
test('Stage83 genuine PostgreSQL trigger extraction preserves original versioned SQL',()=>{
 const sql=fixture();
 for(const token of [
 'CREATE OR REPLACE FUNCTION private.preserve_product_variant_stock()',
 'CREATE OR REPLACE FUNCTION private.sync_size_color_aggregate_stock()',
 'CREATE TRIGGER preserve_product_variant_stock',
 'CREATE TRIGGER zz_sync_size_color_aggregate_stock',
 'geostore.variant_stock_adjustment'])
 assert.ok(sql.includes(token),'Missing original source: '+token);
 assert.doesNotMatch(sql,/CREATE FUNCTION private.create_order_with_stock/);
});
test('Stage83 extraction blocks nonexistent definitions and malformed original SQL',()=>{
 const source=read('../supabase/migrations/20261109203329_admin_manage_custom_variant_stock.sql');
 assert.throws(()=>functionSql(source,'private.not_a_function'),/original marker absent or duplicate/);
 const actual=functionSql(source,'private.sync_size_color_aggregate_stock');
 const invalid=source.replace(actual,actual.replace(/\$function\$;$/, ''));
 assert.throws(()=>functionSql(invalid,'private.sync_size_color_aggregate_stock'));
});
test('Stage83 local HTTP CI installs source product triggers before real signed checkout',()=>{
 const workflow=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 const sql=read('./stage78-supabase/stage83-product-triggers.sql');
 const before=workflow.indexOf('stage80-real-stock.sql');
 const extract=workflow.indexOf('stage83ExtractTriggers.mjs',before);
 const install=workflow.indexOf('stage83-product-triggers.sql',extract);
 const signed=workflow.indexOf('stage80RealCheckoutHttp.mjs',install);
 const last=workflow.indexOf('stage83ProductTriggerContract.mjs',signed);
 assert.ok(before>=0&&extract>before&&install>extract&&signed>install&&last>signed,
  'Stage83 must execute original functions before signed Auth/checkout');
 assert.match(sql,/\\i \/tmp\/stage83-original-stock-triggers\.sql/);
 assert.doesNotMatch(workflow,/supabase db push|supabase link|SUPABASE_ACCESS_TOKEN/);
});
test('Stage83 tests current Production function MD5s and stock overwrite protection',()=>{
 const js=read('../scripts/stage83ProductTriggerContract.mjs');
 for(const token of [
 '6cd5f0a9ad0927af1e17368d43491995',
 'f08ae438ed985b79b6317d034bc1b780',
 '99','800','variants-0','manual_adjustment','order_deduction',
 'order_cancellation','Production Supabase API'])
 assert.ok(js.includes(token),'Missing Stage83 stock scenario: '+token);
 const doc=read('../docs/stage83-product-trigger-compatibility.md');
 for(const term of ['NOT RELEASE-READY','Production unchanged','no paid staging',
 'Phase A','Phase B','full-schema','trigger','signed'])
 assert.ok(doc.includes(term),'Missing Stage83 release caveat: '+term);
});
