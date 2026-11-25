// src/components/Header.jsx - Unified, compact and responsive GEOSTORE navigation
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ShoppingBag, Heart, Search, Store, Bot, Menu, X, User, Camera,
  Sparkles, Scale, PackageCheck, Bell, Shirt, Globe, MessageCircle,
  FileText, ShieldCheck, Download, Home, LayoutGrid
} from 'lucide-react';
import { translations } from '../utils/translations';
import { buildStorefrontElementStyle, withStorefrontVideoTokens } from '../utils/storefrontVisualDesign.js';

export function SignatureMobileNav({currentLang='ka',activeTab='store',menuOpen=false,wishlistCount=0,onHome,onCategories,onWishlist,onProfile}) {
  const labels = ({
    ka: ['მთავარი','კატეგორიები','ფავორიტები','პროფილი','მობილური ნავიგაცია'],
    en: ['Home','Categories','Wishlist','Profile','Mobile navigation'],
    ru: ['Главная','Категории','Избранное','Профиль','Мобильная навигация']
  })[currentLang] || ['მთავარი','კატეგორიები','ფავორიტები','პროფილი','მობილური ნავიგაცია'];
  return <nav className="gs-signature-mobile-nav" aria-label={labels[4]}>
    <button type="button" onClick={onHome} aria-current={activeTab==='store'&&!menuOpen?'page':undefined}><Home aria-hidden="true"/><span>{labels[0]}</span></button>
    <button type="button" onClick={onCategories} aria-expanded={menuOpen}><LayoutGrid aria-hidden="true"/><span>{labels[1]}</span></button>
    <button type="button" onClick={onWishlist} aria-current={activeTab==='wishlist'?'page':undefined} aria-label={wishlistCount>0?labels[2]+' ('+wishlistCount+')':labels[2]}><Heart aria-hidden="true"/><span>{labels[2]}</span>{wishlistCount>0&&<small aria-hidden="true">{wishlistCount}</small>}</button>
    <button type="button" onClick={onProfile} aria-current={activeTab==='profile'?'page':undefined}><User aria-hidden="true"/><span>{labels[3]}</span></button>
  </nav>;
}

