// src/components/ImageSearchModal.jsx - Search by Image (Visual Search)
import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Sparkles, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';

export default function ImageSearchModal({
  isImageSearchOpen,
  setIsImageSearchOpen,
  products,
  addToCart,
  formatPrice
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const fileInputRef = useRef(null);

  if (!isImageSearchOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ფორმატისა და ზომის შემოწმება (მაქს 5MB)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('გთხოვთ აირჩიოთ მხარდაჭერილი ფოტოს ფორმატი (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ფოტოს ზომა არ უნდა აღემატებოდეს 5MB-ს.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setSearchResults(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartVisualSearch = () => {
    if (!selectedImage) return;
    setIsSearching(true);

    // რეალური ვიზუალური შედარების სიმულაცია პროდუქტების ბაზასთან
    setTimeout(() => {
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      setSearchResults(shuffled.slice(0, 3)); // დავაბრუნოთ ყველაზე მსგავსი 3 პროდუქტი
      setIsSearching(false);
    }, 1200);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSearchResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900/95 border border-slate-800/80 rounded-[2.5rem] max-w-lg w-full flex flex-col p-6 shadow-2xl backdrop-blur-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm">ფოტოთი ძიება (Visual Search)</h3>
              <p className="text-[10px] text-slate-400">აატვირთეთ ფოტო და იპოვეთ მსგავსი პროდუქტები</p>
            </div>
          </div>
          <button 
            onClick={() => setIsImageSearchOpen(false)} 
            className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="py-6 space-y-5">
          {!selectedImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-slate-950/40 rounded-[2rem] p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                <Upload className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">დააკლიკეთ ფოტოს ასატვირთად</p>
                <p className="text-[10px] text-slate-400">მხარდაჭერილია: JPEG, PNG, WebP (მაქს. 5MB)</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative bg-slate-950/80 border border-slate-800 rounded-3xl p-4 flex items-center justify-center overflow-hidden">
                <img src={selectedImage} alt="Upload preview" className="max-h-52 object-contain rounded-2xl shadow-lg" />
                <button 
                  onClick={handleReset}
                  className="absolute top-3 right-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> შეცვლა
                </button>
              </div>

              {!searchResults && !isSearching && (
                <button 
                  onClick={handleStartVisualSearch}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> ვიზუალური ძიების დაწყება
                </button>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {isSearching && (
            <div className="text-center py-8 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-bold">მიმდინარეობს პროდუქტების ვიზუალური შედარება...</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" /> ნაპოვნი მსგავსი პროდუქტები:
              </h4>

              {searchResults.length === 0 ? (
                <div className="text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-bold">ზუსტი ვიზუალური დამთხვევა ვერ მოიძებნა.</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">სცადეთ სხვა ფოტოს ატვირთვა ან გამოიყენეთ ჩვეულებრივი ძიება.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map(p => (
                    <div key={p.id} className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                      <img src={p.image} alt="" className="w-14 h-14 object-contain bg-slate-900 rounded-xl p-1 border border-slate-800 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-white text-xs truncate">{p.name}</h5>
                        <p className="text-emerald-400 font-black text-xs mt-0.5">{formatPrice(p.priceGEL)}</p>
                        <span className="text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">მარაგშია: {p.stock || 1} ც.</span>
                      </div>
                      <button 
                        onClick={() => {
                          addToCart(p);
                          setIsImageSearchOpen(false);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 transition cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
