import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/App.jsx');
const admin=read('src/components/AdminDashboardPro.jsx');
const stockMigration=read('supabase/migrations/20261120122908_replenishment_optimistic_concurrency.sql');
const publishMigration=read('supabase/migrations/20261120124250_storefront_publish_concurrency_safe_compat.sql');
const release=read('docs/production-release-gate-phase30.md');

test('client uses new revision-checked replenishment and storefront publication RPCs',()=>{
  assert.match(admin,/\/rest\/v1\/rpc\/admin_save_inventory_replenishment_setting/);
  assert.match(admin,/p_expected_updated_at: expectedUpdatedAt/);
  assert.match(app,/\/rest\/v1\/rpc\/publish_storefront_config/);
  assert.match(app,/p_expected_draft_updated_at: storefrontDraftUpdatedAtRef\.current/);
});

test('applied additive migrations define the version-checked overloads but do not remove old clients',()=>{
  assert.match(stockMigration,/p_expected_updated_at timestamptz/);
  assert.match(publishMigration,/p_expected_draft_updated_at timestamptz/);
  assert.doesNotMatch(stockMigration,/REVOKE ALL ON FUNCTION public\.admin_save_inventory_replenishment_setting\(text,text,integer,integer\)\s+FROM/i);
  assert.doesNotMatch(publishMigration,/REVOKE ALL ON FUNCTION public\.publish_storefront_config\(jsonb,\s*text\)\s+FROM\s+authenticated/i);
  assert.doesNotMatch(stockMigration,/DROP FUNCTION\s+public\.admin_save_inventory_replenishment_setting/i);
  assert.doesNotMatch(publishMigration,/DROP FUNCTION\s+public\.publish_storefront_config/i);
});

test('new public wrappers remain invokers and anonymous users cannot execute versioned RPCs',()=>{
  assert.match(stockMigration,/CREATE OR REPLACE FUNCTION public\.admin_save_inventory_replenishment_setting\([\s\S]*?RETURNS jsonb LANGUAGE sql SECURITY INVOKER/);
  assert.match(publishMigration,/create or replace function public\.publish_storefront_config\([\s\S]*?returns jsonb language sql security invoker/i);
  assert.match(stockMigration,/REVOKE ALL ON FUNCTION public\.admin_save_inventory_replenishment_setting\(text,text,integer,integer,timestamptz\) FROM PUBLIC, anon/i);
  assert.match(publishMigration,/revoke all on function public\.publish_storefront_config\(jsonb, text, timestamptz\) from public, anon/i);
});

test('new private RPC implementations guard revision conflicts with SQLSTATE 40001',()=>{
  assert.match(stockMigration,/v_existing\.updated_at IS DISTINCT FROM p_expected_updated_at/);
  assert.match(stockMigration,/USING ERRCODE = '40001'/);
  assert.match(publishMigration,/p_expected_draft_updated_at is distinct from v_current_draft_updated_at/i);
  assert.match(publishMigration,/using errcode = '40001'/i);
  assert.match(stockMigration,/SECURITY DEFINER SET search_path TO ''/);
  assert.match(publishMigration,/security definer\s+set search_path = ''/i);
});

test('migration file paths reflect live applied history and do not reintroduce replaced migration',()=>{
  assert.ok(existsSync(new URL('../supabase/migrations/20261120122908_replenishment_optimistic_concurrency.sql',import.meta.url)));
  assert.ok(existsSync(new URL('../supabase/migrations/20261120124250_storefront_publish_concurrency_safe_compat.sql',import.meta.url)));
  assert.equal(existsSync(new URL('../supabase/migrations/20261119210000_storefront_publish_concurrency.sql',import.meta.url)),false);
});

test('release hold documents Production drift, a two-device gate and explicit approval',()=>{
  assert.match(release,/2 commits ahead/);
  assert.match(release,/Production → main → PR HEAD/);
  assert.match(release,/Do not drop or revoke the legacy RPC overloads/);
  assert.match(release,/two browser sessions/);
  assert.match(release,/explicit user authorization/);
  assert.match(release,/not verified/i);
});
