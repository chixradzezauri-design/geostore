import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStorefrontVisualDesign,setStorefrontSectionGeometry,getStorefrontSectionGeometry,buildStorefrontSectionGeometryProps,saveStorefrontDesignTemplate,applyStorefrontDesignTemplate} from '../src/utils/storefrontVisualDesign.js';
test('geometry is opt-in, bounded, responsive and resettable',()=>{
 const original=normalizeStorefrontVisualDesign({copy:{heroButton:'Keep'},productOrder:['sku']});
 assert.deepEqual(buildStorefrontSectionGeometryProps(original,'hero','mobile'),{style:{}});
 const base=setStorefrontSectionGeometry(original,'hero','desktop','marginTop',30);
 const mobile=setStorefrontSectionGeometry(base,'hero','mobile','maxWidth',90);
 assert.deepEqual(getStorefrontSectionGeometry(mobile,'hero','mobile'),{marginTop:30,maxWidth:90});
 assert.deepEqual(getStorefrontSectionGeometry(mobile,'hero','tablet'),{marginTop:30});
 assert.deepEqual(getStorefrontSectionGeometry(mobile,'products','mobile'),{});
 assert.deepEqual(getStorefrontSectionGeometry(setStorefrontSectionGeometry(mobile,'hero','mobile','maxWidth',null),'hero','mobile'),{marginTop:30});
 assert.deepEqual(normalizeStorefrontVisualDesign(JSON.parse(JSON.stringify(mobile))),mobile);
 assert.deepEqual(mobile.copy,original.copy);assert.deepEqual(mobile.productOrder,original.productOrder);
 assert.equal(setStorefrontSectionGeometry(mobile,'hero','mobile','maxWidth',200),null);
});
test('malformed geometry cannot hide or overflow sections; secondary roots share only width',()=>{
 const d=normalizeStorefrontVisualDesign({sectionGeometry:{hero:{marginTop:-99,maxWidth:999,display:'none'},unknown:{marginTop:3}},responsive:{mobile:{sectionGeometry:{hero:{maxWidth:'90'}}}}});
 assert.deepEqual(getStorefrontSectionGeometry(d,'hero','mobile'),{marginTop:0,maxWidth:100});
 assert.deepEqual(buildStorefrontSectionGeometryProps(d,'hero','mobile',{secondary:true}),{style:{'--gs-section-max-width':'100%'},'data-gs-section-width':'true'});
 assert.deepEqual(d.sectionGeometry.unknown,undefined);
});
test('global design templates preserve independent geometry',()=>{
 const d=setStorefrontSectionGeometry({},'products','mobile','maxWidth',90);
 const id='80000000-0000-4000-8000-000000000001';
 const saved=saveStorefrontDesignTemplate(d,{id,name:'Example'});
 assert.deepEqual(applyStorefrontDesignTemplate(saved,id).responsive.mobile.sectionGeometry,d.responsive.mobile.sectionGeometry);
});
