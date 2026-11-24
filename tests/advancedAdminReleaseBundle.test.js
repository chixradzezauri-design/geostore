import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdvancedBundle,buildFinalMigration,loadAdvancedManifest,readAdvancedSource,gitBlobSha} from '../scripts/advancedAdminReleaseBundle.mjs';
test('eight exact source files produce a deterministic atomic candidate',()=>{
 const m=loadAdvancedManifest(),sql=buildAdvancedBundle(m,readAdvancedSource);
 assert.equal(m.sources.length,8);
 assert.equal(sql,buildAdvancedBundle(m,readAdvancedSource,[...m.appliedMigrations].reverse()));
 assert.equal(sql.match(/^BEGIN;$/gm).length,1);
 assert.equal(sql.match(/^COMMIT;$/gm).length,1);
 for(const s of m.sources){assert.equal(gitBlobSha(readAdvancedSource(s.path)),s.sha);assert.ok(sql.includes('-- Verified staged source: '+s.path));}
});
test('drift, reordering, changed history and approval flags fail closed',()=>{
 const m=loadAdvancedManifest();
 assert.throws(()=>buildAdvancedBundle(m,p=>readAdvancedSource(p)+'\n'),/source changed/);
 assert.throws(()=>buildAdvancedBundle({...m,sources:[...m.sources].reverse()},readAdvancedSource),/scope\/order/);
 assert.throws(()=>buildAdvancedBundle(m,readAdvancedSource,m.appliedMigrations.slice(1)),/history changed/);
 assert.throws(()=>buildAdvancedBundle({...m,releaseApproved:true},readAdvancedSource),/scope\/order/);
 assert.throws(()=>buildAdvancedBundle({...m,deliveryEnabled:true},readAdvancedSource),/scope\/order/);
 assert.throws(()=>buildAdvancedBundle({...m,consentCollectionEnabled:true},readAdvancedSource),/scope\/order/);
 assert.throws(()=>buildAdvancedBundle({...m,consentCollectionEnabled:undefined},readAdvancedSource),/scope\/order/);
 assert.ok(!buildAdvancedBundle(m,readAdvancedSource).includes('GRANT EXECUTE ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) TO authenticated;'));
 const s=m.sources[0],bad=readAdvancedSource(s.path)+'SELECT 1;\n';
 assert.throws(()=>buildAdvancedBundle({...m,sources:[{...s,sha:gitBlobSha(bad)},...m.sources.slice(1)]},p=>p===s.path?bad:readAdvancedSource(p)),/transaction boundary/);
});

test('prepared migration is byte-identical to verified sources and pinned transaction guards',()=>{
 const m=loadAdvancedManifest(),body=buildFinalMigration(m,readAdvancedSource);
 assert.equal(body,readAdvancedSource('release/advanced-admin-final-migration.sql'));
 assert.match(body,/SET LOCAL lock_timeout = '3s';/);
 assert.match(body,/SET LOCAL statement_timeout = '60s';/);
 assert.match(body,/DO \$audit\$/);assert.match(body,/DO \$paused\$/);
 assert.ok(!/^BEGIN;$/m.test(body));assert.ok(!/^COMMIT;$/m.test(body));assert.ok(!/^\\/m.test(body));
 assert.throws(()=>buildFinalMigration(m,p=>p==='release/advanced-admin-final-migration.sql'?readAdvancedSource(p)+'\n':readAdvancedSource(p)),/body mismatch/);
 assert.throws(()=>buildFinalMigration(m,p=>p==='tests/sql/advanced_admin_acl_verify.sql'?readAdvancedSource(p)+'\n':readAdvancedSource(p)),/guard changed/);
 assert.throws(()=>buildFinalMigration(m,readAdvancedSource,m.appliedMigrations.slice(1)),/history changed/);
});
