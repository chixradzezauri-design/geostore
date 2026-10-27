// src/components/StoreView.jsx - Next-Gen Ultra-Premium Glassmorphism Edition
import React, { useState } from 'react';
import { Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, CheckCircle2, Eye, Flame } from 'lucide-react';

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
    <div className="space-y-16 w-full pb-24 animate-in fade-in duration-500">
      
      {/* 🌟 ULTRA-PREMIUM HERO SECTION */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950 border border-slate-800/80 rounded-[3rem] p-8 md:p-16 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 group">
        <div className="absolute -top-12 -left-12 w-96 h-96 bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none group-hover:bg-emerald-500/25 transition-all duration-700"></div>
        <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="space-y-6 max-w-2xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4.5 py-2 rounded-full text-xs font-black tracking-wider uppercase shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" /> ოფიციალური ონლაინ მარკეტფლეისი
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
            {siteSettings?.heroTitle || 'აღმოაჩინე მომავლის ტექნოლოგიები'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed max-w-xl">
            {siteSettings?.heroSubtitle || 'უმაღლესი ხარისხის სმარტფონები, ლეპტოპები და აქსესუარები საუკეთესო პირობებით.'}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
            <span className="flex items-center gap-2 text-xs text-slate-200 font-bold bg-slate-950/60 px-4 py-2 rounded-2xl border border-slate-800"><ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია</span>
            <span className="flex items-center gap-2 text-xs text-slate-200 font-bold bg-slate-950/60 px-4 py-2 rounded-2xl border border-slate-800"><Zap className="w-4 h-4 text-emerald-400" /> ადგილზე სწრაფი მიწოდება</span>
          </div>
        </div>

        {/* Floating Promo Badges */}
        <div className="hidden lg:flex flex-col gap-3.5 shrink-0 z-10">
          {(promoSlots || []).slice(0, 2).map((slot) => (
            <div key={slot.id} className="bg-slate-950/90 border border-slate-800 p-5 rounded-3xl w-72 shadow-2xl backdrop-blur-2xl flex items-center justify-between group/card hover:border-emerald-500/60 transition-all duration-300 hover:scale-105">
              <div>
                <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-400" /> {slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-1 group-hover/card:text-emerald-300 transition-colors">{slot.title}</h4>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 group-hover/card:bg-emerald-500 group-hover/card:text-slate-950 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover/card:text-slate-950" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚡ SLICK MODERN CATEGORIES */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> კატეგორიები
          </h3>
          <span className="text-xs text-emerald-400 font-black bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-inner">
            {filteredProducts?.length || 0} პროდუქტი ხელმისაწვდომია
          </span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none px-1">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 cursor-pointer shadow-lg ${
              selectedCategory === 'ყველა' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50' 
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            🔥 ყველა კატეგორია
          </button>
          {(categories || []).map(cat => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            const catIcon = typeof cat === 'object' ? cat.icon : '✦';
            return (
              <button 
                key={cat.id || catName} 
                onClick={() => setSelectedCategory(catName)} 
                className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 cursor-pointer shadow-lg ${
                  selectedCategory === catName 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50' 
                    : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="text-sm">{catIcon}</span> <span>{catName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🛍️ STUNNING PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
        {(filteredProducts || []).map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

          return (
            <div key={prod.id} className="group bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-5 flex flex-col justify-between backdrop-blur-2xl hover:border-emerald-500/50 transition-all duration-500 hover:bg-slate-900/80 shadow-2xl hover:shadow-emerald-500/10">
              
              <div 
                onClick={() => handleOpenProduct(prod)}
                className="relative bg-slate-950/80 rounded-3xl p-6 border border-slate-800/60 flex items-center justify-center h-56 overflow-hidden cursor-pointer group/img"
              >
                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700" />
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                  className="absolute top-3.5 right-3.5 p-3 bg-slate-900/90 backdrop-blur-md rounded-2xl text-rose-400 border border-slate-800 hover:scale-110 transition-all cursor-pointer z-10 shadow-lg"
                >
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                  {prod.oldPriceGEL && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                      ფასდაკლება
                    </span>
                  )}
                  {tagsArray.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-xs font-black text-white backdrop-blur-sm">
                  <Eye className="w-4 h-4 text-emerald-400 animate-pulse" /> სწრაფი ნახვა
                </div>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">{prod.vendor || 'GEOSTORE'}</span>
                  <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> მარაგშია ({prod.stock || 1})
                  </span>
                </div>
                <h3 
                  onClick={() => handleOpenProduct(prod)}
                  className="font-black text-white text-sm leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-3 pt-1">
                  <p className="text-white font-black text-lg">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-emerald-500 hover:to-teal-500 hover:text-slate-950 text-white font-black py-4 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-slate-700/80 shadow-xl cursor-pointer active:scale-95 group/btn"
              >
                <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> კალათაში დამატება
              </button>
            </div>
          );
        })}
      </div>

      {/* 🔍 ULTRA-PREMIUM PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl p-8 md:p-10 space-y-8 backdrop-blur-3xl">
            
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-6 right-6 p-3 bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer z-20 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              
              {/* Gallery & Active Image */}
              <div className="space-y-5">
                <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-slate-800/80 flex items-center justify-center h-72 md:h-80 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none"></div>
                  <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" />
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {selectedProduct.gallery.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)}
                        className={`w-20 h-20 bg-slate-950 rounded-2xl p-2 border-2 transition-all cursor-pointer shrink-0 shadow-lg ${activeImage === img ? 'border-emerald-500 scale-105 ring-4 ring-emerald-500/20' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info & Actions */}
              <div className="space-y-6 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                    <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight pt-2">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs">მომწოდებელი ბრენდი: <b className="text-slate-200">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                {/* Tags */}
                {selectedProduct.tags && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(Array.isArray(selectedProduct.tags) ? selectedProduct.tags : selectedProduct.tags.split(',')).map((t, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <Tag className="w-3.5 h-3.5" /> {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price Box */}
                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex items-baseline gap-4 shadow-inner">
                  <span className="text-3xl font-black text-emerald-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && (
                    <span className="text-slate-500 font-bold line-through text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2 bg-slate-950/60 p-5 rounded-3xl border border-slate-800 shadow-inner">
                  <span className="text-slate-200 font-bold block text-sm">პროდუქტის აღწერა:</span>
                  <p className="text-slate-400 leading-relaxed text-xs whitespace-pre-line">
                    {selectedProduct.description || 'ამ პროდუქტის დეტალური აღწერა ჯერ არ არის დამატებული.'}
                  </p>
                </div>

                {/* Stock Info */}
                <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> 
                  <span>ხელმისაწვდომია მარაგში: <b className="text-emerald-400 font-black">{selectedProduct.stock || 1} ცალი</b></span>
                </div>

                {/* Add to Cart Button */}
                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-4.5 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-5 h-5" /> კალათაში დამატება
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
