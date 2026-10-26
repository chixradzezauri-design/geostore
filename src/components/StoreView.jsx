// src/components/StoreView.jsx - Minimalist Apple/Stripe Style Ultra-Modern Design
import React from 'react';
import { Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export default function StoreView({
  siteSettings,
  promoSlots,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  wishlist,
  toggleWishlist,
  addToCart,
  formatPrice
}) {
  return (
    <div className="space-y-12 w-full pb-20">
      
      {/* 🌟 MINIMALIST HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8 md:p-16 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="space-y-5 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> Next-Gen Marketplace Experience
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {siteSettings.heroTitle}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
            {siteSettings.heroSubtitle}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium"><ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია</span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium"><Zap className="w-4 h-4 text-emerald-400" /> სწრაფი მიწოდება</span>
          </div>
        </div>

        {/* Floating Interactive Badge */}
        <div className="hidden lg:flex flex-col gap-3 shrink-0">
          {promoSlots.slice(0, 2).map((slot, idx) => (
            <div key={slot.id} className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl w-60 shadow-xl backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-emerald-400 tracking-wider uppercase">{slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-0.5">{slot.title}</h4>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>
          ))}
        </div>
      </div>

      {/* ⚡ HORIZONTAL SLICK CATEGORIES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">აღმოაჩინე კატეგორიები</h3>
          <span className="text-xs text-emerald-400 font-semibold">{filteredProducts.length} პროდუქტი</span>
        </div>
        
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 cursor-pointer ${
              selectedCategory === 'ყველა' 
                ? 'bg-white text-slate-950 shadow-lg shadow-white/10 scale-105' 
                : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700'
            }`}
          >
            ყველა
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id || cat} 
              onClick={() => setSelectedCategory(cat.name || cat)} 
              className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                selectedCategory === (cat.name || cat) 
                  ? 'bg-white text-slate-950 shadow-lg shadow-white/10 scale-105' 
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{cat.icon || '✦'}</span> <span>{cat.name || cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🛍️ APPLE-STYLE CLEAN PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          return (
            <div key={prod.id} className="group bg-slate-900/30 border border-slate-800/60 rounded-3xl p-4 flex flex-col justify-between backdrop-blur-xl hover:border-slate-700 transition-all duration-300 hover:bg-slate-900/60">
              
              <div className="relative bg-slate-950/60 rounded-2xl p-5 border border-slate-800/40 flex items-center justify-center h-48 overflow-hidden">
                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                <button 
                  onClick={() => toggleWishlist(prod)} 
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 backdrop-blur-md rounded-xl text-rose-400 border border-slate-800/60 hover:scale-110 transition cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                {prod.oldPriceGEL && (
                  <span className="absolute top-3 left-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                    ფასდაკლება
                  </span>
                )}
              </div>

              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{prod.vendor || 'GEOSTORE'}</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">მარაგშია</span>
                </div>
                <h3 className="font-bold text-white text-xs leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-2 pt-1">
                  <p className="text-white font-black text-base">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-medium text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold py-3 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-1.5 border border-slate-700/60 shadow-md cursor-pointer active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> კალათაში დამატება
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
