import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, ArrowUp, ArrowDown
} from 'lucide-react';

// --- INITIAL MOCK DATA ---
const INITIAL_CATEGORIES = [
  "ყველა", "სმარტფონები", "ლეპტოპები", "აქსესუარები", "ჭკვიანი საათები", "ტელევიზორები"
];

const INITIAL_PRODUCTS = [
  {
    id: 1,
    sku: 'GEO-IP15P',
    name: 'iPhone 15 Pro Max 256GB Titanium',
    category: 'სმარტფონები',
    priceGEL: 3899,
    oldPriceGEL: 4299,
    stock: 8,
    rating: 4.9,
    reviewsCount: 24,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით და ტიტანის კორპუსით. საუკეთესო კამერა და ბატარეის ხანგრძლივობა.',
    isHot: true,
    discountPercent: 10
  },
  {
    id: 2,
    sku: 'GEO-MBA-M3',
    name: 'MacBook Air 15" M3 16GB / 512GB',
    category: 'ლეპტოპები',
    priceGEL: 4499,
    oldPriceGEL: 4899,
    stock: 4,
    rating: 5.0,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით. 18 საათამდე ავტონომიური მუშაობა.',
    isHot: true,
    discountPercent: 8
  },
  {
    id: 3,
    sku: 'GEO-APMX',
    name: 'AirPods Max Space Gray',
    category: 'აქსესუარები',
    priceGEL: 1699,
    oldPriceGEL: 1899,
    stock: 2,
    rating: 4.7,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600',
    description: 'მაღალი კლასის უსადენო ყურსასმენები აქტიური ხმაურის დახშობითა და სივრცული აუდიოთი.',
    isHot: false,
    discountPercent: 11
  },
  {
    id: 4,
    sku: 'GEO-AWU2',
    name: 'Apple Watch Ultra 2 GPS + Cellular',
    category: 'ჭკვიანი საათები',
    priceGEL: 2499,
    oldPriceGEL: 2799,
    stock: 12,
    rating: 4.8,
    reviewsCount: 15,
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
    description: 'ექსტრემალური პირობებისთვის შექმნილი ჭკვიანი საათი ტიტანის კორპუსით და 3000-ნიტიანი ეკრანით.',
    isHot: true,
    discountPercent: 11
  }
];

const INITIAL_BANNERS = [
  {
    id: 'b1',
    title: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში',
    subtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ Apple-ის პროდუქციაზე!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200',
    buttonText: 'შეიძინე ახლავე'
  }
];

