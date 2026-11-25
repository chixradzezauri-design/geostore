import { normalizeFlashCampaignTheme, normalizeFlashCampaignLayout, normalizeFlashCampaignBanner, normalizeFlashTimerStyle, normalizeFlashTimerMotion, FLASH_PRODUCT_APPEARANCE, normalizeFlashProductAppearance } from './flashCampaignThemes.js';
const SECTION_IDS = ['hero', 'banners', 'flashSale', 'categories', 'filters', 'products'];
const validSectionOrder = value => Array.isArray(value)&&value.length===SECTION_IDS.length&&new Set(value).size===SECTION_IDS.length&&value.every(id=>SECTION_IDS.includes(id));
export function getStorefrontSectionOrder(raw,viewport='desktop'){
 const base=Array.isArray(raw?.sectionOrder)?[...new Set(raw.sectionOrder.filter(id=>SECTION_IDS.includes(id)))]:[];
 const inherited=[...base,...SECTION_IDS.filter(id=>!base.includes(id))];
 const override=['tablet','mobile'].includes(viewport)?raw?.responsive?.[viewport]?.sectionOrder:null;
 return validSectionOrder(override)?[...override]:inherited;
}
export function setStorefrontSectionOrder(raw,viewport,order){
 if(!['desktop','tablet','mobile'].includes(viewport)||!validSectionOrder(order))return null;
 const d=normalizeStorefrontVisualDesign(raw);
 return normalizeStorefrontVisualDesign(viewport==='desktop'?{...d,sectionOrder:order}:{...d,responsive:{...d.responsive,[viewport]:{...d.responsive[viewport],sectionOrder:order}}});
}
// Explicit editor action: move only the offer group, preserving every other section.
export function moveFlashSaleAfterHero(raw){
 const d=normalizeStorefrontVisualDesign(raw);
 const move=order=>{
   const next=order.filter(id=>id!=='flashSale');
   next.splice(next.indexOf('hero')+1,0,'flashSale');
   return next;
 };
 const responsive={...d.responsive};
 for(const viewport of ['tablet','mobile']){
   if(validSectionOrder(responsive[viewport]?.sectionOrder)){
     responsive[viewport]={...responsive[viewport],sectionOrder:move(responsive[viewport].sectionOrder)};
   }
 }
 return normalizeStorefrontVisualDesign({...d,sectionOrder:move(d.sectionOrder),responsive});
}
export function inheritStorefrontSectionOrder(raw,viewport){
 if(!['tablet','mobile'].includes(viewport))return null;
 const d=normalizeStorefrontVisualDesign(raw),next={...d.responsive[viewport]};
 delete next.sectionOrder;
 return normalizeStorefrontVisualDesign({...d,responsive:{...d.responsive,[viewport]:next}});
}
export function storefrontViewportForWidth(width){
 return width<=640?'mobile':width<=1023?'tablet':'desktop';
}
const ELEMENT_STYLE_IDS = [
  'hero', 'hero.image', 'hero.title', 'hero.description', 'hero.button',
  'banner', 'banner.card', 'banner.image', 'banner.title', 'banner.description', 'banner.button',
  'flashSale', 'flashSale.title', 'flashSale.badge', 'flashSale.description',
  'flashSale.card', 'flashSale.image', 'flashSale.timer', 'flashSale.discount', 'flashSale.button',
  'categories', 'categories.title', 'categories.description', 'category.card', 'category.title', 'category.description',
  'filters', 'filters.priceLabel', 'filters.input', 'filters.clearButton', 'filters.sortLabel', 'filters.sortSelect', 'product.card', 'product.image', 'product.title', 'product.button',
  'product.detail.image', 'product.detail.title', 'product.detail.price',
  'product.detail.description', 'product.detail.variants', 'product.detail.purchase',
  'header', 'header.announcement', 'header.announcement.text', 'header.brand', 'header.logo',
  'header.storeName', 'header.caption', 'header.menu.toggle', 'header.search', 'header.search.input',
  'header.search.button', 'header.menu', 'header.menu.heading', 'header.menu.section',
  'header.menu.sectionTitle', 'header.menu.link', 'header.menu.footer', 'header.menu.languageButton',
  'footer', 'footer.links', 'footer.link', 'footer.termsLink', 'footer.privacyLink', 'footer.warrantyLink', 'footer.copyright'
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
  productOrder: [],
  customSections: [],
  stylePresets: []
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

const normalizeReusableElementStyle = source => {
  const value = isPlainObject(source) ? source : {};
  return {
    textColor: safeColor(value.textColor, ''),
    backgroundColor: safeColor(value.backgroundColor, ''),
    borderColor: safeColor(value.borderColor, ''),
    borderWidth: clamp(value.borderWidth, 0, 12, null),
    lineHeight: clamp(value.lineHeight, 0.8, 2.5, null),
    letterSpacing: clamp(value.letterSpacing, -2, 12, null),
    textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'].includes(value.textTransform) ? value.textTransform : '',
    textDecoration: ['none', 'underline', 'line-through'].includes(value.textDecoration) ? value.textDecoration : '',
    fontStyle: ['normal', 'italic'].includes(value.fontStyle) ? value.fontStyle : '',
    fontFamily: ['inherit', 'manrope', 'georgia', 'arial'].includes(value.fontFamily) ? value.fontFamily : '',
    boxShadow: ['none', 'soft', 'medium', 'strong'].includes(value.boxShadow) ? value.boxShadow : '',
    fontSize: clamp(value.fontSize, 10, 64, null),
    padding: clamp(value.padding, 0, 48, null),
    paddingX: clamp(value.paddingX, 0, 64, null),
    paddingY: clamp(value.paddingY, 0, 64, null),
    marginTop: clamp(value.marginTop, 0, 120, null),
    marginBottom: clamp(value.marginBottom, 0, 120, null),
    minWidth: clamp(value.minWidth, 0, 800, null),
    maxWidth: clamp(value.maxWidth, 0, 1200, null),
    borderRadius: clamp(value.borderRadius, 0, 32, null),
    textAlign: ['left', 'center', 'right'].includes(value.textAlign) ? value.textAlign : '',
    fontWeight: [400, 500, 600, 700, 800, 900].includes(Number(value.fontWeight)) ? Number(value.fontWeight) : null,
    width: clamp(value.width, 10, 100, null),
    minHeight: clamp(value.minHeight, 0, 600, null),
    opacity: clamp(value.opacity, 0, 100, null),
    objectFit: ['cover', 'contain', 'fill'].includes(value.objectFit) ? value.objectFit : '',
    objectPositionX: clamp(value.objectPositionX, 0, 100, null),
    objectPositionY: clamp(value.objectPositionY, 0, 100, null)
  };
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


const safeLinkUrl = value => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048 || raw.startsWith('//')) return '';
  if (raw.startsWith('/')) return raw;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
};

