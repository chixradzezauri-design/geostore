const SECTION_IDS = ['hero', 'banners', 'flashSale', 'categories', 'filters', 'products'];

export const DEFAULT_STOREFRONT_VISUAL_DESIGN = Object.freeze({
  version: 1,
  theme: {
    canvas: '#f7f4ef', surface: '#fffdfa', surfaceSoft: '#f0ebe4',
    ink: '#29241f', muted: '#776b60', line: '#e6ddd3',
    accent: '#92785f', accentDark: '#302a24',
    buttonBackground: '#29241f', buttonText: '#ffffff', heroText: '#25201c'
  },
  typography: { fontFamily: 'manrope', baseFontSize: 14, headingScale: 1 },
  layout: {
    contentWidth: 1440, sectionGap: 42, heroHeight: 480,
    categoryCardHeight: 160, categoryColumns: 4, productColumns: 4,
    cardRadius: 4, buttonRadius: 4
  },
  hero: { imageUrl: '', overlayOpacity: 92, imagePositionX: 50 },
  sections: { hero: true, banners: true, flashSale: true, categories: true, filters: true, products: true },
  sectionOrder: SECTION_IDS
});

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const safeColor = (value, fallback) => {
  const color = String(value ?? '').trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;
};
const safeImageUrl = value => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

export function normalizeStorefrontVisualDesign(rawDesign) {
  const raw = isPlainObject(rawDesign) ? rawDesign : {};
  const theme = isPlainObject(raw.theme) ? raw.theme : {};
  const typography = isPlainObject(raw.typography) ? raw.typography : {};
  const layout = isPlainObject(raw.layout) ? raw.layout : {};
  const hero = isPlainObject(raw.hero) ? raw.hero : {};
  const sections = isPlainObject(raw.sections) ? raw.sections : {};
  const defaults = DEFAULT_STOREFRONT_VISUAL_DESIGN;
  const requestedOrder = Array.isArray(raw.sectionOrder) ? raw.sectionOrder : defaults.sectionOrder;
  const sectionOrder = [];

  requestedOrder.forEach(id => {
    if (SECTION_IDS.includes(id) && !sectionOrder.includes(id)) sectionOrder.push(id);
  });
  SECTION_IDS.forEach(id => {
    if (!sectionOrder.includes(id)) sectionOrder.push(id);
  });

  return {
    version: 1,
    theme: {
      canvas: safeColor(theme.canvas, defaults.theme.canvas),
      surface: safeColor(theme.surface, defaults.theme.surface),
      surfaceSoft: safeColor(theme.surfaceSoft, defaults.theme.surfaceSoft),
      ink: safeColor(theme.ink, defaults.theme.ink),
      muted: safeColor(theme.muted, defaults.theme.muted),
      line: safeColor(theme.line, defaults.theme.line),
      accent: safeColor(theme.accent, defaults.theme.accent),
      accentDark: safeColor(theme.accentDark, defaults.theme.accentDark),
      buttonBackground: safeColor(theme.buttonBackground, defaults.theme.buttonBackground),
      buttonText: safeColor(theme.buttonText, defaults.theme.buttonText),
      heroText: safeColor(theme.heroText, defaults.theme.heroText)
    },
    typography: {
      fontFamily: ['manrope', 'georgia', 'arial'].includes(typography.fontFamily) ? typography.fontFamily : defaults.typography.fontFamily,
      baseFontSize: clamp(typography.baseFontSize, 12, 18, defaults.typography.baseFontSize),
      headingScale: clamp(typography.headingScale, 0.8, 1.25, defaults.typography.headingScale)
    },
    layout: {
      contentWidth: clamp(layout.contentWidth, 960, 1600, defaults.layout.contentWidth),
      sectionGap: clamp(layout.sectionGap, 16, 72, defaults.layout.sectionGap),
      heroHeight: clamp(layout.heroHeight, 320, 680, defaults.layout.heroHeight),
      categoryCardHeight: clamp(layout.categoryCardHeight, 110, 260, defaults.layout.categoryCardHeight),
      categoryColumns: Math.round(clamp(layout.categoryColumns, 2, 6, defaults.layout.categoryColumns)),
      productColumns: Math.round(clamp(layout.productColumns, 2, 5, defaults.layout.productColumns)),
      cardRadius: clamp(layout.cardRadius, 0, 28, defaults.layout.cardRadius),
      buttonRadius: clamp(layout.buttonRadius, 0, 28, defaults.layout.buttonRadius)
    },
    hero: {
      imageUrl: safeImageUrl(hero.imageUrl),
      overlayOpacity: Math.round(clamp(hero.overlayOpacity, 0, 100, defaults.hero.overlayOpacity)),
      imagePositionX: Math.round(clamp(hero.imagePositionX, 0, 100, defaults.hero.imagePositionX))
    },
    sections: Object.fromEntries(SECTION_IDS.map(id => [id, sections[id] !== false])),
    sectionOrder
  };
}

const FONT_STACKS = {
  manrope: "'Manrope', 'Noto Sans Georgian', sans-serif",
  georgia: "Georgia, 'Noto Serif Georgian', serif",
  arial: "Arial, 'Noto Sans Georgian', sans-serif"
};

export function buildStorefrontVisualStyle(rawDesign) {
  const design = normalizeStorefrontVisualDesign(rawDesign);
  const theme = design.theme;
  const typography = design.typography;
  const layout = design.layout;
  const hero = design.hero;
  const sections = design.sections;
  const style = {
    '--gs-canvas': theme.canvas,
    '--gs-surface': theme.surface,
    '--gs-surface-soft': theme.surfaceSoft,
    '--gs-ink': theme.ink,
    '--gs-muted': theme.muted,
    '--gs-line': theme.line,
    '--gs-accent': theme.accent,
    '--gs-accent-dark': theme.accentDark,
    '--gs-button-bg': theme.buttonBackground,
    '--gs-button-text': theme.buttonText,
    '--gs-hero-text': theme.heroText,
    '--gs-font-family': FONT_STACKS[typography.fontFamily],
    '--gs-base-font-size': String(typography.baseFontSize) + 'px',
    '--gs-heading-scale': String(typography.headingScale),
    '--gs-content-width': String(layout.contentWidth) + 'px',
    '--gs-section-gap': String(layout.sectionGap) + 'px',
    '--gs-hero-height': String(layout.heroHeight) + 'px',
    '--gs-category-card-height': String(layout.categoryCardHeight) + 'px',
    '--gs-category-columns': String(layout.categoryColumns),
    '--gs-product-columns': String(layout.productColumns),
    '--gs-card-radius': String(layout.cardRadius) + 'px',
    '--gs-button-radius': String(layout.buttonRadius) + 'px',
    '--gs-hero-image-x': String(hero.imagePositionX) + '%',
    '--gs-hero-overlay-opacity': String(hero.overlayOpacity / 100),
    '--gs-show-hero': sections.hero ? 'flex' : 'none',
    '--gs-show-banners': sections.banners ? 'grid' : 'none',
    '--gs-show-flash-sale': sections.flashSale ? 'block' : 'none',
    '--gs-show-categories': sections.categories ? 'block' : 'none',
    '--gs-show-filters': sections.filters ? 'grid' : 'none',
    '--gs-show-products': sections.products ? 'grid' : 'none'
  };

  if (hero.imageUrl) style['--gs-hero-image'] = 'url("' + hero.imageUrl + '")';
  design.sectionOrder.forEach((id, index) => {
    style['--gs-order-' + id] = String(index + 1);
  });
  return style;
}
