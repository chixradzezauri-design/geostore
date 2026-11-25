import test from 'node:test';
import assert from 'node:assert/strict';
import {CART_SYNC_ENABLED,compareCartForReview,validateCartReviewStock,planCartReviewPublish,planCartReviewRestore,matchesCartRestorePreview} from '../src/utils/cartSyncReview.js';
const local={id:'p',selectedSize:null,selectedColor:null,customVariantId:null,giftWrap:false,vipWarranty:false,giftMessage:'',quantity:2,priceGEL:99};
const line={productId:'p',size:null,color:null,variantId:null,giftWrap:false,vipWarranty:false,quantity:2};
const product={id:'p',stock:3,variants:[],availableSizes:[],availableColors:[]};
test('gate remains off and quantity comparison is explicit',()=>{assert.equal(CART_SYNC_ENABLED,false);const r=compareCartForReview([local],{revision:1,lines:[{...line,quantity:1}]});assert.deepEqual(r.quantityChanged,[{line,remoteQuantity:1}]);assert.equal(local.quantity,2);});
test('validate aggregate stock across add-ons and reject unpublished or invalid selections',()=>{assert.equal(validateCartReviewStock([line],[product]),true);assert.equal(validateCartReviewStock([line,{...line,giftWrap:true}],[product]),false);assert.equal(validateCartReviewStock([line],[{...product,isPublished:false}]),false);assert.equal(validateCartReviewStock([{...line,size:'M'}],[product]),false);assert.equal(validateCartReviewStock([line],[{...product,availableSizes:['M']}]),false);});
test('matrix requires exact variant size/color and stock',()=>{const p={...product,variants:[{id:'v',name:'M red',variantType:'size_color',size:'M',color:'red',stock:2,priceGEL:20}]};const row={...line,size:'M',color:'red',variantId:'v'};assert.equal(validateCartReviewStock([row],[p]),true);assert.equal(validateCartReviewStock([{...row,color:'blue'}],[p]),false);assert.equal(validateCartReviewStock([{...row,quantity:3}],[p]),false);});
test('publish only exact current local line, reject gift message, invalid stock and other remote lines',()=>{const base={revision:1,lines:[]};const verify=lines=>validateCartReviewStock(lines,[product]);assert.deepEqual(planCartReviewPublish([local],base,line,verify),{status:'ready',intent:{type:'set',line}});assert.equal(planCartReviewPublish([{...local,quantity:1}],base,line,verify).status,'review');assert.equal(planCartReviewPublish([{...local,giftWrap:true,giftMessage:'private'}],base,line,verify).status,'blocked');assert.equal(planCartReviewPublish([local],{revision:1,lines:[{...line,giftWrap:true}]},line,verify).status,'unavailable');});

test('restore uses live price and exact variant, not remote price metadata',()=>{
 const p={...product,name:'Current',priceGEL:30};
 const result=planCartReviewRestore([],{...line,giftWrap:true,priceGEL:1},[p]);
 assert.equal(result.status,'ready');assert.equal(result.cart[0].priceGEL,35);assert.equal(result.cart[0].basePriceGEL,30);
 assert.equal(result.cart[0].giftMessage,'');assert.equal(result.cart[0].name,'Current');
});
test('restore keeps unrelated rows and blocks insufficient stock or private gift text',()=>{
 const p={...product,name:'Current',priceGEL:30};
 const other={...local,id:'q',name:'Other',quantity:1};
 const catalog=[p,{...product,id:'q',name:'Other',priceGEL:11}];
 const result=planCartReviewRestore([other],line,catalog);assert.equal(result.status,'ready');assert.equal(result.cart[0],other);
 assert.equal(planCartReviewRestore([{...local,giftWrap:true,giftMessage:'private'}],line,catalog).status,'blocked');
 assert.equal(planCartReviewRestore([],{...line,quantity:4},catalog).status,'unavailable');
 assert.equal(planCartReviewRestore([],line,[{...p,priceGEL:null}]).status,'unavailable');
});
test('restore confirmation invalidated by changed price or local quantity',()=>{
 const p={...product,name:'Current',priceGEL:30};
 const first=planCartReviewRestore([],line,[p]).preview;
 assert.equal(matchesCartRestorePreview(first,planCartReviewRestore([],line,[p]).preview),true);
 assert.equal(matchesCartRestorePreview(first,planCartReviewRestore([],line,[{...p,priceGEL:40}]).preview),false);
 assert.equal(matchesCartRestorePreview(first,planCartReviewRestore([{...local,name:'Current',quantity:1}],line,[p]).preview),false);
});
