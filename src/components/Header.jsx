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
  categories = [],
  selectedCategory = 'ყველა',
  setSelectedCategory,
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
          aria-label={menuToggleLabel}
          aria-expanded={menuOpen}
          aria-controls="geostore-main-menu"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {activeTab === 'store' && (
        <div className="gs-header-search-row" role="search">
          <label className="gs-header-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={searchQuery || ''}
              onChange={(event) => setSearchQuery?.(event.target.value)}
              placeholder={t.searchPlaceholder || 'მოძებნე პროდუქტი'}
              aria-label={t.searchPlaceholder || 'მოძებნე პროდუქტი'}
            />
          </label>
          <button
            type="button"
            className="gs-header-image-search"
            onClick={() => runAction(setIsImageSearchOpen)}
            aria-label={currentLang === 'en' ? 'Search by photo' : currentLang === 'ru' ? 'Поиск по фото' : 'პროდუქტის ფოტოთი ძიება'}
            title={currentLang === 'en' ? 'Search by photo' : currentLang === 'ru' ? 'Поиск по фото' : 'პროდუქტის ფოტოთი ძიება'}
          >
            <Camera aria-hidden="true" />
          </button>
        </div>
      )}

      {menuOpen && (
        <nav id="geostore-main-menu" className="gs-main-menu" aria-label={mainNavigationLabel}>
          <div className="gs-menu-heading">
            <div className="gs-menu-brand">
              <strong>GEOSTORE</strong>
              <span>{currentUser ? (currentUser.name || currentUser.email || t.profile) : mainMenuLabel}</span>
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


          <section className="gs-menu-section" aria-label={storeAccountLabel}>
            <p className="gs-menu-section-title">{storeAccountLabel}</p>
            <button type="button" className={linkClass('store')} onClick={() => goTo('store')}>
              <Store aria-hidden="true" /><span>{storeLabel}</span>
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
                <ShieldCheck aria-hidden="true" /><span>{adminLabel}</span>
              </button>
            )}
          </section>

          <section className="gs-menu-section gs-menu-categories" aria-label={categoryLabel}>
            <p className="gs-menu-section-title">{categoryLabel}</p>
            <button
              type="button"
              className={'gs-menu-link gs-menu-category-link' + (selectedCategory === 'ყველა' ? ' is-active' : '')}
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
                  className={'gs-menu-link gs-menu-category-link' + (selectedCategory === name ? ' is-active' : '')}
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

          <section className="gs-menu-section" aria-label={servicesLabel}>
            <p className="gs-menu-section-title">{servicesLabel}</p>
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
                <Download aria-hidden="true" /><span>{installLabel}</span>
              </button>
            )}
          </section>

          <div className="gs-menu-footer">
            <span><Globe aria-hidden="true" /> {languageLabel}</span>
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
