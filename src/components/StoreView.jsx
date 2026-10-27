// src/components/StoreView.jsx - Warm Luxury & Gold Elite Boutique Edition
import React, { useState } from 'react';
import { Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, CheckCircle2, Eye, Award } from 'lucide-react';

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
    <div className="space-y-14 w-full pb-24 animate-in fade-in duration-500">
      
      {/* 👑 ELITE GOLDEN HERO & BANNER AREA */}
      <div className="relative overflow-hidden bg-[#0c0c0e] border border-amber-500/20 rounded-[3rem] p-8 md:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 group">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[150px] pointer-events-none group-hover:bg-amber-500/15 transition-all duration-700"></div>

        <div className="space-y-5 max-w-2xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-4.5 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-inner">
            <Award className="w-4 h-4 text-amber-400" /> პრემიუმ კლასის ტექნიკის ბუტიკი
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            {siteSettings?.heroTitle || 'GEOSTORE — ელიტარული შოპინგი'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
            {siteSettings?.heroSubtitle || 'შეიძინეთ უმაღლესი სტანდარტის ტექნოლოგიები განსაკუთრებული პირობებით.'}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 pt-2">
            <span className="flex items-center gap-2 text-xs text-amber-200/90 font-bold bg-[#141416] px-4 py-2 rounded-2xl border border-amber-500/20"><ShieldCheck className="w-4 h-4 text-amber-400" /> ოფიციალური გარანტია</span>
            <span className="flex items-center gap-2 text-xs text-amber-200/90 font-bold bg-[#141416] px-4 py-2 rounded-2xl border border-amber-500/20"><Zap className="w-4 h-4 text-amber-400" /> VIP მიწოდების სერვისი</span>
          </div>
        </div>

        {/* Unique Boutique Banner Slots */}
        <div className="hidden lg:flex flex-col gap-3.5 shrink-0 z-10">
          {(promoSlots || []).slice(0, 2).map((slot) => (
            <div key={slot.id} className="bg-[#121215] border border-amber-500/30 p-5 rounded-3xl w-72 shadow-2xl flex items-center justify-between group/card hover:border-amber-400 transition-all duration-300 hover:scale-105">
              <div>
                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase">{slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-1 group-hover/card:text-amber-300 transition-colors">{slot.title}</h4>
              </div>
              <div className="bg-[#1a1a1e] p-2.5 rounded-2xl border border-amber-500/20 group-hover/card:bg-amber-500 group-hover/card:text-slate-950 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover/card:text-slate-950" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🏷️ REFINED GOLDEN CATEGORIES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> კატეგორიები
          </h3>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20">
            {filteredProducts?.length || 0} პროდუქტი კატალოგში
          </span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none px-1">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 cursor-pointer shadow-md ${
              selectedCategory === 'ყველა' 
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50 font-black' 
                : 'bg-[#121215] text-slate-400 border border-amber-500/10 hover:text-white hover:border-amber-500/30'
            }`}
          >
            ✦ ყველა კატეგორია
          </button>
          {(categories || []).map(cat => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            const catIcon = typeof cat === 'object' ? cat.icon : '✦';
            return (
              <button 
                key={cat.id || catName} 
                onClick={() => setSelectedCategory(catName)} 
                className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md ${
                  selectedCategory === catName 
                    ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50 font-black' 
                    : 'bg-[#121215] text-slate-400 border border-amber-500/10 hover:text-white hover:border-amber-500/30'
                }`}
              >
                <span>{catIcon}</span> <span>{catName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🛍️ ELEGANT PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
        {(filteredProducts || []).map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

          return (
            <div key={prod.id} className="group bg-[#101013] border border-amber-500/15 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-amber-400/50 transition-all duration-500 shadow-xl hover:shadow-amber-500/10">
              
              <div 
                onClick={() => handleOpenProduct(prod)}
                className="relative bg-[#08080a] rounded-3xl p-6 border border-amber-500/10 flex items-center justify-center h-56 overflow-hidden cursor-pointer group/img"
              >
                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700" />
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                  className="absolute top-3.5 right-3.5 p-3 bg-[#121215]/90 backdrop-blur-md rounded-2xl text-rose-400 border border-amber-500/20 hover:scale-110 transition cursor-pointer z-10 shadow"
                >
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
                  {prod.oldPriceGEL && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow">
                      ფასდაკლება
                    </span>
                  )}
                  {tagsArray.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-0 bg-[#08080a]/75 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-xs font-black text-amber-300 backdrop-blur-sm">
                  <Eye className="w-4 h-4 text-amber-400" /> დეტალურად ნახვა
                </div>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider bg-[#16161a] px-3 py-1 rounded-lg border border-amber-500/20">{prod.vendor || 'GEOSTORE'}</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">მარაგშია ({prod.stock || 1})</span>
                </div>
                <h3 
                  onClick={() => handleOpenProduct(prod)}
                  className="font-black text-white text-sm leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors cursor-pointer"
                >
                  {prod.name}
                </h3>
                <div className="flex items-baseline gap-3 pt-1">
                  <p className="text-amber-400 font-black text-lg">{formatPrice(prod.priceGEL)}</p>
                  {prod.oldPriceGEL && (
                    <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => addToCart(prod)} 
                className="w-full bg-[#16161a] hover:bg-amber-400 hover:text-slate-950 text-white font-black py-4 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-amber-500/20 shadow-lg cursor-pointer active:scale-95 group/btn"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400 group-hover/btn:text-slate-950 transition-colors" /> კალათაში დამატება
              </button>
            </div>
          );
        })}
      </div>

      {/* 🔍 ELITE PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative bg-[#0d0d10] border border-amber-500/30 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl p-8 md:p-10 space-y-8">
            
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-6 right-6 p-3 bg-[#141418] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl border border-amber-500/20 transition cursor-pointer z-20 shadow"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              
              {/* Gallery & Active Image */}
              <div className="space-y-5">
                <div className="bg-[#08080a] rounded-[2.5rem] p-8 border border-amber-500/20 flex items-center justify-center h-72 md:h-80 shadow-2xl">
                  <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {selectedProduct.gallery.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)}
                        className={`w-20 h-20 bg-[#08080a] rounded-2xl p-2 border-2 transition cursor-pointer shrink-0 shadow ${activeImage === img ? 'border-amber-400 scale-105' : 'border-amber-500/20 hover:border-amber-400/50'}`}
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
                    <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                    <span className="text-[11px] text-slate-400 font-bold bg-[#141418] px-3.5 py-1.5 rounded-xl border border-amber-500/20">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight pt-2">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs">მომწოდებელი: <b className="text-amber-300">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                {/* Tags */}
                {selectedProduct.tags && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(Array.isArray(selectedProduct.tags) ? selectedProduct.tags : selectedProduct.tags.split(',')).map((t, idx) => (
                      <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <Tag className="w-3.5 h-3.5" /> {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price Box */}
                <div className="bg-[#141418] p-5 rounded-3xl border border-amber-500/30 flex items-baseline gap-4 shadow-inner">
                  <span className="text-3xl font-black text-amber-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && (
                    <span className="text-slate-500 font-bold line-through text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2 bg-[#121215] p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                  <span className="text-amber-300 font-bold block text-sm">პროდუქტის აღწერა:</span>
                  <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">
                    {selectedProduct.description || 'ამ პროდუქტის დეტალური აღწერა ჯერ არ არის დამატებული.'}
                  </p>
                </div>

                {/* Stock Info */}
                <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" /> 
                  <span>ხელმისაწვდომია მარაგში: <b className="text-amber-400 font-black">{selectedProduct.stock || 1} ცალი</b></span>
                </div>

                {/* Add to Cart Button */}
                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4.5 rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
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
