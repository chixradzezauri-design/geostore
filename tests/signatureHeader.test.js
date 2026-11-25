import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const header=readFileSync(new URL('../src/components/Header.jsx', import.meta.url),'utf8');
const css=readFileSync(new URL('../src/storefrontVideoRedesign.css', import.meta.url),'utf8');

test('Signature header reuses the original profile action and search hook', () => {
  assert.equal(header.split("goTo('profile')").length-1,1);
  assert.equal(header.split('onClick={openProfile}').length-1,2);
  assert.match(header,/className="gs-header-search-row"/);
  assert.ok(header.includes("data-signature-search-closed={signature && !searchVisible ? 'true' : undefined}"));
  assert.ok(css.includes('.gs-header-search-row[data-signature-search-closed="true"] {display:none!important;}'));
  assert.ok(header.includes('setSearchQuery?.(event.target.value)'));
  assert.ok(header.includes('runAction(setIsImageSearchOpen)'));
});


test('Signature search stays open and focusable when the final query is cleared', () => {
  assert.match(header, /onFocus=\{\(\) => \{ if \(signature\) setSearchOpen\(true\); \}\}/);
  assert.match(header, /if \(signature\) setSearchOpen\(true\); setSearchQuery\?\.\(''\); searchInputRef\.current\?\.focus\(\)/);
});
