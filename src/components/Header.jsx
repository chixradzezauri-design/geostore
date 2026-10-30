// src/components/Header.jsx - Elite Gold Luxury Boutique Edition with AI Digital Wardrobe & Full Preservation
import React, { useState } from 'react';
import { ShoppingBag, Heart, Search, Shield, Store, Bot, Menu, X, User, Camera, Sparkles, Scale, PackageCheck, Bell, Shirt } from 'lucide-react';

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
  setSearchQuery
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-[#0b0b0e]/95 border-b border-amber-500/30 w-full shadow-2xl backdrop-blur-2xl sticky top-0 z-40">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 text-[11px] py-2 px-4 font-black text-center flex items-center justify-center gap-2 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 shrink-0" /> 
          <span className="truncate">{siteSettings?.topBarText || "GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი"}</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          {/* LOGO */}
          <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}>
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 p-2.5 sm:p-3 rounded-2xl text-slate-950 font-black flex items-center gap-2 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-all duration-300">
              <Store className="w-5 h-5" />
              <span className="text-xs sm:text-sm tracking-tight font-black">{siteSettings?.storeName || 'GEOSTORE'}</span>
            </div>
          </div>

          {/* QUICK WARDROBE NAV (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#121216] p-1.5 rounded-2xl border border-amber-500/20 text-xs font-bold">
            <button onClick={() => setActiveTab('wardrobe')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'wardrobe' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Shirt className="w-3.5 h-3.5" /> ჩემი გარდერობი
            </button>
            <button onClick={() => setActiveTab('ai-stylist')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'ai-stylist' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Bot className="w-3.5 h-3.5" /> AI სტილისტი
            </button>
            <button onClick={() => setActiveTab('my-outfits')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'my-outfits' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Sparkles className="w-3.5 h-3.5" /> ჩემი ლუქები
            </button>
            <button onClick={() => setActiveTab('style-recommendations')} className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'style-recommendations' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-amber-400'}`}>
              <Store className="w-3.5 h-3.5" /> სტილის რეკომენდაციები
            </button>
          </div>

          {/* SEARCH BAR & IMAGE SEARCH BUTTON (Desktop) */}
          <div className="flex-1 max-w-sm relative hidden md:flex items-center gap-2">
            <div className="relative flex-1 group">
              <input
                type="text"
                placeholder="მოძებნე სასურველი პროდუქტი..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121216] border border-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner transition-all"
              />
              <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
            </div>
            
            <button
              onClick={() => setIsImageSearchOpen(true)}
              title="პროდუქტის ფოტოთი ძიება"
              className="p-2.5 bg-[#121216] hover:bg-[#1a1a20] border border-amber-500/20 rounded-2xl text-amber-400 transition-all cursor-pointer flex items-center justify-center shadow-inner"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button onClick={() => setIsTrackerOpen(true)} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 hover:bg-amber-500/25 transition shadow-sm cursor-pointer" title="შეკვეთის ტრეკერი">
              <PackageCheck className="w-4 h-4 text-amber-400" /> ძებნა
            </button>

            {/* 🔔 Notifications Bell Button */}
            <button onClick={() => setIsNotificationsOpen && setIsNotificationsOpen(true)} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="შეტყობინებები">
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center shadow animate-bounce">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 hover:bg-amber-500/25 transition shadow-sm cursor-pointer">
              <Bot className="w-4 h-4 text-amber-400 animate-pulse" /> AI
            </button>

            <button onClick={() => setIsComparisonOpen(true)} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="შედარება">
              <Scale className="w-4 h-4 text-amber-400" />
              {comparisonCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{comparisonCount}</span>}
            </button>

            <button onClick={() => setActiveTab('wishlist')} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="ფავორიტები">
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlistCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{wishlistCount}</span>}
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 hover:border-amber-400 transition shadow-sm cursor-pointer" title="კალათა">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="px-3.5 py-2 bg-[#121216] border border-amber-500/20 text-amber-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition cursor-pointer">შესვლა</button>
            )}

            <button onClick={() => setActiveTab('admin')} className="px-3.5 py-2 bg-[#121216] text-amber-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-amber-500/30 shadow-sm cursor-pointer">
              <Shield className="w-4 h-4" /> ადმინ
            </button>
          </div>

          {/* MOBILE QUICK BUTTONS & HAMBURGER */}
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => setIsNotificationsOpen && setIsNotificationsOpen(true)} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-amber-400 shadow-sm">
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsImageSearchOpen(true)} className="p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-amber-400 shadow-sm">
              <Camera className="w-4 h-4" />
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-2.5 bg-[#121216] border border-amber-500/20 rounded-2xl text-slate-200 shadow-sm">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-lg cursor-pointer">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 📱 MOBILE REFINED GRID MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0c0c0e]/98 backdrop-blur-3xl border-t border-amber-500/30 p-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-300">
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ძებნა პროდუქტებში..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121216] border border-amber-500/25 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                />
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
              </div>
              <button 
                onClick={() => { setIsImageSearchOpen(true); setMobileMenuOpen(false); }}
                className="p-2.5 bg-[#121216] border border-amber-500/25 rounded-2xl text-amber-400 flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => { setActiveTab('wardrobe'); setMobileMenuOpen(false); }} className="p-3 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-amber-400" /> ჩემი გარდერობი
              </button>
              <button onClick={() => { setActiveTab('ai-stylist'); setMobileMenuOpen(false); }} className="p-3 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" /> AI სტილისტი
              </button>
              <button onClick={() => { setActiveTab('my-outfits'); setMobileMenuOpen(false); }} className="p-3 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> ჩემი ლუქები
              </button>
              <button onClick={() => { setActiveTab('style-recommendations'); setMobileMenuOpen(false); }} className="p-3 bg-amber-500/10 text-amber-300 rounded-2xl border border-amber-500/30 flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400" /> რეკომენდაციები
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => { setIsTrackerOpen(true); setMobileMenuOpen(false); }} className="bg-amber-500/10 text-amber-300 p-3 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30">
                <PackageCheck className="w-4 h-4 text-amber-400" /> შეკვეთის ძებნა
              </button>
              <button onClick={() => { setIsComparisonOpen(true); setMobileMenuOpen(false); }} className="bg-amber-500/10 text-amber-300 p-3 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30">
                <Scale className="w-4 h-4 text-amber-400" /> შედარება ({comparisonCount})
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-500/20">
              {currentUser ? (
                <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="w-full p-3.5 bg-[#121216] rounded-2xl text-amber-400 text-left border border-amber-500/20 flex items-center gap-2 text-xs font-bold">
                  <User className="w-4 h-4" /> პროფილი: {currentUser.name}
                </button>
              ) : (
                <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="w-full p-3.5 bg-amber-400 text-slate-950 font-black rounded-2xl text-center text-xs">
                  🔑 შესვლა / რეგისტრაცია
                </button>
              )}

              <button onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} className="w-full p-3.5 bg-[#121216] rounded-2xl text-amber-400 flex items-center gap-2 border border-amber-500/30 text-xs font-bold">
                <Shield className="w-4 h-4 text-amber-400" /> 🔐 ადმინ პანელი
              </button>
            </div>

          </div>
        )}
      </header>
    </>
  );
}
