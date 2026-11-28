import {normalizeAdminPanelVisualDesign} from './adminPanelVisualDesign.js';
import {applyAdminProfessionalDesign} from './adminProfessionalDesign.js';

// Studio: a complete display projection, independent of historic per-device paint.
// Do not persist it merely because a user visits the admin.
export const ADMIN_STUDIO_PALETTE=Object.freeze({
 canvas:'#f6f5f1',panel:'#ffffff',surface:'#efefea',text:'#182338',muted:'#52605c',
 border:'#d6dcd6',accent:'#155e55',nav:'#ffffff',navText:'#3d4c47',
 active:'#dceee9',activeText:'#14594a',inputBorder:'#788780'
});
const p=ADMIN_STUDIO_PALETTE;
export function resolveAdminStudioAppearance(raw){
 const saved=normalizeAdminPanelVisualDesign(raw);
 const baseline=applyAdminProfessionalDesign({});
 const theme={...baseline.theme,accent:p.accent,canvas:p.canvas,panel:p.panel,surface:p.surface,text:p.text,muted:p.muted,border:p.border,
  navActiveBackground:p.active,navActiveText:p.activeText,navInactiveBackground:p.nav,navInactiveText:p.navText,
  headerBackground:p.canvas,headerBorder:p.border,tableHeaderBackground:p.surface,tableHeaderText:p.muted,tableRowBackground:p.panel,tableRowHover:p.active,
  filterBackground:p.panel,filterText:p.text,filterBorder:p.inputBorder,
  primaryButtonBackground:p.accent,primaryButtonText:'#ffffff',primaryButtonBorder:p.accent,
  inputBackground:p.panel,inputText:p.text,inputPlaceholder:p.muted,inputBorder:p.inputBorder,inputFocus:p.accent,
  contentCardBackground:p.panel,contentCardBorder:p.border,cardTitleText:p.text,cardMutedText:p.muted,cardShadowColor:'#cad2cb',cardHoverBorder:p.accent,
  modalBackground:p.panel,modalText:p.text,modalBorder:p.border,modalOverlayBackground:'#182338',
  ...Object.fromEntries(['staff','inventory','analytics','orders','support','discounts','banners','categories','coupons'].flatMap(k=>[[k+'SectionBackground',p.panel],[k+'SectionBorder',p.border]]))
 };
 const layout={...baseline.layout,titleFontSize:24,sidebarWidth:248,sectionGap:16,cardRadius:10,cardPadding:16,cardShadowBlur:0,headerRadius:8,headerPadding:14,navItemRadius:6,navItemPaddingY:9,buttonRadius:7,inputRadius:7,modalRadius:12};
 const components=Object.fromEntries(Object.entries(baseline.components).map(([k,v])=>[k,{...v,radius:10,padding:16,shadowBlur:0,backgroundColor:p.panel,borderColor:p.border,textColor:p.text}]));
 const elementStyles=Object.fromEntries(Object.entries(baseline.elementStyles).map(([k,v])=>[k,{...v,backgroundColor:p.panel,borderColor:p.border,textColor:p.text,borderRadius:8}]));
 return normalizeAdminPanelVisualDesign({...saved,theme,layout,components,elementStyles,responsive:{tablet:{},mobile:{}}});
}
