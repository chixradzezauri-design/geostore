import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, BookOpen, Image as ImageIcon, Bell
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
    id: 'prod-3',
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

  // Site Settings (CMS for Admin Panel)
  const [siteSettings, setSiteSettings] = useState(() => {
    const saved = localStorage.getItem('geostore_site_settings');
    return saved ? JSON.parse(saved) : {
      storeName: 'GEOSTORE',
      topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მაღაზია',
      supportPhone: '+995 32 200 00 00',
      heroTitle: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში',
      heroSubtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ Apple-ის პროდუქციაზე!'
    };
  });

  useEffect(() => {
    localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  // ადმინის ავტორიზაცია და Remember Me
  const [adminAuth, setAdminAuth] = useState(() => {
    const saved = localStorage.getItem('geostore_admin_auth');
    return saved ? JSON.parse(saved) : { username: "admin", password: "admin123" };
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    return localStorage.getItem('geostore_admin_remember'] === 'true';
  });

  const [adminLoginForm, setAdminLoginForm] = useState(() => {
    const remembered = localStorage.getItem('geostore_admin_remember_creds');
    return remembered ? JSON.parse(remembered) : { username: '', password: '', remember: false };
  });

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

  const [activeTab, setActiveTab] = useState('store'); 
  const [adminError, setAdminError] = useState('');
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('categories');

  // Product Editing State in Admin Panel
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', sku: '', category: '', priceGEL: 0, stock: 0, image: '', description: '' });

  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductQuickView, setSelectedProductQuickView] = useState(null);

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('geostore_users_list');
    return saved ? JSON.parse(saved) : [
      { id: 'u1', name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '599123456', password: '123', ordersCount: 1, totalSpentGEL: 3899, date: '2026-10-15' }
    ];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState(() => {
    const rememberedUser = localStorage.getItem('geostore_user_remembered');
    return rememberedUser ? JSON.parse(rememberedUser) : { name: '', phone: '', email: '', password: '', remember: false };
  });

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
        items: [{ id: 'prod-1', name: 'iPhone 15 Pro Max', price: 3899, quantity: 1 }],
        totalGEL: 3899,
        status: 'ახალი',
        courier: 'არ არის დანიშნული'
      }
    ];
  });
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null);

  // --- ADVANCED CHAT WITH ADMIN POPUP & INDIVIDUAL CLIENTS ARCHIVE ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatClientName, setChatClientName] = useState(() => localStorage.getItem('geostore_chat_client_name') || '');
  const [clientNameInput, setClientNameInput] = useState('');
  
  const [clientChatView, setClientChatView] = useState(() => {
    const saved = localStorage.getItem('geostore_client_chat_view');
    return saved ? JSON.parse(saved) : [
      { id: 1, sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?', time: '12:00', image: '' }
    ];
  });

  const [adminChatArchive, setAdminChatArchive] = useState(() => {
    const saved = localStorage.getItem('geostore_admin_chat_archive');
    return saved ? JSON.parse(saved) : [
      { id: 1, clientName: 'სტუმარი', sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?', time: '12:00', image: '' }
    ];
  });

  const [chatInput, setChatInput] = useState('');
  const [adminSelectedClient, setAdminSelectedClient] = useState(null);
  const [adminIndividualReply, setAdminIndividualReply] = useState('');

  // Popup notification for Admin when a new message arrives
  const [adminNewMessagePopup, setAdminNewMessagePopup] = useState(null);

  useEffect(() => {
    localStorage.setItem('geostore_client_chat_view', JSON.stringify(clientChatView));
  }, [clientChatView]);

  useEffect(() => {
    localStorage.setItem('geostore_admin_chat_archive', JSON.stringify(adminChatArchive));
  }, [adminChatArchive]);

  useEffect(() => {
    if (chatClientName) {
      localStorage.setItem('geostore_chat_client_name', chatClientName);
    }
  }, [chatClientName]);

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => localStorage.setItem('geostore_cats', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('geostore_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('geostore_banners', JSON.stringify(banners)), [banners]);
  useEffect(() => localStorage.setItem('geostore_promos', JSON.stringify(promoSlots)), [promoSlots]);
  useEffect(() => localStorage.setItem('geostore_coupons', JSON.stringify(coupons)), [coupons]);
  useEffect(() => localStorage.setItem('geostore_sections', JSON.stringify(sections)), [sections]);
  useEffect(() => localStorage.setItem('geostore_orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('geostore_users_list', JSON.stringify(usersList)), [usersList]);
  useEffect(() => localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)), [currentUser]);

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
        id: `u-${Date.now()}`,
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        password: authForm.password,
        ordersCount: 0,
        totalSpentGEL: 0,
        date: new Date().toISOString().slice(0, 10)
      };
      setUsersList([newUser, ...usersList]);
      setCurrentUser(newUser);

      if (authForm.remember) {
        localStorage.setItem('geostore_user_remembered', JSON.stringify({ email: authForm.email, password: authForm.password, remember: true }));
      } else {
        localStorage.removeItem('geostore_user_remembered');
      }

      setIsAuthOpen(false);
      setAuthForm({ name: '', phone: '', email: '', password: '', remember: false });
      showToast('🎉 რეგისტრაცია წარმატებულია!');
    } else {
      const found = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (found) {
        setCurrentUser(found);

        if (authForm.remember) {
          localStorage.setItem('geostore_user_remembered', JSON.stringify({ email: authForm.email, password: authForm.password, remember: true }));
        } else {
          localStorage.removeItem('geostore_user_remembered');
        }

        setIsAuthOpen(false);
        setAuthForm({ name: '', phone: '', email: '', password: '', remember: false });
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

      if (adminLoginForm.remember) {
        localStorage.setItem('geostore_admin_remember', 'true');
        localStorage.setItem('geostore_admin_remember_creds', JSON.stringify(adminLoginForm));
      } else {
        localStorage.removeItem('geostore_admin_remember');
        localStorage.removeItem('geostore_admin_remember_creds');
      }

      setAdminLoginForm({ username: '', password: '', remember: false });
      showToast('🔓 ადმინ პანელში შესვლა წარმატებულია!');
    } else {
      setAdminError('არასწორი მომხმარებლის სახელი ან პაროლი!');
    }
  };

  const handleAdminLogout = () => {
    setAdminLoggedIn(false);
    localStorage.removeItem('geostore_admin_remember');
    localStorage.removeItem('geostore_admin_remember_creds');
    showToast('გახვედით ადმინ პანელიდან');
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

  // Grouping archive by client names for Admin
  const groupedClients = useMemo(() => {
    const map = {};
    adminChatArchive.forEach(m => {
      const name = m.clientName || 'სტუმარი';
      if (!map[name]) map[name] = [];
      map[name].push(m);
    });
    return map;
  }, [adminChatArchive]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-24 md:pb-0 selection:bg-amber-500 selection:text-slate-900 flex flex-col justify-between">
      
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-2xl shadow-2xl border border-amber-300 animate-bounce flex items-center gap-2 text-xs md:text-sm">
          <Sparkles className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* ADMIN POPUP NOTIFICATION FOR NEW MESSAGES */}
      {adminLoggedIn && adminNewMessagePopup && (
        <div 
          onClick={() => {
            setAdminActiveSubTab('adminChat');
            setAdminSelectedClient(adminNewMessagePopup.clientName);
            setAdminNewMessagePopup(null);
          }}
          className="fixed bottom-6 left-6 z-50 bg-slate-950 border-2 border-amber-500 text-white p-4 rounded-2xl shadow-2xl cursor-pointer hover:bg-slate-900 transition animate-bounce flex items-center gap-3 text-xs md:text-sm"
        >
          <Bell className="w-6 h-6 text-amber-400 shrink-0 animate-spin" />
          <div>
            <h4 className="font-black text-amber-400">ახალი შეტყობინება! ({adminNewMessagePopup.clientName})</h4>
            <p className="text-slate-300 line-clamp-1">{adminNewMessagePopup.text}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setAdminNewMessagePopup(null); }} className="text-slate-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white text-[10px] md:text-xs py-1.5 px-3 font-medium flex justify-between items-center">
          <div className="flex items-center gap-1.5 truncate">
            <span>🇬🇪</span>
            <span className="truncate">{siteSettings.topBarText}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setActiveTab('policy')} className="hover:underline font-bold text-[11px] mr-2">წესები და პოლიტიკა</button>
            <button 
              onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')}
              className="bg-slate-950/40 hover:bg-slate-950/70 px-2 py-0.5 rounded-full border border-white/20 transition flex items-center gap-1 font-bold text-amber-300 text-[10px]"
            >
              <span>{currency === 'GEL' ? '₾ GEL' : '$ USD'}</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 md:gap-4 w-full">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-lg md:text-xl text-slate-950">
              {siteSettings.storeName ? siteSettings.storeName.charAt(0) : 'G'}
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
              {siteSettings.storeName}
            </span>
          </div>

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
                <User className="w-4 h-4" /> შესვლა / რეგისტრაცია
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

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        
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
                          {siteSettings.heroTitle}
                        </h1>
                        <p className="text-slate-400 text-xs md:text-base">
                          {siteSettings.heroSubtitle}
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
                      <button
                        onClick={() => setSelectedCategory('ყველა')}
                        className={`px-4 py-2 rounded-2xl font-semibold text-xs whitespace-nowrap transition ${
                          selectedCategory === 'ყველა' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ✨ ყველა
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id || cat}
                          onClick={() => setSelectedCategory(cat.name || cat)}
                          className={`px-4 py-2 rounded-2xl font-semibold text-xs whitespace-nowrap transition ${
                            selectedCategory === (cat.name || cat) ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {cat.icon || ''} {cat.name || cat}
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
                                <button onClick={() => setSelectedProductQuickView(prod)} className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-950/80 text-white text-[10px] font-bold px-3 py-1 rounded-xl">
                                  <Eye className="w-3 h-3 inline mr-1" /> სწრაფი ნახვა
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

              if (sec.id === 'faq') {
                return (
                  <div key={sec.id} className="bg-slate-800/30 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h2 className="text-xl font-black text-white">ხშირად დასმული კითხვები</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <h4 className="font-bold text-amber-400 mb-1">როგორ ხდება მიწოდება?</h4>
                        <p className="text-slate-400">თბილისში მიწოდება ხდება იმავე დღეს, ხოლო რეგიონებში 1-2 სამუშაო დღეში.</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-400 mb-1">მოქმედებს თუ არა გარანტია?</h4>
                        <p className="text-slate-400">ყველა პროდუქტზე ვრცელდება 1 წლიანი ოფიციალური გარანტია.</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="max-w-3xl mx-auto bg-slate-800/80 border border-slate-700 rounded-3xl p-6 md:p-10 space-y-6 text-xs md:text-sm leading-relaxed">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
              <BookOpen className="w-7 h-7 text-amber-400" />
              <h2 className="text-xl md:text-2xl font-black text-white">წესები და პოლიტიკა</h2>
            </div>
            
            <div className="space-y-4 text-slate-300">
              <div>
                <h3 className="font-bold text-amber-400 text-sm mb-1">1. ზოგადი დებულებები</h3>
                <p>წინამდებარე წესები და პოლიტიკა არეგულირებს {siteSettings.storeName}-ის ვებგვერდის გამოყენებასა და პროდუქციის შეძენის პირობებს. საიტზე რეგისტრაციით ან შეკვეთის გაფორმებით თქვენ აცხადებთ თანხმობას აღნიშნულ პირობებზე.</p>
              </div>

              <div>
                <h3 className="font-bold text-amber-400 text-sm mb-1">2. შეკვეთა და მიწოდება</h3>
                <p>შეკვეთის განთავსების შემდეგ ჩვენი მენეჯერი დაგიკავშირდებათ დეტალების დასაზუსტებლად. მიწოდება ხორციელდება თბილისში 24 საათის განმავლობაში, ხოლო რეგიონებში 48 საათში. 100₾-ზე მეტი ღირებულების შეკვეთებზე მიწოდება უფასოა.</p>
              </div>

              <div>
                <h3 className="font-bold text-amber-400 text-sm mb-1">3. გარანტია და დაბრუნება</h3>
                <p>ყველა პროდუქტზე ვრცელდება მწარმოებლის ოფიციალური 1 წლიანი გარანტია. პროდუქტის დაბრუნება ან გადაცვლა შესაძლებელია კანონმდებლობით დადგენილ ვადებში, ქარხნული წუნის აღმოჩენის შემთხვევაში.</p>
              </div>

              <div>
                <h3 className="font-bold text-amber-400 text-sm mb-1">4. კონფიდენციალურობა</h3>
                <p>{siteSettings.storeName} იცავს მომხმარებლის პერსონალურ მონაცემებს და არ გადასცემს მათ მესამე პირებს, გარდა კანონით გათვალისწინებული შემთხვევებისა.</p>
              </div>
            </div>

            <button onClick={() => setActiveTab('store')} className="bg-amber-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs">
              &larr; მთავარ გვერდზე დაბრუნება
            </button>
          </div>
        )}

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

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700 space-y-4 text-xs md:text-sm">
            <h2 className="text-xl font-black text-white">👤 მომხმარებლის პროფილი</h2>
            <p><b>სახელი:</b> {currentUser.name}</p>
            <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p><b>ტელეფონი:</b> {currentUser.phone}</p>

            <div className="pt-4 border-t border-slate-700">
              <h3 className="font-bold text-sm text-slate-200 mb-2">📦 ჩემი შეკვეთების ისტორია</h3>
              {orders.filter(o => o.userEmail === currentUser.email).length === 0 ? (
                <p className="text-slate-500">შეკვეთები არ არის.</p>
              ) : (
                <div className="space-y-2">
                  {orders.filter(o => o.userEmail === currentUser.email).map(o => (
                    <div key={o.id} className="p-3 bg-slate-900 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-amber-400">#{o.id} ({o.date}) - <span className="text-emerald-400">{o.status}</span></p>
                        <p className="text-slate-400">{o.items.map(i => i.name).join(', ')}</p>
                      </div>
                      <span className="font-black text-white">{o.totalGEL} ₾</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { setCurrentUser(null); setActiveTab('store'); }} className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold mt-2">გამოსვლა</button>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-white">🛒 საყიდლების კალათა</h2>
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
                    <input type="text" placeholder="პრომო კოდი" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="bg-slate-900 px-3 py-2 rounded-xl text-xs flex-1 uppercase text-white outline-none" />
                    <button onClick={applyCouponCode} className="bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                  </div>
                  <div className="text-lg md:text-xl font-black text-amber-400">სულ: {formatPrice(cartTotalGEL)}</div>
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-2xl text-xs">შეკვეთა</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN PANEL (10 TABS) ================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!adminLoggedIn ? (
              <div className="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 space-y-4 text-center">
                <Shield className="w-10 h-10 text-amber-400 mx-auto" />
                <h2 className="text-lg font-bold text-white">ადმინისტრატორის შესვლა</h2>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="მომხმარებლის სახელი" 
                    value={adminLoginForm.username} 
                    onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" 
                  />
                  <input 
                    type="password" 
                    placeholder="პაროლი" 
                    value={adminLoginForm.password} 
                    onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" 
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      id="adminRemember"
                      checked={adminLoginForm.remember} 
                      onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
                      className="rounded accent-amber-500"
                    />
                    <label htmlFor="adminRemember" className="cursor-pointer">მომიმახსოვრე სისტემაში</label>
                  </div>
                  {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
                  <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs transition">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-2 flex gap-2 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'categories', label: '1. კატეგორიები' },
                    { id: 'products', label: '2. პროდუქცია' },
                    { id: 'orders', label: '3. შეკვეთები' },
                    { id: 'banners', label: '4. ბანერები' },
                    { id: 'builder', label: '5. Page Builder' },
                    { id: 'crm', label: '6. CRM' },
                    { id: 'coupons', label: '7. პრომოები' },
                    { id: 'security', label: '8. უსაფრთხოება' },
                    { id: 'cms', label: '9. საიტის რედაქტორი' },
                    { id: 'adminChat', label: '10. მომხმარებელთა მესიჯები' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminActiveSubTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        adminActiveSubTab === tab.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button onClick={handleAdminLogout} className="bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl text-xs font-bold ml-auto shrink-0">გასვლა</button>
                </div>

                {adminActiveSubTab === 'categories' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg text-white">კატეგორიების მართვა</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const catName = e.target.catName.value.trim();
                      if(!catName) return;
                      setCategories([...categories, { id: `cat-${Date.now()}`, name: catName, icon: '📦' }]);
                      e.target.reset();
                      showToast('კატეგორია დაემატა');
                    }} className="flex gap-2">
                      <input type="text" name="catName" required placeholder="ახალი კატეგორია..." className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs flex-1 text-white outline-none" />
                      <button type="submit" className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map(c => (
                        <div key={c.id || c} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{c.name || c}</span>
                          {(c.name || c) !== 'ყველა' && (
                            <button onClick={() => setCategories(categories.filter(x => (x.id ? x.id !== c.id : x !== c)))} className="text-rose-400 hover:text-rose-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. PRODUCTS */}
                {adminActiveSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800 p-4 md:p-6 rounded-3xl space-y-4">
                      <h3 className="font-bold text-base md:text-lg text-white">+ ახალი პროდუქტის დამატება</h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.target;
                        const fileInput = f.prodImageFile;
                        const prodName = f.name.value;
                        const userSelectedCat = f.category.value;

                        let autoCategory = userSelectedCat;
                        const lowerName = prodName.toLowerCase();
                        if (lowerName.includes('iphone') || lowerName.includes('samsung') || lowerName.includes('xiaomi') || lowerName.includes('phone')) {
                          autoCategory = 'სმარტფონები';
                        } else if (lowerName.includes('macbook') || lowerName.includes('laptop') || lowerName.includes('asus') || lowerName.includes('acer')) {
                          autoCategory = 'ლეპტოპები';
                        } else if (lowerName.includes('watch') || lowerName.includes('საათი')) {
                          autoCategory = 'ჭკვიანი საათები';
                        } else if (lowerName.includes('tv') || lowerName.includes('ტელევიზორი')) {
                          autoCategory = 'ტელევიზორები';
                        } else if (lowerName.includes('airpods') || lowerName.includes('headphone') || lowerName.includes('ყურსასმენი') || lowerName.includes('case')) {
                          autoCategory = 'აქსესუარები';
                        }
                        
                        const createProductObj = (imageUrl) => {
                          const newProd = {
                            id: `prod-${Date.now()}`,
                            sku: f.sku.value || `GEO-${Math.floor(Math.random() * 1000)}`,
                            name: prodName,
                            category: autoCategory,
                            priceGEL: Number(f.priceGEL.value),
                            stock: Number(f.stock.value),
                            image: imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600',
                            description: f.description.value
                          };
                          setProducts([newProd, ...products]);
                          f.reset();
                          showToast(`✅ პროდუქტი დაემატა (${autoCategory})!`);
                        };

                        if (fileInput.files && fileInput.files[0]) {
                          const reader = new FileReader();
                          reader.onload = function(uploadEvent) {
                            createProductObj(uploadEvent.target.result);
                          };
                          reader.readAsDataURL(fileInput.files[0]);
                        } else {
                          createProductObj('https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600');
                        }
                      }} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <input type="text" name="name" required placeholder="პროდუქტის დასახელება (მაგ: iPhone 15) *" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                        <input type="text" name="sku" placeholder="SKU კოდი (მაგ: GEO-IP15)" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400">კატეგორია (ავტომატური ან არჩევითი)</label>
                          <select name="category" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none">
                            {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" name="priceGEL" required placeholder="ფასი (₾) *" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                          <input type="number" name="stock" required placeholder="მარაგი *" className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-1 bg-slate-900 border border-slate-700 p-3 rounded-xl">
                          <label className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> ატვირთეთ პროდუქტის ფოტო (კომპიუტერიდან / ტელეფონიდან)
                          </label>
                          <input type="file" name="prodImageFile" accept="image/*" className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer" />
                        </div>

                        <textarea name="description" placeholder="დეტალური აღწერა..." className="md:col-span-2 bg-slate-900 border border-slate-700 p-3 rounded-xl text-white h-20 outline-none"/>
                        
                        <button type="submit" className="md:col-span-2 bg-amber-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-sm transition hover:bg-amber-400">
                          დამატება პროდუქტებში
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-800 p-4 md:p-6 rounded-3xl space-y-3">
                      <h3 className="font-bold text-base md:text-lg text-white">არსებული პროდუქტები ({products.length})</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="bg-slate-900 p-3.5 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-12 h-12 object-contain bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0" />
                              <div>
                                <span className="font-bold text-white text-sm">{p.name}</span>
                                <p className="text-amber-400 font-semibold">{p.priceGEL} ₾ | კატეგორია: {p.category} | მარაგი: {p.stock}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button 
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setEditProductForm({ name: p.name, sku: p.sku || '', category: p.category, priceGEL: p.priceGEL, stock: p.stock, image: p.image, description: p.description || '' });
                                }} 
                                className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> რედაქტირება
                              </button>
                              <button onClick={() => setProducts(products.filter(x => x.id !== p.id))} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-xl">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ORDERS */}
                {adminActiveSubTab === 'orders' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base md:text-lg text-white">შეკვეთების მართვა და სტატუსები</h3>
                      <button onClick={exportOrdersCSV} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">CSV ექსპორტი</button>
                    </div>
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                          <div>
                            <span className="font-bold text-amber-400 text-sm">#{o.id} ({o.date})</span>
                            <p className="text-slate-300 mt-1"><b>მყიდველი:</b> {o.customerName} | 📞 {o.phone}</p>
                            <p className="text-slate-400 mt-0.5"><b>მისამართი:</b> {o.address}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400">სტატუსის შეცვლა:</label>
                              <select 
                                value={o.status || 'ახალი'} 
                                onChange={(e) => {
                                  const updatedStatus = e.target.value;
                                  setOrders(orders.map(ord => ord.id === o.id ? { ...ord, status: updatedStatus } : ord));
                                  showToast(`შეკვეთა #${o.id} სტატუსი შეიცვალა: ${updatedStatus}`);
                                }}
                                className="bg-slate-800 border border-slate-600 text-amber-300 font-bold px-3 py-1.5 rounded-xl outline-none text-xs"
                              >
                                <option value="ახალი">🟢 ახალი</option>
                                <option value="მზადდება">🟡 მზადდება</option>
                                <option value="გზაშია">🔵 გზაშია</option>
                                <option value="ჩაბარებულია">✅ ჩაბარებულია</option>
                                <option value="გაუქმებულია">❌ გაუქმებულია</option>
                              </select>
                            </div>

                            <span className="font-black text-white text-sm shrink-0">{o.totalGEL} ₾</span>
                            <button onClick={() => setActiveInvoiceOrder(o)} className="bg-slate-700 hover:bg-slate-600 px-3.5 py-2 rounded-xl text-white font-bold transition shrink-0">ინვოისი</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'banners' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg text-white">მთავარი ბანერის რედაქტირება</h3>
                    <div className="space-y-3 text-xs">
                      <input type="text" value={banners[0]?.title || ''} onChange={e => setBanners([{ ...banners[0], title: e.target.value }])} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none" placeholder="სათაური" />
                      <input type="text" value={banners[0]?.subtitle || ''} onChange={e => setBanners([{ ...banners[0], subtitle: e.target.value }])} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none" placeholder="ქვესათაური" />
                      <input type="url" value={banners[0]?.image || ''} onChange={e => setBanners([{ ...banners[0], image: e.target.value }])} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white outline-none" placeholder="სურათის URL" />
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'builder' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-3 max-w-xl">
                    <h3 className="font-bold text-base md:text-lg text-white">🎨 Page Builder (სექციები)</h3>
                    {sections.map((sec, idx) => (
                      <div key={sec.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-white font-bold">{sec.name} ({sec.visible ? '🟢' : '🔴'})</span>
                        <div className="flex gap-2">
                          <button onClick={() => setSections(sections.map(s => s.id === sec.id ? { ...s, visible: !s.visible } : s))} className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-white">
                            {sec.visible ? 'დამალვა' : 'ჩვენება'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminActiveSubTab === 'crm' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-3">
                    <h3 className="font-bold text-base md:text-lg text-white">👥 მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-2">
                      {usersList.map(u => (
                        <div key={u.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-slate-400">📧 {u.email} | 📞 {u.phone}</p>
                          </div>
                          <button onClick={() => setUsersList(usersList.filter(x => x.id !== u.id))} className="text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'coupons' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg text-white">პრომო კოდები</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const code = e.target.code.value.trim().toUpperCase();
                      const disc = Number(e.target.disc.value);
                      if(!code) return;
                      setCoupons([...coupons, { code, discountPercent: disc }]);
                      e.target.reset();
                      showToast('პრომო კოდი დაემატა');
                    }} className="flex gap-2">
                      <input type="text" name="code" required placeholder="კოდი (GEO10)" className="bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs uppercase text-white outline-none" />
                      <input type="number" name="disc" required placeholder="%" className="bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs w-20 text-white outline-none" />
                      <button type="submit" className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {coupons.map((c, i) => (
                        <span key={i} className="bg-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 text-amber-400">
                          {c.code} (-{c.discountPercent}%)
                          <button onClick={() => setCoupons(coupons.filter((_, idx) => idx !== i))} className="text-rose-400">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'security' && (
                  <div className="bg-slate-800 p-6 rounded-3xl max-w-md space-y-4">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2"><Key className="w-5 h-5 text-amber-400"/> ადმინის პაროლის შეცვლა</h3>
                    <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                      <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                      <input type="password" required placeholder="ძველი პაროლი" value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                      <input type="password" required placeholder="ახალი პაროლი" value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none" />
                      <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">განახლება</button>
                    </form>
                  </div>
                )}

                {adminActiveSubTab === 'cms' && (
                  <div className="bg-slate-800 p-6 rounded-3xl max-w-xl space-y-4">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2"><Settings className="w-5 h-5 text-amber-400"/> საიტის სრული რედაქტორი (CMS)</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      showToast('✅ საიტის მონაცემები წარმატებით განახლდა!');
                    }} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400">მაღაზიის სათაური (ლოგო):</label>
                        <input type="text" value={siteSettings.storeName} onChange={e => setSiteSettings({...siteSettings, storeName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">ზედა ზოლის ტექსტი (Header Ticker):</label>
                        <input type="text" value={siteSettings.topBarText} onChange={e => setSiteSettings({...siteSettings, topBarText: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">მთავარი ბანერის სათაური (Hero Title):</label>
                        <input type="text" value={siteSettings.heroTitle} onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">მთავარი ბანერის აღწერა (Hero Subtitle):</label>
                        <textarea value={siteSettings.heroSubtitle} onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none h-20" />
                      </div>
                      <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-xl text-xs">ცვლილებების შენახვა</button>
                    </form>
                  </div>
                )}

                {/* 10. INDIVIDUAL CLIENT CHATS FOR ADMIN */}
                {adminActiveSubTab === 'adminChat' && (
                  <div className="bg-slate-800 p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-amber-400" /> მომხმარებელთა ინდივიდუალური ჩათები
                      </h3>
                      {adminChatArchive.length > 0 && (
                        <button 
                          onClick={() => {
                            if (window.confirm('ნამდვილად გსურთ მთელი არქივის წაშლა?')) {
                              setAdminChatArchive([]);
                              setAdminSelectedClient(null);
                              showToast('🗑️ არქივი გასუფთავდა');
                            }
                          }}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                        >
                          არქივის გასუფთავება
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Clients List */}
                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-700 space-y-2 h-[400px] overflow-y-auto">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase px-2 mb-2">მომხმარებლები ({Object.keys(groupedClients).length})</h4>
                        {Object.keys(groupedClients).length === 0 ? (
                          <p className="text-slate-500 text-xs p-2">მესიჯები არ არის.</p>
                        ) : (
                          Object.keys(groupedClients).map(clientName => (
                            <button
                              key={clientName}
                              onClick={() => setAdminSelectedClient(clientName)}
                              className={`w-full text-left p-3 rounded-xl text-xs font-bold transition flex justify-between items-center ${
                                adminSelectedClient === clientName ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                              }`}
                            >
                              <span>👤 {clientName}</span>
                              <span className="text-[10px] opacity-80">({groupedClients[clientName].length})</span>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Selected Client Chat Area */}
                      <div className="md:col-span-2 bg-slate-900 p-4 rounded-2xl border border-slate-700 flex flex-col h-[400px]">
                        {!adminSelectedClient ? (
                          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                            აირჩიეთ მომხმარებელი სიიდან, რომ ნახოთ მესიჯები და მიწეროთ პასუხი.
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                              <h4 className="font-bold text-amber-400 text-xs">ჩათი მომხმარებელთან: {adminSelectedClient}</h4>
                              <button onClick={() => {
                                setAdminChatArchive(adminChatArchive.filter(m => (m.clientName || 'სტუმარი') !== adminSelectedClient));
                                setAdminSelectedClient(null);
                                showToast('მომხმარებლის ჩათი წაიშალა');
                              }} className="text-rose-400 text-[11px] hover:underline">ამ მომხმარებლის წაშლა</button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs">
                              {(groupedClients[adminSelectedClient] || []).map(m => (
                                <div key={m.id} className={`flex flex-col ${m.sender === 'ადმინი' ? 'items-end' : 'items-start'}`}>
                                  <div className={`p-3 rounded-2xl max-w-[85%] ${m.sender === 'ადმინი' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-white'}`}>
                                    <b>{m.sender}:</b> {m.text}
                                    {m.image && (
                                      <img src={m.image} alt="Attachment" className="mt-2 rounded-xl max-h-28 object-cover w-full border border-slate-700" />
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{m.time}</span>
                                </div>
                              ))}
                            </div>

                            <form onSubmit={(e) => {
                              e.preventDefault();
                              if(!adminIndividualReply.trim()) return;
                              const replyMsg = {
                                id: Date.now(),
                                clientName: adminSelectedClient,
                                sender: 'ადმინი',
                                text: adminIndividualReply,
                                image: '',
                                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              };
                              setAdminChatArchive(prev => [...prev, replyMsg]);
                              if (chatClientName === adminSelectedClient) {
                                setClientChatView(prev => [...prev, replyMsg]);
                              }
                              setAdminIndividualReply('');
                              showToast(`📤 პასუხი გაეგზავნა მომხმარებელს (${adminSelectedClient})!`);
                            }} className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
                              <input 
                                type="text" 
                                placeholder={`მიწერეთ პასუხი ${adminSelectedClient}-ს...`}
                                value={adminIndividualReply}
                                onChange={e => setAdminIndividualReply(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-xs text-white outline-none"
                              />
                              <button type="submit" className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1">
                                <Send className="w-3.5 h-3.5" /> გაგზავნა
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* PRODUCT EDIT MODAL */}
      {editingProductId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4 text-xs">
            <button onClick={() => setEditingProductId(null)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" /> პროდუქტის რედაქტირება
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setProducts(products.map(p => p.id === editingProductId ? {
                ...p,
                name: editProductForm.name,
                sku: editProductForm.sku,
                category: editProductForm.category,
                priceGEL: Number(editProductForm.priceGEL),
                stock: Number(editProductForm.stock),
                image: editProductForm.image,
                description: editProductForm.description
              } : p));
              setEditingProductId(null);
              showToast('✅ პროდუქტი წარმატებით განახლდა!');
            }} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-400">დასახელება:</label>
                <input type="text" required value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400">ფასი (₾):</label>
                  <input type="number" required value={editProductForm.priceGEL} onChange={e => setEditProductForm({...editProductForm, priceGEL: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400">მარაგი:</label>
                  <input type="number" required value={editProductForm.stock} onChange={e => setEditProductForm({...editProductForm, stock: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">კატეგორია:</label>
                <select value={editProductForm.category} onChange={e => setEditProductForm({...editProductForm, category: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none">
                  {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">ფოტოს URL:</label>
                <input type="url" required value={editProductForm.image} onChange={e => setEditProductForm({...editProductForm, image: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">აღწერა:</label>
                <textarea value={editProductForm.description} onChange={e => setEditProductForm({...editProductForm, description: e.target.value})} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none h-20" />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-xl text-xs">შენახვა</button>
            </form>
          </div>
        </div>
      )}

      {selectedProductQuickView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4 text-xs">
            <button onClick={() => setSelectedProductQuickView(null)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <img src={selectedProductQuickView.image} alt="" className="w-40 h-40 object-contain mx-auto bg-slate-950 rounded-2xl p-4" />
            <h3 className="text-lg font-bold text-white">{selectedProductQuickView.name}</h3>
            <p className="text-slate-400">{selectedProductQuickView.description}</p>
            <div className="text-xl font-black text-amber-400">{formatPrice(selectedProductQuickView.priceGEL)}</div>
            <button onClick={() => { addToCart(selectedProductQuickView); setSelectedProductQuickView(null); }} className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold">კალათაში დამატება</button>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 relative space-y-4">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <div className="flex gap-4 border-b border-slate-800 pb-2 font-bold text-sm">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <input 
                  type="checkbox" 
                  id="userRemember"
                  checked={authForm.remember} 
                  onChange={e => setAuthForm({...authForm, remember: e.target.checked})} 
                  className="rounded accent-amber-500"
                />
                <label htmlFor="userRemember" className="cursor-pointer">მომიმახსოვრე</label>
              </div>

              <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-lg font-bold text-white">შეკვეთის გაფორმება</h3>
            <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(quickBuyProduct ? [quickBuyProduct] : cart, quickBuyProduct ? quickBuyProduct.priceGEL : cartTotalGEL, !!quickBuyProduct); }} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-bold text-xs">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold">ინვოისი #{activeInvoiceOrder.id}</h3>
              <button onClick={() => setActiveInvoiceOrder(null)}>✕</button>
            </div>
            <p className="text-xs"><b>მყიდველი:</b> {activeInvoiceOrder.customerName} ({activeInvoiceOrder.phone})</p>
            <p className="text-xs"><b>მისამართი:</b> {activeInvoiceOrder.address}</p>
            <p className="text-xs"><b>სტატუსი:</b> {activeInvoiceOrder.status}</p>
            <div className="text-sm font-bold text-amber-600">სულ: {activeInvoiceOrder.totalGEL} ₾</div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">ბეჭდვა</button>
          </div>
        </div>
      )}

      {/* LIVE CHAT WIDGET WITH CLIENT NAME PROMPT */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        {!isChatOpen ? (
          <button onClick={() => setIsChatOpen(true)} className="bg-amber-500 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center justify-center relative">
            <MessageSquare className="w-5 h-5" />
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-72 sm:w-80 md:w-96 overflow-hidden flex flex-col h-[460px]">
            <div className="bg-amber-500 p-3.5 text-slate-950 font-bold flex justify-between items-center text-xs">
              <span>მხარდაჭერა (ჩათი) {chatClientName ? `(${chatClientName})` : ''}</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if(window.confirm('გსურთ ჩათის დასრულება და თქვენს ეკრანზე გასუფთავება?')) {
                      setClientChatView([{ id: 1, sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?', time: '12:00', image: '' }]);
                      setChatClientName('');
                      localStorage.removeItem('geostore_chat_client_name');
                      showToast('ჩათი დასრულდა');
                    }
                  }} 
                  className="bg-slate-950 text-white px-2 py-0.5 rounded text-[10px]"
                >
                  დასრულება
                </button>
                <button onClick={() => setIsChatOpen(false)}>✕</button>
              </div>
            </div>

            {!chatClientName ? (
              <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-3 bg-slate-950 text-xs">
                <h4 className="font-bold text-amber-400 text-sm">გამარჯობა! გთხოვთ შეიყვანოთ თქვენი სახელი</h4>
                <p className="text-slate-400">რომ მენეჯერმა იცოდეს ვის ესაუბრება.</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if(!clientNameInput.trim()) return;
                  setChatClientName(clientNameInput.trim());
                  showToast('✅ სახელი დაფიქსირდა');
                }} className="w-full space-y-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="თქვენი სახელი..." 
                    value={clientNameInput} 
                    onChange={e => setClientNameInput(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white text-xs outline-none" 
                  />
                  <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl">დაწყება</button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-slate-950">
                  {clientChatView.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === 'ადმინი' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[85%] ${m.sender === 'ადმინი' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-white'}`}>
                        <b>{m.sender}:</b> {m.text}
                        {m.image && (
                          <img src={m.image} alt="Attachment" className="mt-2 rounded-xl max-h-36 object-cover w-full border border-slate-700" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="p-2 rounded-xl border bg-slate-800 text-slate-300 border-slate-700 cursor-pointer hover:bg-slate-700 transition" title="აირჩიეთ ფოტო">
                      <ImageIcon className="w-4 h-4" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = function(evt) {
                              const newMsg = {
                                id: Date.now(),
                                clientName: chatClientName,
                                sender: chatClientName,
                                text: 'ფოტო:',
                                image: evt.target.result,
                                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              };
                              setClientChatView(prev => [...prev, newMsg]);
                              setAdminChatArchive(prev => [...prev, newMsg]);
                              setAdminNewMessagePopup(newMsg);
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>

                    <input 
                      type="text" 
                      placeholder="დაწერეთ შეტყობინება..." 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      onKeyDown={(e) => { 
                        if(e.key === 'Enter') { 
                          if(!chatInput.trim()) return; 
                          const newMsg = { 
                            id: Date.now(), 
                            clientName: chatClientName,
                            sender: chatClientName, 
                            text: chatInput, 
                            image: '', 
                            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                          };
                          setClientChatView(prev => [...prev, newMsg]);
                          setAdminChatArchive(prev => [...prev, newMsg]);
                          setAdminNewMessagePopup(newMsg);
                          setChatInput(''); 
                        } 
                      }} 
                      className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none border border-slate-700" 
                    />

                    <button 
                      onClick={() => { 
                        if(!chatInput.trim()) return; 
                        const newMsg = { 
                          id: Date.now(), 
                          clientName: chatClientName,
                          sender: chatClientName, 
                          text: chatInput, 
                          image: '', 
                          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                        };
                        setClientChatView(prev => [...prev, newMsg]);
                        setAdminChatArchive(prev => [...prev, newMsg]);
                        setAdminNewMessagePopup(newMsg);
                        setChatInput(''); 
                      }} 
                      className="bg-amber-500 text-slate-950 p-2.5 rounded-xl font-bold"
                    >
                      <Send className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-12 space-y-2">
        <div className="flex justify-center gap-4">
          <button onClick={() => setActiveTab('policy')} className="hover:text-amber-400 transition">წესები და პოლიტიკა</button>
          <button onClick={() => setActiveTab('store')} className="hover:text-amber-400 transition">მთავარი</button>
        </div>
        <p>© 2026 {siteSettings.storeName}. ყველა უფლება დაცულია.</p>
      </footer>

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
          onClick={() => {
            if (currentUser) {
              setActiveTab('profile');
            } else {
              setAuthMode('login');
              setIsAuthOpen(true);
            }
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span>{currentUser ? 'პროფილი' : 'შესვლა'}</span>
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
