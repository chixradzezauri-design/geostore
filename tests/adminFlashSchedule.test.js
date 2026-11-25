import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFlashScheduleRequest,validateFlashScheduleRows,flashScheduleStatus,summarizeFlashSchedule,filterFlashSchedule} from '../src/utils/adminFlashSchedule.js';
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

test('history metrics count only returned schedule rows and count product updates rather than unique products or revenue',()=>{
 const base={category:'ჩანთები',starts_at:'2026-11-25T10:00Z',ends_at:'2026-11-25T13:00Z',status:'started',updated_count:4};
 const rows=[base,{...base,ends_at:'2026-11-25T11:00Z',updated_count:7},{...base,status:'pending',category:'Shoes',updated_count:0},{...base,status:'cancelled',updated_count:0},{...base,status:'skipped',updated_count:0}];
 assert.deepEqual(summarizeFlashSchedule(rows,now),{pending:1,active:1,ended:1,cancelled:1,skipped:1,productUpdates:11});
 assert.deepEqual(filterFlashSchedule(rows,'ended','ჩანთ',now),[rows[1]]);
 assert.deepEqual(filterFlashSchedule(rows,'all','SHOES',now),[rows[2]]);
 assert.deepEqual(filterFlashSchedule(rows,'pending','missing',now),[]);
 assert.equal(summarizeFlashSchedule([],now).productUpdates,0);
});

test('individual scope cannot silently schedule an entire category',()=>{
 for(const selectedIds of [[],['a']])assert.equal(buildFlashScheduleRequest({...form,selectedIds},'2026-11-25T17:00',now),null);
});

test('selected schedules require eligible explicit IDs and preserve category payload',()=>{
 const products=[{id:'a',category:'bags',priceGEL:100},{id:'b',category:'bags',priceGEL:80,oldPriceGEL:100},{id:'c',category:'shoes',priceGEL:100}];
 const time='2026-11-25T17:00';
 assert.deepEqual(buildFlashScheduleRequest({...form,selectedIds:['a']},time,now,products).p_product_ids,['a']);
 for(const ids of [[],['a','a'],['b'],['c'],['missing']])assert.equal(buildFlashScheduleRequest({...form,selectedIds:ids},time,now,products),null);
 assert.equal('p_product_ids' in buildFlashScheduleRequest(form,time,now,products),false);
});

test('edit and copy drafts preserve scope; copy always requires a new explicit date',async()=>{
 const {makeFlashScheduleDraft,buildFlashScheduleDraftRequest}=await import('../src/utils/adminFlashSchedule.js');
 const row={id:'x',revision:2,status:'pending',category:'bags',discount_percent:20,starts_at:'2026-11-25T13:00Z',ends_at:'2026-11-25T16:00Z',product_ids:['a']};
 const products=[{id:'a',category:'bags',priceGEL:100}];
 const edit=makeFlashScheduleDraft(row,'edit',now);
 assert.deepEqual(buildFlashScheduleDraftRequest(edit,now,products),{rpc:'admin_edit_flash_sale_schedule',payload:{p_id:'x',p_revision:2,p_discount_percent:20,p_duration_hours:3,p_starts_at:'2026-11-25T13:00:00.000Z'}});
 assert.equal(makeFlashScheduleDraft({...row,status:'started'},'edit',now),null);
 const copy=makeFlashScheduleDraft(row,'copy',now);
 assert.equal(copy.plannedStart,'');
 assert.equal(buildFlashScheduleDraftRequest(copy,now,products),null);
 assert.deepEqual(buildFlashScheduleDraftRequest({...copy,plannedStart:'2026-11-26T17:00'},now,products).payload.p_product_ids,['a']);
});
