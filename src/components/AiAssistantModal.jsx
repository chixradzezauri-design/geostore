// src/components/AiAssistantModal.jsx - Advanced AI Product Intelligence & Smart Category Concierge Edition
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, ShoppingBag, Lightbulb, RotateCcw, Tag, RefreshCw, CheckCircle2, AlertCircle, Shirt, FolderTree } from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM";

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// 🔤 ქართული და ინგლისური სინონიმებისა და სტილისტური ტერმინების გაფართოებული ლექსიკონი
const SYNONYMS = {
  laptop: ['ლეპტოპი', 'ნოუთბუქი', 'laptop', 'macbook', 'მაქბუქი', 'კომპიუტერი'],
  phone: ['ტელეფონი', 'სმარტფონი', 'iphone', 'აიფონი', 'phone', 'მობილური'],
  shoes: ['ფეხსაცმელი', 'ბოტასი', 'sneakers', 'shoe', 'ბათინკი', 'კედი'],
  clothes: ['ტანსაცმელი', 'ქურთუკი', 'შარვალი', 'პერანგი', 'მაისური', 'კაბა', 'shirt', 'jacket', 'pant', 'cloth'],
  cheap: ['იაფი', 'ბიუჯეტური', 'ფასდაკლებული', 'ხელმისაწვდომი'],
  expensive: ['ძვირი', 'ფლაგმანი', 'პრემიუმი', 'premium'],
  discount: ['ფასდაკლება', 'sale', 'აქცია', 'კუპონი', 'პრომო', 'ფასდაკლებული']
};

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products = [],
  categories = [],
  vendorsList = [],
  orders = [],
  coupons = [],
  siteSettings = {},
  selectedProduct = null,
  deliveryFees = { tbilisi: 0, bigCities: 10, other: 15 },
  addToCart,
  formatPrice
}) {
  const getInitialGreeting = () => {
    let wardrobeCount = 0;
    try {
      const savedWardrobe = localStorage.getItem('geostore_digital_wardrobe');
      if (savedWardrobe) {
        wardrobeCount = JSON.parse(savedWardrobe).length;
      }
    } catch {}

    if (selectedProduct) {
      return {
        id: 'm1',
        sender: 'ai',
        text: `გამარჯობა! 👋 ვხედავ, რომ ათვალიერებთ პროდუქტს: "${selectedProduct.name}" (${formatPrice(selectedProduct.priceGEL)}).\n\nრით შემიძლია დაგეხმაროთ მის შესახებ? გსურთ შევუძებნოთ შესაფერისი წყვილი ან შევამოწმოთ ზომები?`,
        recommendedProducts: [selectedProduct]
      };
    }
    return {
      id: 'm1',
      sender: 'ai',
      text: `გამარჯობა! 🌟 მე ვარ ${siteSettings?.storeName || 'GEOSTORE'}-ის გაფართოებული AI სტილისტი და კონსიერჟი.\n\nმაქვს სრული წვდომა კატეგორიების სრულ იერარქიაზე, თქვენს ციფრული გარდერობის ${wardrobeCount} ნივთზე, აქტიურ კუპონებსა და შეკვეთებზე. როგორ მოვძებნო სასურველი პროდუქტი ან შევქმნათ ლუქი დღეს?`
    };
  };

  const [messages, setMessages] = useState([getInitialGreeting()]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [liveProducts, setLiveProducts] = useState(products);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setMessages([getInitialGreeting()]);
      fetchLiveProducts();
    }
  }, [isAiAssistantOpen, selectedProduct]);

  // 🔄 სრული კატალოგის დინამიური წამოღება Supabase ბაზიდან
  const fetchLiveProducts = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const formatted = data.map(p => {
            let parsedTags = [];
            if (p.tags) {
              if (Array.isArray(p.tags)) parsedTags = p.tags;
              else parsedTags = String(p.tags).split(',').map(t => t.trim());
            }

            let parsedSizes = ['S', 'M', 'L', 'XL'];
            if (p.available_sizes) {
              if (Array.isArray(p.available_sizes)) parsedSizes = p.available_sizes;
              else parsedSizes = String(p.available_sizes).split(',').map(s => s.trim());
            }

            let parsedColors = ['შავი', 'თეთრი'];
            if (p.available_colors) {
              if (Array.isArray(p.available_colors)) parsedColors = p.available_colors;
              else parsedColors = String(p.available_colors).split(',').map(c => c.trim());
            }

            return {
              id: p.id,
              sku: p.sku || 'N/A',
              name: p.name || '',
              category: p.category || 'ზოგადი',
              priceGEL: Number(p.price_gel) || 0,
              oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
              stock: Number(p.stock) ?? 10,
              vendor: p.vendor || 'GEOSTORE ოფიციალური',
              image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
              tags: parsedTags,
              availableSizes: parsedSizes,
              availableColors: parsedColors,
              description: p.description || '',
              material: p.material || '',
              durability: p.durability || ''
            };
          });
          setLiveProducts(formatted);
          return formatted;
        }
      }
    } catch {}
    return liveProducts.length > 0 ? liveProducts : products;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      scrollToBottom();
    }
  }, [messages, isAiAssistantOpen]);

  const handleResetChat = () => {
    setMessages([getInitialGreeting()]);
  };

  if (!isAiAssistantOpen) return null;

  // 🧠 ულტრა-ინტელექტუალური AI ძრავი კატეგორიების იერარქიის სრული მხარდაჭერით
  const generateAiReply = (userQuery, currentProductsList) => {
    const rawQuery = userQuery.trim();
    const query = rawQuery.toLowerCase();
    const words = query.split(/\s+/).filter(w => w.length > 0);
    const sourceProducts = currentProductsList && currentProductsList.length > 0 ? currentProductsList : (liveProducts.length > 0 ? liveProducts : products);

    // 1. სალამი და ზოგადი საუბარი
    if (query.includes('გამარჯობა') || query.includes('სალამი') || query.includes('მოგესალმებით') || query.includes('hello')) {
      return {
        text: selectedProduct 
          ? `დიახ! კვლავ ვსაუბრობთ პროდუქტზე "${selectedProduct.name}". რით შეგვიძლია გავაგრძელოთ?`
          : `გამარჯობა! 🌟 სიამოვნებით დაგეხმარებით შოპინგში. მკითხეთ სასურველი კატეგორიის, პროდუქტის, ფასის, ფერის ან ციფრული გარდერობიდან ლუქების შექმნის შესახებ!`,
        products: selectedProduct ? [selectedProduct] : []
      };
    }

    // 2. ციფრული გარდერობი და სტილისტი
    if (query.includes('გარდერობ') || query.includes('ლუქი') || query.includes('რა მოვუხდინო') || query.includes('ჩემი ტანსაცმელ')) {
      let userWardrobe = [];
      try {
        const saved = localStorage.getItem('geostore_digital_wardrobe');
        if (saved) userWardrobe = JSON.parse(saved);
      } catch {}

      if (userWardrobe.length === 0) {
        return {
          text: `🧥 თქვენი ციფრული გარდერობი ჯერ ცარიელია. გადადით „AI ციფრული გარდერობის“ განყოფილებაში, ატვირთეთ თქვენი ტანსაცმელი და მე შევძლებ სრულყოფილი ლუქების და მაღაზიიდან დამატებითი ნივთების შერჩევას!`,
          products: sourceProducts.slice(0, 2)
        };
      }

      const randomStoreItem = sourceProducts[Math.floor(Math.random() * sourceProducts.length)];
      return {
        text: `✨ თქვენს ციფრულ გარდერობში ფიქსირდება ${userWardrobe.length} ნივთი. AI სტილისტის რეკომენდაცია: თქვენს არსებულ ტანსაცმელს შესანიშნავად მოუხდება ჩვენი ვიტრინიდან ქვემოთ წარმოდგენილი პრემიუმ პროდუქტი!`,
        products: [randomStoreItem]
      };
    }

    // 3. შეკვეთის ტრეკინგი
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

    // 4. ფასდაკლებები და აქციები
    const isDiscountQuery = SYNONYMS.discount.some(w => query.includes(w));
    if (isDiscountQuery) {
      const sales = sourceProducts.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
      return {
        text: `🔥 მიმდინარე სპეციალური ფასდაკლებები და აქციები (${sales.length} ნივთი):`,
        products: sales.length > 0 ? sales.slice(0, 4) : sourceProducts.slice(0, 4)
      };
    }

    // 5. პირობები (მიწოდება, გარანტია)
    if (query.includes('მიწოდება') || query.includes('კურიერი') || query.includes('ტარიფ')) {
      return {
        text: `🚀 მიწოდება მთელი საქართველოს მასშტაბით:\n• თბილისი / რუსთავი: ${deliveryFees.tbilisi === 0 ? 'უფასო' : `${deliveryFees.tbilisi} ₾`}\n• დიდი ქალაქები: ${deliveryFees.bigCities} ₾\n• სხვა რეგიონები: ${deliveryFees.other} ₾`,
        products: []
      };
    }

    if (query.includes('გარანტია')) {
      return {
        text: `🛡️ ყველა პროდუქტზე მოქმედებს ოფიციალური ქარხნული გარანტია და დაბრუნების პოლიტიკა.`,
        products: []
      };
    }

    // 🌟 6. კატეგორიებისა და სუბკატეგორიების ინტელექტუალური ამოცნობა (Categories & Subcategories Match)
    let matchedCategoryNames = [];
    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (cat && cat.name) {
          const cNameLower = cat.name.toLowerCase();
          if (query.includes(cNameLower) || words.some(w => cNameLower.includes(w))) {
            matchedCategoryNames.push(cat.name);
            // თუ ეს მთავარი კატეგორიაა, მოვნახოთ მისი შვილობილი სუბკატეგორიებიც
            const subCats = categories.filter(sub => sub.parentId === cat.id);
            subCats.forEach(sub => {
              if (sub && sub.name) matchedCategoryNames.push(sub.name);
            });
          }
        }
      });
    }

    let filtered = [...sourceProducts];

    if (matchedCategoryNames.length > 0) {
      filtered = filtered.filter(p => {
        const pCatLower = (p.category || '').toLowerCase();
        return matchedCategoryNames.some(catName => pCatLower.includes(catName.toLowerCase()));
      });
    }

    // 7. ბიუჯეტი, ფერი და ზომა
    const priceMatch = query.match(/(\d+)\s*(ლარამდე|ლარი|gel|₾)/);
    const maxBudget = priceMatch ? Number(priceMatch[1]) : null;

    const colorKeywords = ['შავი', 'თეთრი', 'წითელი', 'ლურჯი', 'მწვანე', 'ყვითელი', 'ნაცრისფერი', 'ვერცხლისფერი', 'ოქროსფერი', 'ტიტანი'];
    const foundColor = colorKeywords.find(c => query.includes(c));

    const sizeKeywords = ['s', 'm', 'l', 'xl', 'xxl', '39', '40', '41', '42', '43', '44'];
    const foundSize = sizeKeywords.find(s => query.split(/\b/).includes(s));

    if (maxBudget) {
      filtered = filtered.filter(p => p.priceGEL <= maxBudget);
    }

    if (foundColor) {
      filtered = filtered.filter(p => {
        const colStr = (p.availableColors || []).join(' ').toLowerCase();
        const nameStr = p.name.toLowerCase();
        return colStr.includes(foundColor) || nameStr.includes(foundColor);
      });
    }

    if (foundSize) {
      filtered = filtered.filter(p => {
        const sizes = (p.availableSizes || []).map(s => String(s).toLowerCase());
        return sizes.includes(foundSize);
      });
    }

    const searchWords = words.filter(w => !w.match(/\d+/) && !['ლარამდე', 'ლარი', 'გთხოვ', 'მაჩვენე', 'მინდა', 'შემირჩიე'].includes(w));
    
    if (searchWords.length > 0 && matchedCategoryNames.length === 0 && !maxBudget && !foundColor && !foundSize) {
      filtered = sourceProducts.filter(p => {
        const pName = p.name.toLowerCase();
        const pCat = p.category.toLowerCase();
        const pDesc = p.description.toLowerCase();
        const pTags = (p.tags || []).map(t => t.toLowerCase());

        return searchWords.some(w => pName.includes(w) || pCat.includes(w) || pDesc.includes(w) || pTags.some(t => t.includes(w)));
      });
    }

    if (filtered.length > 0) {
      return {
        text: `✨ კატეგორიებისა და მოთხოვნის შესაბამისად ნაპოვნია საუკეთესო პროდუქტები (${filtered.length} ვარიანტი):`,
        products: filtered.slice(0, 4)
      };
    }

    return {
      text: `🤔 ზუსტი დამთხვევა ვერ მოიძებნა, თუმცა გთავაზობთ ჩვენი პრემიუმ კატალოგის ტოპ პროდუქტებს:`,
      products: sourceProducts.slice(0, 3)
    };
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || inputMessage;
    if (!queryText.trim()) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    const refreshedProducts = await fetchLiveProducts();

    setTimeout(() => {
      const aiResult = generateAiReply(queryText, refreshedProducts);
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
      <div className="relative bg-[#0d0d10] border border-emerald-500/40 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl h-[92vh] sm:h-[680px] flex flex-col justify-between shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#121216] p-4 sm:p-5 border-b border-emerald-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/30">
              <Bot className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                {siteSettings?.storeName || 'GEOSTORE'} AI სტილისტი <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <FolderTree className="w-3 h-3" /> {selectedProduct ? `კონტექსტი: ${selectedProduct.name}` : 'კატეგორიებისა და სუბკატეგორიების ინტელექტი'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleResetChat} 
              title="საუბრის გასუფთავება"
              className="text-slate-400 hover:text-emerald-400 p-2 rounded-xl bg-slate-900 border border-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsAiAssistantOpen(false)} 
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs scrollbar-thin">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] sm:max-w-[85%] p-4 rounded-3xl space-y-3 ${msg.sender === 'user' ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' : 'bg-[#141418] border border-emerald-500/20 text-slate-200 rounded-tl-none shadow-xl'}`}>
                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-emerald-500/20">
                    {msg.recommendedProducts.map(prod => (
                      <div key={prod.id} className="bg-[#08080a] p-3 rounded-2xl border border-emerald-500/20 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-3">
                          <img src={prod.image} alt="" className="w-12 h-12 object-contain bg-[#121216] p-1 rounded-xl border border-emerald-500/20 shrink-0" />
                          <div>
                            <h5 className="font-bold text-white text-xs line-clamp-1">{prod.name}</h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-emerald-400 font-black text-xs">{formatPrice(prod.priceGEL)}</span>
                              {prod.oldPriceGEL && <span className="text-slate-500 text-[10px] line-through">{formatPrice(prod.oldPriceGEL)}</span>}
                              {prod.stock > 0 ? (
                                <span className="text-[9px] text-emerald-400/80 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> მარაგშია</span>
                              ) : (
                                <span className="text-[9px] text-rose-400 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" /> ამოწურულია</span>
                              )}
                            </div>
                            {prod.tags && prod.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {prod.tags.slice(0, 3).map((t, idx) => (
                                  <span key={idx} className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
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
              <div className="bg-[#141418] border border-emerald-500/20 p-3.5 rounded-3xl text-emerald-400 font-bold flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> AI აანალიზებს კატეგორიებსა და კატალოგს...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 sm:px-6 py-2 flex gap-2 overflow-x-auto scrollbar-none text-[11px] shrink-0">
          {['👋 გამარჯობა', '🧥 ტანსაცმელი', '👟 ფეხსაცმელები', '📱 სმარტფონები', '💻 ლეპტოპები', '🔥 ფასდაკლებები', '🚚 მიწოდება'].map((chip, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSendMessage(chip.replace(/[👋🧥👟📱💻🔥🚚]/g, '').trim())} 
              className="bg-[#141418] hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Lightbulb className="w-3 h-3" /> {chip}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 sm:p-4 bg-[#121216] border-t border-emerald-500/20 flex gap-2 sm:gap-3 shrink-0">
          <input 
            type="text" 
            placeholder="აღწერეთ სასურველი კატეგორია, პროდუქტი ან ბიუჯეტი..." 
            value={inputMessage} 
            onChange={e => setInputMessage(e.target.value)} 
            className="flex-1 bg-[#08080a] border border-emerald-500/20 p-3 sm:p-3.5 rounded-2xl text-xs text-white outline-none focus:border-emerald-400 shadow-inner" 
          />
          <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-3 sm:p-3.5 rounded-2xl font-black transition cursor-pointer shadow-lg shadow-emerald-500/20">
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