const INITIAL_PROMO_SLOTS = [
  { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-amber-500 to-rose-500' },
  { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-blue-600 to-indigo-700' },
  { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-emerald-500 to-teal-700' }
];

const INITIAL_COUPONS = [
  { code: 'GEO10', discountPercent: 10 },
  { code: 'SPRING20', discountPercent: 20 },
  { code: 'WELCOME5', discountPercent: 5 }
];

export default function App() {
  const [currency, setCurrency] = useState('GEL'); 
  const usdRate = 2.70;

  // ადმინის ავტორიზაცია
  const [adminAuth, setAdminAuth] = useState(() => {
    const saved = localStorage.getItem('geostore_admin_auth');
    return saved ? JSON.parse(saved) : { username: "admin", password: "admin123" };
  });

  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '' });
  const [adminSecurityForm, setAdminSecurityForm] = useState({ username: adminAuth.username, oldPassword: '', newPassword: '' });

  useEffect(() => {
    localStorage.setItem('geostore_admin_auth', JSON.stringify(adminAuth));
  }, [adminAuth]);

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('geostore_cats');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('geostore_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [banners, setBanners] = useState(() => {
    const saved = localStorage.getItem('geostore_banners');
    return saved ? JSON.parse(saved) : INITIAL_BANNERS;
  });

  const [promoSlots, setPromoSlots] = useState(() => {
    const saved = localStorage.getItem('geostore_promos');
    return saved ? JSON.parse(saved) : INITIAL_PROMO_SLOTS;
  });

  const [coupons, setCoupons] = useState(() => {
    const saved = localStorage.getItem('geostore_coupons');
    return saved ? JSON.parse(saved) : INITIAL_COUPONS;
  });

  // Page builder
  const [sections, setSections] = useState(() => {
    const saved = localStorage.getItem('geostore_sections');
    return saved ? JSON.parse(saved) : [
      { id: 'hero', name: 'მთავარი ბანერი', visible: true },
      { id: 'promos', name: 'პრომო ბლოკები', visible: true },
      { id: 'ticker', name: 'ცხელი შეთავაზებები (Ticker)', visible: true },
      { id: 'categories', name: 'კატეგორიების სექცია', visible: true },
      { id: 'products', name: 'პროდუქციის კატალოგი', visible: true },
      { id: 'badges', name: 'სანდოობის ბეჯები', visible: true },
      { id: 'faq', name: 'ხშირად დასმული კითხვები', visible: true }
    ];
  });

  // App UI states
  const [activeTab, setActiveTab] = useState('store'); 
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('categories');

  // Front filtering
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Wishlist
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', notes: '' });

  // Users & Auth
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('geostore_users_list');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '+995 599 11 22 33', password: '123', date: '2026-10-15' }
    ];
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });

  // Orders
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('geostore_orders');
    return saved ? JSON.parse(saved) : [
      {
        id: 'ORD-9821',
        date: new Date().toLocaleDateString('ka-GE'),
        customerName: 'გიორგი ბერიძე',
        phone: '599 12 34 56',
        address: 'თბილისი, ჭავჭავაძის გამზ. 15',
        userEmail: 'giorgi@gmail.com',
        items: [{ id: 1, name: 'iPhone 15 Pro Max', price: 3899, quantity: 1 }],
        totalGEL: 3899,
        status: 'ახალი',
        courier: 'არ არის დანიშნული'
      }
    ];
  });
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null);

  // Chat Widget
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?', time: '12:00', isAdmin: false }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [adminReplyText, setAdminReplyText] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Sync LocalStorage
  useEffect(() => localStorage.setItem('geostore_cats', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('geostore_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('geostore_banners', JSON.stringify(banners)), [banners]);
  useEffect(() => localStorage.setItem('geostore_promos', JSON.stringify(promoSlots)), [promoSlots]);
  useEffect(() => localStorage.setItem('geostore_coupons', JSON.stringify(coupons)), [coupons]);
  useEffect(() => localStorage.setItem('geostore_sections', JSON.stringify(sections)), [sections]);
  useEffect(() => localStorage.setItem('geostore_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('geostore_users_list', JSON.stringify(usersList)), [usersList]);
  useEffect(() => localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)), [currentUser]);

  // Format Price
  const formatPrice = (priceInGEL) => {
    if (currency === 'USD') {
      return `$${(priceInGEL / usdRate).toFixed(2)}`;
    }
    return `${priceInGEL.toLocaleString('ka-GE')} ₾`;
  };

  const cartSubtotalGEL = useMemo(() => cart.reduce((acc, item) => acc + (item.priceGEL * item.quantity), 0), [cart]);
  const discountAmountGEL = useMemo(() => appliedCoupon ? (cartSubtotalGEL * appliedCoupon.discountPercent) / 100 : 0, [cartSubtotalGEL, appliedCoupon]);
  const cartTotalGEL = cartSubtotalGEL - discountAmountGEL;

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
    showToast(`🛒 "${product.name}" დაემატა კალათაში!`);
  };

  const updateCartQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
    showToast('წაიშალა კალათიდან');
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast('წაიშალა სურვილების სიიდან');
        return prev.filter(item => item.id !== product.id);
      } else {
        showToast('❤️ დაემატა სურვილების სიაში!');
        return [...prev, product];
      }
    });
  };

  const applyCouponCode = () => {
    const found = coupons.find(c => c.code.toUpperCase() === couponInput.trim().toUpperCase());
    if (found) {
      setAppliedCoupon(found);
      showToast(`🎉 პრომო კოდი ${found.code} გააქტიურდა (-${found.discountPercent}%)!`);
    } else {
      showToast('❌ არასწორი პრომო კოდი');
    }
    setCouponInput('');
  };

  const handlePlaceOrder = (itemsToOrder, totalVal, isExpress = false) => {
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      showToast('⚠️ გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('ka-GE'),
      customerName: checkoutForm.name,
      phone: checkoutForm.phone,
      address: checkoutForm.address,
      userEmail: currentUser ? currentUser.email : 'guest',
      items: itemsToOrder.map(i => ({ id: i.id, name: i.name, price: i.priceGEL, quantity: i.quantity || 1 })),
      totalGEL: totalVal,
      status: 'ახალი',
      courier: 'არ არის დანიშნული'
    };

    setProducts(prev => prev.map(p => {
      const ordItem = itemsToOrder.find(i => i.id === p.id);
      if (ordItem) {
        return { ...p, stock: Math.max(0, p.stock - (ordItem.quantity || 1)) };
      }
      return p;
    }));

    setOrders([newOrder, ...orders]);
    setIsCheckoutOpen(false);
    setQuickBuyProduct(null);
    if (!isExpress) setCart([]);
    setAppliedCoupon(null);
    showToast('✅ შეკვეთა წარმატებით გაფორმდა!');
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return;

    if (authMode === 'register') {
      if (!authForm.name || !authForm.phone) {
        alert('გთხოვთ შეავსოთ ყველა ველი!');
        return;
      }
      const exists = usersList.some(u => u.email === authForm.email);
      if (exists) {
        alert('ამ ელ-ფოსტით მომხმარებელი უკვე არსებობს!');
        return;
      }
      const newUser = {
        id: Date.now(),
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        password: authForm.password,
        date: new Date().toISOString().slice(0, 10)
      };
      setUsersList([newUser, ...usersList]);
      setCurrentUser(newUser);
      setIsAuthOpen(false);
      setAuthForm({ name: '', phone: '', email: '', password: '' });
      showToast('🎉 რეგისტრაცია წარმატებულია!');
    } else {
      const found = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (found) {
        setCurrentUser(found);
        setIsAuthOpen(false);
        setAuthForm({ name: '', phone: '', email: '', password: '' });
        showToast('🔑 ავტორიზაცია წარმატებულია!');
      } else {
        alert('არასწორი ელ-ფოსტა ან პაროლი!');
      }
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminLoginForm.username === adminAuth.username && adminLoginForm.password === adminAuth.password) {
      setAdminLoggedIn(true);
      setAdminError('');
      setAdminLoginForm({ username: '', password: '' });
      showToast('🔓 ადმინ პანელში შესვლა წარმატებულია!');
    } else {
      setAdminError('არასწორი მომხმარებლის სახელი ან პაროლი!');
    }
  };

  const handleChangeAdminPassword = (e) => {
    e.preventDefault();
    if (adminSecurityForm.oldPassword !== adminAuth.password) {
      alert('ძველი პაროლი არასწორია!');
      return;
    }
    if (!adminSecurityForm.newPassword || adminSecurityForm.newPassword.length < 3) {
      alert('ახალი პაროლი ძალიან მოკლეა!');
      return;
    }
    const updated = {
      username: adminSecurityForm.username || adminAuth.username,
      password: adminSecurityForm.newPassword
    };
    setAdminAuth(updated);
    setAdminSecurityForm({ username: updated.username, oldPassword: '', newPassword: '' });
    showToast('🔑 ადმინის მონაცემები წარმატებით შეიცვალა!');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ყველა' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Total GEL', 'Status'];
    const rows = orders.map(o => [o.id, o.date, `"${o.customerName}"`, o.phone, o.totalGEL, o.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `GEOSTORE_Orders.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-24 md:pb-0 selection:bg-amber-500 selection:text-slate-900">
      
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-2xl shadow-2xl border border-amber-300 animate-bounce flex items-center gap-2 text-xs md:text-sm">
          <Sparkles className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white text-[10px] md:text-xs py-1.5 px-3 font-medium flex justify-between items-center">
          <div className="flex items-center gap-1.5 truncate">
            <span>🇬🇪</span>
            <span className="truncate">GEOSTORE - N1 ტექნიკის მაღაზია</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')}
              className="bg-slate-950/40 hover:bg-slate-950/70 px-2 py-0.5 rounded-full border border-white/20 transition flex items-center gap-1 font-bold text-amber-300 text-[10px]"
            >
              <span>{currency === 'GEL' ? '₾ GEL' : '$ USD'}</span>
            </button>
          </div>
        </div>

        {/* Main Bar */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-lg md:text-xl text-slate-950">
              G
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
              GEOSTORE
            </span>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <input
              type="text"
              placeholder="ძებნა: iPhone, MacBook, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          {/* Header Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('wishlist')}
              className="p-2.5 rounded-2xl border relative bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
            >
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-800 border border-slate-700 text-amber-300">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200 hover:border-amber-500">
                <User className="w-4 h-4" /> შესვლა
              </button>
            )}

            <button 
              onClick={() => setActiveTab('cart')}
              className="p-2.5 rounded-2xl border relative bg-slate-800/60 border-slate-700/60 text-slate-300"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`p-2.5 rounded-2xl border transition flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">ადმინი</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="ძებნა: iPhone, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {activeTab === 'store' && (
          <div className="space-y-8">
            {sections.filter(s => s.visible).map(sec => {
              if (sec.id === 'hero') {
                return (
                  <div key={sec.id} className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                      <div className="p-6 md:p-12 z-10 space-y-3">
                        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
                          🔥 სპეც შეთავაზება
                        </span>
                        <h1 className="text-2xl md:text-5xl font-black text-white leading-tight">
                          {banners[0]?.title || 'ინოვაციური ტექნიკა საუკეთესო ფასად'}
                        </h1>
                        <p className="text-slate-400 text-xs md:text-base">
                          {banners[0]?.subtitle || 'ოფიციალური გარანტია, სწრაფი მიწოდება და 0% განვადება.'}
                        </p>
                        <a href="#products" className="inline-flex items-center gap-2 bg-amber-500 text-slate-950 font-extrabold px-5 py-2.5 rounded-2xl shadow-lg transition text-xs md:text-sm">
                          <span>{banners[0]?.buttonText || 'შეიძინე ახლავე'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="relative h-48 md:h-96 w-full">
                        <img src={banners[0]?.image} alt="Hero" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'promos') {
                return (
                  <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {promoSlots.map(slot => (
                      <div key={slot.id} className={`rounded-2xl p-5 bg-gradient-to-br ${slot.bgGradient} text-white shadow-xl flex flex-col justify-between`}>
                        <span className="bg-black/30 backdrop-blur-md self-start text-[10px] font-black px-2.5 py-0.5 rounded-full">{slot.tag}</span>
                        <h3 className="text-lg font-bold mt-6">{slot.title}</h3>
                      </div>
                    ))}
                  </div>
                );
              }

              if (sec.id === 'ticker') {
                return (
                  <div key={sec.id} className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-white text-xs md:text-base">⚡ FLASH SALE - დღის ცხელი შეთავაზება</h4>
                        <p className="text-[10px] md:text-xs text-slate-400">ფასდაკლებები მთავრდება 24 საათში!</p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'categories') {
                return (
                  <div key={sec.id} className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <Grid className="w-5 h-5 text-amber-400" /> კატეგორიები
                    </h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-2xl font-semibold text-xs whitespace-nowrap transition ${
                            selectedCategory === cat ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (sec.id === 'products') {
                return (
                  <div key={sec.id} id="products" className="space-y-6">
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-amber-400" /> პროდუქციის კატალოგი
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map(prod => {
                        const isWish = wishlist.some(w => w.id === prod.id);
                        return (
                          <div key={prod.id} className="bg-slate-800/50 border border-slate-700/60 rounded-3xl p-4 flex flex-col justify-between group">
                            <div>
                              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 mb-3 p-4 flex items-center justify-center">
                                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition" />
                                <button onClick={() => toggleWishlist(prod)} className="absolute top-3 right-3 p-2 bg-slate-950/60 rounded-full text-white">
                                  <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                                </button>
                              </div>
                              <span className="text-[10px] text-amber-400 font-semibold uppercase">{prod.category}</span>
                              <h3 className="font-bold text-white text-sm md:text-base mb-2 line-clamp-2">{prod.name}</h3>
                            </div>
                            <div className="pt-3 border-t border-slate-700/50 space-y-3">
                              <div className="text-lg md:text-xl font-black text-amber-400">{formatPrice(prod.priceGEL)}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => addToCart(prod)} className="py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-slate-950">
                                  კალათაში
                                </button>
                                <button onClick={() => { setQuickBuyProduct(prod); setIsCheckoutOpen(true); }} className="py-2 rounded-xl text-xs font-extrabold bg-slate-900 border border-amber-500/40 text-amber-300">
                                  1-Click ყიდვა
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (sec.id === 'badges') {
                return (
                  <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                      <Truck className="w-5 h-5 text-amber-400" />
                      <div><h4 className="font-bold text-white text-xs">სწრაფი მიწოდება</h4><p className="text-[10px] text-slate-400">მთელ საქართველოში</p></div>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <div><h4 className="font-bold text-white text-xs">1 წლიანი გარანტია</h4><p className="text-[10px] text-slate-400">ოფიციალური სერვისი</p></div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* WISHLIST */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-white">❤️ სურვილების სია ({wishlist.length})</h2>
            {wishlist.length === 0 ? <p className="text-slate-500 text-xs">სია ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map(prod => (
                  <div key={prod.id} className="bg-slate-800 p-4 rounded-2xl flex items-center gap-4">
                    <img src={prod.image} alt="" className="w-14 h-14 object-contain bg-slate-900 rounded" />
                    <div>
                      <h4 className="font-bold text-xs">{prod.name}</h4>
                      <p className="text-amber-400 font-bold text-xs">{formatPrice(prod.priceGEL)}</p>
                      <button onClick={() => addToCart(prod)} className="mt-2 bg-amber-500 text-slate-950 px-3 py-1 rounded text-xs font-bold">კალათაში</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700 space-y-3 text-xs md:text-sm">
            <h2 className="text-xl font-black text-white">მომხმარებლის პროფილი</h2>
            <p><b>სახელი:</b> {currentUser.name}</p>
            <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p><b>ტელეფონი:</b> {currentUser.phone}</p>
            <button onClick={() => { setCurrentUser(null); setActiveTab('store'); }} className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold mt-2">გამოსვლა</button>
          </div>
        )}

        {/* CART */}
        {activeTab === 'cart' && (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-white">კალათა</h2>
            {cart.length === 0 ? <p className="text-slate-500 text-xs">კალათა ცარიელია.</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-xs md:text-sm">{item.name}</h4>
                        <p className="text-amber-400">{formatPrice(item.priceGEL)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 py-0.5 bg-slate-700 rounded">-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 py-0.5 bg-slate-700 rounded">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="text-rose-400 ml-3">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800 p-5 rounded-3xl h-fit space-y-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="პრომო კოდი" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="bg-slate-900 px-3 py-2 rounded-xl text-xs flex-1 uppercase text-white" />
                    <button onClick={applyCouponCode} className="bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                  </div>
                  <div className="text-lg md:text-xl font-black text-amber-400">სულ: {formatPrice(cartTotalGEL)}</div>
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-2xl text-xs">შეკვეთა</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!adminLoggedIn ? (
              <div className="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 space-y-4 text-center">
                <Shield className="w-10 h-10 text-amber-400 mx-auto" />
                <h2 className="text-lg font-bold">ადმინისტრაცია (admin / admin123)</h2>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <input type="text" placeholder="მომხმარებლის სახელი" value={adminLoginForm.username} onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white" />
                  <input type="password" placeholder="პაროლი" value={adminLoginForm.password} onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white" />
                  {adminError && <p className="text-rose-400 text-xs">{adminError}</p>}
                  <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
                  {['categories', 'products', 'orders', 'security', 'chat'].map(sub => (
                    <button key={sub} onClick={() => setAdminActiveSubTab(sub)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${adminActiveSubTab === sub ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                      {sub.toUpperCase()}
                    </button>
                  ))}
                  <button onClick={() => setAdminLoggedIn(false)} className="bg-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold ml-auto shrink-0">გასვლა</button>
                </div>

                {/* SECURITY / PASSWORD CHANGE */}
                {adminActiveSubTab === 'security' && (
                  <div className="bg-slate-800 p-6 rounded-3xl max-w-md space-y-4">
                    <h3 className="font-bold text-base md:text-lg flex items-center gap-2"><Key className="w-5 h-5 text-amber-400"/> ადმინის პაროლის შეცვლა</h3>
                    <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                      <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white" />
                      <input type="password" required placeholder="ძველი პაროლი" value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white" />
                      <input type="password" required placeholder="ახალი პაროლი" value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white" />
                      <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">განახლება</button>
                    </form>
                  </div>
                )}

                {/* CATEGORIES MANAGEMENT */}
                {adminActiveSubTab === 'categories' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg">კატეგორიები</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const name = e.target.cat.value.trim();
                      if(name && !categories.includes(name)) {
                        setCategories([...categories, name]);
                        e.target.reset();
                        showToast('დაემატა');
                      }
                    }} className="flex gap-2">
                      <input type="text" name="cat" placeholder="ახალი კატეგორია..." className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs flex-1 text-white" />
                      <button type="submit" className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(c => (
                        <span key={c} className="bg-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2">
                          {c} {c !== 'ყველა' && <button onClick={() => setCategories(categories.filter(x => x !== c))} className="text-rose-400">×</button>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRODUCTS */}
                {adminActiveSubTab === 'products' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg">პროდუქტები ({products.length})</h3>
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="bg-slate-900 p-3 rounded-xl flex justify-between items-center text-xs">
                          <span className="truncate pr-2">{p.name} - <b>{p.priceGEL} ₾</b></span>
                          <button onClick={() => setProducts(products.filter(x => x.id !== p.id))} className="text-rose-400 font-bold shrink-0">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ORDERS */}
                {adminActiveSubTab === 'orders' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <button onClick={exportOrdersCSV} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl">CSV ექსპორტი</button>
                    <div className="space-y-2">
                      {orders.map(o => (
                        <div key={o.id} className="bg-slate-900 p-3 rounded-xl flex justify-between items-center text-xs">
                          <span className="truncate pr-2">#{o.id} - {o.customerName} ({o.totalGEL} ₾)</span>
                          <button onClick={() => setActiveInvoiceOrder(o)} className="bg-slate-700 px-3 py-1 rounded text-white font-bold shrink-0">ინვოისი</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CHAT */}
                {adminActiveSubTab === 'chat' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg">მომხმარებელთა ჩათი</h3>
                    <div className="bg-slate-900 p-4 rounded-2xl h-48 overflow-y-auto space-y-2 text-xs">
                      {chatMessages.map(m => (
                        <div key={m.id} className={m.isAdmin ? 'text-amber-400 text-right' : 'text-white'}>
                          <b>{m.sender}:</b> {m.text}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if(!adminReplyText.trim()) return;
                      setChatMessages([...chatMessages, { id: Date.now(), sender: 'ადმინი', text: adminReplyText, isAdmin: true }]);
                      setAdminReplyText('');
                    }} className="flex gap-2">
                      <input type="text" placeholder="უპასუხეთ..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs flex-1 text-white" />
                      <button type="submit" className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">გაგზავნა</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 relative space-y-4">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <div className="flex gap-4 border-b border-slate-800 pb-2 font-bold text-sm">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-amber-400' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-amber-400' : 'text-slate-500'}>რეგისტრაცია</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-lg font-bold text-white">შეკვეთის გაფორმება</h3>
            <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(quickBuyProduct ? [quickBuyProduct] : cart, quickBuyProduct ? quickBuyProduct.priceGEL : cartTotalGEL, !!quickBuyProduct); }} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
              <input type="tel" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white" />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold">ინვოისი #{activeInvoiceOrder.id}</h3>
              <button onClick={() => setActiveInvoiceOrder(null)}>✕</button>
            </div>
            <p className="text-xs"><b>მყიდველი:</b> {activeInvoiceOrder.customerName} ({activeInvoiceOrder.phone})</p>
            <p className="text-xs"><b>მისამართი:</b> {activeInvoiceOrder.address}</p>
            <div className="text-sm font-bold text-amber-600">სულ: {activeInvoiceOrder.totalGEL} ₾</div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">ბეჭდვა</button>
          </div>
        </div>
      )}

      {/* LIVE CHAT WIDGET */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        {!isChatOpen ? (
          <button onClick={() => setIsChatOpen(true)} className="bg-amber-500 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-72 sm:w-80 md:w-96 overflow-hidden flex flex-col h-[380px]">
            <div className="bg-amber-500 p-3.5 text-slate-950 font-bold flex justify-between items-center text-xs">
              <span>მხარდაჭერა</span>
              <button onClick={() => setIsChatOpen(false)}>✕</button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-slate-950">
              {chatMessages.map(m => (
                <div key={m.id} className={m.isAdmin ? 'text-amber-400 text-right' : 'text-white'}>
                  <b>{m.sender}:</b> {m.text}
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
              <input type="text" placeholder="ტექსტი..." value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-slate-800 rounded-xl px-3 py-1.5 text-xs text-white" />
              <button onClick={() => { if(!chatInput.trim()) return; setChatMessages([...chatMessages, { id: Date.now(), sender: currentUser ? currentUser.name : 'სტუმარი', text: chatInput, isAdmin: false }]); setChatInput(''); }} className="bg-amber-500 text-slate-950 p-2 rounded-xl"><Send className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden z-40 py-2.5 px-4 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'store' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <Grid className="w-5 h-5" />
          <span>მაღაზია</span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${activeTab === 'wishlist' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <Heart className="w-5 h-5" />
          <span>სურვილები</span>
          {wishlist.length > 0 && (
            <span className="absolute -top-1 right-2 bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {wishlist.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${activeTab === 'cart' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>კალათა</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 right-2 bg-amber-500 text-slate-950 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab(currentUser ? 'profile' : 'admin')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'admin' || activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <Settings className="w-5 h-5" />
          <span>{currentUser ? 'პროფილი' : 'ადმინი'}</span>
        </button>
      </nav>

    </div>
  );
}
