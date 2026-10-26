// src/components/AiAssistantModal.jsx
import React, { useState } from 'react';
import { Bot, X, Sparkles, Send } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products,
  addToCart,
  formatPrice
}) {
  const [aiBudget, setAiBudget] = useState(10000);
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის ჭკვიანი AI ასისტენტი. ვამოწმებ მარაგებს, ფასებსა და ფასდაკლებებს. რით შემიძლია დაგეხმაროთ დღეს?',
      recommendedProducts: []
    }
  ]);

  if (!isAiAssistantOpen) return null;

  const handleAiAsk = () => {
    if (!aiInputText.trim()) return;
    const userMsg = { sender: 'user', text: aiInputText };
    const matched = products.filter(p => p.priceGEL <= aiBudget);
    
    setAiChatHistory(prev => [
      ...prev, 
      userMsg, 
      {
        sender: 'ai',
        text: `🤖 მოვიძიე საუკეთესო პროდუქტები თქვენი ბიუჯეტის (${aiBudget} ₾) შესაბამისად:`,
        recommendedProducts: matched.length > 0 ? matched.slice(0, 3) : products.slice(0, 2)
      }
    ]);
    setAiInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-teal-500/30 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-black text-white text-sm flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-400 animate-pulse" /> GEOSTORE AI ასისტენტი
          </h3>
          <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-400 hover:text-white font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-bold">მაქს. ბიუჯეტი:</span>
          <input 
            type="range" 
            min="200" 
            max="10000" 
            step="100" 
            value={aiBudget} 
            onChange={(e) => setAiBudget(Number(e.target.value))} 
            className="flex-1 accent-teal-400 cursor-pointer"
          />
          <span className="text-teal-400 font-black">{aiBudget} ₾</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl h-64 overflow-y-auto space-y-3 border border-slate-800 text-xs scrollbar-none">
          {aiChatHistory.map((m, idx) => (
            <div key={idx} className={`p-3 rounded-2xl ${m.sender === 'user' ? 'bg-teal-500/20 text-teal-200 ml-8 border border-teal-500/30' : 'bg-slate-900 text-slate-200 mr-8 border border-slate-800'}`}>
              <p className="leading-relaxed">{m.text}</p>
              {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.recommendedProducts.map(p => (
                    <div key={p.id} className="bg-slate-950 p-2.5 rounded-xl flex items-center justify-between border border-slate-800 shadow">
                      <div>
                        <p className="font-bold text-white line-clamp-1">{p.name}</p>
                        <p className="text-emerald-400 font-black mt-0.5">{formatPrice(p.priceGEL)}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(p)} 
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black transition"
                      >
                        ყიდვა
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <input 
            type="text" 
            placeholder="სთხოვე რამე AI-ს (მაგ: მირჩიე სმარტფონი)..." 
            value={aiInputText} 
            onChange={e => setAiInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiAsk()}
            className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white flex-1 outline-none focus:border-teal-500" 
          />
          <button 
            onClick={handleAiAsk} 
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-3 rounded-xl font-black text-xs shadow transition flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> გაგზავნა
          </button>
        </div>
      </div>
    </div>
  );
}
