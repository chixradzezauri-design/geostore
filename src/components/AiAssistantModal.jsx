// src/components/AiAssistantModal.jsx
import React, { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products,
  addToCart,
  formatPrice
}) {
  const [aiBudget] = useState(10000);
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის ჭკვიანი AI ასისტენტი. რით შემიძლია დაგეხმაროთ დღეს?',
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
        text: `🤖 საუკეთესო პროდუქტები თქვენი ბიუჯეტის (${aiBudget} ₾) შესაბამისად:`,
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
            <Bot className="w-5 h-5 text-teal-400" /> AI ასისტენტი
          </h3>
          <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl h-64 overflow-y-auto space-y-3 border border-slate-800 text-xs">
          {aiChatHistory.map((m, idx) => (
            <div key={idx} className={`p-3 rounded-2xl ${m.sender === 'user' ? 'bg-teal-500/20 text-teal-200 ml-8' : 'bg-slate-900 text-slate-200 mr-8'}`}>
              <p>{m.text}</p>
              {m.recommendedProducts && m.recommendedProducts.map(p => (
                <div key={p.id} className="mt-2 bg-slate-950 p-2 rounded-xl flex justify-between items-center border border-slate-800">
                  <span>{p.name} - {formatPrice(p.priceGEL)}</span>
                  <button onClick={() => addToCart(p)} className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black">ყიდვა</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input type="text" placeholder="სთხოვე AI-ს..." value={aiInputText} onChange={e => setAiInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiAsk()} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white flex-1 outline-none" />
          <button onClick={handleAiAsk} className="bg-teal-500 text-slate-950 px-5 py-3 rounded-xl font-black text-xs flex items-center gap-1.5"><Send className="w-4 h-4" /> გაგზავნა</button>
        </div>
      </div>
    </div>
  );
}
