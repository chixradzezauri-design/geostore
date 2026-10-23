import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Lock, CheckCircle, 
  Package, Eye, X, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Download, Star, Heart, Zap, Globe, Filter, MessageCircle, Bell, BarChart2, Activity, Laptop, Smartphone, DollarSign, AlertTriangle, Image as ImageIcon, Layout, Tag, ArrowUp, ArrowDown, EyeOff, Printer, Truck, Percent, Users, Settings, Copy, Trash2, Shield, Key
} from 'lucide-react';

const INITIAL_CATEGORIES = [
  "ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", 
  "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი"
];

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

  // Page Builder
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl text-xs font-bold">
          {toastMessage}
        </div>
      )}

      {/* ზედა ზოლი */}
      <div className="bg-black text-white text-xs py-2.5 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span>✨ {banners[currentBannerIndex]?.subtitle || "უფასო მიწოდება 100₾-ის ზემოთ"}</span>
          {banners.length > 1 && (
            <div className="flex gap-1 ml-2">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentBannerIndex(idx)} className={`w-2 h-2 rounded-full ${currentBannerIndex === idx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
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
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200">
                <User className="w-4 h-4" /> შესვლა / რეგისტრაცია
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

        {/* მომხმარებლის პროფილი */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-2xl font-black">გამარჯობა, {currentUser.name}!</h2>
                  <p className="text-xs text-gray-500 mt-1">📧 {currentUser.email} | 📞 {currentUser.phone}</p>
                </div>
                <button onClick={() => { setCurrentUser(null); setActiveTab("shop"); }} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                  <LogOut className="w-4 h-4"/> გამოსვლა
                </button>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-base mb-3">📦 ჩემი შეკვეთები</h3>
                {orders.filter(o => o.userEmail === currentUser.email).length === 0 ? (
                  <p className="text-xs text-gray-400">შეკვეთების ისტორია ცარიელია.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.filter(o => o.userEmail === currentUser.email).map(o => (
                      <div key={o.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold">შეკვეთა #{o.id} ({o.date})</p>
                          <p className="text-gray-500 mt-0.5">{o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm">{o.total} ₾</p>
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px]">{o.status}</span>
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
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">წესები და პოლიტიკა</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{policyText}</p>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">უკან</button>
          </div>
        )}

        {/* ადმინ პანელი */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">ადმინისტრაციის შესვლა</h2>
                  <p className="text-xs text-gray-500">სტანდარტული: admin / admin123</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="text" placeholder="მომხმარებლის სახელი" value={adminLoginForm.username} onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                  <input type="password" placeholder="პაროლი" value={adminLoginForm.password} onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                  {adminError && <p className="text-red-500 text-xs text-center font-medium">{adminError}</p>}
                  <button type="submit" className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm">შესვლა</button>
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

                {/* ადმინის სუბ-ტაბები */}
                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('banners')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'banners' ? 'bg-black text-white' : 'bg-gray-100'}`}>🖼️ ბანერები ({banners.length})</button>
                  <button onClick={() => setAdminSubTab('categories')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'categories' ? 'bg-black text-white' : 'bg-gray-100'}`}>⚙️ კატეგორიები ({categories.length})</button>
                  <button onClick={() => setAdminSubTab('builder')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'builder' ? 'bg-black text-white' : 'bg-gray-100'}`}>🎨 Page Builder</button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>🏷️ პროდუქტები ({products.length})</button>
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>📦 შეკვეთები ({orders.length})</button>
                  <button onClick={() => setAdminSubTab('crm')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'crm' ? 'bg-black text-white' : 'bg-gray-100'}`}>👥 CRM ({usersList.length})</button>
                  <button onClick={() => setAdminSubTab('security')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'security' ? 'bg-black text-white' : 'bg-gray-100'}`}>🔑 პაროლის შეცვლა</button>
                  <button onClick={() => setAdminSubTab('chat')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'chat' ? 'bg-black text-white' : 'bg-gray-100'}`}>💬 ჩათი ({chatMessages.length})</button>
                </div>

                {/* პაროლისა და უსაფრთხოების შეცვლა */}
                {adminSubTab === 'security' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border max-w-lg space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Key className="w-5 h-5 text-indigo-600"/> ადმინ პანელის უსაფრთხოება</h3>
                    <p className="text-xs text-gray-500">შეცვალეთ ადმინისტრატორის მომხმარებლის სახელი და პაროლი.</p>
                    
                    <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">ადმინის მომხმარებლის სახელი (Username)</label>
                        <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">მიმდინარე/ძველი პაროლი *</label>
                        <input type="password" required value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">ახალი პაროლი *</label>
                        <input type="password" required value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                      </div>
                      <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm">პაროლის განახლება</button>
                    </form>
                  </div>
                )}

                {/* კატეგორიების დინამიკური მართვა */}
                {adminSubTab === 'categories' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ ახალი კატეგორიის დამატება</h3>
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input type="text" placeholder="კატეგორიის დასახელება..." value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm">დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">არსებული კატეგორიები</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {categories.map(cat => (
                          <div key={cat} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <span className="font-bold text-sm">{cat}</span>
                            {cat !== "ყველა" && (
                              <button onClick={() => handleDeleteCategory(cat)} className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-xs font-bold">წაშლა</button>
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
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ ახალი ბანერის დამატება</h3>
                      <form onSubmit={handleAddBanner} className="space-y-3">
                        <input type="text" placeholder="სათაური *" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="text" placeholder="ქვესათაური / აღწერა" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <div className="bg-gray-100 border rounded-xl p-3 flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500">ბანერის ფოტო კომპიუტერიდან</label>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewBanner({...newBanner, image: res}))} className="text-xs"/>
                        </div>
                        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm">ბანერის დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">აქტიური ბანერები</h3>
                      <div className="space-y-3">
                        {banners.map((b, idx) => (
                          <div key={b.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              {b.image && <img src={b.image} alt="" className="w-16 h-12 object-cover rounded-xl"/>}
                              <div>
                                <h4 className="font-bold text-sm">{b.title}</h4>
                                <p className="text-xs text-gray-500">{b.subtitle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => moveBanner(idx, 'up')} disabled={idx === 0} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                              <button onClick={() => moveBanner(idx, 'down')} disabled={idx === banners.length - 1} className="p-2 bg-white border rounded-xl disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                              <button onClick={() => setBanners(banners.filter(item => item.id !== b.id))} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold">წაშლა</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Builder */}
                {adminSubTab === 'builder' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">🎨 Page Builder (სექციების რედაქტორი)</h3>
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

                {/* პროდუქტების მართვა */}
                {adminSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ პროდუქტის დამატება (ფოტოს ატვირთვით)</h3>
                      <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <input type="text" placeholder="SKU კოდი" value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="text" placeholder="დასახელება *" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                          {categories.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="ფასი (₾) *" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="number" placeholder="თვითღირებულება (₾)" value={newProd.costPrice} onChange={e => setNewProd({...newProd, costPrice: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <input type="number" placeholder="მარაგი" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                        <div className="sm:col-span-3 bg-gray-100 border rounded-xl p-3">
                          <label className="text-xs font-bold text-gray-500 block mb-1">აირჩიეთ ფოტო კომპიუტერიდან *</label>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (res) => setNewProd({...newProd, imageFile: res}))} className="text-xs"/>
                        </div>
                        <textarea placeholder="აღწერა..." value={newProd.description} onChange={e => setNewProd({...newProd, description: e.target.value})} className="sm:col-span-3 bg-gray-100 border rounded-xl p-3 text-sm outline-none h-20"/>
                        <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm sm:col-span-3">პროდუქტის დამატება</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">არსებული პროდუქტები</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="border p-4 rounded-2xl bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-xl"/>
                              <div>
                                <h4 className="font-bold text-sm">{p.name}</h4>
                                <p className="text-xs text-gray-500">კატეგორია: {p.category} | ფასი: {p.price} ₾ | მარაგი: <span className={p.stock < 5 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{p.stock} ცალი</span></p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingProduct(p)} className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* შეკვეთების მართვა */}
                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთების სრული მართვა</h3>
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="border p-4 rounded-2xl bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <span className="font-bold text-sm">შეკვეთა #{o.id} ({o.date})</span>
                            <p className="text-xs text-gray-600">მყიდველი: {o.customer.name} | 📞 {o.customer.phone}</p>
                            <p className="text-xs text-indigo-600 font-bold mt-1">პროდუქტები: {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black">{o.total} ₾</span>
                            <select value={o.status} onChange={(e) => setOrders(orders.map(item => item.id === o.id ? { ...item, status: e.target.value } : item))} className="bg-white border rounded-xl px-3 py-1 text-xs font-bold text-indigo-600">
                              <option value="ახალი">ახალი</option>
                              <option value="დამუშავებაშია">დამუშავებაშია</option>
                              <option value="გზაშია">გზაშია</option>
                              <option value="ჩაბარებული">ჩაბარებული</option>
                            </select>
                            <button onClick={() => setSelectedOrderForInvoice(o)} className="bg-black text-white px-3 py-2 rounded-xl text-xs font-bold"><Printer className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
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
                            <p className="text-xs text-gray-500">📧 {u.email} | 📞 {u.phone} | რეგ: {u.date}</p>
                          </div>
                          <button onClick={() => setUsersList(usersList.filter(user => user.id !== u.id))} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ჩათი */}
                {adminSubTab === 'chat' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">💬 ონლაინ ჩათი</h3>
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
                  <div key="hero" className={`rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6 ${b?.image ? 'bg-cover bg-center' : 'bg-black'}`} style={b?.image ? { backgroundImage: `url(${b.image})` } : {}}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                    <div className="relative z-10 max-w-xl space-y-3">
                      <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 w-fit">
                        <Zap className="w-3.5 h-3.5 fill-white" /> FLASH SALE 2026
                      </span>
                      <h1 className="text-3xl md:text-5xl font-black leading-tight">{b?.title || "გრანდიოზული ფასდაკლება!"}</h1>
                      <p className="text-gray-200 text-sm">{b?.subtitle}</p>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'promoSlots') {
                return promoSlots.length > 0 ? (
                  <div key="promoSlots" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {promoSlots.map(slot => (
                      <div key={slot.id} className="relative rounded-3xl overflow-hidden shadow-md bg-white border flex items-center p-6 gap-4">
                        {slot.image && <img src={slot.image} alt="" className="w-24 h-24 object-cover rounded-2xl shrink-0"/>}
                        <div className="space-y-1">
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">აქცია</span>
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
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-black text-white shadow-md' : 'bg-white border text-gray-700 hover:bg-gray-100'}`}>
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
                      <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition">
                        <div className="relative h-64 bg-gray-100 overflow-hidden">
                          <img src={product.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <button onClick={() => toggleWishlist(product)} className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md shadow ${wishlist.some(w => w.id === product.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'}`}>
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-5">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{product.category}</span>
                          <h3 className="font-bold text-base mt-1">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                        </div>
                        <div className="p-5 pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black">{product.price} ₾</span>
                            <button onClick={() => addToCart(product)} className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-black text-white flex items-center gap-1.5 hover:bg-zinc-800 transition">
                              <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                            </button>
                          </div>
                          <button onClick={() => setOneClickProduct(product)} className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition">
                            <Zap className="w-3.5 h-3.5" /> 1-Click სწრაფი ყიდვა
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (sec.id === 'faq') {
                return (
                  <div key="faq" className="bg-white rounded-3xl p-8 border space-y-4 shadow-sm">
                    <h3 className="text-xl font-bold">❓ ხშირად დასმული კითხვები (FAQ)</h3>
                    <div className="space-y-3 text-sm">
                      <div className="border-b pb-2">
                        <p className="font-bold">რამდენ ხანში მომაწვდით შეკვეთას?</p>
                        <p className="text-gray-500 text-xs mt-0.5">თბილისში მიწოდება ხდება 24 საათში, ხოლო რეგიონებში 48 საათში.</p>
                      </div>
                      <div className="border-b pb-2">
                        <p className="font-bold">როგორ გადავიხადო?</p>
                        <p className="text-gray-500 text-xs mt-0.5">გადახდა შეგიძლიათ კურიერთან ნაღდი ანგარიშსწორებით ან ბარათით მიღებისას.</p>
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

      {/* მომხმარებლის რეგისტრაციის / ავტორიზაციის მოდალი */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            
            <div className="flex justify-center border-b pb-3 gap-6">
              <button onClick={() => setAuthMode('login')} className={`text-base font-bold pb-1 ${authMode === 'login' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={`text-base font-bold pb-1 ${authMode === 'register' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>რეგისტრაცია</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი და გვარი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              
              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                {authMode === 'login' ? 'შესვლა' : 'დარეგისტრირება'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click ყიდვა */}
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

      {/* ინვოისი */}
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

      {/* კალათა */}
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

      {/* წარმატებული შეკვეთა */}
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
