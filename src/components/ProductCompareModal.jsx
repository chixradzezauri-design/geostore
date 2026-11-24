// src/components/ProductCompareModal.jsx - Side-by-Side Product Comparison
import React, { useEffect, useRef } from 'react';
import { getProductAvailableStock, getProductStartingPrice, hasProductVariantOptions } from '../utils/productVariants.js';
import { findCurrentSavedProduct } from '../utils/savedProductNavigation.js';
import { X, ShoppingBag, Trash2, Scale, Check, ShieldCheck } from 'lucide-react';

export default function ProductCompareModal({
  isComparisonOpen,
  setIsComparisonOpen,
  comparisonList,
  setComparisonList,
  catalogProducts = [],
  addToCart,
  formatPrice,
  onFindProduct,
  currentLang = 'ka'
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const localized = (ka, en, ru) => currentLang === 'en' ? en : currentLang === 'ru' ? ru : ka;
  useEffect(() => {
    if (!isComparisonOpen) return undefined;
    const returnFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsComparisonOpen(false);
      } else if (event.key === 'Tab') {
        const focusables = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), [tabindex="0"]') || [])]
          .filter(node => node.getClientRects().length > 0);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (!dialogRef.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
    };
  }, [isComparisonOpen, setIsComparisonOpen]);

  if (!isComparisonOpen) return null;

  const handleRemoveFromCompare = (id) => {
    setComparisonList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="gs-product-compare-overlay fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gs-product-compare-title" className="gs-product-compare-dialog relative bg-[#0d0d10] border border-amber-500/40 rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-2xl p-6 md:p-10 space-y-8">
        
        {/* Header */}
        <div className="gs-product-compare-header flex justify-between items-center border-b border-amber-500/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 id="gs-product-compare-title" className="text-xl font-black text-white">{localized('პროდუქტების შედარება', 'Compare products', 'Сравнение товаров')} ({comparisonList.length}/4)</h2>
              <p className="text-xs text-slate-400 mt-0.5">შეადარეთ არჩეული ნივთები გვერდიგვერდ</p>
            </div>
          </div>
          {comparisonList.length > 0 && <button type="button" className="gs-product-compare-clear px-3" onClick={() => setComparisonList([])}>{localized('ყველას წაშლა', 'Clear all', 'Очистить всё')}</button>}
          <button ref={closeButtonRef} type="button" aria-label={localized('შედარების დახურვა', 'Close comparison', 'Закрыть сравнение')} onClick={() => setIsComparisonOpen(false)} className="gs-product-compare-close p-3 bg-[#141418] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl border border-amber-500/20 transition cursor-pointer shadow">
            <X className="w-5 h-5" />
          </button>
        </div>

        {comparisonList.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Scale className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-bold">შედარების სია ცარიელია.</p>
            <p className="text-xs text-slate-500">დაამატეთ პროდუქტები ვიტრინიდან სასწორის ღილაკით ⚖️</p>
          </div>
        ) : (
          <div className="gs-product-compare-scroll overflow-x-auto pb-4" role="region" tabIndex={0} aria-label={localized('პროდუქტების შედარების ცხრილი', 'Comparison of products', 'Сравнение товаров')}>
            <div className="gs-product-compare-grid grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6">
              {comparisonList.map(savedProd => {
                const liveProduct = findCurrentSavedProduct(catalogProducts, savedProd);
                const prod = liveProduct || savedProd;
                return (
                <div key={savedProd.id} className="gs-product-compare-card bg-[#121216] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 shadow-2xl relative flex flex-col justify-between">
                  
                  <button 
                    type="button"
                    onClick={() => handleRemoveFromCompare(savedProd.id)}
                    aria-label={`${localized('შედარებიდან წაშლა', 'Remove from comparison', 'Удалить из сравнения')}: ${prod.name}`}
                    className="gs-product-compare-remove absolute top-4 right-4 text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl transition cursor-pointer"
                    title="სიიდან ამოშლა"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-4">
                    <div className="gs-product-compare-media bg-[#08080a] p-4 rounded-2xl border border-amber-500/10 flex items-center justify-center h-48">
                      {prod.image ? <img src={prod.image} alt="" loading="lazy" decoding="async" className="max-h-full object-contain" /> : <span className="text-[10px] font-black tracking-[0.2em] text-amber-400/60">GEOSTORE</span>}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg font-black uppercase">{prod.category}</span>
                      <h3 className="gs-product-compare-heading font-black text-white text-sm pt-1">
                        <button type="button" className="gs-product-compare-detail-link text-left"
                          aria-label={`${localized('დეტალურად ნახვა', 'View details', 'Подробнее')}: ${prod.name}`}
                          onClick={() => onFindProduct?.(savedProd)} disabled={!liveProduct}>{prod.name}</button>
                      </h3>
                    </div>

                    <div className="gs-product-compare-specs bg-[#08080a] p-4 rounded-2xl border border-amber-500/10 space-y-3 text-xs">
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">ფასი:</span>
                        <span className="text-amber-400 font-black text-sm">{getProductStartingPrice(prod) === null ? '—' : formatPrice(getProductStartingPrice(prod))}</span>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">მომწოდებელი:</span>
                        <span className="text-white font-bold">{prod.vendor || 'GEOSTORE'}</span>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">მარაგში:</span>
                        <span className="text-emerald-400 font-bold">{getProductAvailableStock(prod) > 0 ? `${getProductAvailableStock(prod)} ${localized('ცალი', 'items', 'шт.')}` : localized('მარაგში არ არის', 'Out of stock', 'Нет в наличии')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SKU:</span>
                        <span className="text-slate-200 font-mono">{prod.sku || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="gs-product-compare-description text-slate-300 text-xs bg-[#08080a] p-4 rounded-2xl border border-amber-500/10">
                      <b className="text-amber-300 block mb-1">აღწერა:</b>
                      <p className="line-clamp-3 leading-relaxed text-slate-400">{prod.description || 'აღწერა არ არის.'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!liveProduct || getProductAvailableStock(prod) <= 0}
                    aria-label={`${hasProductVariantOptions(prod) ? localized('აირჩიეთ ვარიანტი', 'Choose options', 'Выбрать вариант') : localized('კალათაში დამატება', 'Add to cart', 'В корзину')}: ${prod.name}`}
                    onClick={() => hasProductVariantOptions(prod) ? onFindProduct?.(savedProd) : addToCart(prod)}
                    className="gs-product-compare-action w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <ShoppingBag className="w-4 h-4" /> {!liveProduct ? localized('მიუწვდომელია', 'Unavailable', 'Недоступен') : getProductAvailableStock(prod) <= 0 ? localized('მარაგში არ არის', 'Out of stock', 'Нет в наличии') : hasProductVariantOptions(prod) ? localized('აირჩიეთ ვარიანტი', 'Choose options', 'Выбрать вариант') : localized('კალათაში დამატება', 'Add to cart', 'В корзину')}
                  </button>

                </div>
              );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
