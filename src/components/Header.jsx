// src/components/Header.jsx
import React from 'react';
import { ShoppingBag, Heart, Search, Shield, Store, Bot, Gift } from 'lucide-react';

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
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-xl">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] py-1 px-3 font-black flex justify-between items-center w-full">
        <span>🇬🇪 {siteSettings.topBarText || "GEOSTORE - N1 ტექნიკის მარკეტფლეისი"}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('store')}>
          <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black flex items-center gap-1.5 shadow group-hover:scale-105 transition">
            <Store className="w-5 h-5" />
            <span className="text-sm tracking-wide">{siteSettings.storeName}</span>
          </div>
        </div>

        <div className="flex-1 max-w-sm relative hidden md:block">
          <input
            type="text"
            placeholder="ძებნა: iPhone, MacBook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
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
            <button onClick={() => setActiveTab('profile')} className="px-3 py-1.5 bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs">{currentUser.name}</button>
          ) : (
            <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow">შესვლა</button>
          )}

          <button onClick={() => setActiveTab('admin')} className="p-2 bg-slate-800 rounded-xl text-emerald-400 font-bold text-xs flex items-center gap-1 hover:bg-slate-700 transition">
            <Shield className="w-4 h-4" /> ადმინ
          </button>
        </div>
      </div>
    </header>
  );
}
