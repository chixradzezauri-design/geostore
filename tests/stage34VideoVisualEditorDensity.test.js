import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');

test('Stage 34: storefront editor starts with compact native, searchable groups', () => {
  assert.match(source, /const STOREFRONT_EDITOR_GROUP_SEARCH = Object\.freeze/);
  assert.match(source, /type="search" value=\{controlSearch\}/);
  assert.match(source, /visibleControlGroupCount/);
  for (const key of ['headings', 'labels', 'theme', 'layout', 'image', 'sections', 'custom']) {
    assert.ok(source.includes("hidden={!isControlGroupVisible('" + key + "')}"), 'missing searchable control group ' + key);
  }
  assert.doesNotMatch(source, /<details open className="rounded-2xl border/);
  assert.match(source, /<details className="rounded-2xl border border-sky-400\/25[^>]+aria-label="გამოქვეყნებული ვერსიების ისტორია"/);
  assert.match(source, /<summary className="flex min-h-11 cursor-pointer/);
});

test('Stage 34: phone save/publish actions reuse the protected handlers', () => {
  const mobile = source.match(/<div className="gs-visual-editor-mobile-actions[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(mobile, /sticky top-2/);
  assert.match(mobile, /md:hidden/);
  assert.match(mobile, /onClick=\{saveDraft\}/);
  assert.match(mobile, /onClick=\{publish\}/);
  assert.match(mobile, /disabled=\{!isOwner \|\| storefrontDraftBusy \|\| storefrontPublishBusy\}/);
  assert.match(source, /hidden md:sticky md:bottom-2 md:z-20 md:grid/);
  assert.match(source, /if \(!isOwner \|\| typeof onPublishStorefront !== 'function'/);
  assert.match(source, /if \(localDesignDirtyRef\.current/);
});
