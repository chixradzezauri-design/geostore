import test from 'node:test';
import assert from 'node:assert/strict';
import {flashSaleMetadataChanged,FLASH_SALE_METADATA_QUERY} from '../src/utils/flashSaleMetadataRefresh.js';
const row={id:'a',price_gel:80,old_price_gel:100,flash_sale_started_at:'2026-11-25T10:00:00Z',flash_sale_ends_at:'2026-11-25T12:00:00Z',flash_sale_percent:20};
const local={id:'a',priceGEL:80,oldPriceGEL:100,flashSaleStartedAt:'2026-11-25T10:00:00.000Z',flashSaleEndsAt:'2026-11-25T12:00:00.000Z',flashSalePercent:20};
test('detects activation, expiry and changed campaign price without comparing images',()=>{
 assert.equal(flashSaleMetadataChanged([], [row]),true);
 assert.equal(flashSaleMetadataChanged([local], []),true);
 assert.equal(flashSaleMetadataChanged([local], [{...row,price_gel:75}]),true);
 assert.equal(flashSaleMetadataChanged([{...local,image:'large'}, {id:'b',priceGEL:50}], [row]),false);
 assert.equal(flashSaleMetadataChanged([{...local,isPublished:false}], []),false);
 assert.equal(flashSaleMetadataChanged([local,{...local,id:'b'}], [{...row,id:'b'},row]),false);
 assert.doesNotMatch(FLASH_SALE_METADATA_QUERY,/image|gallery|purchase_cost/);
});
test('malformed responses cannot trigger a catalogue refresh',()=>{
 for(const bad of [null,{},[{id:'a'}],[row,row],[{...row,flash_sale_ends_at:'invalid'}]])assert.equal(flashSaleMetadataChanged([local],bad),false);
});
