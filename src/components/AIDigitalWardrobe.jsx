// src/components/AIDigitalWardrobe.jsx - Full AI Digital Wardrobe & Personal Stylist
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Shirt, Footprints, Camera, Plus, Trash2, Zap, CloudSun, 
  Calendar, Check, ShoppingBag, Eye, RefreshCw, Tag, Heart, ArrowRight, Layers
} from 'lucide-react';

export default function AIDigitalWardrobe({ products = [], addToCart, formatPrice }) {
  // 🌟 მომხმარებლის გარდერობის სახელმწიფო (Local Storage ინტეგრაციით)
  const [wardrobe, setWardrobe] = useState(() => {
    try {
      const saved = localStorage.getItem('geostore_digital_wardrobe');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Remove only the two untouched demo garments; preserve all user-added wardrobe items.
      return parsed.filter((item) => !(
        (item?.id === 'w1' && item?.name === 'შავი ქურთუკი') ||
        (item?.id === 'w2' && item?.name === 'თეთრი სპორტული ბოტასი')
      ));
    } catch {
      return [];
    }
  });

  // 🌟 ახალი ნივთის დამატების ფორმის სახელმწიფო
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'ტანსაცმელი',
    subCategory: 'მაისური',
    color: 'შავი',
    season: 'ყველა სეზონი',
    image: ''
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 🌟 AI სტილისტის პარამეტრები
  const [weather, setWeather] = useState('მზიანი / თბილი');
  const [event, setEvent] = useState('ყოველდღიური (Casual)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('geostore_digital_wardrobe', JSON.stringify(wardrobe));
    } catch {}
  }, [wardrobe]);

  // 📸 ფოტოს ატვირთვა Base64 ფორმატში
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      alert('აირჩიეთ JPEG, PNG ან WebP ფოტო, მაქსიმუმ 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return alert('ფოტოს დამუშავება ვერ მოხერხდა.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setNewItem((previous) => ({ ...previous, image: canvas.toDataURL('image/webp', 0.82) }));
      };
      image.onerror = () => alert('ფოტოს წაკითხვა ვერ მოხერხდა.');
      image.src = reader.result;
    };
    reader.onerror = () => alert('ფოტოს წაკითხვა ვერ მოხერხდა.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ➕ გარდერობში ახალი ნივთის დამატება
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const createdItem = {
      id: `w-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      subCategory: newItem.subCategory,
      color: newItem.color,
      season: newItem.season,
      image: newItem.image || (
        newItem.category === 'ფეხსაცმელი'
          ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600'
          : newItem.category === 'აქსესუარები' || newItem.category === 'ჩანთები' || newItem.category === 'სამკაულები'
            ? 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600'
            : 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=600'
      )
    };

    setWardrobe(prev => [createdItem, ...prev]);
    setNewItem({ name: '', category: 'ტანსაცმელი', subCategory: 'მაისური', color: 'შავი', season: 'ყველა სეზონი', image: '' });
    setIsAddModalOpen(false);
  };

  // 🗑️ ნივთის წაშლა გარდერობიდან
  const handleDeleteItem = (id) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  // Rule-based outfit matching: deterministic, free and based only on the user's wardrobe.
  const handleGenerateOutfit = () => {
    setIsGenerating(true);
    setGeneratedOutfit(null);

    window.setTimeout(() => {
      const isCold = weather.includes('ცივი') || weather.includes('წვიმიანი') || weather.includes('ქარიანი');
      const seasonMatches = (item) => {
        const season = String(item.season || '').toLowerCase();
        return season.includes('ყველა') || (isCold
          ? season.includes('ზამთ') || season.includes('შემოდგომ')
          : season.includes('ზაფხ') || season.includes('გაზაფხ'));
      };
      const scoreWardrobeItem = (item) => {
        const text = [item.name, item.subCategory, item.color, item.season].filter(Boolean).join(' ').toLowerCase();
        let score = seasonMatches(item) ? 3 : 0;
        if (event.includes('სპორტ') && /სპორტ|ბოტას|სნიკერ|ვარჯიშ/.test(text)) score += 3;
        if (event.includes('ოფიციალურ') && /კლასიკ|პიჯაკ|პერანგ|შარვალ|ქუსლ/.test(text)) score += 3;
        if (event.includes('წვეულ') && /კაბ|ელეგანტ|ქუსლ|სამკაულ|ჩანთა/.test(text)) score += 3;
        if (event.includes('Casual') && /ჯინს|მაისურ|კედ|ბოტას|ყოველდღ/.test(text)) score += 2;
        if (/შავი|თეთრი|ნაცრისფერი|ბეჟი|ლურჯი/.test(text)) score += 1;
        return score;
      };
      const pickBest = (items) => [...items].sort((a, b) =>
        scoreWardrobeItem(b) - scoreWardrobeItem(a) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'ka')
      )[0] || null;

      const clothes = wardrobe.filter((item) => item.category === 'ტანსაცმელი');
      const footwear = wardrobe.filter((item) => item.category === 'ფეხსაცმელი');
      const accessories = wardrobe.filter((item) => ['აქსესუარები', 'ჩანთები', 'სამკაულები'].includes(item.category));
      const topItem = pickBest(clothes);
      const shoesItem = pickBest(footwear);
      const accessoryItem = pickBest(accessories);

      const productCandidates = (Array.isArray(products) ? products : [])
        .filter((product) => Number(product.stock ?? 0) > 0 && product.image);
      const storeAddon = [...productCandidates].sort((a, b) => {
        const aText = [a.name, a.category, ...(a.tags || [])].join(' ').toLowerCase();
        const bText = [b.name, b.category, ...(b.tags || [])].join(' ').toLowerCase();
        const accessoryScore = (text) => /აქსესუარ|ჩანთა|სამკაულ|accessor|bag|jewel/.test(text) ? 2 : 0;
        return accessoryScore(bText) - accessoryScore(aText) ||
          (Number(a.priceGEL) || 0) - (Number(b.priceGEL) || 0);
      })[0] || null;

      let advice = `შერჩევა: ${weather} · ${event}. `;
      if (!topItem && !shoesItem && !accessoryItem) {
        advice += 'გარდერობში ჯერ ნივთები არ არის. დაამატე ტანსაცმელი, ფეხსაცმელი ან აქსესუარი და სცადე ხელახლა.';
      } else if (isCold) {
        advice += 'უპირატესობა მივანიჭე სეზონისთვის შესაფერის ნივთებს და პრაქტიკულ ფერებს.';
      } else {
        advice += 'კომბინაცია დალაგებულია ღონისძიების ტიპისა და შენს გარდერობში არსებული ნივთების მიხედვით.';
      }

      setGeneratedOutfit({ top: topItem, shoes: shoesItem, accessory: accessoryItem, storeAddon, advice });
      setIsGenerating(false);
    }, 350);
  };

  return (
    <div className="gs-wardrobe-root space-y-8 w-full pb-16 animate-in fade-in duration-500 text-white">
      
      {/* 🌟 HERO BANNER */}
      <div className="gs-wardrobe-hero relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> AI Personal Stylist & Wardrobe
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
            შენი ციფრული გარდერობი და AI სტილისტი 👗 👟
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            ატვირთე შენი ტანსაცმელი, შექმენი ციფრული კოლექცია და მიიღე AI რეკომენდაციები ამინდისა და ღონისძიების მიხედვით!
          </p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 mx-auto md:mx-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ნივთის დამატება გარდერობში
          </button>
        </div>

        <div className="bg-slate-950/80 border border-emerald-500/20 p-6 rounded-3xl space-y-3 w-full md:w-80 shadow-inner z-10">
          <div className="flex items-center justify-between text-xs border-b border-emerald-500/20 pb-3">
            <span className="text-slate-400 font-bold">სულ გარდერობში:</span>
            <span className="text-emerald-400 font-black text-sm">{wardrobe.length} ნივთი</span>
          </div>
          <div className="flex justify-around text-center pt-1 text-xs">
            <div>
              <span className="block font-black text-white">{wardrobe.filter(i => i.category === 'ტანსაცმელი').length}</span>
              <span className="text-[10px] text-slate-400">ტანსაცმელი</span>
            </div>
            <div className="border-r border-slate-800"></div>
            <div>
              <span className="block font-black text-white">{wardrobe.filter(i => i.category === 'ფეხსაცმელი').length}</span>
              <span className="text-[10px] text-slate-400">ფეხსაცმელი</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🤖 AI STYLIST GENERATOR SECTION */}
      <div className="gs-wardrobe-generator bg-slate-900/80 border border-emerald-500/30 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
          <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">AI სტილისტი — აუტფიტის გენერატორი</h2>
            <p className="text-xs text-slate-400">აირჩიეთ გარემო პირობები და ხელოვნური ინტელექტი შეგირჩევთ საუკეთესო ლუქს</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-emerald-500/20">
            <label className="text-slate-300 font-bold flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-emerald-400" /> დღევანდელი ამინდი:
            </label>
            <select 
              value={weather} 
              onChange={e => setWeather(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 font-bold outline-none cursor-pointer"
            >
              <option value="მზიანი / თბილი">☀️ მზიანი / თბილი</option>
              <option value="წვიმიანი / გრილი">🌧️ წვიმიანი / გრილი</option>
              <option value="ცივი / ზამთარი">❄️ ცივი / ზამთარი</option>
              <option value="ქარიანი / შემოდგომა">🍂 ქარიანი / შემოდგომა</option>
            </select>
          </div>

          <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-emerald-500/20">
            <label className="text-slate-300 font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> ღონისძიება / დრესკოდი:
            </label>
            <select 
              value={event} 
              onChange={e => setEvent(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 font-bold outline-none cursor-pointer"
            >
              <option value="ყოველდღიური (Casual)">👕 ყოველდღიური (Casual)</option>
              <option value="ოფიციალური / საქმიანი">💼 ოფიციალური / საქმიანი</option>
              <option value="სპორტული / ვარჯიში">👟 სპორტული / ვარჯიში</option>
              <option value="წვეულება / საღამო">🎉 წვეულება / საღამო</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              onClick={handleGenerateOutfit}
              disabled={isGenerating || wardrobe.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isGenerating ? 'AI აანალიზებს გარდერობს...' : 'აუტფიტის გენერაცია 🚀'}
            </button>
          </div>
        </div>

        {/* 🌟 GENERATED OUTFIT DISPLAY */}
        {generatedOutfit && (
          <div className="bg-slate-950 p-6 sm:p-8 rounded-[2rem] border border-emerald-500/40 space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{generatedOutfit.advice}</span>
            </div>

            <div className="gs-wardrobe-outfit-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Top Item */}
              {generatedOutfit.top && (
                <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">შენი გარდერობიდან</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    <img src={generatedOutfit.top.image} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
                  </div>
                  <h4 className="font-bold text-white text-xs">{generatedOutfit.top.name}</h4>
                </div>
              )}

              {/* Shoes Item */}
              {generatedOutfit.shoes && (
                <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">შენი გარდერობიდან</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    <img src={generatedOutfit.shoes.image} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
                  </div>
                  <h4 className="font-bold text-white text-xs">{generatedOutfit.shoes.name}</h4>
                </div>
              )}

              {generatedOutfit.accessory && (
                <div className="gs-wardrobe-outfit-card bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">შენი აქსესუარი</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    <img src={generatedOutfit.accessory.image} alt={generatedOutfit.accessory.name} className="max-h-full max-w-full object-contain rounded-lg" />
                  </div>
                  <h4 className="font-bold text-white text-xs">{generatedOutfit.accessory.name}</h4>
                </div>
              )}

              {/* Store Addon Recommendation */}
              {generatedOutfit.storeAddon && (
                <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3 relative">
                  <span className="text-[10px] font-black text-slate-950 bg-emerald-400 px-3 py-1 rounded-full uppercase">💡 AI რეკომენდაცია მაღაზიიდან</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    <img src={generatedOutfit.storeAddon.image} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
                  </div>
                  <h4 className="font-bold text-white text-xs line-clamp-1">{generatedOutfit.storeAddon.name}</h4>
                  <p className="text-emerald-400 font-black text-xs">{formatPrice ? formatPrice(generatedOutfit.storeAddon.priceGEL) : `${generatedOutfit.storeAddon.priceGEL} ₾`}</p>
                  
                  {addToCart && (
                    <button 
                      onClick={() => addToCart(generatedOutfit.storeAddon)}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-4 h-4" /> ლუქის შევსება
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🖼️ MY DIGITAL WARDROBE ITEMS GRID */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" /> ჩემი ციფრული კოლექცია ({wardrobe.length})
          </h3>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> ახალი ნივთი
          </button>
        </div>

        {wardrobe.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 border border-emerald-500/20 rounded-3xl space-y-3">
            <p className="text-slate-400 text-xs font-bold">შენს გარდერობში ჯერ ნივთები არ არის.</p>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs">დაამატე პირველი ტანსაცმელი</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {wardrobe.map(item => (
              <div key={item.id} className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-3.5 space-y-2.5 relative group hover:border-emerald-400 transition shadow-lg">
                <div className="h-36 sm:h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                  <img src={item.image} alt="" className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" />
                </div>
                <div>
                  <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{item.category}</span>
                  <h4 className="font-bold text-white text-xs line-clamp-1 mt-1">{item.name}</h4>
                  <p className="text-slate-400 text-[10px]">{item.color} • {item.season}</p>
                </div>
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl transition cursor-pointer"
                  title="წაშლა"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ➕ ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleAddItem} className="bg-slate-900 border border-emerald-500/40 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-4 text-xs shadow-2xl relative">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer">✕</button>

            <h3 className="text-base font-black text-white border-b border-emerald-500/20 pb-3">ახალი ნივთის დამატება გარდერობში</h3>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold">დასახელება *</label>
              <input type="text" placeholder="მაგ: შავი ტყავის ქურთუკი" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none focus:border-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">კატეგორია</label>
                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-emerald-400 font-bold outline-none cursor-pointer">
                  <option value="ტანსაცმელი">👕 ტანსაცმელი</option>
                  <option value="ფეხსაცმელი">👟 ფეხსაცმელი</option>
                  <option value="ჩანთები">👜 ჩანთები</option>
                  <option value="აქსესუარები">✨ აქსესუარები</option>
                  <option value="სამკაულები">💍 სამკაულები</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">ფერი</label>
                <input type="text" placeholder="მაგ: შავი" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold">სეზონი</label>
              <select value={newItem.season} onChange={e => setNewItem({...newItem, season: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none cursor-pointer">
                <option value="ყველა სეზონი">ყველა სეზონი</option>
                <option value="ზაფხული">ზაფხული</option>
                <option value="ზამთარი / შემოდგომა">ზამთარი / შემოდგომა</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold">ატვირთეთ ფოტო ან ჩასვით URL</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:text-slate-950 file:font-black hover:file:bg-emerald-400 cursor-pointer" />
              <input type="text" placeholder="ან ფოტოს URL..." value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none focus:border-emerald-400 mt-2" />
            </div>

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl transition cursor-pointer">
              გარდერობში შენახვა 🚀
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
