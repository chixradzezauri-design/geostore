import React from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { translations } from '../utils/translations';
import { buildStorefrontElementStyle } from '../utils/storefrontVisualDesign.js';

export default function StorefrontFooter({
  siteSettings,
  visualDesign = siteSettings?.visualDesign,
  activeTab,
  setActiveTab,
  setIsTermsOpen,
  setIsWarrantyOpen,
  currentLang = 'ka'
}) {
  const t = translations[currentLang] || translations.ka;
  const styleFor = id => buildStorefrontElementStyle(visualDesign, id);

  return (
    <footer data-visual-editor-target="footer" style={styleFor('footer')} className="geostore-site-footer w-full mt-6 py-6 text-center space-y-3">
      <div data-visual-editor-target="footer.links" style={styleFor('footer.links')} className="geostore-footer-links flex flex-wrap justify-center items-center gap-4 px-2 text-slate-400 font-bold">
        <button type="button" data-visual-editor-target="footer.termsLink" style={styleFor('footer.termsLink')} onClick={() => setIsTermsOpen?.(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
          <FileText className="w-4 h-4" />
          {siteSettings?.footerTermsText || t.terms}
        </button>
        <span aria-hidden="true">•</span>
        <button type="button" data-visual-editor-target="footer.privacyLink" style={styleFor('footer.privacyLink')} onClick={() => setActiveTab?.('privacy')} aria-current={activeTab === 'privacy' ? 'page' : undefined} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
          <ShieldCheck className="w-4 h-4" />
          {siteSettings?.footerPrivacyText || t.privacy}
        </button>
        <span aria-hidden="true">•</span>
        <button type="button" data-visual-editor-target="footer.warrantyLink" style={styleFor('footer.warrantyLink')} onClick={() => setIsWarrantyOpen?.(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
          <ShieldCheck className="w-4 h-4" />
          {siteSettings?.footerWarrantyText || t.warranty}
        </button>
      </div>
      <p data-visual-editor-target="footer.copyright" style={styleFor('footer.copyright')}>{siteSettings?.footerCopyrightText || `© 2026 GEOSTORE. ${t.allRightsReserved}`}</p>
    </footer>
  );
}
