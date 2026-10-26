// src/components/AiAssistantModal.jsx - Enhanced AI Shopping Assistant
import React, { useState } from 'react';
import { X, Bot, Send, Sparkles, ShoppingBag, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products,
  categories,
  addToCart,
  formatPrice
}) {
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის AI ასისტენტი. რით შემიძლია დაგეხმაროთ დღეს? შემიძლია შეგირჩიოთ ტექნიკა ბიუჯეტის მიხედვით ან გაგიწიოთ კონსულტაცია!',
      suggestedProducts: [] 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isAiAssistantOpen) return null;

  const quickPrompts = [
    '🔥 ტოპ სმარტფონები',
    '💻 მძლავრი ლეპტოპები',
    '⚡ დღის ფასდაკლებები',
    '📦 როგორ მუშაობს მიწოდება?'
  ];

  const handleSendQuery = (queryText) => {
    if (!queryText.trim()) return;

    const userMsg = queryText.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = "საუკეთესო არჩევანია! გადახედეთ ჩვენს ასორტიმენტს ან მიუთითეთ თქვენი ბიუჯეტი (მაგ: 'ლეპტოპი 3000 ლარამდე').";
      let matchedProducts = [];
      const lower = userMsg.toLowerCase();

      if (lower.includes('სმარტფონ') || lower.includes('iphone') || lower.includes('ტელეფონ')) {
        matchedProducts = products.filter(p => p.category === 'სმარტფონები');
        aiReply = `ნახეთ ჩვენი საუკეთესო სმარტფონები (${matchedProducts.length} მოდელი):`;
      } else if (lower.includes('ლეპტოპ') || lower.includes('macbook') || lower.includes('კომპიუტერ')) {
        matchedProducts = products.filter(p => p.category === 'ლეპტოპები');
        aiReply = `აი ჩვენი ყველაზე პოპულარული ლეპტოპები:`;
      } else if (lower.includes('ფასდაკლებ') || lower.includes('აქცია') || lower.includes('deal')) {
        matchedProducts = products.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
        aiReply = `ამჟამად მოქმედებს სპეციალური ფასდაკლებები ამ მოდელებზე:`;
      } else if (lower.includes('მიწოდებ') || lower.includes('კურიერ')) {
        aiReply = "🚀 მიწოდება თბილისში ხორციელდება 24 საათში (უფასოდ 100₾-ზე ზემოთ შეკვეთაზე), ხოლო რეგიონებში 2-3 სამუშაო დღეში.";
      } else if (lower.includes('გარანტი')) {
        aiReply = "🛡️ ყველა პროდუქტზე მოქმედებს 1-დან 3 წლამდე ოფიციალური ქარხნული გარანტია.";
      }

      setMessages(prev => [
        ...prev, 
        { sender: 'ai', text: aiReply, suggestedProducts: matchedProducts }
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-[2.5rem] max-w-lg w-full flex flex-col h-[580px] shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="w-6 h-6 text-slate-950" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse"></span>
            </div>
            <div>
              <h3 className="font-black text-white text-sm tracking-tight flex items-center gap-1.5">
                GEOSTORE AI ინტელექტუალური ასისტენტი
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" /> ონლაინ რეჟიმში • მზადაა დასახმარებლად
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsAiAssistantOpen(false)} 
            className="p-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs scrollbar-none">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl leading-relaxed ${
                m.sender === 'user' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 rounded-br-xs' 
                  : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 rounded-bl-xs shadow-inner'
              }`}>
                {m.text}
              </div>

              {/* AI პროდუქტების ბარათების რეკომენდაცია */}
              {m.suggestedProducts && m.suggestedProducts.length > 0 && (
                <div className="mt-3 space-y-2 w-full max-w-[90%]">
                  {m.suggestedProducts.map(p => (
                    <div key={p.id} className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                      <img src={p.image} alt="" className="w-12 h-12 object-contain bg-slate-900 rounded-xl p-1 border border-slate-800 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">{p.name}</h4>
                        <p className="text-emerald-400 font-black text-xs mt-0.5">{formatPrice(p.priceGEL)}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(p)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-[11px] font-black flex items-center gap-1 shrink-0 transition cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-950/60 p-3 rounded-2xl w-fit border border-slate-800/60">
              <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>AI პასუხს ამზადებს...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-6 py-2 bg-slate-950/40 border-t border-slate-800/40 flex gap-2 overflow-x-auto scrollbar-none">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendQuery(prompt)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(input); }} className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex gap-2.5">
          <input
            type="text"
            placeholder="ჰკითხეთ AI-ს ტექნიკის შესახებ..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
          <button 
            type="submit" 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black p-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
