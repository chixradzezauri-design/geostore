// src/components/Header.jsx - Ultra Modern Header & Navigation
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, Search, Shield, Store, Bot, Gift, Menu, X, User, Download, Smartphone } from 'lucide-react';

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
      } catch {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <>
      <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-2xl w-full shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] py-1.5 px-4 font-black text-center flex items-center justify-center gap-3 shadow-inner">
          <span>🇬🇪 {siteSettings.topBarText || "GEOSTORE - N1 ტექნიკის მარკეტფლეისი"}</span>
          <button 
            onClick={handleInstallClick}
            className="bg-slate-950 hover:bg-slate-900 text-emerald-400 px-2.5 py-0.5 rounded-lg text-[9px] transition flex items-center gap-1 shadow cursor-pointer font-black"
          >
            <Download className="w-3 h-3" /> აპლიკაციის დაყენება
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          {/* LOGO */}
          <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2.5 rounded-2xl text-slate-950 font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
              <span className="text-sm tracking-wide font-black">{siteSettings.storeName}</span>
            </div>
          </div>

          {/* SEARCH BAR (Desktop) */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <input
              type="text"
              placeholder="მოძებნე სასურველი პროდუქტი..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-2.5" />
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 hover:bg-teal-500/20 transition shadow">
              <Bot className="w-4 h-4 text-teal-400" /> AI ასისტენტი
            </button>

            <button onClick={() => setIsGiftQuizOpen(true)} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-500/20 transition shadow">
              <Gift className="w-4 h-4 text-emerald-400" /> ქვიზი
            </button>

            <button onClick={() => setActiveTab('wishlist')} className="relative p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-200 hover:border-slate-600 transition shadow">
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlistCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{wishlistCount}</span>}
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-200 hover:border-slate-600 transition shadow">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="px-4 py-2 bg-slate-800/80 border border-slate-700/50 text-emerald-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition">შესვლა</button>
            )}

            <button onClick={() => setActiveTab('admin')} className="px-3.5 py-2 bg-slate-800/80 text-emerald-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-emerald-500/30 shadow">
              <Shield className="w-4 h-4" /> ადმინ
            </button>
          </div>

          {/* MOBILE QUICK BUTTONS & HAMBURGER */}
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={() => setActiveTab('cart')} className="relative p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-200">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-emerald-500/20">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/95 backdrop-blur-3xl border-t border-slate-800 p-5 space-y-3.5 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="relative">
              <input
                type="text"
                placeholder="ძებნა..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white"
              />
              <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => { setIsAiAssistantOpen(true); setMobileMenuOpen(false); }} className="bg-teal-500/10 text-teal-300 p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border border-teal-500/30">
                <Bot className="w-4 h-4 text-teal-400" /> AI ასისტენტი
              </button>
              <button onClick={() => { setIsGiftQuizOpen(true); setMobileMenuOpen(false); }} className="bg-emerald-500/10 text-emerald-300 p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30">
                <Gift className="w-4 h-4 text-emerald-400" /> საჩუქრის ქვიზი
              </button>
            </div>

            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800 text-xs font-bold">
              <button onClick={() => { setActiveTab('wishlist'); setMobileMenuOpen(false); }} className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl text-slate-200 border border-slate-800">
                <span>❤️ სურვილების სია</span>
                <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full text-[10px]">{wishlistCount}</span>
              </button>

              <button onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }} className="flex items-center justify-between p-3.5 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/30">
                <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-400" /> აპლიკაციის დაყენება ტელეფონში</span>
                <Download className="w-4 h-4 text-emerald-400" />
              </button>

              {currentUser ? (
                <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="p-3.5 bg-slate-950 rounded-2xl text-emerald-400 text-left border border-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4" /> პროფილი: {currentUser.name}
                </button>
              ) : (
                <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="p-3.5 bg-emerald-500 text-slate-950 font-black rounded-2xl text-center shadow-lg shadow-emerald-500/20">
                  🔑 შესვლა / რეგისტრაცია
                </button>
              )}

              <button onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} className="p-3.5 bg-slate-950 rounded-2xl text-emerald-400 flex items-center gap-2 border border-emerald-500/30">
                <Shield className="w-4 h-4 text-emerald-400" /> 🔐 ადმინ პანელი
              </button>
            </div>
          </div>
        )}
      </header>

      {/* INSTALL INSTRUCTION MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-xs text-white shadow-2xl relative">
            <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-base cursor-pointer">✕</button>
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="bg-emerald-500/20 p-2.5 rounded-2xl border border-emerald-500/30">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">GEOSTORE აპლიკაციის დაყენება</h3>
                <p className="text-[11px] text-slate-400">მიჰყევით ინსტრუქციას:</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <b className="text-emerald-400 block">📱 iPhone / iPad (Safari):</b>
                <p>1. ქვედა მენიუდან დააჭირეთ ღილაკს **Share** (გაზიარება / კვადრატი ისრით).</p>
                <p>2. მენიუდან აირჩიეთ **"Add to Home Screen"** (მთავარ ეკრანზე დამატება).</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <b className="text-emerald-400 block">🤖 Android (Chrome / Samsung):</b>
                <p>1. ზედა მარჯვენა კუთხეში დააჭირეთ **3 წერტილს** (მენიუ).</p>
                <p>2. აირჩიეთ **"Install app"** ან **"Add to Home screen"**.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition shadow cursor-pointer"
            >
              გასაგებია
            </button>
          </div>
        </div>
      )}
    </>
  );
}
