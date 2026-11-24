import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {readPublicConfig} from '../scripts/advancedAdminDataApiProbe.mjs';
import {createCataloguePageHandler,loadCataloguePage} from '../src/utils/catalogueHtmlServer.js';
// Vercel includes the exact built shell from this deployment, not source HTML.
export default createCataloguePageHandler({
 readShell:()=>readFileSync(join(process.cwd(),'dist','index.html'),'utf8'),
 loadPage:path=>loadCataloguePage(readPublicConfig(readFileSync(join(process.cwd(),'src','supabaseClient.js'),'utf8')),path)
});
