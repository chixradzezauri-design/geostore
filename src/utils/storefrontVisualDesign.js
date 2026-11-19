const SECTION_IDS = ['hero', 'banners', 'flashSale', 'categories', 'filters', 'products'];
const ELEMENT_STYLE_IDS = [
  'hero', 'hero.image', 'hero.title', 'hero.description', 'hero.button',
  'banner', 'banner.card', 'banner.image', 'banner.title', 'banner.description', 'banner.button',
  'flashSale', 'flashSale.title', 'flashSale.badge', 'flashSale.description',
  'categories', 'categories.title', 'categories.description', 'category.card', 'category.title', 'category.description',
  'filters', 'filters.priceLabel', 'filters.input', 'filters.clearButton', 'filters.sortLabel', 'filters.sortSelect', 'product.card', 'product.image', 'product.title', 'product.button',
  'product.detail.image', 'product.detail.title', 'product.detail.price',
  'product.detail.description', 'product.detail.variants', 'product.detail.purchase',
  'header', 'header.announcement', 'header.announcement.text', 'header.brand', 'header.logo',
  'header.storeName', 'header.caption', 'header.menu.toggle', 'header.search', 'header.search.input',
  'header.search.button', 'header.menu', 'header.menu.heading', 'header.menu.section',
  'header.menu.sectionTitle', 'header.menu.link', 'header.menu.footer', 'header.menu.languageButton',
  'footer', 'footer.links', 'footer.link', 'footer.copyright'
];

