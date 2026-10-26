// src/components/StoreView.jsx
import React from 'react';
import { ShoppingBag, Heart, Eye, Grid, CheckSquare, Bell } from 'lucide-react';

export default function StoreView({
  siteSettings,
  promoSlots,
  categories,
  vendorsList,
  selectedVendorFilter,
  setSelectedVendorFilter,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  wishlist,
  toggleWishlist,
  comparisonList,
  toggleComparison,
  setSelectedProductQuickView,
  addToCart,
  setQuickBuyProduct,
  setIsCheckoutOpen,
  setPriceAlertModal,
  formatPrice
}) {
  return (
    <div className="space-y-6 w-full">
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-emerald-500/30 p-6 md:p-10 rounded-3xl space-y-4 shadow-xl">
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">მრავალვენდერიანი მარკეტფლეისი</span>
        <h1 className="text-2xl md:text-4xl font-black text-white">{siteSettings.heroTitle}</h1>
        <p className="text-slate-400 text-xs md:text-sm">{siteSettings.heroSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {promoSlots.map(slot => (
          <div key={slot.id} className={`rounded-2xl p-4 bg-gradient-to-br ${slot.bgGradient} border border-emerald-500/20 shadow flex flex-col justify-between`}>
            <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 self-start text-[9px] font-black px-2.5 py-0.5 rounded-full">{slot.tag}</span>
            <h3 className="text-xs font-bold text-white mt-3">{slot.title}</h3>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedCategory('ყველა')} className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap ${selectedCategory === 'ყველა' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>ყველა</button>
        {categories.map(cat => (
          <button key={cat.id || cat} onClick={() => setSelectedCategory(cat.name || cat)} className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap ${selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
            {cat.icon || ''} {cat.name || cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.map(prod => {
          const isWish = wishlist.some(w => w.id === prod.id);
          return (
            <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-3">
              <div className="relative">
                <img src={prod.image} alt={prod.name} className="w-full h-40 object-contain bg-slate-950 rounded-xl p-2 border border-slate-800" />
                <button onClick={() => toggleWishlist(prod)} className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-rose-400">
                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
              <div>
                <span className="text-[10px] text-teal-400 font-bold uppercase">{prod.vendor || 'GEOSTORE'}</span>
                <h3 className="font-bold text-white text-xs mt-1">{prod.name}</h3>
                <p className="text-emerald-400 font-black text-sm mt-1">{formatPrice(prod.priceGEL)}</p>
              </div>
              <button onClick={() => addToCart(prod)} className="w-full bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-xs shadow">კალათაში</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
