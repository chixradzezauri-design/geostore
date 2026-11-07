// src/components/ImageSearchModal.jsx - Search by Image (Visual Search)
import React, { useState, useRef } from 'react';
import { validateImageFile } from '../utils/imageSafety';
import { X, Camera, Upload, Sparkles, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';

export default function ImageSearchModal({
  isImageSearchOpen,
  setIsImageSearchOpen,
  products,
  addToCart,
  formatPrice
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchNotice, setSearchNotice] = useState('');
  const fileInputRef = useRef(null);

  if (!isImageSearchOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await validateImageFile(file, 5 * 1024 * 1024, ['image/jpeg', 'image/png', 'image/webp']);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result);
        setSearchNotice('');
      };
      reader.onerror = () => alert('ფოტოს წაკითხვა ვერ მოხერხდა.');
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error.message || 'ფოტოს დამუშავება ვერ მოხერხდა.');
    }
  };

  const handleStartVisualSearch = () => {
    if (!selectedImage) return;
    // Do not present random catalogue items as AI visual matches.
    // Real image similarity requires a configured visual-search model/service.
    setSearchNotice('ფოტო წარმატებით აიტვირთა, თუმცა რეალური ვიზუალური შედარება ჯერ არ არის ჩართული. ამ ეტაპზე მსგავსი პროდუქტების გამოგონილ შედეგებს არ გაჩვენებთ. გამოიყენეთ კატალოგის ძიება.');
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSearchNotice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="gs-image-search-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="gs-image-search-dialog bg-slate-900/95 border border-slate-800/80 rounded-[2.5rem] max-w-lg w-full flex flex-col p-6 shadow-2xl backdrop-blur-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="gs-image-search-header flex justify-between items-center border-b border-slate-800/80 pb-4">
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
        <div className="gs-image-search-body py-6 space-y-5">
          {!selectedImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="gs-image-search-dropzone border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-slate-950/40 rounded-[2rem] p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
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
              <div className="gs-image-search-preview relative bg-slate-950/80 border border-slate-800 rounded-3xl p-4 flex items-center justify-center overflow-hidden">
                <img src={selectedImage} alt="Upload preview" className="max-h-52 object-contain rounded-2xl shadow-lg" />
                <button 
                  onClick={handleReset}
                  className="absolute top-3 right-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> შეცვლა
                </button>
              </div>

              <button 
                onClick={handleStartVisualSearch}
                className="gs-image-search-action w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> ფოტოს შემოწმება
              </button>
            </div>
          )}

          {searchNotice && (
            <div role="status" className="gs-image-search-notice flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-amber-100">{searchNotice}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
