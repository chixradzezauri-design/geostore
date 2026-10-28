// src/components/StoreView.jsx - Fashion Edition with "Shop the Look" Feature
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, 
  CheckCircle2, Eye, Award, Star, Smartphone, Laptop, Headphones, Watch, 
  Camera as CameraIcon, Tv, Speaker, SlidersHorizontal, ArrowUpDown, Calculator, Scale, MessageSquare, Timer, Ruler, Layers 
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

  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('შავი');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ hours: 11, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    setSelectedSize('M');
    setSelectedColor('შავი');
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

  const flashSaleProducts = useMemo(() => {
    return (filteredProducts || []).filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL).slice(0, 4);
  }, [filteredProducts]);

  // დამხმარე ფუნქცია "Shop the Look" შეთავაზებისთვის (პოულობს სხვა პროდუქტს ბაზიდან)
  const getComplementaryProduct = (currentProd) => {
    if (!filteredProducts || filteredProducts.length <= 1) return null;
    const others = filteredProducts.filter(p => p.id !== currentProd.id);
    if (others.length === 0) return null;
    // ირჩევს სხვა პროდუქტს მუდმივად მიმდინარე აიდის მიხედვით
    const index = currentProd.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % others.length;
    return others[index];
  };

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
    <div className="space-y-8 w-full pb-28 animate-in fade-in duration-500">
      
      {/* 🌟 COMPACT MINIMALIST HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0e0e12] via-[#09090b] to-[#050507] border border-amber-500/30 rounded-[2rem] p-5 sm:p-8 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 group">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-inner">
            <Award className="w-3.5 h-3.5 text-amber-400" /> ოფიციალური პრემიუმ ბუტიკი
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
            {siteSettings?.heroTitle || 'GEOSTORE — მოდისა და სტილის ონლაინ ბუტიკი'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-xl">
            {siteSettings?.heroSubtitle || 'აღმოაჩინეთ უმაღლესი ხარისხის ტანსაცმელი და აქსესუარები.'}
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-amber-200/90 font-bold bg-[#121216] px-3.5 py-2 rounded-xl border border-amber-500/20 shadow-sm"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> ადგილზე მორგება</span>
            <span className="flex items-center gap-1.5 text-[11px] text-amber-200/90 font-bold bg-[#121216] px-3.5 py-2 rounded-xl border border-amber-500/20 shadow-sm"><Zap className="w-3.5 h-3.5 text-amber-400" /> სწრაფი მიწოდება</span>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-3 shrink-0 z-10 w-72">
          {(promoSlots || []).slice(0, 2).map((slot) => (
            <div key={slot.id} className="bg-[#121216] border border-amber-500/30 p-4 rounded-2xl shadow-xl flex items-center justify-between group/card hover:border-amber-400 transition-all duration-300">
              <div>
                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> {slot.tag}</span>
                <h4 className="text-xs font-bold text-white mt-0.5">{slot.title}</h4>
              </div>
              <div className="bg-[#1a1a20] p-2.5 rounded-xl border border-amber-500/20">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚡ FLASH SALE COUNTDOWN SECTION */}
      {flashSaleProducts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-[#0e0e12] to-amber-950/40 border border-amber-500/30 rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 p-3 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/30 animate-pulse">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  ⚡ FLASH SALE <span className="text-amber-400 text-xs bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">დროში შეზღუდული შეთავაზება</span>
                </h3>
                <p className="text-slate-400 text-xs">იჩქარეთ, ფასდაკლება იწურება!</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 text-xs font-black">
              <div className="bg-[#141418] border border-amber-500/30 px-4 py-2.5 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-base">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="block text-[9px] text-slate-400 uppercase">საათი</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="bg-[#141418] border border-amber-500/30 px-4 py-2.5 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-base">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="block text-[9px] text-slate-400 uppercase">წუთი</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="bg-[#141418] border border-amber-500/30 px-4 py-2.5 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-base">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="block text-[9px] text-slate-400 uppercase">წამი</span>
              </div>
            </div>
          </div>

          {/* Flash Sale Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {flashSaleProducts.map(prod => {
              return (
                <div key={`flash-${prod.id}`} className="group bg-[#060608] border border-amber-500/20 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-400 transition-all shadow-xl">
                  <div onClick={() => handleOpenProduct(prod)} className="relative bg-[#0d0d12] rounded-2xl p-4 h-44 flex items-center justify-center cursor-pointer overflow-hidden">
                    <img src={prod.image} alt="" className="h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-rose-500 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">SALE</span>
                  </div>
                  <div className="py-3 space-y-1.5">
                    <h4 onClick={() => handleOpenProduct(prod)} className="font-black text-white text-xs line-clamp-1 cursor-pointer hover:text-amber-300">{prod.name}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-amber-400 font-black text-sm">{formatPrice(prod.priceGEL)}</span>
                      {prod.oldPriceGEL && <span className="text-slate-500 font-bold text-[11px] line-through">{formatPrice(prod.oldPriceGEL)}</span>}
                    </div>
                  </div>
                  <button onClick={() => addToCart(prod)} className="w-full bg-[#16161a] hover:bg-amber-400 hover:text-slate-950 text-white font-black py-2.5 rounded-xl text-xs transition border border-amber-500/20 cursor-pointer">
                    კალათაში
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <button 
            onClick={() => setSelectedProduct(null)} 
            className="fixed top-4 right-4 sm:absolute sm:top-6 sm:right-6 p-3.5 bg-[#1e1e24] hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 rounded-2xl border border-amber-500/40 transition cursor-pointer z-[10000] shadow-2xl"
            title="დახურვა"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative bg-[#0d0d10] border border-amber-500/55 rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-6 pt-20 sm:pt-10 my-auto mb-10">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-5">
                <div className="bg-[#060608] rounded-[2.5rem] p-6 border border-amber-500/30 flex items-center justify-center h-64 sm:h-80 shadow-2xl">
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

              <div className="space-y-6 text-xs max-h-[60vh] sm:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                    <span className="text-[11px] text-slate-400 font-bold bg-[#141418] px-3.5 py-1.5 rounded-xl border border-amber-500/20">SKU: {selectedProduct.sku || 'N/A'}</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-tight pt-2">{selectedProduct.name}</h2>
                  <p className="text-slate-400 text-xs">მომწოდებელი: <b className="text-amber-300">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                </div>

                <div className="bg-[#141418] p-5 rounded-3xl border border-amber-500/30 flex items-baseline gap-4 shadow-inner">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">{formatPrice(selectedProduct.priceGEL)}</span>
                  {selectedProduct.oldPriceGEL && <span className="text-slate-500 font-bold line-through text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>}
                </div>

                {/* 👕 ზომების არჩევანი (Size Selector) */}
                <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-bold">აირჩიეთ ზომა: <b className="text-amber-400">{selectedSize}</b></span>
                    <button onClick={() => setIsSizeGuideOpen(true)} className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] underline cursor-pointer">
                      <Ruler className="w-3.5 h-3.5" /> ზომების გიდი
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`flex-1 py-2.5 rounded-xl font-black text-xs transition cursor-pointer border ${selectedSize === size ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105' : 'bg-[#08080a] text-slate-400 border-amber-500/20 hover:text-white'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🎨 ფერების არჩევანი (Color Selector) */}
                <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/20">
                  <span className="text-slate-300 font-bold block">ფერი: <b className="text-amber-400">{selectedColor}</b></span>
                  <div className="flex gap-3">
                    {[
                      { name: 'შავი', bg: 'bg-slate-900 border-amber-400' },
                      { name: 'თეთრი', bg: 'bg-slate-100 border-slate-300' },
                      { name: 'კრემისფერი', bg: 'bg-amber-100 border-amber-300' },
                      { name: 'ლურჯი', bg: 'bg-blue-600 border-blue-400' }
                    ].map(col => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setSelectedColor(col.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${selectedColor === col.name ? 'border-amber-400 bg-amber-500/10 text-amber-300' : 'border-amber-500/20 bg-[#08080a] text-slate-400'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border ${col.bg}`}></span>
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ✨ "SHOP THE LOOK" / COMPLETE THE LOOK SECTION */}
                {getComplementaryProduct(selectedProduct) && (() => {
                  const compProd = getComplementaryProduct(selectedProduct);
                  return (
                    <div className="bg-gradient-to-r from-amber-950/30 via-[#121216] to-amber-950/30 p-4 rounded-3xl border border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                        <Layers className="w-4 h-4" /> შეუხამე ეს ლუქი (Complete the Look)
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-[#08080a] p-3 rounded-2xl border border-amber-500/20">
                        <div className="flex items-center gap-3">
                          <img src={compProd.image} alt="" className="w-12 h-12 object-contain bg-slate-950 rounded-xl p-1 border border-amber-500/20" />
                          <div>
                            <h4 className="font-bold text-white text-xs line-clamp-1">{compProd.name}</h4>
                            <span className="text-amber-400 font-black text-xs">{formatPrice(compProd.priceGEL)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          addToCart({ ...selectedProduct, name: `${selectedProduct.name} (${selectedSize}, ${selectedColor})` });
                          addToCart(compProd);
                          setSelectedProduct(null);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow-lg cursor-pointer"
                      >
                        🛍️ მთლიანი ლუქის დამატება კალათაში (დაზოგე)
                      </button>
                    </div>
                  );
                })()}

                <div className="space-y-2 bg-[#101014] p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                  <span className="text-amber-300 font-bold block text-sm">პროდუქტის აღწერა:</span>
                  <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">{selectedProduct.description || 'მაღალი ხარისხის პრემიუმ ტანსაცმელი ყოველდღიური სტილისთვის.'}</p>
                </div>

                <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" /> 
                  <span>მარაგშია: <b className="text-amber-400 font-black">ხელმისაწვდომია</b> (მორგება მიტანისას)</span>
                </div>

                {/* ⭐ REVIEWS & RATINGS SECTION */}
                <div className="space-y-4 pt-4 border-t border-amber-500/20">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" /> მომხმარებელთა შეფასებები ({(allReviews[selectedProduct.id] || []).length})
                  </h3>

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

                {/* 🛒 კალათაში დამატება არჩეული ზომითა და ფერით */}
                <button 
                  onClick={() => { 
                    addToCart({ ...selectedProduct, name: `${selectedProduct.name} (${selectedSize}, ${selectedColor})` }); 
                    setSelectedProduct(null); 
                  }} 
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4.5 rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 mt-6"
                >
                  <ShoppingBag className="w-5 h-5" /> კალათაში დამატება ({selectedSize} / {selectedColor})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📏 ზომების გიდის მოდალი (Size Guide Modal) */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d10] border border-amber-500/40 rounded-[2.5rem] p-7 max-w-md w-full space-y-5 text-xs text-white shadow-2xl relative">
            <button onClick={() => setIsSizeGuideOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            
            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Ruler className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">ზომების გიდი (Size Chart)</h3>
                <p className="text-[11px] text-slate-400">სტანდარტული გაზომვები სანტიმეტრებში</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="border-b border-amber-500/20 text-amber-400">
                    <th className="py-2.5">ზომა</th>
                    <th className="py-2.5">გულმკერდი</th>
                    <th className="py-2.5">წელი</th>
                    <th className="py-2.5">მხრები</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr><td className="py-2 font-bold text-amber-300">S</td><td>88-92</td><td>70-74</td><td>42</td></tr>
                  <tr><td className="py-2 font-bold text-amber-300">M</td><td>93-96</td><td>75-79</td><td>44</td></tr>
                  <tr><td className="py-2 font-bold text-amber-300">L</td><td>97-102</td><td>80-85</td><td>46</td></tr>
                  <tr><td className="py-2 font-bold text-amber-300">XL</td><td>103-108</td><td>86-91</td><td>48</td></tr>
                  <tr><td className="py-2 font-bold text-amber-300">XXL</td><td>109-114</td><td>92-98</td><td>50</td></tr>
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              გასაგებია
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
