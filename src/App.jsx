import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag, ArrowUp, ArrowDown, Printer, Truck, Percent, Users, Settings
} from 'lucide-react';

const CATEGORIES_KA = ["ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი", "სხვა პროდუქტები"];

const INITIAL_PRODUCTS = [
  { 
    id: 1, 
    sku: "GEO-IPH-15P", 
    name: "Apple iPhone 15 Pro Max 256GB", 
    category: "ელექტრონიკა", 
    price: 4599, 
    oldPrice: 4899,
    costPrice: 3800,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", 
    gallery: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80"],
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი. ოფიციალური გარანტია 1 წელი.", 
    stock: 12,
    rating: 4.9,
    reviews: []
  }
];

export default function App() {
  const [lang, setLang] = useState("KA");

  const [pageSections, setPageSections] = useState(() => {
    const saved = localStorage.getItem('geostore_page_sections');
    return saved ? JSON.parse(saved) : [
      { id: 'hero', name: "მთავარი ბანერი & Flash Sale", visible: true },
      { id: 'promoSlots', name: "მცირე სარეკლამო ბლოკები", visible: true },
      { id: 'categories', name: "კატეგორიების ფილტრი", visible: true },
      { id: 'productsGrid', name: "პროდუქტების ბადე", visible: true }
    ];
  });

  useEffect(() => {
    localStorage.setItem('geostore_page_sections', JSON.stringify(pageSections));
  }, [pageSections]);

  const toggleSectionVisibility = (id) => {
    setPageSections(pageSections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const moveSection = (index, direction) => {
    const updated = [...pageSections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < updated.length) {
      const temp = updated[index];
      updated[index] = updated[target];
      updated[target] = temp;
      setPageSections(updated);
    }
  };

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('geostore_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('geostore_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('geostore_users_list');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "გიორგი ბერიძე", email: "giorgi@gmail.com", phone: "+995 599 11 22 33", date: "2026-10-15" }
    ];
  });

  useEffect(() => {
    localStorage.setItem('geostore_users_list', JSON.stringify(usersList));
  }, [usersList]);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [banners] = useState(() => {
    const saved = localStorage.getItem('geostore_banners');
    return saved ? JSON.parse(saved) : [{ id: 1, title: "გრანდიოზული ფასდაკლება 2026!", subtitle: "ისარგებლეთ 10%-იანი ფასდაკლებით კოდით: GEO2026", image: "" }];
  });
  const [currentBannerIndex] = useState(0);

  const [promoCodes, setPromoCodes] = useState(() => {
    const saved = localStorage.getItem('geostore_promos');
    return saved ? JSON.parse(saved) : [{ id: 1, code: "GEO2026", discount: 10 }];
  });

  useEffect(() => {
    localStorage.setItem('geostore_promos', JSON.stringify(promoCodes));
  }, [promoCodes]);

  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });

  // გლობალური პარამეტრები (პოლიტიკა და ა.შ.)
  const [policyText, setPolicyText] = useState(() => {
    const saved = localStorage.getItem('geostore_policy_text');
    return saved || "მიწოდება ხორციელდება თბილისში 24 საათში (5₾), ხოლო რეგიონებში 48 საათში (10₾). 100₾-ზე მეტი შეკვეთისას მიწოდება უფასოა.";
  });

  useEffect(() => {
    localStorage.setItem('geostore_policy_text', policyText);
  }, [policyText]);

  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop"); 
  
  const [toastMessage, setToastMessage] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", phone: "", email: "", password: "" });

  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSubTab, setAdminSubTab] = useState("crm"); // CRM პრიორიტეტი
  
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", deliveryZone: "tbilisi" });
  const [orderSuccess, setOrderSuccess] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return;
    const userData = { id: Date.now(), name: authForm.name || "მომხმარებელი", email: authForm.email, phone: "+995 500 00 00 00", date: new Date().toISOString().split('T')[0] };
    
    setUsersList(prev => {
      const exists = prev.some(u => u.email === userData.email);
      if (!exists) return [userData, ...prev];
      return prev;
    });

    setCurrentUser(userData);
    setIsAuthOpen(false);
    showToast("ავტორიზაცია წარმატებულია!");
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast("🛒 დაემატა კალათაში!");
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const applyCoupon = () => {
    const found = promoCodes.find(p => p.code.toUpperCase() === couponCode.toUpperCase());
    if (found) {
      setDiscountPercent(found.discount);
      showToast(`🎉 პრომოკოდი გააქტიურდა! (-${found.discount}%)`);
    } else {
      alert("არასწორი პრომოკოდი!");
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = (subTotal * discountPercent) / 100;
  const deliveryFee = orderForm.deliveryZone === "tbilisi" ? 5 : 10;
  const grandTotal = subTotal - discountAmount + (cart.length > 0 ? deliveryFee : 0);

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.address) return;

    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total: grandTotal,
      customer: { ...orderForm },
      status: "ახალი"
    };

    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const deleteUser = (id) => {
    if (confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) {
      setUsersList(usersList.filter(u => u.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold">
          {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => setActiveTab("shop")} className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-black text-white px-3 py-1 rounded-xl">GEO</span>
            <span>STORE</span>
          </button>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <button onClick={() => setActiveTab("profile")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100">
                <User className="w-4 h-4" /> შესვლა
              </button>
            )}

            <button onClick={() => setActiveTab("admin")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-gray-100'}`}>
              <Lock className="w-3.5 h-3.5" /> ადმინი
            </button>
            <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="w-4 h-4" /> კალათა
              {cart.reduce((s, i) => s + i.qty, 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-4">
            <h2 className="text-2xl font-black">მომხმარებლის პროფილი</h2>
            <p className="text-sm"><b>სახელი:</b> {currentUser.name}</p>
            <p className="text-sm"><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p className="text-sm"><b>ტელეფონი:</b> {currentUser.phone}</p>
            <button onClick={() => { setCurrentUser(null); setActiveTab("shop"); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">პოლიტიკა და პირობები</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{policyText}</p>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">უკან</button>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10">
                <h2 className="text-2xl font-bold text-center mb-4">ადმინისტრაცია (პინ: 1234)</h2>
                <form onSubmit={(e) => { e.preventDefault(); if(adminPin === '1234') setIsAdminLoggedIn(true); else setAdminError('არასწორი პინ-კოდი'); }} className="space-y-4">
                  <input type="password" placeholder="პინ-კოდი" value={adminPin} onChange={e => setAdminPin(e.target.value)} className="w-full bg-gray-100 border rounded-xl p-3 text-center text-lg outline-none" />
                  {adminError && <p className="text-red-500 text-xs text-center">{adminError}</p>}
                  <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-3xl font-black">CRM & ადმინ პანელი</h2>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                </div>

                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('crm')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'crm' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    👥 მომხმარებლები (CRM) ({usersList.length})
                  </button>
                  <button onClick={() => setAdminSubTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'settings' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    ⚙️ პოლიტიკა & პარამეტრები
                  </button>
                  <button onClick={() => setAdminSubTab('builder')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'builder' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    🎨 Page Builder
                  </button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    📦 შეკვეთები
                  </button>
                </div>

                {/* მომხმარებელთა CRM */}
                {adminSubTab === 'crm' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">რეგისტრირებული მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-3">
                      {usersList.map(u => (
                        <div key={u.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm">{u.name}</h4>
                            <p className="text-xs text-gray-500">📧 {u.email} | 📞 {u.phone} | თარიღი: {u.date}</p>
                          </div>
                          <button onClick={() => deleteUser(u.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* პოლიტიკისა და ზოგადი პარამეტრების მართვა */}
                {adminSubTab === 'settings' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">⚙️ საიტის პოლიტიკისა და პირობების მართვა</h3>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">მიწოდების და დაბრუნების პოლიტიკის ტექსტი:</label>
                      <textarea value={policyText} onChange={e => setPolicyText(e.target.value)} className="w-full bg-gray-100 border rounded-2xl p-4 text-sm outline-none h-32" />
                      <button onClick={() => showToast("პოლიტიკა წარმატებით განახლდა!")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">შენახვა</button>
                    </div>
                  </div>
                )}

                {adminSubTab === 'builder' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">🎨 Page Builder</h3>
                    <div className="space-y-3">
                      {pageSections.map((sec, idx) => (
                        <div key={sec.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                          <span className="font-bold text-sm">{sec.name} ({sec.visible ? '🟢 ჩართული' : '🔴 გამორთული'})</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleSectionVisibility(sec.id)} className="px-3 py-1.5 bg-white border rounded-xl text-xs font-bold">
                              {sec.visible ? 'დამალვა' : 'ჩვენება'}
                            </button>
                            <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                            <button onClick={() => moveSection(idx, 'down')} disabled={idx === pageSections.length - 1} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთები ({orders.length})</h3>
                    {orders.length === 0 ? <p className="text-xs text-gray-400">შეკვეთები არ არის</p> : orders.map(o => (
                      <div key={o.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between">
                        <span>შეკვეთა #{o.id} - {o.customer.name}</span>
                        <span className="font-bold">{o.total} ₾</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-8">
            {pageSections.map(sec => {
              if (!sec.visible) return null;

              if (sec.id === 'hero') {
                return (
                  <div key="hero" className="rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl bg-black text-white flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative z-10 max-w-xl space-y-3">
                      <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 w-fit">
                        <Zap className="w-3.5 h-3.5 fill-white" /> FLASH SALE 2026
                      </span>
                      <h1 className="text-3xl md:text-5xl font-black leading-tight">{banners[currentBannerIndex]?.title || "გრანდიოზული ფასდაკლება!"}</h1>
                      <p className="text-gray-300 text-sm">გამოიყენეთ პრომოკოდი: <span className="bg-white/20 px-2 py-0.5 rounded font-bold">GEO2026</span></p>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'categories') {
                return (
                  <div key="categories" className="flex items-center gap-2 overflow-x-auto pb-2">
                    {CATEGORIES_KA.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white border'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                );
              }

              if (sec.id === 'productsGrid') {
                return (
                  <div key="productsGrid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                      <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                        <div>
                          <img src={product.image} alt={product.name} className="w-full h-64 object-cover" />
                          <div className="p-5">
                            <h3 className="font-bold text-base mt-1">{product.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                          </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center justify-between">
                          <span className="text-xl font-black">{product.price} ₾</span>
                          <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-black text-white flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

      </main>

      {/* ავტორიზაციის / რეგისტრაციის მოდალი */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h3 className="text-2xl font-bold text-center">{authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}</h3>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <input type="text" placeholder="სახელი და გვარი" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              )}
              <input type="email" required placeholder="ელ-ფოსტა" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="password" required placeholder="პაროლი" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-xs font-bold text-indigo-600 mt-2">
              {authMode === 'login' ? 'არ გაქვთ ანგარიში? დარეგისტრირდით' : 'უკვე გაქვთ ანგარიში? შესვლა'}
            </button>
          </div>
        </div>
      )}

      {/* კალათის მოდალი */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">კალათა</h3>
              <button onClick={() => setIsCartOpen(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.price} ₾ x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded"><Minus className="w-3 h-3"/></button>
                    <span className="text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded"><Plus className="w-3 h-3"/></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex gap-2">
                  <input type="text" placeholder="პრომოკოდი" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="flex-1 bg-gray-100 border rounded-xl px-3 py-2 text-xs uppercase font-bold" />
                  <button onClick={applyCoupon} className="bg-gray-200 px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                </div>
                <div className="flex justify-between font-black text-lg">
                  <span>საბოლოო:</span>
                  <span>{grandTotal} ₾</span>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">გაფორმება</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* შეკვეთის გაფორმება */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold">შეკვეთა</h3>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი *" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="text" required placeholder="მისამართი *" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold">დადასტურება ({grandTotal} ₾)</button>
            </form>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h3 className="text-2xl font-bold">შეკვეთა მიღებულია!</h3>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-3 rounded-xl font-bold">დახურვა</button>
          </div>
        </div>
      )}

    </div>
  );
}
