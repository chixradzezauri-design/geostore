// src/components/StoreView.js
import React from 'react';
import { ShoppingBag, Store, Grid, Clock, CheckSquare, Heart, Eye, Bell, Truck, ShieldCheck, Bot, Gift } from 'lucide-react';

export default function StoreView({
  sections,
  siteSettings,
  banners,
  promoSlots,
  vendorsList,
  selectedVendorFilter,
  setSelectedVendorFilter,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  wishlist,
  toggleWishlist,
  comparisonList,
  toggleComparison,
  setSelectedProductQuickView,
  setPriceAlertModal,
  addToCart,
  setQuickBuyProduct,
  setIsCheckoutOpen,
  formatPrice,
  setIsAiAssistantOpen,
  setIsGiftQuizOpen,
  storePolicy,
  setIsComparisonOpen
}) {
  return (
    <div className="space-y-5 w-full">
      {sections.filter(s => s.visible).map(sec => {
        if (sec.id === 'hero') {
          return (
            <div key={sec.id} className="relative rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg bg-slate-900 w-full">
              <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                <div className="p-5 md:p-6 md:col-span-7 z-10 space-y-2.5">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Store className="w-3 h-3 text-emerald-400" /> მრავალვენდერიანი მარკეტფლეისი
                  </span>
                  <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {siteSettings.heroTitle}
                  </h1>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {siteSettings.heroSubtitle}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button 
                      onClick={() => setIsAiAssistantOpen(true)} 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black px-3.5 py-2 rounded-xl shadow hover:scale-105 transition transform flex items-center gap-1.5 text-xs"
                    >
                      <Bot className="w-3.5 h-3.5 text-slate-950" />
                      <span>🤖 AI ასისტენტი</span>
                    </button>

                    <button 
                      onClick={() => setIsGiftQuizOpen(true)} 
                      className="bg-slate-950 border border-teal-400/60 text-teal-300 hover:text-white font-black px-3.5 py-2 rounded-xl hover:bg-slate-900 transition flex items-center gap-1.5 text-xs shadow-sm"
                    >
                      <Gift className="w-3.5 h-3.5 text-teal-300" />
                      <span>🎁 საჩუქრის ქვიზი</span>
                    </button>
                  </div>
                </div>
                <div className="relative h-36 md:h-52 md:col-span-5 w-full">
                  <img src={banners[0]?.image} alt="Hero" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent"></div>
                </div>
              </div>
            </div>
          );
        }

        if (sec.id === 'promos') {
          return (
            <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {promoSlots.map(slot => (
                <div key={slot.id} className={`rounded-xl p-3.5 bg-gradient-to-br ${slot.bgGradient} border border-emerald-500/20 hover:border-emerald-500/40 transition shadow flex flex-col justify-between backdrop-blur-md`}>
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 self-start text-[8px] font-black px-2 py-0.5 rounded-full">{slot.tag}</span>
                  <h3 className="text-xs font-bold text-white mt-3">{slot.title}</h3>
                </div>
              ))}
            </div>
          );
        }

        if (sec.id === 'ticker') {
          return (
            <div key={sec.id} className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between shadow-sm w-full">
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <div>
                  <h4 className="font-extrabold text-white text-xs">⚡ GEOSTORE - ოფიციალური ვენდერების შეთავაზებები</h4>
                  <p className="text-[9px] text-slate-400">შეიძინე პირდაპირ სანდო მომწოდებლებისგან!</p>
                </div>
              </div>
            </div>
          );
        }

        if (sec.id === 'categories') {
          return (
            <div key={sec.id} className="space-y-2.5 w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-white flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-emerald-400" /> კატეგორიები და ვენდერები
                </h2>
                
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none w-full md:w-auto">
                  <button
                    onClick={() => setSelectedVendorFilter('ყველა')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                      selectedVendorFilter === 'ყველა' ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🌐 ყველა ვენდერი
                  </button>
                  {vendorsList.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVendorFilter(v.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                        selectedVendorFilter === v.name ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      🏪 {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
                <button
                  onClick={() => setSelectedCategory('ყველა')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition border ${
                    selectedCategory === 'ყველა' ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  ✨ ყველა
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id || cat}
                    onClick={() => setSelectedCategory(cat.name || cat)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition border ${
                      selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    {cat.icon || ''} {cat.name || cat}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (sec.id === 'products') {
          return (
            <div key={sec.id} id="products" className="space-y-4 w-full">
              <div className="flex justify-between items-center">
                <h2 className="text-base md:text-lg font-black text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> პროდუქციის კატალოგი {selectedVendorFilter !== 'ყველა' ? `(${selectedVendorFilter})` : ''}
                </h2>
                <div className="flex gap-1.5">
                  {comparisonList.length > 0 && (
                    <button onClick={() => setIsComparisonOpen(true)} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 px-2.5 py-1 rounded-xl text-xs font-bold border border-cyan-500/40 transition">
                      შედარება ({comparisonList.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {filteredProducts.map(prod => {
                  const isWish = wishlist.some(w => w.id === prod.id);
                  const isCompared = comparisonList.some(c => c.id === prod.id);
                  const monthlyInstallment = Math.round(prod.priceGEL / 12);

                  return (
                    <div key={prod.id} className="bg-slate-900 border border-emerald-500/20 hover:border-emerald-400/60 rounded-2xl p-3.5 flex flex-col justify-between group transition duration-300 shadow-lg">
                      <div>
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 mb-3 p-3 flex items-center justify-center border border-slate-800">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" />
                          {prod.discountPercent > 0 && (
                            <span className="absolute top-2.5 left-2.5 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow">
                              -{prod.discountPercent}%
                            </span>
                          )}
                          {prod.isPreOrder && (
                            <span className="absolute top-2.5 left-14 bg-blue-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow">
                              PRE-ORDER
                            </span>
                          )}
                          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
                            <button onClick={() => toggleWishlist(prod)} className="p-2 bg-slate-950/80 hover:bg-slate-950 rounded-full text-white border border-slate-800 transition" title="სურვილებში">
                              <Heart className={`w-3.5 h-3.5 ${isWish ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                            </button>
                            <button onClick={() => toggleComparison(prod)} className={`p-2 rounded-full border transition ${isCompared ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-950/80 text-cyan-400 border-slate-800'}`} title="შედარებაში">
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => setSelectedProductQuickView(prod)} className="absolute bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition duration-300 bg-slate-950 text-emerald-400 text-[9px] font-bold px-3 py-1 rounded-lg border border-emerald-500/40">
                            <Eye className="w-3 h-3 inline mr-1" /> სწრაფი ნახვა
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">{prod.category} {prod.brand ? `• ${prod.brand}` : ''}</span>
                          <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                            🏪 {prod.vendor || 'GEOSTORE'}
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-xs md:text-sm mb-1 line-clamp-2">{prod.name}</h3>
                        <p className="text-[10px] text-teal-400 font-semibold mb-2.5">💳 განვადება: თვეში ~{monthlyInstallment} ₾-დან</p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="text-base md:text-lg font-black text-emerald-400">{formatPrice(prod.priceGEL)}</div>
                            {prod.oldPriceGEL > prod.priceGEL && (
                              <div className="text-[11px] text-slate-500 line-through font-medium">{formatPrice(prod.oldPriceGEL)}</div>
                            )}
                          </div>
                          {prod.stock <= 0 && (
                            <button onClick={() => setPriceAlertModal(prod)} className="text-[9px] text-amber-400 hover:underline flex items-center gap-1 font-bold">
                              <Bell className="w-3 h-3" /> შემატყობინე
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button disabled={prod.stock <= 0} onClick={() => addToCart(prod)} className={`py-2 rounded-xl text-xs font-black transition ${prod.stock > 0 ? 'bg-emerald-500 text-slate-950 shadow hover:bg-emerald-400' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
                            {prod.stock > 0 ? (prod.isPreOrder ? 'Pre-Order' : 'კალათაში') : 'არ არის'}
                          </button>
                          <button disabled={prod.stock <= 0} onClick={() => { setQuickBuyProduct(prod); setIsCheckoutOpen(true); }} className={`py-2 rounded-xl text-xs font-black border transition ${prod.stock > 0 ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:bg-slate-900' : 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'}`}>
                            1-Click ყიდვა
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (sec.id === 'badges') {
          return (
            <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div><h4 className="font-bold text-white text-xs">სწრაფი მიწოდება</h4><p className="text-[9px] text-slate-400">მთელ საქართველოში</p></div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div><h4 className="font-bold text-white text-xs">1 წლიანი გარანტია</h4><p className="text-[9px] text-slate-400">ოფიციალური სერვისი</p></div>
              </div>
            </div>
          );
        }

        if (sec.id === 'faq') {
          return (
            <div key={sec.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 w-full">
              <h2 className="text-base md:text-lg font-black text-white">ხშირად დასმული კითხვები</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-emerald-400 text-xs mb-1">როგორ ხდება მიწოდება?</h4>
                  <p className="text-slate-400 text-[11px]">{storePolicy.delivery}</p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-400 text-xs mb-1">მოქმედებს თუ არა გარანტია?</h4>
                  <p className="text-slate-400 text-[11px]">{storePolicy.warranty}</p>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
