// src/components/StoreView.jsx - Ultra Modern Glassmorphism Design
import React from 'react';
import { Heart, ShoppingBag, Sparkles, Flame, ShieldCheck, Zap } from 'lucide-react';

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
    <div className="space-y-8 w-full pb-10">
      {/* HERO BANNER - ULTRA MODERN GRADIENT */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 border border-emerald-500/30 p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-5 backdrop-blur-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-black shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> მრავალვენდერიანი ონლაინ მარკეტფლეისი
        </div>
        
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {siteSettings.heroTitle}
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {siteSettings.heroSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow">
            <Zap className="w-4 h-4 text-teal-400" /> 0% განვადება & მიწოდება
          </div>
        </div>
      </div>

      {/* PROMO SLOTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {promoSlots.map(slot => (
          <div key={slot.id} className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br ${slot.bgGradient} border border-emerald-500/20 shadow-xl flex flex-col justify-between group hover:border-emerald-500/50 transition-all duration-300`}>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 self-start text-[10px] font-black px-3 py-1 rounded-full shadow-inner">
              {slot.tag}
            </span>
            <h3 className="text-sm font-black text-white mt-4 tracking-wide">{slot.title}</h3>
          </div>
        ))}
      </div>

      {/* CATEGORIES CHIPS */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">კატეგორიები</h3>
        <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 shadow-md ${
              selectedCategory === 'ყველა' 
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 scale-105' 
                : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            🔥 ყველა პროდუქტი
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id || cat} 
              onClick={() => setSelectedCategory(cat.name || cat)} 
              className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 shadow-md ${
                selectedCategory === (cat.name || cat) 
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 scale-105' 
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-sm">{cat.icon || ''}</span> <span>{cat.name || cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredProducts.map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          return (
            <div key={prod.id} className="group bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 flex flex-col justify-between shadow-xl hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1">
              <div className="relative overflow-hidden bg-slate-950 rounded-2xl p-3 border border-slate-800/50">
                <img src={prod.image} alt={prod.name} className="w-full h-44 object-contain group-hover:scale-105 transition-transform duration-500" />
                <button 
                  onClick={() => toggleWishlist(prod)} 
                  className="absolute top-3 right-3 p-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-rose-400 border border-slate-800 shadow-md hover:bg-slate-800 transition"
                >
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                {prod.oldPriceGEL && (
                  <span className="absolute top-3 left-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    SALE
                  </span>
                )}
              </div>

              <div className="py-3 space-y-1.5">
                <span className="text-[10px] text-teal-400 font-black tracking-wider uppercase bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20 inline-block">
                  {prod.vendor || 'GEOSTORE'}
                </span>
                <h3 className="font-bold text-white text-xs leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-2 pt-1">
                  <p className="text-emerald-400 font-black text-base">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
