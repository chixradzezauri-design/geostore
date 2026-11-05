// src/components/Header.jsx - Unified responsive navigation
import React, { useState } from 'react';
import {
  ShoppingBag, Heart, Search, Store, Bot, Menu, X, User, Camera,
  Sparkles, Scale, PackageCheck, Bell, Shirt, Globe
} from 'lucide-react';
import { translations } from '../utils/translations';

export default function Header({
  siteSettings,
  setActiveTab,
  activeTab,
  wishlistCount,
  cartCount,
  comparisonCount = 0,
  currentUser,
  setIsAuthOpen,
  setAuthMode,
  setIsAiAssistantOpen,
  setIsImageSearchOpen,
  setIsComparisonOpen,
  setIsTrackerOpen,
  setIsNotificationsOpen,
  unreadNotificationsCount = 0,
  searchQuery,
  setSearchQuery,
  currentLang = 'ka',
  setCurrLang
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = translations[currentLang] || translations.ka;

  const closeMenu = () => setMenuOpen(false);
  const goTo = (tab) => {
    setActiveTab(tab);
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

  const itemClass = (tab) =>
    `flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-amber-400/15 text-amber-300' : 'text-slate-200 hover:bg-white/5 hover:text-amber-300'}`;

  return (
    <header className="relative z-40 w-full overflow-visible border-b border-amber-500/20 bg-[#0b0b0e]/95 shadow-lg backdrop-blur-xl">
      <div className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 px-3 py-1.5 text-center text-[10px] font-semibold tracking-wide text-slate-950 sm:text-[11px]">
        <span className="inline-flex max-w-full items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{siteSettings?.topBarText || t.topBarText}</span>
        </span>
      </div>

      <div className="mx-auto flex min-h-[66px] w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
        <button
          type="button"
          className="group flex min-w-0 shrink items-center text-left"
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
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'მენიუს დახურვა' : 'მთავარი მენიუს გახსნა'}
          aria-expanded={menuOpen}
          aria-controls="geostore-main-menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-[#171511] text-amber-300 shadow-sm transition hover:border-amber-400 hover:bg-[#211c16] focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="მენიუს დახურვა"
            onClick={closeMenu}
            className="fixed inset-0 z-40 cursor-default bg-black/35"
          />
          <nav
            id="geostore-main-menu"
            aria-label="მთავარი ნავიგაცია"
            className="absolute right-3 top-full z-50 max-h-[min(78vh,720px)] w-[min(94vw,440px)] overflow-y-auto rounded-xl border border-amber-500/20 bg-[#101012] p-3 text-slate-100 shadow-2xl sm:right-6 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-sm font-bold tracking-wide text-white">GEOSTORE</p>
                <p className="mt-0.5 text-[10px] text-slate-400">მთავარი მენიუ</p>
              </div>
              {currentUser ? (
                <button type="button" onClick={() => goTo('profile')} className="flex min-w-0 max-w-[58%] items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{currentUser.name || t.profile}</span>
                </button>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openAuth('login')} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300">
                    {t.login || 'შესვლა'}
                  </button>
                  <button type="button" onClick={() => openAuth('register')} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/10">
                    რეგისტრაცია
                  </button>
                </div>
              )}
            </div>

            <div className="relative mb-3 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-10 w-full min-w-0 rounded-lg border border-white/10 bg-[#1a1a1d] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                />
              </div>
              <button type="button" onClick={() => runAction(setIsImageSearchOpen)} title="პროდუქტის ფოტოთი ძიება" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a1d] text-amber-300 hover:border-amber-400">
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => goTo('store')} className={itemClass('store')}>
                <Store className="h-4 w-4 shrink-0" /> მაღაზია
              </button>
              <button type="button" onClick={() => goTo('cart')} className={itemClass('cart')}>
                <ShoppingBag className="h-4 w-4 shrink-0" /> <span className="min-w-0 flex-1">კალათა</span>
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">{cartCount || 0}</span>
              </button>
              <button type="button" onClick={() => goTo('wishlist')} className={itemClass('wishlist')}>
                <Heart className="h-4 w-4 shrink-0" /> <span className="min-w-0 flex-1">{t.wishlist || 'ფავორიტები'}</span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">{wishlistCount || 0}</span>
              </button>
              <button type="button" onClick={() => runAction(setIsTrackerOpen)} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-amber-300">
                <PackageCheck className="h-4 w-4 shrink-0" /> <span className="min-w-0">{t.orderTracker || 'შეკვეთის თვალყურის დევნება'}</span>
              </button>
              <button type="button" onClick={() => runAction(setIsComparisonOpen)} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-amber-300">
                <Scale className="h-4 w-4 shrink-0" /> შედარება <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">{comparisonCount || 0}</span>
              </button>
              <button type="button" onClick={() => runAction(setIsNotificationsOpen)} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-amber-300">
                <Bell className="h-4 w-4 shrink-0" /> შეტყობინებები
                {unreadNotificationsCount > 0 && <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">{unreadNotificationsCount}</span>}
              </button>
              <button type="button" onClick={() => runAction(setIsAiAssistantOpen)} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/5 hover:text-amber-300">
                <Bot className="h-4 w-4 shrink-0" /> {t.aiAssistant || 'AI ასისტენტი'}
              </button>
            </div>

            <div className="mb-3 border-t border-white/10 pt-3">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">სტილი და რეკომენდაციები</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => goTo('wardrobe')} className={itemClass('wardrobe')}>
                  <Shirt className="h-4 w-4 shrink-0" /> <span>{t.wardrobe || 'ციფრული გარდერობი'}</span>
                </button>
                <button type="button" onClick={() => goTo('ai-stylist')} className={itemClass('ai-stylist')}>
                  <Bot className="h-4 w-4 shrink-0" /> <span>{t.aiStylist || 'AI სტილისტი'}</span>
                </button>
                <button type="button" onClick={() => goTo('my-outfits')} className={itemClass('my-outfits')}>
                  <Sparkles className="h-4 w-4 shrink-0" /> <span>{t.myOutfits || 'ჩემი სტილები'}</span>
                </button>
                <button type="button" onClick={() => goTo('style-recommendations')} className={itemClass('style-recommendations')}>
                  <Store className="h-4 w-4 shrink-0" /> <span>{t.recommendations || 'რეკომენდაციები'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Globe className="h-4 w-4 text-amber-400" /> ენა</span>
              <div className="flex gap-1 rounded-lg border border-white/10 bg-[#1a1a1d] p-1">
                {['ka', 'en', 'ru'].map((lang) => (
                  <button key={lang} type="button" onClick={() => handleLangChange(lang)} className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${currentLang === lang ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                    {lang === 'ka' ? 'GEO' : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
