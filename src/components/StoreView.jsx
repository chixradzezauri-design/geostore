// src/components/StoreView.jsx - Elite Smart Size System & Advanced Variants Edition (100% Full & Safe)
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, 
  CheckCircle2, Eye, Award, Star, Smartphone, Laptop, Headphones, Watch, 
  Camera as CameraIcon, Tv, Speaker, SlidersHorizontal, ArrowUpDown, Calculator, Scale, MessageSquare, Timer, Ruler, Layers, Image as ImageIcon, Gift, PackageCheck, FileText, ShieldAlert, Compass, Footprints, ChevronDown, FolderTree, CornerDownRight 
} from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

export default function StoreView({
  siteSettings,
  promoSlots,
  categories = [],
  selectedCategory,
  setSelectedCategory,
  filteredProducts: initialFilteredProducts,
  wishlist,
  toggleWishlist,
  comparisonList = [],
  toggleComparison,
  addToCart,
  formatPrice
}) {
  const [dbProducts, setDbProducts] = useState([]);

  const fetchProductsFromSupabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          vendor: p.vendor,
          priceGEL: p.price_gel,
          oldPriceGEL: p.old_price_gel,
          stock: p.stock ?? 10,
          image: p.image,
          description: p.description,
          availableSizes: p.available_sizes || ['S', 'M', 'L', 'XL'],
          availableColors: p.available_colors || ['შავი', 'თეთრი'],
          variants: p.variants || [],
          material: p.material,
          durability: p.durability,
          tags: p.tags || [],
          gallery: p.gallery || [p.image]
        }));
        setDbProducts(formatted);
      }
    } catch {}
  };

  useEffect(() => {
    fetchProductsFromSupabase();
    const interval = setInterval(fetchProductsFromSupabase, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeProducts = dbProducts.length > 0 ? dbProducts : (initialFilteredProducts || []);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const [sortBy, setSortBy] = useState('default');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedCustomVariant, setSelectedCustomVariant] = useState(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // 🌟 ჭკვიანი ზომის შერჩევის სახელმწიფო (Smart Size Recommender)
  const [isSmartSizeModalOpen, setIsSmartSizeModalOpen] = useState(false);
  const [userHeight, setUserHeight] = useState('');
  const [userWeight, setUserWeight] = useState('');
  const [smartRecommendedSize, setSmartRecommendedSize] = useState(null);

  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [hasVipWarranty, setHasVipWarranty] = useState(false);

  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [openParentCatId, setOpenParentCatId] = useState(null);

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
  const [newReviewImage, setNewReviewImage] = useState('');

  useEffect(() => {
    try { localStorage.setItem('geostore_product_reviews', JSON.stringify(allReviews)); } catch {}
  }, [allReviews]);

  const handleOpenProduct = (prod) => {
    setSelectedProduct(prod);
    setActiveImage(prod.image);
    
    const defaultSizes = prod.availableSizes || ['S', 'M', 'L', 'XL'];
    setSelectedSize(defaultSizes[0] || 'M');

    const defaultColors = prod.availableColors || ['შავი'];
    setSelectedColor(defaultColors[0] || '');

    setSelectedCustomVariant(prod.variants && prod.variants.length > 0 ? prod.variants[0] : null);

    setIsGiftWrapped(false);
    setGiftMessage('');
    setHasVipWarranty(false);
    setSmartRecommendedSize(null);
    setUserHeight('');
    setUserWeight('');
    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
    setNewReviewImage('');
  };

  const handleCalculateSmartSize = (e) => {
    e.preventDefault();
    const h = Number(userHeight);
    const w = Number(userWeight);
    if (!h || !w) return;

    let rec = 'M';
    const cat = (selectedProduct?.category || '').toLowerCase();
    const isShoe = cat.includes('ფეხსაცმელ') || cat.includes('shoe');

    if (isShoe) {
      if (h < 165) rec = '39';
      else if (h < 172) rec = '40';
      else if (h < 178) rec = '41';
      else if (h < 184) rec = '42';
      else rec = '43';
    } else {
      if (w < 60) rec = 'S';
      else if (w < 72) rec = 'M';
      else if (w < 85) rec = 'L';
      else if (w < 98) rec = 'XL';
      else rec = 'XXL';
    }

    // შევამოწმოთ არის თუ არა მარაგში მითითებული ზომა
    const available = selectedProduct?.availableSizes || ['S', 'M', 'L', 'XL'];
    if (!available.includes(rec)) {
      rec = available[0] || 'M';
    }

    setSmartRecommendedSize(rec);
    setSelectedSize(rec);
  };

  const handleReviewImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewReviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddReview = (e, productId) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const reviewObj = {
      id: `rev-${Date.now()}`,
      author: newReviewAuthor.trim(),
      comment: newReviewComment.trim(),
      rating: Number(newReviewRating),
      image: newReviewImage || null,
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
    setNewReviewImage('');
  };

  const mainCategories = useMemo(() => {
    return (categories || []).filter(c => !c.parentId);
  }, [categories]);

  const getSubCategories = (parentId) => {
    return (categories || []).filter(c => c.parentId === parentId);
  };

  const processedProducts = useMemo(() => {
    let result = [...activeProducts];

    if (selectedSubCategory) {
      result = result.filter(p => p.category === selectedSubCategory);
    } else if (selectedCategory && selectedCategory !== 'ყველა') {
      const matchedParent = mainCategories.find(c => (typeof c === 'object' ? c.name : c) === selectedCategory);
      if (matchedParent) {
        const pId = matchedParent.id || matchedParent.name;
        const subNames = getSubCategories(pId).map(s => s.name);
        result = result.filter(p => p.category === selectedCategory || subNames.includes(p.category));
      } else {
        result = result.filter(p => p.category === selectedCategory);
      }
    }

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
  }, [activeProducts, selectedCategory, selectedSubCategory, minPrice, maxPrice, sortBy, mainCategories]);

  const flashSaleProducts = useMemo(() => {
    return activeProducts.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL).slice(0, 4);
  }, [activeProducts]);

  const getCategoryIcon = (catName) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('ფეხსაცმელ') || name.includes('shoe') || name.includes('sneaker') || name.includes('ბათინკ')) return <Footprints className="w-4 h-4 text-amber-400" />;
    if (name.includes('სმარტფონ') || name.includes('phone') || name.includes('მობილურ')) return <Smartphone className="w-4 h-4 text-amber-400" />;
    if (name.includes('ლაპტოპ') || name.includes('computer') || name.includes('კომპიუტერ') || name.includes('notebook')) return <Laptop className="w-4 h-4 text-amber-400" />;
    if (name.includes('ყურსასმენ') || name.includes('audio') || name.includes('sound') || name.includes('აუდიო')) return <Headphones className="w-4 h-4 text-amber-400" />;
    if (name.includes('საათ') || name.includes('watch')) return <Watch className="w-4 h-4 text-amber-400" />;
    if (name.includes('ფოტო') || name.includes('camera') || name.includes('ვიდეო')) return <CameraIcon className="w-4 h-4 text-amber-400" />;
    if (name.includes('ტელევიზორ') || name.includes('tv')) return <Tv className="w-4 h-4 text-amber-400" />;
    if (name.includes('დინამიკ') || name.includes('speaker')) return <Speaker className="w-4 h-4 text-amber-400" />;
    return <Sparkles className="w-4 h-4 text-amber-400" />;
  };

  const currentBasePrice = selectedCustomVariant ? selectedCustomVariant.priceGEL : (selectedProduct?.priceGEL || 0);

  return (
    <div className="space-y-6 sm:space-y-8 w-full pb-28 animate-in fade-in duration-500 overflow-x-hidden px-2 sm:px-0">
      
      {/* 🌟 HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0e0e12] via-[#09090b] to-[#050507] border border-amber-500/30 rounded-[2rem] p-5 sm:p-8 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 group">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-inner">
            <Award className="w-3.5 h-3.5 text-amber-400" /> ოფიციალური პრემიუმ ბუტიკი
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
            {siteSettings?.heroTitle || 'GEOSTORE — მოდისა და ფეხსაცმელების ბუტიკი'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-normal leading-relaxed max-w-xl">
            {siteSettings?.heroSubtitle || 'აღმოაჩინეთ ელიტარული ტანსაცმელი, ფეხსაცმელები და აქსესუარები.'}
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-amber-200/90 font-bold bg-[#121216] px-3.5 py-2 rounded-xl border border-amber-500/20 shadow-sm"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> ადგილზე მორგება</span>
            <span className="flex items-center gap-1.5 text-[11px] text-amber-200/90 font-bold bg-[#121216] px-3.5 py-2 rounded-xl border border-amber-500/20 shadow-sm"><Zap className="w-3.5 h-3.5 text-amber-400" /> VIP მიწოდება</span>
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
        <div className="bg-gradient-to-r from-amber-950/40 via-[#0e0e12] to-amber-950/40 border border-amber-500/30 rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 p-3 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/30 animate-pulse">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  ⚡ FLASH SALE <span className="text-amber-400 text-[10px] sm:text-xs bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">დროში შეზღუდული შეთავაზება</span>
                </h3>
                <p className="text-slate-400 text-xs">იჩქარეთ, ფასდაკლება იწურება!</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-black">
              <div className="bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">საათი</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">წუთი</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">წამი</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {flashSaleProducts.map(prod => {
              return (
                <div key={`flash-${prod.id}`} className="group bg-[#060608] border border-amber-500/20 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-400 transition-all shadow-xl">
                  <div onClick={() => handleOpenProduct(prod)} className="relative bg-[#0d0d12] rounded-2xl p-4 h-40 sm:h-44 flex items-center justify-center cursor-pointer overflow-hidden">
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

      {/* 📁 Categories & Subcategories Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <FolderTree className="w-4 h-4" /> მთავარი კატეგორიები და სუბკატეგორიები
          </h3>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 sm:px-4 py-1.5 rounded-xl border border-amber-500/20 shadow-inner">
            {processedProducts?.length || 0} პროდუქტი ვიტრინაზე
          </span>
        </div>
        
        {/* Main Categories Row */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
          <button 
            onClick={() => { setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); }} 
            className={`px-5 sm:px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
              selectedCategory === 'ყველა' 
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50' 
                : 'bg-[#121216] text-slate-400 border border-amber-500/15 hover:text-white hover:border-amber-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-slate-950" /> ყველა კატეგორია
          </button>
          
          {(mainCategories.length > 0 ? mainCategories : (categories || []).map(c => typeof c === 'object' ? c : { id: c, name: c })).map(cat => {
            const catName = cat.name;
            const catId = cat.id || catName;
            const subCats = getSubCategories(catId);
            const isSelected = selectedCategory === catName;
            const isOpen = openParentCatId === catId;

            return (
              <div key={catId} className="relative inline-block">
                <button 
                  onClick={() => { 
                    setSelectedCategory(catName); 
                    setSelectedSubCategory(null);
                    setOpenParentCatId(isOpen ? null : catId);
                  }} 
                  className={`px-5 sm:px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50' 
                      : 'bg-[#121216] text-slate-400 border border-amber-500/15 hover:text-white hover:border-amber-500/30'
                  }`}
                >
                  {getCategoryIcon(catName)}
                  <span>{catName}</span>
                  {subCats.length > 0 && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Subcategories Dropdown Bar */}
        {openParentCatId && (
          <div className="bg-[#0e0e12] border border-amber-500/30 p-4 rounded-3xl flex flex-wrap items-center gap-2.5 animate-in fade-in duration-300 shadow-xl">
            <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5 mr-2">
              <CornerDownRight className="w-3.5 h-3.5" /> სუბკატეგორიები:
            </span>
            <button
              onClick={() => setSelectedSubCategory(null)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${!selectedSubCategory ? 'bg-amber-400 text-slate-950 border-amber-400 shadow' : 'bg-[#141418] text-slate-300 border-amber-500/20 hover:text-white'}`}
            >
              ყველა ({selectedCategory})
            </button>
            {getSubCategories(openParentCatId).map(sub => (
              <button
                key={sub.id || sub.name}
                onClick={() => setSelectedSubCategory(sub.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${selectedSubCategory === sub.name ? 'bg-amber-400 text-slate-950 border-amber-400 shadow' : 'bg-[#141418] text-slate-300 border-amber-500/20 hover:text-white'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters & Sorting */}
      <div className="bg-[#0e0e12] border border-amber-500/20 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" /> ფასი:
          </div>
          <input 
            type="number" 
            placeholder="Min" 
            value={minPrice} 
            onChange={e => setMinPrice(e.target.value)}
            className="w-20 sm:w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          <span className="text-slate-500">-</span>
          <input 
            type="number" 
            placeholder="Max" 
            value={maxPrice} 
            onChange={e => setMaxPrice(e.target.value)}
            className="w-20 sm:w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          {(minPrice !== '' || maxPrice !== '') && (
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-amber-400 hover:text-amber-300 font-bold underline px-1 cursor-pointer">გასუფთავება</button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold shrink-0">
            <ArrowUpDown className="w-4 h-4 text-amber-400" /> დალაგება:
          </div>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#060608] border border-amber-500/20 text-white rounded-xl p-2.5 outline-none focus:border-amber-400 shadow-inner cursor-pointer font-bold w-full sm:w-auto"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
          {processedProducts.map(prod => {
            const isWish = wishlist.some(w => w.id === prod.id);
            const isCompared = comparisonList.some(c => c.id === prod.id);
            const prodReviews = allReviews[prod.id] || [];
            const avgRating = prodReviews.length > 0 
              ? (prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length).toFixed(1) 
              : '5.0';
            const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

            return (
              <div key={prod.id} className="group bg-[#0e0e12] border border-amber-500/20 rounded-[2.5rem] p-4 sm:p-5 flex flex-col justify-between hover:border-amber-400 transition-all duration-500 shadow-2xl hover:shadow-amber-500/15">
                
                <div 
                  onClick={() => handleOpenProduct(prod)}
                  className="relative bg-[#060608] rounded-3xl p-5 sm:p-6 border border-amber-500/10 flex items-center justify-center h-52 sm:h-60 overflow-hidden cursor-pointer group/img"
                >
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700 drop-shadow-xl" />
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2.5 sm:p-3 bg-[#121216]/90 backdrop-blur-md rounded-2xl text-rose-400 border border-amber-500/20 hover:scale-110 transition cursor-pointer z-10 shadow-lg"
                    title="სურვილების სიაში დამატება"
                  >
                    <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleComparison(prod); }} 
                    className={`absolute top-14 right-3 sm:top-16 sm:right-4 p-2.5 sm:p-3 backdrop-blur-md rounded-2xl border transition cursor-pointer z-10 shadow-lg ${isCompared ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#121216]/90 text-amber-400 border-amber-500/20 hover:scale-110'}`}
                    title="შედარებაში დამატება"
                  >
                    <Scale className="w-4 h-4" />
                  </button>

                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-10">
                    {prod.oldPriceGEL && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 sm:px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">ფასდაკლება</span>
                    )}
                    {tagsArray.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 sm:px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">{tag}</span>
                    ))}
                  </div>

                  <div className="absolute inset-0 bg-[#060608]/80 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-xs font-black text-amber-300 backdrop-blur-sm">
                    <Eye className="w-4 h-4 text-amber-400" /> დეტალურად ნახვა
                  </div>
                </div>

                <div className="py-3 sm:py-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider bg-[#16161a] px-2.5 py-1 rounded-lg border border-amber-500/20">{prod.vendor || 'GEOSTORE'}</span>
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[10px] font-bold text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {avgRating} ({prodReviews.length})
                    </div>
                  </div>
                  <h3 onClick={() => handleOpenProduct(prod)} className="font-black text-white text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors cursor-pointer">{prod.name}</h3>
                  <div className="flex items-baseline gap-2.5 pt-0.5">
                    <p className="text-amber-400 font-black text-base sm:text-lg">{formatPrice(prod.priceGEL)}</p>
                    {prod.oldPriceGEL && <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>}
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenProduct(prod)} 
                  className="w-full bg-[#16161a] hover:bg-amber-400 hover:text-slate-950 text-white font-black py-3.5 sm:py-4 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-2 border border-amber-500/30 shadow-lg cursor-pointer active:scale-95 group/btn"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400 group-hover/btn:text-slate-950 transition-colors" /> ზომის არჩევა & კალათა
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 100% SMOOTH & FIXED PRODUCT DETAIL MODAL WITH SMART SIZES & STOCK CHECK */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          
          <div className="relative bg-[#0d0d10] border border-amber-500/55 rounded-[2rem] sm:rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            
            <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-b border-amber-500/20 bg-[#121216]/90 shrink-0">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> პროდუქტის დეტალური ხედი & ჭკვიანი ზომები
              </span>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-2.5 bg-[#1e1e24] hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 rounded-2xl border border-amber-500/30 transition cursor-pointer shadow"
                title="დახურვა"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto space-y-6 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                
                <div className="space-y-4">
                  <div className="bg-[#060608] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 border border-amber-500/30 flex items-center justify-center h-60 sm:h-80 shadow-2xl">
                    <img src={activeImage || selectedProduct.image} alt="" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
                  </div>
                  
                  {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                    <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {selectedProduct.gallery.map((img, idx) => (
                        <button key={idx} onClick={() => setActiveImage(img)} className={`w-16 h-16 sm:w-20 sm:h-20 bg-[#060608] rounded-2xl p-2 border-2 transition cursor-pointer shrink-0 shadow ${activeImage === img ? 'border-amber-400 scale-105' : 'border-amber-500/20 hover:border-amber-400/50'}`}>
                          <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5 sm:space-y-6 text-xs w-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold bg-[#141418] px-3 py-1.5 rounded-xl border border-amber-500/20">SKU: {selectedProduct.sku || 'N/A'}</span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-tight pt-1">{selectedProduct.name}</h2>
                    <p className="text-slate-400 text-xs">მომწოდებელი: <b className="text-amber-300">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                  </div>

                  <div className="bg-[#141418] p-4 sm:p-5 rounded-3xl border border-amber-500/30 flex items-baseline gap-4 shadow-inner">
                    <span className="text-xl sm:text-3xl font-black text-amber-400">
                      {formatPrice(currentBasePrice + (isGiftWrapped ? 5 : 0) + (hasVipWarranty ? 15 : 0))}
                    </span>
                    {selectedProduct.oldPriceGEL && <span className="text-slate-500 font-bold line-through text-sm sm:text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>}
                  </div>

                  {/* 🌟 ინდივიდუალური ვარიანტები (Variants Selection) */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/30">
                      <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                        <Layers className="w-4 h-4" /> აირჩიეთ ინდივიდუალური ვარიანტი:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedProduct.variants.map(v => {
                          const isSel = selectedCustomVariant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedCustomVariant(v)}
                              className={`p-3 rounded-2xl text-left transition cursor-pointer border flex justify-between items-center ${isSel ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow' : 'bg-[#08080a] text-slate-300 border-amber-500/20 hover:border-amber-400/50'}`}
                            >
                              <span>{v.name}</span>
                              <span className="font-black">{v.priceGEL} ₾</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(selectedProduct.material || selectedProduct.durability) && (
                    <div className="bg-[#121216] p-3.5 sm:p-4 rounded-3xl border border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {selectedProduct.material && (
                        <div className="bg-[#08080a] p-3 rounded-2xl border border-amber-500/10">
                          <span className="text-slate-400 block text-[10px]">მასალა / შემადგენლობა</span>
                          <b className="text-white font-bold mt-0.5 block">{selectedProduct.material}</b>
                        </div>
                      )}
                      {selectedProduct.durability && (
                        <div className="bg-[#08080a] p-3 rounded-2xl border border-amber-500/10">
                          <span className="text-slate-400 block text-[10px]">მდგრადობა / მახასიათებელი</span>
                          <b className="text-amber-400 font-bold mt-0.5 block">{selectedProduct.durability}</b>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🌟 100% მარაგში არსებული ზომების სელექტორი & ჭკვიანი რეკომენდატორი */}
                  <div className="space-y-3 bg-[#121216] p-4 rounded-3xl border border-amber-500/20">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-slate-300 font-bold">აირჩიეთ ზომა (მხოლოდ მარაგშია): <b className="text-amber-400">{selectedSize}</b></span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsSmartSizeModalOpen(true)} className="text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-amber-500/20 transition shadow">
                          <Calculator className="w-3.5 h-3.5 text-amber-400" /> ჭკვიანი ზომის შერჩევა
                        </button>
                        <button onClick={() => setIsSizeGuideOpen(true)} className="text-slate-400 hover:text-white font-bold flex items-center gap-1 text-[11px] underline cursor-pointer">
                          <Ruler className="w-3.5 h-3.5" /> გიდი
                        </button>
                      </div>
                    </div>

                    {smartRecommendedSize && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-2xl text-amber-300 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>რეკომენდებული ზომა თქვენი პარამეტრებით: <b className="text-white underline">{smartRecommendedSize}</b></span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 w-full">
                      {(selectedProduct.availableSizes || ['S', 'M', 'L', 'XL']).map(size => {
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer border ${selectedSize === size ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105' : 'bg-[#08080a] text-slate-300 border-amber-500/20 hover:text-white'}`}
                          >
                            {size} 🟢
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {((selectedProduct.availableColors && selectedProduct.availableColors.length > 0) || selectedProduct.colors) && (
                    <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/20 w-full overflow-hidden">
                      <span className="text-slate-300 font-bold block">ფერი: <b className="text-amber-400">{selectedColor}</b></span>
                      <div className="flex flex-wrap gap-2.5 w-full">
                        {(selectedProduct.availableColors || (selectedProduct.colors ? selectedProduct.colors.split(',').map(c => c.trim()) : [])).map(colName => (
                          <button
                            key={colName}
                            type="button"
                            onClick={() => setSelectedColor(colName)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${selectedColor === colName ? 'border-amber-400 bg-amber-500/10 text-amber-300 shadow' : 'border-amber-500/20 bg-[#08080a] text-slate-400'}`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-amber-400/40 bg-amber-400/80"></span>
                            {colName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-amber-950/20 via-[#121216] to-amber-950/20 p-4 rounded-3xl border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsGiftWrapped(!isGiftWrapped)}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${isGiftWrapped ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#08080a] text-amber-400 border-amber-500/30'}`}>
                          <Gift className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">სასაჩუქრე პრემიუმ შეფუთვა</h4>
                          <p className="text-[10px] text-slate-400">ყუთი, ბაფთა და ბარათი (+5 ₾)</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={isGiftWrapped} onChange={() => setIsGiftWrapped(!isGiftWrapped)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
                    </div>

                    {isGiftWrapped && (
                      <div className="pt-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5 text-[11px]">
                          <FileText className="w-3.5 h-3.5" /> სასაჩუქრე ბარათის ტექსტი (უფასო):
                        </div>
                        <textarea
                          rows="2"
                          placeholder="ჩაწერეთ თქვენი სურვილი..."
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 text-xs resize-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-amber-950/20 via-[#121216] to-amber-950/20 p-4 rounded-3xl border border-amber-500/30 flex items-center justify-between cursor-pointer" onClick={() => setHasVipWarranty(!hasVipWarranty)}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl border ${hasVipWarranty ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#08080a] text-amber-400 border-amber-500/30'}`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">VIP დაზღვევა და გაფართოებული გარანტია (+1 წელი)</h4>
                        <p className="text-[10px] text-slate-400">სრული დაცვა დაზიანებისგან (+15 ₾)</p>
                      </div>
                    </div>
                    <input type="checkbox" checked={hasVipWarranty} onChange={() => setHasVipWarranty(!hasVipWarranty)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
                  </div>

                  <div className="space-y-2 bg-[#101014] p-4 sm:p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                    <span className="text-amber-300 font-bold block text-sm">პროდუქტის აღწერა:</span>
                    <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">{selectedProduct.description || 'უმაღლესი ხარისხის პრემიუმ პროდუქცია.'}</p>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/20">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" /> 
                    <span>მარაგშია: <b className="text-amber-400 font-black">ხელმისაწვდომია</b> (მორგება მიტანისას)</span>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-amber-500/20">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-400" /> მომხმარებელთა ფოტო-შეფასებები ({(allReviews[selectedProduct.id] || []).length})
                    </h3>

                    <form onSubmit={(e) => handleAddReview(e, selectedProduct.id)} className="bg-[#121216] p-4 rounded-3xl border border-amber-500/20 space-y-3">
                      <span className="text-amber-300 font-bold block text-xs">დატოვეთ შეფასება და ატვირთეთ ფოტო:</span>
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
                        placeholder="როგორ მოგეწონათ პროდუქტი?..." 
                        value={newReviewComment} 
                        onChange={e => setNewReviewComment(e.target.value)}
                        required
                        rows="2"
                        className="w-full bg-[#060608] border border-amber-500/20 p-3 rounded-2xl text-white outline-none focus:border-amber-400 resize-none"
                      ></textarea>

                      <div className="flex items-center gap-3 bg-[#060608] p-3 rounded-2xl border border-amber-500/20">
                        <label className="flex items-center gap-2 text-xs text-amber-400 font-bold cursor-pointer hover:underline">
                          <ImageIcon className="w-4 h-4" /> ატვირთეთ ფოტო:
                          <input type="file" accept="image/*" onChange={handleReviewImageChange} className="hidden" />
                        </label>
                        {newReviewImage && <span className="text-emerald-400 text-[10px] font-bold">✅ ფოტო არჩეულია</span>}
                      </div>

                      <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer">
                        შეფასების და ფოტოს გამოქვეყნება
                      </button>
                    </form>

                    <div className="space-y-3 pt-2">
                      {(!allReviews[selectedProduct.id] || allReviews[selectedProduct.id].length === 0) ? (
                        <p className="text-slate-500 text-xs text-center py-4">ამ პროდუქტზე ჯერ არ არის შეფასებები.</p>
                      ) : (
                        allReviews[selectedProduct.id].map(rev => (
                          <div key={rev.id} className="bg-[#141418] p-4 rounded-2xl border border-amber-500/15 space-y-2.5 shadow-inner">
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
                            {rev.image && (
                              <div className="mt-2">
                                <img src={rev.image} alt="UGC" className="w-24 h-24 object-cover rounded-xl border border-amber-500/30 shadow-md" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => { 
                      let customName = `${selectedProduct.name} (ზომა: ${selectedSize}${selectedColor ? `, ფერი: ${selectedColor}` : ''}${selectedCustomVariant ? ` [ვარიანტი: ${selectedCustomVariant.name}]` : ''})`;
                      if (isGiftWrapped) customName += ' + სასაჩუქრე შეფუთვა';
                      if (giftMessage.trim()) customName += ` [ბარათი: "${giftMessage}"]`;
                      if (hasVipWarranty) customName += ' + VIP გარანტია';

                      addToCart({ 
                        ...selectedProduct, 
                        priceGEL: currentBasePrice + (isGiftWrapped ? 5 : 0) + (hasVipWarranty ? 15 : 0),
                        name: customName,
                        selectedSize: selectedSize,
                        selectedColor: selectedColor
                      }); 
                      setSelectedProduct(null); 
                    }} 
                    className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4.5 rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 mt-6"
                  >
                    <ShoppingBag className="w-5 h-5" /> კალათაში დამატება (ზომა: {selectedSize})
                  </button>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🌟 ჭკვიანი ზომის შერჩევის მოდალი (Smart Size Recommender Modal) */}
      {isSmartSizeModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleCalculateSmartSize} className="bg-[#0d0d10] border border-amber-500/40 rounded-[2.5rem] p-7 max-w-md w-full space-y-5 text-xs text-white shadow-2xl relative">
            <button type="button" onClick={() => setIsSmartSizeModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            
            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Calculator className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">ჭკვიანი ზომის შერჩევა</h3>
                <p className="text-[11px] text-slate-400">მიეთითეთ თქვენი პარამეტრები</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">თქვენი სიმაღლე (სმ):</label>
                <input 
                  type="number" 
                  placeholder="მაგ: 178" 
                  required
                  value={userHeight}
                  onChange={e => setUserHeight(e.target.value)}
                  className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-3 text-white outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">თქვენი წონა (კგ):</label>
                <input 
                  type="number" 
                  placeholder="მაგ: 75" 
                  required
                  value={userWeight}
                  onChange={e => setUserWeight(e.target.value)}
                  className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-3 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              ზომის გამოთვლა & შერჩევა
            </button>
          </form>
        </div>
      )}

      {/* 📏 ზომების გიდის მოდალი */}
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
                <p className="text-[11px] text-slate-400">ტანსაცმელი და ფეხსაცმელები</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-amber-400 font-bold block mb-2">👕 ტანსაცმლის ზომები:</span>
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-400">
                      <th className="py-2">ზომა</th>
                      <th className="py-2">გულმკერდი</th>
                      <th className="py-2">წელი</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr><td className="py-1.5 font-bold text-amber-300">S</td><td>88-92</td><td>70-74</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">M</td><td>93-96</td><td>75-79</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">L</td><td>97-102</td><td>80-85</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">XL</td><td>103-108</td><td>86-91</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">XXL</td><td>109-115</td><td>92-98</td></tr>
                  </tbody>
                </table>
              </div>
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
