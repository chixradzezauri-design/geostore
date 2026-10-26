// src/components/Header.jsx
import React from 'react';
import { ShoppingBag, Heart, Search, User, Settings, Bot, Gift, CheckSquare } from 'lucide-react';

export default function Header({ 
  siteSettings, 
  currency, 
  setCurrency, 
  searchQuery, 
  setSearchQuery, 
  comparisonList, 
  setIsComparisonOpen, 
  wishlist, 
  setActiveTab, 
  currentUser, 
  setAuthMode, 
  setIsAuthOpen, 
  cart, 
  activeTab, 
  setIsAiAssistantOpen, 
  setIsGiftQuizOpen 
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-xl w-full">
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] py-1 px-3 font-black flex justify-between items-center w-full">
        <div className="flex items-center gap-1.5 truncate">
          <span>🇬🇪</span>
          <span className="truncate">{siteSettings.topBarText}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsAiAssistantOpen(true)} 
            className="bg-slate-950 text-emerald-400 hover:text-white hover:bg-slate-900 px-2.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 font-black border border-emerald-400 shadow transition"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI ასისტენტი</span>
          </button>

          <button 
            onClick={() => setIsGiftQuizOpen(true)} 
            className="bg-slate-950 text-teal-300 hover:text-white hover:bg-slate-900 px-2.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 font-black border border-teal-400/60 shadow transition"
          >
            <Gift className="w-3.5 h-3.5 text-teal-300" />
            <span>საჩუქრის ქვიზი</span>
          </button>

          <button 
            onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')}
            className="bg-slate-950/80 hover:bg-slate-950 px-2 py-0.5 rounded-full border border-emerald-400/40 transition flex items-center gap-1 font-black text-emerald-300 text-[10px]"
          >
            <span>{currency === 'GEL' ? '₾ GEL' : '$ USD'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('store')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-md text-slate-950 group-hover:scale-105 transition transform">
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
            {siteSettings.storeName}
          </span>
        </div>

        <div className="flex-1 max-w-sm relative hidden md:block">
          <input
            type="text"
            placeholder="ძებნა: iPhone, MacBook, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400 shadow-inner"
          />
          <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={() => setIsComparisonOpen(true)}
            className="p-2.5 rounded-xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
            title="შედარება"
          >
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            {comparisonList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {comparisonList.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('wishlist')}
            className="p-2.5 rounded-xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {wishlist.length}
              </span>
            )}
          </button>

          {currentUser ? (
            <button onClick={() => setActiveTab('profile')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 transition">
              <User className="w-3.5 h-3.5" /> {currentUser.name}
            </button>
          ) : (
            <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200 hover:border-emerald-500/50 transition">
              <User className="w-3.5 h-3.5" /> შესვლა
            </button>
          )}

          <button 
            onClick={() => setActiveTab('cart')}
            className="p-2.5 rounded-xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 shadow ${
              activeTab === 'admin' ? 'bg-emerald-500 text-slate-950 font-black border-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold">ადმინი</span>
          </button>
        </div>
      </div>
    </header>
  );
}
