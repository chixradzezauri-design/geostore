// src/components/Header.jsx - Ultra Modern Header with Enhanced Layout & Smooth Animations
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, Search, Shield, Store, Bot, Gift, Menu, X, User, Download, Smartphone, Camera, Sparkles } from 'lucide-react';

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
  setIsImageSearchOpen, 
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
      <header className="bg-slate-950/80 border-b border-slate-800/60 sticky top-0 z-40 backdrop-blur-2xl w-full shadow-2xl">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-slate-950 text-[11px] py-2 px-4 font-black text-center flex items-center justify-center gap-3 shadow-sm">
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {siteSettings.topBarText || "GEOSTORE - N1 ტექნიკის მარკეტფლეისი"}</span>
          <button 
            onClick={handleInstallClick}
            className="bg-slate-950 hover:bg-slate-900 text-emerald-400 px-3 py-1 rounded-xl text-[10px] transition-all hover:scale-105 flex items-center gap-1.5 shadow-md cursor-pointer font-black"
          >
            <Download className="w-3.5 h-3.5" /> აპლიკაციის დაყენება
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* LOGO */}
          <div className="flex items-center gap-2 cursor-pointer group shrink-0" onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}>
            <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-3 rounded-2xl text-slate-950 font-black flex items-center gap-2.5 shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-all duration-300">
              <Store className="w-5 h-5" />
              <span className="text-sm tracking-tight font-black">{siteSettings.storeName}</span>
            </div>
          </div>

          {/* SEARCH BAR & IMAGE SEARCH BUTTON (Desktop) */}
          <div className="flex-1 max-w-lg relative hidden md:flex items-center gap-2.5">
            <div className="relative flex-1 group">
              <input
                type="text"
                placeholder="მოძებნე სასურველი პროდუქტი ან ბრენდი..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner transition-all group-hover:border-slate-700"
              />
              <Search className="w-4 h-4 text-emerald-400 absolute left-4 top-3.5" />
            </div>
            
            <button
              onClick={() => setIsImageSearchOpen(true)}
              title="პროდუქტის ფოტოთი ძიება"
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 rounded-2xl text-emerald-400 transition-all cursor-pointer flex items-center justify-center shadow-inner hover:scale-105"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-teal-500/20 transition-all shadow-sm cursor-pointer hover:scale-105">
              <Bot className="w-4 h-4 text-teal-400 animate-pulse" /> AI ასისტენტი
            </button>

            <button onClick={() => setIsGiftQuizOpen(true)} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-500/20 transition-all shadow-sm cursor-pointer hover:scale-105">
              <Gift className="w-4 h-4 text-emerald-400" /> ქვიზი
            </button>

            <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>

            <button onClick={() => setActiveTab('wishlist')} className="relative p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-slate-200 hover:border-slate-700 transition-all shadow-sm cursor-pointer hover:scale-105">
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlistCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">{wishlistCount}</span>}
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-slate-200 hover:border-slate-700 transition-all shadow-sm cursor-pointer hover:scale-105">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-5 h-5 text-[10px] font-black flex items-center justify-center shadow-md animate-bounce">{cartCount}</span>}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="px-4 py-2.5 bg-slate-900/90 border border-slate-800 text-emerald-400 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:border-slate-700">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer hover:scale-105">შესვლა</button>
            )}

            <button onClick={() => setActiveTab('admin')} className="px-4 py-2.5 bg-slate-900/90 text-emerald-400 font-bold rounded-2xl text-xs flex items-center gap-2 border border-emerald-500/30 shadow-sm cursor-pointer hover:bg-slate-800">
              <Shield className="w-4 h-4" /> ადმინ
            </button>
          </div>

          {/* MOBILE QUICK BUTTONS & HAMBURGER */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button onClick={() => setIsImageSearchOpen(true)} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-400 shadow-sm">
              <Camera className="w-4 h-4" />
            </button>

            <button onClick={() => setActiveTab('cart')} className="relative p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 shadow-sm">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-3 bg-emerald-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-emerald-500/20">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950/95 backdrop-blur-3xl border-t border-slate-800/80 p-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ძებნა პროდუქტებში..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white"
                />
                <Search className="w-4 h-4 text-emerald-400 absolute left-4 top-3.5" />
              </div>
              <button 
                onClick={() => { setIsImageSearchOpen(true); setMobileMenuOpen(false); }}
                className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-400"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAiAssistantOpen(true); setMobileMenuOpen(false); }} className="bg-teal-500/10 text-teal-300 p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-teal-500/30">
                <Bot className="w-4 h-4 text-teal-400" /> AI ასისტენტი
              </button>
              <button onClick={() => { setIsGiftQuizOpen(true); setMobileMenuOpen(false); }} className="bg-emerald-500/10 text-emerald-300 p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/30">
                <Gift className="w-4 h-4 text-emerald-400" /> საჩუქრის ქვიზი
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-slate-800 text-xs font-bold">
              <button onClick={() => { setActiveTab('wishlist'); setMobileMenuOpen(false); }} className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-slate-200 border border-slate-800">
                <span>❤️ სურვილების სია</span>
                <span className="bg-rose-500 text-white px-3 py-0.5 rounded-full text-[10px] font-black">{wishlistCount}</span>
              </button>

              <button onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }} className="flex items-center justify-between p-4 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/30">
                <span className="flex items-center gap-2.5"><Smartphone className="w-4 h-4 text-emerald-400" /> აპლიკაციის დაყენება ტელეფონში</span>
                <Download className="w-4 h-4 text-emerald-400" />
              </button>

              {currentUser ? (
                <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="p-4 bg-slate-900 rounded-2xl text-emerald-400 text-left border border-slate-800 flex items-center gap-2.5">
                  <User className="w-4 h-4" /> პროფილი: {currentUser.name}
                </button>
              ) : (
                <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setMobileMenuOpen(false); }} className="p-4 bg-emerald-500 text-slate-950 font-black rounded-2xl text-center shadow-lg shadow-emerald-500/20">
                  🔑 შესვლა / რეგისტრაცია
                </button>
              )}

              <button onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} className="p-4 bg-slate-900 rounded-2xl text-emerald-400 flex items-center gap-2.5 border border-emerald-500/30">
                <Shield className="w-4 h-4 text-emerald-400" /> 🔐 ადმინ პანელი
              </button>
            </div>
          </div>
        )}
      </header>

      {/* INSTALL INSTRUCTION MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-7 max-w-md w-full space-y-5 text-xs text-white shadow-2xl relative">
            <button onClick={() => setShowInstallModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            
            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">GEOSTORE აპლიკაციის დაყენება</h3>
                <p className="text-[11px] text-slate-400">მიჰყევით მარტივ ინსტრუქციას:</p>
              </div>
            </div>

            <div className="space-y-3.5 text-slate-300">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <b className="text-emerald-400 block text-xs">📱 iPhone / iPad (Safari):</b>
                <p>1. ქვედა მენიუდან დააჭირეთ ღილაკს **Share** (გაზიარება / კვადრატი ისრით).</p>
                <p>2. მენიუდან აირჩიეთ **"Add to Home Screen"** (მთავარ ეკრანზე დამატება).</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <b className="text-emerald-400 block text-xs">🤖 Android (Chrome / Samsung):</b>
                <p>1. ზედა მარჯვენა კუთხეში დააჭირეთ **3 წერტილს** (მენიუ).</p>
                <p>2. აირჩიეთ **"Install app"** ან **"Add to Home screen"**.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              გასაგებია
            </button>
          </div>
        </div>
      )}
    </>
  );
}
