import {readFileSync} from 'node:fs';
import {reportServerError} from '../server/systemErrorReporter.js';
import {readPublicConfig} from '../scripts/advancedAdminDataApiProbe.mjs';
import {createSitemapHandler,fetchPublishedCatalogue,fetchPublishedCategories} from '../src/utils/catalogueSitemapServer.js';
// The existing public anon JWT is already distributed to the browser.
// Its role and project claims are checked before using it server-side.
export default createSitemapHandler(async()=>{
 const config=readPublicConfig(readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8'));
 const [products,categories]=await Promise.all([fetchPublishedCatalogue(config),fetchPublishedCategories(config)]);
 return {products,categories};
},reportServerError);
