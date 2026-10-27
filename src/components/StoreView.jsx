// src/components/StoreView.jsx - Minimalist Apple/Stripe Style Ultra-Modern Design with Full Product Detail Modal & Tags
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
    <div className="space-y-12 w-full pb-20">
      
      {/* 🌟 MINIMALIST HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8 md:p-16 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 left-1/3 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="space-y-5 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> Next-Gen Marketplace Experience
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {siteSettings?.heroTitle || 'GEOSTORE მარკეტფლეისი'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
            {siteSettings?.heroSubtitle || 'საუკეთესო შეთავაზებები ტექნიკაზე'}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium"><ShieldCheck className="w-4 h-4 text-emerald-400" /> ოფიციალური გარანტია</span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-300 font-medium"><Zap className="w-4 h-4 text-emerald-400" /> სწრაფი მიწოდება</span>
          </div>
        </div>

        {/* Floating Interactive Badge */}
        <div className="hidden lg:flex flex-col gap-3 shrink-0">
          {(promoSlots || []).slice(0, 2).map((slot) => (
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
          <span className="text-xs text-emerald-400 font-semibold">{filteredProducts?.length || 0} პროდუქტი</span>
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
          {(categories || []).map(cat => (
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
        {(filteredProducts || []).map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

          return (
            <div key={prod.id} className="group bg-slate-900/30 border border-slate-800/60 rounded-3xl p-4 flex flex-col justify-between backdrop-blur-xl hover:border-slate-700 transition-all duration-300 hover:bg-slate-900/60">
              
              <div 
                onClick={() => handleOpenProduct(prod)}
                className="relative bg-slate-950/60 rounded-2xl p-5 border border-slate-800/40 flex items-center justify-center h-48 overflow-hidden cursor-pointer"
              >
                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 backdrop-blur-md rounded-xl text-rose-400 border border-slate-800/60 hover:scale-110 transition cursor-pointer z-10"
                >
                  <Heart className={`w-3.5 h-3.5 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>

                <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                  {prod.oldPriceGEL && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                      ფასდაკლება
                    </span>
                  )}
                  {tagsArray.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white">
                  <Eye className="w-4 h-4 text-emerald-400" /> ნახვა
                </div>
              </div>

              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{prod.vendor || 'GEOSTORE'}</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">მარაგშია ({prod.stock || 1})</span>
                </div>
                <h3 
                  onClick={() => handleOpenProduct(prod)}
                  className="font-bold text-white text-xs leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors cursor-pointer"
                >
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

      {/* 🔍 PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-5 right-5 p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-800 transition cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Product Gallery & Active Image */}
              <div className="space-y-4">
                <div className="bg-slate-950/80 rounded-3xl p-6 border border-slate-800/80 flex items-center justify-center h-64 md:h-72 shadow-inner">
                  <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedProduct.gallery.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)}
                        className={`w-16 h-16 bg-slate-950 rounded-2xl p-1 border transition cursor-pointer shrink-0 ${activeImage === img ? 'border-emerald-500 scale-105' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info & Actions */}
              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-lg uppercase">{selectedProduct.category}</span>
                    <span className="text-[10px] text-slate-400 font-medium">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-xl font-black text-white leading-tight pt-1">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-[11px]">მომწოდებელი: <b className="text-slate-200">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                {/* Tags Section */}
                {selectedProduct.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(Array.isArray(selectedProduct.tags) ? selectedProduct.tags : selectedProduct.tags.split(',')).map((t, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price Display */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-baseline gap-3">
                  <span className="text-2xl font-black text-emerald-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && (
                    <span className="text-slate-500 font-bold line-through text-sm">{formatPrice(selectedProduct.oldPriceGEL)}</span>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-300 font-bold block">პროდუქტის აღწერა:</span>
                  <p className="text-slate-400 leading-relaxed text-[11px] whitespace-pre-line">
                    {selectedProduct.description || 'ამ პროდუქტის დეტალური აღწერა ჯერ არ არის დამატებული.'}
                  </p>
                </div>

                {/* Stock Info */}
                <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 
                  <span>ხელმისაწვდომია მარაგში: <b>{selectedProduct.stock || 1} ცალი</b></span>
                </div>

                {/* Add to Cart Button */}
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
