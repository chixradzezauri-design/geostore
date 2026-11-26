import {DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,normalizeAdminPanelVisualDesign} from './adminPanelVisualDesign.js';

// Atelier workspace: aubergine navigation, porcelain surfaces and amethyst actions.
// Existing persisted design schema; no new storage or automatic migration.
export const ADMIN_PRO_PALETTE=Object.freeze({
 canvas:'#f5f2f8',panel:'#ffffff',surface:'#f0ecf5',text:'#252238',muted:'#62576f',border:'#ded8e7',accent:'#694183',nav:'#262139',navText:'#e8e1ef'
});
const p=ADMIN_PRO_PALETTE;
const theme=Object.freeze({
 accent:p.accent,canvas:p.canvas,panel:p.panel,surface:p.surface,text:p.text,muted:p.muted,border:p.border,
 navActiveBackground:p.accent,navActiveText:'#ffffff',navInactiveBackground:p.nav,navInactiveText:p.navText,
 headerBackground:p.panel,headerBorder:p.border,tableHeaderBackground:p.canvas,tableHeaderText:p.muted,tableRowBackground:p.panel,tableRowHover:'#eee8f4',
 filterBackground:p.panel,filterText:p.text,filterBorder:'#81738d',primaryButtonBackground:p.accent,primaryButtonText:'#ffffff',primaryButtonBorder:p.accent,
 inputBackground:p.panel,inputText:p.text,inputPlaceholder:p.muted,inputBorder:'#81738d',inputFocus:p.accent,contentCardBackground:p.panel,contentCardBorder:p.border,
 cardTitleText:p.text,cardMutedText:p.muted,cardShadowColor:'#a99bb6',cardHoverBorder:p.accent,modalBackground:p.panel,modalText:p.text,modalBorder:p.border,modalOverlayBackground:p.nav,
 ...Object.fromEntries(['staff','inventory','analytics','orders','support','discounts','banners','categories','coupons'].flatMap(k=>[[k+'SectionBackground',p.panel],[k+'SectionBorder',p.border]]))
});
const layout=Object.freeze({fontFamily:'system',fontSize:13,titleFontSize:22,bodyFontSize:14,headingFontWeight:700,bodyFontWeight:400,buttonFontSize:13,buttonFontWeight:600,navItemFontSize:13,navItemFontWeight:600,cardRadius:12,cardPadding:16,sidebarWidth:256,buttonRadius:8,navItemRadius:8,navItemPaddingY:10,sectionGap:18,headerRadius:12,headerPadding:16,tableCellPadding:12,tableCellPaddingY:8,tableHeaderFontSize:12,tableHeaderFontWeight:700,tableRowFontSize:13,tableRowMinHeight:44,filterControlHeight:44,filterGap:8,inputFontSize:14,inputFontWeight:400,inputRadius:8,inputHeight:44,inputFocusRingWidth:2,cardBorderWidth:1,cardShadowBlur:4,modalRadius:16,modalPadding:20,modalOverlayOpacity:65});
const component=Object.freeze({radius:12,padding:16,shadowBlur:4,fontSize:14,titleFontSize:16,textColor:p.text,backgroundColor:p.panel,borderColor:p.border});
const element=Object.freeze({fontSize:13,textColor:p.text,backgroundColor:p.panel,borderColor:p.border,borderRadius:10,padding:12});
// Match legacy defaults field by field. A previously customized field is not
// rewritten. Explicit responsive overrides remain independent of desktop.
const changeDefaults=(rows,defaults,patch)=>Object.fromEntries(Object.entries(rows).map(([key,value])=>[key,{
 ...value,...Object.fromEntries(Object.entries(patch).filter(([field])=>value[field]===defaults[key]?.[field]))
}]));
export function applyAdminProfessionalDesign(raw){
 const current=normalizeAdminPanelVisualDesign(raw);
 const defaults=normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
 return normalizeAdminPanelVisualDesign({...current,theme:{...current.theme,...theme},layout:{...current.layout,...layout},
  components:changeDefaults(current.components,defaults.components,component),
  elementStyles:changeDefaults(current.elementStyles,defaults.elementStyles,element)
 });
}

// Resolve the original, uncustomized workspace to the professional appearance.
// This is a display projection, not a migration or a cloud/local-storage write.
// An explicitly customized theme or density remains exactly as saved.
export function resolveAdminWorkspaceAppearance(raw){
 const current=normalizeAdminPanelVisualDesign(raw);
 const legacy=normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
 const sameFields=(a,b)=>Object.keys(b).every(k=>a[k]===b[k]);
 const hasResponsiveAppearance=['tablet','mobile'].some(v=>
  Object.keys(current.responsive[v].theme).length || Object.keys(current.responsive[v].layout).length
 );
 if(hasResponsiveAppearance || !sameFields(current.theme,legacy.theme) || !sameFields(current.layout,legacy.layout))return current;
 return applyAdminProfessionalDesign(current);
}