export const DEFAULT_STOREFRONT_VISUAL_DESIGN = Object.freeze({
  version: 1,
  theme: {
    canvas: '#f7f4ef', surface: '#fffdfa', surfaceSoft: '#f0ebe4',
    ink: '#29241f', muted: '#776b60', line: '#e6ddd3',
    accent: '#92785f', accentDark: '#302a24',
    buttonBackground: '#29241f', buttonText: '#ffffff', heroText: '#25201c'
  },
  typography: { fontFamily: 'manrope', headingFontFamily: 'georgia', baseFontSize: 14, headingScale: 1 },
  layout: {
    contentWidth: 1440, sectionGap: 42, heroHeight: 480,
    categoryCardHeight: 160, categoryColumns: 4, productColumns: 4,
    heroContentWidth: 68, bannerHeight: 220, productImageRatio: 0.8,
    cardRadius: 4, buttonRadius: 4
  },
  hero: { imageUrl: '', overlayOpacity: 92, imagePositionX: 50 },
  elementStyles: {},
  copy: {
    heroEyebrow: '', heroKicker: '', heroButton: '', heroNote: '',
    heroStampTop: '', heroStampTitle: '', heroStampBottom: '',
    categoriesTitle: '', categoriesSubtitle: '', flashSaleTitle: '',
    flashSaleSubtitle: '', flashSaleBadge: '', productButtonText: '', bannerButtonText: ''
  },
  sections: { hero: true, banners: true, flashSale: true, categories: true, filters: true, products: true },
  sectionOrder: SECTION_IDS,
  productOrder: []
});

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clamp = (value, min, max, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const safeColor = (value, fallback) => {
  const color = String(value ?? '').trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;
};
const safeImageUrl = value => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 7 * 1024 * 1024) return '';
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
  if (raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const normalizeResponsiveLayout = rawLayout => {
  const layout = isPlainObject(rawLayout) ? rawLayout : {};
  const fields = {
    contentWidth: [960, 1600], sectionGap: [16, 72], heroHeight: [320, 680],
    categoryCardHeight: [110, 260], categoryColumns: [2, 6], productColumns: [2, 5],
    heroContentWidth: [40, 90], bannerHeight: [150, 340], productImageRatio: [0.7, 1.2],
    cardRadius: [0, 28], buttonRadius: [0, 28]
  };
  return Object.fromEntries(Object.entries(fields)
    .map(([key, bounds]) => [key, clamp(layout[key], bounds[0], bounds[1], null)])
    .filter(([, value]) => value !== null)
    .map(([key, value]) => [key, ['categoryColumns', 'productColumns'].includes(key) ? Math.round(value) : value]));
};

export function normalizeStorefrontVisualDesign(rawDesign) {
  const raw = isPlainObject(rawDesign) ? rawDesign : {};
  const theme = isPlainObject(raw.theme) ? raw.theme : {};
  const typography = isPlainObject(raw.typography) ? raw.typography : {};
  const layout = isPlainObject(raw.layout) ? raw.layout : {};
  const hero = isPlainObject(raw.hero) ? raw.hero : {};
  const sections = isPlainObject(raw.sections) ? raw.sections : {};
  const copy = isPlainObject(raw.copy) ? raw.copy : {};
  const rawElementStyles = isPlainObject(raw.elementStyles) ? raw.elementStyles : {};
  const defaults = DEFAULT_STOREFRONT_VISUAL_DESIGN;
  const safeText = (value, maxLength) => String(value ?? '').slice(0, maxLength);
  const requestedOrder = Array.isArray(raw.sectionOrder) ? raw.sectionOrder : defaults.sectionOrder;
  const requestedProductOrder = Array.isArray(raw.productOrder) ? raw.productOrder : [];
  const productOrder = [...new Set(requestedProductOrder.map(id => String(id ?? '').trim()).filter(id => id && id.length <= 128))].slice(0, 2000);
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
      headingFontFamily: ['manrope', 'georgia', 'arial'].includes(typography.headingFontFamily) ? typography.headingFontFamily : defaults.typography.headingFontFamily,
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
      heroContentWidth: clamp(layout.heroContentWidth, 40, 90, defaults.layout.heroContentWidth),
      bannerHeight: clamp(layout.bannerHeight, 150, 340, defaults.layout.bannerHeight),
      productImageRatio: clamp(layout.productImageRatio, 0.7, 1.2, defaults.layout.productImageRatio),
      cardRadius: clamp(layout.cardRadius, 0, 28, defaults.layout.cardRadius),
      buttonRadius: clamp(layout.buttonRadius, 0, 28, defaults.layout.buttonRadius)
    },
    hero: {
      imageUrl: safeImageUrl(hero.imageUrl),
      overlayOpacity: Math.round(clamp(hero.overlayOpacity, 0, 100, defaults.hero.overlayOpacity)),
      imagePositionX: Math.round(clamp(hero.imagePositionX, 0, 100, defaults.hero.imagePositionX))
    },
    elementStyles: Object.fromEntries(ELEMENT_STYLE_IDS.map(id => {
      const value = isPlainObject(rawElementStyles[id]) ? rawElementStyles[id] : {};
      const textColor = safeColor(value.textColor, '');
      const backgroundColor = safeColor(value.backgroundColor, '');
      const borderColor = safeColor(value.borderColor, '');
      return [id, {
        textColor,
        backgroundColor,
        borderColor,
        borderWidth: clamp(value.borderWidth, 0, 12, null),
        lineHeight: clamp(value.lineHeight, 0.8, 2.5, null),
        letterSpacing: clamp(value.letterSpacing, -2, 12, null),
        textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'].includes(value.textTransform) ? value.textTransform : '',
        fontFamily: ['inherit', 'manrope', 'georgia', 'arial'].includes(value.fontFamily) ? value.fontFamily : '',
        boxShadow: ['none', 'soft', 'medium', 'strong'].includes(value.boxShadow) ? value.boxShadow : '',
        fontSize: clamp(value.fontSize, 10, 64, null),
        padding: clamp(value.padding, 0, 48, null),
        borderRadius: clamp(value.borderRadius, 0, 32, null),
        textAlign: ['left', 'center', 'right'].includes(value.textAlign) ? value.textAlign : '',
        fontWeight: [400, 500, 600, 700, 800, 900].includes(Number(value.fontWeight)) ? Number(value.fontWeight) : null,
        width: clamp(value.width, 10, 100, null),
        minHeight: clamp(value.minHeight, 0, 600, null),
        opacity: clamp(value.opacity, 0, 100, null),
        objectFit: ['cover', 'contain', 'fill'].includes(value.objectFit) ? value.objectFit : '',
        objectPositionX: clamp(value.objectPositionX, 0, 100, null)
      }];
    })),
    copy: {
      heroEyebrow: safeText(copy.heroEyebrow, 60), heroKicker: safeText(copy.heroKicker, 80),
      heroButton: safeText(copy.heroButton, 50), heroNote: safeText(copy.heroNote, 80),
      heroStampTop: safeText(copy.heroStampTop, 30), heroStampTitle: safeText(copy.heroStampTitle, 40),
      heroStampBottom: safeText(copy.heroStampBottom, 40), categoriesTitle: safeText(copy.categoriesTitle, 100),
      categoriesSubtitle: safeText(copy.categoriesSubtitle, 160), flashSaleTitle: safeText(copy.flashSaleTitle, 60),
      flashSaleSubtitle: safeText(copy.flashSaleSubtitle, 120), flashSaleBadge: safeText(copy.flashSaleBadge, 60),
      productButtonText: safeText(copy.productButtonText, 40), bannerButtonText: safeText(copy.bannerButtonText, 50)
    },
    sections: Object.fromEntries(SECTION_IDS.map(id => [id, sections[id] !== false])),
    sectionOrder,
    productOrder,
    responsive: {
      tablet: { layout: normalizeResponsiveLayout(raw.responsive?.tablet?.layout) },
      mobile: { layout: normalizeResponsiveLayout(raw.responsive?.mobile?.layout) }
    }
  };
}

const FONT_STACKS = {
  manrope: "'Manrope', 'Noto Sans Georgian', sans-serif",
  georgia: "Georgia, 'Noto Serif Georgian', serif",
  arial: "Arial, 'Noto Sans Georgian', sans-serif"
};

