// src/components/StoreView.jsx - Luxury Boutique with Advanced Filters, Comparison & Reviews/Ratings
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, 
  CheckCircle2, Eye, Award, Star, Smartphone, Laptop, Headphones, Watch, 
  Camera as CameraIcon, Tv, Speaker, SlidersHorizontal, ArrowUpDown, Calculator, Scale, MessageSquare 
} from 'lucide-react';

export default function StoreView({
  siteSettings,
  promoSlots,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  wishlist,
  toggleWishlist,
  comparisonList = [],
  toggleComparison,
  addToCart,
  formatPrice
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const [sortBy, setSortBy] = useState('default');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [installmentMonths, setInstallmentMonths] = useState(12);

  // ⭐ შეფასებების state-ები
  const [allReviews, setAllReviews] = useState(() => {
    try { const saved = localStorage.getItem('geostore_product_reviews'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);

  useEffect(() => {
    try { localStorage.setItem('geostore_product_reviews', JSON.stringify(allReviews)); } catch {}
  }, [allReviews]);

  const handleOpenProduct = (prod) => {
    setSelectedProduct(prod);
    setActiveImage(prod.image);
    setInstallmentMonths(12);
    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
  };

  const handleAddReview = (e, productId) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const reviewObj = {
      id: `rev-${Date.now()}`,
      author: newReviewAuthor.trim(),
      comment: newReviewComment.trim(),
      rating: Number(newReviewRating),
      date: new Date().toLocaleDateString('ka-GE')
    };

    setAllReviews(prev => {
      const currentProdReviews = prev[productId] || [];
      return {
        ...prev,
        [productId]: [reviewObj, ...currentProdReviews]
      };
    });

    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
  };

  const processedProducts = useMemo(() => {
    let result = [...(filteredProducts || [])];

    if (minPrice !== '' && !isNaN(minPrice)) {
      result = result.filter(p => p.priceGEL >= Number(minPrice));
    }
    if (maxPrice !== '' && !isNaN(maxPrice)) {
      result = result.filter(p => p.priceGEL <= Number(maxPrice));
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.priceGEL - b.priceGEL);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.priceGEL - a.priceGEL);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
    }

    return result;
  }, [filteredProducts, minPrice, maxPrice, sortBy]);

  const getCategoryIcon = (catName) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('სმარტფონ') || name.includes('phone') || name.includes('მობილურ')) return <Smartphone className="w-4 h-4 text-amber-400" />;
    if (name.includes('ლაპტოპ') || name.includes('computer') || name.includes('კომპიუტერ') || name.includes('notebook')) return <Laptop className="w-4 h-4 text-amber-400" />;
    if (name.includes('ყურსასმენ') || name.includes('audio') || name.includes('sound') || name.includes('აუდიო')) return <Headphones className="w-4 h-4 text-amber-400" />;
    if (name.includes('საათ') || name.includes('watch')) return <Watch className="w-4 h-4 text-amber-400" />;
    if (name.includes('ფოტო') || name.includes('camera') || name.includes('ვიდეო')) return <CameraIcon className="w-4 h-4 text-amber-400" />;
    if (name.includes('ტელევიზორ') || name.includes('tv')) return <Tv className="w-4 h-4 text-amber-400" />;
    if (name.includes('დინამიკ') || name.includes('speaker')) return <Speaker className="w-4 h-4 text-amber-400" />;
    return <Sparkles className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-12 w-full pb-28 animate-in fade-in duration-500">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0e0e12] via-[#09090b] to-[#050507] border border-amber-500/30 rounded-[3rem] p-8 md:p-16 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-10 group">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[160px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700"></div>

        <div className="space-y-6 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase shadow-inner">
            <Award className="w-4 h-4 text-amber-400" /> ოფიციალური პრემიუმ ბუტიკი
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
            {siteSettings?.heroTitle || 'GEOSTORE — ელიტარული ტექნოლოგიები'}
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-normal leading-relaxed">
            {siteSettings?.heroSubtitle || 'აღმოაჩინეთ უმაღლესი ხარისხის პროდუქცია განსაკუთრებული პირობებითა და გარანტიით.'}
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2">
            <span className="flex items-center gap-2 text-xs text-amber-200/90 font-bold bg-[#121216] px-4.5 py-2.5 rounded-2xl border border-amber-500/20 shadow-sm"><ShieldCheck className="w-4 h-4 text-amber-400" /> ოფიციალური გარანტია</span>
            <span className="flex items-center gap-2 text-xs text-amber-200/90 font-bold bg-[#121216] px-4.5 py-2.5 rounded-2xl border border-amber-500/20 shadow-sm"><Zap className="w-4 h-4 text-amber-400" /> VIP მიწოდება</span>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4 shrink-0 z-10 w-80">
          {(promoSlots || []).slice(0, 2).map((slot) => (
            <div key={slot.id} className="bg-[#121216] border border-amber-500/30 p-5 rounded-3xl shadow-2xl flex items-center justify-between group/card hover:border-amber-400 transition-all duration-300 hover:scale-105">
              <div>
                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> {slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-1 group-hover/card:text-amber-300 transition-colors">{slot.title}</h4>
              </div>
              <div className="bg-[#1a1a20] p-3 rounded-2xl border border-amber-500/20 group-hover/card:bg-amber-400 group-hover/card:text-slate-950 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover/card:text-slate-950" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> კატეგორიები
          </h3>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/20 shadow-inner">
            {processedProducts?.length || 0} პროდუქტი ვიტრინაზე
          </span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none px-1">
          <button 
            onClick={() => setSelectedCategory('ყველა')} 
            className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 cursor-pointer shadow-lg ${
              selectedCategory === 'ყველა' 
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50' 
                : 'bg-[#121216] text-slate-400 border border-amber-500/15 hover:text-white hover:border-amber-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-slate-950" /> ყველა კატეგორია
          </button>
          
          {(categories || []).map(cat => {
            const catName = typeof cat === 'object' ? cat.name : cat;
            return (
              <button 
                key={cat.id || catName} 
                onClick={() => setSelectedCategory(catName)} 
                className={`px-6 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 cursor-pointer shadow-lg ${
                  selectedCategory === catName 
                    ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50' 
                    : 'bg-[#121216] text-slate-400 border border-amber-500/15 hover:text-white hover:border-amber-500/30'
                }`}
              >
                {getCategoryIcon(catName)}
                <span>{catName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="bg-[#0e0e12] border border-amber-500/20 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" /> ფასი (₾):
          </div>
          <input 
            type="number" 
            placeholder="Min" 
            value={minPrice} 
            onChange={e => setMinPrice(e.target.value)}
            className="w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          <span className="text-slate-500">-</span>
          <input 
            type="number" 
            placeholder="Max" 
            value={maxPrice} 
            onChange={e => setMaxPrice(e.target.value)}
            className="w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          {(minPrice !== '' || maxPrice !== '') && (
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-amber-400 hover:text-amber-300 font-bold underline px-2 cursor-pointer">გასუფთავება</button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <ArrowUpDown className="w-4 h-4 text-amber-400" /> დალაგება:
          </div>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#060608] border border-amber-500/20 text-white rounded-xl p-2.5 outline-none focus:border-amber-400 shadow-inner cursor-pointer font-bold"
          >
            <option value="default">ნაგულისხმევი</option>
            <option value="price-asc">ფასით: დაბლიდან მაღლა ⬆</option>
            <option value="price-desc">ფასით: მაღლიდან დაბლა ⬇</option>
            <option value="name-asc">დასახელებით (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {processedProducts.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e12] border border-amber-500/20 rounded-[2.5rem]">
          <p className="text-slate-400 text-sm font-bold">მითითებული ფილტრებით პროდუქტები ვერ მოიძებნა.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {processedProducts.map(prod => {
            const isWish = wishlist.some(w => w.id === prod.id);
            const isCompared = comparisonList.some(c => c.id === prod.id);
            const prodReviews = allReviews[prod.id] || [];
            const avgRating = prodReviews.length > 0 
              ? (prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length).toFixed(1) 
              : '5.0';
            const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

            return (
              <div key={prod.id} className="group bg-[#0e0e12] border border-amber-500/20 rounded-[2.5rem] p-5 flex flex-col justify-between hover:border-amber-400 transition-all duration-500 shadow-2xl hover:shadow-amber-500/15">
                
                <div 
                  onClick={() => handleOpenProduct(prod)}
                  className="relative bg-[#060608] rounded-3xl p-6 border border-amber-500/10 flex items-center justify-center h-60 overflow-hidden cursor-pointer group/img"
                >
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700 drop-shadow-xl" />
                  
                  {/* Wishlist Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                    className="absolute top-4 right-4 p-3 bg-[#121216]/90 backdrop-blur-md rounded-2xl text-rose-400 border border-amber-500/20 hover:scale-110 transition cursor-pointer z-10 shadow-lg"
                    title="სურვილების სიაში დამატება"
                  >
                    <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* ⚖️ Compare Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleComparison(prod); }} 
                    className={`absolute top-16 right-4 p-3 backdrop-blur-md rounded-2xl border transition cursor-pointer z-10 shadow-lg ${isCompared ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#121216]/90 text-amber-400 border-amber-500/20 hover:scale-110'}`}
                    title="შედარებაში დამატება"
                  >
                    <Scale className="w-4 h-4" />
                  </button>

                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                    {prod.oldPriceGEL && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow">ფასდაკლება</span>
                    )}
                    {tagsArray.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow">{tag}</span>
                    ))}
                  </div>

                  <div className="absolute inset-0 bg-[#060608]/80 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-xs font-black text-amber-300 backdrop-blur-sm">
                    <Eye className="w-4 h-4 text-amber-400" /> დეტალურად ნახვა
                  </div>
                </div>

                <div className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider bg-[#16161a] px-3 py-1 rounded-lg border border-amber-500/20">{prod.vendor || 'GEOSTORE'}</span>
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[10px] font-bold text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {avgRating} ({prodReviews.length})
                    </div>
                  </div>
                  <h3 onClick={() => handleOpenProduct(prod)} className="font-black text-white text-sm leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors cursor-pointer">{prod.name}</h3>
                  <div className="flex items-baseline gap-3 pt-1">
                    <p className="text-amber-400 font-black text-lg">{formatPrice(prod.priceGEL)}</p>
                    {prod.oldPriceGEL && <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>}
                  </div>
                </div>

                <button 
                  onClick={() => addToCart(prod)} 
                  className="w-full bg-[#16161a] hover:bg-amber-400 hover:text-slate-950 text-white font-black py-4 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-amber-500/30 shadow-lg cursor-pointer active:scale-95 group/btn"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400 group-hover/btn:text-slate-950 transition-colors" /> კალათაში დამატება
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal with Reviews & Ratings */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative bg-[#0d0d10] border border-amber-500/40 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl p-8 md:p-10 space-y-8">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-3 bg-[#141418] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl border border-amber-500/20 transition cursor-pointer z-20 shadow">
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              <div className="space-y-5">
                <div className="bg-[#060608] rounded-[2.5rem] p-8 border border-amber-500/30 flex items-center justify-center h-72 md:h-80 shadow-2xl">
                  <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {selectedProduct.gallery.map((img, idx) => (
                      <button key={idx} onClick={() => setActiveImage(img)} className={`w-20 h-20 bg-[#060608] rounded-2xl p-2 border-2 transition cursor-pointer shrink-0 shadow ${activeImage === img ? 'border-amber-400 scale-105' : 'border-amber-500/20 hover:border-amber-400/50'}`}>
                        <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6 text-xs max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                    <span className="text-[11px] text-slate-400 font-bold bg-[#141418] px-3.5 py-1.5 rounded-xl border border-amber-500/20">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight pt-2">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs">მომწოდებელი: <b className="text-amber-300">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                <div className="bg-[#141418] p-5 rounded-3xl border border-amber-500/30 flex items-baseline gap-4 shadow-inner">
                  <span className="text-3xl font-black text-amber-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && <span className="text-slate-500 font-bold line-through text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>}
                </div>

                <div className="bg-[#08080a] p-5 rounded-3xl border border-amber-500/30 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-black flex items-center gap-2 text-xs"><Calculator className="w-4 h-4" /> 0% განვადების კალკულატორი</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg">თვეში: {Math.round(selectedProduct.priceGEL / installmentMonths)} ₾</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {[6, 12, 24].map(m => (
                      <button key={m} type="button" onClick={() => setInstallmentMonths(m)} className={`flex-1 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${installmentMonths === m ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#141418] text-slate-400 border-amber-500/20 hover:text-white'}`}>{m} თვე</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 bg-[#101014] p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                  <span className="text-amber-300 font-bold block text-sm">პროდუქტის აღწერა:</span>
                  <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">{selectedProduct.description || 'ამ პროდუქტის დეტალური აღწერა ჯერ არ არის დამატებული.'}</p>
                </div>

                <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" /> 
                  <span>ხელმისაწვდომია მარაგში: <b className="text-amber-400 font-black">{selectedProduct.stock || 1} ცალი</b></span>
                </div>

                {/* ⭐ REVIEWS & RATINGS SECTION */}
                <div className="space-y-4 pt-4 border-t border-amber-500/20">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" /> მომხმარებელთა შეფასებები ({(allReviews[selectedProduct.id] || []).length})
                  </h3>

                  {/* Add Review Form */}
                  <form onSubmit={(e) => handleAddReview(e, selectedProduct.id)} className="bg-[#121216] p-4 rounded-3xl border border-amber-500/20 space-y-3">
                    <span className="text-amber-300 font-bold block text-xs">დატოვეთ თქვენი შეფასება:</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-400">შეფასება:</span>
                      <select 
                        value={newReviewRating} 
                        onChange={e => setNewReviewRating(Number(e.target.value))}
                        className="bg-[#060608] text-amber-400 font-bold border border-amber-500/30 rounded-xl p-2 outline-none text-xs"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                        <option value="4">⭐⭐⭐⭐ (4)</option>
                        <option value="3">⭐⭐⭐ (3)</option>
                        <option value="2">⭐⭐ (2)</option>
                        <option value="1">⭐ (1)</option>
                      </select>
                    </div>
                    <input 
                      type="text" 
                      placeholder="თქვენი სახელი *" 
                      value={newReviewAuthor} 
                      onChange={e => setNewReviewAuthor(e.target.value)}
                      required
                      className="w-full bg-[#060608] border border-amber-500/20 p-3 rounded-2xl text-white outline-none focus:border-amber-400"
                    />
                    <textarea 
                      placeholder="თქვენი კომენტარი პროდუქტზე..." 
                      value={newReviewComment} 
                      onChange={e => setNewReviewComment(e.target.value)}
                      required
                      rows="2"
                      className="w-full bg-[#060608] border border-amber-500/20 p-3 rounded-2xl text-white outline-none focus:border-amber-400 resize-none"
                    ></textarea>
                    <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer">
                      შეფასების გამოქვეყნება
                    </button>
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-3 pt-2">
                    {(!allReviews[selectedProduct.id] || allReviews[selectedProduct.id].length === 0) ? (
                      <p className="text-slate-500 text-xs text-center py-4">ამ პროდუქტზე ჯერ არ არის შეფასებები. იყავი პირველი!</p>
                    ) : (
                      allReviews[selectedProduct.id].map(rev => (
                        <div key={rev.id} className="bg-[#141418] p-4 rounded-2xl border border-amber-500/15 space-y-1.5 shadow-inner">
                          <div className="flex justify-between items-center">
                            <b className="text-white text-xs">{rev.author}</b>
                            <span className="text-[10px] text-slate-500">{rev.date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 text-xs">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4.5 rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 mt-6">
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
