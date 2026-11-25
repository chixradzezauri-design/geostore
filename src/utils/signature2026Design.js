import { normalizeStorefrontVisualDesign } from './storefrontVisualDesign.js';

// Signature 2026: approved editorial reference, stage 1.
// Applies to the editor draft only. Existing media, copy, visibility, product
// ordering, custom sections, geometry and individual element overrides survive.
export const SIGNATURE_SECTION_ORDER = Object.freeze([
  'hero', 'categories', 'filters', 'products', 'banners', 'flashSale'
]);

const theme = {
  canvas: '#f6f3ef', surface: '#fffdfa', surfaceSoft: '#ebe5dd',
  ink: '#201c19', muted: '#62574d', line: '#e2d9ce',
  accent: '#a38450', accentDark: '#302720',
  buttonBackground: '#201c19', buttonText: '#ffffff', heroText: '#201c19'
};
const typography = {
  fontFamily: 'manrope', headingFontFamily: 'georgia', baseFontSize: 14, headingScale: 1
};
const layout = {
  contentWidth: 1440, sectionGap: 20, heroHeight: 420,
  categoryCardHeight: 150, categoryColumns: 4, productColumns: 5,
  heroContentWidth: 48, bannerHeight: 220, productImageRatio: 1.05,
  cardRadius: 12, buttonRadius: 8
};

export function applySignature2026Design(raw) {
  const design = normalizeStorefrontVisualDesign(raw);
  const responsive = Object.fromEntries(['tablet', 'mobile'].map(viewport => [
    viewport, {
      ...design.responsive[viewport],
      // Reset only shared visual overrides, not element or section geometry.
      theme: {}, typography: {},
      layout: viewport === 'mobile'
        ? { sectionGap: 20, heroHeight: 360, categoryColumns: 2, productColumns: 2,
            categoryCardHeight: 110, heroContentWidth: 70, productImageRatio: 0.95 }
        : { sectionGap: 20, heroHeight: 380, categoryColumns: 4, productColumns: 3,
            categoryCardHeight: 130, heroContentWidth: 55 },
      sectionOrder: [...SIGNATURE_SECTION_ORDER]
    }
  ]));
  return normalizeStorefrontVisualDesign({
    ...design, theme, typography, layout, responsive,
    sectionOrder: [...SIGNATURE_SECTION_ORDER],
    hero: { ...design.hero, overlayOpacity: 40, imagePositionX: 65 }
  });
}
