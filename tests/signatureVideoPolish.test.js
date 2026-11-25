import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const root = postcss.parse(read('src/storefrontVideoRedesign.css'));
const store = read('src/components/StoreView.jsx');

function lastRule(selector, predicate = () => true) {
  let found;
  root.walkRules(rule => {
    if (rule.selector.includes(selector) && predicate(rule)) found = rule;
  });
  assert.ok(found, selector);
  return found;
}
function decl(rule, prop, value) {
  assert.ok(rule.nodes.some(n => n.type === 'decl' && n.prop === prop && n.value === value && n.important), prop + ': ' + value);
}

test('signature product heading remains a full-width, intrinsic-height row', () => {
  assert.match(store, /gs-catalog-product-grid[\s\S]*?gs-signature-products-heading[\s\S]*?paginatedProducts\.map/);
  const grid = lastRule('.gs-catalog-product-grid:where([data-signature-products="true"])', r => r.selector.endsWith('])') && r.nodes.some(n => n.prop === 'grid-auto-rows'));
  decl(grid, 'grid-auto-rows', 'auto');
  decl(grid, 'align-content', 'start');
  const heading = lastRule('> .gs-signature-products-heading');
  assert.ok(heading.nodes.some(n => n.prop === 'grid-column' && n.value === '1 / -1'));
});

test('mobile price range uses two equal columns and no decorative separator track', () => {
  assert.match(store, /gs-price-filter[\s\S]*?value=\{minPrice\}[\s\S]*?<span className="text-slate-500" aria-hidden="true">–<\/span>[\s\S]*?value=\{maxPrice\}/);
  const scopes = [
    r => r.parent.type === 'atrule' && r.parent.params === '(max-width: 640px)',
    r => r.selector.startsWith('.gs-visual-preview-frame--mobile.geostore-fashion-store')
  ];
  for (const scope of scopes) {
    const grid = lastRule('.gs-price-filter', r => scope(r) && r.selector.endsWith('.gs-price-filter'));
    decl(grid, 'grid-template-columns', 'repeat(2, minmax(0, 1fr))');
    const fields = lastRule('.gs-price-filter > input.gs-price-input', scope);
    decl(fields, 'grid-column', 'auto');
    decl(fields, 'width', '100%');
    decl(fields, 'min-width', '0');
    const separator = lastRule('.gs-price-filter > span[aria-hidden="true"]', scope);
    decl(separator, 'display', 'none');
  }
});
