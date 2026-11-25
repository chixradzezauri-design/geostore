import test from 'node:test';
import assert from 'node:assert/strict';
import {getSignatureCampaignSlides,signatureSlideIndex} from './signatureHero.js';
test('Signature campaign slides preserve safe live content, reject unsafe links and invalid images',()=>{
  assert.deepEqual(getSignatureCampaignSlides([{image:'https://example.com/a.jpg',title:'Collection',subtitle:'New',link:'javascript:alert(1)'},{image:'javascript:alert(1)',title:'bad'},{image:'https://example.com/b.jpg',title:''}]),[{image:'https://example.com/a.jpg',title:'Collection',subtitle:'New',link:''}]);
  assert.equal(getSignatureCampaignSlides([{image:'https://example.com/a.jpg',title:'Collection',link:'https://example.com/shop'}])[0].link,'https://example.com/shop');
  assert.deepEqual(getSignatureCampaignSlides(null),[]);
});
test('slide index safely resets when the published campaign list shrinks',()=>{
  assert.equal(signatureSlideIndex(2,3),2);
  assert.equal(signatureSlideIndex(2,1),0);
  assert.equal(signatureSlideIndex(-1,3),0);
  assert.equal(signatureSlideIndex(1.5,3),0);
});
