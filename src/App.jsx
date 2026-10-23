import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag, ArrowUp, ArrowDown, EyeOff, Printer, Truck, Percent, Users, Settings, Copy, Trash2, Shield, Key, Sparkles
} from 'lucide-react';

const INITIAL_CATEGORIES = [
  "ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", 
  "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი"
];

const INITIAL_PRODUCTS = [
  { 
    id: 1, 
    sku: "GEO-IPH-15P", 
    name: "Apple iPhone 15 Pro Max 256GB Titanium", 
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

const INITIAL_BANNERS = [
  { id: 1, title: "გრანდიოზული ფასდაკლება 2026!", subtitle: "ისარგებლეთ 10%-იანი ფასდაკლებით კოდით: GEO2026", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80" }
];

export default function App() {
  const [lang, setLang] = useState("KA");

  // ადმინის ავტორიზაციის მონაცემები (Username & Password)
  const [adminAuth, setAdminAuth] = useState(() => {
    const saved = localStorage.getItem('geostore_admin_auth');
    return saved ? JSON.parse(saved) : { username: "admin", password: "admin123" };
  });

  const [adminLoginForm, setAdminLoginForm] = useState({ username: "", password: "" });
  const [adminSecurityForm, setAdminSecurityForm] = useState({ username: adminAuth.username, oldPassword: "", newPassword: "" });

  useEffect(() => {
    localStorage.setItem('geostore_admin_auth', JSON.stringify(adminAuth));
  }, [adminAuth]);

  // დინამიკური კატეგორიები
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('geostore_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('geostore_categories', JSON.stringify(categories));
  }, [categories]);

  const [newCatName, setNewCatName] = useState("");

  // ანალიტიკა
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
      { id: 'productsGrid', name: "პროდუქტების ბადე", visible: true },
      { id: 'faq', name: "ხშირად დასმული კითხვები (FAQ)", visible: true }
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

  // ბაზები
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
      { id: 1, name: "გიორგი ბერიძე", email: "giorgi@gmail.com", phone: "+995 599 11 22 33", password: "123", date: "2026-10-15" }
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
    return saved ? JSON.parse(saved) : INITIAL_BANNERS;
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
  const [adminError, setAdminError] = useState("");
  const [adminSubTab, setAdminSubTab] = useState("banners");
  
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

  // მომხმარებლის რეგისტრაცია და ავტორიზაცია
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      alert("გთხოვთ შეიყვანოთ ელ-ფოსტა და პაროლი!");
      return;
    }

    if (authMode === 'register') {
      if (!authForm.name || !authForm.phone) {
        alert("გთხოვთ შეავსოთ სახელი და ტელეფონის ნომერი!");
        return;
      }
      const existingUser = usersList.find(u => u.email === authForm.email);
      if (existingUser) {
        alert("ამ ელ-ფოსტით მომხმარებელი უკვე დარეგისტრირებულია!");
        return;
      }
      const newUser = {
        id: Date.now(),
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        password: authForm.password,
        date: new Date().toISOString().split('T')[0]
      };
      setUsersList([newUser, ...usersList]);
      setCurrentUser(newUser);
      setIsAuthOpen(false);
      setAuthForm({ name: "", phone: "", email: "", password: "" });
      showToast("🎉 რეგისტრაცია წარმატებით დასრულდა!");
    } else {
      const foundUser = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (foundUser) {
        setCurrentUser(foundUser);
        setIsAuthOpen(false);
        setAuthForm({ name: "", phone: "", email: "", password: "" });
        showToast("🔑 ავტორიზაცია წარმატებულია!");
      } else {
        alert("არასწორი ელ-ფოსტა ან პაროლი!");
      }
    }
  };

  // ადმინის ავტორიზაცია
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminLoginForm.username === adminAuth.username && adminLoginForm.password === adminAuth.password) {
      setIsAdminLoggedIn(true);
      setAdminError("");
      setAdminLoginForm({ username: "", password: "" });
      showToast("ადმინ პანელში შესვლა წარმატებულია!");
    } else {
      setAdminError("არასწორი მომხმარებლის სახელი ან პაროლი!");
    }
  };

  // ადმინის პაროლის შეცვლა
  const handleChangeAdminPassword = (e) => {
    e.preventDefault();
    if (adminSecurityForm.oldPassword !== adminAuth.password) {
      alert("ძველი პაროლი არასწორია!");
      return;
    }
    if (!adminSecurityForm.newPassword || adminSecurityForm.newPassword.length < 4) {
      alert("ახალი პაროლი უნდა იყოს სულ მცირე 4 სიმბოლო!");
      return;
    }
    const updatedAuth = {
      username: adminSecurityForm.username || adminAuth.username,
      password: adminSecurityForm.newPassword
    };
    setAdminAuth(updatedAuth);
    setAdminSecurityForm({ username: updatedAuth.username, oldPassword: "", newPassword: "" });
    showToast("🔑 ადმინის პაროლი წარმატებით შეიცვალა!");
  };

  // კატეგორიების დამატება/წაშლა
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (categories.includes(newCatName.trim())) {
      alert("ეს კატეგორია უკვე არსებობს!");
      return;
    }
    setCategories([...categories, newCatName.trim()]);
    setNewCatName("");
    showToast("კატეგორია დაემატა!");
  };

  const handleDeleteCategory = (catToDelete) => {
    if (catToDelete === "ყველა") {
      alert("ძირითადი კატეგორიის წაშლა შეუძლებელია!");
      return;
    }
    if (confirm(`ნამდვილად გსურთ კატეგორიის "${catToDelete}" წაშლა?`)) {
      setCategories(categories.filter(c => c !== catToDelete));
      showToast("კატეგორია წაიშალა");
    }
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
      userEmail: currentUser ? currentUser.email : "guest",
      status: "ახალი",
      courierName: "მიუნიჭებელია"
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
      status: "ახალი",
      courierName: "მიუნიჭებელია"
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

  const handleAddBanner = (e) => {
    e.preventDefault();
    if (!newBanner.title) return;
    setBanners([...banners, { id: Date.now(), ...newBanner }]);
    setNewBanner({ title: "", subtitle: "", image: "" });
    showToast("ბანერი დაემატა!");
  };

  const moveBanner = (index, direction) => {
    const updated = [...banners];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < updated.length) {
      const temp = updated[index];
      updated[index] = updated[target];
      updated[target] = temp;
      setBanners(updated);
    }
  };

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlot.title) return;
    setPromoSlots([...promoSlots, { id: Date.now(), ...newSlot }]);
    setNewSlot({ title: "", desc: "", image: "", linkText: "" });
    showToast("სარეკლამო ბლოკი დაემატა!");
  };

  const handleAddPromo = (e) => {
    e.preventDefault();
    if (!newPromo.code || !newPromo.discount) return;
    setPromoCodes([...promoCodes, { id: Date.now(), code: newPromo.code.toUpperCase(), discount: Number(newPromo.discount) }]);
    setNewPromo({ code: "", discount: "" });
    showToast("პრომოკოდი დაემატა!");
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl text-xs font-black tracking-wide border border-indigo-400/30 backdrop-blur-md animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* ახალი, სტილური ზედა ზოლი */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-xs py-2.5 px-4 font-medium flex justify-between items-center max-w-7xl mx-auto w-full border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {banners[currentBannerIndex]?.subtitle || "უფასო მიწოდება 100₾-ის ზემოთ!"}
          </span>
          {banners.length > 1 && (
            <div className="flex gap-1 ml-2">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentBannerIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${currentBannerIndex === idx ? 'bg-amber-400 w-4' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setLang(lang === "KA" ? "EN" : "KA")} className="flex items-center gap-1 font-bold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition border border-white/10 text-[11px]">
            <Globe className="w-3 h-3 text-indigo-400" /> {lang}
          </button>
          <button onClick={() => setActiveTab("policy")} className="hover:text-indigo-300 transition text-[11px]">პოლიტიკა</button>
        </div>
      </div>

      {/* ახალი, Glassmorphism ჰედერი */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => setActiveTab("shop")} className="flex items-center gap-2 text-2xl font-black tracking-tighter group">
            <span className="bg-gradient-to-tr from-indigo-600 to-violet-500 text-white px-3 py-1 rounded-2xl shadow-lg group-hover:scale-105 transition duration-300">GEO</span>
            <span className="bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">STORE</span>
          </button>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="მოძებნე პროდუქტი ან SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none transition duration-300 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab("wishlist")} className="relative p-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition group">
              <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition duration-300" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow">
                  {wishlist.length}
                </span>
              )}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab("profile")} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 transition">
                <User className="w-4 h-4 text-indigo-400" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 transition">
                <User className="w-4 h-4 text-indigo-400" /> შესვლა / რეგისტრაცია
              </button>
            )}

            <button onClick={() => setActiveTab("admin")} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition border ${activeTab === 'admin' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'}`}>
              <Lock className="w-3.5 h-3.5" /> ადმინი
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg shadow-indigo-600/30 transition duration-300">
              <ShoppingBag className="w-4 h-4" /> კალათა
              {cart.reduce((s, i) => s + i.qty, 0) > 0 && (
                <span className="bg-white text-indigo-900 text-[11px] font-black px-2 py-0.5 rounded-full ml-1">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* ფავორიტები */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2">❤️ ფავორიტი პროდუქტები ({wishlist.length})</h2>
            {wishlist.length === 0 ? <p className="text-slate-500 text-sm py-12 text-center">ფავორიტები ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(product => (
                  <div key={product.id} className="bg-slate-800/80 rounded-3xl border border-slate-700/80 overflow-hidden flex flex-col justify-between group hover:border-indigo-500/50 transition duration-300">
                    <div>
                      <div className="relative h-64 bg-slate-900">
                        <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <button onClick={() => toggleWishlist(product)} className="absolute top-3 left-3 p-2 rounded-2xl bg-rose-500 text-white shadow-lg">
                          <Heart className="w-4 h-4 fill-white" />
                        </button>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-base text-white">{product.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                      </div>
                    </div>
                    <div className="p-5 pt-0 flex items-center justify-between">
                      <span className="text-xl font-black text-amber-400">{product.price} ₾</span>
                      <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition">
                        <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* პროფილი */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-800/90 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white">გამარჯობა, {currentUser.name}!</h2>
                  <p className="text-xs text-slate-400 mt-1">📧 {currentUser.email} | 📞 {currentUser.phone}</p>
                </div>
                <button onClick={() => { setCurrentUser(null); setActiveTab("shop"); }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-500/20 transition">
                  <LogOut className="w-4 h-4"/> გამოსვლა
                </button>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-base mb-3 text-slate-200">📦 ჩემი შეკვეთები</h3>
                {orders.filter(o => o.userEmail === currentUser.email).length === 0 ? (
                  <p className="text-xs text-slate-500">შეკვეთების ისტორია ცარიელია.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.filter(o => o.userEmail === currentUser.email).map(o => (
                      <div key={o.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">შეკვეთა #{o.id} ({o.date})</p>
                          <p className="text-slate-400 mt-0.5">{o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-amber-400">{o.total} ₾</p>
                          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold text-[10px] border border-indigo-500/30">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* პოლიტიკა */}
        {activeTab === 'policy' && (
          <div className="bg-slate-800/90 rounded-3xl p-8 border border-slate-700 max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl font-black text-white">წესები და პოლიტიკა</h2>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{policyText}</p>
            <button onClick={() => setActiveTab("shop")} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition">უკან</button>
          </div>
        )}

        {/* ადმინ პანელი */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-slate-800/90 p-8 rounded-3xl shadow-2xl border border-slate-700 mt-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/30">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-black text-white">ადმინისტრაციის შესვლა</h2>
                  <p className="text-xs text-slate-400">სტანდარტული: admin / admin123</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="text" placeholder="მომხმარებლის სახელი" value={adminLoginForm.username} onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500" />
                  <input type="password" placeholder="პაროლი" value={adminLoginForm.password} onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500" />
                  {adminError && <p className="text-rose-400 text-xs text-center font-bold">{adminError}</p>}
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/30 transition">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h2 className="text-3xl font-black text-white">ადმინ პანელი</h2>
                  <div className="flex gap-2">
                    <button onClick={exportOrdersToCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition">
                      <Download className="w-4 h-4" /> CSV ექსპორტი
                    </button>
                    <button onClick={() => setIsAdminLoggedIn(false)} className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold transition">გასვლა</button>
                  </div>
                </div>

                {/* სუბ-ტაბები */}
                <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('banners')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'banners' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🖼️ ბანერები ({banners.length})</button>
                  <button onClick={() => setAdminSubTab('categories')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'categories' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>⚙️ კატეგორიები ({categories.length})</button>
                  <button onClick={() => setAdminSubTab('builder')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'builder' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🎨 Page Builder</button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🏷️ პროდუქტები ({products.length})</button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>📦 შეკვეთები ({orders.length})</button>
                  <button onClick={() => setAdminSubTab('crm')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'crm' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>👥 CRM ({usersList.length})</button>
                  <button onClick={() => setAdminSubTab('security')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'security' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>🔑 პაროლის შეცვლა</button>
                  <button onClick={() => setAdminSubTab('chat')} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${adminSubTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>💬 ჩათი ({chatMessages.length})</button>
                </div>

                {/* პაროლის შეცვლა */}
                {adminSubTab === 'security' && (
                  <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 max-w-lg space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white"><Key className="w-5 h-5 text-indigo-400"/> ადმინ პანელის უსაფრთხოება</h3>
                    <p className="text-xs text-slate-400">შეცვალეთ ადმინისტრატორის მომხმარებლის სახელი და პაროლი.</p>
                    
                    <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">ადმინის მომხმარებლის სახელი</label>
                        <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">მიმდინარე/ძველი პაროლი *</label>
                        <input type="password" required value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">ახალი პაროლი *</label>
                        <input type="password" required value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs transition">პაროლის განახლება</button>
                    </form>
                  </div>
                )}

                {/* კატეგორიები */}
                {adminSubTab === 'categories' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">+ ახალი კატეგორიის დამატება</h3>
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input type="text" placeholder="კატეგორიის დასახელება..." value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition">დამატება</button>
                      </form>
                    </div>

                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">არსებული კატეგორიები</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {categories.map(cat => (
                          <div key={cat} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-200">{cat}</span>
                            {cat !== "ყველა" && (
                              <button onClick={() => handleDeleteCategory(cat)} className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-xl text-xs font-bold border border-rose-500/30">წაშლა</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ბანერები */}
                {adminSubTab === 'banners' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">+ ახალი ბანერის დამატება</h3>
                      <form onSubmit={handleAddBanner} className="space-y-3">
                        <input type="text" placeholder="სათაური *" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <input type="text" placeholder="ქვესათაური / აღწერა" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewBanner({...newBanner, image: res}))} className="text-xs text-slate-400"/>
                        </div>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition">ბანერის დამატება</button>
                      </form>
                    </div>

                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">აქტიური ბანერები</h3>
                      <div className="space-y-3">
                        {banners.map((b, idx) => (
                          <div key={b.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              {b.image && <img src={b.image} alt="" className="w-16 h-12 object-cover rounded-xl"/>}
                              <div>
                                <h4 className="font-bold text-xs text-white">{b.title}</h4>
                                <p className="text-[11px] text-slate-400">{b.subtitle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => moveBanner(idx, 'up')} disabled={idx === 0} className="p-2 bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                              <button onClick={() => moveBanner(idx, 'down')} disabled={idx === banners.length - 1} className="p-2 bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                              <button onClick={() => setBanners(banners.filter(item => item.id !== b.id))} className="bg-rose-500/20 text-rose-400 px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30">წაშლა</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Builder */}
                {adminSubTab === 'builder' && (
                  <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                    <h3 className="text-xl font-bold text-white">🎨 Page Builder (სექციების რედაქტორი)</h3>
                    <div className="space-y-3">
                      {pageSections.map((sec, idx) => (
                        <div key={sec.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-200">{sec.name} ({sec.visible ? '🟢 ჩართული' : '🔴 გამორთული'})</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleSectionVisibility(sec.id)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white">
                              {sec.visible ? 'დამალვა' : 'ჩვენება'}
                            </button>
                            <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-2 bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                            <button onClick={() => moveSection(idx, 'down')} disabled={idx === pageSections.length - 1} className="p-2 bg-slate-800 border border-slate-700 rounded-xl disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* პროდუქტები */}
                {adminSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">+ პროდუქტის დამატება</h3>
                      <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <input type="text" placeholder="SKU კოდი" value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <input type="text" placeholder="დასახელება *" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none">
                          {categories.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="ფასი (₾) *" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <input type="number" placeholder="თვითღირებულება (₾)" value={newProd.costPrice} onChange={e => setNewProd({...newProd, costPrice: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <input type="number" placeholder="მარაგი" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                        <div className="sm:col-span-3 bg-slate-900 border border-slate-700 rounded-xl p-3">
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewProd({...newProd, imageFile: res}))} className="text-xs text-slate-400"/>
                        </div>
                        <textarea placeholder="აღწერა..." value={newProd.description} onChange={e => setNewProd({...newProd, description: e.target.value})} className="sm:col-span-3 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none h-20"/>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs sm:col-span-3 transition">პროდუქტის დამატება</button>
                      </form>
                    </div>

                    <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white">არსებული პროდუქტები</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-xl"/>
                              <div>
                                <h4 className="font-bold text-xs text-white">{p.name}</h4>
                                <p className="text-[11px] text-slate-400">კატეგორია: {p.category} | ფასი: {p.price} ₾ | მარაგი: <span className={p.stock < 5 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{p.stock} ცალი</span></p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingProduct(p)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* შეკვეთები */}
                {adminSubTab === 'orders' && (
                  <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                    <h3 className="text-xl font-bold text-white">შეკვეთების სრული მართვა</h3>
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <span className="font-bold text-xs text-white">შეკვეთა #{o.id} ({o.date})</span>
                            <p className="text-xs text-slate-400">მყიდველი: {o.customer.name} | 📞 {o.customer.phone}</p>
                            <p className="text-xs text-indigo-400 font-bold mt-1">პროდუქტები: {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-amber-400">{o.total} ₾</span>
                            <select value={o.status} onChange={(e) => setOrders(orders.map(item => item.id === o.id ? { ...item, status: e.target.value } : item))} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs font-bold text-indigo-400">
                              <option value="ახალი">ახალი</option>
                              <option value="დამუშავებაშია">დამუშავებაშია</option>
                              <option value="გზაშია">გზაშია</option>
                              <option value="ჩაბარებული">ჩაბარებული</option>
                            </select>
                            <button onClick={() => setSelectedOrderForInvoice(o)} className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold"><Printer className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CRM */}
                {adminSubTab === 'crm' && (
                  <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                    <h3 className="text-xl font-bold text-white">👥 მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-3">
                      {usersList.map(u => (
                        <div key={u.id} className="border border-slate-700 p-4 rounded-2xl bg-slate-900/60 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-xs text-white">{u.name}</h4>
                            <p className="text-xs text-slate-400">📧 {u.email} | 📞 {u.phone} | რეგ: {u.date}</p>
                          </div>
                          <button onClick={() => setUsersList(usersList.filter(user => user.id !== u.id))} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ჩათი */}
                {adminSubTab === 'chat' && (
                  <div className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700 space-y-4">
                    <h3 className="text-xl font-bold text-white">💬 ონლაინ ჩათი</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {chatMessages.map(m => (
                        <div key={m.id} className={`p-3 rounded-2xl border text-xs ${m.isAdmin ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-200 ml-6' : 'bg-slate-900 border-slate-700 text-slate-200 mr-6'}`}>
                          <p className="font-bold text-slate-400">{m.sender} ({m.time})</p>
                          <p className="text-xs font-medium mt-1">{m.text}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAdminReplyMessage} className="flex gap-2 pt-2 border-t border-slate-700">
                      <input type="text" placeholder="უპასუხეთ კლიენტს..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none"/>
                      <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">გაგზავნა</button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* მთავარი მაღაზია */}
        {activeTab === 'shop' && (
          <div className="space-y-8">
            {pageSections.map(sec => {
              if (!sec.visible) return null;

              if (sec.id === 'hero') {
                const b = banners[currentBannerIndex] || banners[0];
                return (
                  <div key="hero" className={`rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl text-white flex flex-col md:flex-row justify-between items-center gap-6 border border-white/10 ${b?.image ? 'bg-cover bg-center' : 'bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950'}`} style={b?.image ? { backgroundImage: `url(${b.image})` } : {}}>
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"></div>
                    <div className="relative z-10 max-w-xl space-y-4">
                      <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit shadow-lg">
                        <Zap className="w-3.5 h-3.5 fill-white" /> FLASH SALE 2026
                      </span>
                      <h1 className="text-3xl md:text-5xl font-black leading-tight text-white tracking-tight">{b?.title || "გრანდიოზული ფასდაკლება!"}</h1>
                      <p className="text-slate-300 text-xs md:text-sm">{b?.subtitle}</p>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'promoSlots') {
                return promoSlots.length > 0 ? (
                  <div key="promoSlots" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {promoSlots.map(slot => (
                      <div key={slot.id} className="relative rounded-3xl overflow-hidden shadow-xl bg-slate-800/80 border border-slate-700/80 flex items-center p-6 gap-4">
                        {slot.image && <img src={slot.image} alt="" className="w-24 h-24 object-cover rounded-2xl shrink-0 border border-slate-700"/>}
                        <div className="space-y-1">
                          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30">აქცია</span>
                          <h3 className="font-bold text-base text-white">{slot.title}</h3>
                          <p className="text-xs text-slate-400">{slot.desc}</p>
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
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition duration-300 border ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
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
                      <div key={product.id} className="bg-slate-800/80 rounded-3xl border border-slate-700/80 shadow-xl overflow-hidden flex flex-col justify-between group hover:border-indigo-500/50 hover:shadow-2xl transition duration-500">
                        <div className="relative h-64 bg-slate-900 overflow-hidden">
                          <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <button onClick={() => toggleWishlist(product)} className={`absolute top-3 right-3 p-2.5 rounded-2xl backdrop-blur-md shadow-lg transition ${wishlist.some(w => w.id === product.id) ? 'bg-rose-500 text-white' : 'bg-slate-900/80 text-slate-300 border border-slate-700'}`}>
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-5">
                          <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg">{product.category}</span>
                          <h3 className="font-bold text-base mt-2 text-white">{product.name}</h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                        </div>
                        <div className="p-5 pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-amber-400">{product.price} ₾</span>
                            <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20">
                              <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                            </button>
                          </div>
                          <button onClick={() => setOneClickProduct(product)} className="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-600/50 transition">
                            <Zap className="w-3.5 h-3.5 text-amber-400" /> 1-Click სწრაფი ყიდვა
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (sec.id === 'faq') {
                return (
                  <div key="faq" className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700/80 shadow-xl space-y-4">
                    <h3 className="text-xl font-bold text-white">❓ ხშირად დასმული კითხვები (FAQ)</h3>
                    <div className="space-y-3 text-xs">
                      <div className="border-b border-slate-700 pb-3">
                        <p className="font-bold text-slate-200">რამდენ ხანში მომაწვდით შეკვეთას?</p>
                        <p className="text-slate-400 mt-1">თბილისში მიწოდება ხდება 24 საათში, ხოლო რეგიონებში 48 საათში.</p>
                      </div>
                      <div className="border-b border-slate-700 pb-3">
                        <p className="font-bold text-slate-200">როგორ გადავიხადო?</p>
                        <p className="text-slate-400 mt-1">გადახდა შეგიძლიათ კურიერთან ნაღდი ანგარიშსწორებით ან ბარათით მიღებისას.</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

      </main>

      {/* ონლაინ ჩათი */}
      <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 transition duration-300 border border-indigo-400/30">
        <MessageCircle className="w-5 h-5" />
        <span className="text-xs font-bold hidden sm:inline">ონლაინ ჩათი</span>
      </button>

      {isChatOpen && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900 w-80 sm:w-96 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col h-96">
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
            <span className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4"/> GEOSTORE მხარდაჭერა</span>
            <button onClick={() => setIsChatOpen(false)}>✕</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950">
            {chatMessages.length === 0 && <p className="text-xs text-slate-500 text-center py-6">მოგვწერეთ ნებისმიერი კითხვა!</p>}
            {chatMessages.map(m => (
              <div key={m.id} className={`max-w-[85%] p-3 rounded-2xl text-xs ${m.isAdmin ? 'bg-indigo-600 text-white ml-auto' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                <p className="font-bold mb-1 opacity-80">{m.sender}</p>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
            <input type="text" placeholder="მოგვწერეთ..." value={userChatMessage} onChange={e => setUserChatMessage(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none"/>
            <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-xl"><Send className="w-4 h-4"/></button>
          </form>
        </div>
      )}

      {/* რეგისტრაციის / ავტორიზაციის მოდალი */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800/90 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700 space-y-4 relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            
            <div className="flex justify-center border-b border-slate-700 pb-3 gap-6">
              <button onClick={() => setAuthMode('login')} className={`text-base font-bold pb-1 transition ${authMode === 'login' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-500'}`}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={`text-base font-bold pb-1 transition ${authMode === 'register' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-500'}`}>რეგისტრაცია</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი და გვარი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold text-xs transition">
                {authMode === 'login' ? 'შესვლა' : 'დარეგისტრირება'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click ყიდვა */}
      {oneClickProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800/90 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-700 space-y-4 relative">
            <button onClick={() => setOneClickProduct(null)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-xl font-bold text-white">⚡ სწრაფი შეკვეთა</h3>
            <p className="text-xs text-slate-400">{oneClickProduct.name} — <span className="text-amber-400 font-bold">{oneClickProduct.price} ₾</span></p>
            <form onSubmit={handleOneClickSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი *" value={oneClickForm.name} onChange={e => setOneClickForm({...oneClickForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={oneClickForm.phone} onChange={e => setOneClickForm({...oneClickForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-bold text-xs transition">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* ინვოისი */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg">📄 ინვოისი #{selectedOrderForInvoice.id}</h3>
              <button onClick={() => setSelectedOrderForInvoice(null)}>✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <p><b>თარიღი:</b> {selectedOrderForInvoice.date}</p>
              <p><b>მყიდველი:</b> {selectedOrderForInvoice.customer.name} ({selectedOrderForInvoice.customer.phone})</p>
              <div className="border-t pt-2 space-y-1">
                {selectedOrderForInvoice.items.map((i, idx) => <p key={idx}>• {i.name} (x{i.qty}) - {i.price * i.qty} ₾</p>)}
              </div>
              <p className="font-black text-sm pt-2 border-t">სულ: {selectedOrderForInvoice.total} ₾</p>
            </div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/> ინვოისის ბეჭდვა
            </button>
          </div>
        </div>
      )}

      {/* კალათა */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-bold text-lg text-white">კალათა ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-xs text-white">{item.name}</h4>
                    <p className="text-[11px] text-slate-400">{item.price} ₾ x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 border border-slate-700 rounded text-slate-300"><Minus className="w-3 h-3"/></button>
                    <span className="text-xs font-bold text-white">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 border border-slate-700 rounded text-slate-300"><Plus className="w-3 h-3"/></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex gap-2">
                  <input type="text" placeholder="პრომოკოდი" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs uppercase font-bold" />
                  <button onClick={applyCoupon} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                </div>
                <div className="flex justify-between font-black text-lg text-white">
                  <span>საბოლოო:</span>
                  <span className="text-amber-400">{grandTotal} ₾</span>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold text-xs transition shadow-lg shadow-indigo-600/30">გაფორმება</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* შეკვეთის გაფორმება */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800/90 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700 space-y-4">
            <h3 className="text-xl font-bold text-white">შეკვეთა</h3>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი *" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <input type="text" required placeholder="მისამართი *" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none" />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs transition">დადასტურება ({grandTotal} ₾)</button>
            </form>
          </div>
        </div>
      )}

      {/* წარმატებული შეკვეთა */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800/90 rounded-3xl max-w-md w-full p-8 text-center space-y-4 border border-slate-700">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-2xl font-bold text-white">შეკვეთა მიღებულია!</h3>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs transition">დახურვა</button>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-800 mt-12 py-8 text-xs text-slate-500 text-center">
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>

    </div>
  );
}
