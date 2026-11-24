import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdvancedBundle,loadAdvancedManifest,readAdvancedSource,gitBlobSha} from '../scripts/advancedAdminReleaseBundle.mjs';
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
 const s=m.sources[0],bad=readAdvancedSource(s.path)+'SELECT 1;\n';
 assert.throws(()=>buildAdvancedBundle({...m,sources:[{...s,sha:gitBlobSha(bad)},...m.sources.slice(1)]},p=>p===s.path?bad:readAdvancedSource(p)),/transaction boundary/);
});
