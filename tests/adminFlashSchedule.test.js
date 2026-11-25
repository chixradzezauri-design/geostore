import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFlashScheduleRequest,validateFlashScheduleRows,flashScheduleStatus} from '../src/utils/adminFlashSchedule.js';
const now=Date.parse('2026-11-25T12:00Z'),form={category:'bags',discountPercent:'20.25',durationHours:'3'};
test('schedule payload uses explicit Georgian time and rejects immediate/invalid requests',()=>{
 assert.deepEqual(buildFlashScheduleRequest(form,'2026-11-25T17:00',now),{p_category:'bags',p_discount_percent:20.25,p_duration_hours:3,p_starts_at:'2026-11-25T13:00:00.000Z'});
 for(const time of ['', '2026-11-25T16:00','2027-12-01T10:00'])assert.equal(buildFlashScheduleRequest(form,time,now),null);
 assert.equal(buildFlashScheduleRequest({...form,discountPercent:'100'},'2026-11-25T17:00',now),null);
});
test('only confirmed rows render and pending rows sort chronologically',()=>{
 const row={id:'a',category:'bags',discount_percent:20,starts_at:'2026-11-25T13:00Z',ends_at:'2026-11-25T14:00Z',status:'pending',updated_count:0};
 const second={...row,id:'b',starts_at:'2026-11-25T12:30Z'};
 assert.deepEqual(validateFlashScheduleRows([row,second]).map(x=>x.id),['b','a']);
 assert.throws(()=>validateFlashScheduleRows([row,row]));
 assert.throws(()=>validateFlashScheduleRows([{...row,status:'unknown'}]));
 assert.equal(flashScheduleStatus(row,now),'დაგეგმილი');
 assert.equal(flashScheduleStatus(row,now+3600000),'გაშვების მოლოდინში');
});
