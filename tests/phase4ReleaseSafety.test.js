import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {ADMIN_MFA_ROLLOUT_ENABLED} from '../src/utils/adminAuthCoordinator.js';
import {SYSTEM_HISTORY_ENABLED} from '../src/utils/systemHistory.js';
import {CART_SYNC_ENABLED} from '../src/utils/cartSyncReview.js';
import {WISHLIST_SYNC_ENABLED} from '../src/utils/wishlistSyncReview.js';
import {WARDROBE_SYNC_ENABLED} from '../src/utils/wardrobeAccountReview.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('phase 4 application release cannot silently enable unfinished server capabilities',()=>{
 for(const flag of [ADMIN_MFA_ROLLOUT_ENABLED,SYSTEM_HISTORY_ENABLED,CART_SYNC_ENABLED,WISHLIST_SYNC_ENABLED,WARDROBE_SYNC_ENABLED])assert.equal(flag,false);
 const config=JSON.parse(read('vercel.json'));
 assert.equal(config.git.deploymentEnabled['internal-technical-excellence-2026-11-25'],false);
 assert.match(read('server/systemErrorReporter.js'),/enabled:process\.env\.GEOSTORE_SYSTEM_MONITOR_ENABLED==='true'/);
 assert.match(read('supabase/functions/manage-admin-staff/index.ts'),/ADMIN_MFA_REQUIRED/);
});
test('phase 4 SQL drafts are not migrations or browser imports',()=>{
 const migrations=readdirSync(new URL('../supabase/migrations/',import.meta.url));
 const drafts=readdirSync(new URL('../release/',import.meta.url)).filter(f=>f.startsWith('phase4-')&&f.endsWith('-draft.sql'));
 assert.ok(drafts.length>10);
 assert.ok(migrations.every(f=>!f.includes('phase4')&&!f.includes('draft')));
 assert.ok(drafts.every(f=>!migrations.includes(f)));
 assert.doesNotMatch(read('src/App.jsx'),/from\s+['"][^'"]*release\//);
 assert.doesNotMatch(read('src/main.jsx'),/from\s+['"][^'"]*release\//);
});
test('preserved cart has an explicit customer warning in order confirmation',()=>{
 assert.match(read('src/components/Modals.jsx'),/orderConfirmation\.cartReviewRequired === true/);
});
