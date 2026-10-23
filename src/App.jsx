import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut
} from 'lucide-react';

// --- INITIAL MOCK DATA ---
const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'სმარტფონები', icon: '📱' },
  { id: 'cat-2', name: 'ლეპტოპები', icon: '💻' },
  { id: 'cat-3', name: 'აქსესუარები', icon: '🎧' },
  { id: 'cat-4', name: 'ჭკვიანი საათები', icon: '⌚' },
  { id: 'cat-5', name: 'ტელევიზორები', icon: '📺' }
];

const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
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
    id: 'prod-2',
    sku: 'GEO-MBA M3',
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
    id: 'prod-3',
    sku: 'GEO-APMX',
    name: 'AirPods Max Space Gray',
    category: 'აქსესუარები',
    priceGEL: 1699,
    oldPriceGEL: 1899,
    stock: 2, // Low stock badge
    rating: 4.7,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600',
    description: 'მაღალი კლასის უსადენო ყურსასმენები აქტიური ხმაურის დახშობითა და სივრცული აუდიოთი.',
    isHot: false,
    discountPercent: 11
  },
  {
    id: 'prod-4',
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
  },
  {
    id: 'prod-5',
    sku: 'GEO-SAMSUNG-S24U',
    name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    category: 'სმარტფონები',
    priceGEL: 3599,
    oldPriceGEL: 3999,
    stock: 6,
    rating: 4.8,
    reviewsCount: 20,
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=600',
    description: 'Galaxy AI ტექნოლოგია, ჩაშენებული S Pen და 200MP კამერა წარმოუდგენელი დეტალიზაციისთვის.',
    isHot: false,
    discountPercent: 10
  }
];

const INITIAL_BANNERS = [
  {
    id: 'b1',
    title: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში',
    subtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ Apple-ის პროდუქციაზე!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200',
    buttonText: 'შეიძინე ახლავე',
    link: '#products'
  },
  {
    id: 'b2',
    title: 'ოფიციალური გარანტია 1 წელი',
    subtitle: 'უფასო და სწრაფი მიწოდება მთელი საქართველოს მასშტაბით',
    image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&q=80&w=1200',
    buttonText: 'კატალოგის ნახვა',
    link: '#products'
  }
];

