// src/components/ProductCompareModal.jsx - Side-by-Side Product Comparison
import React from 'react';
import { X, ShoppingBag, Trash2, Scale, Check, ShieldCheck } from 'lucide-react';

export default function ProductCompareModal({
  isComparisonOpen,
  setIsComparisonOpen,
  comparisonList,
  setComparisonList,
  addToCart,
  formatPrice
}) {
  if (!isComparisonOpen) return null;

  const handleRemoveFromCompare = (id) => {
    setComparisonList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative bg-[#0d0d10] border border-amber-500/40 rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-2xl p-6 md:p-10 space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-amber-500/20 pb-5">
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
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6">
              {comparisonList.map(prod => (
                <div key={prod.id} className="bg-[#121216] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 shadow-2xl relative flex flex-col justify-between">
                  
                  <button 
                    onClick={() => handleRemoveFromCompare(prod.id)}
                    className="absolute top-4 right-4 text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl transition cursor-pointer"
                    title="სიიდან ამოშლა"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-4">
                    <div className="bg-[#08080a] p-4 rounded-2xl border border-amber-500/10 flex items-center justify-center h-48">
                      <img src={prod.image} alt="" className="max-h-full object-contain" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg font-black uppercase">{prod.category}</span>
                      <h3 className="font-black text-white text-sm line-clamp-2 pt-1">{prod.name}</h3>
                    </div>

                    <div className="bg-[#08080a] p-4 rounded-2xl border border-amber-500/10 space-y-3 text-xs">
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">ფასი:</span>
                        <span className="text-amber-400 font-black text-sm">{formatPrice(prod.priceGEL)}</span>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">მომწოდებელი:</span>
                        <span className="text-white font-bold">{prod.vendor || 'GEOSTORE'}</span>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/10 pb-2">
                        <span className="text-slate-400">მარაგში:</span>
                        <span className="text-emerald-400 font-bold">{prod.stock || 1} ცალი</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SKU:</span>
                        <span className="text-slate-200 font-mono">{prod.sku || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="text-slate-300 text-xs bg-[#08080a] p-4 rounded-2xl border border-amber-500/10">
                      <b className="text-amber-300 block mb-1">აღწერა:</b>
                      <p className="line-clamp-3 leading-relaxed text-slate-400">{prod.description || 'აღწერა არ არის.'}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => addToCart(prod)}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <ShoppingBag className="w-4 h-4" /> კალათაში დამატება
                  </button>

                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
