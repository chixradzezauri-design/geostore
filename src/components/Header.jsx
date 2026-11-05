// src/components/Header.jsx - Unified, compact and responsive GEOSTORE navigation
import React, { useEffect, useRef, useState } from 'react';
import {
  ShoppingBag, Heart, Search, Store, Bot, Menu, X, User, Camera,
  Sparkles, Scale, PackageCheck, Bell, Shirt, Globe, MessageCircle,
  FileText, ShieldCheck, Download
} from 'lucide-react';
import { translations } from '../utils/translations';

export default function Header({
  siteSettings,
  setActiveTab,
  activeTab,
  wishlistCount = 0,
  cartCount = 0,
  comparisonCount = 0,
  currentUser,
  adminLoggedIn = false,
  setIsAuthOpen,
  setAuthMode,
  setIsAiAssistantOpen,
  setIsImageSearchOpen,
  setIsComparisonOpen,
  setIsTrackerOpen,
  setIsNotificationsOpen,
  setSupportOpen,
  setIsTermsOpen,
  setIsWarrantyOpen,
  unreadNotificationsCount = 0,
  searchQuery = '',
  setSearchQuery,
  handleInstallClick,
  currentLang = 'ka',
  setCurrLang
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const t = translations[currentLang] || translations.ka;

  const closeMenu = () => setMenuOpen(false);
  const goTo = (tab) => {
    if (typeof setActiveTab === 'function') setActiveTab(tab);
    closeMenu();
  };
  const openAuth = (mode) => {
    if (typeof setAuthMode === 'function') setAuthMode(mode);
    if (typeof setIsAuthOpen === 'function') setIsAuthOpen(true);
    closeMenu();
  };
  const runAction = (action) => {
    if (typeof action === 'function') action(true);
    closeMenu();
  };
  const handleLangChange = (lang) => {
    if (typeof setCurrLang === 'function') {
      setCurrLang(lang);
      try { localStorage.setItem('geostore_lang', lang); } catch {}
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) closeMenu();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const linkClass = (tab) =>
    `gs-menu-link${activeTab === tab ? ' is-active' : ''}`;

  return (
    <header ref={headerRef} className={`gs-site-header${menuOpen ? ' is-menu-open' : ''}`}>
      <div className="gs-site-announcement">
        <Sparkles aria-hidden="true" />
        <span>{siteSettings?.topBarText || t.topBarText}</span>
      </div>

      <div className="gs-site-header-inner">
        <button
          type="button"
          className="gs-brand-button"
          onClick={() => goTo('store')}
          aria-label={siteSettings?.storeName || t.storeName}
        >
          <span className="gs-brand-lockup">
            <span className="gs-brand-monogram" aria-hidden="true">G</span>
            <span className="gs-brand-wordmark">
              <span className="gs-brand-name">{siteSettings?.storeName || t.storeName}</span>
              <span className="gs-brand-caption">CURATED FOR YOU</span>
            </span>
          </span>
        </button>

        <button
          type="button"
          className="gs-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'მენიუს დახურვა' : 'მთავარი მენიუს გახსნა'}
          aria-expanded={menuOpen}
          aria-controls="geostore-main-menu"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="geostore-main-menu" className="gs-main-menu" aria-label="მთავარი ნავიგაცია">
          <div className="gs-menu-heading">
            <div className="gs-menu-brand">
              <strong>GEOSTORE</strong>
              <span>{currentUser ? (currentUser.name || currentUser.email || t.profile) : 'მთავარი მენიუ'}</span>
            </div>
            {currentUser ? (
              <button type="button" className="gs-menu-account" onClick={() => goTo('profile')}>
                <User aria-hidden="true" />
                <span>{t.profile || 'პროფილი'}</span>
              </button>
            ) : (
              <div className="gs-menu-auth">
                <button type="button" className="gs-menu-login" onClick={() => openAuth('login')}>
                  {t.login || 'შესვლა'}
                </button>
                <button type="button" className="gs-menu-register" onClick={() => openAuth('register')}>
                  {t.register || 'რეგისტრაცია'}
                </button>
              </div>
            )}
          </div>

          <div className="gs-menu-search-row">
            <label className="gs-menu-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={searchQuery || ''}
                onChange={(event) => setSearchQuery?.(event.target.value)}
                placeholder={t.searchPlaceholder || 'მოძებნე პროდუქტი'}
              />
            </label>
            <button
              type="button"
              className="gs-menu-icon-action"
              onClick={() => runAction(setIsImageSearchOpen)}
              aria-label="პროდუქტის ფოტოთი ძიება"
              title="პროდუქტის ფოტოთი ძიება"
            >
              <Camera aria-hidden="true" />
            </button>
          </div>

          <section className="gs-menu-section" aria-label="მაღაზია და ანგარიში">
            <p className="gs-menu-section-title">მაღაზია და ანგარიში</p>
            <button type="button" className={linkClass('store')} onClick={() => goTo('store')}>
              <Store aria-hidden="true" /><span>მაღაზია</span>
            </button>
            <button type="button" className={linkClass('cart')} onClick={() => goTo('cart')}>
              <ShoppingBag aria-hidden="true" /><span>{t.cart || 'კალათა'}</span>
              <span className="gs-menu-count">{cartCount}</span>
            </button>
            <button type="button" className={linkClass('wishlist')} onClick={() => goTo('wishlist')}>
              <Heart aria-hidden="true" /><span>{t.wishlist || 'ფავორიტები'}</span>
              <span className="gs-menu-count">{wishlistCount}</span>
            </button>
            {currentUser && (
              <button type="button" className={linkClass('profile')} onClick={() => goTo('profile')}>
                <User aria-hidden="true" /><span>{t.profile || 'პროფილი'}</span>
              </button>
            )}
            {adminLoggedIn && (
              <button type="button" className={linkClass('admin')} onClick={() => goTo('admin')}>
                <ShieldCheck aria-hidden="true" /><span>ადმინისტრირება</span>
              </button>
            )}
          </section>

          <section className="gs-menu-section" aria-label="სერვისები">
            <p className="gs-menu-section-title">სერვისები</p>
            <button type="button" className="gs-menu-link" onClick={() => runAction(setIsTrackerOpen)}>
              <PackageCheck aria-hidden="true" /><span>{t.orderTracker || 'შეკვეთის მოძებნა'}</span>
            </button>
            <button type="button" className="gs-menu-link" onClick={() => runAction(setIsNotificationsOpen)}>
              <Bell aria-hidden="true" /><span>{t.notifications || 'შეტყობინებები'}</span>
              {unreadNotificationsCount > 0 && <span className="gs-menu-count is-highlight">{unreadNotificationsCount}</span>}
            </button>
            <button type="button" className="gs-menu-link" onClick={() => runAction(setIsComparisonOpen)}>
              <Scale aria-hidden="true" /><span>{t.comparison || 'შედარება'}</span>
              <span className="gs-menu-count">{comparisonCount}</span>
            </button>
            <button type="button" className="gs-menu-link" onClick={() => runAction(setIsAiAssistantOpen)}>
              <Bot aria-hidden="true" /><span>{t.aiAssistant || 'AI ასისტენტი'}</span>
            </button>
            <button type="button" className="gs-menu-link" onClick={() => goTo('wardrobe')}>
              <Shirt aria-hidden="true" /><span>{t.wardrobe || 'ჩემი გარდერობი'}</span>
            </button>
            {typeof setSupportOpen === 'function' && (
              <button type="button" className="gs-menu-link" onClick={() => runAction(setSupportOpen)}>
                <MessageCircle aria-hidden="true" /><span>{t.supportChat || 'კონსულტაცია / ჩათი'}</span>
              </button>
            )}
            {typeof setIsTermsOpen === 'function' && (
              <button type="button" className="gs-menu-link" onClick={() => runAction(setIsTermsOpen)}>
                <FileText aria-hidden="true" /><span>{t.terms || 'წესები და პირობები'}</span>
              </button>
            )}
            {typeof setIsWarrantyOpen === 'function' && (
              <button type="button" className="gs-menu-link" onClick={() => runAction(setIsWarrantyOpen)}>
                <ShieldCheck aria-hidden="true" /><span>{t.warranty || 'საგარანტიო წესები'}</span>
              </button>
            )}
            {typeof handleInstallClick === 'function' && (
              <button type="button" className="gs-menu-link" onClick={() => { handleInstallClick(); closeMenu(); }}>
                <Download aria-hidden="true" /><span>აპის დაყენება</span>
              </button>
            )}
          </section>

          <div className="gs-menu-footer">
            <span><Globe aria-hidden="true" /> ენა / Language</span>
            <div className="gs-menu-languages">
              {['ka', 'en', 'ru'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangChange(lang)}
                  className={currentLang === lang ? 'is-selected' : ''}
                  aria-pressed={currentLang === lang}
                >
                  {lang === 'ka' ? 'GEO' : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
