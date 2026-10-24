import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, BookOpen, Image as ImageIcon, Bell, TrendingUp, BarChart2, PackageCheck, Upload, Bot, Gift, Cpu, CheckSquare, Zap, Compass, HelpCircle, Palette
} from 'lucide-react';

// ================= SUPABASE REST API CONFIG =================
const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// --- TELEGRAM CONFIG ---
const TG_BOT_TOKEN = "8968372156:AAHe6OHQZfdChPXS4wQDQ5omSA1DNIS6VEY";
const TG_CHAT_ID = "8740008890";

const sendTelegramNotification = (text) => {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    })
  }).catch(err => console.log("TG Error:", err));
};

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
    brand: 'Apple',
    priceGEL: 3899,
    oldPriceGEL: 4299,
    stock: 8,
    rating: 4.9,
    reviewsCount: 24,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'],
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით და ტიტანის კორპუსით. საუკეთესო კამერა, გეიმინგი და ბატარეის ხანგრძლივობა.',
    isHot: true,
    discountPercent: 10,
    warranty: '1 წელი',
    isPreOrder: false
  },
  {
    id: 'prod-2',
    sku: 'GEO-MBA-M3',
    name: 'MacBook Air 15" M3 16GB / 512GB',
    category: 'ლეპტოპები',
    brand: 'Apple',
    priceGEL: 4499,
    oldPriceGEL: 4899,
    stock: 4,
    rating: 5.0,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600'],
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით. იდეალურია პროგრამირებისთვის, დიზაინისთვის და სწავლისთვის. 18 საათამდე ავტონომიური მუშაობა.',
    isHot: true,
    discountPercent: 8,
    warranty: '1 წელი',
    isPreOrder: false
  },
  {
    id: 'prod-3',
    sku: 'GEO-AP-PRO2',
    name: 'AirPods Pro 2nd Gen USB-C',
    category: 'აქსესუარები',
    brand: 'Apple',
    priceGEL: 749,
    oldPriceGEL: 899,
    stock: 12,
    rating: 4.8,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=600'],
    description: 'ხმაურის აქტიური ჩახშობა (ANC), საუკეთესო ჟღერადობა მუსიკისთვის და ზარებისთვის.',
    isHot: false,
    discountPercent: 16,
    warranty: '1 წელი',
    isPreOrder: false
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
  { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-emerald-600/30 to-teal-800/40' },
  { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-cyan-600/30 to-blue-800/40' },
  { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-green-600/30 to-emerald-900/40' }
];

const INITIAL_COUPONS = [
  { code: 'GEO10', discountPercent: 10 },
  { code: 'SPRING20', discountPercent: 20 },
  { code: 'WELCOME5', discountPercent: 5 }
];

const INITIAL_POLICY = {
  general: 'წინამდებარე წესები და პოლიტიკა არეგულირებს GEOSTORE-ის ვებგვერდის გამოყენებასა და პროდუქციის შეძენის პირობებს.',
  delivery: 'მიწოდება ხორციელდება თბილისში 24 საათში, ხოლო რეგიონებში 48 საათში.',
  warranty: 'ყველა პროდუქტზე ვრცელდება 1 წლიანი ოფიციალური გარანტია.',
  privacy: 'GEOSTORE იცავს მომხმარებლის პერსონალურ მონაცემებს.'
};

export default function App() {
  const [currency, setCurrency] = useState('GEL'); 
  const [usdRate, setUsdRate] = useState(2.70);

  // Real Visitor Tracker
  const [visitorCount, setVisitorCount] = useState(() => {
    try {
      const current = Number(localStorage.getItem('geostore_visitors_count') || 1);
      const isSessionTracked = sessionStorage.getItem('geostore_session_tracked');
      if (!isSessionTracked) {
        const updated = current + 1;
        localStorage.setItem('geostore_visitors_count', updated.toString());
        sessionStorage.setItem('geostore_session_tracked', 'true');
        return updated;
      }
      return current;
    } catch {
      return 1;
    }
  });

  const loadSafeStorage = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const [siteSettings, setSiteSettings] = useState(() => loadSafeStorage('geostore_site_settings', {
    storeName: 'GEOSTORE',
    topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მაღაზია',
    supportPhone: '+995 32 200 00 00',
    heroTitle: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში',
    heroSubtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ Apple-ის პროდუქციაზე!',
    primaryColor: 'emerald', // emerald, blue, violet, amber
    popupAnnouncementActive: false,
    popupTitle: 'სპეციალური შეთავაზება!',
    popupText: 'გამოიწერეთ ჩვენი სიახლეები და მიიღეთ 10% ფასდაკლება პირველ შენაძენზე.'
  }));

  useEffect(() => {
    try { localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings)); } catch (e) {}
  }, [siteSettings]);

  const [storePolicy, setStorePolicy] = useState(() => loadSafeStorage('geostore_store_policy', INITIAL_POLICY));

  useEffect(() => {
    try { localStorage.setItem('geostore_store_policy', JSON.stringify(storePolicy)); } catch (e) {}
  }, [storePolicy]);

  const [adminAuth, setAdminAuth] = useState(() => loadSafeStorage('geostore_admin_auth', { username: "admin", password: "admin123" }));
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    try { return localStorage.getItem('geostore_admin_remember') === 'true'; } catch { return false; }
  });
  const [adminLoginForm, setAdminLoginForm] = useState(() => loadSafeStorage('geostore_admin_remember_creds', { username: '', password: '', remember: false }));
  const [adminSecurityForm, setAdminSecurityForm] = useState({ username: adminAuth.username, oldPassword: '', newPassword: '' });

  useEffect(() => {
    try { localStorage.setItem('geostore_admin_auth', JSON.stringify(adminAuth)); } catch (e) {}
  }, [adminAuth]);

  const [categories, setCategories] = useState(() => loadSafeStorage('geostore_cats', INITIAL_CATEGORIES));
  const [brandsList, setBrandsList] = useState(() => loadSafeStorage('geostore_brands', ['Apple', 'Samsung', 'Xiaomi', 'Sony', 'Asus', 'Acer']));
  const [products, setProducts] = useState(() => loadSafeStorage('geostore_products', INITIAL_PRODUCTS));
  const [banners, setBanners] = useState(() => loadSafeStorage('geostore_banners', INITIAL_BANNERS));
  const [promoSlots, setPromoSlots] = useState(() => loadSafeStorage('geostore_promos', INITIAL_PROMO_SLOTS));
  const [coupons, setCoupons] = useState(() => loadSafeStorage('geostore_coupons', INITIAL_COUPONS));
  
  const [sections, setSections] = useState(() => loadSafeStorage('geostore_sections', [
    { id: 'hero', name: 'მთავარი ბანერი', visible: true },
    { id: 'promos', name: 'პრომო ბლოკები', visible: true },
    { id: 'ticker', name: 'ცხელი შეთავაზებები (Ticker)', visible: true },
    { id: 'categories', name: 'კატეგორიების სექცია', visible: true },
    { id: 'products', name: 'პროდუქციის კატალოგი', visible: true },
    { id: 'badges', name: 'სანდოობის ბეჯები', visible: true },
    { id: 'faq', name: 'ხშირად დასმული კითხვები', visible: true }
  ]));

  const [activeTab, setActiveTab] = useState('store'); 
  const [adminError, setAdminError] = useState('');
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('analytics');
  const [showPopupModal, setShowPopupModal] = useState(() => siteSettings.popupAnnouncementActive);

  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', sku: '', category: '', brand: '', priceGEL: 0, oldPriceGEL: 0, discountPercent: 0, stock: 0, image: '', description: '', warranty: '', isPreOrder: false });

  // Uploaded Files State for New Product Form
  const [uploadedMainImg, setUploadedMainImg] = useState('');
  const [uploadedExtraImgs, setUploadedExtraImgs] = useState([]);

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

  // --- INNOVATIVE STATES ---
  const [comparisonList, setComparisonList] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // --- ENHANCED REAL-TIME KNOWLEDGE AI ASSISTANT STATES ---
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiBudget, setAiBudget] = useState(10000);
  const [aiCategory, setAiCategory] = useState('ყველა');
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის ჭკვიანი AI ასისტენტი. მე რეალურ დროში მაქვს წვდომა მაღაზიის ყველა პროდუქტზე, ფასზე, მარაგზე და წესებზე! მკითხეთ ნებისმიერი რამ პროდუქტზე, კატეგორიაზე ან საიტის პოლიტიკაზე.',
      recommendedProducts: []
    }
  ]);

  // --- ENHANCED GIFT QUIZ STATES ---
  const [isGiftQuizOpen, setIsGiftQuizOpen] = useState(false);
  const [giftStep, setGiftStep] = useState(1);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftAge, setGiftAge] = useState('');
  const [giftOccasion, setGiftOccasion] = useState('');
  const [giftInterest, setGiftInterest] = useState('');
  const [giftBudgetMax, setGiftBudgetMax] = useState(2500);
  const [giftQuizResults, setGiftQuizResults] = useState([]);

  const [priceAlertModal, setPriceAlertModal] = useState(null);
  const [alertEmail, setAlertEmail] = useState('');

  const [usersList, setUsersList] = useState(() => loadSafeStorage('geostore_users_list', [
    { id: 'u1', name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '599123456', password: '123', ordersCount: 1, totalSpentGEL: 3899, date: '2026-10-15' }
  ]));

  const [currentUser, setCurrentUser] = useState(() => loadSafeStorage('geostore_current_user', null));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState(() => loadSafeStorage('geostore_user_remembered', { name: '', phone: '', email: '', password: '', remember: false }));

  const [orders, setOrders] = useState([]);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatClientName, setChatClientName] = useState(() => {
    try { return localStorage.getItem('geostore_chat_client_name') || ''; } catch { return ''; }
  });
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientChatView, setClientChatView] = useState([]);
  const [adminChatArchive, setAdminChatArchive] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [adminSelectedClient, setAdminSelectedClient] = useState(null);
  const [adminIndividualReply, setAdminIndividualReply] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(o => ({
          id: o.id,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('ka-GE') : 'დღეს',
          customerName: o.customer_name,
          phone: o.phone,
          address: o.address,
          userEmail: o.user_email,
          items: o.items || [],
          totalGEL: o.total_gel,
          status: o.status || 'ახალი',
          courier: o.courier || ''
        }));
        setOrders(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=*&order=created_at.asc`, { headers });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(m => ({
          id: m.id,
          clientName: m.client_name,
          sender: m.sender,
          text: m.text,
          image: m.image,
          time: m.time
        }));
        setAdminChatArchive(formatted);
        if (chatClientName) {
          setClientChatView(formatted.filter(m => m.clientName === chatClientName || m.sender === 'bot'));
        } else {
          setClientChatView([
            { id: 1, sender: 'bot', text: 'გამარჯობა! რით შემიძლია დაგეხმაროთ GEOSTORE-ში?', time: '12:00', image: '' }
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMessages();
    const interval = setInterval(() => {
      fetchOrders();
      fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [chatClientName]);

  const handleManualRefresh = () => {
    fetchOrders();
    fetchMessages();
    showToast('🔄 მონაცემები წარმატებით განახლდა!');
  };

  useEffect(() => { try { localStorage.setItem('geostore_cats', JSON.stringify(categories)); } catch(e){} }, [categories]);
  useEffect(() => { try { localStorage.setItem('geostore_brands', JSON.stringify(brandsList)); } catch(e){} }, [brandsList]);
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch(e){} }, [products]);
  useEffect(() => { try { localStorage.setItem('geostore_banners', JSON.stringify(banners)); } catch(e){} }, [banners]);
  useEffect(() => { try { localStorage.setItem('geostore_promos', JSON.stringify(promoSlots)); } catch(e){} }, [promoSlots]);
  useEffect(() => { try { localStorage.setItem('geostore_coupons', JSON.stringify(coupons)); } catch(e){} }, [coupons]);
  useEffect(() => { try { localStorage.setItem('geostore_sections', JSON.stringify(sections)); } catch(e){} }, [sections]);
  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch(e){} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch(e){} }, [currentUser]);

  const formatPrice = (priceInGEL) => {
    if (currency === 'USD') {
      return `$${(priceInGEL / usdRate).toFixed(2)}`;
    }
    return `${priceInGEL.toLocaleString('ka-GE')} ₾`;
  };

  const cartSubtotalGEL = useMemo(() => cart.reduce((acc, item) => acc + (item.priceGEL * item.quantity), 0), [cart]);
  const discountAmountGEL = useMemo(() => appliedCoupon ? (cartSubtotalGEL * appliedCoupon.discountPercent) / 100 : 0, [cartSubtotalGEL, appliedCoupon]);
  const cartTotalGEL = cartSubtotalGEL - discountAmountGEL;

  const salesAnalytics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'ჩაბარებულია');
    const totalRevenueGEL = completedOrders.reduce((acc, o) => acc + (Number(o.totalGEL) || 0), 0);
    
    let totalItemsSold = 0;
    const soldItemsMap = {};

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const qty = Number(item.quantity) || 1;
        totalItemsSold += qty;
        if (!soldItemsMap[item.name]) {
          soldItemsMap[item.name] = { name: item.name, count: 0, totalRevenue: 0 };
        }
        soldItemsMap[item.name].count += qty;
        soldItemsMap[item.name].totalRevenue += (Number(item.price) || 0) * qty;
      });
    });

    const topProducts = Object.values(soldItemsMap).sort((a, b) => b.count - a.count);

    return {
      completedOrdersCount: completedOrders.length,
      totalOrdersCount: orders.length,
      totalRevenueGEL,
      totalItemsSold,
      topProducts,
      averageOrderValue: completedOrders.length > 0 ? (totalRevenueGEL / completedOrders.length).toFixed(2) : 0
    };
  }, [orders]);

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

  const toggleComparison = (product) => {
    setComparisonList(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast('ამოიღეთ შედარების სიიდან');
        return prev.filter(item => item.id !== product.id);
      } else {
        if (prev.length >= 3) {
          showToast('⚠️ შედარებაში მაქსიმუმ 3 პროდუქტია შესაძლებელი');
          return prev;
        }
        showToast('⚔️ დაემატა შედარებაში');
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

  const handlePlaceOrder = async (itemsToOrder, totalVal, isExpress = false) => {
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert('⚠️ გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsData = itemsToOrder.map(i => ({ id: i.id, name: i.name, price: i.priceGEL, quantity: i.quantity || 1 }));

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: orderId,
          customer_name: checkoutForm.name,
          phone: checkoutForm.phone,
          address: checkoutForm.address,
          user_email: currentUser ? currentUser.email : 'guest',
          items: itemsData,
          total_gel: totalVal,
          status: 'ახალი',
          courier: 'არ არის დანიშნული'
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        alert("❌ Supabase შეკვეთის შეცდომა: " + errData);
        return;
      }

      setProducts(prevProducts => {
        return prevProducts.map(p => {
          const orderedItem = itemsToOrder.find(item => item.id === p.id);
          if (orderedItem) {
            const newStock = Math.max(0, p.stock - (orderedItem.quantity || 1));
            return { ...p, stock: newStock };
          }
          return p;
        });
      });

      sendTelegramNotification(
        `🚨 *ახალი შეკვეთა გაფორმდა!* (#${orderId})\n\n` +
        `👤 *მყიდველი:* ${checkoutForm.name}\n` +
        `📞 *ტელეფონი:* ${checkoutForm.phone}\n` +
        `📍 *მისამართი:* ${checkoutForm.address}\n` +
        `💰 *სულ თანხა:* ${totalVal} ₾\n\n` +
        `📦 *პროდუქტები:*\n${itemsData.map(i => `- ${i.name} (${i.quantity} ც.)`).join('\n')}`
      );

      setIsCheckoutOpen(false);
      setQuickBuyProduct(null);
      if (!isExpress) setCart([]);
      setAppliedCoupon(null);
      showToast('✅ შეკვეთა წარმატებით გაფორმდა!');
      fetchOrders();
    } catch (err) {
      alert("❌ ქსელის შეცდომა შეკვეთისას: " + err.message);
    }
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
        try { localStorage.setItem('geostore_user_remembered', JSON.stringify({ email: authForm.email, password: authForm.password, remember: true })); } catch(e){}
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
          try { localStorage.setItem('geostore_user_remembered', JSON.stringify({ email: authForm.email, password: authForm.password, remember: true })); } catch(e){}
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
        try { localStorage.setItem('geostore_admin_remember_creds', JSON.stringify(adminLoginForm)); } catch(e){}
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
    const headersList = ['Order ID', 'Date', 'Customer', 'Phone', 'Total GEL', 'Status'];
    const rows = orders.map(o => [o.id, o.date, `"${o.customerName}"`, o.phone, o.totalGEL, o.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headersList.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `GEOSTORE_Orders.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedClients = useMemo(() => {
    const map = {};
    adminChatArchive.forEach(m => {
      const name = m.clientName || 'სტუმარი';
      if (!map[name]) map[name] = [];
      map[name].push(m);
    });
    return map;
  }, [adminChatArchive]);

  const handleSendMessage = async (text, senderName, imageUrl = '') => {
    if (!text.trim() && !imageUrl) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: Date.now(),
          client_name: chatClientName || 'სტუმარი',
          sender: senderName,
          text: text || 'ფოტო:',
          image: imageUrl,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        alert("❌ Supabase მესიჯის შეცდომა: " + errData);
        return;
      }

      if (senderName !== 'ადმინი') {
        sendTelegramNotification(`💬 *ახალი მესიჯი ჩათში!*\n👤 *${chatClientName || 'სტუმარი'}:* ${text || 'ფოტო'}`);
      }
      setChatInput('');
      setAdminIndividualReply('');
      fetchMessages();
    } catch (err) {
      alert("❌ ქსელის შეცდომა მესიჯისას: " + err.message);
    }
  };

  const handleMainImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUploadedMainImg(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtraImagesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const loadedImgs = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          loadedImgs.push(evt.target.result);
          if (loadedImgs.length === files.length) {
            setUploadedExtraImgs(prev => [...prev, ...loadedImgs]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // ================= 100% BULLETPROOF AI ASSISTANT ENGINE =================
  const handleAiAsk = (customQuestion = null) => {
    const queryRaw = (customQuestion || aiInputText).trim();
    const queryLower = queryRaw.toLowerCase();

    const userMsg = { 
      sender: 'user', 
      text: queryRaw || `ბიუჯეტი: ${aiBudget}₾, კატეგორია: ${aiCategory}` 
    };

    // 0. Greetings / Small Talk Detection
    const greetingKeywords = ['გამარჯობა', 'გარმარჯობა', 'სალამი', 'hi', 'hello', 'როგორ ხარ', 'ვინ ხარ', 'რისი გაკეთება შეგიძლია'];
    const isGreeting = greetingKeywords.some(k => queryLower === k || (queryLower.includes(k) && queryLower.length < 15));

    if (isGreeting) {
      const aiGreetingMsg = {
        sender: 'ai',
        text: `გამარჯობა! 👋 მე ვარ ${siteSettings.storeName}-ის ჭკვიანი AI ასისტენტი. სიამოვნებით დაგეხმარებით პროდუქტების შერჩევაში, ფასების ნახვაში ან საიტის წესებისა და პოლიტიკის (მიწოდება, გარანტია) გაცნობაში. რით შემიძლია დაგეხმაროთ დღეს?`,
        recommendedProducts: []
      };
      setAiChatHistory(prev => [...prev, userMsg, aiGreetingMsg]);
      setAiInputText('');
      return;
    }

    // 1. Policy & Dynamic Site Info Intent
    const policyKeywords = ['წესი', 'წესები', 'პოლიტიკა', 'მიწოდება', 'მიტანა', 'გარანტია', 'დაბრუნება', 'კონფიდენციალურობა', 'პირობები'];
    const isPolicyAsk = policyKeywords.some(k => queryLower.includes(k));

    if (isPolicyAsk) {
      let policyReply = `📜 **${siteSettings.storeName}-ის მიმდინარე წესები და პოლიტიკა:**\n\n`;
      if (queryLower.includes('მიწოდება') || queryLower.includes('მიტანა')) {
        policyReply += `🚚 **მიწოდების პირობები:** ${storePolicy.delivery}`;
      } else if (queryLower.includes('გარანტია')) {
        policyReply += `🛡️ **გარანტიის პირობები:** ${storePolicy.warranty}`;
      } else if (queryLower.includes('დაბრუნება')) {
        policyReply += `🔄 **დაბრუნების პირობები:** ${storePolicy.warranty}`;
      } else {
        policyReply += `1️⃣ **ზოგადი:** ${storePolicy.general}\n\n2️⃣ **მიწოდება:** ${storePolicy.delivery}\n\n3️⃣ **გარანტია:** ${storePolicy.warranty}\n\n4️⃣ **კონფიდენციალურობა:** ${storePolicy.privacy}`;
      }

      const aiMsg = {
        sender: 'ai',
        text: policyReply,
        recommendedProducts: []
      };

      setAiChatHistory(prev => [...prev, userMsg, aiMsg]);
      setAiInputText('');
      return;
    }

    // 2. Flexible Product Intent Search (Smart Matching)
    let extractedMaxPrice = aiBudget;
    const priceMatch = queryLower.match(/(\d+)\s*(ლარი|₾|gel|ლარამდე)?/);
    if (priceMatch && Number(priceMatch[1]) > 50) {
      extractedMaxPrice = Number(priceMatch[1]);
    }

    let targetCategory = null;

    const phoneKeywords = ['ტელეფონი', 'სმარტფონი', 'მობილური', 'აიფონი', 'iphone', 'samsung', 'xiaomi', 'phone'];
    const laptopKeywords = ['ლეპტოპი', 'ნოუთბუქი', 'კომპიუტერი', 'მაქბუქი', 'macbook', 'laptop', 'asus', 'acer'];
    const accessoryKeywords = ['ყურსასმენი', 'აირპოდსი', 'airpods', 'აქსესუარი', 'headphone', 'case', 'დამტენი'];
    const watchKeywords = ['საათი', 'ჭკვიანი საათი', 'watch', 'apple watch'];
    const tvKeywords = ['ტელევიზორი', 'tv', 'television'];
    const tabletKeywords = ['პლანშეტი', 'tablet', 'ipad'];

    if (phoneKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'სმარტფონები';
    } else if (laptopKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'ლეპტოპები';
    } else if (accessoryKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'აქსესუარები';
    } else if (watchKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'ჭკვიანი საათები';
    } else if (tvKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'ტელევიზორები';
    } else if (tabletKeywords.some(k => queryLower.includes(k))) {
      targetCategory = 'სმარტფონები'; 
    } else if (aiCategory !== 'ყველა') {
      targetCategory = aiCategory;
    }

    let matched = products.filter(p => {
      if (targetCategory && p.category !== targetCategory) {
        return false;
      }
      return true;
    });

    if (matched.length === 0) {
      matched = products;
    }

    let aiAnswer = `📱 მოვიძიე საუკეთესო პროდუქტები თქვენი მოთხოვნის შესაბამისად:`;
    if (targetCategory) {
      aiAnswer = `📱 მოვიძიე ${targetCategory} კატეგორიის საუკეთესო მოდელები:`;
    }

    const aiMsg = {
      sender: 'ai',
      text: aiAnswer,
      recommendedProducts: matched.slice(0, 4)
    };

    setAiChatHistory(prev => [...prev, userMsg, aiMsg]);
    setAiInputText('');
  };

  // Color Theme classes mapper
  const getThemeAccentClass = () => {
    switch(siteSettings.primaryColor) {
      case 'blue': return 'bg-blue-500 text-slate-950 border-blue-400';
      case 'violet': return 'bg-violet-500 text-slate-950 border-violet-400';
      case 'amber': return 'bg-amber-500 text-slate-950 border-amber-400';
      default: return 'bg-emerald-500 text-slate-950 border-emerald-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-24 md:pb-0 selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between">
      
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl border border-emerald-300 animate-bounce flex items-center gap-2 text-xs md:text-sm">
          <Sparkles className="w-5 h-5 text-slate-950" />
          {toastMessage}
        </div>
      )}

      {/* POPUP ANNOUNCEMENT MODAL */}
      {showPopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl relative animate-scaleUp">
            <button onClick={() => setShowPopupModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold">✕</button>
            <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-white">{siteSettings.popupTitle}</h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">{siteSettings.popupText}</p>
            <button onClick={() => setShowPopupModal(false)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-lg">
              გასაგებია, მადლობა!
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] md:text-xs py-1.5 px-4 font-black flex justify-between items-center">
          <div className="flex items-center gap-2 truncate">
            <span>🇬🇪</span>
            <span className="truncate">{siteSettings.topBarText}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setIsAiAssistantOpen(true)} 
              className="bg-slate-950 text-emerald-400 hover:text-white hover:bg-slate-900 px-3 py-1 rounded-xl text-[10px] md:text-xs flex items-center gap-1.5 font-black border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse transition transform hover:scale-105"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>🤖 AI ასისტენტი</span>
            </button>

            <button 
              onClick={() => setIsGiftQuizOpen(true)} 
              className="bg-slate-950 text-teal-300 hover:text-white hover:bg-slate-900 px-3 py-1 rounded-xl text-[10px] md:text-xs flex items-center gap-1.5 font-black border-2 border-teal-400/60 shadow-lg transition transform hover:scale-105"
            >
              <Gift className="w-4 h-4 text-teal-300" />
              <span>🎁 საჩუქრის ქვიზი</span>
            </button>

            <button onClick={handleManualRefresh} className="bg-slate-950/80 hover:bg-slate-950 px-2.5 py-0.5 rounded-lg text-emerald-400 text-[10px] flex items-center gap-1 font-bold border border-emerald-500/30 transition">
              <RefreshCw className="w-3 h-3 animate-spin" /> განახლება
            </button>

            <button 
              onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')}
              className="bg-slate-950/80 hover:bg-slate-950 px-2.5 py-0.5 rounded-full border border-emerald-400/40 transition flex items-center gap-1 font-black text-emerald-300 text-[10px]"
            >
              <span>{currency === 'GEL' ? '₾ GEL' : '$ USD'}</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3 md:gap-6 w-full">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setActiveTab('store')}>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-xl text-slate-950 group-hover:scale-105 transition transform">
              {siteSettings.storeName ? siteSettings.storeName.charAt(0) : 'G'}
            </div>
            <span className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
              {siteSettings.storeName}
            </span>
          </div>

          <div className="flex-1 max-w-md relative hidden md:block">
            <input
              type="text"
              placeholder="ძებნა: iPhone, MacBook, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/30 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400 shadow-inner"
            />
            <Search className="w-4 h-4 text-emerald-400 absolute left-4 top-3.5" />
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => setIsComparisonOpen(true)}
              className="p-3 rounded-2xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
              title="პროდუქტების შედარება"
            >
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              {comparisonList.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {comparisonList.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('wishlist')}
              className="p-3 rounded-2xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
            >
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {wishlist.length}
                </span>
              )}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 transition">
                <User className="w-4 h-4" /> {currentUser.name}
              </button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200 hover:border-emerald-500/50 transition">
                <User className="w-4 h-4" /> შესვლა / რეგისტრაცია
              </button>
            )}

            <button 
              onClick={() => setActiveTab('cart')}
              className="p-3 rounded-2xl border relative bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-400 transition"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`p-3 rounded-2xl border transition flex items-center gap-2 shadow-lg ${
                activeTab === 'admin' ? 'bg-emerald-500 text-slate-950 font-black border-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-bold">ადმინი</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        
        {activeTab === 'store' && (
          <div className="space-y-10">
            {sections.filter(s => s.visible).map(sec => {
              if (sec.id === 'hero') {
                return (
                  <div key={sec.id} className="relative rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                      <div className="p-8 md:p-14 z-10 space-y-5">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400 text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> სპეც შეთავაზება & AI ტექნოლოგია
                        </span>
                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                          {siteSettings.heroTitle}
                        </h1>
                        <p className="text-slate-300 text-xs md:text-base leading-relaxed">
                          {siteSettings.heroSubtitle}
                        </p>
                        
                        <div className="flex flex-wrap gap-3 pt-3">
                          <button 
                            onClick={() => setIsAiAssistantOpen(true)} 
                            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-xl hover:scale-105 transition transform flex items-center gap-2 text-xs md:text-sm"
                          >
                            <Bot className="w-5 h-5 text-slate-950" />
                            <span>🤖 ჰკითხე AI ასისტენტს არჩევანი</span>
                          </button>

                          <button 
                            onClick={() => setIsGiftQuizOpen(true)} 
                            className="bg-slate-950 border-2 border-teal-400/80 text-teal-300 hover:text-white font-black px-5 py-3.5 rounded-2xl hover:bg-slate-900 transition flex items-center gap-2 text-xs md:text-sm shadow-lg"
                          >
                            <Gift className="w-5 h-5 text-teal-300" />
                            <span>🎁 საჩუქრის არჩევა ქვიზით</span>
                          </button>
                        </div>
                      </div>
                      <div className="relative h-60 md:h-96 w-full">
                        <img src={banners[0]?.image} alt="Hero" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-transparent to-transparent"></div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'promos') {
                return (
                  <div key={sec.id} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {promoSlots.map(slot => (
                      <div key={slot.id} className={`rounded-3xl p-6 bg-gradient-to-br ${slot.bgGradient} border border-emerald-500/20 hover:border-emerald-500/40 transition shadow-xl flex flex-col justify-between backdrop-blur-md`}>
                        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 self-start text-[10px] font-black px-3 py-1 rounded-full">{slot.tag}</span>
                        <h3 className="text-lg font-extrabold text-white mt-8">{slot.title}</h3>
                      </div>
                    ))}
                  </div>
                );
              }

              if (sec.id === 'ticker') {
                return (
                  <div key={sec.id} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-white text-xs md:text-base">⚡ FLASH SALE - დღის ცხელი შეთავაზებები</h4>
                        <p className="text-[10px] md:text-xs text-slate-400">ფასდაკლებები მოქმედებს შეზღუდული რაოდენობით!</p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'categories') {
                return (
                  <div key={sec.id} className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                      <Grid className="w-5 h-5 text-emerald-400" /> კატეგორიები
                    </h2>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                      <button
                        onClick={() => setSelectedCategory('ყველა')}
                        className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition border ${
                          selectedCategory === 'ყველა' ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        ✨ ყველა
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id || cat}
                          onClick={() => setSelectedCategory(cat.name || cat)}
                          className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition border ${
                            selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
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
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-emerald-400" /> პროდუქციის კატალოგი
                      </h2>
                      <div className="flex gap-2">
                        {comparisonList.length > 0 && (
                          <button onClick={() => setIsComparisonOpen(true)} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-500/40 transition">
                            შედარება ({comparisonList.length})
                          </button>
                        )}
                        <button onClick={handleManualRefresh} className="bg-slate-900 hover:bg-slate-800 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-800 transition">
                          <RefreshCw className="w-3.5 h-3.5" /> განახლება
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map(prod => {
                        const isWish = wishlist.some(w => w.id === prod.id);
                        const isCompared = comparisonList.some(c => c.id === prod.id);
                        const monthlyInstallment = Math.round(prod.priceGEL / 12);

                        return (
                          <div key={prod.id} className="bg-slate-900 border border-emerald-500/20 hover:border-emerald-400/60 rounded-3xl p-4 flex flex-col justify-between group transition duration-300 shadow-xl">
                            <div>
                              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 mb-4 p-4 flex items-center justify-center border border-slate-800">
                                <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" />
                                {prod.discountPercent > 0 && (
                                  <span className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shadow-lg">
                                    -{prod.discountPercent}%
                                  </span>
                                )}
                                {prod.isPreOrder && (
                                  <span className="absolute top-3 left-16 bg-blue-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-lg">
                                    PRE-ORDER
                                  </span>
                                )}
                                <div className="absolute top-3 right-3 flex flex-col gap-2">
                                  <button onClick={() => toggleWishlist(prod)} className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-full text-white border border-slate-800 transition" title="სურვილებში">
                                    <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                                  </button>
                                  <button onClick={() => toggleComparison(prod)} className={`p-2.5 rounded-full border transition ${isCompared ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-950/80 text-cyan-400 border-slate-800'}`} title="შედარებაში დამატება">
                                    <CheckSquare className="w-4 h-4" />
                                  </button>
                                </div>
                                <button onClick={() => setSelectedProductQuickView(prod)} className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition duration-300 bg-slate-950 text-emerald-400 text-[10px] font-bold px-3.5 py-1.5 rounded-xl border border-emerald-500/40">
                                  <Eye className="w-3 h-3 inline mr-1" /> სწრაფი ნახვა
                                </button>
                              </div>
                              
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{prod.category} {prod.brand ? `• ${prod.brand}` : ''}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${prod.stock < 3 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                  {prod.stock > 0 ? `მარაგშია: ${prod.stock} ც.` : 'ამოიწურა'}
                                </span>
                              </div>

                              <h3 className="font-bold text-white text-sm md:text-base mb-1 line-clamp-2">{prod.name}</h3>
                              <p className="text-[11px] text-teal-400 font-semibold mb-3">💳 განვადება: თვეში ~{monthlyInstallment} ₾-დან</p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="text-xl font-black text-emerald-400">{formatPrice(prod.priceGEL)}</div>
                                  {prod.oldPriceGEL > prod.priceGEL && (
                                    <div className="text-xs text-slate-500 line-through font-medium">{formatPrice(prod.oldPriceGEL)}</div>
                                  )}
                                </div>
                                {prod.stock <= 0 && (
                                  <button onClick={() => setPriceAlertModal(prod)} className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold">
                                    <Bell className="w-3 h-3" /> შემატყობინე
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button disabled={prod.stock <= 0} onClick={() => addToCart(prod)} className={`py-2.5 rounded-xl text-xs font-black transition ${prod.stock > 0 ? 'bg-emerald-500 text-slate-950 shadow-md hover:bg-emerald-400' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
                                  {prod.stock > 0 ? (prod.isPreOrder ? 'Pre-Order' : 'კალათაში') : 'არ არის'}
                                </button>
                                <button disabled={prod.stock <= 0} onClick={() => { setQuickBuyProduct(prod); setIsCheckoutOpen(true); }} className={`py-2.5 rounded-xl text-xs font-black border transition ${prod.stock > 0 ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:bg-slate-900' : 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'}`}>
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
                      <Truck className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div><h4 className="font-bold text-white text-xs">სწრაფი მიწოდება</h4><p className="text-[10px] text-slate-400">მთელ საქართველოში</p></div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
                      <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div><h4 className="font-bold text-white text-xs">1 წლიანი გარანტია</h4><p className="text-[10px] text-slate-400">ოფიციალური სერვისი</p></div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'faq') {
                return (
                  <div key={sec.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
                    <h2 className="text-xl font-black text-white">ხშირად დასმული კითხვები</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                      <div>
                        <h4 className="font-bold text-emerald-400 text-sm mb-1">როგორ ხდება მიწოდება?</h4>
                        <p className="text-slate-400">{storePolicy.delivery}</p>
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-400 text-sm mb-1">მოქმედებს თუ არა გარანტია?</h4>
                        <p className="text-slate-400">{storePolicy.warranty}</p>
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
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 space-y-6 text-xs md:text-sm leading-relaxed shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <BookOpen className="w-7 h-7 text-emerald-400" />
              <h2 className="text-xl md:text-2xl font-black text-white">წესები და პოლიტიკა</h2>
            </div>
            
            <div className="space-y-5 text-slate-300">
              <div>
                <h3 className="font-bold text-emerald-400 text-sm mb-1">1. ზოგადი დებულებები</h3>
                <p>{storePolicy.general}</p>
              </div>

              <div>
                <h3 className="font-bold text-emerald-400 text-sm mb-1">2. შეკვეთა და მიწოდება</h3>
                <p>{storePolicy.delivery}</p>
              </div>

              <div>
                <h3 className="font-bold text-emerald-400 text-sm mb-1">3. გარანტია და დაბრუნება</h3>
                <p>{storePolicy.warranty}</p>
              </div>

              <div>
                <h3 className="font-bold text-emerald-400 text-sm mb-1">4. კონფიდენციალურობა</h3>
                <p>{storePolicy.privacy}</p>
              </div>
            </div>

            <button onClick={() => setActiveTab('store')} className="bg-emerald-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg">
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
                  <div key={prod.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                    <img src={prod.image} alt="" className="w-16 h-16 object-contain bg-slate-950 rounded-xl p-1 border border-slate-800" />
                    <div>
                      <h4 className="font-bold text-xs">{prod.name}</h4>
                      <p className="text-emerald-400 font-black text-xs mt-1">{formatPrice(prod.priceGEL)}</p>
                      <button onClick={() => addToCart(prod)} className="mt-2 bg-emerald-500 text-slate-950 px-3 py-1 rounded-lg text-xs font-bold">კალათაში</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-xl mx-auto bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-4 text-xs md:text-sm shadow-2xl">
            <h2 className="text-xl font-black text-white">👤 მომხმარებლის პროფილი</h2>
            <p><b>სახელი:</b> {currentUser.name}</p>
            <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p><b>ტელეფონი:</b> {currentUser.phone}</p>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="font-bold text-sm text-slate-200 mb-2">📦 ჩემი შეკვეთების ისტორია</h3>
              {orders.filter(o => o.userEmail === currentUser.email).length === 0 ? (
                <p className="text-slate-500">შეკვეთები არ არის.</p>
              ) : (
                <div className="space-y-2">
                  {orders.filter(o => o.userEmail === currentUser.email).map(o => (
                    <div key={o.id} className="p-3 bg-slate-950 rounded-xl flex justify-between items-center border border-slate-800">
                      <div>
                        <p className="font-bold text-emerald-400">#{o.id} ({o.date}) - <span className="text-emerald-400">{o.status}</span></p>
                        <p className="text-slate-400">{o.items?.map(i => i.name).join(', ')}</p>
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
                    <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-xs md:text-sm text-white">{item.name}</h4>
                        <p className="text-emerald-400 font-bold mt-1">{formatPrice(item.priceGEL)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-bold">-</button>
                        <span className="font-bold px-2">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2.5 py-1 bg-slate-800 rounded-lg text-white font-bold">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="text-rose-400 ml-3 font-bold">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl h-fit space-y-4 shadow-xl">
                  <div className="flex gap-2">
                    <input type="text" placeholder="პრომო კოდი" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs flex-1 uppercase text-white outline-none" />
                    <button onClick={applyCouponCode} className="bg-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-white">გამოყენება</button>
                  </div>
                  <div className="text-xl font-black text-emerald-400">სულ: {formatPrice(cartTotalGEL)}</div>
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-lg">შეკვეთა</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN PANEL ================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!adminLoggedIn ? (
              <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 text-center shadow-2xl">
                <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
                <h2 className="text-lg font-bold text-white">ადმინისტრატორის შესვლა</h2>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="მომხმარებლის სახელი" 
                    value={adminLoginForm.username} 
                    onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" 
                  />
                  <input 
                    type="password" 
                    placeholder="პაროლი" 
                    value={adminLoginForm.password} 
                    onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" 
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      id="adminRemember"
                      checked={adminLoginForm.remember} 
                      onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
                      className="rounded accent-emerald-500"
                    />
                    <label htmlFor="adminRemember" className="cursor-pointer">მომიმახსოვრე სისტემაში</label>
                  </div>
                  {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-xs transition shadow-lg">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 overflow-x-auto scrollbar-none shadow-lg">
                  <div className="flex gap-2">
                    {[
                      { id: 'analytics', label: '📊 სტატისტიკა' },
                      { id: 'orders', label: '📦 შეკვეთები' },
                      { id: 'adminChat', label: '💬 ჩათები' },
                      { id: 'categories', label: 'კატეგორიები' },
                      { id: 'brands', label: '🏷️ ბრენდები' },
                      { id: 'products', label: 'პროდუქცია' },
                      { id: 'banners', label: 'ბანერები' },
                      { id: 'builder', label: 'Page Builder' },
                      { id: 'crm', label: 'CRM' },
                      { id: 'coupons', label: 'პრომოები' },
                      { id: 'security', label: 'უსაფრთხოება' },
                      { id: 'cms', label: 'საიტის CMS' },
                      { id: 'policyEditor', label: '📜 წესები' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setAdminActiveSubTab(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          adminActiveSubTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={handleManualRefresh} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> განახლება
                    </button>
                    <button onClick={handleAdminLogout} className="bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                  </div>
                </div>

                {adminActiveSubTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                          <span>💰 რეალური შემოსავალი</span>
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black text-emerald-400 mt-2">{salesAnalytics.totalRevenueGEL.toLocaleString('ka-GE')} ₾</div>
                        <p className="text-[10px] text-slate-500 mt-1">მხოლოდ ჩაბარებული შეკვეთებიდან</p>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                          <span>📦 გაყიდული ნივთები</span>
                          <PackageCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black text-emerald-400 mt-2">{salesAnalytics.totalItemsSold} ცალი</div>
                        <p className="text-[10px] text-slate-500 mt-1">სულ გაყიდული პროდუქცია</p>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                          <span>👥 რეალური ვიზიტორები</span>
                          <Globe className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-black text-blue-400 mt-2">{visitorCount}</div>
                        <p className="text-[10px] text-slate-500 mt-1">საიტზე შემოსვლების თვლა</p>
                      </div>

                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                        <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                          <span>📊 საშუალო ჩეკი</span>
                          <BarChart2 className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-black text-purple-400 mt-2">{salesAnalytics.averageOrderValue} ₾</div>
                        <p className="text-[10px] text-slate-500 mt-1">თითო შეკვეთის საშუალო ფასი</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                      <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-emerald-400" /> რეალურად ყველაზე გაყიდვადი ნივთები (Top Sales)
                      </h3>
                      {salesAnalytics.topProducts.length === 0 ? (
                        <p className="text-slate-500 text-xs">ჯერ არ არის დასრულებული შეკვეთები.</p>
                      ) : (
                        <div className="space-y-2">
                          {salesAnalytics.topProducts.map((prod, idx) => (
                            <div key={idx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-400 text-sm">#{idx + 1}</span>
                                <span className="font-bold text-white">{prod.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-xl">გაყიდულია: {prod.count} ცალი</span>
                                <span className="font-black text-emerald-400">{prod.totalRevenue} ₾</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'orders' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-base md:text-lg text-white">📦 აქტიური შეკვეთები ({orders.filter(o => o.status !== 'ჩაბარებულია' && o.status !== 'გაუქმებულია').length})</h3>
                        <div className="flex gap-2">
                          <button onClick={handleManualRefresh} className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" /> განახლება
                          </button>
                          <button onClick={exportOrdersCSV} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">CSV ექსპორტი</button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {orders.filter(o => o.status !== 'ჩაბარებულია' && o.status !== 'გაუქმებულია').length === 0 ? (
                          <p className="text-slate-500 text-xs">აქტიური შეკვეთები არ არის.</p>
                        ) : (
                          orders.filter(o => o.status !== 'ჩაბარებულია' && o.status !== 'გაუქმებულია').map(o => (
                            <div key={o.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                              <div>
                                <span className="font-bold text-emerald-400 text-sm">#{o.id} ({o.date})</span>
                                <p className="text-slate-300 mt-1"><b>მყიდველი:</b> {o.customerName} | 📞 {o.phone}</p>
                                <p className="text-slate-400 mt-0.5"><b>მისამართი:</b> {o.address}</p>
                                <div className="mt-1 text-slate-400">
                                  {o.items?.map(i => `${i.name} (${i.quantity}ც.)`).join(', ')}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-slate-400">სტატუსის შეცვლა:</label>
                                  <select 
                                    value={o.status || 'ახალი'} 
                                    onChange={async (e) => {
                                      const updatedStatus = e.target.value;
                                      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${o.id}`, {
                                        method: 'PATCH',
                                        headers: { ...headers, 'Prefer': 'return=minimal' },
                                        body: JSON.stringify({ status: updatedStatus })
                                      });
                                      fetchOrders();
                                      showToast(`შეკვეთა #${o.id} სტატუსი შეიცვალა: ${updatedStatus}`);
                                    }}
                                    className="bg-slate-900 border border-slate-700 text-emerald-300 font-bold px-3 py-1.5 rounded-xl outline-none text-xs"
                                  >
                                    <option value="ახალი">🟢 ახალი</option>
                                    <option value="მზადდება">🟡 მზადდება</option>
                                    <option value="გზაშია">🔵 გზაშია</option>
                                    <option value="ჩაბარებულია">✅ ჩაბარებულია</option>
                                    <option value="გაუქმებულია">❌ გაუქმებულია</option>
                                  </select>
                                </div>

                                <span className="font-black text-white text-sm shrink-0">{o.totalGEL} ₾</span>
                                <button onClick={() => setActiveInvoiceOrder(o)} className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl text-white font-bold transition shrink-0">ინვოისი</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'adminChat' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-400" /> 💬 მომხმარებელთა ინდივიდუალური ჩათები
                      </h3>
                      <button onClick={handleManualRefresh} className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" /> განახლება
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 h-[400px] overflow-y-auto">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase px-2 mb-2">მომხმარებლები ({Object.keys(groupedClients).length})</h4>
                        {Object.keys(groupedClients).length === 0 ? (
                          <p className="text-slate-500 text-xs p-2">მესიჯები არ არის.</p>
                        ) : (
                          Object.keys(groupedClients).map(clientName => (
                            <button
                              key={clientName}
                              onClick={() => setAdminSelectedClient(clientName)}
                              className={`w-full text-left p-3 rounded-xl text-xs font-bold transition flex justify-between items-center ${
                                adminSelectedClient === clientName ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              <span>👤 {clientName}</span>
                              <span className="text-[10px] opacity-80">({groupedClients[clientName].length})</span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col h-[400px]">
                        {!adminSelectedClient ? (
                          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                            აირჩიეთ მომხმარებელი სიიდან, რომ ნახოთ მესიჯები და მიწეროთ პასუხი.
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                              <h4 className="font-bold text-emerald-400 text-xs">ჩათი მომხმარებელთან: {adminSelectedClient}</h4>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs">
                              {(groupedClients[adminSelectedClient] || []).map(m => (
                                <div key={m.id} className={`flex flex-col ${m.sender === 'ადმინი' ? 'items-end' : 'items-start'}`}>
                                  <div className={`p-3 rounded-2xl max-w-[85%] ${m.sender === 'ადმინი' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-white border border-slate-800'}`}>
                                    <b>{m.sender}:</b> {m.text}
                                    {m.image && (
                                      <img src={m.image} alt="Attachment" className="mt-2 rounded-xl max-h-28 object-cover w-full border border-slate-800" />
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-500 mt-0.5">{m.time}</span>
                                </div>
                              ))}
                            </div>

                            <form onSubmit={(e) => {
                              e.preventDefault();
                              if(!adminIndividualReply.trim()) return;
                              handleSendMessage(adminIndividualReply, 'ადმინი');
                            }} className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
                              <input 
                                type="text" 
                                placeholder={`მიწერეთ პასუხი ${adminSelectedClient}-ს...`}
                                value={adminIndividualReply}
                                onChange={e => setAdminIndividualReply(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none"
                              />
                              <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1">
                                <Send className="w-3.5 h-3.5" /> გაგზავნა
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'categories' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white">კატეგორიების მართვა</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const catName = e.target.catName.value.trim();
                      if(!catName) return;
                      setCategories([...categories, { id: `cat-${Date.now()}`, name: catName, icon: '📦' }]);
                      e.target.reset();
                      showToast('კატეგორია დაემატა');
                    }} className="flex gap-2">
                      <input type="text" name="catName" required placeholder="ახალი კატეგორია..." className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs flex-1 text-white outline-none" />
                      <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map(c => (
                        <div key={c.id || c} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
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

                {/* --- NEW: BRANDS MANAGER TAB --- */}
                {adminActiveSubTab === 'brands' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                      <Tag className="w-5 h-5 text-emerald-400" /> 🏷️ ბრენდების მართვა
                    </h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const brandName = e.target.brandName.value.trim();
                      if(!brandName) return;
                      if(brandsList.includes(brandName)) {
                        alert('ეს ბრენდი უკვე არსებობს!');
                        return;
                      }
                      setBrandsList([...brandsList, brandName]);
                      e.target.reset();
                      showToast('✅ ბრენდი დაემატა');
                    }} className="flex gap-2">
                      <input type="text" name="brandName" required placeholder="ახალი ბრენდი (მაგ: Lenovo, JBL)..." className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs flex-1 text-white outline-none" />
                      <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {brandsList.map(b => (
                        <div key={b} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <span className="font-bold text-emerald-300">{b}</span>
                          <button onClick={() => setBrandsList(brandsList.filter(x => x !== b))} className="text-rose-400 hover:text-rose-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 p-4 md:p-6 rounded-3xl space-y-4 border border-slate-800">
                      <h3 className="font-bold text-base md:text-lg text-white">+ ახალი პროდუქტის დამატება (პირდაპირი ფოტოს ატვირთვით)</h3>
                      
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.target;
                        const prodName = f.name.value;
                        const userSelectedCat = f.category.value;
                        const priceGEL = Number(f.priceGEL.value);
                        const oldPriceGEL = Number(f.oldPriceGEL.value) || priceGEL;
                        const discountPercent = Number(f.discountPercent.value) || 0;
                        const stock = Number(f.stock.value);
                        const brand = f.brand.value;
                        const warranty = f.warranty.value;
                        const isPreOrder = f.isPreOrder.checked;
                        
                        const mainImage = uploadedMainImg || f.mainImageUrl.value || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600';
                        
                        let extraImages = [...uploadedExtraImgs];
                        const extraText = f.extraImageUrls.value.trim();
                        if (extraText) {
                          const urls = extraText.split(',').map(s => s.trim()).filter(Boolean);
                          extraImages = [...extraImages, ...urls];
                        }
                        if (extraImages.length === 0) extraImages = [mainImage];

                        const newProd = {
                          id: `prod-${Date.now()}`,
                          sku: f.sku.value || `GEO-${Math.floor(Math.random() * 1000)}`,
                          name: prodName,
                          category: userSelectedCat,
                          brand,
                          priceGEL,
                          oldPriceGEL,
                          discountPercent,
                          stock,
                          image: mainImage,
                          images: extraImages,
                          description: f.description.value,
                          warranty,
                          isHot: discountPercent > 0,
                          isPreOrder
                        };

                        setProducts([newProd, ...products]);
                        f.reset();
                        setUploadedMainImg('');
                        setUploadedExtraImgs([]);
                        showToast(`✅ პროდუქტი წარმატებით დაემატა!`);
                      }} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        
                        <input type="text" name="name" required placeholder="პროდუქტის დასახელება *" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                        <input type="text" name="sku" placeholder="SKU კოდი" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400">კატეგორია</label>
                          <select name="category" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none">
                            {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-slate-400">ბრენდი</label>
                          <select name="brand" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none">
                            {brandsList.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" name="priceGEL" required placeholder="აქტ. ფასი (₾) *" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                          <input type="number" name="oldPriceGEL" placeholder="ძველი ფასი (₾)" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                          <input type="number" name="discountPercent" placeholder="ფასდაკლება %" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" name="stock" required placeholder="მარაგი *" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                          <input type="text" name="warranty" placeholder="გარანტია (მაგ: 1 წელი)" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                        </div>

                        <div className="flex items-center gap-2 md:col-span-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <input type="checkbox" name="isPreOrder" id="isPreOrder" className="rounded accent-emerald-500 w-4 h-4" />
                          <label htmlFor="isPreOrder" className="text-slate-300 font-bold cursor-pointer">წინასწარი შეკვეთა (Pre-Order)</label>
                        </div>

                        <div className="md:col-span-2 space-y-2 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                          <label className="text-[11px] text-emerald-400 font-bold flex items-center gap-2">
                            <Upload className="w-4 h-4" /> მთავარი ფოტოს ატვირთვა:
                          </label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleMainImageUpload}
                            className="w-full bg-slate-900 p-2 rounded-xl text-xs text-slate-300 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-slate-950 file:font-bold" 
                          />
                          {uploadedMainImg && (
                            <div className="flex items-center gap-2 mt-2">
                              <img src={uploadedMainImg} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-emerald-500" />
                              <span className="text-[10px] text-emerald-400 font-bold">✓ აიტვირთა</span>
                            </div>
                          )}
                          <input type="url" name="mainImageUrl" placeholder="ან URL ლინკი: https://..." className="w-full bg-slate-900 border border-slate-800 p-2 rounded-xl text-white outline-none mt-2" />
                        </div>

                        <textarea name="description" placeholder="დეტალური აღწერა..." className="md:col-span-2 bg-slate-950 border border-slate-800 p-3 rounded-xl text-white h-20 outline-none"/>
                        
                        <button type="submit" className="md:col-span-2 bg-emerald-500 text-slate-950 font-black py-3.5 rounded-xl text-sm transition shadow-lg">
                          დამატება პროდუქტებში
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-900 p-4 md:p-6 rounded-3xl space-y-3 border border-slate-800">
                      <h3 className="font-bold text-base md:text-lg text-white">არსებული პროდუქტები და მარაგები ({products.length})</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-12 h-12 object-contain bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0" />
                              <div>
                                <span className="font-bold text-white text-sm">{p.name}</span>
                                <p className="text-emerald-400 font-semibold">{p.priceGEL} ₾ | კატეგორია: {p.category}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              <span className="font-extrabold px-2.5 py-1 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                მარაგი: {p.stock} ც.
                              </span>

                              <button 
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setEditProductForm({ 
                                    name: p.name, 
                                    sku: p.sku || '', 
                                    category: p.category, 
                                    brand: p.brand || '',
                                    priceGEL: p.priceGEL, 
                                    oldPriceGEL: p.oldPriceGEL || 0,
                                    discountPercent: p.discountPercent || 0,
                                    stock: p.stock, 
                                    image: p.image, 
                                    description: p.description || '',
                                    warranty: p.warranty || '',
                                    isPreOrder: p.isPreOrder || false
                                  });
                                }} 
                                className="bg-slate-900 hover:bg-slate-800 text-emerald-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition border border-slate-800"
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

                {adminActiveSubTab === 'banners' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white">მთავარი ბანერის რედაქტირება</h3>
                    <div className="space-y-3 text-xs">
                      <input type="text" value={banners[0]?.title || ''} onChange={e => setBanners([{ ...banners[0], title: e.target.value }])} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" placeholder="სათაური" />
                      <input type="text" value={banners[0]?.subtitle || ''} onChange={e => setBanners([{ ...banners[0], subtitle: e.target.value }])} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" placeholder="ქვესათაური" />
                      <input type="url" value={banners[0]?.image || ''} onChange={e => setBanners([{ ...banners[0], image: e.target.value }])} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" placeholder="სურათის URL" />
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'builder' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-3 max-w-xl border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white">🎨 Page Builder (სექციები)</h3>
                    {sections.map((sec) => (
                      <div key={sec.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-white font-bold">{sec.name} ({sec.visible ? '🟢 ჩართული' : '🔴 დამალული'})</span>
                        <button onClick={() => setSections(sections.map(s => s.id === sec.id ? { ...s, visible: !s.visible } : s))} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-white font-bold">
                          {sec.visible ? 'დამალვა' : 'ჩვენება'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {adminActiveSubTab === 'crm' && (
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-3 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white">👥 მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-2">
                      {usersList.map(u => (
                        <div key={u.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
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
                  <div className="bg-slate-900 p-6 rounded-3xl space-y-4 border border-slate-800">
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
                      <input type="text" name="code" required placeholder="კოდი (GEO10)" className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs uppercase text-white outline-none" />
                      <input type="number" name="disc" required placeholder="%" className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs w-20 text-white outline-none" />
                      <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold">დამატება</button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                      {coupons.map((c, i) => (
                        <span key={i} className="bg-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-2 text-emerald-400">
                          {c.code} (-{c.discountPercent}%)
                          <button onClick={() => setCoupons(coupons.filter((_, idx) => idx !== i))} className="text-rose-400">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'security' && (
                  <div className="bg-slate-900 p-6 rounded-3xl max-w-md space-y-4 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2"><Key className="w-5 h-5 text-emerald-400"/> ადმინის პაროლის შეცვლა</h3>
                    <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                      <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                      <input type="password" required placeholder="ძველი პაროლი" value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                      <input type="password" required placeholder="ახალი პაროლი" value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                      <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-xs">განახლება</button>
                    </form>
                  </div>
                )}

                {/* --- NEW: ADVANCED CMS & THEME & POPUP EDITOR TAB --- */}
                {adminActiveSubTab === 'cms' && (
                  <div className="bg-slate-900 p-6 rounded-3xl max-w-xl space-y-5 border border-slate-800 text-xs">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-400"/> საიტის სრული რედაქტორი (CMS, თემები & Popup)</h3>
                    
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      showToast('✅ საიტის მონაცემები და თემა წარმატებით განახლდა!');
                    }} className="space-y-4">
                      
                      <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <Palette className="w-4 h-4" /> საიტის ძირითადი ფერი (Theme Accent):
                        </label>
                        <select 
                          value={siteSettings.primaryColor || 'emerald'} 
                          onChange={e => setSiteSettings({...siteSettings, primaryColor: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white outline-none"
                        >
                          <option value="emerald">🟢 ზურმუხტისფერი (Emerald)</option>
                          <option value="blue">🔵 კლასიკური ლურჯი (Blue)</option>
                          <option value="violet">🟣 იისფერი (Violet)</option>
                          <option value="amber">🟠 ქარვისფერი / ნარინჯისფერი (Amber)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-emerald-400 font-bold">💱 აშშ დოლარის (USD) კურსი ლარში:</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={usdRate} 
                          onChange={e => setUsdRate(Number(e.target.value))} 
                          className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white outline-none" 
                        />
                      </div>

                      <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <label className="text-emerald-400 font-bold">📢 სარეკლამო Popup ფანჯრის მართვა:</label>
                        <div className="flex items-center gap-2 mb-2">
                          <input 
                            type="checkbox" 
                            id="popupActiveCheck"
                            checked={siteSettings.popupAnnouncementActive} 
                            onChange={e => setSiteSettings({...siteSettings, popupAnnouncementActive: e.target.checked})} 
                            className="rounded accent-emerald-500 w-4 h-4"
                          />
                          <label htmlFor="popupActiveCheck" className="text-slate-200 cursor-pointer font-bold">Popup ფანჯრის ჩართვა საიტზე</label>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Popup სათაური" 
                          value={siteSettings.popupTitle} 
                          onChange={e => setSiteSettings({...siteSettings, popupTitle: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white outline-none mb-2" 
                        />
                        <textarea 
                          placeholder="Popup ტექსტი..." 
                          value={siteSettings.popupText} 
                          onChange={e => setSiteSettings({...siteSettings, popupText: e.target.value})} 
                          className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white outline-none h-16" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-400">მაღაზიის სათაური (ლოგო):</label>
                        <input type="text" value={siteSettings.storeName} onChange={e => setSiteSettings({...siteSettings, storeName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">ზედა ზოლის ტექსტი (Header Ticker):</label>
                        <input type="text" value={siteSettings.topBarText} onChange={e => setSiteSettings({...siteSettings, topBarText: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400">მთავარი ბანერის სათაური (Hero Title):</label>
                        <input type="text" value={siteSettings.heroTitle} onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
                      </div>

                      <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs">ცვლილებების შენახვა</button>
                    </form>
                  </div>
                )}

                {adminActiveSubTab === 'policyEditor' && (
                  <div className="bg-slate-900 p-6 rounded-3xl max-w-2xl space-y-4 border border-slate-800">
                    <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" /> წესების და პოლიტიკის რედაქტორი (AI ავტომატურად ითვისებს)
                    </h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      showToast('✅ წესები და პოლიტიკა განახლდა!');
                    }} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold">1. ზოგადი დებულებები:</label>
                        <textarea value={storePolicy.general} onChange={e => setStorePolicy({...storePolicy, general: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none h-20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold">2. შეკვეთა და მიწოდება:</label>
                        <textarea value={storePolicy.delivery} onChange={e => setStorePolicy({...storePolicy, delivery: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none h-20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold">3. გარანტია და დაბრუნება:</label>
                        <textarea value={storePolicy.warranty} onChange={e => setStorePolicy({...storePolicy, warranty: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none h-20" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold">4. კონფიდენციალურობა:</label>
                        <textarea value={storePolicy.privacy} onChange={e => setStorePolicy({...storePolicy, privacy: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none h-20" />
                      </div>
                      <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs">ცვლილებების შენახვა</button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* ================= MODALS ================= */}

      {/* 1. REAL-TIME KNOWLEDGE AI ASSISTANT CHAT MODAL */}
      {isAiAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full h-[620px] flex flex-col relative shadow-2xl overflow-hidden">
            
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 p-4 text-slate-950 flex justify-between items-center font-black shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-7 h-7 text-slate-950 animate-bounce" />
                <div>
                  <h3 className="text-base leading-none">🤖 GEOSTORE Live-Knowledge AI ასისტენტი</h3>
                  <p className="text-[10px] text-slate-900/80 font-bold mt-0.5">პირდაპირი წვდომა პროდუქტებსა და წესებზე</p>
                </div>
              </div>
              <button onClick={() => setIsAiAssistantOpen(false)} className="bg-slate-950 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>

            <div className="bg-slate-950 p-3 border-b border-slate-800 grid grid-cols-2 gap-3 text-xs shrink-0">
              <div>
                <label className="text-slate-400 text-[10px] font-bold block mb-1">
                  მაქს. ბიუჯეტი: <span className="text-emerald-400 font-black">{aiBudget} ₾</span>
                </label>
                <input 
                  type="range" 
                  min="200" 
                  max="10000" 
                  step="200" 
                  value={aiBudget} 
                  onChange={e => setAiBudget(Number(e.target.value))} 
                  className="w-full accent-emerald-500 cursor-pointer h-1.5" 
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] font-bold block mb-1">კატეგორია:</label>
                <select 
                  value={aiCategory} 
                  onChange={e => setAiCategory(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-white text-xs outline-none"
                >
                  <option value="ყველა">✨ ყველა კატეგორია</option>
                  {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-950/60">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md' 
                      : 'bg-slate-900 border border-emerald-500/30 text-white shadow-xl'
                  }`}>
                    <p>{msg.text}</p>
                    
                    {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800">
                        {msg.recommendedProducts.map(prod => (
                          <div key={prod.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between items-start gap-2">
                            <div className="flex items-center gap-2">
                              <img src={prod.image} alt="" className="w-10 h-10 object-contain bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0" />
                              <div>
                                <h5 className="font-bold text-white text-[11px] line-clamp-1">{prod.name}</h5>
                                <p className="text-emerald-400 font-black text-xs">{prod.priceGEL} ₾</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => { addToCart(prod); setIsAiAssistantOpen(false); }} 
                              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg text-[10px] transition"
                            >
                              🛒 კალათაში დამატება
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              {[
                { label: '👋 გამარჯობა', text: 'გამარჯობა' },
                { label: '📜 საიტის წესები & პოლიტიკა', text: 'როგორია საიტის წესები და პოლიტიკა?' },
                { label: '🚚 მიწოდების პირობები', text: 'როგორია მიწოდების პირობები?' },
                { label: '🛡️ გარანტია', text: 'რა გარანტია მოქმედებს?' },
                { label: '📱 ტელეფონები', text: 'სმარტფონები მინდა' }
              ].map((sugg, i) => (
                <button key={i} onClick={() => handleAiAsk(sugg.text)} className="bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition">
                  {sugg.label}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleAiAsk(); }} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ჰკითხეთ AI-ს (მაგ: ტელეფონი, მიწოდების პირობები, გარანტია)..." 
                  value={aiInputText} 
                  onChange={e => setAiInputText(e.target.value)} 
                  className="flex-1 bg-slate-950 border border-emerald-500/30 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
                />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-1 shrink-0 shadow-lg transition">
                  <Send className="w-4 h-4" /> ძებნა
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 2. GIFT FINDER QUIZ MODAL */}
      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500/50 rounded-3xl max-w-lg w-full p-6 relative space-y-5 text-xs shadow-2xl">
            <button onClick={() => setIsGiftQuizOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold">✕</button>
            
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Gift className="w-7 h-7 text-teal-400 animate-pulse" />
              <div>
                <h3 className="text-base font-black text-white">🎁 ჭკვიანი სასაჩუქრე ასისტენტი</h3>
                <p className="text-[10px] text-teal-300 font-semibold">შეარჩიეთ საუკეთესო საჩუქარი 4 სწრაფ ნაბიჯში</p>
              </div>
            </div>

            {giftStep === 1 && (
              <div className="space-y-4">
                <p className="text-slate-200 font-black text-sm">1. ვისთვის გსურთ საჩუქრის არჩევა?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {['მეუღლე / საყვარელი ადამიანი', 'მშობელი', 'შვილი / მოზარდი', 'მეგობარი / კოლეგა'].map(rec => (
                    <button 
                      key={rec} 
                      onClick={() => { setGiftRecipient(rec); setGiftStep(2); }} 
                      className="p-3.5 bg-slate-950 border border-slate-800 hover:border-teal-400 rounded-2xl font-bold text-white text-left transition transform hover:scale-102"
                    >
                      👤 {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {giftStep === 2 && (
              <div className="space-y-4">
                <p className="text-slate-200 font-black text-sm">2. რა შემთხვევისთვის ეძებთ საჩუქარს?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {['დაბადების დღე 🎂', 'ახალი წელი 🎄', 'იუბილე / დღესასწაული 🎉', 'უბრალოდ სიურპრიზი ✨'].map(occ => (
                    <button 
                      key={occ} 
                      onClick={() => { setGiftOccasion(occ); setGiftStep(3); }} 
                      className="p-3.5 bg-slate-950 border border-slate-800 hover:border-teal-400 rounded-2xl font-bold text-white text-left transition"
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {giftStep === 3 && (
              <div className="space-y-4">
                <p className="text-slate-200 font-black text-sm">3. მიუთითეთ ინტერესი და მაქსიმალური ბიუჯეტი:</p>

                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">ინტერესი:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['გეიმინგი / ტექნიკა', 'მუსიკა / აუდიო', 'სმარტფონები', 'ყველაფერი'].map(ins => (
                      <button 
                        key={ins} 
                        onClick={() => setGiftInterest(ins)} 
                        className={`p-2.5 rounded-xl font-bold border text-xs transition ${
                          giftInterest === ins ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      >
                        {ins}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-bold">მაქსიმალური ბიუჯეტი:</span>
                    <span className="text-teal-400 font-black">{giftBudgetMax} ₾</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="6000" 
                    step="100" 
                    value={giftBudgetMax} 
                    onChange={e => setGiftBudgetMax(Number(e.target.value))} 
                    className="w-full accent-teal-400 cursor-pointer" 
                  />
                </div>

                <button 
                  onClick={() => {
                    const matched = products.filter(p => p.priceGEL <= giftBudgetMax);
                    setGiftQuizResults(matched.length > 0 ? matched.slice(0, 3) : products.slice(0, 3));
                    setGiftStep(4);
                  }} 
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-xl transition"
                >
                  🎁 იდეალური საჩუქრის გენერირება
                </button>
              </div>
            )}

            {giftStep === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h4 className="font-black text-teal-400 text-base">🎉 შერჩეული საუკეთესო საჩუქრები!</h4>
                  <p className="text-slate-400 text-[11px]">{giftRecipient} • {giftOccasion} • {giftBudgetMax}₾ ბიუჯეტში</p>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {giftQuizResults.map(p => (
                    <div key={p.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                      <img src={p.image} alt="" className="w-14 h-14 object-contain bg-slate-900 rounded-xl p-1 shrink-0" />
                      <div className="flex-1">
                        <h5 className="font-bold text-white text-xs">{p.name}</h5>
                        <p className="text-teal-400 font-black text-sm">{p.priceGEL} ₾</p>
                      </div>
                      <button 
                        onClick={() => { addToCart(p); setIsGiftQuizOpen(false); }} 
                        className="bg-teal-500 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shrink-0"
                      >
                        ყიდვა
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setGiftStep(1)} className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 font-bold py-2.5 rounded-xl">
                    🔄 თავიდან არჩევა
                  </button>
                  <button onClick={() => setIsGiftQuizOpen(false)} className="bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl">
                    დახურვა
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 3. PRODUCT COMPARISON MODAL */}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-3xl w-full p-6 relative space-y-4 text-xs shadow-2xl">
            <button onClick={() => setIsComparisonOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckSquare className="w-6 h-6 text-cyan-400" />
              <h3 className="text-base font-black text-white">⚔️ პროდუქტების შედარება</h3>
            </div>

            {comparisonList.length === 0 ? (
              <p className="text-slate-400 text-center py-8">შედარების სია ცარიელია. მონიშნეთ პროდუქტები კატალოგში შედარებისთვის.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto">
                {comparisonList.map(prod => (
                  <div key={prod.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <img src={prod.image} alt="" className="w-24 h-24 object-contain mx-auto bg-slate-900 p-2 rounded-xl mb-3" />
                      <h4 className="font-bold text-white text-sm mb-1">{prod.name}</h4>
                      <p className="text-cyan-400 font-black text-base">{prod.priceGEL} ₾</p>
                    </div>
                    <div className="space-y-1.5 text-slate-300 border-t border-slate-800 pt-3">
                      <p><b>კატეგორია:</b> {prod.category}</p>
                      <p><b>ბრენდი:</b> {prod.brand || 'არ არის'}</p>
                      <p><b>მარაგი:</b> {prod.stock} ც.</p>
                      <p><b>გარანტია:</b> {prod.warranty || '1 წელი'}</p>
                    </div>
                    <button onClick={() => toggleComparison(prod)} className="w-full bg-rose-500/20 text-rose-400 py-2 rounded-xl font-bold border border-rose-500/30">ამოღება</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PRICE ALERT MODAL */}
      {priceAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 relative space-y-4 text-xs shadow-2xl">
            <button onClick={() => setPriceAlertModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Bell className="w-6 h-6 text-amber-400" />
              <h3 className="text-base font-black text-white">🔔 შემატყობინე მარაგში შევსებისას</h3>
            </div>
            <p className="text-slate-300">პროდუქტი: <b className="text-amber-400">{priceAlertModal.name}</b></p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if(!alertEmail.trim()) return;
              showToast('✅ თქვენ წარმატებით გამოიწერეთ შეტყობინება!');
              setPriceAlertModal(null);
              setAlertEmail('');
            }} className="space-y-3">
              <input type="email" required placeholder="თქვენი ელ-ფოსტა ან ტელეფონი..." value={alertEmail} onChange={e => setAlertEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none" />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-xl shadow-lg">გამოწერა</button>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT EDIT MODAL */}
      {editingProductId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4 text-xs shadow-2xl">
            <button onClick={() => setEditingProductId(null)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-400" /> პროდუქტის რედაქტირება
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setProducts(products.map(p => p.id === editingProductId ? {
                ...p,
                name: editProductForm.name,
                sku: editProductForm.sku,
                category: editProductForm.category,
                brand: editProductForm.brand,
                priceGEL: Number(editProductForm.priceGEL),
                oldPriceGEL: Number(editProductForm.oldPriceGEL),
                discountPercent: Number(editProductForm.discountPercent),
                stock: Number(editProductForm.stock),
                image: editProductForm.image,
                description: editProductForm.description,
                warranty: editProductForm.warranty,
                isPreOrder: editProductForm.isPreOrder
              } : p));
              setEditingProductId(null);
              showToast('✅ პროდუქტი წარმატებით განახლდა!');
            }} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-400">დასახელება:</label>
                <input type="text" required value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400">ფასი (₾):</label>
                  <input type="number" required value={editProductForm.priceGEL} onChange={e => setEditProductForm({...editProductForm, priceGEL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400">ძველი ფასი:</label>
                  <input type="number" value={editProductForm.oldPriceGEL} onChange={e => setEditProductForm({...editProductForm, oldPriceGEL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400">ფასდაკლება %:</label>
                  <input type="number" value={editProductForm.discountPercent} onChange={e => setEditProductForm({...editProductForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400">მარაგი:</label>
                  <input type="number" required value={editProductForm.stock} onChange={e => setEditProductForm({...editProductForm, stock: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400">გარანტია:</label>
                  <input type="text" value={editProductForm.warranty} onChange={e => setEditProductForm({...editProductForm, warranty: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <input type="checkbox" checked={editProductForm.isPreOrder} onChange={e => setEditProductForm({...editProductForm, isPreOrder: e.target.checked})} id="editPreOrder" className="rounded accent-emerald-500 w-4 h-4" />
                <label htmlFor="editPreOrder" className="text-slate-300 font-bold cursor-pointer">წინასწარი შეკვეთა (Pre-Order)</label>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">ფოტოს URL:</label>
                <input type="url" required value={editProductForm.image} onChange={e => setEditProductForm({...editProductForm, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">აღწერა:</label>
                <textarea value={editProductForm.description} onChange={e => setEditProductForm({...editProductForm, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none h-20" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl text-xs">შენახვა</button>
            </form>
          </div>
        </div>
      )}

      {selectedProductQuickView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4 text-xs shadow-2xl">
            <button onClick={() => setSelectedProductQuickView(null)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <img src={selectedProductQuickView.image} alt="" className="w-44 h-44 object-contain mx-auto bg-slate-950 rounded-2xl p-4 border border-slate-800" />
            <h3 className="text-lg font-bold text-white">{selectedProductQuickView.name}</h3>
            {selectedProductQuickView.images && selectedProductQuickView.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {selectedProductQuickView.images.map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt="" onClick={() => setSelectedProductQuickView({...selectedProductQuickView, image: imgUrl})} className="w-12 h-12 object-contain bg-slate-950 rounded-xl cursor-pointer border border-slate-800 hover:border-emerald-500 p-1" />
                ))}
              </div>
            )}
            <p className="text-slate-400 leading-relaxed">{selectedProductQuickView.description}</p>
            {selectedProductQuickView.warranty && <p className="text-emerald-300 font-bold">🛡️ გარანტია: {selectedProductQuickView.warranty}</p>}
            <p className="text-teal-400 font-bold">💳 0% განვადება: თვეში ~{Math.round(selectedProductQuickView.priceGEL / 12)} ₾</p>
            <div className="text-xl font-black text-emerald-400">{formatPrice(selectedProductQuickView.priceGEL)}</div>
            <button disabled={selectedProductQuickView.stock <= 0} onClick={() => { addToCart(selectedProductQuickView); setSelectedProductQuickView(null); }} className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-black text-xs shadow-lg">კალათაში დამატება</button>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 relative space-y-4 shadow-2xl">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <div className="flex gap-4 border-b border-slate-800 pb-2 font-bold text-sm">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <input 
                  type="checkbox" 
                  id="userRemember"
                  checked={authForm.remember} 
                  onChange={e => setAuthForm({...authForm, remember: e.target.checked})} 
                  className="rounded accent-emerald-500"
                />
                <label htmlFor="userRemember" className="cursor-pointer">მომიმახსოვრე</label>
              </div>

              <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-bold text-xs shadow-lg">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 relative space-y-4 shadow-2xl">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 text-slate-400">✕</button>
            <h3 className="text-lg font-bold text-white">შეკვეთის გაფორმება</h3>
            <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(quickBuyProduct ? [quickBuyProduct] : cart, quickBuyProduct ? quickBuyProduct.priceGEL : cartTotalGEL, !!quickBuyProduct); }} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-3 rounded-xl font-black text-xs shadow-lg">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold">ინვოისი #{activeInvoiceOrder.id}</h3>
              <button onClick={() => setActiveInvoiceOrder(null)}>✕</button>
            </div>
            <p className="text-xs"><b>მყიდველი:</b> {activeInvoiceOrder.customerName} ({activeInvoiceOrder.phone})</p>
            <p className="text-xs"><b>მისამართი:</b> {activeInvoiceOrder.address}</p>
            <p className="text-xs"><b>სტატუსი:</b> {activeInvoiceOrder.status}</p>
            <div className="text-sm font-bold text-emerald-600">სულ: {activeInvoiceOrder.totalGEL} ₾</div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">ბეჭდვა</button>
          </div>
        </div>
      )}

      {/* LIVE CHAT WIDGET */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        {!isChatOpen ? (
          <button onClick={() => setIsChatOpen(true)} className="bg-emerald-500 text-slate-950 p-4 rounded-full shadow-2xl flex items-center justify-center relative hover:scale-105 transition transform">
            <MessageSquare className="w-6 h-6" />
          </button>
        ) : (
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl w-72 sm:w-80 md:w-96 overflow-hidden flex flex-col h-[460px] backdrop-blur-xl">
            <div className="bg-emerald-500 p-3.5 text-slate-950 font-bold flex justify-between items-center text-xs shadow-md">
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
                <h4 className="font-bold text-emerald-400 text-sm">გამარჯობა! გთხოვთ შეიყვანოთ თქვენი სახელი</h4>
                <p className="text-slate-400">რომ მენეჯერმა იცოდეს ვის ესაუბრება.</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if(!clientNameInput.trim()) return;
                  setChatClientName(clientNameInput.trim());
                  try { localStorage.setItem('geostore_chat_client_name', clientNameInput.trim()); } catch(e){}
                  showToast('✅ სახელი დაფიქსირდა');
                }} className="w-full space-y-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="თქვენი სახელი..." 
                    value={clientNameInput} 
                    onChange={e => setClientNameInput(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white text-xs outline-none" 
                  />
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl">დაწყება</button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-slate-950">
                  {clientChatView.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === chatClientName ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[85%] ${m.sender === chatClientName ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-white border border-slate-800'}`}>
                        <b>{m.sender}:</b> {m.text}
                        {m.image && (
                          <img src={m.image} alt="Attachment" className="mt-2 rounded-xl max-h-36 object-cover w-full border border-slate-800" />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="p-2 rounded-xl border bg-slate-950 text-slate-300 border-slate-800 cursor-pointer hover:bg-slate-800 transition" title="აირჩიეთ ფოტო">
                      <ImageIcon className="w-4 h-4" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = function(evt) {
                              handleSendMessage('ფოტო:', chatClientName, evt.target.result);
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
                          e.preventDefault();
                          if(!chatInput.trim()) return; 
                          handleSendMessage(chatInput, chatClientName);
                        } 
                      }} 
                      className="flex-1 bg-slate-950 rounded-xl px-3 py-2 text-xs text-white outline-none border border-slate-800" 
                    />

                    <button 
                      onClick={() => { 
                        if(!chatInput.trim()) return; 
                        handleSendMessage(chatInput, chatClientName);
                      }} 
                      className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-bold"
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

      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500 mt-16 space-y-2">
        <div className="flex justify-center gap-6">
          <button onClick={() => setActiveTab('policy')} className="hover:text-emerald-400 transition font-bold text-emerald-500">წესები და პოლიტიკა</button>
          <button onClick={() => setActiveTab('store')} className="hover:text-emerald-400 transition">მთავარი</button>
        </div>
        <p>© 2026 {siteSettings.storeName}. ყველა უფლება დაცულია.</p>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 md:hidden z-40 py-2.5 px-4 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'store' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Grid className="w-5 h-5" />
          <span>მაღაზია</span>
        </button>

        <button
          onClick={() => setIsAiAssistantOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-black text-slate-950 bg-emerald-400 p-2 rounded-2xl shadow-lg -mt-4 border-2 border-slate-950 animate-bounce"
        >
          <Bot className="w-5 h-5" />
          <span>AI</span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative ${activeTab === 'cart' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>კალათა</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 right-2 bg-emerald-500 text-slate-950 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
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
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span>{currentUser ? 'პროფილი' : 'შესვლა'}</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'admin' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Settings className="w-5 h-5" />
          <span>ადმინი</span>
        </button>
      </nav>

    </div>
  );
}
