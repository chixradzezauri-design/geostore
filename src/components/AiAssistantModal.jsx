// src/components/AiAssistantModal.jsx - GEOSTORE Advanced AI Assistant (Smart Context-Aware)
import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, ShoppingBag, CheckCircle2 } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products,
  categories,
  addToCart,
  formatPrice
}) {
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის უმაღლესი დონის AI ექსპერტი. მზად ვარ გიპასუხოთ ნებისმიერ კითხვაზე ჩვენი პროდუქტების, ფასების, ტექნიკური მახასიათებლების ან მიწოდების პირობების შესახებ. რით შემიძლია დაგეხმაროთ?',
      recommendedProducts: []
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  if (!isAiAssistantOpen) return null;

  const handleAiAsk = () => {
    if (!aiInputText.trim()) return;
    const query = aiInputText.trim();
    const userMsg = { sender: 'user', text: query };
    
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiInputText('');
    setIsThinking(true);

    setTimeout(() => {
      let responseText = '';
      let matchedProducts = [];
      const lowerQuery = query.toLowerCase();

      // ლოგიკური ანალიზი მომხმარებლის კითხვაზე
      if (lowerQuery.includes('როგორ') || lowerQuery.includes('ყიდვა') || lowerQuery.includes('შეკვეთა')) {
        responseText = '📦 პროდუქტის შესაძენად უბრალოდ დააჭირეთ ღილაკს „კალათაში“, გადადით კალათის გვერდზე და დააჭირეთ „შეკვეთის გაფორმებას“. შეავსეთ თქვენი მონაცემები და კურიერი უმოკლეს დროში მოგაწვდით შენაძენს!';
      } else if (lowerQuery.includes('მიწოდება') || lowerQuery.includes('დრო') || lowerQuery.includes('სად') || lowerQuery.includes('ქალაქი')) {
        responseText = '🚚 მიწოდება ხორციელდება მთელი საქართველოს მასშტაბით. თბილისში მიწოდება უფასოა და ხდება იმავე დღეს, ხოლო რეგიონებში 2-3 სამუშაო დღეში.';
      } else if (lowerQuery.includes('განვადება') || lowerQuery.includes('ფასდაკლება') || lowerQuery.includes('აქცია')) {
        responseText = '💳 GEOSTORE-ში მოქმედებს 0%იანი განვადება წამყვან ქართულ ბანკებთან (TBC, Bank of Georgia) ერთად. ასევე მუდმივად გვაქვს სპეციალური სეზონური ფასდაკლებები!';
      } else {
        // ძებნა რეალურ პროდუქტებში კითხვარისა და ქვერდების მიხედვით
        matchedProducts = products.filter(p => 
          p.name.toLowerCase().includes(lowerQuery) || 
          p.category.toLowerCase().includes(lowerQuery) ||
          (p.brand && p.brand.toLowerCase().includes(lowerQuery))
        );

        if (matchedProducts.length > 0) {
          responseText = `✨ თქვენი მოთხოვნის შესაბამისად, ჩვენს კატალოგში მოიძებნა შემდეგი საუკეთესო შეთავაზებები:`;
        } else {
          // თუ ზუსტი დამთხვევა ვერ მოძებნა, გვაძლევს ზოგად ჭკვიან პასუხს და საუკეთესო პროდუქტებს
          responseText = `🔍 თქვენს კითხვაზე ზუსტი დამთხვევა ვერ მოვძებნე, თუმცა გთავაზობთ ჩვენს ფლაგმანურ და ყველაზე მოთხოვნად ტექნიკას:`;
          matchedProducts = products.slice(0, 2);
        }
      }

      setAiChatHistory(prev => [
        ...prev,
        {
          sender: 'ai',
          text: responseText,
          recommendedProducts: matchedProducts.slice(0, 3)
        }
      ]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-teal-500/40 p-5 sm:p-6 rounded-3xl max-w-xl w-full space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-teal-500/20 border border-teal-500/30 p-2 rounded-2xl">
              <Bot className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                GEOSTORE AI ექსპერტი <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-[10px] text-teal-400 font-bold">მთლიანი საიტის ბაზასთან დაკავშირებული ინტელექტი</p>
            </div>
          </div>
          <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-400 hover:text-white p-1 bg-slate-950 rounded-xl border border-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CHAT MESSAGES AREA */}
        <div className="bg-slate-950 p-4 rounded-2xl flex-1 overflow-y-auto space-y-3.5 border border-slate-800 text-xs shadow-inner">
          {aiChatHistory.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl max-w-[90%] sm:max-w-[85%] leading-relaxed ${
                m.sender === 'user' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-semibold rounded-br-none shadow' 
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow'
              }`}>
                <p>{m.text}</p>
                
                {/* RECOMMENDED PRODUCTS CARDS INSIDE CHAT */}
                {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-800/80">
                    {m.recommendedProducts.map(p => (
                      <div key={p.id} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center gap-3 border border-slate-800/80 hover:border-emerald-500/50 transition">
                        <div className="flex items-center gap-2.5">
                          <img src={p.image} alt="" className="w-10 h-10 object-contain bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0" />
                          <div>
                            <h5 className="font-bold text-white text-[11px] line-clamp-1">{p.name}</h5>
                            <p className="text-emerald-400 font-black text-[11px]">{formatPrice(p.priceGEL)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => addToCart(p)} 
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition shadow flex items-center gap-1"
                        >
                          <ShoppingBag className="w-3 h-3" /> ყიდვა
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-teal-400 text-xs italic bg-slate-900/50 p-3 rounded-2xl w-fit border border-slate-800">
              <span className="animate-spin">⚙️</span> AI ამუშავებს მონაცემებს და ეძებს პასუხს...
            </div>
          )}
        </div>

        {/* INPUT & SEND */}
        <div className="flex gap-2 pt-1">
          <input 
            type="text" 
            placeholder="მაგ: როგორ ვიყიდო iPhone ან რა ფასებია ლეპტოპებზე..." 
            value={aiInputText} 
            onChange={e => setAiInputText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAiAsk()} 
            className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs text-white flex-1 outline-none focus:border-teal-500 placeholder-slate-500 shadow" 
          />
          <button 
            onClick={handleAiAsk} 
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 px-5 py-3.5 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-lg transition shrink-0"
          >
            <Send className="w-4 h-4" /> გაგზავნა
          </button>
        </div>

      </div>
    </div>
  );
}
