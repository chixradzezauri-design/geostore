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

test('draft save includes pending text and detects edits made while saving', () => {
  assert.match(source, /pendingTextEditsRef\.current\s*=\s*\{\s*\.\.\.pendingTextEditsRef\.current,\s*\[key\]: value\s*\}/);
  assert.match(source, /const snapshotRevision = localEditRevisionRef\.current/);
  assert.match(source, /\.\.\.pendingTextEditsRef\.current, visualDesign: snapshotDesign/);
  assert.match(source, /localEditRevisionRef\.current !== snapshotRevision/);
  assert.match(source, /if \(saved === true && !hasNewerLocalChanges\)/);
});

test('restoring a saved version discards obsolete pending text edits', () => {
  const restore = source.match(/const restoreSelectedStorefrontVersion = async \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(restore);
  assert.match(restore[1], /pendingTextEditsRef\.current = \{\}/);
});

test('undo and redo increment edit revision so in-flight saves cannot clear unsaved changes', () => {
  for (const name of ['undo', 'redo']) {
    const handler = source.match(new RegExp(`const ${name} = \\(\\) => \\{([\\s\\S]*?)\\n  \\};`));
    assert.ok(handler, `${name} exists`);
    assert.match(handler[1], /localEditRevisionRef\.current \+= 1/);
  }
});

test('browser navigation warns only while storefront draft is unsaved', () => {
  assert.match(source, /if \(!localDesignDirtyRef\.current\) return;/);
  assert.match(source, /window\.addEventListener\('beforeunload', warnBeforeUnload\)/);
  assert.match(source, /window\.removeEventListener\('beforeunload', warnBeforeUnload\)/);
});
