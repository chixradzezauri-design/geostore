// src/components/StoreView.jsx - Ultra-Modern Futuristic Design
import React from 'react';
import { Heart, ShoppingBag, Sparkles, Zap, ShieldCheck, Flame, ArrowRight } from 'lucide-react';

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
    <div className="space-y-10 w-full pb-16">
      {/* 🚀 FUSION HERO BANNER */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/60 border border-emerald-500/30 p-8 md:p-14 shadow-2xl backdrop-blur-3xl">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-2xl text-xs font-black backdrop-blur-md shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> პრემიუმ მრავალვენდერიანი ეკოსისტემა
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
            {siteSettings.heroTitle}
          </h1>
          
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
            {siteSettings.heroSubtitle}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2.5 text-xs font-black text-emerald-300 bg-emerald-500/10 px-4 py-2.5 rounded-2xl border border-emerald-500/20 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია
            </div>
            <div className="flex items-center gap-2.5 text-xs font-black text-teal-300 bg-teal-500/10 px-4 py-2.5 rounded-2xl border border-teal-500/20 shadow-sm backdrop-blur-sm">
              <Zap className="w-4 h-4 text-teal-400" /> 0% განვადება & ექსპრესი
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ PROMO BADGES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {promoSlots.map(slot => (
          <div key={slot.id} className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${slot.bgGradient} border border-emerald-500/20 shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-all duration-300`}>
            <span className="bg-slate-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 self-start text-[10px] font-black px-3.5 py-1 rounded-xl shadow">
              {slot.tag}
            </span>
            <h3 className="text-sm md:text-base font-black text-white mt-6 tracking-wide flex items-center justify-between">
              {slot.title}
              <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
          </div>
        ))}
      </div>

      {/* 📂 INNOVATIVE CATEGORIES SCROLLER */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">კატეგორიები</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 shadow-lg ${
              selectedCategory === 'ყველა' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50' 
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            🔥 ყველა კოლექცია
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id || cat} 
              onClick={() => setSelectedCategory(cat.name || cat)} 
              className={`px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 shadow-lg ${
                selectedCategory === (cat.name || cat) 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50' 
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <span className="text-base">{cat.icon || '✨'}</span> <span>{cat.name || cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🛍️ MODERN PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          return (
            <div key={prod.id} className="group bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-[2rem] p-4 flex flex-col justify-between shadow-2xl hover:border-emerald-500/50 transition-all duration-500 hover:-translate-y-1.5">
              <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 rounded-3xl p-4 border border-slate-800/55">
                <img src={prod.image} alt={prod.name} className="w-full h-48 object-contain group-hover:scale-110 transition-transform duration-700 ease-out" />
                <button 
                  onClick={() => toggleWishlist(prod)} 
                  className="absolute top-3 right-3 p-2.5 bg-slate-900/80 backdrop-blur-md rounded-2xl text-rose-400 border border-slate-800 shadow-xl hover:bg-slate-800 transition active:scale-90"
                >
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                {prod.oldPriceGEL && (
                  <span className="absolute top-3 left-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase">
                    SALE
                  </span>
                )}
              </div>

              <div className="py-4 space-y-2">
                <span className="text-[10px] text-teal-400 font-black tracking-widest uppercase bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20 inline-block">
                  {prod.vendor || 'GEOSTORE'}
                </span>
                <h3 className="font-extrabold text-white text-xs md:text-sm leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-2.5 pt-1">
                  <p className="text-emerald-400 font-black text-lg">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-xl shadow-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" /> კალათაში დამატება
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
