import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWishlistForReview,WISHLIST_SYNC_ENABLED} from '../src/utils/wishlistSyncReview.js';
test('release remains gated and review separates differences without modifying either list',()=>{const local=['a','b'],remote={revision:3,ids:['b','c']};assert.equal(WISHLIST_SYNC_ENABLED,false);assert.deepEqual(compareWishlistForReview(local,remote),{localOnly:['a'],remoteOnly:['c'],shared:['b']});assert.deepEqual(local,['a','b']);assert.deepEqual(remote.ids,['b','c']);});
test('malformed or oversized snapshots cannot produce review actions',()=>{assert.throws(()=>compareWishlistForReview(['a'],{revision:1,ids:['b','b']}));assert.throws(()=>compareWishlistForReview([' '],{revision:1,ids:[]}));});
