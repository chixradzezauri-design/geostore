import {normalizeAdminPanelVisualDesign} from './adminPanelVisualDesign.js';
import {applyAdminProfessionalDesign} from './adminProfessionalDesign.js';

// Studio: a complete display projection, independent of historic per-device paint.
// Do not persist it merely because a user visits the admin.
export const ADMIN_STUDIO_PALETTE=Object.freeze({
 canvas:'#f2f3f6',panel:'#ffffff',surface:'#e9ebf0',text:'#182338',muted:'#555b6b',
 border:'#d9dce4',accent:'#5042a6',nav:'#23242b',navText:'#e8e9ef',
 active:'#5042a6',activeText:'#ffffff',inputBorder:'#737887'
});
const p=ADMIN_STUDIO_PALETTE;
export function resolveAdminStudioAppearance(raw){
 const saved=normalizeAdminPanelVisualDesign(raw);
 const baseline=applyAdminProfessionalDesign({});
 const theme={...baseline.theme,accent:p.accent,canvas:p.canvas,panel:p.panel,surface:p.surface,text:p.text,muted:p.muted,border:p.border,
  navActiveBackground:p.active,navActiveText:p.activeText,navInactiveBackground:p.nav,navInactiveText:p.navText,
  headerBackground:p.canvas,headerBorder:p.border,tableHeaderBackground:p.surface,tableHeaderText:p.muted,tableRowBackground:p.panel,tableRowHover:'#efedf8',
  filterBackground:p.panel,filterText:p.text,filterBorder:p.inputBorder,
  primaryButtonBackground:p.accent,primaryButtonText:'#ffffff',primaryButtonBorder:p.accent,
  inputBackground:p.panel,inputText:p.text,inputPlaceholder:p.muted,inputBorder:p.inputBorder,inputFocus:p.accent,
  contentCardBackground:p.panel,contentCardBorder:p.border,cardTitleText:p.text,cardMutedText:p.muted,cardShadowColor:'#c7cad4',cardHoverBorder:p.accent,
  modalBackground:p.panel,modalText:p.text,modalBorder:p.border,modalOverlayBackground:'#182338',
  ...Object.fromEntries(['staff','inventory','analytics','orders','support','discounts','banners','categories','coupons'].flatMap(k=>[[k+'SectionBackground',p.panel],[k+'SectionBorder',p.border]]))
 };
 const layout={...baseline.layout,titleFontSize:24,sidebarWidth:248,sectionGap:20,cardRadius:8,cardPadding:16,cardShadowBlur:0,headerRadius:8,headerPadding:14,navItemRadius:6,navItemPaddingY:9,buttonRadius:6,inputRadius:6,modalRadius:10};
 const components=Object.fromEntries(Object.entries(baseline.components).map(([k,v])=>[k,{...v,radius:10,padding:16,shadowBlur:0,backgroundColor:p.panel,borderColor:p.border,textColor:p.text}]));
 const elementStyles=Object.fromEntries(Object.entries(baseline.elementStyles).map(([k,v])=>[k,{...v,backgroundColor:p.panel,borderColor:p.border,textColor:p.text,borderRadius:8}]));
 return normalizeAdminPanelVisualDesign({...saved,theme,layout,components,elementStyles,responsive:{tablet:{},mobile:{}}});
}
