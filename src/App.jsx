import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag
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

const INITIAL_BANNERS = [
  { id: 1, title: "გრანდიოზული ფასდაკლება 2026!", subtitle: "ისარგებლეთ 10%-იანი ფასდაკლებით კოდით: GEO2026", bg: "bg-black text-white" }
];

export default function App() {
  const [lang, setLang] = useState("KA");

  const [analytics, setAnalytics] = useState(() => {
    const saved = localStorage.getItem('geostore_analytics');
    return saved ? JSON.parse(saved) : {
      todayVisits: 310,
      totalTimeSpentSeconds: 64000,
      mobileVisits: 210,
      desktopVisits: 100,
      countries: { "საქართველო (თბილისი)": 260, "გერმანია (ბერლინი)": 30, "აშშ (ნიუ-იორკი)": 20 }
    };
  });

  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
      setAnalytics(prev => ({
        ...prev,
        totalTimeSpentSeconds: prev.totalTimeSpentSeconds + 1
      }));
    }, 1000);

    if (!sessionStorage.getItem('geostore_visited_today')) {
      sessionStorage.setItem('geostore_visited_today', 'true');
      const isMobile = window.innerWidth < 768;
      setAnalytics(prev => ({
        ...prev,
        todayVisits: prev.todayVisits + 1,
        mobileVisits: isMobile ? prev.mobileVisits + 1 : prev.mobileVisits,
        desktopVisits: !isMobile ? prev.desktopVisits + 1 : prev.desktopVisits
      }));
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('geostore_analytics', JSON.stringify(analytics));
  }, [analytics]);

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
    return saved ? JSON.parse(saved) : INITIAL_BANNERS;
  });
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('geostore_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [policyText, setPolicyText] = useState(() => {
    const saved = localStorage.getItem('geostore_policy_text');
    return saved || "მიწოდება ხორციელდება თბილისში 24 საათში (5₾), ხოლო რეგიონებში 48 საათში (10₾). 100₾-ზე მეტი შეკვეთისას მიწოდება უფასოა.";
  });

  const [promoCodes, setPromoCodes] = useState([
    { id: 1, code: "GEO2026", discount: 10 }
  ]);
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
  const [adminSubTab, setAdminSubTab] = useState("analytics");
  
  // ფაილების ატვირთვისთვის მდგომარეობები
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", imageFile: null, description: "", stock: "" });
  const [newBanner, setNewBanner] = useState({ title: "", subtitle: "", bg: "bg-black text-white" });

  const [orderForm, setOrderForm] = useState({ 
    name: "", 
    phone: "", 
    city: "თბილისი", 
    address: "", 
    deliveryZone: "tbilisi", 
    paymentMethod: "courier", 
    courierName: "მიუნიჭებელია",
    cardNumber: "",
    cardExp: "",
    cardCvc: ""
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
    
    const exists = usersList.some(u => u.email === userData.email);
    if (!exists) {
      setUsersList(prev => [userData, ...prev]);
    }

    setCurrentUser(userData);
    setIsAuthOpen(false);
    setAuthForm({ name: "", phone: "", email: "", password: "" });
    showToast(lang === "KA" ? "ავტორიზაცია წარმატებულია!" : "Logged in successfully!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("shop");
  };

  const deleteUserAccount = (userId) => {
    if (confirm("ნამდვილად გსურთ ამ მომხმარებლის ანგარიშის გაუქმება?")) {
      setUsersList(usersList.filter(u => u.id !== userId));
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

    setDesktopPopupAlert({
      title: "💬 ახალი შეტყობინება ჩათში!",
      msg: `${senderName}: ${userChatMessage}`
    });
    setTimeout(() => setDesktopPopupAlert(null), 5000);
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
    showToast("პასუხი წარმატებით გაიგზავნა!");
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
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
    showToast(lang === "KA" ? "🛒 დაემატა კალათაში!" : "🛒 Added to cart!");
  };

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
      showToast(lang === "KA" ? "წაიშალა ფავორიტებიდან" : "Removed from wishlist");
    } else {
      setWishlist([...wishlist, product]);
      showToast(lang === "KA" ? "❤️ დაემატა ფავორიტებში!" : "❤️ Added to wishlist!");
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

    setDesktopPopupAlert({
      title: "📦 ახალი შეკვეთა მიღებულია!",
      msg: `მყიდველი: ${newOrder.customer.name} - ${newOrder.total}₾`
    });
    setTimeout(() => setDesktopPopupAlert(null), 5000);

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

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.name || !newReview.text) return;
    const updatedRev = [...(quickViewProduct.reviews || []), { id: Date.now(), name: newReview.name, rating: Number(newReview.rating), text: newReview.text }];
    const updatedProd = { ...quickViewProduct, reviews: updatedRev };
    setProducts(products.map(p => p.id === quickViewProduct.id ? updatedProd : p));
    setQuickViewProduct(updatedProd);
    setNewReview({ name: "", rating: 5, text: "" });
    showToast("⭐️ შეფასება დაემატა!");
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

  // ფოტოს ფაილად ატვირთვის ფუნქცია (Base64 კონვერტაცია)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProd({ ...newProd, imageFile: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.imageFile) {
      alert("გთხოვთ შეავსოთ ყველა ველი და ატვირთოთ ფოტო კომპიუტერიდან!");
      return;
    }
    const productToAdd = {
      id: Date.now(),
      sku: newProd.sku || `GEO-${Math.floor(Math.random() * 1000)}`,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      costPrice: Number(newProd.costPrice) || Number(newProd.price) * 0.6,
      image: newProd.imageFile, // ატვირთული სურათი
      gallery: [newProd.imageFile],
      description: newProd.description || "აღწერა არ არის",
      stock: Number(newProd.stock) || 10,
      rating: 5.0,
      reviews: []
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", imageFile: null, description: "", stock: "" });
    alert("პროდუქტი წარმატებით დაემატა ატვირთული ფოტოთი!");
  };

  const handleSaveEditedProduct = (e) => {
    e.preventDefault();
    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
    setEditingProduct(null);
    alert("პროდუქტის მონაცემები განახლდა!");
  };

  const deleteProduct = (id) => {
    if (confirm("ნამდვილად გსურთ წაშლა?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleAddBanner = (e) => {
    e.preventDefault();
    if (!newBanner.title) return;
    setBanners([...banners, { id: Date.now(), ...newBanner }]);
    setNewBanner({ title: "", subtitle: "", bg: "bg-black text-white" });
    alert("ბანერი დაემატა!");
  };

  const deleteBanner = (id) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const handleAddPromo = (e) => {
    e.preventDefault();
    if (!newPromoCode.code || !newPromoCode.discount) return;
    setPromoCodes([...promoCodes, { id: Date.now(), code: newPromoCode.code.toUpperCase(), discount: Number(newPromoCode.discount) }]);
    setNewPromoCode({ code: "", discount: "" });
    alert("პრომოკოდი შეიქმნა!");
  };

  const deletePromo = (id) => {
    setPromoCodes(promoCodes.filter(p => p.id !== id));
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const updateOrderCourier = (orderId, courier) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, courierName: courier } : o));
  };

  const myOrders = currentUser ? orders.filter(o => o.userEmail === currentUser.email || o.customer.phone === currentUser.phone) : [];
  const categories = lang === "KA" ? CATEGORIES_KA : CATEGORIES_EN;

  const relatedProducts = quickViewProduct 
    ? products.filter(p => p.category === quickViewProduct.category && p.id !== quickViewProduct.id)
    : [];

  const avgTimeMinutes = (analytics.totalTimeSpentSeconds / analytics.todayVisits / 60).toFixed(1);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {desktopPopupAlert && (
        <div className="fixed top-24 right-6 z-50 bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl border border-indigo-400 max-w-sm animate-bounce flex items-center gap-3">
          <Bell className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">{desktopPopupAlert.title}</h4>
            <p className="text-[11px] opacity-90 mt-0.5">{desktopPopupAlert.msg}</p>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold">
          {toastMessage}
        </div>
      )}

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

            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" /> ჩემი შეკვეთები ({myOrders.length})
              </h3>
              {myOrders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">შეკვეთები ჯერ არ გაქვთ.</p>
              ) : (
                <div className="space-y-4">
                  {myOrders.map(o => (
                    <div key={o.id} className="border rounded-2xl p-5 bg-gray-50 space-y-3">
                      <div className="flex justify-between items-center border-b pb-3">
                        <span className="font-black text-base">შეკვეთა #{o.id} ({o.date})</span>
                        <span className="text-xs px-3 py-1 rounded-full font-bold bg-indigo-100 text-indigo-700">{o.status}</span>
                      </div>
                      <p className="text-xs text-gray-600">პროდუქტები: {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                      <div className="flex justify-between items-center pt-2 border-t font-black">
                        <span>სულ:</span>
                        <span>{o.total} ₾</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-black">წესები, პირობები და დაბრუნების პოლიტიკა</h2>
            <div className="p-4 bg-gray-50 rounded-2xl border text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {policyText}
            </div>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">მაღაზიაში დაბრუნება</button>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl p-8 border max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">საკონტაქტო ინფორმაცია</h2>
            <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500"/> +995 32 2 00 00 00</p>
            <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500"/> info@geostore.ge</p>
            <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/> თბილისი, რუსთაველის გამზირი #1</p>
          </div>
        )}

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
                  <h2 className="text-3xl font-black">პროფესიონალური ადმინ პანელი</h2>
                  <div className="flex gap-2">
                    <button onClick={exportOrdersToCSV} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> CSV ექსპორტი
                    </button>
                    <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                  </div>
                </div>

                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('analytics')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ${adminSubTab === 'analytics' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    <BarChart2 className="w-3.5 h-3.5"/> ფინანსები & ანალიტიკა
                  </button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    შეკვეთები ({orders.length})
                  </button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    პროდუქტები ({products.length})
                  </button>
                  <button onClick={() => setAdminSubTab('banners')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'banners' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    ბანერები ({banners.length})
                  </button>
                  <button onClick={() => setAdminSubTab('promos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'promos' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    პრომოკოდები ({promoCodes.length})
                  </button>
                  <button onClick={() => setAdminSubTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'users' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    მომხმარებლები ({usersList.length})
                  </button>
                  <button onClick={() => setAdminSubTab('chat')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'chat' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    ონლაინ ჩათი ({chatMessages.length})
                  </button>
                </div>

                {adminSubTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">საერთო შემოსავალი</span>
                        <div className="flex justify-between items-center">
                          <span className="text-3xl font-black text-green-600">{totalRevenue} ₾</span>
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">დღიური ვიზიტები</span>
                        <div className="flex justify-between items-center">
                          <span className="text-3xl font-black">{analytics.todayVisits}</span>
                          <User className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">საშუალო დრო საიტზე</span>
                        <div className="flex justify-between items-center">
                          <span className="text-3xl font-black">{avgTimeMinutes} წთ</span>
                          <Clock className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">მობილური vs Desktop</span>
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="flex items-center gap-1"><Smartphone className="w-4 h-4"/> {analytics.mobileVisits}</span>
                          <span className="flex items-center gap-1"><Laptop className="w-4 h-4"/> {analytics.desktopVisits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                      <h3 className="font-bold text-lg">🌍 ვიზიტორები ქვეყნების მიხედვით</h3>
                      <div className="space-y-3 text-xs font-bold">
                        {Object.entries(analytics.countries).map(([country, count]) => (
                          <div key={country} className="flex justify-between items-center border-b pb-2">
                            <span>{country}</span>
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-indigo-600">{count} ვიზიტორი</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთებისა და კურიერების მართვა</h3>
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="border rounded-2xl p-4 bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-1 text-sm">
                            <span className="font-bold">შეკვეთა #{o.id} ({o.date})</span>
                            <p className="text-xs text-gray-600">მყიდველი: {o.customer.name} | 📞 {o.customer.phone}</p>
                            <p className="text-xs text-gray-600">მისამართი: {o.customer.city}, {o.customer.address}</p>
                            <p className="text-xs text-gray-600">გადახდა: <strong>{o.customer.paymentMethod === 'card' ? '💳 ბარათით' : o.customer.paymentMethod === 'bank' ? '🏛️ საბანკო გადარიცხვა' : '💵 კურიერთან'}</strong></p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                            <div className="space-y-1 text-right">
                              <span className="text-lg font-black block">{o.total} ₾</span>
                              <div className="flex gap-2">
                                <select value={o.courierName || "მიუნიჭებელია"} onChange={(e) => updateOrderCourier(o.id, e.target.value)} className="bg-white border rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700">
                                  <option value="მიუნიჭებელია">კურიერი: არ არის</option>
                                  <option value="ლევანი (თბილისი)">ლევანი</option>
                                  <option value="გიორგი (რეგიონები)">გიორგი</option>
                                </select>
                                <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="bg-white border rounded-xl px-3 py-1 text-xs font-bold text-indigo-600">
                                  <option value="ახალი">ახალი</option>
                                  <option value="დამუშავებაშია">დამუშავებაშია</option>
                                  <option value="გზაშია">გზაშია</option>
                                  <option value="ჩაბარებული">ჩაბარებული</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* პროდუქტების დამატება ფოტოს პირდაპირი ატვირთვით */}
                {adminSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ პროდუქტის დამატება (ფოტოს კომპიუტერიდან ატვირთვით)</h3>
                      <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <input type="text" placeholder="SKU კოდი" value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="text" placeholder="დასახელება *" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                          {CATEGORIES_KA.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="ფასი (₾) *" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="number" placeholder="მარაგი" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        
                        {/* ფაილის ასატვირთი ინპუტი */}
                        <div className="sm:col-span-2 bg-gray-100 border rounded-xl p-3 flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <ImageIcon className="w-4 h-4"/> აირჩიეთ ფოტო კომპიუტერიდან *
                          </label>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-zinc-800 cursor-pointer"/>
                        </div>

                        <textarea placeholder="პროდუქტის აღწერა..." value={newProd.description} onChange={e => setNewProd({...newProd, description: e.target.value})} className="sm:col-span-3 bg-gray-100 border rounded-xl p-3 text-sm outline-none h-20"/>
                        <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm sm:col-span-3">პროდუქტის დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">არსებული პროდუქტები</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-xl" />
                              <div>
                                <h4 className="font-bold text-sm">{p.name}</h4>
                                <p className="text-xs text-indigo-600 font-bold">{p.price} ₾ (მარაგი: {p.stock})</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingProduct(p)} className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={() => deleteProduct(p.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ბანერების მართვა */}
                {adminSubTab === 'banners' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ ბანერის დამატება</h3>
                      <form onSubmit={handleAddBanner} className="space-y-3">
                        <input type="text" placeholder="სათაური *" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="text" placeholder="ქვეტექსტი / აღწერა" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm">დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">აქტიური ბანერები</h3>
                      <div className="space-y-3">
                        {banners.map(b => (
                          <div key={b.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-sm">{b.title}</h4>
                              <p className="text-xs text-gray-500">{b.subtitle}</p>
                            </div>
                            <button onClick={() => deleteBanner(b.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* პრომოკოდების მართვა */}
                {adminSubTab === 'promos' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ ახალი პრომოკოდის შექმნა</h3>
                      <form onSubmit={handleAddPromo} className="flex gap-2">
                        <input type="text" placeholder="კოდი (მაგ: SALE50)" value={newPromoCode.code} onChange={e => setNewPromoCode({...newPromoCode, code: e.target.value})} className="flex-1 bg-gray-100 border rounded-xl p-3 text-sm outline-none uppercase font-bold" />
                        <input type="number" placeholder="ფასდაკლება %" value={newPromoCode.discount} onChange={e => setNewPromoCode({...newPromoCode, discount: e.target.value})} className="w-32 bg-gray-100 border rounded-xl p-3 text-sm outline-none font-bold" />
                        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm">შექმნა</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">აქტიური პრომოკოდები</h3>
                      <div className="space-y-3">
                        {promoCodes.map(pr => (
                          <div key={pr.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-sm flex items-center gap-1"><Tag className="w-4 h-4 text-indigo-600"/> {pr.code}</h4>
                              <p className="text-xs text-indigo-600 font-bold">{pr.discount}% ფასდაკლება</p>
                            </div>
                            <button onClick={() => deletePromo(pr.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'users' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">რეგისტრირებული მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-3">
                      {usersList.map(u => (
                        <div key={u.id} className="border rounded-2xl p-4 bg-gray-50 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm">{u.name}</h4>
                            <p className="text-xs text-gray-500">📧 {u.email} | 📞 {u.phone} | რეგისტრაცია: {u.date}</p>
                          </div>
                          <button onClick={() => deleteUserAccount(u.id)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">გაუქმება</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminSubTab === 'chat' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">ონლაინ ჩათი (რეალურ დროში)</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {chatMessages.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">შეტყობინებები ჯერ არ არის</p>
                      ) : (
                        chatMessages.map(m => (
                          <div key={m.id} className={`p-4 rounded-2xl border ${m.isAdmin ? 'bg-indigo-50 border-indigo-100 ml-6' : 'bg-gray-50 mr-6'}`}>
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                              <span>{m.sender} ({m.phone})</span>
                              <span>{m.time}</span>
                            </div>
                            <p className="text-sm font-medium mt-1">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <form onSubmit={handleAdminReplyMessage} className="pt-3 border-t flex gap-2">
                      <input 
                        type="text" 
                        placeholder="უპასუხეთ კლიენტს (გამოჩნდება მის ჩათში მყისიერად)..." 
                        value={adminReplyText} 
                        onChange={e => setAdminReplyText(e.target.value)} 
                        className="flex-1 bg-gray-100 border rounded-xl px-4 py-3 text-xs outline-none"
                      />
                      <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5"/> გაგზავნა
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-8">
            
            <div className="bg-black text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="relative z-10 max-w-xl space-y-3">
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 w-fit">
                  <Zap className="w-3.5 h-3.5 fill-white" /> FLASH SALE 2026
                </span>
                <h1 className="text-3xl md:text-5xl font-black leading-tight">
                  {banners[currentBannerIndex]?.title || "გრანდიოზული ფასდაკლება!"}
                </h1>
                <p className="text-gray-300 text-sm">{banners[currentBannerIndex]?.subtitle}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center flex gap-4">
                <div>
                  <div className="text-3xl font-black">{timeLeft.hours}</div>
                  <div className="text-[10px] uppercase text-gray-400">საათი</div>
                </div>
                <div className="text-3xl font-black">:</div>
                <div>
                  <div className="text-3xl font-black">{timeLeft.minutes}</div>
                  <div className="text-[10px] uppercase text-gray-400">წუთი</div>
                </div>
                <div className="text-3xl font-black">:</div>
                <div>
                  <div className="text-3xl font-black">{timeLeft.seconds}</div>
                  <div className="text-[10px] uppercase text-gray-400">წამი</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border hover:bg-gray-100'}`}>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span>ფასი (₾):</span>
                  <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-16 bg-gray-100 border rounded-lg px-2 py-1 outline-none"/>
                  <span>-</span>
                  <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-16 bg-gray-100 border rounded-lg px-2 py-1 outline-none"/>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} className="rounded" />
                    <span>მარაგშია</span>
                  </label>
                  
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-100 border rounded-xl px-3 py-1.5 outline-none font-bold">
                    <option value="default">სორტირება</option>
                    <option value="price-asc">ფასი: დაბლიდან მაღლა</option>
                    <option value="price-desc">ფასი: მაღლიდან დაბლა</option>
                    <option value="rating">რეიტინგით</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between group">
                  <div>
                    <div className="relative overflow-hidden h-64 bg-gray-100">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <button onClick={() => toggleWishlist(product)} className={`absolute top-3 left-3 p-2 rounded-full backdrop-blur-md shadow ${wishlist.some(w => w.id === product.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'}`}>
                        <Heart className="w-4 h-4" />
                      </button>
                      <button onClick={() => setQuickViewProduct(product)} className="absolute top-3 right-3 bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-700 hover:bg-white shadow">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                        <span>{product.category}</span>
                        <span className="flex items-center text-amber-500 gap-0.5"><Star className="w-3 h-3 fill-amber-500"/> {product.rating}</span>
                      </div>
                      <h3 className="font-bold text-base mt-1 text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-black text-gray-900">{product.price} ₾</span>
                        {product.oldPrice && <span className="text-xs text-gray-400 line-through ml-2">{product.oldPrice} ₾</span>}
                      </div>

                      <button onClick={() => addToCart(product)} disabled={product.stock === 0} className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition ${product.stock > 0 ? 'bg-black text-white hover:bg-zinc-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {product.stock > 0 ? 'კალათაში' : 'ამოწურულია'}
                      </button>
                    </div>

                    <button onClick={() => setOneClickProduct(product)} className="w-full bg-indigo-50 text-indigo-600 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> 1-Click სწრაფი ყიდვა
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

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

      {oneClickProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setOneClickProduct(null)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h3 className="text-xl font-bold">⚡ სწრაფი შეკვეთა</h3>
            <p className="text-xs text-gray-500">{oneClickProduct.name} — {oneClickProduct.price} ₾</p>
            <form onSubmit={handleOneClickSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={oneClickForm.name} onChange={e => setOneClickForm({...oneClickForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონის ნომერი *" value={oneClickForm.phone} onChange={e => setOneClickForm({...oneClickForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3 rounded-2xl font-bold text-sm">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-y-auto max-h-[90vh] space-y-6">
            <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 text-gray-400"><X className="w-6 h-6"/></button>
            <div className="flex flex-col md:flex-row gap-6">
              <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full md:w-1/2 h-64 object-cover rounded-2xl" />
              <div className="flex-1 space-y-3">
                <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full">{quickViewProduct.category}</span>
                <h3 className="text-xl font-bold">{quickViewProduct.name}</h3>
                <p className="text-xs text-gray-500">{quickViewProduct.description}</p>
                <div className="text-2xl font-black">{quickViewProduct.price} ₾</div>
                <button onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }} className="w-full bg-black text-white py-3 rounded-2xl font-bold text-sm">
                  კალათაში დამატება
                </button>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-bold text-lg">⭐ შეფასებები ({quickViewProduct.reviews ? quickViewProduct.reviews.length : 0})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {quickViewProduct.reviews && quickViewProduct.reviews.map(r => (
                  <div key={r.id} className="bg-gray-50 p-3 rounded-xl border text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{r.name}</span>
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="text-gray-600 mt-1">{r.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddReview} className="space-y-2">
                <input type="text" placeholder="თქვენი სახელი" value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-2 text-xs outline-none" />
                <textarea placeholder="დაწერეთ შეფასება..." value={newReview.text} onChange={e => setNewReview({...newReview, text: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-2 text-xs outline-none h-16"/>
                <button type="submit" className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">შეფასების დატოვება</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg">პროდუქტის რედაქტირება</h3>
              <button onClick={() => setEditingProduct(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditedProduct} className="space-y-3">
              <input type="text" placeholder="დასახელება" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="number" placeholder="ფასი (₾)" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="number" placeholder="მარაგი" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="text" placeholder="ფოტოს ბმული (URL)" value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm">შენახვა</button>
            </form>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5"/></button>
            <div className="text-center mb-2">
              <h3 className="text-2xl font-bold">{authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}</h3>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი და გვარი" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                  <input type="tel" required placeholder="ტელეფონი (+995 ...)" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="password" required placeholder="პაროლი" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
            <div className="text-center pt-2">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-xs font-semibold text-indigo-600 hover:underline">
                {authMode === 'login' ? "არ გაქვთ ანგარიში? დარეგისტრირდით" : "უკვე გაქვთ ანგარიში? შედით"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">კალათა ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">კალათა ცარიელია</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.price} ₾ x {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded-lg"><Minus className="w-3 h-3"/></button>
                      <span className="text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded-lg"><Plus className="w-3 h-3"/></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex gap-2">
                  <input type="text" placeholder="პრომოკოდი (GEO2026)" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="flex-1 bg-gray-100 border rounded-xl px-3 py-2 text-xs outline-none uppercase font-bold"/>
                  <button onClick={applyCoupon} className="bg-gray-200 px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                </div>
                <div className="flex justify-between font-black text-lg pt-2 border-t">
                  <span>საბოლოო:</span>
                  <span>{grandTotal} ₾</span>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                  შეკვეთის გაფორმება
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xl font-bold">შეკვეთის გაფორმება</h3>
              <button onClick={() => setIsCheckoutOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონის ნომერი *" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              
              <div className="grid grid-cols-2 gap-2">
                <select value={orderForm.deliveryZone} onChange={e => setOrderForm({...orderForm, deliveryZone: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                  <option value="tbilisi">თბილისი (+5₾)</option>
                  <option value="region">რეგიონები (+10₾)</option>
                </select>
                <input type="text" required placeholder="მისამართი *" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-gray-500">გადახდის მეთოდი:</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setOrderForm({...orderForm, paymentMethod: 'courier'})} className={`p-3 rounded-2xl border text-center transition ${orderForm.paymentMethod === 'courier' ? 'bg-black text-white border-black' : 'bg-gray-50'}`}>
                    💵 კურიერთან
                  </button>
                  <button type="button" onClick={() => setOrderForm({...orderForm, paymentMethod: 'card'})} className={`p-3 rounded-2xl border text-center transition ${orderForm.paymentMethod === 'card' ? 'bg-black text-white border-black' : 'bg-gray-50'}`}>
                    💳 ბარათით
                  </button>
                  <button type="button" onClick={() => setOrderForm({...orderForm, paymentMethod: 'bank'})} className={`p-3 rounded-2xl border text-center transition ${orderForm.paymentMethod === 'bank' ? 'bg-black text-white border-black' : 'bg-gray-50'}`}>
                    🏛️ გადარიცხვა
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                დადასტურება ({grandTotal} ₾)
              </button>
            </form>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">შეკვეთა მიღებულია!</h3>
            <p className="text-xs text-gray-500 mt-1">შეკვეთის N: #{orderSuccess.id}</p>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-3 rounded-xl font-bold mt-4">
              დახურვა
            </button>
          </div>
        </div>
      )}

      <footer className="bg-white border-t mt-12 py-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab("policy")} className="hover:underline">წესები და პოლიტიკა</button>
            <button onClick={() => setActiveTab("contact")} className="hover:underline">კონტაქტი</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
