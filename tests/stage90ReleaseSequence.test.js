import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Stage90 reproduces true pre-A then all reviewed SQL files in order in disposable CI',()=>{
 const code=read('scripts/stage90ReleaseSequence.mjs');
 const fixture=read('tests/stage78-supabase/stage90-pre-a-fixture.sql');
 const wf=read('.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 assert.match(fixture,/TEST FIXTURE ONLY/);
 const manifest=JSON.parse(read('release/stage72-production-history-baseline.json'));
 let last=-1;
 for(const f of manifest.phasedSources){const next=code.indexOf(f.file);assert.ok(next>last);last=next;}
 for(const term of ['fetchVerifiedAdminOrderLedger','localhost','preserved()','idempotent_replay','Before A:','After B:'])assert.ok(code.includes(term),term);
 assert.match(wf,/stage90-pre-a-fixture.sql[\s\S]*stage90ReleaseSequence.mjs/);
});
