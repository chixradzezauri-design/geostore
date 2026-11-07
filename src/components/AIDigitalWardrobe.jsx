// src/components/AIDigitalWardrobe.jsx - Full AI Digital Wardrobe & Personal Stylist
import React, { useState, useEffect } from 'react';
import { validateImageFile, isSafeImageUrl, isValidImageDataUrl } from '../utils/imageSafety';
import { readWardrobeItems, writeWardrobeItems } from '../utils/wardrobeStorage';
import { 
  Sparkles, Shirt, Footprints, Camera, Plus, Trash2, Zap, CloudSun, 
  Calendar, Check, ShoppingBag, Eye, RefreshCw, Tag, Heart, ArrowRight, Layers
} from 'lucide-react';

const DEFAULT_WARDROBE_ITEMS = [
  {
    id: 'w1',
    name: 'შავი ქურთუკი',
    category: 'ტანსაცმელი',
    subCategory: 'ქურთუკი',
    color: 'შავი',
    season: 'ზამთარი / შემოდგომა',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'w2',
    name: 'თეთრი სპორტული ბოტასი',
    category: 'ფეხსაცმელი',
    subCategory: 'ბოტასი',
    color: 'თეთრი',
    season: 'ყველა სეზონი',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600'
  }
];

export default function AIDigitalWardrobe({ userId = null, products = [], addToCart, formatPrice }) {
  // Each account has a separate local wardrobe. The legacy unscoped key is
  // intentionally not imported because its original owner cannot be verified.
  const [wardrobe, setWardrobe] = useState(() => readWardrobeItems(userId) ?? DEFAULT_WARDROBE_ITEMS);

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
    writeWardrobeItems(userId, wardrobe);
  }, [wardrobe, userId]);

  // 📸 ფოტოს ატვირთვა Base64 ფორმატში
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await validateImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setNewItem(prev => ({ ...prev, image: reader.result }));
      reader.onerror = () => alert('ფოტოს წაკითხვა ვერ მოხერხდა.');
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error.message || 'ფოტოს ატვირთვა ვერ მოხერხდა.');
    }
  };

  // ➕ გარდერობში ახალი ნივთის დამატება
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    if (newItem.image && !isValidImageDataUrl(newItem.image) && !isSafeImageUrl(newItem.image)) {
      alert('ფოტოს ბმული უნდა იწყებოდეს http:// ან https:// მისამართით.');
      return;
    }

    const createdItem = {
      id: `w-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      subCategory: newItem.subCategory,
      color: newItem.color,
      season: newItem.season,
      image: newItem.image || null
    };

    setWardrobe(prev => [createdItem, ...prev]);
    setNewItem({ name: '', category: 'ტანსაცმელი', subCategory: 'მაისური', color: 'შავი', season: 'ყველა სეზონი', image: '' });
    setIsAddModalOpen(false);
  };

  // 🗑️ ნივთის წაშლა გარდერობიდან
  const handleDeleteItem = (id) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
  };

  // წესებზე დაფუძნებული, გამეორებადი ლუქის შეთავაზება — შემთხვევითი პროდუქტი არ ირჩევა.
  const handleGenerateOutfit = () => {
    setIsGenerating(true);
    setGeneratedOutfit(null);

    const topItem = wardrobe.find(item => item.category === 'ტანსაცმელი') || null;
    const shoesItem = wardrobe.find(item => item.category === 'ფეხსაცმელი') || null;
    const accessoryTerms = ['აქსესუარი', 'ჩანთა', 'ქამარი', 'სათვალე', 'ქუდი', 'accessory', 'bag', 'belt', 'glasses', 'hat'];
    const eventTerms = event.includes('სპორტული')
      ? ['სპორტ', 'sport', 'sneaker', 'ბოტასი']
      : event.includes('ოფიციალური')
        ? ['კლასიკ', 'საქმიანი', 'formal', 'classic']
        : event.includes('წვეულება')
          ? ['საღამო', 'party', 'evening', 'ელეგანტ']
          : ['ყოველდღ', 'casual', 'basic'];
    const storeCandidates = products
      .filter(product => {
        if (!product || !product.name) return false;
        const searchable = [product.name, product.category, ...(Array.isArray(product.tags) ? product.tags : [])]
          .filter(Boolean).join(' ').toLowerCase();
        const hasRelevantTerm = [...accessoryTerms, ...eventTerms].some(term => searchable.includes(term));
        const hasAvailableStock = Number(product.stock) > 0 ||
          (Array.isArray(product.variants) && product.variants.some(variant => Number(variant.stock) > 0));
        return hasRelevantTerm && hasAvailableStock;
      })
      .sort((a, b) => Number(a.priceGEL || 0) - Number(b.priceGEL || 0) ||
        String(a.name).localeCompare(String(b.name)));

    let advice = `სტილის შეთავაზება (${weather} | ${event}): `;
    if (weather.includes('წვიმიანი') || weather.includes('ცივი')) {
      advice += 'ამ პირობებში გაითვალისწინეთ ფენობრივი ჩაცმა და თბილი აქსესუარები.';
    } else if (weather.includes('ქარიანი')) {
      advice += 'აირჩიეთ კომფორტული ზედა ფენა და პრაქტიკული ფეხსაცმელი.';
    } else {
      advice += 'შეარჩიეთ მსუბუქი და კომფორტული კომბინაცია.';
    }
    if (!topItem || !shoesItem) {
      advice += ' სრული კომბინაციისთვის გარდერობში დაამატეთ ტანსაცმელი და ფეხსაცმელი.';
    }

    setGeneratedOutfit({
      top: topItem,
      shoes: shoesItem,
      storeAddon: storeCandidates[0] || null,
      advice
    });
    setIsGenerating(false);
  };

  return (
    <div className="gs-digital-wardrobe space-y-8 w-full pb-16 animate-in fade-in duration-500 text-white">
      
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

        <div className="gs-wardrobe-summary bg-slate-950/80 border border-emerald-500/20 p-6 rounded-3xl space-y-3 w-full md:w-80 shadow-inner z-10">
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
            <p className="text-xs text-slate-400">აირჩიეთ ამინდი და დრესკოდი — სისტემა გარდერობიდან შეგირჩევთ განმეორებად, წესებზე დაფუძნებულ კომბინაციას</p>
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
              {isGenerating ? 'ვაწყობ კომბინაციას...' : 'ლუქის შეთავაზება 🚀'}
            </button>
          </div>
        </div>

        {/* 🌟 GENERATED OUTFIT DISPLAY */}
        {generatedOutfit && (
          <div className="gs-wardrobe-result bg-slate-950 p-6 sm:p-8 rounded-[2rem] border border-emerald-500/40 space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{generatedOutfit.advice}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Top Item */}
              {generatedOutfit.top && (
                <div className="gs-wardrobe-result-card bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">შენი გარდერობიდან</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    {generatedOutfit.top.image ? <img src={generatedOutfit.top.image} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain rounded-lg" /> : <Camera className="w-8 h-8 text-emerald-400/60" />}
                  </div>
                  <h4 className="font-bold text-white text-xs">{generatedOutfit.top.name}</h4>
                </div>
              )}

              {/* Shoes Item */}
              {generatedOutfit.shoes && (
                <div className="gs-wardrobe-result-card bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">შენი გარდერობიდან</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    {generatedOutfit.shoes.image ? <img src={generatedOutfit.shoes.image} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain rounded-lg" /> : <Camera className="w-8 h-8 text-emerald-400/60" />}
                  </div>
                  <h4 className="font-bold text-white text-xs">{generatedOutfit.shoes.name}</h4>
                </div>
              )}

              {/* Store Addon Recommendation */}
              {generatedOutfit.storeAddon && (
                <div className="gs-wardrobe-result-card gs-wardrobe-result-card--store bg-gradient-to-b from-emerald-950/30 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3 relative">
                  <span className="text-[10px] font-black text-slate-950 bg-emerald-400 px-3 py-1 rounded-full uppercase">💡 კატალოგიდან შერჩეული აქსესუარი</span>
                  <div className="h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    {generatedOutfit.storeAddon.image ? <img src={generatedOutfit.storeAddon.image} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain rounded-lg" /> : <Camera className="w-8 h-8 text-emerald-400/60" />}
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
          <div className="gs-wardrobe-item-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {wardrobe.map(item => (
              <div key={item.id} className="gs-wardrobe-item-card bg-slate-900 border border-emerald-500/20 rounded-2xl p-3.5 space-y-2.5 relative group hover:border-emerald-400 transition shadow-lg">
                <div className="h-36 sm:h-40 bg-slate-950 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                  {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" /> : <Camera className="w-8 h-8 text-emerald-400/60" />}
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
        <div className="gs-wardrobe-add-modal fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleAddItem} className="gs-wardrobe-add-form bg-slate-900 border border-emerald-500/40 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full space-y-4 text-xs shadow-2xl relative">
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
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:text-slate-950 file:font-black hover:file:bg-emerald-400 cursor-pointer" />
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
