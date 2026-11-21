import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('Stage 35: six native compact groups are filterable without changing persisted design', () => {
  assert.match(source, /const \[panelGroupSearch, setPanelGroupSearch\] = useState\(''\)/);
  assert.match(source, /type="search" autoComplete="off" value=\{panelGroupSearch\}/);
  assert.match(source, /visiblePanelGroupCount/);
  const keys = ['palette', 'typography', 'layout', 'content', 'modules', 'elements'];
  for (const key of keys) {
    assert.ok(source.includes("hidden={!isPanelGroupVisible('" + key + "')}"), key);
  }
  assert.equal((source.match(/className="admin-studio-group/g) || []).length, 6);
  assert.match(source, /<summary className="flex min-h-11 cursor-pointer/);
  assert.match(source, /const isPanelGroupVisible = key => !panelGroupQuery/);
});

test('Stage 35: module cards are individually collapsible, preserving all actual style handlers', () => {
  assert.match(source, /COMPONENT_FIELDS\.map\(component => \(\s*<details key=\{component\.key\}/);
  assert.match(source, /<summary className="flex min-h-11[^"]*">\{component\.label\}<\/summary>/);
  assert.match(source, /updateComponentValue\(component\.key, property\.key, Number\(event\.target\.value\)\)/);
  assert.match(source, /updateComponentValue\(component\.key, field\.key, event\.target\.value\)/);
  assert.match(source, /value=\{active\.components\[component\.key\]\[property\.key\]\}/);
});

test('Stage 35: selecting a live preview element automatically reveals the nested editor', () => {
  assert.match(source, /ref=\{elementEditorDetailsRef\} hidden=\{!isPanelGroupVisible\('elements'\)\}/);
  assert.match(source, /setPanelGroupSearch\(''\);\s*if \(elementEditorDetailsRef\.current\) elementEditorDetailsRef\.current\.open = true/);
  assert.match(source, /\}, \[selectedElementKey\]\)/);
  assert.match(source, /onChange=\{event => updateElementValue\(/);
});

test('Stage 35: multi-device cloud save and conflict UI stay connected to the owner editor', () => {
  assert.match(shell, /saveAdminPanelVisualDesignToCloud\(adminVisualDesign, adminVisualUpdatedAtRef\.current\)/);
  assert.match(shell, /visibleAdminTab === 'admin_visual_editor' && isOwner/);
  assert.match(source, /syncStatus === 'conflict'/);
  assert.match(source, /onClick=\{onReloadRemote\}/);
  assert.match(source, /onClick=\{onRetrySave\}/);
});
