// src/App.jsx - 100% Fully Complete with Secure Hidden Admin Login Prompt (?admin=secret)
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import AdminDashboardPro from './components/AdminDashboardPro';
import AiAssistantModal from './components/AiAssistantModal';
import ProductCompareModal from './components/ProductCompareModal';
import Modals from './components/Modals';
import ImageSearchModal from './components/ImageSearchModal'; 
import AIDigitalWardrobe from './components/AIDigitalWardrobe';
import { MessageSquare, Heart, ShoppingBag, User, ShieldCheck, FileText, Bot, Sparkles, Scale, Tag, Check, X, Share2, Copy, Truck, Smartphone, Download, KeyRound, Fingerprint, ShieldAlert } from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const TG_BOT_TOKEN = "8968372156:AAHe6OHQZfdChPXS4wQDQ5omSA1DNIS6VEY";
const TG_CHAT_ID = "8740008890";

const sendTelegramNotification = (text) => {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'Markdown' })
  }).catch(() => {});
};

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'სმარტფონები', icon: 'Smartphone', parentId: null },
  { id: 'c2', name: 'ლეპტოპები', icon: 'Laptop', parentId: null },
  { id: 'c3', name: 'აქსესუარები', icon: 'Sparkles', parentId: null },
  { id: 'c4', name: 'ჭკვიანი საათები', icon: 'Watch', parentId: null }
];

const DEFAULT_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, status: 'აქტიური' },
  { id: 'v2', name: 'TechHub Georgia', commission: 10, status: 'აქტიური' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'GEO-IP15P',
    name: 'iPhone 15 Pro Max 256GB Titanium',
    category: 'სმარტფონები',
    brand: 'Apple',
    vendor: 'GEOSTORE ოფიციალური',
    priceGEL: 3899,
    oldPriceGEL: 4299,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით.',
    availableSizes: ['S', 'M', 'L', 'XL'],
    material: 'ტიტანი / კერამიკა',
    durability: 'IP68 Water Resistant'
  }
];

const DEFAULT_COUPONS = [
  { id: 'c1', code: 'GEOSTORE2026', discountPercent: 10, status: 'აქტიური' }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'n1', title: 'მოგესალმებით GEOSTORE-ში!', message: 'ისარგებლეთ 10% ფასდაკლებით პრომო-კოდით: GEOSTORE2026', date: 'დღეს', read: false },
  { id: 'n2', title: 'უფასო მიწოდება', message: 'მიწოდება თბილისის მასშტაბით სრულიად უფასოა!', date: 'გუშინ', read: false }
];

