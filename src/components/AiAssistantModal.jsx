// src/components/AiAssistantModal.jsx
import React from 'react';
import { Bot, Send } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  aiBudget,
  setAiBudget,
  aiCategory,
  setAiCategory,
  categories,
  aiChatHistory,
  aiInputText,
  setAiInputText,
  handleAiAsk,
  addToCart
}) {
  if (!isAiAssistantOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-xl w-full h-[560px] flex flex-col relative shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 p-3 text-slate-950 flex justify-between items-center font-black shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-slate-950 animate-bounce" />
            <div>
              <h3 className="text-sm leading-none">🤖 GEOSTORE ჭკვიანი AI ასისტენტი</h3>
              <p className="text-[9px] text-slate-900/80 font-bold mt-0.5">რეალურ დროში ინტეგრირებული მონაცემებით</p>
            </div>
          </div>
          <button onClick={() => setIsAiAssistantOpen(false)} className="bg-slate-950 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">✕</button>
        </div>

        <div className="bg-slate-950 p-2.5 border-b border-slate-800 grid grid-cols-2 gap-2 text-xs shrink-0">
          <div>
            <label className="text-slate-400 text-[9px] font-bold block mb-0.5">
              მაქს. ბიუჯეტი: <span className="text-emerald-400 font-black">{aiBudget} ₾</span>
            </label>
            <input 
              type="range" 
              min="200" 
              max="10000" 
              step="200" 
              value={aiBudget} 
              onChange={e => setAiBudget(Number(e.target.value))} 
              className="w-full accent-emerald-500 cursor-pointer h-1" 
            />
          </div>

          <div>
            <label className="text-slate-400 text-[9px] font-bold block mb-0.5">კატეგორია:</label>
            <select 
              value={aiCategory} 
              onChange={e => setAiCategory(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-800 p-1 rounded-xl text-white text-xs outline-none"
            >
              <option value="ყველა">✨ ყველა კატეგორია</option>
              {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-slate-950/60">
          {aiChatHistory.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-line ${
                msg.sender === 'user' 
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow' 
                  : 'bg-slate-900 border border-emerald-500/30 text-white shadow-lg'
              }`}>
                <p>{msg.text}</p>
                
                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-800">
                    {msg.recommendedProducts.map(prod => (
                      <div key={prod.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col justify-between items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <img src={prod.image} alt="" className="w-8 h-8 object-contain bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0" />
                          <div>
                            <h5 className="font-bold text-white text-[10px] line-clamp-1">{prod.name}</h5>
                            <p className="text-emerald-400 font-black text-[11px]">{prod.priceGEL} ₾ (მარაგი: {prod.stock})</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => { addToCart(prod); setIsAiAssistantOpen(false); }} 
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1 rounded-lg text-[10px] transition"
                        >
                          🛒 კალათაში
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 py-1 bg-slate-950/90 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {[
            { label: '👋 გამარჯობა', text: 'გამარჯობა' },
            { label: '📦 ჩემი შეკვეთები', text: 'რა არის ჩემი შეკვეთის სტატუსი?' },
            { label: '🏷️ ფასდაკლებები', text: 'რომელი პროდუქტებია ფასდაკლებაში?' },
            { label: '⚔️ შედარება', text: 'შემიდარე პროდუქტები' },
            { label: '📜 საიტის წესები', text: 'როგორია მიწოდებისა და გარანტიის წესები?' }
          ].map((sugg, i) => (
            <button key={i} onClick={() => handleAiAsk(sugg.text)} className="bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 transition">
              {sugg.label}
            </button>
          ))}
        </div>

        <div className="p-2.5 bg-slate-900 border-t border-slate-800 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleAiAsk(); }} className="flex gap-2">
            <input 
              type="text" 
              placeholder="ჰკითხეთ AI-ს (ფასი, მარაგი, შეკვეთა, წესები)..." 
              value={aiInputText} 
              onChange={e => setAiInputText(e.target.value)} 
              className="flex-1 bg-slate-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
            />
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 shadow transition">
              <Send className="w-3.5 h-3.5" /> ძებნა
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
