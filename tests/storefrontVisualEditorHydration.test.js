import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');

test('late shared storefront draft hydrates the editor and resets stale undo history', () => {
  assert.match(editor, /const designRef = useRef\(initialDesign\)/);
  assert.match(editor, /const localDesignDirtyRef = useRef\(false\)/);
  assert.match(editor, /const incoming = normalizeStorefrontVisualDesign\(siteSettings\?\.visualDesign\)/);
  assert.match(editor, /if \(JSON\.stringify\(incoming\) === JSON\.stringify\(designRef\.current\)\) return/);
  assert.match(editor, /if \(localDesignDirtyRef\.current\) return/);
  assert.match(editor, /historyRef\.current = \[incoming\]/);
  assert.match(editor, /historyIndexRef\.current = 0/);
  assert.match(editor, /setDesign\(incoming\)/);
});

test('local visual edits, undo and redo are protected from late remote hydration', () => {
  const commit = editor.split('const commitDesign = nextValue =>')[1]?.split('const updateGroup')[0] || '';
  const undo = editor.split('const undo = () =>')[1]?.split('const redo = () =>')[0] || '';
  const redo = editor.split('const redo = () =>')[1]?.split('const moveSection')[0] || '';
  for (const [name, source] of [['commit', commit], ['undo', undo], ['redo', redo]]) {
    assert.match(source, /designRef\.current = next/, `${name} must update the latest design reference`);
    assert.match(source, /localDesignDirtyRef\.current = true/, `${name} must mark local edits dirty`);
  }
});

test('only a successful save of the latest local design clears the dirty guard', () => {
  const save = editor.split('const saveDraft = async () =>')[1]?.split('const publish = async () =>')[0] || '';
  assert.match(save, /const snapshotDesign = design/);
  assert.match(save, /const hasNewerLocalChanges = JSON\.stringify\(designRef\.current\) !== JSON\.stringify\(snapshotDesign\)/);
  assert.match(save, /saved === true && !hasNewerLocalChanges/);
  assert.match(save, /localDesignDirtyRef\.current = false/);
  assert.ok(save.indexOf('saved === true &&') < save.indexOf('localDesignDirtyRef.current = false'));
});

test('publishing blocks unsaved local visual edits before confirmation', () => {
  const publish = editor.split('const publish = async () =>')[1]?.split('const resetDesign = () =>')[0] || '';
  assert.match(publish, /if \(localDesignDirtyRef\.current\)/);
  assert.match(publish, /ჯერ შეინახეთ მონახაზი და შემდეგ გამოაქვეყნეთ/);
  assert.ok(publish.indexOf('if (localDesignDirtyRef.current)') < publish.indexOf('window.confirm('));
});

test('failed draft save keeps the unsaved guard and shows a retry message', () => {
  const save = editor.split('const saveDraft = async () =>')[1]?.split('const publish = async () =>')[0] || '';
  assert.match(save, /try \{/);
  assert.match(save, /saved = await onSaveStorefrontDraft\(snapshot\)/);
  assert.match(save, /catch \(error\)/);
  assert.match(save, /ცვლილებები შეუნახავია; სცადეთ ხელახლა/);
  assert.ok(save.indexOf('catch (error)') < save.indexOf('localDesignDirtyRef.current = false'));
});

test('failed publish request reports failure without claiming success', () => {
  const publish = editor.split('const publish = async () =>')[1]?.split('const resetDesign = () =>')[0] || '';
  assert.match(publish, /published = await onPublishStorefront\(\)/);
  assert.match(publish, /catch \(error\)/);
  assert.match(publish, /გამოქვეყნება ვერ მოხერხდა/);
  assert.ok(publish.indexOf('catch (error)') < publish.indexOf("published === true ? 'ცვლილებები გამოქვეყნებულია.'"));
});

test('published storefront stays confirmed when version history refresh fails', () => {
  const publish = editor.split('const publish = async () =>')[1]?.split('const resetDesign = () =>')[0] || '';
  assert.match(publish, /if \(published === true\)/);
  assert.match(publish, /if \(error\) throw error/);
  assert.match(publish, /ცვლილებები გამოქვეყნებულია, თუმცა ვერსიების ისტორიის განახლება ვერ მოხერხდა/);
  assert.ok(publish.indexOf('if (published === true)') < publish.indexOf('if (error) throw error'));
});

test('unsuccessful save and publish responses never imply success', () => {
  const save = editor.split('const saveDraft = async () =>')[1]?.split('const publish = async () =>')[0] || '';
  const publish = editor.split('const publish = async () =>')[1]?.split('const resetDesign = () =>')[0] || '';
  assert.match(save, /მონახაზი ვერ შეინახა\. ცვლილებები შეუნახავია/);
  assert.match(publish, /გამოქვეყნება არ დადასტურდა/);
  assert.match(publish, /published === true \?/);
});