export default function App() {
  const loadSafeStorage = (key, fallback) => {
    try { 
      const item = localStorage.getItem(key); 
      if (item !== null) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (!Array.isArray(parsed) && parsed !== null) return parsed;
      }
      return fallback; 
    } catch { 
      return fallback; 
    }
  };

  const [siteSettings, setSiteSettings] = useState(() => loadSafeStorage('geostore_site_settings', {
    storeName: 'GEOSTORE',
    topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი',
    heroTitle: 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით',
    heroSubtitle: 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!'
  }));

  const [deliveryFees, setDeliveryFees] = useState(() => loadSafeStorage('geostore_delivery_fees', {
    tbilisi: 0,
    bigCities: 10,
    other: 15
  }));
  const [selectedRegion, setSelectedRegion] = useState('tbilisi');

  const [categories, setCategoriesList] = useState(() => loadSafeStorage('geostore_cats', DEFAULT_CATEGORIES));
  const [vendorsList, setVendorsList] = useState(() => loadSafeStorage('geostore_vendors', DEFAULT_VENDORS));
  const [products, setProducts] = useState(() => loadSafeStorage('geostore_products', DEFAULT_PRODUCTS));
  const [coupons, setCoupons] = useState(() => loadSafeStorage('geostore_coupons', DEFAULT_COUPONS));
  const [bannersList, setBannersList] = useState(() => loadSafeStorage('geostore_banners', []));
  const [notifications, setNotifications] = useState(() => loadSafeStorage('geostore_notifications', DEFAULT_NOTIFICATIONS));

  const [promoSlots] = useState([
    { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-emerald-600/30 to-teal-800/40' },
    { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-cyan-600/30 to-blue-800/40' },
    { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-green-600/30 to-emerald-900/40' }
  ]);

  const [activeTab, setActiveTab] = useState('store'); 

  // 🔒 უსაფრთხოების შემოწმება: ადმინ პანელი იხსნება მხოლოდ URL-ში ?admin=secret არსებობისას.
  // თავად AdminDashboardPro კომპონენტში კი ავტომატურად მოთხოვნილია ლოგინი (adminLoggedIn === false-ისას აჩვენებს იუზერის და პაროლის ფორმას).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'secret') {
      setActiveTab('admin');
    } else {
      if (activeTab === 'admin') {
        setActiveTab('store');
      }
    }
  }, [window.location.search]);

  const [selectedVendorFilter] = useState('ყველა');
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState(() => loadSafeStorage('geostore_cart', []));
  const [wishlist, setWishlist] = useState(() => loadSafeStorage('geostore_wishlist', []));
  const [comparisonList, setComparisonList] = useState(() => loadSafeStorage('geostore_comparison', []));

  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [usersList, setUsersList] = useState(() => loadSafeStorage('geostore_users_list', []));
  const [currentUser, setCurrentUser] = useState(() => loadSafeStorage('geostore_current_user', null));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });

  const [adminAuth] = useState({ username: "admin", password: "admin123" });
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    try { return localStorage.getItem('geostore_admin_remember') === 'true'; } catch { return false; }
  });
  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '', remember: false });
  const [adminError, setAdminError] = useState('');

  const [orders, setOrders] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [quickBuyProduct] = useState(null);
  
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
      } catch {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('🔔 ყველა შეტყობინება მონიშნულია წაკითხულად');
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.map(o => ({
          id: o.id,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('ka-GE') : 'დღეს',
          customerName: o.customer_name,
          user_email: o.user_email || '',
          phone: o.phone,
          address: o.address,
          totalGEL: Number(o.total_gel) || 0,
          status: o.status || 'ახალი',
          itemSummary: Array.isArray(o.items) ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'პროდუქტები'
        })));
      }
    } catch {}
  };

  const fetchProductsFromDatabase = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const formatted = data.map(p => ({
            id: p.id,
            sku: p.sku || `GEO-${p.id}`,
            name: p.name,
            category: p.category || 'სმარტფონები',
            priceGEL: Number(p.price_gel),
            oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
            stock: Number(p.stock) || 1,
            vendor: p.vendor || 'GEOSTORE',
            description: p.description || '',
            image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
            availableSizes: p.available_sizes || ['S', 'M', 'L', 'XL'],
            material: p.material || '',
            durability: p.durability || ''
          }));
          setProducts(formatted);
          localStorage.setItem('geostore_products', JSON.stringify(formatted));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
    fetchProductsFromDatabase();
    const interval = setInterval(() => {
      fetchOrders();
      fetchProductsFromDatabase();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch{} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch{} }, [currentUser]);
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch{} }, [products]);
  useEffect(() => { try { localStorage.setItem('geostore_cats', JSON.stringify(categories)); } catch{} }, [categories]);
  useEffect(() => { try { localStorage.setItem('geostore_vendors', JSON.stringify(vendorsList)); } catch{} }, [vendorsList]);
  useEffect(() => { try { localStorage.setItem('geostore_cart', JSON.stringify(cart)); } catch{} }, [cart]);
  useEffect(() => { try { localStorage.setItem('geostore_wishlist', JSON.stringify(wishlist)); } catch{} }, [wishlist]);
  useEffect(() => { try { localStorage.setItem('geostore_comparison', JSON.stringify(comparisonList)); } catch{} }, [comparisonList]);
  useEffect(() => { try { localStorage.setItem('geostore_coupons', JSON.stringify(coupons)); } catch{} }, [coupons]);
  useEffect(() => { try { localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings)); } catch{} }, [siteSettings]);
  useEffect(() => { try { localStorage.setItem('geostore_delivery_fees', JSON.stringify(deliveryFees)); } catch{} }, [deliveryFees]);
  useEffect(() => { try { localStorage.setItem('geostore_banners', JSON.stringify(bannersList)); } catch{} }, [bannersList]);
  useEffect(() => { try { localStorage.setItem('geostore_notifications', JSON.stringify(notifications)); } catch{} }, [notifications]);

  const cartSubtotalGEL = useMemo(() => {
    const itemsToCalc = quickBuyProduct ? [quickBuyProduct] : cart;
    return itemsToCalc.reduce((acc, item) => acc + (item.priceGEL * (item.quantity || 1)), 0);
  }, [cart, quickBuyProduct]);

  const currentDeliveryCost = useMemo(() => {
    if (selectedRegion === 'tbilisi') return deliveryFees.tbilisi;
    if (selectedRegion === 'bigCities') return deliveryFees.bigCities;
    return deliveryFees.other;
  }, [selectedRegion, deliveryFees]);

  const cartTotalGEL = useMemo(() => {
    const sub = appliedCoupon ? cartSubtotalGEL - (cartSubtotalGEL * appliedCoupon.discountPercent) / 100 : cartSubtotalGEL;
    return Math.max(0, sub) + currentDeliveryCost;
  }, [cartSubtotalGEL, appliedCoupon, currentDeliveryCost]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) return;

    const found = coupons.find(c => c.code.toUpperCase() === cleanCode && (c.status === 'აქტიური' || !c.status));
    if (found) {
      setAppliedCoupon(found);
      showToast(`🎉 პრომო-კოდი გააქტიურდა (-${found.discountPercent}%)!`);
      setPromoInput('');
    } else {
      alert('არასწორი ან გაუქმებული პრომო-კოდი!');
    }
  };

  const proAnalytics = useMemo(() => {
    const totalRevenueGEL = orders.reduce((acc, o) => acc + (Number(o.totalGEL) || 0), 0);
    return {
      totalRevenueGEL,
      netProfitGEL: totalRevenueGEL * 0.25,
      totalOrdersCount: orders.length,
      lowStockProducts: products.filter(p => p.stock <= 3)
    };
  }, [orders, products]);

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      return [...prev, { ...product, quantity }];
    });
    showToast(`🛒 "${product.name}" დაემატა კალათაში!`);
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast('წაიშალა სურვილების სიიდან');
        return prev.filter(item => item.id !== product.id);
      }
      showToast('❤️ დაემატა სურვილების სიაში!');
      return [...prev, product];
    });
  };

  const toggleComparison = (product) => {
    setComparisonList(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast('წაიშალა შედარების სიიდან');
        return prev.filter(item => item.id !== product.id);
      }
      if (prev.length >= 4) {
        alert('შედარებაში შესაძლებელია მაქსიმუმ 4 პროდუქტის დამატება!');
        return prev;
      }
      showToast('⚖️ დაემატა შედარების სიაში!');
      return [...prev, product];
    });
  };

  const handleShareWishlist = () => {
    if (wishlist.length === 0) {
      alert('სურვილების სია ცარიელია!');
      return;
    }
    const wishlistText = `🎁 ჩემი ფავორიტი პროდუქტების სია GEOSTORE-დან:\n` + 
      wishlist.map((w, idx) => `${idx + 1}. ${w.name} - ${w.priceGEL} ₾`).join('\n') + 
      `\n\nაღმოაჩინე საუკეთესო ტექნოლოგიები!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(wishlistText).then(() => {
        showToast('📋 სურვილების სიის ტექსტი დაკოპირდა ბუფერში!');
      }).catch(() => {
        alert(wishlistText);
      });
    } else {
      alert(wishlistText);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return;

    if (authMode === 'register') {
      if (!authForm.name || !authForm.phone) { alert('შეავსეთ ყველა ველი!'); return; }
      const newUser = { id: `u-${Date.now()}`, ...authForm, pinHash: null, hasPasskey: false };
      setUsersList([...usersList, newUser]);
      setCurrentUser(newUser);
      setIsAuthOpen(false);
      showToast('🎉 რეგისტრაცია წარმატებულია!');
    } else {
      const found = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (found) {
        setCurrentUser(found);
        setIsAuthOpen(false);
        showToast('🔑 ავტორიზაცია წარმატებულია!');
      } else {
        alert('არასწორი ელ-ფოსტა ან პაროლი!');
      }
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const savedUser = localStorage.getItem('geostore_admin_user') || adminAuth.username;
    const savedPass = localStorage.getItem('geostore_admin_pass') || adminAuth.password;

    if (adminLoginForm.username === savedUser && adminLoginForm.password === savedPass) {
      setAdminLoggedIn(true);
      setAdminError('');
      if (adminLoginForm.remember) localStorage.setItem('geostore_admin_remember', 'true');
      showToast('🔓 ადმინ პანელში შესვლა წარმატებულია!');
    } else {
      setAdminError('არასწორი მომხმარებელი ან პაროლი!');
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) return;
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsToOrder = quickBuyProduct ? [{ id: quickBuyProduct.id, name: quickBuyProduct.name, price: quickBuyProduct.priceGEL, quantity: 1 }] : cart.map(i => ({ id: i.id, name: i.name, price: i.priceGEL, quantity: i.quantity }));

    const regionText = selectedRegion === 'tbilisi' ? 'თბილისი / რუსთავი' : selectedRegion === 'bigCities' ? 'დიდი ქალაქები' : 'სხვა რეგიონები';

    const newOrderObj = {
      id: orderId,
      date: new Date().toLocaleDateString('ka-GE'),
      customer_name: checkoutForm.name,
      customerName: checkoutForm.name,
      phone: checkoutForm.phone,
      address: `${checkoutForm.address} (${regionText}, მიწოდება: ${currentDeliveryCost} ₾)`,
      user_email: currentUser ? currentUser.email : 'guest',
      items: itemsToOrder,
      totalGEL: cartTotalGEL,
      total_gel: cartTotalGEL,
      status: 'ახალი',
      itemSummary: itemsToOrder.map(i => `${i.name} (x${i.quantity})`).join(', ')
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: orderId,
          customer_name: checkoutForm.name,
          phone: checkoutForm.phone,
          address: `${checkoutForm.address} (${regionText}, მიწოდება: ${currentDeliveryCost} ₾)`,
          user_email: currentUser ? currentUser.email : 'guest',
          items: itemsToOrder,
          total_gel: cartTotalGEL,
          status: 'ახალი'
        })
      });

      if (!response.ok) {
        console.warn('Database write warning, saving locally.');
      }
    } catch (err) {
      console.warn('Network error, saving locally:', err);
    }

    setOrders(prev => [newOrderObj, ...(prev || [])]);
    try {
      const existingLocalOrders = JSON.parse(localStorage.getItem('geostore_local_orders') || '[]');
      localStorage.setItem('geostore_local_orders', JSON.stringify([newOrderObj, ...existingLocalOrders]));
    } catch {}

    sendTelegramNotification(`🚨 *ახალი შეკვეთა #${orderId}*\n👤 მყიდველი: ${checkoutForm.name}\n📞 ტელეფონი: ${checkoutForm.phone}\n📍 რეგიონი: ${regionText} (${currentDeliveryCost} ₾)\n💰 სულ თანხა: ${cartTotalGEL} ₾${appliedCoupon ? ` (პრომო: ${appliedCoupon.code})` : ''}`);
    
    setIsCheckoutOpen(false);
    setCart([]);
    setAppliedCoupon(null);
    showToast(`✅ შეკვეთა #${orderId} წარმატებით გაფორმდა!`);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ყველა' || p.category === selectedCategory;
      const matchesVendor = selectedVendorFilter === 'ყველა' || p.vendor === selectedVendorFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesVendor && matchesSearch;
    });
  }, [products, selectedCategory, selectedVendorFilter, searchQuery]);

  const formatPrice = (p) => `${p.toLocaleString('ka-GE')} ₾`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 flex flex-col justify-between w-full">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl border border-emerald-300 animate-bounce flex items-center gap-2.5 text-xs">
          {toastMessage}
        </div>
      )}

      <Header 
        siteSettings={siteSettings}
        setActiveTab={setActiveTab}
        wishlistCount={wishlist.length}
        cartCount={cart.reduce((a,b)=>a+b.quantity,0)}
        comparisonCount={comparisonList.length}
        currentUser={currentUser}
        setIsAuthOpen={setIsAuthOpen}
        setAuthMode={setAuthMode}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        setIsImageSearchOpen={setIsImageSearchOpen}
        setIsComparisonOpen={setIsComparisonOpen}
        setIsTrackerOpen={setIsTrackerOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        unreadNotificationsCount={unreadNotificationsCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleInstallClick={handleInstallClick}
      />

      {/* 🌟 AI გარდერობზე გადასვლის სწრაფი ღილაკი მთავარ მენიუში */}
      <div className="max-w-7xl mx-auto px-4 pt-4 w-full flex justify-end">
        <button 
          onClick={() => setActiveTab('wardrobe')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 shadow-lg cursor-pointer border ${activeTab === 'wardrobe' ? 'bg-emerald-400 text-slate-950 border-emerald-400' : 'bg-slate-900/80 text-emerald-400 border-emerald-500/30 hover:bg-slate-900'}`}
        >
          <Sparkles className="w-4 h-4" /> AI ციფრული გარდერობი
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-8">
        {activeTab === 'store' && (
          <StoreView 
            siteSettings={siteSettings}
            promoSlots={promoSlots}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredProducts={filteredProducts}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            comparisonList={comparisonList}
            toggleComparison={toggleComparison}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        )}

        {/* 🌟 AI ციფრული გარდერობის ვიუ */}
        {activeTab === 'wardrobe' && (
          <AIDigitalWardrobe 
            products={products}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        )}

        {/* 🔒 დაცული ადმინ პანელი (იხსნება მხოლოდ ?admin=secret URL პარამეტრით, შიგნით კი მოითხოვს ადმინ ავტორიზაციას) */}
        {activeTab === 'admin' && (
          <AdminDashboardPro 
            adminLoggedIn={adminLoggedIn}
            setAdminLoggedIn={setAdminLoggedIn}
            adminLoginForm={adminLoginForm || { username: '', password: '', remember: false }}
            setAdminLoginForm={setAdminLoginForm}
            handleAdminLogin={handleAdminLogin}
            adminError={adminError}
            proAnalytics={proAnalytics}
            orders={orders || []}
            setOrders={setOrders}
            usersList={usersList || []}
            setUsersList={setUsersList}
            products={products || []}
            setProducts={setProducts}
            vendorsList={vendorsList || []}
            setVendorsList={setVendorsList}
            coupons={coupons || []}
            setCoupons={setCoupons}
            categoriesList={categories}
            setCategoriesList={setCategoriesList} 
            bannersList={bannersList || []}
            setBannersList={setBannersList}
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
            formatPrice={formatPrice}
            deliveryFees={deliveryFees}
            setDeliveryFees={setDeliveryFees}
          />
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> სურვილების სია ({wishlist.length})
              </h2>
              {wishlist.length > 0 && (
                <button 
                  onClick={handleShareWishlist}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" /> სიის გაზიარება / კოპირება
                </button>
              )}
            </div>

            {wishlist.length === 0 ? <p className="text-slate-500 text-xs py-8">სია ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map(prod => (
                  <div key={prod.id} className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex items-center justify-between backdrop-blur-2xl shadow-xl">
                    <div className="flex items-center gap-3.5">
                      <img src={prod.image} alt="" className="w-16 h-16 object-contain bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800/80 shadow-inner" />
                      <div>
                        <h4 className="font-bold text-xs text-white line-clamp-1">{prod.name}</h4>
                        <p className="text-emerald-400 font-black text-xs mt-1">{formatPrice(prod.priceGEL)}</p>
                      </div>
                    </div>
                    <button onClick={() => addToCart(prod)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition cursor-pointer">კალათაში</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" /> საყიდლების კალათა
            </h2>
            {cart.length === 0 ? <p className="text-slate-500 text-xs py-8">კალათა ცარიელია.</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex justify-between items-center text-xs backdrop-blur-2xl shadow-xl">
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-white">{item.name}</h4>
                        <p className="text-emerald-400 font-bold">{formatPrice(item.priceGEL)} x {item.quantity}</p>
                      </div>
                      <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-rose-400 hover:text-rose-300 font-bold p-2 bg-rose-500/10 rounded-xl transition cursor-pointer">წაშლა</button>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-[2.5rem] h-fit space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs"><Truck className="w-3.5 h-3.5" /> მიწოდების რეგიონი</span>
                    <select 
                      value={selectedRegion}
                      onChange={e => setSelectedRegion(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-bold cursor-pointer"
                    >
                      <option value="tbilisi">თბილისი / რუსთავი ({deliveryFees.tbilisi} ₾)</option>
                      <option value="bigCities">დიდი ქალაქები - ქუთაისი, ბათუმი ({deliveryFees.bigCities} ₾)</option>
                      <option value="other">სხვა რეგიონები / მთიანი ზონა ({deliveryFees.other} ₾)</option>
                    </select>
                  </div>

                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs"><Tag className="w-3.5 h-3.5" /> პრომო-კოდი</span>
                    {appliedCoupon ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <b className="text-amber-300 uppercase">{appliedCoupon.code}</b>
                          <span className="text-emerald-400 block text-[10px]">(-{appliedCoupon.discountPercent}% ფასდაკლება)</span>
                        </div>
                        <button onClick={() => setAppliedCoupon(null)} className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="შეიყვანეთ კოდი (მაგ: GEOSTORE2026)" 
                          value={promoInput} 
                          onChange={e => setPromoInput(e.target.value)} 
                          className="flex-1 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                        />
                        <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer">გამოყენება</button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>ქვეჯამი:</span>
                      <span>{formatPrice(cartSubtotalGEL)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span>ფასდაკლება (-{appliedCoupon.discountPercent}%):</span>
                        <span>-{formatPrice((cartSubtotalGEL * appliedCoupon.discountPercent) / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>მიწოდება:</span>
                      <span>{currentDeliveryCost === 0 ? 'უფასო' : formatPrice(currentDeliveryCost)}</span>
                    </div>
                    <div className="text-xl font-black text-amber-400 flex justify-between items-center pt-2 border-t border-slate-800">
                      <span>სულ გადასახდელი:</span>
                      <span>{formatPrice(cartTotalGEL)}</span>
                    </div>
                  </div>

                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-xl shadow-emerald-500/20 transition cursor-pointer">შეკვეთის გაფორმება</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] space-y-4 text-xs shadow-2xl backdrop-blur-2xl">
              <h2 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-4">
                <User className="w-5 h-5 text-emerald-400" /> მომხმარებლის პროფილი
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-300 pt-2">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">სახელი</span>
                  <b className="text-white text-sm mt-1 block">{currentUser.name}</b>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">ელ-ფოსტა</span>
                  <b className="text-white text-sm mt-1 block truncate">{currentUser.email}</b>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">ტელეფონი</span>
                  <b className="text-white text-sm mt-1 block">{currentUser.phone}</b>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h3 className="font-black text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> უსაფრთხოება და სწრაფი შესვლა
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setIsAuthOpen(true)} 
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" /> 
                    {currentUser.pinHash ? 'PIN-კოდის მართვა / შეცვლა' : 'PIN-კოდის დაყენება'}
                  </button>
                  <button 
                    onClick={async () => {
                      if (!window.PublicKeyCredential) {
                        alert('თქვენი ბრაუზერი არ უზრუნველყოფს Passkeys-ს.');
                        return;
                      }
                      try {
                        const credential = await navigator.credentials.create({
                          publicKey: {
                            challenge: new Uint8Array([21,31,23,41,5,6,7,8]),
                            rp: { name: "GEOSTORE" },
                            user: {
                              id: Uint8Array.from(currentUser.email, c => c.charCodeAt(0)),
                              name: currentUser.email,
                              displayName: currentUser.name
                            },
                            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                            timeout: 60000,
                            authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }
                          }
                        });
                        if (credential) {
                          const updated = { ...currentUser, hasPasskey: true };
                          setCurrentUser(updated);
                          setUsersList(usersList.map(u => u.email === currentUser.email ? updated : u));
                          showToast('✅ Face ID / Passkey წარმატებით მიბმულია ანგარიშს!');
                        }
                      } catch {
                        alert('Passkey რეგისტრაციის შეცდომა ან გაუქმებულია.');
                      }
                    }}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer flex items-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    {currentUser.hasPasskey ? 'Face ID / Passkey აქტიურია (ხელახლა მიბმა)' : 'Face ID / Passkey-ს მიბმა'}
                  </button>
                </div>
              </div>

              <button onClick={() => { setCurrentUser(null); setActiveTab('store'); showToast('გახვედით პროფილიდან'); }} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl font-bold transition cursor-pointer mt-4">
                სისტემიდან გასვლა
              </button>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] space-y-4 text-xs shadow-2xl backdrop-blur-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-4">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> ჩემი შეკვეთების ისტორია
              </h3>

              <div className="space-y-3">
                {orders.filter(o => o.customerName === currentUser.name || o.user_email === currentUser.email).length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">თქვენ ჯერ არ გაქვთ გაფორმებული შეკვეთები.</p>
                ) : (
                  orders
                    .filter(o => o.customerName === currentUser.name || o.user_email === currentUser.email)
                    .map(order => (
                      <div key={order.id} className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-inner">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-400">#{order.id}</span>
                            <span className="text-slate-500 text-[10px]">({order.date})</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">📍 მისამართი: {order.address}</p>
                          <p className="text-slate-400 text-[11px]">📞 ტელეფონი: {order.phone}</p>
                        </div>
                        <div className="text-right flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto">
                          <span className="font-black text-white text-sm">{formatPrice(order.totalGEL)}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] font-bold mt-1">{order.status || 'ახალი'}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-6 z-50">
        <button onClick={() => setIsAiAssistantOpen(true)} className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black p-4 rounded-full shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2.5 group cursor-pointer border border-emerald-300/40">
          <div className="relative">
            <Bot className="w-6 h-6 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-slate-950 absolute -top-1 -right-1" />
          </div>
          <span className="hidden group-hover:inline text-xs font-black pr-1 tracking-tight">AI ასისტენტი</span>
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        {supportOpen ? (
          <div className="w-80 bg-slate-900/90 border border-slate-800/80 rounded-[2.5rem] shadow-2xl p-5 space-y-4 text-xs text-white backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-black flex items-center gap-2 text-emerald-400"><MessageSquare className="w-4 h-4" /> GEOSTORE მხარდაჭერა</h4>
              <button onClick={() => setSupportOpen(false)} className="text-slate-400 hover:text-white font-black text-sm cursor-pointer p-1">✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const name = e.target.cname.value;
              const email = e.target.cemail.value;
              const subject = e.target.csubject.value;
              const message = e.target.cmessage.value;
              if (!name || !message) return;
              const ticketId = `t-${Math.floor(1000 + Math.random() * 9000)}`;
              try {
                await fetch(`${SUPABASE_URL}/rest/v1/support_tickets`, {
                  method: 'POST',
                  headers: { ...headers, 'Prefer': 'return=representation' },
                  body: JSON.stringify({ id: ticketId, customer_name: name, email: email || 'guest@geostore.ge', subject: subject || 'ზოგადი კითხვა', message: message, status: 'ღია' })
                });
                alert('✅ თქვენი შეტყობინება წარმატებით გაეგზავნა ადმინისტრატორს! მალე გიპასუხებთ.');
                e.target.reset();
                setSupportOpen(false);
              } catch { alert('შეცდომა შეტყობინების გაგზავნისას.'); }
            }} className="space-y-3">
              <input type="text" name="cname" placeholder="თქვენი სახელი *" required className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <input type="email" name="cemail" placeholder="ელ-ფოსტა" className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <input type="text" name="csubject" placeholder="თემა (მაგ: შეკვეთა #102)" className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <textarea name="cmessage" rows="3" placeholder="დაწერეთ თქვენი კითხვა ან საჩივარი..." required className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 resize-none shadow-inner"></textarea>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">შეტყობინების გაგზავნა</button>
            </form>
          </div>
        ) : (
          <button onClick={() => setSupportOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-full shadow-2xl transition flex items-center gap-2 group cursor-pointer">
            <MessageSquare className="w-6 h-6" />
            <span className="hidden group-hover:inline text-xs pr-1">კონსულტაცია / ჩათი</span>
          </button>
        )}
      </div>

      <Modals 
        isCheckoutOpen={isCheckoutOpen}
        setIsCheckoutOpen={setIsCheckoutOpen}
        checkoutForm={checkoutForm}
        setCheckoutForm={setCheckoutForm}
        handlePlaceOrder={handlePlaceOrder}
        isAuthOpen={isAuthOpen}
        setIsAuthOpen={setIsAuthOpen}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        handleAuthSubmit={handleAuthSubmit}
        isTermsOpen={isTermsOpen}
        setIsTermsOpen={setIsTermsOpen}
        isWarrantyOpen={isWarrantyOpen}
        setIsWarrantyOpen={setIsWarrantyOpen}
        isTrackerOpen={isTrackerOpen}
        setIsTrackerOpen={setIsTrackerOpen}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        notifications={notifications}
        markAllNotificationsAsRead={markAllNotificationsAsRead}
        orders={orders}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        deliveryFees={deliveryFees}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        usersList={usersList}
        setUsersList={setUsersList}
      />

      <ImageSearchModal 
        isImageSearchOpen={isImageSearchOpen}
        setIsImageSearchOpen={setIsImageSearchOpen}
        products={products}
        addToCart={addToCart}
        formatPrice={formatPrice}
      />

      <AiAssistantModal 
        isAiAssistantOpen={isAiAssistantOpen}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        products={products}
        categories={categories}
        vendorsList={vendorsList}
        orders={orders}
        coupons={coupons}
        siteSettings={siteSettings}
        deliveryFees={deliveryFees}
        addToCart={addToCart}
        formatPrice={formatPrice}
      />

      <ProductCompareModal 
        isComparisonOpen={isComparisonOpen}
        setIsComparisonOpen={setIsComparisonOpen}
        comparisonList={comparisonList}
        setComparisonList={setComparisonList}
        addToCart={addToCart}
        formatPrice={formatPrice}
      />

      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d0d10] border border-amber-500/40 rounded-[2.5rem] p-7 max-w-md w-full space-y-5 text-xs text-white shadow-2xl relative">
            <button onClick={() => setShowInstallModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">GEOSTORE აპლიკაციის დაყენება</h3>
                <p className="text-[11px] text-slate-400">მიჰყევით მარტივ ინსტრუქციას:</p>
              </div>
            </div>
            <button onClick={() => setShowInstallModal(false)} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
              გასაგებია
            </button>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-900/80 py-8 text-center text-xs text-slate-500 mt-6 backdrop-blur-md space-y-3">
        <div className="flex justify-center items-center gap-6 text-slate-400 font-bold">
          <button onClick={() => setIsTermsOpen(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"><FileText className="w-4 h-4" /> წესები და პირობები</button>
          <span>•</span>
          <button onClick={() => setIsWarrantyOpen(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"><ShieldCheck className="w-4 h-4" /> საგარანტიო წესები</button>
        </div>
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