export default function Header({
  siteSettings,
  visualDesign = siteSettings?.visualDesign,
  visualEditorViewport = null,
  mobileNavBlocked = false,
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
  categories = [],
  selectedCategory = 'ყველა',
  setSelectedCategory,
  handleInstallClick,
  currentLang = 'ka',
  setCurrLang
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signature = visualDesign?.signature2026 === true && activeTab !== 'admin';
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();
  const headerRef = useRef(null);
  const menuToggleRef = useRef(null);
  const searchInputRef = useRef(null);
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
  const openProfile = () => currentUser ? goTo('profile') : openAuth('login');
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
      if (event.key === 'Escape') {
        closeMenu();
        // Return keyboard users to the control that opened the navigation.
        menuToggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (signature && searchOpen && activeTab === 'store') searchInputRef.current?.focus();
  }, [signature, searchOpen, activeTab]);

  const linkClass = (tab) =>
    `gs-menu-link${activeTab === tab ? ' is-active' : ''}`;
  const mainCategories = (categories || []).filter((category) => !category?.parentId);
  const categoryLabel = currentLang === 'en' ? 'Categories' : currentLang === 'ru' ? 'Категории' : 'კატეგორიები';
  const allCategoriesLabel = currentLang === 'en' ? 'All products' : currentLang === 'ru' ? 'Все товары' : 'ყველა პროდუქტი';
  const mainMenuLabel = currentLang === 'en' ? 'Main menu' : currentLang === 'ru' ? 'Главное меню' : 'მთავარი მენიუ';
  const storeAccountLabel = currentLang === 'en' ? 'Store & account' : currentLang === 'ru' ? 'Магазин и аккаунт' : 'მაღაზია და ანგარიში';
  const storeLabel = currentLang === 'en' ? 'Store' : currentLang === 'ru' ? 'Магазин' : 'მაღაზია';
  const servicesLabel = currentLang === 'en' ? 'Services' : currentLang === 'ru' ? 'Сервисы' : 'სერვისები';
  const adminLabel = currentLang === 'en' ? 'Admin panel' : currentLang === 'ru' ? 'Панель администратора' : 'ადმინისტრირება';
  const installLabel = currentLang === 'en' ? 'Install app' : currentLang === 'ru' ? 'Установить приложение' : 'აპის დაყენება';
  const languageLabel = currentLang === 'en' ? 'Language' : currentLang === 'ru' ? 'Язык' : 'ენა';
  const menuToggleLabel = currentLang === 'en'
    ? (menuOpen ? 'Close main menu' : 'Open main menu')
    : currentLang === 'ru'
      ? (menuOpen ? 'Закрыть главное меню' : 'Открыть главное меню')
      : (menuOpen ? 'მენიუს დახურვა' : 'მთავარი მენიუს გახსნა');
  const mainNavigationLabel = currentLang === 'en'
    ? 'Main navigation'
    : currentLang === 'ru' ? 'Главная навигация' : 'მთავარი ნავიგაცია';
  const categoryName = (category) => typeof category === 'string' ? category : (category?.name || '');
  const visualStyle = targetId => withStorefrontVideoTokens(buildStorefrontElementStyle(visualDesign, targetId, visualEditorViewport), targetId);

  const searchVisible = !signature || searchOpen || Boolean(searchQuery);
  const searchLabel = currentLang === 'en' ? 'Search products' : currentLang === 'ru' ? 'Поиск товаров' : 'პროდუქტის ძებნა';
  const openSearch = () => {
    closeMenu();
    if (activeTab !== 'store') goTo('store');
    if (searchOpen && activeTab === 'store') { searchInputRef.current?.focus(); return; }
    setSearchOpen(true);
  };

  return (
    <header ref={headerRef} data-visual-editor-target="header" style={visualStyle('header')} className={`gs-site-header${signature ? ' gs-signature-header' : ''}${menuOpen ? ' is-menu-open' : ''}`}>
      <div data-visual-editor-target="header.announcement" style={visualStyle('header.announcement')} className="gs-site-announcement">
        <Sparkles aria-hidden="true" />
        <span data-visual-editor-target="header.announcement.text" style={visualStyle('header.announcement.text')}>{siteSettings?.topBarText || t.topBarText}</span>
      </div>

      <div className="gs-site-header-inner">
        <button
          type="button"
          data-visual-editor-target="header.brand" style={visualStyle('header.brand')} className="gs-brand-button"
          onClick={() => goTo('store')}
          aria-label={siteSettings?.storeName || t.storeName}
        >
          <span className="gs-brand-lockup">
            <span data-visual-editor-target="header.logo" style={visualStyle('header.logo')} className="gs-brand-monogram" aria-hidden="true">G</span>
            <span className="gs-brand-wordmark">
              <span data-visual-editor-target="header.storeName" style={visualStyle('header.storeName')} className="gs-brand-name">{siteSettings?.storeName || t.storeName}</span>
              <span data-visual-editor-target="header.caption" style={visualStyle('header.caption')} className="gs-brand-caption">{siteSettings?.headerCaptionText || 'CURATED FOR YOU'}</span>
            </span>
          </span>
        </button>

        {signature && (
          <nav className="gs-signature-category-nav" aria-label={categoryLabel}>
            {mainCategories.filter(category => categoryName(category)).slice(0, 4).map((category, index) => {
              const name = categoryName(category);
              return <button key={category?.id || name || index} type="button" aria-pressed={activeTab === 'store' && selectedCategory === name} onClick={() => { setSelectedCategory?.(name); goTo('store'); }}>{name}</button>;
            })}
            <button type="button" className="gs-signature-all" onClick={() => { setSelectedCategory?.('ყველა'); goTo('store'); }}>{allCategoriesLabel}</button>
          </nav>
        )}

        <button
          type="button"
          ref={menuToggleRef}
          data-visual-editor-target="header.menu.toggle" style={visualStyle('header.menu.toggle')} className="gs-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuToggleLabel}
          aria-expanded={menuOpen}
          aria-controls="geostore-main-menu"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        {signature && <div className="gs-signature-actions">
          <button type="button" aria-label={searchLabel} aria-expanded={activeTab === 'store' && searchVisible} aria-controls={activeTab === 'store' ? searchId : undefined} onClick={openSearch}><Search aria-hidden="true" /></button>
          <button type="button" aria-label={`${t.wishlist || 'ფავორიტები'} (${wishlistCount})`} onClick={() => goTo('wishlist')}><Heart aria-hidden="true" />{wishlistCount > 0 && <span aria-hidden="true">{wishlistCount}</span>}</button>
          <button type="button" aria-label={t.profile || 'პროფილი'} onClick={openProfile}><User aria-hidden="true" /></button>
          <button type="button" aria-label={`${t.cart || 'კალათა'} (${cartCount})`} onClick={() => goTo('cart')}><ShoppingBag aria-hidden="true" />{cartCount > 0 && <span aria-hidden="true">{cartCount}</span>}</button>
        </div>}
      </div>

      {activeTab === 'store' && (
        <div data-visual-editor-target="header.search" style={visualStyle('header.search')} className="gs-header-search-row" data-signature-search-closed={signature && !searchVisible ? 'true' : undefined} id={searchId} role="search">
          <label className="gs-header-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              ref={searchInputRef}
              data-visual-editor-target="header.search.input"
              style={visualStyle('header.search.input')}
              value={searchQuery || ''}
              onChange={(event) => setSearchQuery?.(event.target.value)}
              onFocus={() => { if (signature) setSearchOpen(true); }}
              placeholder={siteSettings?.headerSearchPlaceholder || t.searchPlaceholder || 'მოძებნე პროდუქტი'}
              aria-label={siteSettings?.headerSearchPlaceholder || t.searchPlaceholder || 'მოძებნე პროდუქტი'}
            />
          </label>
          {String(searchQuery || '').length > 0 && (
            <button
              type="button"
              className="gs-header-search-clear"
              onClick={() => { if (signature) setSearchOpen(true); setSearchQuery?.(''); searchInputRef.current?.focus(); }}
              aria-label={currentLang === 'en' ? 'Clear product search' : currentLang === 'ru' ? 'Очистить поиск товаров' : 'პროდუქტის ძებნის გასუფთავება'}
              title={currentLang === 'en' ? 'Clear search' : currentLang === 'ru' ? 'Очистить поиск' : 'ძებნის გასუფთავება'}
            ><X aria-hidden="true" /></button>
          )}
          {signature && <button type="button" className="gs-signature-search-dismiss" aria-label={currentLang === 'en' ? 'Close search' : currentLang === 'ru' ? 'Закрыть поиск' : 'ძებნის დახურვა'} onClick={() => { setSearchOpen(false); headerRef.current?.querySelector('.gs-signature-actions button')?.focus(); }} disabled={Boolean(searchQuery)}><X aria-hidden="true" /></button>}
          <button
            type="button"
            data-visual-editor-target="header.search.button" style={visualStyle('header.search.button')} className="gs-header-image-search"
            onClick={() => runAction(setIsImageSearchOpen)}
            aria-label={currentLang === 'en' ? 'Search by photo' : currentLang === 'ru' ? 'Поиск по фото' : 'პროდუქტის ფოტოთი ძიება'}
            title={currentLang === 'en' ? 'Search by photo' : currentLang === 'ru' ? 'Поиск по фото' : 'პროდუქტის ფოტოთი ძიება'}
          >
            <Camera aria-hidden="true" />
          </button>
        </div>
      )}

      {menuOpen && (
        <nav id="geostore-main-menu" data-visual-editor-target="header.menu" style={visualStyle('header.menu')} className="gs-main-menu" aria-label={mainNavigationLabel}>
          <div data-visual-editor-target="header.menu.heading" style={visualStyle('header.menu.heading')} className="gs-menu-heading">
            <div className="gs-menu-brand">
              <strong>{siteSettings?.storeName || t.storeName || 'GEOSTORE'}</strong>
              <span>{currentUser ? (currentUser.name || currentUser.email || t.profile) : mainMenuLabel}</span>
            </div>
            {currentUser ? (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-account" aria-current={activeTab === 'profile' ? 'page' : undefined} onClick={openProfile}>
                <User aria-hidden="true" />
                <span>{t.profile || 'პროფილი'}</span>
              </button>
            ) : (
              <div className="gs-menu-auth">
                <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-login" onClick={() => openAuth('login')}>
                  {t.login || 'შესვლა'}
                </button>
                <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-register" onClick={() => openAuth('register')}>
                  {t.register || 'რეგისტრაცია'}
                </button>
              </div>
            )}
          </div>


          <section data-visual-editor-target="header.menu.section" style={visualStyle('header.menu.section')} className="gs-menu-section gs-video-menu-primary" aria-label={storeAccountLabel}>
            <p data-visual-editor-target="header.menu.sectionTitle" style={visualStyle('header.menu.sectionTitle')} className="gs-menu-section-title">{storeAccountLabel}</p>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={linkClass('store')} onClick={() => goTo('store')}>
              <Store aria-hidden="true" /><span>{storeLabel}</span>
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={linkClass('cart')} onClick={() => goTo('cart')}>
              <ShoppingBag aria-hidden="true" /><span>{t.cart || 'კალათა'}</span>
              <span className="gs-menu-count">{cartCount}</span>
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={linkClass('wishlist')} onClick={() => goTo('wishlist')}>
              <Heart aria-hidden="true" /><span>{t.wishlist || 'ფავორიტები'}</span>
              <span className="gs-menu-count">{wishlistCount}</span>
            </button>
            {adminLoggedIn && (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={linkClass('admin')} onClick={() => goTo('admin')}>
                <ShieldCheck aria-hidden="true" /><span>{adminLabel}</span>
              </button>
            )}
          </section>

          <section data-visual-editor-target="header.menu.section" style={visualStyle('header.menu.section')} className="gs-menu-section gs-menu-categories" aria-label={categoryLabel}>
            <p data-visual-editor-target="header.menu.sectionTitle" style={visualStyle('header.menu.sectionTitle')} className="gs-menu-section-title">{categoryLabel}</p>
            <button
              type="button"
              data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={'gs-menu-link gs-menu-category-link' + (selectedCategory === 'ყველა' ? ' is-active' : '')}
              aria-pressed={selectedCategory === 'ყველა'}
              onClick={() => {
                if (typeof setSelectedCategory === 'function') setSelectedCategory('ყველა');
                goTo('store');
              }}
            >
              <Store aria-hidden="true" /><span>{allCategoriesLabel}</span>
            </button>
            {mainCategories.map((category, index) => {
              const name = categoryName(category);
              if (!name) return null;
              return (
                <button
                  key={category?.id || name || index}
                  type="button"
                  data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className={'gs-menu-link gs-menu-category-link' + (selectedCategory === name ? ' is-active' : '')}
                  aria-pressed={selectedCategory === name}
                  onClick={() => {
                    if (typeof setSelectedCategory === 'function') setSelectedCategory(name);
                    goTo('store');
                  }}
                >
                  <span className="gs-menu-category-dot" aria-hidden="true" />
                  <span>{name}</span>
                </button>
              );
            })}
          </section>

          <section data-visual-editor-target="header.menu.section" style={visualStyle('header.menu.section')} className="gs-menu-section gs-video-menu-services" aria-label={servicesLabel}>
            <p data-visual-editor-target="header.menu.sectionTitle" style={visualStyle('header.menu.sectionTitle')} className="gs-menu-section-title">{servicesLabel}</p>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsTrackerOpen)}>
              <PackageCheck aria-hidden="true" /><span>{t.orderTracker || 'შეკვეთის მოძებნა'}</span>
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsNotificationsOpen)}>
              <Bell aria-hidden="true" /><span>{t.notifications || 'შეტყობინებები'}</span>
              {unreadNotificationsCount > 0 && <span className="gs-menu-count is-highlight">{unreadNotificationsCount}</span>}
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsComparisonOpen)}>
              <Scale aria-hidden="true" /><span>{t.comparison || 'შედარება'}</span>
              <span className="gs-menu-count">{comparisonCount}</span>
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsAiAssistantOpen)}>
              <Bot aria-hidden="true" /><span>{t.aiAssistant || 'AI ასისტენტი'}</span>
            </button>
            <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => goTo('wardrobe')}>
              <Shirt aria-hidden="true" /><span>{t.wardrobe || 'ჩემი გარდერობი'}</span>
            </button>
            {typeof setSupportOpen === 'function' && (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setSupportOpen)}>
                <MessageCircle aria-hidden="true" /><span>{t.supportChat || 'კონსულტაცია / ჩათი'}</span>
              </button>
            )}
            {typeof setIsTermsOpen === 'function' && (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsTermsOpen)}>
                <FileText aria-hidden="true" /><span>{t.terms || 'წესები და პირობები'}</span>
              </button>
            )}
            {typeof setIsWarrantyOpen === 'function' && (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => runAction(setIsWarrantyOpen)}>
                <ShieldCheck aria-hidden="true" /><span>{t.warranty || 'საგარანტიო წესები'}</span>
              </button>
            )}
            {typeof handleInstallClick === 'function' && (
              <button type="button" data-visual-editor-target="header.menu.link" style={visualStyle('header.menu.link')} className="gs-menu-link" onClick={() => { handleInstallClick(); closeMenu(); }}>
                <Download aria-hidden="true" /><span>{installLabel}</span>
              </button>
            )}
          </section>

          <div data-visual-editor-target="header.menu.footer" style={visualStyle('header.menu.footer')} className="gs-menu-footer">
            <span><Globe aria-hidden="true" /> {languageLabel}</span>
            <div className="gs-menu-languages">
              {['ka', 'en', 'ru'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangChange(lang)}
                  data-visual-editor-target="header.menu.languageButton" style={visualStyle('header.menu.languageButton')} className={currentLang === lang ? 'is-selected' : ''}
                  aria-pressed={currentLang === lang}
                >
                  {lang === 'ka' ? 'GEO' : lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}
      {signature && !visualEditorViewport && !mobileNavBlocked && <SignatureMobileNav currentLang={currentLang} activeTab={activeTab} menuOpen={menuOpen} wishlistCount={wishlistCount}
        onHome={() => { setSelectedCategory?.('ყველა'); goTo('store'); headerRef.current?.scrollIntoView({block:'start',behavior:'instant'}); }}
        onCategories={() => { if(activeTab !== 'store') goTo('store'); setMenuOpen(open => activeTab !== 'store' || !open); headerRef.current?.scrollIntoView({block:'start',behavior:'instant'}); menuToggleRef.current?.focus({preventScroll:true}); }}
        onWishlist={() => goTo('wishlist')} onProfile={openProfile}/>} 
    </header>
  );
}
