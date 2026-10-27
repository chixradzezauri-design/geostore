// src/components/AiAssistantModal.jsx - High-IQ Smart AI Concierge (Robust Keyword Search)
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, ShoppingBag, ArrowRight, Lightbulb, PackageCheck } from 'lucide-react';

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products = [],
  categories = [],
  orders = [],
  addToCart,
  formatPrice
}) {
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'ai',
      text: 'გამარჯობა! 👋 მე ვარ GEOSTORE-ის პრემიუმ AI კონსიერჟი. რით შემიძლია დაგეხმაროთ დღეს? შეგიძლიათ მკითხოთ რეკომენდაცია ბიუჯეტის, ტექნიკის პარამეტრების, განვადების, მიწოდების ან თქვენი შეკვეთის სტატუსის შესახებ!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      scrollToBottom();
    }
  }, [messages, isAiAssistantOpen]);

  if (!isAiAssistantOpen) return null;

  // 🧠 სუპერ-მდგრადი საკვანძო სიტყვების ანალიზატორი
  const generateAiReply = (userQuery) => {
    const query = userQuery.toLowerCase().trim();
    let matchedProducts = [];

    // 1. მეგობრული საუბარი და მოკითხვა
    if (query.includes('როგორ') && (query.includes('ხარ') || query.includes('ბრძანდებით') || query.includes('გისვამ'))) {
      return {
        text: 'გმადლობთ, მშვენივრად! 🤖 ყოველთვის მზად ვარ, რომ GEOSTORE-ში საუკეთესო შოპინგის გამოცდილება შექმნათ. თქვენ როგორ ბრძანდებით, რით დაგეხმაროთ?',
        products: []
      };
    }

    if (query.includes('გამარჯობა') || query.includes('სალამი') || query.includes('მოგესალმებით') || query.includes('hello') || query.includes('hi')) {
      return {
        text: 'გამარჯობა! 🌟 რა სასიამოვნოა თქვენთან საუბარი. რით შემიძლია დაგეხმაროთ? გსურთ ტექნიკის შერჩევა, ფასდაკლებების ნახვა თუ შეკვეთის სტატუსის შემოწმება?',
        products: []
      };
    }

    if (query.includes('ვინ') || query.includes('შენი') || query.includes('შეგიძლია') || query.includes('რისი')) {
      return {
        text: 'მე ვარ GEOSTORE-ის ხელოვნური ინტელექტის ასისტენტი 🤖. შემიძლია დაგეხმაროთ ტექნიკის შერჩევაში, განვადებისა და მიწოდების პირობების გაცნობაში ან შეკვეთის სტატუსის შემოწმებაში!',
        products: []
      };
    }

    if (query.includes('მადლობა') || query.includes('გმადლობ') || query.includes('გაიხარე') || query.includes('thanks')) {
      return {
        text: 'დიდი არაფრის! ❤️ სიამოვნებით დაგეხმარეთ. თუ დამატებითი კითხვები გექნებათ, ნებისმიერ დროს მომწერეთ!',
        products: []
      };
    }

    // 2. შეკვეთის სტატუსის შემოწმება (#ORD-1234)
    const orderMatch = query.match(/ord[-\s]?\d+/i);
    if (orderMatch || query.includes('შეკვეთა') || query.includes('სტატუსი')) {
      if (orderMatch) {
        const orderIdClean = orderMatch[0].toUpperCase().replace(/\s+/g, '');
        const foundOrder = (orders || []).find(o => o.id?.toUpperCase() === orderIdClean || o.id?.toUpperCase() === `#${orderIdClean}`);
        
        if (foundOrder) {
          return {
            text: `📦 შეკვეთა #${foundOrder.id}:\n• მიმღები: ${foundOrder.customerName}\n• თარიღი: ${foundOrder.date}\n• თანხა: ${formatPrice(foundOrder.totalGEL)}\n• სტატუსი: 🟢 ${foundOrder.status || 'ახალი'}`,
            products: []
          };
        } else {
          return {
            text: `🔍 შეკვეთა კოდით "${orderMatch[0].toUpperCase()}" ვერ მოიძებნა. გთხოვთ გადაამოწმოთ კოდი!`,
            products: []
          };
        }
      } else {
        return {
          text: 'შეკვეთის შესამოწმებლად, გთხოვთ მიაწეროთ შეკვეთის კოდი (მაგალითად: ORD-9572)! 📦',
          products: []
        };
      }
    }

    // 3. გარანტია, მიწოდება, განვადება
    if (query.includes('გარანტია') || query.includes('საგარანტიო')) {
      return {
        text: '🛡️ GEOSTORE-ის ყველა პროდუქტზე მოქმედებს ოფიციალური გარანტია!',
        products: []
      };
    }

    if (query.includes('მიწოდება') || query.includes('მიტანა') || query.includes('კურიერი')) {
      return {
        text: '🚀 მიწოდება ხორციელდება მთელი საქართველოს მასშტაბით! თბილისში 1-2 დღეში, ხოლო რეგიონებში 2-3 დღეში.',
        products: []
      };
    }

    if (query.includes('განვადება') || query.includes('0%') || query.includes('თვე')) {
      return {
        text: '💳 GEOSTORE-ში მოქმედებს 0%-იანი განვადება 6, 12 და 24 თვემდე!',
        products: []
      };
    }

    // 4. პროდუქტების ძებნა ფასით ან კატეგორიით
    const priceMatch = query.match(/(\d+)\s*(ლარამდე|ლარი|gel)/);
    const maxBudget = priceMatch ? Number(priceMatch[1]) : null;

    if (maxBudget) {
      matchedProducts = products.filter(p => p.priceGEL <= maxBudget);
      return { 
        text: `აი საუკეთესო პროდუქტები (${maxBudget} ₾-მდე):`, 
        products: (matchedProducts.length > 0 ? matchedProducts : products).slice(0, 3) 
      };
    } 
    
    if (query.includes('ფასდაკლება') || query.includes('აქცია') || query.includes('sale')) {
      matchedProducts = products.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
      return { 
        text: '🔥 ხელმისაწვდომია შემდეგი ფასდაკლებები:', 
        products: (matchedProducts.length > 0 ? matchedProducts : products).slice(0, 3) 
      };
    } 

    if (query.includes('ლეპტოპ') || query.includes('laptop') || query.includes('macbook')) {
      matchedProducts = products.filter(p => p.category === 'ლეპტოპები' || p.name.toLowerCase().includes('macbook') || p.name.toLowerCase().includes('laptop'));
      return { text: '💻 საუკეთესო ლეპტოპები:', products: (matchedProducts.length > 0 ? matchedProducts : products).slice(0, 3) };
    } 

    if (query.includes('ტელეფონ') || query.includes('phone') || query.includes('iphone') || query.includes('სმარტფონ')) {
      matchedProducts = products.filter(p => p.category === 'სმარტფონები' || p.name.toLowerCase().includes('iphone'));
      return { text: '📱 სმარტფონების არჩევანი:', products: (matchedProducts.length > 0 ? matchedProducts : products).slice(0, 3) };
    }

    // ზოგადი ძიება პროდუქტებში
    matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    );

    if (matchedProducts.length > 0) {
      return {
        text: `✨ თქვენი მოთხოვნის მიხედვით ვიპოვეთ:`,
        products: matchedProducts.slice(0, 3)
      };
    }

    // 5. სათადარიგო პასუხი, თუ სიტყვა ვერ იცნო
    return {
      text: `🤔 ვეცადე პასუხის მოძებნა, მაგრამ ვერ დავამყარე ზუსტი კავშირი. შეგიძლიათ მკითხოთ ტექნიკის, მიწოდების, განვადების ან ფასდაკლებების შესახებ! აი რამდენიმე პოპულარული ნივთი:`,
      products: products.slice(0, 2)
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
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative bg-[#0d0d10] border border-emerald-500/40 rounded-[2.5rem] w-full max-w-2xl h-[620px] flex flex-col justify-between shadow-2xl overflow-hidden">
        
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
              <p className="text-[10px] text-emerald-400 font-bold">ინტელექტუალური ასისტენტი (24/7)</p>
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
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> AI ფიქრობს...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-none text-[11px] shrink-0">
          {['👋 გამარჯობა', '😊 როგორ ხარ?', '🤖 ვინ ხარ?', '🔥 ფასდაკლებები', '💳 0% განვადება', '🚚 მიწოდება'].map((chip, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSendMessage(chip.replace(/[👋😊🤖🔥💳🚚]/g, '').trim())} 
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
            placeholder="ჰკითხეთ AI-ს ნებისმიერი რამ..." 
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
