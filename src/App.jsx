import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag, ArrowUp, ArrowDown, EyeOff, Printer, Truck, Percent, Users, Settings
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
    reviews: [{ id: 1, name: "დავითი", rating: 5, text: "საუკეთესო ტელეფონია, ძალიან სწრაფად მომიტანეს!" }]
  },
  { 
    id: 2, 
    sku: "GEO-SNK-99", 
    name: "Nike Air Max Pulse სპორტული ფეხსაცმელი", 
    category: "ტანსაცმელი და ფეხსაცმელი", 
    price: 389, 
    oldPrice: 450,
    costPrice: 250,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80", 
    gallery: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"],
    description: "მაქსიმალური კომფორტი და თანამედროვე დიზაინი.", 
    stock: 3,
    rating: 4.7,
    reviews: []
  }
];

export default function App() {
  const [lang, setLang] = useState("KA");

  // რეალური ანალიტიკა
  const [analytics, setAnalytics] = useState(() => {
    const saved = localStorage.getItem('geostore_real_analytics');
    return saved ? JSON.parse(saved) : { totalVisits: 1, mobileVisits: window.innerWidth < 768 ? 1 : 0, desktopVisits: window.innerWidth >= 768 ? 1 : 0 };
  });

  useEffect(() => {
    if (!sessionStorage.getItem('geostore_counted_visit')) {
      sessionStorage.setItem('geostore_counted_visit', 'true');
      const isMob = window.innerWidth < 768;
      setAnalytics(prev => {
        const updated = {
          ...prev,
          totalVisits: prev.totalVisits + 1,
          mobileVisits: isMob ? prev.mobileVisits + 1 : prev.mobileVisits,
          desktopVisits: !isMob ? prev.desktopVisits + 1 : prev.desktopVisits
        };
        localStorage.setItem('geostore_real_analytics', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // Page Builder სექციები
  const [pageSections, setPageSections] = useState(() => {
    const saved = localStorage.getItem('geostore_page_sections');
    return saved ? JSON.parse(saved) : [
      { id: 'hero', name: "მთავარი ბანერი & Flash Sale", visible: true },
      { id: 'promoSlots', name: "მცირე სარეკლამო ბლოკები", visible: true },
      { id: 'categories', name: "კატეგორიების ფილტრი", visible: true },
      { id: 'productsGrid', name: "პროდუქტების ბადე", visible: true }
    ];
  });

  useEffect(() => { localStorage.setItem('geostore_page_sections', JSON.stringify(pageSections)); }, [pageSections]);

  const toggleSectionVisibility = (id) => setPageSections(pageSections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
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

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('geostore_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [banners, setBanners] = useState(() => {
    const saved = localStorage.getItem('geostore_banners');
    return saved ? JSON.parse(saved) : [{ id: 1, title: "გრანდიოზული ფასდაკლება 2026!", subtitle: "ისარგებლეთ 10%-იანი ფასდაკლებით კოდით: GEO2026", image: "" }];
  });
  const [currentBannerIndex] = useState(0);

  const [promoSlots, setPromoSlots] = useState(() => {
    const saved = localStorage.getItem('geostore_promo_slots');
    return saved ? JSON.parse(saved) : [{ id: 1, title: "სპეციალური შეთავაზება", desc: "ფასდაკლება აქსესუარებზე", image: "", linkText: "შეიძინე ახლავე" }];
  });

  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('geostore_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [policyText, setPolicyText] = useState(() => {
    const saved = localStorage.getItem('geostore_policy_text');
    return saved || "მიწოდება ხორციელდება თბილისში 24 საათში (5₾), ხოლო რეგიონებში 48 საათში (10₾). 100₾-ზე მეტი შეკვეთისას მიწოდება უფასოა.";
  });

  const [promoCodes, setPromoCodes] = useState(() => {
    const saved = localStorage.getItem('geostore_promos');
    return saved ? JSON.parse(saved) : [{ id: 1, code: "GEO2026", discount: 10 }];
  });

  useEffect(() => { localStorage.setItem('geostore_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('geostore_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); }, [usersList]);
  useEffect(() => { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('geostore_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('geostore_banners', JSON.stringify(banners)); }, [banners]);
  useEffect(() => { localStorage.setItem('geostore_promo_slots', JSON.stringify(promoSlots)); }, [promoSlots]);
  useEffect(() => { localStorage.setItem('geostore_chat_messages', JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('geostore_policy_text', policyText); }, [policyText]);
  useEffect(() => { localStorage.setItem('geostore_promos', JSON.stringify(promoCodes)); }, [promoCodes]);

  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop"); 
  
  const [toastMessage, setToastMessage] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [userChatMessage, setUserChatMessage] = useState("");
  const [adminReplyText, setAdminReplyText] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSubTab, setAdminSubTab] = useState("analytics");
  
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", imageFile: null, description: "", stock: "" });
  const [editingProduct, setEditingProduct] = useState(null);
  const [newBanner, setNewBanner] = useState({ title: "", subtitle: "", image: "" });
  const [newSlot, setNewSlot] = useState({ title: "", desc: "", image: "", linkText: "" });
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });

  const [oneClickProduct, setOneClickProduct] = useState(null);
  const [oneClickForm, setOneClickForm] = useState({ name: "", phone: "" });

  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", deliveryZone: "tbilisi", paymentMethod: "courier" });
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return;
    const userData = { id: Date.now(), name: authForm.name || authForm.email.split('@')[0], email: authForm.email, phone: authForm.phone || "+995 500 00 00 00", date: new Date().toISOString().split('T')[0] };
    
    setUsersList(prev => {
      const exists = prev.some(u => u.email === userData.email);
      if (!exists) return [userData, ...prev];
      return prev;
    });

    setCurrentUser(userData);
    setIsAuthOpen(false);
    showToast("ავტორიზაცია წარმატებულია!");
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!userChatMessage.trim()) return;
    const senderName = currentUser ? currentUser.name : "სტუმარი";
    const newMsg = {
      id: Date.now(),
      sender: senderName,
      text: userChatMessage,
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: false
    };
    setChatMessages([...chatMessages, newMsg]);
    setUserChatMessage("");
  };

  const handleAdminReplyMessage = (e) => {
    e.preventDefault();
    if (!adminReplyText.trim()) return;
    const adminMsg = {
      id: Date.now(),
      sender: "GEOSTORE ადმინი",
      text: adminReplyText,
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true
    };
    setChatMessages([...chatMessages, adminMsg]);
    setAdminReplyText("");
    showToast("პასუხი გაიგზავნა!");
  };

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
      showToast("წაიშალა ფავორიტებიდან");
    } else {
      setWishlist([...wishlist, product]);
      showToast("❤️ დაემატა ფავორიტებში!");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
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

    setProducts(prevProducts => prevProducts.map(p => {
      const cartItem = cart.find(ci => ci.id === p.id);
      if (cartItem) return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      return p;
    }));

    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const handleOneClickSubmit = (e) => {
    e.preventDefault();
    if (!oneClickForm.name || !oneClickForm.phone) return;
    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0],
      items: [{ ...oneClickProduct, qty: 1 }],
      total: oneClickProduct.price + 5,
      customer: { name: oneClickForm.name, phone: oneClickForm.phone, address: "1-Click სწრაფი შეკვეთა" },
      status: "ახალი"
    };
    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setOneClickProduct(null);
  };

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.imageFile) {
      alert("შეავსეთ ყველა ველი და ატვირთეთ ფოტო!");
      return;
    }
    const productToAdd = {
      id: Date.now(),
      sku: newProd.sku || `GEO-${Math.floor(Math.random() * 1000)}`,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      costPrice: Number(newProd.costPrice) || Number(newProd.price) * 0.6,
      image: newProd.imageFile,
      gallery: [newProd.imageFile],
      description: newProd.description || "აღწერა არ არის",
      stock: Number(newProd.stock) || 10,
      rating: 5.0,
      reviews: []
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", imageFile: null, description: "", stock: "" });
    showToast("პროდუქტი დაემატა!");
  };

  const exportOrdersToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Customer,Phone,Total,Status\n";
    orders.forEach(o => { csvContent += `${o.id},${o.date},"${o.customer.name}",${o.customer.phone},${o.total},${o.status}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geostore_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalSoldItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold">
          {toastMessage}
        </div>
      )}

      {/* ზედა პანელი */}
      <div className="bg-black text-white text-xs py-2.5 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto w-full">
        <span>✨ {banners[currentBannerIndex]?.subtitle || "უფასო მიწოდება 100₾-ის ზემოთ"}</span>
        <div className="flex gap-4 items-center">
          <button onClick={() => setLang(lang === "KA" ? "EN" : "KA")} className="flex items-center gap-1 font-bold bg-white/20 px-2 py-0.5 rounded">
            <Globe className="w-3 h-3" /> {lang}
          </button>
          <button onClick={() => setActiveTab("policy")} className="hover:underline">პოლიტიკა</button>
        </div>
      </div>

      {/* ჰედერი */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => setActiveTab("shop")} className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-black text-white px-3 py-1 rounded-xl">GEO</span>
            <span>STORE</span>
          </button>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="მოძებნე დასახელებით ან SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-transparent focus:border-black rounded-full pl-10 pr-4 py-2.5 text-sm outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("wishlist")} className="relative p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition">
              <Heart className="w-4 h-4 text-red-500" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

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
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* ფავორიტების გვერდი */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">❤️ ფავორიტი პროდუქტები ({wishlist.length})</h2>
            {wishlist.length === 0 ? <p className="text-gray-400 text-sm py-12 text-center">ფავორიტები ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(product => (
                  <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="relative h-64 bg-gray-100">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => toggleWishlist(product)} className="absolute top-3 left-3 p-2 rounded-full bg-red-500 text-white shadow">
                          <Heart className="w-4 h-4 fill-white" />
                        </button>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-base">{product.name}</h3>
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
            )}
          </div>
        )}

        {/* პოლიტიკა */}
        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">პოლიტიკა და პირობები</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{policyText}</p>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">უკან</button>
          </div>
        )}

        {/* სრული ადმინ პანელი */}
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
                  <h2 className="text-3xl font-black">სრული ადმინ პანელი</h2>
                  <div className="flex gap-2">
                    <button onClick={exportOrdersToCSV} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> CSV ექსპორტი
                    </button>
                    <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                  </div>
                </div>

                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('analytics')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'analytics' ? 'bg-black text-white' : 'bg-gray-100'}`}>📊 ანალიტიკა</button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>📦 შეკვეთები ({orders.length})</button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>🏷️ პროდუქტები ({products.length})</button>
                  <button onClick={() => setAdminSubTab('builder')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'builder' ? 'bg-black text-white' : 'bg-gray-100'}`}>🎨 Page Builder</button>
                  <button onClick={() => setAdminSubTab('banners')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'banners' ? 'bg-black text-white' : 'bg-gray-100'}`}>🖼️ ბანერები</button>
                  <button onClick={() => setAdminSubTab('crm')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'crm' ? 'bg-black text-white' : 'bg-gray-100'}`}>👥 CRM ({usersList.length})</button>
                  <button onClick={() => setAdminSubTab('chat')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'chat' ? 'bg-black text-white' : 'bg-gray-100'}`}>💬 ჩათი ({chatMessages.length})</button>
                  <button onClick={() => setAdminSubTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'settings' ? 'bg-black text-white' : 'bg-gray-100'}`}>⚙️ პოლიტიკა</button>
                </div>

                {/* ანალიტიკა */}
                {adminSubTab === 'analytics' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">საერთო შემოსავალი</span>
                      <div className="text-3xl font-black text-green-600">{totalRevenue} ₾</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">გაყიდული საქონელი</span>
                      <div className="text-3xl font-black text-indigo-600">{totalSoldItems} ცალი</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">რეალური ვიზიტები</span>
                      <div className="text-3xl font-black">{analytics.totalVisits}</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">მობილური vs Desktop</span>
                      <div className="text-sm font-bold mt-2">📱 {analytics.mobileVisits} | 💻 {analytics.desktopVisits}</div>
                    </div>
                  </div>
                )}

                {/* შეკვეთების ცენტრი */}
                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთების სრული სია</h3>
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="border p-4 rounded-2xl bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="font-bold text-sm">შეკვეთა #{o.id} ({o.date})</span>
                            <p className="text-xs text-gray-600">მყიდველი: {o.customer.name} | 📞 {o.customer.phone}</p>
                            <p className="text-xs text-indigo-600 font-bold">{o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black">{o.total} ₾</span>
                            <button onClick={() => setSelectedOrderForInvoice(o)} className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold"><Printer className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* პროდუქტების მართვა */}
                {adminSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ პროდუქტის დამატება (ფოტოს ატვირთვით)</h3>
                      <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <input type="text" placeholder="დასახელება *" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="number" placeholder="ფასი (₾) *" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="number" placeholder="მარაგი" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewProd({...newProd, imageFile: res}))} className="text-xs sm:col-span-2"/>
                        <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm sm:col-span-3">დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">არსებული პროდუქტები & მარაგები</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-10 h-10 object-cover rounded-xl"/>
                              <div>
                                <h4 className="font-bold text-sm">{p.name}</h4>
                                <p className="text-xs text-gray-500">ფასი: {p.price} ₾ | מარაგი: <span className={p.stock < 5 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{p.stock} ცალი</span></p>
                              </div>
                            </div>
                            <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Builder */}
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

                {/* ონლაინ ჩათი ადმინისთვის */}
                {adminSubTab === 'chat' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">💬 ონლაინ ჩათის შეტყობინებები</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {chatMessages.map(m => (
                        <div key={m.id} className={`p-3 rounded-2xl border text-xs ${m.isAdmin ? 'bg-indigo-50 ml-6' : 'bg-gray-50 mr-6'}`}>
                          <p className="font-bold text-gray-500">{m.sender} ({m.time})</p>
                          <p className="text-sm font-medium mt-1">{m.text}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAdminReplyMessage} className="flex gap-2 pt-2 border-t">
                      <input type="text" placeholder="უპასუხეთ კლიენტს..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} className="flex-1 bg-gray-100 border rounded-xl px-4 py-2.5 text-xs outline-none"/>
                      <button type="submit" className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold">გაგზავნა</button>
                    </form>
                  </div>
                )}

                {/* CRM */}
                {adminSubTab === 'crm' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">👥 მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-3">
                      {usersList.map(u => (
                        <div key={u.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm">{u.name}</h4>
                            <p className="text-xs text-gray-500">📧 {u.email} | 📞 {u.phone}</p>
                          </div>
                          <button onClick={() => setUsersList(usersList.filter(user => user.id !== u.id))} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* პოლიტიკის მართვა */}
                {adminSubTab === 'settings' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">⚙️ პოლიტიკის ტექსტი</h3>
                    <textarea value={policyText} onChange={e => setPolicyText(e.target.value)} className="w-full bg-gray-100 border rounded-2xl p-4 text-sm outline-none h-32" />
                    <button onClick={() => showToast("შენახულია!")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">შენახვა</button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* მთავარი მაღაზიის გვერდი */}
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
                      <p className="text-gray-300 text-sm">პრომოკოდი: <span className="bg-white/20 px-2 py-0.5 rounded font-bold">GEO2026</span></p>
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
                      <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between group">
                        <div className="relative h-64 bg-gray-100">
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => toggleWishlist(product)} className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md shadow ${wishlist.some(w => w.id === product.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'}`}>
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-base">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                        </div>
                        <div className="p-5 pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black">{product.price} ₾</span>
                            <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-black text-white flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                            </button>
                          </div>
                          <button onClick={() => setOneClickProduct(product)} className="w-full bg-indigo-50 text-indigo-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> 1-Click სწრაფი ყიდვა
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

      {/* ონლაინ ჩათის ღილაკი და ფანჯარა */}
      <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-6 right-6 z-50 bg-black text-white p-4 rounded-full shadow-2xl flex items-center gap-2 hover:bg-zinc-800 transition">
        <MessageCircle className="w-5 h-5" />
        <span className="text-xs font-bold hidden sm:inline">ონლაინ ჩათი</span>
      </button>

      {isChatOpen && (
        <div className="fixed bottom-20 right-6 z-50 bg-white w-80 sm:w-96 rounded-3xl shadow-2xl border overflow-hidden flex flex-col h-96">
          <div className="bg-black text-white p-4 flex justify-between items-center">
            <span className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4"/> GEOSTORE მხარდაჭერა</span>
            <button onClick={() => setIsChatOpen(false)}>✕</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
            {chatMessages.length === 0 && <p className="text-xs text-gray-400 text-center py-6">მოგვწერეთ ნებისმიერი კითხვა!</p>}
            {chatMessages.map(m => (
              <div key={m.id} className={`max-w-[85%] p-3 rounded-2xl text-xs ${m.isAdmin ? 'bg-indigo-600 text-white ml-auto' : 'bg-white border text-gray-800'}`}>
                <p className="font-bold mb-1 opacity-80">{m.sender}</p>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChatMessage} className="p-3 border-t bg-white flex gap-2">
            <input type="text" placeholder="მოგვწერეთ..." value={userChatMessage} onChange={e => setUserChatMessage(e.target.value)} className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-xs outline-none"/>
            <button type="submit" className="bg-black text-white p-2 rounded-xl"><Send className="w-4 h-4"/></button>
          </form>
        </div>
      )}

      {/* 1-Click სწრაფი ყიდვა */}
      {oneClickProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setOneClickProduct(null)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h3 className="text-xl font-bold">⚡ სწრაფი შეკვეთა</h3>
            <p className="text-xs text-gray-500">{oneClickProduct.name} — {oneClickProduct.price} ₾</p>
            <form onSubmit={handleOneClickSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი *" value={oneClickForm.name} onChange={e => setOneClickForm({...oneClickForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={oneClickForm.phone} onChange={e => setOneClickForm({...oneClickForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3 rounded-2xl font-bold text-sm">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* ინვოისის ამობეჭდვა */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg">📄 ინვოისი #{selectedOrderForInvoice.id}</h3>
              <button onClick={() => setSelectedOrderForInvoice(null)}>✕</button>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <p><b>თარიღი:</b> {selectedOrderForInvoice.date}</p>
              <p><b>მყიდველი:</b> {selectedOrderForInvoice.customer.name} ({selectedOrderForInvoice.customer.phone})</p>
              <div className="border-t pt-2 space-y-1">
                {selectedOrderForInvoice.items.map((i, idx) => <p key={idx}>• {i.name} (x{i.qty}) - {i.price * i.qty} ₾</p>)}
              </div>
              <p className="font-black text-sm pt-2 border-t">სულ: {selectedOrderForInvoice.total} ₾</p>
            </div>
            <button onClick={() => window.print()} className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/> ინვოისის ბეჭდვა
            </button>
          </div>
        </div>
      )}

      {/* კალათის მოდალი */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">კალათა ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
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

      {/* წარმატების შეტყობინება */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h3 className="text-2xl font-bold">შეკვეთა მიღებულია!</h3>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-3 rounded-xl font-bold">დახურვა</button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t mt-12 py-8 text-xs text-gray-500 text-center">
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>

    </div>
  );
}
