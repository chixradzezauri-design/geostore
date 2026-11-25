import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerErrorReporter} from '../server/systemErrorReporter.js';
import {recentSystemWarnings} from '../src/utils/systemMonitoringWarnings.js';
import {createCataloguePageHandler} from '../src/utils/catalogueHtmlServer.js';
import {createSitemapHandler} from '../src/utils/catalogueSitemapServer.js';
const secret='sb_secret_fixture_not_a_real_key_123456789';
test('disabled or invalid configuration and unsupported codes never send',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return {ok:true};};
 assert.equal(await createServerErrorReporter({secret,fetchImpl})('catalogue_render_error'),false);
 assert.equal(await createServerErrorReporter({enabled:true,secret:'anon',fetchImpl})('catalogue_render_error'),false);
 assert.equal(await createServerErrorReporter({enabled:true,secret,fetchImpl})('private email'),false);
 assert.equal(calls,0);
});
test('server sends fixed aggregate and throttles repeat code, never retries',async()=>{
 let time=0;const calls=[];const report=createServerErrorReporter({enabled:true,secret,now:()=>time,fetchImpl:async(url,opts)=>{calls.push({url,opts});return {ok:false};}});
 assert.equal(await report('catalogue_upstream_error'),false);assert.equal(await report('catalogue_upstream_error'),false);assert.equal(calls.length,1);
 assert.deepEqual(JSON.parse(calls[0].opts.body),{p_code:'catalogue_upstream_error',p_count:1});assert.equal(calls[0].opts.headers.Authorization,undefined);assert.equal(calls[0].opts.redirect,'error');
 time=60000;await report('catalogue_upstream_error');assert.equal(calls.length,2);
});
test('concurrent reports are dropped rather than queued',async()=>{
 let finish;const report=createServerErrorReporter({enabled:true,secret,fetchImpl:()=>new Promise(r=>{finish=r;})});
 const first=report('catalogue_render_error');assert.equal(await report('sitemap_upstream_error'),false);finish({ok:true});assert.equal(await first,true);
});
test('warnings are current-hour server-only sampled counts',()=>{
 const now=7200000;assert.deepEqual(recentSystemWarnings([{code:'catalogue_render_error',hourAt:now,count:3},{code:'sitemap_upstream_error',hourAt:now-3600000,count:9},{code:'browser_runtime_error',hourAt:now,count:100},{code:'catalogue_upstream_error',hourAt:now,count:2}],now),[{code:'catalogue_render_error',count:3}]);
});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};}
test('telemetry failures cannot change catalogue or sitemap failure response',async()=>{
 const seen=[];const report=async code=>{seen.push(code);throw Error('private');};
 const r=response();await createCataloguePageHandler({readShell:()=>{throw Error('fixture');},loadPage:()=>{throw Error('fixture');},reportError:report})({method:'GET',url:'/api/catalogue-page?kind=product&value=fixture'},r);
 assert.equal(r.statusCode,503);assert.equal(r.headers['Cache-Control'],'no-store');assert.ok(seen.includes('catalogue_render_error'));
 const s=response();await createSitemapHandler(async()=>{throw Error('fixture');},report)({method:'GET'},s);assert.equal(s.statusCode,503);assert.ok(seen.includes('sitemap_upstream_error'));
});