const safeVideoUrl = value => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    const segments = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (host === 'youtu.be') id = segments[0] || '';
    else if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = url.searchParams.get('v') || ((segments[0] === 'embed' || segments[0] === 'shorts') ? segments[1] : '') || '';
    } else if (host === 'vimeo.com') {
      id = segments[segments.length - 1] || '';
      if (id.length >= 6 && id.length <= 12 && Array.from(id).every(ch => ch >= '0' && ch <= '9')) return 'https://player.vimeo.com/video/' + id;
      return '';
    } else return '';
    const validId = id.length === 11 && Array.from(id).every(ch => /^[a-zA-Z0-9_-]$/.test(ch));
    return validId ? 'https://www.youtube-nocookie.com/embed/' + id : '';
  } catch { return ''; }
};

export function normalizeStorefrontCustomSections(rawSections) {
  if (!Array.isArray(rawSections)) return [];
  return rawSections.slice(0, 12).map((rawSection, sectionIndex) => {
    if (!isPlainObject(rawSection)) return null;
    const sectionId = String(rawSection.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'custom-section-' + sectionIndex;
    const rawBlocks = Array.isArray(rawSection.blocks) ? rawSection.blocks : [];
    const blocks = rawBlocks.slice(0, 10).map((rawBlock, blockIndex) => {
      if (!isPlainObject(rawBlock)) return null;
      const type = ['heading', 'text', 'image', 'button', 'video', 'spacer'].includes(rawBlock.type) ? rawBlock.type : 'text';
      const blockId = String(rawBlock.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || sectionId + '-block-' + blockIndex;
      return {
        id: blockId, type,
        text: String(rawBlock.text ?? '').slice(0, type === 'heading' ? 120 : 600),
        imageUrl: type === 'image' ? safeImageUrl(rawBlock.imageUrl) : '',
        videoUrl: type === 'video' ? safeVideoUrl(rawBlock.videoUrl) : '',
        alt: String(rawBlock.alt ?? '').slice(0, 160),
        label: String(rawBlock.label ?? '').slice(0, 60),
        url: type === 'button' ? safeLinkUrl(rawBlock.url) : ''
      };
    }).filter(Boolean);
    const normalizeSectionStyle = source => {
      const value = isPlainObject(source) ? source : {};
      const style = {};
      const backgroundColor = safeColor(value.backgroundColor, '');
      const textColor = safeColor(value.textColor, '');
      if (backgroundColor) style.backgroundColor = backgroundColor;
      if (textColor) style.textColor = textColor;
      if (['left', 'center', 'right'].includes(value.align)) style.align = value.align;
      const numeric = {
        padding: [0, 80], maxWidth: [280, 1600], marginTop: [0, 160],
        marginBottom: [0, 160], borderRadius: [0, 48], minHeight: [0, 800]
      };
      Object.entries(numeric).forEach(([key, bounds]) => {
        const number = clamp(value[key], bounds[0], bounds[1], null);
        if (number !== null) style[key] = number;
      });
      return style;
    };
    const baseStyle = normalizeSectionStyle(rawSection);
    const responsiveSource = isPlainObject(rawSection.responsive) ? rawSection.responsive : {};
    const responsive = Object.fromEntries(['tablet', 'mobile'].map(viewport => [
      viewport, normalizeSectionStyle(responsiveSource[viewport])
    ]));
    return {
      id: sectionId, title: String(rawSection.title ?? '').slice(0, 100),
      visible: rawSection.visible !== false,
      placement: ['after-hero', 'after-banners', 'after-flash-sale', 'after-categories', 'after-filters', 'after-products'].includes(rawSection.placement) ? rawSection.placement : 'after-products',
      backgroundColor: baseStyle.backgroundColor || '#ffffff',
      textColor: baseStyle.textColor || '#29241f',
      padding: baseStyle.padding ?? 24,
      align: baseStyle.align || 'left',
      maxWidth: baseStyle.maxWidth ?? 1440,
      marginTop: baseStyle.marginTop ?? 0,
      marginBottom: baseStyle.marginBottom ?? 0,
      borderRadius: baseStyle.borderRadius ?? 16,
      minHeight: baseStyle.minHeight ?? 0,
      responsive,
      blocks
    };
  }).filter(Boolean);
};

const normalizeResponsiveLayout = rawLayout => {
  const layout = isPlainObject(rawLayout) ? rawLayout : {};
  const fields = {
    contentWidth: [960, 1600], sectionGap: [16, 72], heroHeight: [320, 680],
    categoryCardHeight: [110, 260], categoryColumns: [2, 6], productColumns: [2, 6],
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
    ...(raw.signature2026 === true ? { signature2026: true } : {}),
    ...(normalizeFlashCampaignTheme(raw.flashCampaignTheme) !== 'inherit' ? { flashCampaignTheme: normalizeFlashCampaignTheme(raw.flashCampaignTheme) } : {}),
    ...(normalizeFlashCampaignLayout(raw.flashCampaignLayout) !== 'inherit' ? { flashCampaignLayout: normalizeFlashCampaignLayout(raw.flashCampaignLayout) } : {}),
    ...(normalizeFlashCampaignBanner(raw.flashCampaignBanner) ? { flashCampaignBanner: normalizeFlashCampaignBanner(raw.flashCampaignBanner) } : {}),
    ...(normalizeFlashTimerStyle(raw.flashTimerStyle)!=='inherit'?{flashTimerStyle:normalizeFlashTimerStyle(raw.flashTimerStyle)}:{}),
    ...(normalizeFlashTimerMotion(raw.flashTimerMotion)!=='none'?{flashTimerMotion:normalizeFlashTimerMotion(raw.flashTimerMotion)}:{}),
    ...Object.fromEntries(FLASH_PRODUCT_APPEARANCE.map(({key})=>[key,normalizeFlashProductAppearance(key,raw[key])]).filter(([,value])=>value!=='inherit')),
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
      productColumns: Math.round(clamp(layout.productColumns, 2, 6, defaults.layout.productColumns)),
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
        textDecoration: ['none', 'underline', 'line-through'].includes(value.textDecoration) ? value.textDecoration : '',
        fontStyle: ['normal', 'italic'].includes(value.fontStyle) ? value.fontStyle : '',
        fontFamily: ['inherit', 'manrope', 'georgia', 'arial'].includes(value.fontFamily) ? value.fontFamily : '',
        boxShadow: ['none', 'soft', 'medium', 'strong'].includes(value.boxShadow) ? value.boxShadow : '',
        fontSize: clamp(value.fontSize, 10, 64, null),
        padding: clamp(value.padding, 0, 48, null),
        paddingX: clamp(value.paddingX, 0, 64, null),
        paddingY: clamp(value.paddingY, 0, 64, null),
        marginTop: clamp(value.marginTop, 0, 120, null),
        marginBottom: clamp(value.marginBottom, 0, 120, null),
        minWidth: clamp(value.minWidth, 0, 800, null),
        maxWidth: clamp(value.maxWidth, 0, 1200, null),
        borderRadius: clamp(value.borderRadius, 0, 32, null),
        textAlign: ['left', 'center', 'right'].includes(value.textAlign) ? value.textAlign : '',
        fontWeight: [400, 500, 600, 700, 800, 900].includes(Number(value.fontWeight)) ? Number(value.fontWeight) : null,
        width: clamp(value.width, 10, 100, null),
        minHeight: clamp(value.minHeight, 0, 600, null),
        opacity: clamp(value.opacity, 0, 100, null),
        objectFit: ['cover', 'contain', 'fill'].includes(value.objectFit) ? value.objectFit : '',
        objectPositionX: clamp(value.objectPositionX, 0, 100, null),
        objectPositionY: clamp(value.objectPositionY, 0, 100, null)
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
    sectionGeometry: normalizeSectionGeometry(raw.sectionGeometry),
    productOrder,
    customSections: normalizeStorefrontCustomSections(raw.customSections),
    designTemplates: normalizeStorefrontDesignTemplates(raw.designTemplates),
    stylePresets: (Array.isArray(raw.stylePresets) ? raw.stylePresets : []).slice(0, 20).map((preset, index) => {
      if (!isPlainObject(preset)) return null;
      const id = String(preset.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'style-preset-' + index;
      const name = String(preset.name ?? '').trim().slice(0, 40);
      const style = normalizeReusableElementStyle(preset.style);
      const hasStyle = Object.values(style).some(value => value !== '' && value !== null);
      return name && hasStyle ? { id, name, style } : null;
    }).filter(Boolean),
    responsive: Object.fromEntries(['tablet', 'mobile'].map(viewport => {
      const responsive = isPlainObject(raw.responsive?.[viewport]) ? raw.responsive[viewport] : {};
      const responsiveTheme = isPlainObject(responsive.theme) ? responsive.theme : {};
      const responsiveTypography = isPlainObject(responsive.typography) ? responsive.typography : {};
      const responsiveStyles = isPlainObject(responsive.elementStyles) ? responsive.elementStyles : {};
      return [viewport, {
        layout: normalizeResponsiveLayout(responsive.layout),
        ...(validSectionOrder(responsive.sectionOrder)?{sectionOrder:[...responsive.sectionOrder]}:{}),
        sectionGeometry: normalizeSectionGeometry(responsive.sectionGeometry),
        theme: Object.fromEntries(Object.keys(defaults.theme).map(key => [key,
          responsiveTheme[key] == null ? '' : safeColor(responsiveTheme[key], '')
        ]).filter(([, value]) => value)),
        typography: Object.fromEntries([
          ['fontFamily', ['manrope', 'georgia', 'arial'].includes(responsiveTypography.fontFamily) ? responsiveTypography.fontFamily : ''],
          ['headingFontFamily', ['manrope', 'georgia', 'arial'].includes(responsiveTypography.headingFontFamily) ? responsiveTypography.headingFontFamily : ''],
          ['baseFontSize', clamp(responsiveTypography.baseFontSize, 12, 18, null)],
          ['headingScale', clamp(responsiveTypography.headingScale, 0.8, 1.25, null)]
        ].filter(([, value]) => value !== '' && value !== null)),
        elementStyles: Object.fromEntries(ELEMENT_STYLE_IDS.map(id => {
          const value = isPlainObject(responsiveStyles[id]) ? responsiveStyles[id] : {};
          const normalized = {};
          const textColor = safeColor(value.textColor, '');
          const backgroundColor = safeColor(value.backgroundColor, '');
          const borderColor = safeColor(value.borderColor, '');
          if (textColor) normalized.textColor = textColor;
          if (backgroundColor) normalized.backgroundColor = backgroundColor;
          if (borderColor) normalized.borderColor = borderColor;
          const numeric = {
            borderWidth: [0, 12], lineHeight: [0.8, 2.5], letterSpacing: [-2, 12],
            fontSize: [10, 64], padding: [0, 48], paddingX: [0, 64], paddingY: [0, 64],
            marginTop: [0, 120], marginBottom: [0, 120], minWidth: [0, 800], maxWidth: [0, 1200],
            borderRadius: [0, 32], width: [10, 100], minHeight: [0, 600], opacity: [0, 100], objectPositionX: [0, 100], objectPositionY: [0, 100]
          };
          Object.entries(numeric).forEach(([key, bounds]) => {
            const valueNumber = clamp(value[key], bounds[0], bounds[1], null);
            if (valueNumber !== null) normalized[key] = valueNumber;
          });
          if (['none', 'uppercase', 'lowercase', 'capitalize'].includes(value.textTransform)) normalized.textTransform = value.textTransform;
          if (['none', 'underline', 'line-through'].includes(value.textDecoration)) normalized.textDecoration = value.textDecoration;
          if (['normal', 'italic'].includes(value.fontStyle)) normalized.fontStyle = value.fontStyle;
          if (['inherit', 'manrope', 'georgia', 'arial'].includes(value.fontFamily)) normalized.fontFamily = value.fontFamily;
          if (['none', 'soft', 'medium', 'strong'].includes(value.boxShadow)) normalized.boxShadow = value.boxShadow;
          if (['left', 'center', 'right'].includes(value.textAlign)) normalized.textAlign = value.textAlign;
          if ([400, 500, 600, 700, 800, 900].includes(Number(value.fontWeight))) normalized.fontWeight = Number(value.fontWeight);
          if (['cover', 'contain', 'fill'].includes(value.objectFit)) normalized.objectFit = value.objectFit;
          return [id, normalized];
        }))
      }];
    }))
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
    : (typeof window !== 'undefined' && window.innerWidth <= 640
      ? 'mobile'
      : typeof window !== 'undefined' && window.innerWidth <= 1023 ? 'tablet' : 'desktop');
  const responsive = viewport === 'desktop' ? {} : (design.responsive?.[viewport] || {});
  const layout = { ...design.layout, ...(responsive.layout || {}) };
  const theme = { ...design.theme, ...(responsive.theme || {}) };
  const typography = { ...design.typography, ...(responsive.typography || {}) };
  const elementStyles = responsive.elementStyles || {};
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
  getStorefrontSectionOrder(design,viewport).forEach((id, index) => {
    style['--gs-order-' + id] = String(index + 1);
  });
  return style;
}


export function buildStorefrontElementStyle(rawDesign, elementId, requestedViewport) {
  if (!ELEMENT_STYLE_IDS.includes(elementId)) return {};
  const raw = isPlainObject(rawDesign) ? rawDesign : {};
  const rawElementStyles = isPlainObject(raw.elementStyles) ? raw.elementStyles : {};
  const baseValue = isPlainObject(rawElementStyles[elementId]) ? rawElementStyles[elementId] : {};
  const viewport = ['desktop', 'tablet', 'mobile'].includes(requestedViewport)
    ? requestedViewport
    : (typeof window !== 'undefined' && window.innerWidth <= 640
      ? 'mobile'
      : typeof window !== 'undefined' && window.innerWidth <= 1023 ? 'tablet' : 'desktop');
  const responsiveValue = viewport === 'desktop' ? {} : (raw.responsive?.[viewport]?.elementStyles?.[elementId] || {});
  const value = { ...baseValue, ...responsiveValue };
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
  if (['none', 'underline', 'line-through'].includes(value.textDecoration)) style.textDecoration = value.textDecoration;
  if (['normal', 'italic'].includes(value.fontStyle)) style.fontStyle = value.fontStyle;
  const fontStacks = { inherit: 'inherit', manrope: FONT_STACKS.manrope, georgia: FONT_STACKS.georgia, arial: FONT_STACKS.arial };
  if (fontStacks[value.fontFamily]) style.fontFamily = fontStacks[value.fontFamily];
  const shadows = { none: 'none', soft: '0 2px 10px rgba(0,0,0,.12)', medium: '0 8px 24px rgba(0,0,0,.2)', strong: '0 16px 40px rgba(0,0,0,.32)' };
  if (shadows[value.boxShadow]) style.boxShadow = shadows[value.boxShadow];
  const fontSize = clamp(value.fontSize, 10, 64, null);
  const padding = clamp(value.padding, 0, 48, null);
  const borderRadius = clamp(value.borderRadius, 0, 32, null);
  if (fontSize !== null) style.fontSize = String(fontSize) + 'px';
  if (padding !== null) style.padding = String(padding) + 'px';
  const paddingX = clamp(value.paddingX, 0, 64, null);
  const paddingY = clamp(value.paddingY, 0, 64, null);
  const marginTop = clamp(value.marginTop, 0, 120, null);
  const marginBottom = clamp(value.marginBottom, 0, 120, null);
  const minWidth = clamp(value.minWidth, 0, 800, null);
  const maxWidth = clamp(value.maxWidth, 0, 1200, null);
  if (paddingX !== null) { style.paddingLeft = String(paddingX) + 'px'; style.paddingRight = String(paddingX) + 'px'; }
  if (paddingY !== null) { style.paddingTop = String(paddingY) + 'px'; style.paddingBottom = String(paddingY) + 'px'; }
  if (marginTop !== null) style.marginTop = String(marginTop) + 'px';
  if (marginBottom !== null) style.marginBottom = String(marginBottom) + 'px';
  if (minWidth !== null) style.minWidth = String(minWidth) + 'px';
  if (maxWidth !== null && maxWidth > 0) style.maxWidth = String(maxWidth) + 'px';
  if (borderRadius !== null) style.borderRadius = String(borderRadius) + 'px';
  if (['left', 'center', 'right'].includes(value.textAlign)) style.textAlign = value.textAlign;
  const fontWeight = value.fontWeight == null ? null : Number(value.fontWeight);
  if ([400, 500, 600, 700, 800, 900].includes(fontWeight)) style.fontWeight = fontWeight;
  if (value.width !== null && Number.isFinite(Number(value.width))) style.width = String(Math.min(100, Math.max(10, Number(value.width)))) + '%';
  if (value.minHeight !== null && Number.isFinite(Number(value.minHeight))) style.minHeight = String(Math.min(600, Math.max(0, Number(value.minHeight)))) + 'px';
  if (value.opacity !== null && Number.isFinite(Number(value.opacity))) style.opacity = String(Math.min(100, Math.max(0, Number(value.opacity))) / 100);
  if (['cover', 'contain', 'fill'].includes(value.objectFit)) style.objectFit = value.objectFit;
  const objectPositionX = value.objectPositionX !== null && Number.isFinite(Number(value.objectPositionX)) ? Math.min(100, Math.max(0, Number(value.objectPositionX))) : null;
  const objectPositionY = value.objectPositionY !== null && Number.isFinite(Number(value.objectPositionY)) ? Math.min(100, Math.max(0, Number(value.objectPositionY))) : null;
  if (objectPositionX !== null && objectPositionY !== null) style.objectPosition = String(objectPositionX) + '% ' + String(objectPositionY) + '%';
  else if (objectPositionX !== null) style.objectPosition = String(objectPositionX) + '% center';
  else if (objectPositionY !== null) style.objectPosition = 'center ' + String(objectPositionY) + '%';
  return style;
}

/** Preserve sanitized, explicitly edited element values in the video design layer.
 * A separate helper keeps the original editor style API and persisted schema unchanged. */
export function withStorefrontVideoTokens(style, elementId) {
  const result = { ...style };
  const key = elementId.replaceAll('.', '-');
  for (const property of ['color','backgroundColor','borderColor','borderWidth','borderRadius','padding','paddingTop','paddingBottom','paddingLeft','paddingRight','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','textAlign','textTransform','textDecoration','fontStyle','boxShadow','marginTop','marginBottom','objectFit','objectPosition','opacity']) {
    if (style[property] == null) continue;
    result[`--gs-video-${key}-${property}`] = style[property];
    result[`--gs-video-explicit-${property}`] = String(style[property]);
  }
  return result;
}

export const STOREFRONT_DESIGN_TEMPLATE_LIMIT=5;
const templateIdValid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const templateNameValid=v=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=40&&!/[\u0000-\u001f\u007f-\u009f]/.test(v);
function storefrontTemplateSnapshot(d){
 return {theme:{...d.theme},typography:{...d.typography},layout:{...d.layout},responsive:Object.fromEntries(['tablet','mobile'].map(v=>[v,{theme:{...d.responsive[v].theme},typography:{...d.responsive[v].typography},layout:{...d.responsive[v].layout}}]))};
}
function normalizeStorefrontDesignTemplates(raw){
 if(!Array.isArray(raw))return [];
 const ids=new Set(),out=[];
 for(const entry of raw.slice(0,STOREFRONT_DESIGN_TEMPLATE_LIMIT)){
  const s=entry?.snapshot;
  if(!templateIdValid(entry?.id)||ids.has(entry.id)||!templateNameValid(entry.name)||!isPlainObject(s?.theme)||!isPlainObject(s?.typography)||!isPlainObject(s?.layout)||!isPlainObject(s?.responsive))continue;
  // Project only presentation tokens before normalization; no nested libraries,
  // content, images, private business data, product ordering or visibility.
  const safe=normalizeStorefrontVisualDesign({theme:s.theme,typography:s.typography,layout:s.layout,responsive:Object.fromEntries(['tablet','mobile'].map(v=>[v,{theme:s.responsive[v]?.theme,typography:s.responsive[v]?.typography,layout:s.responsive[v]?.layout}]))});
  ids.add(entry.id);out.push({id:entry.id,name:entry.name,snapshot:storefrontTemplateSnapshot(safe)});
 }
 return out;
}
export function saveStorefrontDesignTemplate(raw,{id,name}={}){
 const d=normalizeStorefrontVisualDesign(raw);
 if(!templateIdValid(id)||!templateNameValid(name)||d.designTemplates.length>=STOREFRONT_DESIGN_TEMPLATE_LIMIT||d.designTemplates.some(t=>t.id===id||t.name.toLowerCase()===name.toLowerCase()))return null;
 return normalizeStorefrontVisualDesign({...d,designTemplates:[...d.designTemplates,{id,name,snapshot:storefrontTemplateSnapshot(d)}]});
}
export function applyStorefrontDesignTemplate(raw,id,scope='all'){
 const d=normalizeStorefrontVisualDesign(raw),t=d.designTemplates.find(x=>x.id===id);
 if(!t||!['all','theme','typography','layout'].includes(scope))return null;
 const keys=['theme','typography','layout'].filter(k=>scope==='all'||scope===k);
 const s=t.snapshot;
 return normalizeStorefrontVisualDesign({...d,...Object.fromEntries(keys.map(k=>[k,s[k]])),responsive:Object.fromEntries(['tablet','mobile'].map(v=>[v,{...d.responsive[v],...Object.fromEntries(keys.map(k=>[k,s.responsive[v][k]]))}]))});
}
export function renameStorefrontDesignTemplate(raw,id,name){
 const d=normalizeStorefrontVisualDesign(raw);
 if(!templateNameValid(name)||!d.designTemplates.some(t=>t.id===id)||d.designTemplates.some(t=>t.id!==id&&t.name.toLowerCase()===name.toLowerCase()))return null;
 return normalizeStorefrontVisualDesign({...d,designTemplates:d.designTemplates.map(t=>t.id===id?{...t,name}:t)});
}
export function deleteStorefrontDesignTemplate(raw,id){
 const d=normalizeStorefrontVisualDesign(raw);
 return normalizeStorefrontVisualDesign({...d,designTemplates:d.designTemplates.filter(t=>t.id!==id)});
}

const SECTION_GEOMETRY_LIMITS={marginTop:[0,72],maxWidth:[85,100]};
function normalizeSectionGeometry(raw){
 const result={};
 if(!isPlainObject(raw))return result;
 for(const id of SECTION_IDS){
  const value=raw[id];if(!isPlainObject(value))continue;
  const safe={};
  for(const [key,[min,max]] of Object.entries(SECTION_GEOMETRY_LIMITS)){
   const n=value[key];
   if(typeof n==='number'&&Number.isFinite(n))safe[key]=Math.round(Math.max(min,Math.min(max,n)));
  }
  if(Object.keys(safe).length)result[id]=safe;
 }
 return result;
}
export function getStorefrontSectionGeometry(raw,id,viewport='desktop'){
 if(!SECTION_IDS.includes(id))return {};
 const base=normalizeSectionGeometry(raw?.sectionGeometry)[id]||{};
 const override=['tablet','mobile'].includes(viewport)?normalizeSectionGeometry(raw?.responsive?.[viewport]?.sectionGeometry)[id]||{}:{};
 return {...base,...override};
}
export function setStorefrontSectionGeometry(raw,id,viewport,key,value){
 if(!SECTION_IDS.includes(id)||!['desktop','tablet','mobile'].includes(viewport)||!Object.hasOwn(SECTION_GEOMETRY_LIMITS,key))return null;
 const [min,max]=SECTION_GEOMETRY_LIMITS[key];
 if(value!==null&&(!Number.isInteger(value)||value<min||value>max))return null;
 const d=normalizeStorefrontVisualDesign(raw);
 const geometry={...(viewport==='desktop'?d.sectionGeometry:d.responsive[viewport].sectionGeometry)};
 const row={...geometry[id]};if(value===null)delete row[key];else row[key]=value;
 if(Object.keys(row).length)geometry[id]=row;else delete geometry[id];
 return normalizeStorefrontVisualDesign(viewport==='desktop'?{...d,sectionGeometry:geometry}:{...d,responsive:{...d.responsive,[viewport]:{...d.responsive[viewport],sectionGeometry:geometry}}});
}
export function buildStorefrontSectionGeometryProps(raw,id,viewport,{secondary=false}={}){
 const g=getStorefrontSectionGeometry(raw,id,viewport),style={};
 if(g.marginTop!==undefined&&!secondary)style['--gs-section-margin-top']=g.marginTop+'px';
 if(g.maxWidth!==undefined)style['--gs-section-max-width']=g.maxWidth+'%';
 return {style,...(Object.hasOwn(style,'--gs-section-margin-top')?{'data-gs-section-margin':'true'}:{}),...(Object.hasOwn(style,'--gs-section-max-width')?{'data-gs-section-width':'true'}:{})};
}
