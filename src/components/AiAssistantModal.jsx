// src/components/AiAssistantModal.jsx - Ultimate AI Concierge with Full Database Sync & Intelligence
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, ShoppingBag, ArrowRight, Lightbulb, PackageCheck, Store, ShieldCheck, Truck, Tag } from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24ilastKey...RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM";

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products = [],
  categories = [],
  vendorsList = [],
  orders = [],
  addToCart,
  formatPrice
}) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: 'გამარჯობა! 👋 მე ვარ GEOSTORE-ის მთავარი AI კონსიერჟი. მაქვს სრული წვდომა ჩვენს ღრუბლოვან კატალოგზე, ვენდერებსა და შეკვეთებზე. რით შემიძლია დაგეხმაროთ დღეს?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveProducts, setLiveProducts] = useState(products);
  const messagesEndRef = useRef(null);

  // 🔄 პროდუქტების დინამიური წამოღება პირდაპირ Supabase ბაზიდან
  useEffect(() => {
    const fetchLiveProducts = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category || 'სმარტფონები',
              priceGEL: Number(p.price_gel),
              oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
              stock: Number(p.stock) || 1,
              vendor: p.vendor || 'GEOSTORE',
              image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'
            }));
            setLiveProducts(formatted);
          }
        }
      } catch {}
    };

    if (isAiAssistantOpen) {
      fetchLiveProducts();
    }
  }, [isAiAssistantOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      scrollToBottom();
    }
  }, [messages, isAiAssistantOpen]);

  if (!isAiAssistantOpen) return null;

  // 🧠 გაძლიერებული AI ძრავი სრული ბაზის მხარდაჭერით
  const generateAiReply = (userQuery) => {
    const query = userQuery.toLowerCase().trim();
    let matchedProducts = [];
    const sourceProducts = liveProducts.length > 0 ? liveProducts : products;

    if (query.includes('როგორ') && (query.includes('ხარ') || query.includes('ბრძანდებით'))) {
      return {
        text: 'გმადლობთ, იდეალურად! 🤖 მზად ვარ დაგეხმაროთ პროდუქტების შერჩევაში ან შეკვეთის სტატუსის გადამოწმებაში.',
        products: []
      };
    }

    if (query.includes('გამარჯობა') || query.includes('სალამი') || query.includes('მოგესალმებით')) {
      return {
        text: 'გამარჯობა! 🌟 სიამოვნებით გესაუბრებით. რა გაინტერესებთ დღეს GEOSTORE-ში?',
        products: []
      };
    }

    if (query.includes('ვინ') || query.includes('შეგიძლია')) {
      return {
        text: 'მე ვარ GEOSTORE-ის ინტელექტუალური AI ასისტენტი 🤖. დამევალა:\n\n• პროდუქტების მოძიება ბიუჯეტისა და კატეგორიის მიხედვით\n• შეკვეთების სტატუსის შემოწმება (#ORD კოდით)\n• ინფორმაციის მოწოდება მიწოდებასა და გარანტიაზე',
        products: []
      };
    }

    // შეკვეთის ტრეკინგი
    const orderMatch = query.match(/ord[-\s]?\d+/i) || query.match(/#?\d{4,}/);
    if (orderMatch || query.includes('შეკვეთა') || query.includes('სტატუსი')) {
      if (orderMatch) {
        const orderIdClean = orderMatch[0].toUpperCase().replace(/\s+/g, '');
        const foundOrder = (orders || []).find(o => o.id?.toUpperCase().includes(orderIdClean));
        
        if (foundOrder) {
          return {
            text: `📦 შეკვეთა #${foundOrder.id}:\n• მიმღები: ${foundOrder.customerName}\n• თარიღი: ${foundOrder.date}\n• თანხა: ${formatPrice(foundOrder.totalGEL)}\n• სტატუსი: 🟢 ${foundOrder.status || 'ახალი'}`,
            products: []
          };
        } else {
          return {
            text: `🔍 შეკვეთა კოდით "${orderMatch[0].toUpperCase()}" ვერ მოიძებნა ბაზაში.`,
            products: []
          };
        }
      } else {
        return {
          text: 'შეკვეთის შესამოწმებლად, გთხოვთ მომწეროთ შეკვეთის უნიკალური ნომერი (მაგ: ORD-1025)! 📦',
          products: []
        };
      }
    }

    if (query.includes('კატეგორია') || query.includes('რას ყიდით')) {
      const catNames = (categories || []).map(c => typeof c === 'object' ? c.name : c).join(', ');
      return {
        text: `🛒 ძირითადი კატეგორიები: ${catNames || 'სმარტფონები, ლეპტოპები, აქსესუარები'}. აირჩიეთ სასურველი მიმართულება!`,
        products: sourceProducts.slice(0, 2)
      };
    }

    if (query.includes('გარანტია')) {
      return {
        text: '🛡️ GEOSTORE-ის ყველა პროდუქტზე მოქმედებს ოფიციალური ქარხნული გარანტია.',
        products: []
      };
    }

    if (query.includes('მიწოდება') || query.includes('კურიერი')) {
      return {
        text: '🚀 მიწოდება ხორციელდება საქართველოს მასშტაბით. თბილისში მიწოდება უფასოა!',
        products: []
      };
    }

    if (query.includes('განვადება')) {
      return {
        text: '💳 ხელმისაწვდომია 0%-იანი განვადება წამყვანი ბანკებიდან.',
        products: []
      };
    }

    // ბიუჯეტის მიხედვით ძებნა
    const priceMatch = query.match(/(\d+)\s*(ლარამდე|ლარი|gel)/);
    const maxBudget = priceMatch ? Number(priceMatch[1]) : null;

    if (maxBudget) {
      matchedProducts = sourceProducts.filter(p => p.priceGEL <= maxBudget);
      return { 
        text: `აი საუკეთესო პროდუქტები ბიუჯეტის მიხედვით (${maxBudget} ₾-მდე):`, 
        products: matchedProducts.slice(0, 3) 
      };
    } 

    if (query.includes('ფასდაკლება') || query.includes('sale')) {
      matchedProducts = sourceProducts.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
      return { 
        text: '🔥 მიმდინარე სპეციალური ფასდაკლებები:', 
        products: matchedProducts.slice(0, 3) 
      };
    } 

    if (query.includes('ლეპტოპ') || query.includes('laptop') || query.includes('macbook')) {
      matchedProducts = sourceProducts.filter(p => (p.category || '').toLowerCase().includes('ლეპტოპ') || p.name.toLowerCase().includes('laptop'));
      return { text: '💻 საუკეთესო ლეპტოპების კოლექცია:', products: matchedProducts.slice(0, 3) };
    } 

    if (query.includes('ტელეფონ') || query.includes('phone') || query.includes('iphone') || query.includes('სმარტფონ')) {
      matchedProducts = sourceProducts.filter(p => (p.category || '').toLowerCase().includes('სმარტფონ') || p.name.toLowerCase().includes('iphone'));
      return { text: '📱 სმარტფონების ფლაგმანური არჩევანი:', products: matchedProducts.slice(0, 3) };
    }

    // ზოგადი ტექსტური ძიება ბაზაში
    matchedProducts = sourceProducts.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.vendor && p.vendor.toLowerCase().includes(query))
    );

    if (matchedProducts.length > 0) {
      return {
        text: `✨ მოთხოვნის შესაბამისად ვიპოვე შემდეგი პროდუქტები:`,
        products: matchedProducts.slice(0, 3)
      };
    }

    return {
      text: `🤔 ზუსტი დამთხვევა ვერ ვიპოვე. სცადეთ სხვა საკვანძო სიტყვა (მაგ: "ლეპტოპი", "აიფონი", "ფასდაკლება") ან აირჩიეთ შემოთავაზებული თემებიდან:`,
      products: sourceProducts.slice(0, 2)
    };
  };

  const handleSendMessage = (textToSend) => {
    const queryText = textToSend || inputMessage;
    if (!queryText.trim()) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResult = generateAiReply(queryText);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResult.text,
        recommendedProducts: aiResult.products
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative bg-[#0d0d10] border border-emerald-500/40 rounded-[2.5rem] w-full max-w-2xl h-[640px] flex flex-col justify-between shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#121216] p-5 border-b border-emerald-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/30">
              <Bot className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                GEOSTORE AI კონსიერჟი <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold">ღრუბლოვანი ბაზის ინტელექტუალური ასისტენტი (24/7)</p>
            </div>
          </div>
          <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-3xl space-y-3 ${msg.sender === 'user' ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' : 'bg-[#141418] border border-emerald-500/20 text-slate-200 rounded-tl-none shadow-xl'}`}>
                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-emerald-500/20">
                    {msg.recommendedProducts.map(prod => (
                      <div key={prod.id} className="bg-[#08080a] p-3 rounded-2xl border border-emerald-500/20 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-3">
                          <img src={prod.image} alt="" className="w-12 h-12 object-contain bg-[#121216] p-1 rounded-xl border border-emerald-500/20 shrink-0" />
                          <div>
                            <h5 className="font-bold text-white text-xs line-clamp-1">{prod.name}</h5>
                            <span className="text-emerald-400 font-black text-xs">{formatPrice(prod.priceGEL)}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => addToCart(prod)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl font-black text-[10px] flex items-center gap-1 shrink-0 transition shadow cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" /> კალათაში
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#141418] border border-emerald-500/20 p-4 rounded-3xl text-emerald-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> AI ეძებს ბაზაში...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-none text-[11px] shrink-0">
          {['👋 გამარჯობა', '🛒 კატეგორიები', '🔥 ფასდაკლებები', '💳 განვადება', '🚚 მიწოდება'].map((chip, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSendMessage(chip.replace(/[👋🛒🔥💳🚚]/g, '').trim())} 
              className="bg-[#141418] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Lightbulb className="w-3 h-3" /> {chip}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4 bg-[#121216] border-t border-emerald-500/20 flex gap-3 shrink-0">
          <input 
            type="text" 
            placeholder="ჰკითხეთ AI-ს პროდუქტებზე, ფასებზე ან შეკვეთებზე..." 
            value={inputMessage} 
            onChange={e => setInputMessage(e.target.value)} 
            className="flex-1 bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-emerald-400 shadow-inner" 
          />
          <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-3.5 rounded-2xl font-black transition cursor-pointer shadow-lg shadow-emerald-500/20">
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
