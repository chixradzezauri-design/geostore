import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');

test('text-only storefront edits mark the draft dirty before publication', () => {
  const handler = source.match(/const updateSiteText = \(key, value\) => \{([\s\S]*?)\n  \};/);
  assert.ok(handler, 'text update handler exists');
  assert.match(handler[1], /localDesignDirtyRef\.current\s*=\s*true\s*;/);
  assert.match(handler[1], /setSiteSettings/);
});

test('publish refuses unsaved storefront changes', () => {
  const publish = source.match(/const publish = async \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(publish, 'publish handler exists');
  assert.match(publish[1], /if \(localDesignDirtyRef\.current\) \{/);
  assert.match(publish[1], /return;/);
});
