import test from 'node:test';
import assert from 'node:assert/strict';
import {planWardrobePhotoReservation,WARDROBE_PHOTO_LIMIT,WARDROBE_RESERVED_BYTES} from '../src/utils/wardrobePhotoQuota.js';
test('quota charges reserved, uploaded and pending-erasure files until confirmed deleted',()=>{
 const rows=Array.from({length:WARDROBE_PHOTO_LIMIT},(_,i)=>({path:'p'+i,status:i===0?'erasure-pending':'uploaded'}));
 assert.equal(planWardrobePhotoReservation(rows,'new').status,'limit');
 rows[0].status='erased';
 assert.deepEqual(planWardrobePhotoReservation(rows,'new'),{status:'candidate',charged:20,reservedBytes:20*WARDROBE_RESERVED_BYTES});
 assert.equal(planWardrobePhotoReservation(rows,'p0').status,'path-used');
});
test('duplicate or unknown records fail closed',()=>{
 assert.throws(()=>planWardrobePhotoReservation([{path:'a',status:'uploaded'},{path:'a',status:'reserved'}],'new'));
 assert.throws(()=>planWardrobePhotoReservation([{path:'a',status:'missing'}],'new'));
});
