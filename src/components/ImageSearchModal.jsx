// src/components/ImageSearchModal.jsx - Search by Image (Visual Search)
import React, { useState, useRef, useEffect } from 'react';
import { validateImageFile } from '../utils/imageSafety';
import { X, Camera, Upload, Sparkles, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';

export default function ImageSearchModal({
  isImageSearchOpen,
  setIsImageSearchOpen,
  products,
  addToCart,
  formatPrice,
  currentLang = 'ka'
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchNotice, setSearchNotice] = useState('');
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const localized = (ka,en,ru) => currentLang === 'en' ? en : currentLang === 'ru' ? ru : ka;
  useEffect(() => {
    if (!isImageSearchOpen) return undefined;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setIsImageSearchOpen(false); }
      if (event.key !== 'Tab') return;
      const nodes = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), [tabindex="0"]') || [])].filter(node => node.getClientRects().length);
      if (!nodes.length) return;
      if (!dialogRef.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement === nodes[0])) { event.preventDefault(); (event.shiftKey ? nodes[nodes.length-1] : nodes[0]).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length-1]) { event.preventDefault(); nodes[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus?.(); };
  }, [isImageSearchOpen, setIsImageSearchOpen]);

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
      reader.onerror = () => setSearchNotice(localized('ფოტოს წაკითხვა ვერ მოხერხდა.', 'The photo could not be read.', 'Не удалось прочитать фото.'));
      reader.readAsDataURL(file);
    } catch (error) {
      setSearchNotice(localized('ფოტოს დამუშავება ვერ მოხერხდა. შეამოწმეთ ფორმატი და ზომა.', 'Unable to process the photo. Check its format and size.', 'Не удалось обработать фото. Проверьте формат и размер.'));
    }
  };

  const handleStartVisualSearch = () => {
    if (!selectedImage) return;
    // Do not present random catalogue items as AI visual matches.
    // Real image similarity requires a configured visual-search model/service.
    setSearchNotice(localized('ფოტო მზადაა. მსგავსი პროდუქტების ძებნა ჯერ არ არის ჩართული. გამოიყენეთ კატალოგის ტექსტური ძებნა.', 'Photo ready. Visual matching is not enabled yet. Use the catalogue text search.', 'Фото готово. Поиск похожих товаров пока недоступен. Используйте текстовый поиск в каталоге.'));
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSearchNotice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="gs-image-search-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gs-video-image-search-title" className="gs-image-search-dialog bg-slate-900/95 border border-slate-800/80 rounded-[2.5rem] max-w-lg w-full flex flex-col p-6 shadow-2xl backdrop-blur-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="gs-image-search-header flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 id="gs-video-image-search-title" className="font-black text-white text-sm">{localized("ფოტოთი ძიება","Photo search","Поиск по фото")}</h3>
              <p className="text-[10px] text-slate-400">{localized("ატვირთეთ ფოტო შესამოწმებლად. მსგავსი პროდუქტების ძიება ჯერ არ არის ჩართული.","Select a photo to preview. Visual matching is not enabled yet.","Выберите фото для просмотра. Поиск похожих товаров пока недоступен.")}</p>
            </div>
          </div>
          <button 
            ref={closeRef} type="button" aria-label={localized("დახურვა","Close","Закрыть")}
            onClick={() => setIsImageSearchOpen(false)} 
            className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="gs-image-search-body py-6 space-y-5">
          {!selectedImage ? (
            <div role="button" tabIndex={0} aria-label={localized("ფოტოს არჩევა","Choose a photo","Выбрать фото")}
              onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); fileInputRef.current?.click(); } }}
              onClick={event => { if (event.target !== fileInputRef.current) fileInputRef.current?.click(); }}
              className="gs-image-search-dropzone border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-slate-950/40 rounded-[2rem] p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
            >
              <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                <Upload className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">{localized("აირჩიეთ ფოტო","Choose a photo","Выберите фото")}</p>
                <p className="text-[10px] text-slate-400">JPEG, PNG, WebP · {localized("მაქს. 5 მბ","Max 5 MB","До 5 МБ")}</p>
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
                <img src={selectedImage} alt={localized("არჩეული ფოტო","Selected photo","Выбранное фото")} className="max-h-52 object-contain rounded-2xl shadow-lg" />
                <button 
                  type="button" onClick={handleReset}
                  className="absolute top-3 right-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {localized("შეცვლა","Change","Заменить")}
                </button>
              </div>

              <button 
                type="button" onClick={handleStartVisualSearch}
                className="gs-image-search-action w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> {localized("ფოტოს შემოწმება","Check photo","Проверить фото")}
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
