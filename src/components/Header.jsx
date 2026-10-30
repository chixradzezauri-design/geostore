// src/components/Header.jsx - Elite Gold Luxury Boutique Edition with Language Switcher & Hidden Admin Entry
import React, { useState } from 'react';
import { ShoppingBag, Heart, Search, Store, Bot, Menu, X, User, Camera, Sparkles, Scale, PackageCheck, Bell, Shirt, Globe } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[currentLang] || translations.ka;

  const handleLangChange = (lang) => {
    if (typeof setCurrLang === 'function') {
      setCurrLang(lang);
      try { localStorage.setItem('geostore_lang', lang); } catch {}
    }
  };

  return (
    <>
      <header className="bg-[#0b0b0e]/95 border-b border-amber-500/30 w-full shadow-2xl backdrop-blur-2xl sticky top-0 z-40 overflow-hidden">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 text-[11px] py-2 px-3 font-black text-center flex items-center justify-center gap-2 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 shrink-0" /> 
          <span className="truncate">{siteSettings?.topBarText || t.topBarText}</span>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* LOGO */}
          <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}>
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-2 sm:p-2.5 rounded-2xl text-slate-950 font-black flex items-center gap-1.5 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-all duration-300">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm tracking-tight font-black">{siteSettings?.storeName || t.storeName}</span>
            </div>
          </div>

          {/* QUICK WARDROBE NAV (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#121216] p-1.5 rounded-2xl border border-amber-500/20 text-xs font-bold">
            <button onClick={() => setActiveTab('wardrobe')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'wardrobe' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Shirt className="w-3.5 h-3.5" /> {t.wardrobe}
            </button>
            <button onClick={() => setActiveTab('ai-stylist')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'ai-stylist' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Bot className="w-3.5 h-3.5" /> {t.aiStylist}
            </button>
            <button onClick={() => setActiveTab('my-outfits')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'my-outfits' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Sparkles className="w-3.5 h-3.5" /> {t.myOutfits}
            </button>
            <button onClick={() => setActiveTab('style-recommendations')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'style-recommendations' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Store className="w-3.5 h-3.5" /> {t.recommendations}
            </button>
          </div>

          {/* SEARCH BAR & IMAGE SEARCH BUTTON (Desktop) */}
          <div className="flex-1 max-w-xs md:max-w-sm relative hidden md:flex items-center gap-2">
            <div className="relative flex-1 group">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121216] border border-amber-500/20 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner transition-all"
              />
              <Search className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-2.5" />
            </div>
            
            <button
              onClick={() => setIsImageSearchOpen(true)}
              title="პროდუქტის ფოტოთი ძიება"
              className="p-2 bg-[#121216] hover:bg-[#1a1a20] border border-amber-500/20 rounded-2xl text-amber-400 transition-all cursor-pointer flex items-center justify-center shadow-inner"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* 🌟 LANGUAGE SWITCHER */}
            <div className="flex items-center bg-[#121216] p-1 rounded-2xl border border-amber-500/20 text-[10px] font-black shrink-0">
              <button onClick={() => handleLangChange('ka')} className={`px-1.5 py-1 rounded-lg transition cursor-pointer ${currentLang === 'ka' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>GEO</button>
              <button onClick={() => handleLangChange('en')} className={`px-1.5 py-1 rounded-lg transition cursor-pointer ${currentLang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => handleLangChange('ru')} className={`px-1.5 py-1 rounded-lg transition cursor-pointer ${currentLang === 'ru' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>RU</button>
            </div>

            <button onClick={() => setIsTrackerOpen(true)} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-2 rounded-2xl font-bold text-[10px] flex items-center gap-1 hover:bg-amber-500/25 transition shadow-sm cursor-pointer whitespace-nowrap" title="შეკვეთის ტრეკერი">
              <PackageCheck className="w-3.5 h-3.5 text-amber-400" /> {t.orderTracker}
            </button>

            {/* 🔔 Notifications Bell Button */}
            <button onClick={() => setIsNotificationsOpen && setIsNotificationsOpen(true)} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="შეტყობინებები">
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center shadow animate-bounce">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-2 rounded-2xl font-bold text-[10px] flex items-center gap-1 hover:bg-amber-500/25 transition shadow-sm cursor-pointer whitespace-nowrap">
              <Bot className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> {t.aiAssistant}
            </button>

            <button onClick={() => setIsComparisonOpen(true)} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="შედარება">
              <Scale className="w-4 h-4 text-amber-400" />
              {comparisonCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{comparisonCount}</span>}
            </button>

            <button onClick={() => setActiveTab('wishlist')} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="ფავორიტები">
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlistCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{wishlistCount}</span>}
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="კალათა">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="px-2.5 py-1.5 bg-[#121216] border border-amber-500/20 text-amber-400 font-bold rounded-2xl text-[10px] flex items-center gap-1 shadow-sm cursor-pointer truncate max-w-[100px]">
                <User className="w-3 h-3 shrink-0" /> <span className="truncate">{currentUser.name}</span>
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition cursor-pointer whitespace-nowrap">{t.login}</button>
            )}
          </div>

          {/* MOBILE QUICK BUTTONS & HAMBURGER */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button onClick={() => setIsNotificationsOpen && setIsNotificationsOpen(true)} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-amber-400 shadow-sm">
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsImageSearchOpen(true)} className="p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-amber-400 shadow-sm">
              <Camera className="w-4 h-4" />
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 shadow-sm">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[9px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-lg cursor-pointer">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 📱 MOBILE REFINED GRID MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0c0c0e]/98 backdrop-blur-3xl border-t border-amber-500/30 p-4 space-y-3 shadow-2xl animate-in slide-in-from-top duration-300">
            
            {/* Mobile Language Switcher */}
            <div className="flex items-center justify-between bg-[#121216] p-2 rounded-2xl border border-amber-500/20 text-xs font-black">
              <span className="text-slate-400 flex items-center gap-1.5 pl-1"><Globe className="w-3.5 h-3.5 text-amber-400" /> ენა:</span>
              <div className="flex gap-1">
                <button onClick={() => handleLangChange('ka')} className={`px-2 py-1 rounded-xl transition ${currentLang === 'ka' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>GEO</button>
                <button onClick={() => handleLangChange('en')} className={`px-2 py-1 rounded-xl transition ${currentLang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>EN</button>
                <button onClick={() => handleLangChange('ru')} className={`px-2 py-1 rounded-xl transition ${currentLang === 'ru' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>RU</button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121216] border border-amber-500/25 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-2.5" />
              </div>
              <button 
                onClick={() => { setIsImageSearchOpen(true); setMobileMenuOpen(false); }}
                className="p-2 bg-[#121216] border border-amber-500/25 rounded-2xl text-amber-400 flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => { setActiveTab('cart'); setMobileMenuOpen(false); }} className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center gap-2 shadow-lg">
                <ShoppingBag className="w-4 h-4" /> {t.cart} ({cartCount})
              </button>
              <button onClick={() => { setActiveTab('wishlist'); setMobileMenuOpen(false); }} className="p-2.5 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> {t.wishlist} ({wishlistCount})
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => { setActiveTab('wardrobe'); setMobileMenuOpen(false); }} className="p-2.5 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-amber-400" /> {t.wardrobe}
              </button>
              <button onClick={() => { setIsTrackerOpen(true); setMobileMenuOpen(false); }} className="bg-amber-500/10 text-amber-300 p-2.5 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30">
                <PackageCheck className="w-4 h-4 text-amber-400" /> {t.orderTracker}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-500/20">
              {currentUser ? (
                <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="w-full p-3 bg-amber-500/20 rounded-2xl text-amber-300 text-left border border-amber-500/40 flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-2"><User className="w-4 h-4 text-amber-400" /> {t.profile}: {currentUser.name}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">აქტიური</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="w-full p-3 bg-amber-400 text-slate-950 font-black rounded-2xl text-center text-xs shadow-lg">
                    🔑 {t.login}
                  </button>
                  <button onClick={() => { setAuthMode('register'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="w-full p-3 bg-[#16161a] text-amber-400 border border-amber-500/40 font-black rounded-2xl text-center text-xs">
                    ✨ რეგისტრაცია
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </header>
    </>
  );
}
