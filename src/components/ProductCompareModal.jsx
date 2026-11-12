// src/components/ProductCompareModal.jsx - Side-by-Side Product Comparison
import React from 'react';
import { getProductAvailableStock, getProductStartingPrice, getAvailableCustomProductVariants, getSizeColorInventoryVariants, getAvailableProductSizes, getAvailableProductColors, hasCustomProductVariants, hasSizeColorInventory } from '../utils/productVariants.js';
import { X, ShoppingBag, Trash2, Scale, Check, ShieldCheck } from 'lucide-react';

export default function ProductCompareModal({
  isComparisonOpen,
  setIsComparisonOpen,
  comparisonList,
  setComparisonList,
  addToCart,
  formatPrice
}) {
  const [selectedVariantIds, setSelectedVariantIds] = React.useState({});
  const [selectedSizes, setSelectedSizes] = React.useState({});
  const [selectedColors, setSelectedColors] = React.useState({});

  if (!isComparisonOpen) return null;

  const handleRemoveFromCompare = (id) => {
    setComparisonList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="gs-product-compare-overlay fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="gs-product-compare-dialog relative bg-[#0d0d10] border border-amber-500/40 rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-2xl p-6 md:p-10 space-y-8">
        
        {/* Header */}
        <div className="gs-product-compare-header flex justify-between items-center border-b border-amber-500/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
              <Scale className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">პროდუქტების შედარება</h2>
              <p className="text-xs text-slate-400 mt-0.5">შეადარეთ არჩეული ნივთები გვერდიგვერდ</p>
            </div>
          </div>
          <button onClick={() => setIsComparisonOpen(false)} className="p-3 bg-[#141418] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-2xl border border-amber-500/20 transition cursor-pointer shadow">
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
          <div className="gs-product-compare-scroll overflow-x-auto pb-4">
            <div className="gs-product-compare-grid grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6">
              {comparisonList.map(prod => {
                const hasCustomVariants = hasCustomProductVariants(prod);
                const hasSizeColorVariants = hasSizeColorInventory(prod);
                const availableSizes = getAvailableProductSizes(prod);
                const availableColors = getAvailableProductColors(prod);
                const needsLegacySize = !hasCustomVariants && !hasSizeColorVariants && availableSizes.length > 0;
                const needsLegacyColor = !hasCustomVariants && !hasSizeColorVariants && availableColors.length > 0;
                const needsVariant = hasCustomVariants || hasSizeColorVariants || needsLegacySize || needsLegacyColor;
                const variantOptions = hasCustomProductVariants(prod)
                  ? getAvailableCustomProductVariants(prod)
                  : hasSizeColorInventory(prod)
                    ? getSizeColorInventoryVariants(prod).filter(variant => variant.stock > 0)
                    : [];
                const selectedVariant = variantOptions.find(variant => variant.id === selectedVariantIds[String(prod.id)]) || null;
                const selectedSize = selectedSizes[String(prod.id)] || '';
                const selectedColor = selectedColors[String(prod.id)] || '';
                const canAddSelectedVariant = hasCustomVariants || hasSizeColorVariants
                  ? Boolean(selectedVariant)
                  : (!needsLegacySize || Boolean(selectedSize)) && (!needsLegacyColor || Boolean(selectedColor));
                const availableStock = getProductAvailableStock(prod);
                return (
                <div key={prod.id} className="gs-product-compare-card bg-[#121216] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 shadow-2xl relative flex flex-col justify-between">
                  
                  <button 
                    onClick={() => handleRemoveFromCompare(prod.id)}
                    className="absolute top-4 right-4 text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl transition cursor-pointer"
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
                      <h3 className="font-black text-white text-sm line-clamp-2 pt-1">{prod.name}</h3>
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
                        <span className={`${availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>{availableStock > 0 ? `${availableStock} ცალი` : 'არ არის მარაგში'}</span>
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
                    {needsVariant && (
                      <div className="space-y-3">
                      {(hasCustomVariants || hasSizeColorVariants) && (
                      <label className="block space-y-2 text-xs text-slate-300">
                        <span className="font-bold text-amber-300">აირჩიეთ პროდუქტის ვარიანტი</span>
                        <select
                          value={selectedVariant?.id || ''}
                          onChange={event => setSelectedVariantIds(current => ({ ...current, [String(prod.id)]: event.target.value }))}
                          className="w-full rounded-xl border border-amber-500/30 bg-[#08080a] px-3 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                          aria-label={`${prod.name}: აირჩიეთ ვარიანტი`}
                        >
                          <option value="">აირჩიეთ ხელმისაწვდომი ვარიანტი</option>
                          {variantOptions.map(variant => (
                            <option key={variant.id} value={variant.id}>
                              {hasSizeColorInventory(prod) && !hasCustomProductVariants(prod)
                                ? [variant.size, variant.color].filter(Boolean).join(' / ')
                                : variant.name}
                              {' — '}{formatPrice(variant.priceGEL)} · {variant.stock} ცალი
                            </option>
                          ))}
                        </select>
                        {variantOptions.length === 0 && (
                          <span className="block text-rose-400">ამჟამად ხელმისაწვდომი ვარიანტი არ არის.</span>
                        )}
                      </label>
                      )}
                      {needsLegacySize && (
                        <label className="block space-y-2 text-xs text-slate-300">
                          <span className="font-bold text-amber-300">ზომა</span>
                          <select value={selectedSize} onChange={event => setSelectedSizes(current => ({ ...current, [String(prod.id)]: event.target.value }))} className="w-full rounded-xl border border-amber-500/30 bg-[#08080a] px-3 py-3 text-white" aria-label={`${prod.name}: ზომა`}>
                            <option value="">აირჩიეთ ზომა</option>
                            {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                          </select>
                        </label>
                      )}
                      {needsLegacyColor && (
                        <label className="block space-y-2 text-xs text-slate-300">
                          <span className="font-bold text-amber-300">ფერი</span>
                          <select value={selectedColor} onChange={event => setSelectedColors(current => ({ ...current, [String(prod.id)]: event.target.value }))} className="w-full rounded-xl border border-amber-500/30 bg-[#08080a] px-3 py-3 text-white" aria-label={`${prod.name}: ფერი`}>
                            <option value="">აირჩიეთ ფერი</option>
                            {availableColors.map(color => <option key={color} value={color}>{color}</option>)}
                          </select>
                        </label>
                      )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={(needsVariant && !canAddSelectedVariant) || availableStock <= 0}
                    onClick={() => addToCart(selectedVariant ? {
                      ...prod,
                      selectedSize: selectedVariant.size || null,
                      selectedColor: selectedVariant.color || null,
                      customVariantId: selectedVariant.id,
                      customVariantName: selectedVariant.name || '',
                      priceGEL: selectedVariant.priceGEL,
                      stock: selectedVariant.stock
                    } : { ...prod, selectedSize: selectedSize || null, selectedColor: selectedColor || null })}
                    className="gs-product-compare-action w-full bg-amber-400 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <ShoppingBag className="w-4 h-4" /> {availableStock <= 0 ? 'მარაგში არ არის' : needsVariant && !canAddSelectedVariant ? 'აირჩიეთ ვარიანტი' : 'კალათაში დამატება'}
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
