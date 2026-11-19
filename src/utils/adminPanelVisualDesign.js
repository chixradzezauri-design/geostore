export const ADMIN_PANEL_VISUAL_STORAGE_KEY = 'geostore_admin_visual_design_v1';

export const DEFAULT_ADMIN_PANEL_VISUAL_DESIGN = Object.freeze({
  version: 1,
  theme: {
    accent: '#34d399',
    canvas: '#020617',
    panel: '#0f172a',
    surface: '#020617',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: '#334155',
    navActiveBackground: '#34d399',
    navActiveText: '#020617',
    navInactiveBackground: '#020617',
    navInactiveText: '#94a3b8',
    headerBackground: '#0f172a',
    headerBorder: '#334155',
    tableHeaderBackground: '#020617',
    tableHeaderText: '#94a3b8',
    inputBackground: '#020617',
    inputText: '#f8fafc',
    inputBorder: '#334155',
    inputFocus: '#34d399',
    contentCardBackground: '#0f172a',
    contentCardBorder: '#334155',
    modalBackground: '#0d0d10',
    modalText: '#f8fafc',
    modalBorder: '#334155',
    modalOverlayBackground: '#020617',
    staffSectionBackground: '#0f172a',
    staffSectionBorder: '#334155',
    inventorySectionBackground: '#0f172a',
    inventorySectionBorder: '#334155',
    analyticsSectionBackground: '#0f172a',
    analyticsSectionBorder: '#334155',
    ordersSectionBackground: '#0f172a',
    ordersSectionBorder: '#334155',
    supportSectionBackground: '#0f172a',
    supportSectionBorder: '#334155',
    discountsSectionBackground: '#0f172a',
    discountsSectionBorder: '#334155',
    bannersSectionBackground: '#0f172a',
    bannersSectionBorder: '#334155',
    categoriesSectionBackground: '#0f172a',
    categoriesSectionBorder: '#334155',
    couponsSectionBackground: '#0f172a',
    couponsSectionBorder: '#334155'
  },
  layout: {
    fontSize: 13,
    cardRadius: 24,
    cardPadding: 20,
    sidebarWidth: 288,
    buttonRadius: 14,
    navItemRadius: 16,
    navItemPaddingY: 12,
    sectionGap: 24,
    headerRadius: 32,
    headerPadding: 24,
    tableCellPadding: 12,
    inputRadius: 12,
    inputHeight: 44,
    cardBorderWidth: 1,
    cardShadowBlur: 24,
    modalRadius: 28,
    modalPadding: 24,
    modalOverlayOpacity: 82
  },
  responsive: {
    tablet: { theme: {}, layout: {} },
    mobile: { theme: {}, layout: {} }
  }
});

const THEME_KEYS = Object.keys(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme);
const LAYOUT_LIMITS = {
  fontSize: [11, 16],
  cardRadius: [10, 36],
  cardPadding: [12, 32],
  sidebarWidth: [240, 360],
  buttonRadius: [0, 28],
  navItemRadius: [0, 28],
  navItemPaddingY: [6, 20],
  sectionGap: [12, 48],
  headerRadius: [10, 40],
  headerPadding: [12, 32],
  tableCellPadding: [6, 20],
  inputRadius: [0, 20],
  inputHeight: [36, 52],
  cardBorderWidth: [0, 3],
  cardShadowBlur: [0, 36],
  modalRadius: [12, 40],
  modalPadding: [12, 36],
  modalOverlayOpacity: [40, 95]
};

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeColor = (value, fallback) => {
  const color = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
};

const clampNumber = (value, [min, max], fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const normalizeTheme = (source, fallback) => Object.fromEntries(
  THEME_KEYS.map(key => [key, safeColor(source?.[key], fallback[key])])
);

const normalizeLayout = (source, fallback) => Object.fromEntries(
  Object.entries(LAYOUT_LIMITS).map(([key, limits]) => [
    key,
    clampNumber(source?.[key], limits, fallback[key])
  ])
);

export function normalizeAdminPanelVisualDesign(rawDesign) {
  const raw = isObject(rawDesign) ? rawDesign : {};
  const theme = normalizeTheme(raw.theme, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme);
  const layout = normalizeLayout(raw.layout, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.layout);
  const responsive = {};

  for (const viewport of ['tablet', 'mobile']) {
    const source = isObject(raw.responsive?.[viewport]) ? raw.responsive[viewport] : {};
    const responsiveTheme = isObject(source.theme) ? source.theme : {};
    const responsiveLayout = isObject(source.layout) ? source.layout : {};
    responsive[viewport] = {
      theme: Object.fromEntries(THEME_KEYS
        .filter(key => responsiveTheme[key] != null && responsiveTheme[key] !== '')
        .map(key => [key, safeColor(responsiveTheme[key], theme[key])])),
      layout: Object.fromEntries(Object.entries(LAYOUT_LIMITS)
        .filter(([key]) => responsiveLayout[key] != null && responsiveLayout[key] !== '')
        .map(([key, limits]) => [key, clampNumber(responsiveLayout[key], limits, layout[key])]))
    };
  }

  return { version: 1, theme, layout, responsive };
}

const effectiveViewport = (design, viewport) => ({
  theme: { ...design.theme, ...(design.responsive?.[viewport]?.theme || {}) },
  layout: { ...design.layout, ...(design.responsive?.[viewport]?.layout || {}) }
});

export function buildAdminPanelVisualStyle(rawDesign) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);
  const desktop = effectiveViewport(design, 'desktop');
  const tablet = effectiveViewport(design, 'tablet');
  const mobile = effectiveViewport(design, 'mobile');
  const style = {};

  for (const [prefix, values] of [['', desktop], ['tablet-', tablet], ['mobile-', mobile]]) {
    for (const [key, value] of Object.entries(values.theme)) {
      style[`--admin-vd-${prefix}${key}`] = value;
    }
    for (const [key, value] of Object.entries(values.layout)) {
      style[`--admin-vd-${prefix}${key}`] = key === 'modalOverlayOpacity' ? `${value}%` : `${value}px`;
    }
  }

  return style;
}

export function loadAdminPanelVisualDesign(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
    const saved = target.getItem(ADMIN_PANEL_VISUAL_STORAGE_KEY);
    return normalizeAdminPanelVisualDesign(saved ? JSON.parse(saved) : DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
  } catch {
    return normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
  }
}

export function saveAdminPanelVisualDesign(rawDesign, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return false;
    target.setItem(ADMIN_PANEL_VISUAL_STORAGE_KEY, JSON.stringify(normalizeAdminPanelVisualDesign(rawDesign)));
    return true;
  } catch {
    return false;
  }
}