export function buildStorefrontVisualStyle(rawDesign, requestedViewport) {
  const design = normalizeStorefrontVisualDesign(rawDesign);
  const viewport = ['desktop', 'tablet', 'mobile'].includes(requestedViewport)
    ? requestedViewport
    : (typeof window !== 'undefined' && window.innerWidth <= 767
      ? 'mobile'
      : typeof window !== 'undefined' && window.innerWidth <= 1023 ? 'tablet' : 'desktop');
  const responsiveLayout = viewport === 'desktop' ? {} : (design.responsive?.[viewport]?.layout || {});
  const layout = { ...design.layout, ...responsiveLayout };
  const theme = design.theme;
  const typography = design.typography;
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
    '--gs-heading-font-family': FONT_STACKS[typography.headingFontFamily],
    '--gs-base-font-size': String(typography.baseFontSize) + 'px',
    '--gs-heading-scale': String(typography.headingScale),
    '--gs-content-width': String(layout.contentWidth) + 'px',
    '--gs-section-gap': String(layout.sectionGap) + 'px',
    '--gs-hero-height': String(layout.heroHeight) + 'px',
    '--gs-category-card-height': String(layout.categoryCardHeight) + 'px',
    '--gs-category-columns': String(layout.categoryColumns),
    '--gs-product-columns': String(layout.productColumns),
    '--gs-hero-content-width': String(layout.heroContentWidth) + '%',
    '--gs-banner-height': String(layout.bannerHeight) + 'px',
    '--gs-product-image-ratio': String(layout.productImageRatio),
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


export function buildStorefrontElementStyle(rawDesign, elementId) {
  if (!ELEMENT_STYLE_IDS.includes(elementId)) return {};
  const raw = isPlainObject(rawDesign) ? rawDesign : {};
  const rawElementStyles = isPlainObject(raw.elementStyles) ? raw.elementStyles : {};
  const value = isPlainObject(rawElementStyles[elementId]) ? rawElementStyles[elementId] : {};
  const style = {};
  const textColor = safeColor(value.textColor, '');
  const backgroundColor = safeColor(value.backgroundColor, '');
  const borderColor = safeColor(value.borderColor, '');
  if (textColor) style.color = textColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (borderColor) style.borderColor = borderColor;
  const borderWidth = clamp(value.borderWidth, 0, 12, null);
  const lineHeight = clamp(value.lineHeight, 0.8, 2.5, null);
  const letterSpacing = clamp(value.letterSpacing, -2, 12, null);
  if (borderWidth !== null) style.borderWidth = String(borderWidth) + 'px';
  if (lineHeight !== null) style.lineHeight = String(lineHeight);
  if (letterSpacing !== null) style.letterSpacing = String(letterSpacing) + 'px';
  if (['none', 'uppercase', 'lowercase', 'capitalize'].includes(value.textTransform)) style.textTransform = value.textTransform;
  const fontStacks = { inherit: 'inherit', manrope: FONT_STACKS.manrope, georgia: FONT_STACKS.georgia, arial: FONT_STACKS.arial };
  if (fontStacks[value.fontFamily]) style.fontFamily = fontStacks[value.fontFamily];
  const shadows = { none: 'none', soft: '0 2px 10px rgba(0,0,0,.12)', medium: '0 8px 24px rgba(0,0,0,.2)', strong: '0 16px 40px rgba(0,0,0,.32)' };
  if (shadows[value.boxShadow]) style.boxShadow = shadows[value.boxShadow];
  const fontSize = clamp(value.fontSize, 10, 64, null);
  const padding = clamp(value.padding, 0, 48, null);
  const borderRadius = clamp(value.borderRadius, 0, 32, null);
  if (fontSize !== null) style.fontSize = String(fontSize) + 'px';
  if (padding !== null) style.padding = String(padding) + 'px';
  if (borderRadius !== null) style.borderRadius = String(borderRadius) + 'px';
  if (['left', 'center', 'right'].includes(value.textAlign)) style.textAlign = value.textAlign;
  const fontWeight = value.fontWeight == null ? null : Number(value.fontWeight);
  if ([400, 500, 600, 700, 800, 900].includes(fontWeight)) style.fontWeight = fontWeight;
  if (value.width !== null && Number.isFinite(Number(value.width))) style.width = String(Math.min(100, Math.max(10, Number(value.width)))) + '%';
  if (value.minHeight !== null && Number.isFinite(Number(value.minHeight))) style.minHeight = String(Math.min(600, Math.max(0, Number(value.minHeight)))) + 'px';
  if (value.opacity !== null && Number.isFinite(Number(value.opacity))) style.opacity = String(Math.min(100, Math.max(0, Number(value.opacity))) / 100);
  if (['cover', 'contain', 'fill'].includes(value.objectFit)) style.objectFit = value.objectFit;
  if (value.objectPositionX !== null && Number.isFinite(Number(value.objectPositionX))) style.objectPosition = String(Math.min(100, Math.max(0, Number(value.objectPositionX)))) + '% center';
  return style;
}
