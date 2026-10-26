// src/components/Header.jsx
import React, { useState } from 'react';
import { ShoppingBag, Heart, Search, Shield, Store, Bot, Gift, Menu, X, User } from 'lucide-react';

export default function Header({ 
  siteSettings, 
  setActiveTab, 
  wishlistCount, 
  cartCount, 
  currentUser, 
  setIsAuthOpen, 
  setAuthMode, 
  setIsAiAssistantOpen, 
  setIsGiftQuizOpen,
  searchQuery,
  setSearchQuery
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-xl w-full shadow-lg">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] py-1 px-3 font-black text-center">
        <span>🇬🇪 {siteSettings.topBarText || "GEOSTORE - N1 ტექნიკის მარკეტფლეისი"}</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        {/* LOGO */}
        <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}>
          <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black flex items-center gap-1.5 shadow">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm tracking-wide">{siteSettings.storeName}</span>
          </div>
        </div>

        {/* SEARCH BAR (Desktop) */}
        <div className="flex-1 max-w-sm relative hidden md:block">
          <input
            type="text"
            placeholder="ძებნა..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
        </div>

        {/* DESKTOP ACTIONS */}
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => setIsAiAssistantOpen(true)} className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-teal-500/30 transition">
            <Bot className="w-4 h-4 text-teal-400" /> AI ასისტენტი
          </button>

          <button onClick={() => setIsGiftQuizOpen(true)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500/30 transition">
            <Gift className="w-4 h-4 text-emerald-400" /> ქვიზი
          </button>

          <button onClick={() => setActiveTab('wishlist')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
            <Heart className="w-4 h-4 text-rose-500" />
            {wishlistCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{wishlistCount}</span>}
          </button>

          <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
          </button>

          {currentUser ? (
            <button onClick={() => setActiveTab('profile')} className="px-3 py-1.5 bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {currentUser.name}
            </button>
          ) : (
            <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow">შესვლა</button>
          )}

          <button onClick={() => setActiveTab('admin')} className="px-3 py-1.5 bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1 border border-emerald-500/30">
            <Shield className="w-4 h-4" /> ადმინ
          </button>
        </div>

        {/* MOBILE QUICK BUTTONS & HAMBURGER */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
          </button>
          
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold shadow">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-3 shadow-2xl">
          <div className="relative">
            <input
              type="text"
              placeholder="ძებნა..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
            />
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setIsAiAssistantOpen(true); setMobileMenuOpen(false); }} className="bg-teal-500/20 text-teal-300 p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-teal-500/30">
              <Bot className="w-4 h-4 text-teal-400" /> AI ასისტენტი
            </button>
            <button onClick={() => { setIsGiftQuizOpen(true); setMobileMenuOpen(false); }} className="bg-emerald-500/20 text-emerald-300 p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30">
              <Gift className="w-4 h-4 text-emerald-400" /> საჩუქრის ქვიზი
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-xs font-bold">
            <button onClick={() => { setActiveTab('wishlist'); setMobileMenuOpen(false); }} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl text-slate-200 border border-slate-800">
              <span>❤️ სურვილების სია</span>
              <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">{wishlistCount}</span>
            </button>

            {currentUser ? (
              <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="p-3 bg-slate-950 rounded-xl text-emerald-400 text-left border border-slate-800 flex items-center gap-2">
                <User className="w-4 h-4" /> პროფილი: {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="p-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-center shadow">
                🔑 შესვლა / რეგისტრაცია
              </button>
            )}

            <button onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} className="p-3 bg-slate-950 rounded-xl text-emerald-400 flex items-center gap-2 border border-emerald-500/30">
              <Shield className="w-4 h-4 text-emerald-400" /> 🔐 ადმინ პანელი
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
