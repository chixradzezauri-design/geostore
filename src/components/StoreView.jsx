// src/components/StoreView.jsx - Ultra-Modern Apple/Stripe Minimalist Edition
import React, { useState } from 'react';
import { Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, CheckCircle2, Eye } from 'lucide-react';

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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const handleOpenProduct = (prod) => {
    setSelectedProduct(prod);
    setActiveImage(prod.image);
  };

  return (
    <div className="space-y-12 w-full pb-20 animate-in fade-in duration-300">
      
      {/* 🌟 PREMIUM HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8 md:p-14 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-emerald-500/15 transition-all duration-700"></div>

        <div className="space-y-5 max-w-2xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> Next-Gen Marketplace Experience
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            {siteSettings?.heroTitle || 'GEOSTORE მარკეტფლეისი'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
            {siteSettings?.heroSubtitle || 'საუკეთესო შეთავაზებები უმაღლესი ხარისხის ტექნიკაზე'}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold"><ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია</span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold"><Zap className="w-4 h-4 text-emerald-400" /> სწრაფი მიწოდება</span>
          </div>
        </div>

        {/* Floating Interactive Badges */}
        <div className="hidden lg:flex flex-col gap-3 shrink-0 z-10">
          {(promoSlots || []).slice(0, 2).map((slot) => (
            <div key={slot.id} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl w-64 shadow-2xl backdrop-blur-xl flex items-center justify-between group/card hover:border-emerald-500/50 transition-all">
              <div>
                <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">{slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-0.5 group-hover/card:text-emerald-300 transition-colors">{slot.title}</h4>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover/card:text-emerald-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* ⚡ HORIZONTAL SLICK CATEGORIES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">კატეგორიები</h3>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{filteredProducts?.length || 0} პროდუქტი</span>
        </div>
        
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-6 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all duration-300 cursor-pointer shadow-md ${
              selectedCategory === 'ყველა' 
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 scale-105' 
                : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700'
            }`}
          >
            ყველა კატეგორია
          </button>
          {(categories || []).map(cat => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            const catIcon = typeof cat === 'object' ? cat.icon : '✦';
            return (
              <button 
                key={cat.id || catName} 
                onClick={() => setSelectedCategory(catName)} 
                className={`px-6 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md ${
                  selectedCategory === catName 
                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 scale-105' 
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{catIcon}</span> <span>{catName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🛍️ PREMIUM PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(filteredProducts || []).map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

          return (
            <div key={prod.id} className="group bg-slate-900/30 border border-slate-800/60 rounded-[2rem] p-4 flex flex-col justify-between backdrop-blur-2xl hover:border-slate-700 transition-all duration-300 hover:bg-slate-900/70 shadow-xl">
              
              <div 
                onClick={() => handleOpenProduct(prod)}
                className="relative bg-slate-950/70 rounded-2xl p-6 border border-slate-800/50 flex items-center justify-center h-52 overflow-hidden cursor-pointer"
              >
                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                  className="absolute top-3 right-3 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl text-rose-400 border border-slate-800 hover:scale-110 transition cursor-pointer z-10 shadow-md"
                >
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  {prod.oldPriceGEL && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase shadow">
                      ფასდაკლება
                    </span>
                  )}
                  {tagsArray.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase shadow">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-white backdrop-blur-[2px]">
                  <Eye className="w-4 h-4 text-emerald-400" /> დეტალურად ნახვა
                </div>
              </div>

              <div className="py-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{prod.vendor || 'GEOSTORE'}</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">მარაგშია ({prod.stock || 1})</span>
                </div>
                <h3 
                  onClick={() => handleOpenProduct(prod)}
                  className="font-bold text-white text-xs leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-2.5 pt-1">
                  <p className="text-white font-black text-base">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-slate-700/80 shadow-lg cursor-pointer active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" /> კალათაში დამატება
              </button>
            </div>
          );
        })}
      </div>

      {/* 🔍 PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 backdrop-blur-3xl">
            
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-5 right-5 p-2.5 bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-800 transition cursor-pointer z-20 shadow"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Gallery & Active Image */}
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-3xl p-6 border border-slate-800/80 flex items-center justify-center h-64 md:h-72 shadow-inner">
                  <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {selectedProduct.gallery.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)}
                        className={`w-16 h-16 bg-slate-950 rounded-2xl p-1.5 border transition cursor-pointer shrink-0 shadow ${activeImage === img ? 'border-emerald-500 scale-105' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info & Actions */}
              <div className="space-y-5 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                    <span className="text-[10px] text-slate-400 font-medium">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-xl font-black text-white leading-tight pt-1">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-[11px]">მომწოდებელი: <b className="text-slate-200">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                {/* Tags */}
                {selectedProduct.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(Array.isArray(selectedProduct.tags) ? selectedProduct.tags : selectedProduct.tags.split(',')).map((t, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                        <Tag className="w-3 h-3" /> {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-baseline gap-3 shadow-inner">
                  <span className="text-2xl font-black text-emerald-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && (
                    <span className="text-slate-500 font-bold line-through text-sm">{formatPrice(selectedProduct.oldPriceGEL)}</span>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60 shadow-inner">
                  <span className="text-slate-300 font-bold block">პროდუქტის აღწერა:</span>
                  <p className="text-slate-400 leading-relaxed text-[11px] whitespace-pre-line">
                    {selectedProduct.description || 'ამ პროდუქტის დეტალური აღწერა ჯერ არ არის დამატებული.'}
                  </p>
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 
                  <span>ხელმისაწვდომია მარაგში: <b>{selectedProduct.stock || 1} ცალი</b></span>
                </div>

                {/* Add to Cart */}
                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl text-xs transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" /> კალათაში დამატება
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
