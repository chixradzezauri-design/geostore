import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag, ArrowUp, ArrowDown, EyeOff
} from 'lucide-react';

const CATEGORIES_KA = ["ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი", "სხვა პროდუქტები"];
const CATEGORIES_EN = ["All", "Electronics", "Clothing & Shoes", "Home Items", "Beauty & Care", "Accessories", "Sports", "Other Products"];

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
    gallery: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80"
    ],
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი. ოფიციალური გარანტია 1 წელი.", 
    stock: 12,
    rating: 4.9,
    reviews: [
      { id: 1, name: "დავითი", rating: 5, text: "საუკეთესო ტელეფონია, ძალიან სწრაფად მომიტანეს!" }
    ]
  }
];

export default function App() {
  const [lang, setLang] = useState("KA");

  // ვიზუალური Page Builder-ის სექციების მართვა (რომელი სექცია ჩანს და რა რიგზეა)
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

  const [banners, setBanners] = useState(() => {
    const saved = localStorage.getItem('geostore_banners');
    return saved ? JSON.parse(saved) : [{ id: 1, title: "გრანდიოზული ფასდაკლება 2026!", subtitle: "ისარგებლეთ 10%-იანი ფასდაკლებით კოდით: GEO2026", image: "" }];
  });
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

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

  const [promoCodes, setPromoCodes] = useState([{ id: 1, code: "GEO2026", discount: 10 }]);
  const [newPromoCode, setNewPromoCode] = useState({ code: "", discount: "" });

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [onlyInStock, setOnlyInStock] = useState(false);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [activeTab, setActiveTab] = useState("shop"); 
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [oneClickProduct, setOneClickProduct] = useState(null);
  const [oneClickForm, setOneClickForm] = useState({ name: "", phone: "" });

  const [toastMessage, setToastMessage] = useState("");
  const [desktopPopupAlert, setDesktopPopupAlert] = useState(null);

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
  const [adminSubTab, setAdminSubTab] = useState("builder"); // სტანდარტულად იხსნება დიზაინის რედაქტორი
  
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", imageFile: null, description: "", stock: "" });
  const [newBanner, setNewBanner] = useState({ title: "", subtitle: "", image: "" });
  const [newSlot, setNewSlot] = useState({ title: "", desc: "", image: "", linkText: "" });

  const [orderForm, setOrderForm] = useState({ 
    name: "", 
    phone: "", 
    city: "თბილისი", 
    address: "", 
    deliveryZone: "tbilisi", 
    paymentMethod: "courier", 
    courierName: "მიუნიჭებელია"
  });

  const [orderSuccess, setOrderSuccess] = useState(null);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, text: "" });

  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { localStorage.setItem('geostore_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('geostore_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); }, [usersList]);
  useEffect(() => { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('geostore_chat_messages', JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('geostore_policy_text', policyText); }, [policyText]);
  useEffect(() => { localStorage.setItem('geostore_banners', JSON.stringify(banners)); }, [banners]);
  useEffect(() => { localStorage.setItem('geostore_promo_slots', JSON.stringify(promoSlots)); }, [promoSlots]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (authMode === 'register' && !authForm.name)) {
      alert("გთხოვთ შეავსოთ ყველა ველი!");
      return;
    }
    const userData = {
      id: Date.now(),
      name: authMode === 'register' ? authForm.name : authForm.email.split('@')[0],
      phone: authForm.phone || "+995 500 00 00 00",
      email: authForm.email,
      date: new Date().toISOString().split('T')[0]
    };
    
    setUsersList(prev => {
      const exists = prev.some(u => u.email === userData.email);
      if (!exists) {
        const updated = [userData, ...prev];
        localStorage.setItem('geostore_users_list', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    setCurrentUser(userData);
    setIsAuthOpen(false);
    setAuthForm({ name: "", phone: "", email: "", password: "" });
    showToast("ავტორიზაცია და რეგისტრაცია წარმატებულია!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("shop");
  };

  const deleteUserAccount = (userId) => {
    if (confirm("ნამდვილად გსურთ ამ მომხმარებლის ანგარიშის გაუქმება?")) {
      const updated = usersList.filter(u => u.id !== userId);
      setUsersList(updated);
      localStorage.setItem('geostore_users_list', JSON.stringify(updated));
      alert("მომხმარებლის ანგარიში გაუქმებულია!");
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!userChatMessage.trim()) return;

    const senderName = currentUser ? currentUser.name : (orderForm.name || "სტუმარი");
    const senderPhone = currentUser ? currentUser.phone : (orderForm.phone || "არ არის მითითებული");

    const newMsg = {
      id: Date.now(),
      sender: senderName,
      phone: senderPhone,
      text: userChatMessage,
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: false
    };

    setChatMessages(prev => [...prev, newMsg]);
    setUserChatMessage("");
  };

  const handleAdminReplyMessage = (e) => {
    e.preventDefault();
    if (!adminReplyText.trim()) return;

    const adminMsg = {
      id: Date.now(),
      sender: "GEOSTORE ადმინი",
      phone: "მხარდაჭერა",
      text: adminReplyText,
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true
    };

    setChatMessages(prev => [...prev, adminMsg]);
    setAdminReplyText("");
    showToast("პასუხი გაიგზავნა!");
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = onlyInStock ? p.stock > 0 : true;
    const matchesMinPrice = minPrice !== "" ? p.price >= Number(minPrice) : true;
    const matchesMaxPrice = maxPrice !== "" ? p.price <= Number(maxPrice) : true;

    return matchesCat && matchesSearch && matchesStock && matchesMinPrice && matchesMaxPrice;
  }).sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
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

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
      showToast("წაიშალა ფავორიტებიდან");
    } else {
      setWishlist([...wishlist, product]);
      showToast("❤️ დაემატა ფავორიტებში!");
    }
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
      showToast(`🎉 კუპონი გააქტიურდა! (-${found.discount}%)`);
    } else {
      alert("არასწორი ან ვადაგასული კუპონი!");
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = (subTotal * discountPercent) / 100;
  const deliveryFee = orderForm.deliveryZone === "tbilisi" ? 5 : 10;
  const grandTotal = subTotal - discountAmount + (cart.length > 0 ? deliveryFee : 0);

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      alert("გთხოვთ შეავსოთ სავალდებულო ველები!");
      return;
    }

    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total: grandTotal,
      customer: { ...orderForm },
      userEmail: currentUser ? currentUser.email : "guest",
      status: "ახალი",
      courierName: "მიუნიჭებელია"
    };

    setProducts(prevProducts => prevProducts.map(p => {
      const cartItem = cart.find(ci => ci.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      }
      return p;
    }));

    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const handleOneClickSubmit = (e) => {
    e.preventDefault();
    if (!oneClickForm.name || !oneClickForm.phone) {
      alert("შეიყვანეთ სახელი და ნომერი!");
      return;
    }
    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0],
      items: [{ ...oneClickProduct, qty: 1 }],
      total: oneClickProduct.price + 5,
      customer: { name: oneClickForm.name, phone: oneClickForm.phone, city: "თბილისი", address: "სწრაფი შეკვეთა", deliveryZone: "tbilisi", paymentMethod: "courier" },
      userEmail: currentUser ? currentUser.email : "guest",
      status: "ახალი",
      courierName: "მიუნიჭებელია"
    };
    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setOneClickProduct(null);
    setOneClickForm({ name: "", phone: "" });
  };

  const exportOrdersToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Customer,Phone,Total,Status\n";
    orders.forEach(o => {
      csvContent += `${o.id},${o.date},"${o.customer.name}",${o.customer.phone},${o.total},${o.status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geostore_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === "1234") {
      setIsAdminLoggedIn(true);
      setAdminError("");
    } else {
      setAdminError("არასწორი პინ-კოდი! (1234)");
    }
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
    alert("პროდუქტი დაემატა!");
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

      {/* ბანერის სლაიდერი */}
      <div className="bg-black text-white text-xs py-2.5 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto w-full">
        <span>✨ {banners[currentBannerIndex]?.subtitle || "უფასო მიწოდება 100₾-ის ზემოთ"}</span>
        <div className="flex gap-4 items-center">
          <button onClick={() => setLang(lang === "KA" ? "EN" : "KA")} className="flex items-center gap-1 font-bold bg-white/20 px-2 py-0.5 rounded">
            <Globe className="w-3 h-3" /> {lang}
          </button>
          <button onClick={() => setActiveTab("policy")} className="hover:underline">{lang === "KA" ? "პოლიტიკა" : "Policy"}</button>
          <button onClick={() => setActiveTab("contact")} className="hover:underline">{lang === "KA" ? "კონტაქტი" : "Contact"}</button>
        </div>
      </div>

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
              placeholder={lang === "KA" ? "მოძებნე დასახელებით ან SKU..." : "Search by name or SKU..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-transparent focus:border-black rounded-full pl-10 pr-4 py-2.5 text-sm outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <button onClick={() => setActiveTab("profile")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{currentUser.name}</span>
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200">
                <User className="w-4 h-4" />
                <span>{lang === "KA" ? "შესვლა" : "Login"}</span>
              </button>
            )}

            <button onClick={() => setActiveTab("admin")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === "KA" ? "ადმინ პანელი" : "Admin"}</span>
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative bg-black text-white px-4 py-2.5 rounded-full flex items-center gap-2 hover:bg-zinc-800 text-sm font-medium transition">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === "KA" ? "კალათა" : "Cart"}</span>
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

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">გამარჯობა, {currentUser.name}!</h2>
                <p className="text-xs text-gray-500 mt-1">📧 {currentUser.email} | 📞 {currentUser.phone}</p>
              </div>
              <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <LogOut className="w-4 h-4" /> გამოსვლა
              </button>
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-black">წესები და პოლიტიკა</h2>
            <div className="p-4 bg-gray-50 rounded-2xl border text-sm text-gray-700 leading-relaxed">{policyText}</div>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">უკან</button>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl p-8 border max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">კონტაქტი</h2>
            <p className="text-sm">📞 +995 32 2 00 00 00</p>
            <p className="text-sm">📧 info@geostore.ge</p>
          </div>
        )}

        {/* ადმინ პანელი Page Builder-ით */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">ადმინისტრაციის შესვლა</h2>
                  <p className="text-gray-500 text-sm mt-1">პინ-კოდი: 1234</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="პინ-კოდი (1234)" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} className="w-full bg-gray-100 border rounded-xl px-4 py-3 text-center text-lg outline-none" />
                  {adminError && <p className="text-red-500 text-xs text-center font-medium">{adminError}</p>}
                  <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-3xl font-black">ადმინ პანელი & Page Builder</h2>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                </div>

                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('builder')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${adminSubTab === 'builder' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    <Layout className="w-3.5 h-3.5"/> ვიზუალური რედაქტორი (Page Builder)
                  </button>
                  <button onClick={() => setAdminSubTab('analytics')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'analytics' ? 'bg-black text-white' : 'bg-gray-100'}`}>ანალიტიკა</button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>შეკვეთები</button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>პროდუქტები</button>
                </div>

                {/* Page Builder-ის ვიზუალური სამუშაო სივრცე */}
                {adminSubTab === 'builder' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-6">
                    <div>
                      <h3 className="text-xl font-black">🎨 ვიზუალური საიტის რედაქტორი (Page Builder)</h3>
                      <p className="text-xs text-gray-500 mt-1">მართეთ მთავარი გვერდის სექციების ხილვადობა და თანმიმდევრობა კოდის შეცვლის გარეშე.</p>
                    </div>

                    <div className="space-y-3">
                      {pageSections.map((sec, idx) => (
                        <div key={sec.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            <div>
                              <h4 className="font-bold text-sm">{sec.name}</h4>
                              <p className="text-[11px] text-gray-400">სტატუსი: {sec.visible ? '🟢 გამოქვეყნებულია საიტზე' : '🔴 დამალულია'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleSectionVisibility(sec.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${sec.visible ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {sec.visible ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                              {sec.visible ? 'დამალვა' : 'გამოჩენა'}
                            </button>
                            <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                            <button onClick={() => moveSection(idx, 'down')} disabled={idx === pageSections.length - 1} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminSubTab === 'analytics' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">საერთო შემოსავალი</span>
                      <div className="text-3xl font-black text-green-600">{totalRevenue} ₾</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">რეალური ვიზიტები</span>
                      <div className="text-3xl font-black text-indigo-600">{analytics.totalVisits}</div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთები ({orders.length})</h3>
                    {orders.length === 0 ? <p className="text-xs text-gray-400">შეკვეთები არ არის</p> : orders.map(o => (
                      <div key={o.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between">
                        <span>შეკვეთა #{o.id}</span>
                        <span className="font-bold">{o.total} ₾</span>
                      </div>
                    ))}
                  </div>
                )}

                {adminSubTab === 'products' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">პროდუქტების მართვა</h3>
                    <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" placeholder="სახელი" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 p-3 rounded-xl text-sm outline-none" />
                      <input type="number" placeholder="ფასი" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 p-3 rounded-xl text-sm outline-none" />
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewProd({...newProd, imageFile: res}))} className="text-xs sm:col-span-2"/>
                      <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm sm:col-span-2">დამატება</button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* მთავარი მაღაზიის გვერდი (Page Builder სექციების დინამიკური რენდერით) */}
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
                      <p className="text-gray-300 text-sm">{banners[currentBannerIndex]?.subtitle}</p>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'promoSlots') {
                return promoSlots.length > 0 ? (
                  <div key="promoSlots" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {promoSlots.map(slot => (
                      <div key={slot.id} className="relative rounded-3xl overflow-hidden shadow-md bg-white border flex items-center p-6 gap-4">
                        {slot.image && <img src={slot.image} alt="" className="w-28 h-28 object-cover rounded-2xl shrink-0"/>}
                        <div className="space-y-2">
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full">რეკლამა</span>
                          <h3 className="font-bold text-base">{slot.title}</h3>
                          <p className="text-xs text-gray-500">{slot.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              }

              if (sec.id === 'categories') {
                return (
                  <div key="categories" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border hover:bg-gray-100'}`}>
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
                      <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between group">
                        <div>
                          <div className="relative overflow-hidden h-64 bg-gray-100">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          </div>
                          <div className="p-5">
                            <h3 className="font-bold text-base mt-1 text-gray-900">{product.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                          </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center justify-between">
                          <span className="text-xl font-black text-gray-900">{product.price} ₾</span>
                          <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-black text-white hover:bg-zinc-800 flex items-center gap-1.5">
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

      <footer className="bg-white border-t mt-12 py-8 text-xs text-gray-500 text-center">
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>

    </div>
  );
}
