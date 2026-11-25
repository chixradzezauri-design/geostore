import test from 'node:test';
import assert from 'node:assert/strict';
import {compareWishlistForReview,WISHLIST_SYNC_ENABLED,wishlistIntentStillDesired} from '../src/utils/wishlistSyncReview.js';
test('release remains gated and review separates differences without modifying either list',()=>{const local=['a','b'],remote={revision:3,ids:['b','c']};assert.equal(WISHLIST_SYNC_ENABLED,false);assert.deepEqual(compareWishlistForReview(local,remote),{localOnly:['a'],remoteOnly:['c'],shared:['b']});assert.deepEqual(local,['a','b']);assert.deepEqual(remote.ids,['b','c']);});
test('malformed or oversized snapshots cannot produce review actions',()=>{assert.throws(()=>compareWishlistForReview(['a'],{revision:1,ids:['b','b']}));assert.throws(()=>compareWishlistForReview([' '],{revision:1,ids:[]}));});

test('a locally reversed pending intent cannot be replayed',()=>{assert.equal(wishlistIntentStillDesired(['a'],{productId:'a',present:true}),true);assert.equal(wishlistIntentStillDesired([],{productId:'a',present:true}),false);assert.equal(wishlistIntentStillDesired(['a'],{productId:'a',present:false}),false);assert.equal(wishlistIntentStillDesired([],{productId:'a',present:false}),true);assert.equal(wishlistIntentStillDesired([' '],{productId:'a',present:false}),false);});