const INITIAL_PROMO_SLOTS = [
  { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-amber-500 to-rose-500', link: '#products' },
  { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-blue-600 to-indigo-700', link: '#products' },
  { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-emerald-500 to-teal-700', link: '#products' }
];

const INITIAL_COUPONS = [
  { code: 'GEO10', discountPercent: 10 },
  { code: 'SPRING20', discountPercent: 20 },
  { code: 'WELCOME5', discountPercent: 5 }
];

export default function App() {
  // --- STATES ---
  const [currency, setCurrency] = useState('GEL'); // GEL or USD
  const usdRate = 2.70; // 1 USD = 2.70 GEL

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

  // Page builder order & visibility
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
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'wishlist' | 'cart' | 'admin'
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('categories'); // categories, products, orders, banners, builder, crm, coupons

  // Front filtering & search
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductQuickView, setSelectedProductQuickView] = useState(null);

  // Cart & Wishlist & Quick Buy
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', notes: '' });

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
        items: [{ id: 'prod-1', name: 'iPhone 15 Pro Max', price: 3899, quantity: 1 }],
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
    { sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // CRM Users
  const [users, setUsers] = useState([
    { id: 'u1', name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '599123456', ordersCount: 2, totalSpentGEL: 5400 },
    { id: 'u2', name: 'ნინო კაპანაძე', email: 'nino@yahoo.com', phone: '577987654', ordersCount: 1, totalSpentGEL: 1699 }
  ]);

  // Alert toast message
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Sync to LocalStorage
  useEffect(() => localStorage.setItem('geostore_cats', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('geostore_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('geostore_banners', JSON.stringify(banners)), [banners]);
  useEffect(() => localStorage.setItem('geostore_promos', JSON.stringify(promoSlots)), [promoSlots]);
  useEffect(() => localStorage.setItem('geostore_coupons', JSON.stringify(coupons)), [coupons]);
  useEffect(() => localStorage.setItem('geostore_sections', JSON.stringify(sections)), [sections]);
  useEffect(() => localStorage.setItem('geostore_orders', JSON.stringify(orders)), [orders]);

  // --- HELPER FORMATTER ---
  const formatPrice = (priceInGEL) => {
    if (currency === 'USD') {
      const usdVal = (priceInGEL / usdRate).toFixed(2);
      return `$${usdVal}`;
    }
    return `${priceInGEL.toLocaleString('ka-GE')} ₾`;
  };

  // --- CART CALCULATIONS ---
  const cartSubtotalGEL = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.priceGEL * item.quantity), 0);
  }, [cart]);

  const discountAmountGEL = useMemo(() => {
    if (!appliedCoupon) return 0;
    return (cartSubtotalGEL * appliedCoupon.discountPercent) / 100;
  }, [cartSubtotalGEL, appliedCoupon]);

  const cartTotalGEL = cartSubtotalGEL - discountAmountGEL;

  // --- CART FUNCTIONS ---
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

  // --- ORDER SUBMISSION ---
  const handlePlaceOrder = (itemsToOrder, totalVal, isExpress = false) => {
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      showToast('⚠️ გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
      return;
    }

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('ka-GE'),
      customerName: checkoutForm.name,
      phone: checkoutForm.phone,
      address: checkoutForm.address,
      notes: checkoutForm.notes || (isExpress ? '1-Click სწრაფი შეკვეთა' : ''),
      items: itemsToOrder.map(i => ({ id: i.id, name: i.name, price: i.priceGEL, quantity: i.quantity || 1 })),
      totalGEL: totalVal,
      status: 'ახალი',
      courier: 'არ არის დანიშნული'
    };

    // Reduce stock dynamic
    setProducts(prevProducts => prevProducts.map(p => {
      const orderedItem = itemsToOrder.find(item => item.id === p.id);
      if (orderedItem) {
        const newStock = Math.max(0, p.stock - (orderedItem.quantity || 1));
        return { ...p, stock: newStock };
      }
      return p;
    }));

    setOrders([newOrder, ...orders]);
    setIsCheckoutOpen(false);
    setQuickBuyProduct(null);
    if (!isExpress) setCart([]);
    setAppliedCoupon(null);

    showToast('✅ შეკვეთა წარმატებით გაფორმდა! მადლობას გიხდით.');
  };

  // --- ADMIN AUTH ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPinInput === '1234') {
      setAdminLoggedIn(true);
      setAdminPinInput('');
      showToast('🔓 ადმინ პანელში შესვლა წარმატებულია!');
    } else {
      showToast('❌ არასწორი PIN კოდი!');
    }
  };

  // --- CHAT MESSAGE HANDLING ---
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'გმადლობთ დაკავშირებისთვის! ოპერატორი მალე გიპასუხებთ.' }
      ]);
    }, 1000);
  };

  // --- FILTERED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ყველა' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // --- CSV EXPORT FOR ORDERS ---
  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Total GEL', 'Status', 'Courier'];
    const rows = orders.map(o => [
      o.id,
      o.date,
      `"${o.customerName}"`,
      `"${o.phone}"`,
      `"${o.address}"`,
      o.totalGEL,
      o.status,
      `"${o.courier}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEOSTORE_Orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-20 md:pb-0 selection:bg-amber-500 selection:text-slate-900">
      
      {/* FLOATING TOAST MESSAGES */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-amber-500 text-slate-950 font-bold px-6 py-3 rounded-2xl shadow-2xl border border-amber-300 animate-bounce flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {toastMessage}
        </div>
      )}

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white text-xs py-1.5 px-4 font-medium flex justify-between items-center shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-base">🇬🇪</span>
            <span>GEOSTORE - N1 ტექნიკის ონლაინ მაღაზია საქართველოში</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              <span>+995 (32) 2 100 200</span>
            </div>
            {/* Currency Switcher */}
            <button 
              onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')}
              className="bg-slate-950/40 hover:bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-white/20 transition flex items-center gap-1 font-bold text-amber-300"
            >
              <span>{currency === 'GEL' ? '₾ GEL' : '$ USD'}</span>
            </button>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-xl text-slate-950">
              G
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                GEOSTORE
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] tracking-widest text-amber-400/80 uppercase font-bold border border-amber-500/30 px-1.5 py-0.2 rounded">
                GEORGIA
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <input
              type="text"
              placeholder="ძებნა: iPhone, MacBook, SKU კოდით..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Wishlist Button */}
            <button 
              onClick={() => setActiveTab('wishlist')}
              className={`p-2.5 rounded-2xl border transition relative flex items-center gap-1.5 ${
                activeTab === 'wishlist' 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                  : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
              }`}
            >
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              <span className="hidden lg:inline text-sm font-medium">სურვილები</span>
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button 
              onClick={() => setActiveTab('cart')}
              className={`p-2.5 rounded-2xl border transition relative flex items-center gap-2 ${
                activeTab === 'cart' 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                  : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
              }`}
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs text-slate-400">კალათა</span>
                <span className="text-xs font-bold text-amber-400">{formatPrice(cartTotalGEL)}</span>
              </div>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            {/* Admin Toggle */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`p-2.5 rounded-2xl border transition flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-amber-500/50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">ადმინ პანელი</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="ძებნა: iPhone, MacBook, SKU კოდით..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT SWITCHER --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ================= STORE TAB ================= */}
        {activeTab === 'store' && (
          <div className="space-y-10">
            
            {/* Dynamic Render according to Sections ordering & visibility */}
            {sections.filter(s => s.visible).map(sec => {
              
              // HERO BANNER SECTION
              if (sec.id === 'hero') {
                return (
                  <div key={sec.id} className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                      <div className="p-8 sm:p-12 z-10 space-y-4">
                        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          🔥 სპეც შეთავაზება
                        </span>
                        <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                          {banners[0]?.title || 'ინოვაციური ტექნიკა საუკეთესო ფასად'}
                        </h1>
                        <p className="text-slate-400 text-sm sm:text-base">
                          {banners[0]?.subtitle || 'ოფიციალური გარანტია, სწრაფი მიწოდება და 0% განვადება.'}
                        </p>
                        <div className="pt-2">
                          <a 
                            href="#products"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition transform hover:-translate-y-0.5"
                          >
                            <span>{banners[0]?.buttonText || 'შეიძინე ახლავე'}</span>
                            <ArrowRight className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                      <div className="relative h-64 md:h-96 w-full">
                        <img 
                          src={banners[0]?.image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200'} 
                          alt="Hero Promo" 
                          className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950 via-transparent to-transparent"></div>
                      </div>
                    </div>
                  </div>
                );
              }

              // PROMO SLOTS SECTION
              if (sec.id === 'promos') {
                return (
                  <div key={sec.id} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {promoSlots.map(slot => (
                      <div 
                        key={slot.id} 
                        className={`rounded-2xl p-6 bg-gradient-to-br ${slot.bgGradient} text-white shadow-xl relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition`}
                      >
                        <span className="bg-black/30 backdrop-blur-md self-start text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">
                          {slot.tag}
                        </span>
                        <div className="mt-8">
                          <h3 className="text-xl font-bold">{slot.title}</h3>
                          <span className="text-xs text-white/80 underline mt-2 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                            იხილეთ მეტი &rarr;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // FLASH SALE TICKER SECTION
              if (sec.id === 'ticker') {
                return (
                  <div key={sec.id} className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center animate-pulse">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base">⚡ FLASH SALE - დღის ცხელი შეთავაზება</h4>
                        <p className="text-xs text-slate-400">ფასდაკლებები მთავრდება 24 საათში! იჩქარეთ მარაგები შეზღუდულია</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-amber-400 font-mono font-bold text-sm">
                      <span>08სთ</span> : <span>42წთ</span> : <span>19წმ</span>
                    </div>
                  </div>
                );
              }

              // CATEGORIES SECTION
              if (sec.id === 'categories') {
                return (
                  <div key={sec.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <Grid className="w-6 h-6 text-amber-400" />
                        კატეგორიები
                      </h2>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      <button
                        onClick={() => setSelectedCategory('ყველა')}
                        className={`px-5 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition flex items-center gap-2 ${
                          selectedCategory === 'ყველა'
                            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <span>✨</span> ყველა პროდუქტი
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`px-5 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition flex items-center gap-2 ${
                            selectedCategory === cat.name
                              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          <span>{cat.icon || '📦'}</span> {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // PRODUCTS CATALOGUE GRID SECTION
              if (sec.id === 'products') {
                return (
                  <div key={sec.id} id="products" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-amber-400" />
                        {selectedCategory === 'ყველა' ? 'პროდუქციის კატალოგი' : selectedCategory}
                      </h2>
                      <span className="text-xs text-slate-400 font-medium">
                        ნაპოვნია: {filteredProducts.length} ნივთი
                      </span>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div className="bg-slate-800/30 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-300">პროდუქცია ვერ მოიძებნა</h3>
                        <p className="text-slate-500 text-sm">სცადეთ სხვა კატეგორია ან საძიებო სიტყვა</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(prod => {
                          const isWish = wishlist.some(w => w.id === prod.id);
                          const isLowStock = prod.stock > 0 && prod.stock <= 3;
                          const isOutOfStock = prod.stock === 0;

                          return (
                            <div 
                              key={prod.id} 
                              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 rounded-3xl p-4 transition-all duration-300 flex flex-col justify-between group shadow-xl hover:shadow-2xl relative"
                            >
                              <div>
                                {/* Product Image & Badges Container */}
                                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 mb-4 flex items-center justify-center p-4">
                                  <img 
                                    src={prod.image} 
                                    alt={prod.name} 
                                    className="w-full h-full object-contain group-hover:scale-105 transition duration-500"
                                  />
                                  
                                  {/* Wishlist Toggle Button */}
                                  <button
                                    onClick={() => toggleWishlist(prod)}
                                    className="absolute top-3 right-3 bg-slate-950/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:text-rose-500 transition"
                                  >
                                    <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                                  </button>

                                  {/* Quick View Button */}
                                  <button
                                    onClick={() => setSelectedProductQuickView(prod)}
                                    className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition duration-300 bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-bold text-white px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> სწრაფი ნახვა
                                  </button>

                                  {/* Badges */}
                                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                                    {prod.discountPercent && (
                                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow">
                                        -{prod.discountPercent}%
                                      </span>
                                    )}
                                    {isLowStock && (
                                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-lg shadow animate-pulse">
                                        ⚠️ ცოტაა მარაგში ({prod.stock})
                                      </span>
                                    )}
                                    {isOutOfStock && (
                                      <span className="bg-slate-700 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-lg shadow">
                                        ამოყიდულია
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Category & SKU */}
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                  <span className="font-semibold text-amber-400">{prod.category}</span>
                                  <span className="font-mono text-[10px] text-slate-500">SKU: {prod.sku}</span>
                                </div>

                                {/* Product Name */}
                                <h3 className="font-bold text-slate-100 text-base line-clamp-2 mb-2 group-hover:text-amber-300 transition">
                                  {prod.name}
                                </h3>

                                {/* Rating */}
                                <div className="flex items-center gap-1 text-xs mb-3">
                                  <div className="flex text-amber-400">
                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                  </div>
                                  <span className="font-bold text-slate-200">{prod.rating}</span>
                                  <span className="text-slate-500">({prod.reviewsCount} შეფასება)</span>
                                </div>
                              </div>

                              {/* Pricing & Add To Cart Actions */}
                              <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <div className="text-xl font-black text-amber-400">
                                      {formatPrice(prod.priceGEL)}
                                    </div>
                                    {prod.oldPriceGEL && (
                                      <div className="text-xs text-slate-500 line-through">
                                        {formatPrice(prod.oldPriceGEL)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    disabled={isOutOfStock}
                                    onClick={() => addToCart(prod)}
                                    className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                                      isOutOfStock 
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                                    }`}
                                  >
                                    <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                                  </button>

                                  <button
                                    disabled={isOutOfStock}
                                    onClick={() => {
                                      setQuickBuyProduct(prod);
                                      setIsCheckoutOpen(true);
                                    }}
                                    className={`py-2.5 rounded-xl text-xs font-extrabold transition border ${
                                      isOutOfStock
                                        ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                                        : 'bg-slate-900 border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                                    }`}
                                  >
                                    1-Click ყიდვა
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // TRUST BADGES SECTION
              if (sec.id === 'badges') {
                return (
                  <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">სწრაფი მიწოდება</h4>
                        <p className="text-xs text-slate-400">მთელი საქართველოს მასშტაბით</p>
                      </div>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">1 წლიანი გარანტია</h4>
                        <p className="text-xs text-slate-400">ოფიციალური სერვისცენტრები</p>
                      </div>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">უსაფრთხო გადახდა</h4>
                        <p className="text-xs text-slate-400">ბარათით ან ნაღდი ანგარიშსწორებით</p>
                      </div>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">24/7 მხარდაჭერა</h4>
                        <p className="text-xs text-slate-400">ლაივ ჩათი და კონსულტაცია</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // FAQ SECTION
              if (sec.id === 'faq') {
                return (
                  <div key={sec.id} className="bg-slate-800/30 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
                    <h2 className="text-2xl font-black text-white tracking-tight">ხშირად დასმული კითხვები</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="font-bold text-amber-400 text-sm">როგორ ხდება მიწოდება?</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          თბილისის მასშტაბით მიწოდება ხორციელდება იმავე დღეს, ხოლო რეგიონებში 1-2 სამუშაო დღის განმავლობაში კურიერის მეშვეობით.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-amber-400 text-sm">მოქმედებს თუ არა განვადება?</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          დიახ, თქვენ შეგიძლიათ ისარგებლოთ საქართველოს ბანკის, თიბისის ან კრედო ბანკის 0%-იანი ონლაინ განვადებით.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}

          </div>
        )}

        {/* ================= WISHLIST TAB ================= */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                ჩემი სურვილების სია ({wishlist.length})
              </h2>
              <button 
                onClick={() => setActiveTab('store')} 
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                &larr; მაღაზიაში დაბრუნება
              </button>
            </div>

            {wishlist.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/20 rounded-3xl border border-slate-800 space-y-3">
                <Heart className="w-16 h-16 text-slate-700 mx-auto" />
                <h3 className="text-lg font-bold text-slate-300">სურვილების სია ცარიელია</h3>
                <p className="text-xs text-slate-500">დააჭირეთ გულის ხატულას პროდუქტზე მის დასამატებლად</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(prod => (
                  <div key={prod.id} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex gap-4 items-center">
                    <img src={prod.image} alt={prod.name} className="w-20 h-20 object-contain rounded-xl bg-slate-900 p-2" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{prod.name}</h4>
                      <p className="text-amber-400 font-extrabold text-sm">{formatPrice(prod.priceGEL)}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => addToCart(prod)}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
                        >
                          კალათაში
                        </button>
                        <button
                          onClick={() => toggleWishlist(prod)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                        >
                          წაშლა
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= CART TAB ================= */}
        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-amber-400" />
                საყიდლების კალათა ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
              <button onClick={() => setActiveTab('store')} className="text-xs text-amber-400 hover:underline font-bold">
                &larr; ყიდვის გაგრძელება
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/20 rounded-3xl border border-slate-800 space-y-3">
                <ShoppingBag className="w-16 h-16 text-slate-700 mx-auto" />
                <h3 className="text-lg font-bold text-slate-300">კალათა ცარიელია</h3>
                <p className="text-xs text-slate-500">აირჩიეთ სასურველი პროდუქცია კატალოგიდან</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-contain rounded-xl bg-slate-900 p-2" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{item.name}</h4>
                          <span className="text-xs text-slate-400">კატეგორია: {item.category}</span>
                          <div className="text-amber-400 font-black text-base mt-1">
                            {formatPrice(item.priceGEL)}
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700">
                          <button 
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 font-bold"
                          >
                            -
                          </button>
                          <span className="px-3 py-1.5 text-sm font-bold text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <div className="font-black text-white text-base">
                            {formatPrice(item.priceGEL * item.quantity)}
                          </div>
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-rose-500 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Summary Box */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 space-y-6 h-fit sticky top-24">
                  <h3 className="font-extrabold text-white text-lg">შეკვეთის ჯამი</h3>

                  {/* Promo Code Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">პრომო კოდის გააქტიურება</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="მაგ: GEO10" 
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase flex-1"
                      />
                      <button 
                        onClick={applyCouponCode}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                      >
                        დოდება
                      </button>
                    </div>
                    {appliedCoupon && (
                      <span className="text-xs text-emerald-400 font-bold block">
                        ✓ გააქტიურებულია კოდი: {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
                      </span>
                    )}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 border-t border-slate-700/60 pt-4 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>ჯამური ღირებულება:</span>
                      <span className="font-bold text-white">{formatPrice(cartSubtotalGEL)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span>ფასდაკლება ({appliedCoupon.discountPercent}%):</span>
                        <span className="font-bold">-{formatPrice(discountAmountGEL)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>მიწოდების საფასური:</span>
                      <span className="font-bold text-emerald-400">უფასო</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-white border-t border-slate-700 pt-3">
                      <span>სულ გადასახდელი:</span>
                      <span className="text-amber-400">{formatPrice(cartTotalGEL)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuickBuyProduct(null);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-amber-500/20 text-center text-sm transition"
                  >
                    შეკვეთის გაფორმება &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN TAB & DASHBOARD ================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!adminLoggedIn ? (
              /* PIN Code Lock Screen */
              <div className="max-w-md mx-auto my-12 bg-slate-800/60 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">ადმინისტრატორის შესვლა</h2>
                  <p className="text-xs text-slate-400 mt-1">შეიყვანეთ PIN კოდი მართვის პანელზე წვდომისთვის (ნაგულისხმევი: 1234)</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="PIN კოდი"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    className="w-full text-center text-2xl tracking-widest font-mono bg-slate-900 border border-slate-700 rounded-2xl py-3 text-white focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20"
                  >
                    შესვლა
                  </button>
                </form>
              </div>
            ) : (
              /* Admin Control Panel Interface */
              <div className="space-y-6">
                
                {/* Admin Header Sub-Navigation */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-3 flex items-center justify-between overflow-x-auto gap-2">
                  <div className="flex gap-2">
                    {[
                      { id: 'categories', label: '1. კატეგორიები', icon: Grid },
                      { id: 'products', label: '2. პროდუქცია', icon: ShoppingBag },
                      { id: 'orders', label: '3. შეკვეთები', icon: FileText },
                      { id: 'banners', label: '4. ბანერები & პრომო', icon: Layers },
                      { id: 'builder', label: '5. Page Builder', icon: Sliders },
                      { id: 'crm', label: '6. CRM & მომხმარებლები', icon: User },
                      { id: 'coupons', label: '7. პრომო კოდები', icon: Percent },
                      { id: 'chat', label: '8. Live Chat', icon: MessageSquare }
                    ].map(tab => {
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setAdminActiveSubTab(tab.id)}
                          className={`px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition flex items-center gap-2 ${
                            adminActiveSubTab === tab.id
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => setAdminLoggedIn(false)}
                    className="p-2.5 text-slate-400 hover:text-rose-400 rounded-2xl bg-slate-900 hover:bg-slate-900/80 transition"
                    title="გამოსვლა"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* --- SUB-TAB 1: DYNAMIC CATEGORY MANAGEMENT --- */}
                {adminActiveSubTab === 'categories' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Category Form */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-amber-400" /> ახალი კატეგორიის დამატება
                      </h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target;
                        const catName = form.catName.value.trim();
                        const catIcon = form.catIcon.value.trim() || '📦';
                        if (!catName) return;

                        setCategories([...categories, { id: `cat-${Date.now()}`, name: catName, icon: catIcon }]);
                        form.reset();
                        showToast('✅ კატეგორია წარმატებით დაემატა!');
                      }} className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">კატეგორიის დასახელება</label>
                          <input type="text" name="catName" required placeholder="მაგ: გეიმინგი" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">Emoji / ხატულა</label>
                          <input type="text" name="catIcon" placeholder="🎮" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs">
                          დამატება
                        </button>
                      </form>
                    </div>

                    {/* Existing Categories List */}
                    <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg">არსებული კატეგორიები ({categories.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.map(cat => (
                          <div key={cat.id} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{cat.icon}</span>
                              <span className="font-bold text-white text-sm">{cat.name}</span>
                            </div>
                            <button
                              onClick={() => {
                                setCategories(categories.filter(c => c.id !== cat.id));
                                showToast('წაიშალა კატეგორია');
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 2: COMPLETE PRODUCT CATALOGUE & INVENTORY --- */}
                {adminActiveSubTab === 'products' && (
                  <div className="space-y-6">
                    {/* Add Product Form */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-amber-400" /> ახალი პროდუქტის დამატება
                      </h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target;
                        const newProd = {
                          id: `prod-${Date.now()}`,
                          sku: form.sku.value.trim() || `GEO-${Math.floor(Math.random() * 8999 + 1000)}`,
                          name: form.name.value.trim(),
                          category: form.category.value,
                          priceGEL: Number(form.priceGEL.value),
                          oldPriceGEL: form.oldPriceGEL.value ? Number(form.oldPriceGEL.value) : null,
                          stock: Number(form.stock.value),
                          rating: 5.0,
                          reviewsCount: 1,
                          image: form.image.value.trim() || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=600',
                          description: form.description.value.trim(),
                          discountPercent: form.discountPercent.value ? Number(form.discountPercent.value) : null
                        };

                        setProducts([newProd, ...products]);
                        form.reset();
                        showToast('✅ პროდუქტი დაემატა კატალოგში!');
                      }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">დასახელება</label>
                          <input type="text" name="name" required placeholder="Sony PlayStation 5" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">SKU კოდი</label>
                          <input type="text" name="sku" placeholder="GEO-PS5" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">კატეგორია</label>
                          <select name="category" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ფასი (₾ GEL)</label>
                          <input type="number" name="priceGEL" required placeholder="1899" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ძველი ფასი (₾ GEL)</label>
                          <input type="number" name="oldPriceGEL" placeholder="2199" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">მარაგი (რაოდენობა)</label>
                          <input type="number" name="stock" required placeholder="10" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ფასდაკლება %</label>
                          <input type="number" name="discountPercent" placeholder="15" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">სურათის URL</label>
                          <input type="url" name="image" placeholder="https://..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div className="sm:col-span-2 md:col-span-4">
                          <label className="text-xs font-bold text-slate-400 block mb-1">აღწერა</label>
                          <input type="text" name="description" placeholder="მოკლე აღწერა..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <div className="sm:col-span-2 md:col-span-4">
                          <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl transition text-xs">
                            პროდუქტის შენახვა
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Products Inventory Table */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4 overflow-x-auto">
                      <h3 className="font-extrabold text-white text-lg">პროდუქციის ინვენტარი</h3>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                          <tr>
                            <th className="p-3">სურათი</th>
                            <th className="p-3">SKU</th>
                            <th className="p-3">დასახელება</th>
                            <th className="p-3">კატეგორია</th>
                            <th className="p-3">ფასი</th>
                            <th className="p-3">მარაგი</th>
                            <th className="p-3 text-right">მოქმედება</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                          {products.map(p => (
                            <tr key={p.id} className="hover:bg-slate-800/40">
                              <td className="p-3">
                                <img src={p.image} alt={p.name} className="w-10 h-10 object-contain bg-slate-900 rounded-lg p-1" />
                              </td>
                              <td className="p-3 font-mono font-bold text-amber-400">{p.sku}</td>
                              <td className="p-3 font-bold text-white max-w-xs truncate">{p.name}</td>
                              <td className="p-3 text-slate-300">{p.category}</td>
                              <td className="p-3 font-extrabold text-amber-300">{p.priceGEL} ₾</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md font-bold ${p.stock <= 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-700 text-slate-200'}`}>
                                  {p.stock} ცალი
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setProducts(products.filter(item => item.id !== p.id));
                                    showToast('წაიშალა პროდუქტი');
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 3: ORDERS, INVOICES & CSV EXPORT --- */}
                {adminActiveSubTab === 'orders' && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-white text-lg">შეკვეთების მართვა</h3>
                      <button
                        onClick={exportOrdersCSV}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <Download className="w-4 h-4" /> CSV ექსპორტი
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                          <tr>
                            <th className="p-3">ID</th>
                            <th className="p-3">თარიღი</th>
                            <th className="p-3">მომხმარებელი</th>
                            <th className="p-3">ტელეფონი</th>
                            <th className="p-3">მისამართი</th>
                            <th className="p-3">თანხა</th>
                            <th className="p-3">სტატუსი</th>
                            <th className="p-3">კურიერი</th>
                            <th className="p-3 text-right">ინვოისი</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                          {orders.map(ord => (
                            <tr key={ord.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-mono font-bold text-amber-400">{ord.id}</td>
                              <td className="p-3 text-slate-400">{ord.date}</td>
                              <td className="p-3 font-bold text-white">{ord.customerName}</td>
                              <td className="p-3 font-mono text-slate-300">{ord.phone}</td>
                              <td className="p-3 text-slate-300 max-w-xs truncate">{ord.address}</td>
                              <td className="p-3 font-black text-amber-300">{ord.totalGEL} ₾</td>
                              <td className="p-3">
                                <select
                                  value={ord.status}
                                  onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setOrders(orders.map(o => o.id === ord.id ? { ...o, status: newStatus } : o));
                                    showToast(`სტატუსი განახლდა: ${newStatus}`);
                                  }}
                                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs px-2 py-1 font-bold"
                                >
                                  <option value="ახალი">ახალი</option>
                                  <option value="მუშავდება">მუშავდება</option>
                                  <option value="გაგზავნილია">გაგზავნილია</option>
                                  <option value="ჩაბარებულია">ჩაბარებულია</option>
                                </select>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={ord.courier}
                                  onChange={(e) => {
                                    const cVal = e.target.value;
                                    setOrders(orders.map(o => o.id === ord.id ? { ...o, courier: cVal } : o));
                                  }}
                                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs px-2 py-1 w-28"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setActiveInvoiceOrder(ord)}
                                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ml-auto"
                                >
                                  <FileText className="w-3.5 h-3.5" /> ინვოისი
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 4: BANNER & PROMO SLOTS MANAGEMENT --- */}
                {adminActiveSubTab === 'banners' && (
                  <div className="space-y-6">
                    {/* Hero Banner controls */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg">მთავარი ბანერის რედაქტირება</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">სათაური</label>
                          <input
                            type="text"
                            value={banners[0]?.title || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBanners(prev => [{ ...prev[0], title: val }, ...prev.slice(1)]);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ქვესათაური</label>
                          <input
                            type="text"
                            value={banners[0]?.subtitle || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBanners(prev => [{ ...prev[0], subtitle: val }, ...prev.slice(1)]);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">სურათის URL</label>
                          <input
                            type="url"
                            value={banners[0]?.image || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBanners(prev => [{ ...prev[0], image: val }, ...prev.slice(1)]);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ღილაკის ტექსტი</label>
                          <input
                            type="text"
                            value={banners[0]?.buttonText || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBanners(prev => [{ ...prev[0], buttonText: val }, ...prev.slice(1)]);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Promo Slots Controls */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg">პრომო ბლოკები (Promo Slots)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {promoSlots.map((slot, index) => (
                          <div key={slot.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block">სლოტი {index + 1} Tag</label>
                              <input
                                type="text"
                                value={slot.tag}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoSlots(promoSlots.map(s => s.id === slot.id ? { ...s, tag: val } : s));
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block">სლოტი {index + 1} სათაური</label>
                              <input
                                type="text"
                                value={slot.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoSlots(promoSlots.map(s => s.id === slot.id ? { ...s, title: val } : s));
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 5: PAGE BUILDER & SECTION REORDER --- */}
                {adminActiveSubTab === 'builder' && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4 max-w-2xl">
                    <h3 className="font-extrabold text-white text-lg">მთავარი გვერდის სექციების მართვა</h3>
                    <p className="text-xs text-slate-400">შეცვალეთ სექციების თანმიმდევრობა ან გამორთეთ/ჩართეთ მათი გამოჩენა მთავარ გვერდზე</p>

                    <div className="space-y-2 pt-2">
                      {sections.map((sec, idx) => (
                        <div key={sec.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Sliders className="w-4 h-4 text-slate-500" />
                            <span className="font-bold text-white text-sm">{sec.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Toggle visibility */}
                            <button
                              onClick={() => {
                                setSections(sections.map(s => s.id === sec.id ? { ...s, visible: !s.visible } : s));
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                                sec.visible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {sec.visible ? 'გამოჩენილი' : 'დამალული'}
                            </button>

                            {/* Move Up */}
                            <button
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const newSecs = [...sections];
                                const temp = newSecs[idx];
                                newSecs[idx] = newSecs[idx - 1];
                                newSecs[idx - 1] = temp;
                                setSections(newSecs);
                              }}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="w-5 h-5" />
                            </button>

                            {/* Move Down */}
                            <button
                              disabled={idx === sections.length - 1}
                              onClick={() => {
                                if (idx === sections.length - 1) return;
                                const newSecs = [...sections];
                                const temp = newSecs[idx];
                                newSecs[idx] = newSecs[idx + 1];
                                newSecs[idx + 1] = temp;
                                setSections(newSecs);
                              }}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 6: CRM & USER MANAGEMENT --- */}
                {adminActiveSubTab === 'crm' && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                    <h3 className="font-extrabold text-white text-lg">მომხმარებელთა ბაზა (CRM)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                          <tr>
                            <th className="p-3">სახელი</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">ტელეფონი</th>
                            <th className="p-3">შეკვეთები</th>
                            <th className="p-3">სულ დახარჯული</th>
                            <th className="p-3 text-right">წაშლა</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                          {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{u.name}</td>
                              <td className="p-3 text-slate-300">{u.email}</td>
                              <td className="p-3 font-mono text-slate-400">{u.phone}</td>
                              <td className="p-3 font-bold text-amber-400">{u.ordersCount}</td>
                              <td className="p-3 font-black text-amber-300">{u.totalSpentGEL} ₾</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setUsers(users.filter(x => x.id !== u.id));
                                    showToast('მომხმარებელი წაიშალა');
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 7: COUPONS & MARKETING --- */}
                {adminActiveSubTab === 'coupons' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Coupon Form */}
                    <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-amber-400" /> პრომო კოდის დამატება
                      </h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target;
                        const code = form.code.value.trim().toUpperCase();
                        const discountPercent = Number(form.discountPercent.value);
                        if (!code) return;

                        setCoupons([...coupons, { code, discountPercent }]);
                        form.reset();
                        showToast('✅ პრომო კოდი დაემატა!');
                      }} className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">პრომო კოდი (მაგ: SUMMER15)</label>
                          <input type="text" name="code" required placeholder="SPRING20" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">ფასდაკლების პროცენტი (%)</label>
                          <input type="number" name="discountPercent" required placeholder="15" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
                        </div>
                        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs">
                          კოდის დამატება
                        </button>
                      </form>
                    </div>

                    {/* Coupons List */}
                    <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-white text-lg">აქტიური პრომო კოდები</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {coupons.map((c, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-black text-amber-400 text-lg block">{c.code}</span>
                              <span className="text-xs text-slate-400 font-bold">ფასდაკლება: -{c.discountPercent}%</span>
                            </div>
                            <button
                              onClick={() => {
                                setCoupons(coupons.filter((_, i) => i !== idx));
                                showToast('პრომო კოდი წაიშალა');
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- SUB-TAB 8: LIVE CHAT ADMIN RESPONSE PANEL --- */}
                {adminActiveSubTab === 'chat' && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 space-y-4 max-w-2xl">
                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-amber-400" /> Live Chat ოპერატორის პანელი
                    </h3>
                    
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 h-64 overflow-y-auto space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium ${
                            msg.sender === 'user' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-amber-500 text-slate-950 font-bold'
                          }`}>
                            <span className="text-[10px] opacity-75 block mb-0.5">{msg.sender === 'user' ? 'მომხმარებელი' : 'ოპერატორი (თქვენ)'}</span>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ჩაწერეთ პასუხი მომხმარებლისთვის..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (!chatInput.trim()) return;
                          setChatMessages(prev => [...prev, { sender: 'admin', text: chatInput }]);
                          setChatInput('');
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                      >
                        გაგზავნა
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* ================= MODAL 1: QUICK VIEW PRODUCT MODAL ================= */}
      {selectedProductQuickView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setSelectedProductQuickView(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-slate-950 rounded-2xl p-6 flex items-center justify-center aspect-square">
                <img src={selectedProductQuickView.image} alt={selectedProductQuickView.name} className="w-full h-full object-contain" />
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{selectedProductQuickView.category}</span>
                <h3 className="text-xl font-extrabold text-white">{selectedProductQuickView.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedProductQuickView.description}</p>
                <div className="text-2xl font-black text-amber-400">
                  {formatPrice(selectedProductQuickView.priceGEL)}
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      addToCart(selectedProductQuickView);
                      setSelectedProductQuickView(null);
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs transition"
                  >
                    კალათაში დამატება
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CHECKOUT & EXPRESS BUY MODAL ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-white border-b border-slate-800 pb-3">
              {quickBuyProduct ? '⚡ 1-Click სწრაფი შეკვეთა' : '🛒 შეკვეთის გაფორმება'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">სახელი და გვარი *</label>
                <input
                  type="text"
                  required
                  placeholder="მაგ: გიორგი ბერიძე"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">ტელეფონის ნომერი *</label>
                <input
                  type="text"
                  required
                  placeholder="599 00 00 00"
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">მიწოდების მისამართი *</label>
                <input
                  type="text"
                  required
                  placeholder="თბილისი, ჭავჭავაძის გამზ. #12"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">სულ გადასახდელი:</span>
                <span className="text-lg font-black text-amber-400">
                  {quickBuyProduct ? formatPrice(quickBuyProduct.priceGEL) : formatPrice(cartTotalGEL)}
                </span>
              </div>

              <button
                onClick={() => {
                  if (quickBuyProduct) {
                    handlePlaceOrder([quickBuyProduct], quickBuyProduct.priceGEL, true);
                  } else {
                    handlePlaceOrder(cart, cartTotalGEL, false);
                  }
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl transition text-xs shadow-lg shadow-amber-500/20"
              >
                დადასტურება & შეკვეთა
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: PRINTABLE INVOICE MODAL ================= */}
      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-8 relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setActiveInvoiceOrder(null)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Invoice Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">GEOSTORE</h2>
                <p className="text-xs text-slate-500">ინვოისი # {activeInvoiceOrder.id}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>თარიღი: {activeInvoiceOrder.date}</p>
                <p className="font-bold text-amber-600">სტატუსი: {activeInvoiceOrder.status}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="text-xs space-y-1 bg-slate-50 p-4 rounded-xl">
              <p><strong>მომხმარებელი:</strong> {activeInvoiceOrder.customerName}</p>
              <p><strong>ტელეფონი:</strong> {activeInvoiceOrder.phone}</p>
              <p><strong>მისამართი:</strong> {activeInvoiceOrder.address}</p>
            </div>

            {/* Order Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-2">პროდუქტი</th>
                  <th className="py-2">რაოდენობა</th>
                  <th className="py-2 text-right">ფასი</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeInvoiceOrder.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{it.name}</td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2 text-right font-bold">{it.price} ₾</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t pt-4 flex justify-between items-center text-sm font-black">
              <span>სულ ჯამი:</span>
              <span className="text-amber-600 text-lg">{activeInvoiceOrder.totalGEL} ₾</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => window.print()}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                ბეჭდვა / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIVE CHAT FLOATING WIDGET ================= */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-4 rounded-full shadow-2xl hover:scale-105 transition flex items-center justify-center border-2 border-amber-300"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col h-[420px]">
            {/* Chat Widget Header */}
            <div className="bg-amber-500 p-4 text-slate-950 font-extrabold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm">GEOSTORE ონლაინ მხარდაჭერა</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium ${
                    m.sender === 'user' 
                      ? 'bg-amber-500 text-slate-950 font-bold' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="ჩაწერეთ შეტყობინება..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button 
                onClick={handleSendMessage}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden z-40 py-2 px-6 flex justify-between items-center">
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
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <Settings className="w-5 h-5" />
          <span>ადმინი</span>
        </button>
      </nav>

    </div>
  );
}
