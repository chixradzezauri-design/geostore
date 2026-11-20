import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const assets = resolve('dist/assets');
const stylesheets = readdirSync(assets).filter(file => file.endsWith('.css'));
assert.ok(stylesheets.length, 'Production build must contain CSS');
const css = stylesheets.map(file => readFileSync(resolve(assets, file), 'utf8')).join('\n');
const cards = Array.from({ length: 2 }, (_, i) =>
  '<article class="gs-catalog-product-card"><div class="gs-catalog-product-media">Image</div>' +
  '<div class="gs-catalog-product-info"><h3>Product ' + i + '</h3><button>დამატება</button></div></article>'
).join('');
const nav = Array.from({ length: 23 }, (_, i) =>
  '<button type="button" data-admin-visual-nav-item="true" class="w-full min-w-0 px-3.5 py-3 rounded-2xl flex items-center justify-between">' +
  '<span>ადმინისტრატორის მენიუ ' + i + '</span></button>'
).join('');
const storefront = '<section class="geostore-fashion-store" style="width:100%;max-width:100%">' +
  '<main class="geostore-storefront"><div class="gs-catalog-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">' +
  cards + '</div></main><footer class="geostore-site-footer"><div class="geostore-footer-links">' +
  '<button>წესები და პირობები</button><span aria-hidden="true">•</span>' +
  '<button>კონფიდენციალურობა</button><span aria-hidden="true">•</span>' +
  '<button>საგარანტიო წესები</button></div></footer></section>';
const admin = '<section class="admin-dashboard-pro admin-dashboard-shell flex flex-col lg:flex-row gap-6 w-full" data-admin-visual-design="enabled">' +
  '<div class="w-full lg:w-72 shrink-0"><div>GEOSTORE Admin</div><div class="space-y-1.5">' + nav + '</div></div>' +
  '<div class="flex-1 w-full"><div data-admin-visual-header="true" class="flex flex-col lg:flex-row p-5 gap-3">' +
  '<div><h2>მოგესალმებით, მთავარო ადმინისტრატორო</h2></div>' +
  '<div class="grid grid-cols-2 gap-2"><button>მონახაზის შენახვა</button><button>ცვლილებების გამოქვეყნება</button></div>' +
  '</div><div class="admin-command-hero"><h3>მთავარი მართვის ცენტრი</h3></div>' +
  '<div class="admin-command-kpis"><button class="admin-command-kpi"><span>ახალი შეკვეთები</span><strong>120</strong></button></div>' +
  '</div></section>';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 359, 375, 430, 640, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    try {
      await page.setContent('<!doctype html><html lang="ka"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' +
        storefront + admin + '</body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: css });
      const layout = await page.evaluate(() => {
        const grid = document.querySelector('.gs-catalog-product-grid');
        const links = document.querySelector('.geostore-footer-links');
        const dots = [...links.querySelectorAll('span[aria-hidden="true"]')];
        const buttons = [...links.querySelectorAll('button')];
        const sidebar = document.querySelector('.admin-dashboard-pro > div:first-child');
        const welcome = document.querySelector('[data-admin-visual-header="true"]');
        return {
          scrollWidth: document.documentElement.scrollWidth,
          width: window.innerWidth,
          gridTracks: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          footerDisplay: getComputedStyle(links).display,
          hiddenDots: dots.every(dot => getComputedStyle(dot).display === 'none'),
          footerMinButtonHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
          sidebarPosition: getComputedStyle(sidebar).position,
          sidebarOverflowY: getComputedStyle(sidebar).overflowY,
          sidebarHeight: sidebar.getBoundingClientRect().height,
          welcomeRight: welcome.getBoundingClientRect().right,
          kpiFontSize: parseFloat(getComputedStyle(document.querySelector('.admin-command-kpi > strong')).fontSize)
        };
      });
      assert.ok(layout.scrollWidth <= width + 2, width + 'px overflow ' + JSON.stringify(layout));
      assert.ok(layout.welcomeRight <= width + 2, width + 'px header overflow ' + JSON.stringify(layout));
      assert.ok(layout.kpiFontSize >= 17 && layout.kpiFontSize <= 25,
        width + 'px compact KPI value should be 17–25px: ' + JSON.stringify(layout));
      if (width <= 359) assert.equal(layout.gridTracks, 1, width + 'px catalog');
      if (width >= 375 && width <= 640) assert.equal(layout.gridTracks, 2, width + 'px catalog');
      if (width <= 640) {
        assert.equal(layout.footerDisplay, 'flex', width + 'px footer');
        assert.ok(layout.hiddenDots, width + 'px dot separators');
        assert.ok(layout.footerMinButtonHeight >= 38, width + 'px footer touch targets');
      }
      if (width >= 1024) {
        assert.equal(layout.sidebarPosition, 'sticky', width + 'px desktop sidebar');
        assert.equal(layout.sidebarOverflowY, 'auto', width + 'px nav overflow');
        assert.ok(layout.sidebarHeight <= 820, width + 'px sidebar max height');
      }
      process.stdout.write('PASS viewport ' + width + 'px\n');
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
