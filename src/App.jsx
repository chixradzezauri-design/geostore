import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, BookOpen, Image as ImageIcon, Bell, TrendingUp, BarChart2, PackageCheck, Upload, Bot, Gift, Cpu, CheckSquare, Zap, Compass, HelpCircle, Palette, Store, DownloadCloud, Smartphone, Laptop, Users, RotateCcw
} from 'lucide-react';

// ================= SUPABASE REST API CONFIG =================
const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6Inhwbm9uIiwiaWF0IjoxNzkyNzM0NDQ5LCJleHAiOjIxMDgzMTA0NDl9.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

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

const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'სმარტფონები', icon: '📱' },
  { id: 'cat-2', name: 'ლეპტოპები', icon: '💻' },
  { id: 'cat-3', name: 'აქსესუარები', icon: '🎧' },
  { id: 'cat-4', name: 'ჭკვიანი საათები', icon: '⌚' },
  { id: 'cat-5', name: 'ტელევიზორები', icon: '📺' }
];

const INITIAL_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, phone: '+995 32 200 00 00', status: 'აქტიური', contactPerson: 'გიორგი ბერიძე', email: 'official@geostore.ge' },
  { id: 'v2', name: 'TechHub Georgia', commission: 10, phone: '+995 555 11 22 33', status: 'აქტიური', contactPerson: 'დავით მარაქველიძე', email: 'hub@techhub.ge' },
  { id: 'v3', name: 'Apple Shop Tbilisi', commission: 8, phone: '+995 599 88 77 66', status: 'აქტიური', contactPerson: 'ნიკა ქავთარაძე', email: 'sales@appleshop.ge' }
];

const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'GEO-IP15P',
    name: 'iPhone 15 Pro Max 256GB Titanium',
    category: 'სმარტფონები',
    brand: 'Apple',
    vendor: 'GEOSTORE ოფიციალური',
    priceGEL: 3899,
    oldPriceGEL: 4299,
    costPriceGEL: 3200,
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
    vendor: 'TechHub Georgia',
    priceGEL: 4499,
    oldPriceGEL: 4899,
    costPriceGEL: 3800,
    stock: 4,
    rating: 5.0,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600'],
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით. იდეალურია პროგრამირებისთვის, დიზაინისთვის და სწავლისთვის.',
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
    vendor: 'Apple Shop Tbilisi',
    priceGEL: 749,
    oldPriceGEL: 899,
    costPriceGEL: 550,
    stock: 2,
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

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    setIsIosDevice(isIos);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    } else {
      setShowInstallModal(true);
    }
  };

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
    } catch {
      return fallback;
    }
  };

  const [siteSettings, setSiteSettings] = useState(() => loadSafeStorage('geostore_site_settings', {
    storeName: 'GEOSTORE',
    topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი',
    supportPhone: '+995 32 200 00 00',
    heroTitle: 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით',
    heroSubtitle: 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!',
    primaryColor: 'emerald',
    popupAnnouncementActive: false,
    popupTitle: 'სპეციალური შეთავაზება!',
    popupText: 'გამოიწერეთ ჩვენი სიახლეები და მიიღეთ 10% ფასდაკლება პირველ შენაძენზე.'
  }));

  useEffect(() => {
    try { localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings)); } catch {}
  }, [siteSettings]);

  const [storePolicy, setStorePolicy] = useState(() => loadSafeStorage('geostore_store_policy', INITIAL_POLICY));

  useEffect(() => {
    try { localStorage.setItem('geostore_store_policy', JSON.stringify(storePolicy)); } catch {}
  }, [storePolicy]);

  const [adminAuth, setAdminAuth] = useState(() => loadSafeStorage('geostore_admin_auth', { username: "admin", password: "admin123" }));
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    try { return localStorage.getItem('geostore_admin_remember') === 'true'; } catch { return false; }
  });
  const [adminLoginForm, setAdminLoginForm] = useState(() => loadSafeStorage('geostore_admin_remember_creds', { username: '', password: '', remember: false }));
  const [adminSecurityForm, setAdminSecurityForm] = useState({ username: adminAuth.username, oldPassword: '', newPassword: '' });

  useEffect(() => {
    try { localStorage.setItem('geostore_admin_auth', JSON.stringify(adminAuth)); } catch {}
  }, [adminAuth]);

  const [categories, setCategories] = useState(() => loadSafeStorage('geostore_cats', INITIAL_CATEGORIES));
  const [brandsList, setBrandsList] = useState(() => loadSafeStorage('geostore_brands', ['Apple', 'Samsung', 'Xiaomi', 'Sony', 'Asus', 'Acer']));
  const [vendorsList, setVendorsList] = useState(() => loadSafeStorage('geostore_vendors', INITIAL_VENDORS));
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
  const [adminActiveSubTab, setAdminActiveSubTab] = useState('dashboardPro'); 
  const [showPopupModal, setShowPopupModal] = useState(() => siteSettings.popupAnnouncementActive);

  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ყველა');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', sku: '', category: '', brand: '', vendor: '', priceGEL: 0, oldPriceGEL: 0, discountPercent: 0, stock: 0, image: '', description: '', warranty: '', isPreOrder: false });
  const [newProductForm, setNewProductForm] = useState({ name: '', sku: 'GEO-NEW', category: 'სმარტფონები', brand: 'Apple', vendor: 'GEOSTORE ოფიციალური', priceGEL: 1500, oldPriceGEL: 1700, discountPercent: 10, stock: 10, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600', description: 'ახალი პროდუქტი', warranty: '1 წელი', isPreOrder: false });

  const [uploadedMainImg, setUploadedMainImg] = useState('');

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

  const [comparisonList, setComparisonList] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiBudget, setAiBudget] = useState(10000);
  const [aiCategory, setAiCategory] = useState('ყველა');
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის ჭკვიანი AI ასისტენტი. მე რეალურ დროში მაქვს წვდომა მაღაზიის ყველა პროდუქტზე, ვენდერებზე, ფასზე, მარაგზე და წესებზე! მკითხეთ ნებისმიერი რამ.',
      recommendedProducts: []
    }
  ]);

  const [isGiftQuizOpen, setIsGiftQuizOpen] = useState(false);
  const [giftStep, setGiftStep] = useState(1);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftOccasion, setGiftOccasion] = useState('');
  const [giftInterest, setGiftInterest] = useState('');
  const [giftBudgetMax, setGiftBudgetMax] = useState(2500);
  const [giftQuizResults, setGiftQuizResults] = useState([]);

  const [priceAlertModal, setPriceAlertModal] = useState(null);
  const [alertEmail, setAlertEmail] = useState('');

  const [usersList, setUsersList] = useState(() => loadSafeStorage('geostore_users_list', [
    { id: 'u1', name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '599123456', password: '123', ordersCount: 1, totalSpentGEL: 3899, date: '2026-10-15', notes: 'VIP მყიდველი' }
  ]));

  const [currentUser, setCurrentUser] = useState(() => loadSafeStorage('geostore_current_user', null));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState(() => loadSafeStorage('geostore_user_remembered', { name: '', phone: '', email: '', password: '', remember: false }));

  const [orders, setOrders] = useState([]);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null);

  const [returnsList, setReturnsList] = useState(() => loadSafeStorage('geostore_returns', [
    { id: 'RET-101', orderId: 'ORD-1001', customerName: 'გიორგი ბერიძე', productName: 'iPhone 15 Pro', reason: 'არ მოუხდა მოდელი', status: 'განხილვაში', refundStatus: 'არ არის დაბრუნებული', date: '2026-10-24', adminNotes: 'მოწმდება' }
  ]));

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
          rawDate: o.created_at ? new Date(o.created_at) : new Date(),
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
  useEffect(() => { try { localStorage.setItem('geostore_vendors', JSON.stringify(vendorsList)); } catch(e){} }, [vendorsList]);
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch(e){} }, [products]);
  useEffect(() => { try { localStorage.setItem('geostore_banners', JSON.stringify(banners)); } catch(e){} }, [banners]);
  useEffect(() => { try { localStorage.setItem('geostore_promos', JSON.stringify(promoSlots)); } catch(e){} }, [promoSlots]);
  useEffect(() => { try { localStorage.setItem('geostore_coupons', JSON.stringify(coupons)); } catch(e){} }, [coupons]);
  useEffect(() => { try { localStorage.setItem('geostore_sections', JSON.stringify(sections)); } catch(e){} }, [sections]);
  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch(e){} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch(e){} }, [currentUser]);
  useEffect(() => { try { localStorage.setItem('geostore_returns', JSON.stringify(returnsList)); } catch(e){} }, [returnsList]);

  const formatPrice = (priceInGEL) => {
    if (currency === 'USD') {
      return `$${(priceInGEL / usdRate).toFixed(2)}`;
    }
    return `${priceInGEL.toLocaleString('ka-GE')} ₾`;
  };

  const cartSubtotalGEL = useMemo(() => cart.reduce((acc, item) => acc + (item.priceGEL * item.quantity), 0), [cart]);
  const discountAmountGEL = useMemo(() => appliedCoupon ? (cartSubtotalGEL * appliedCoupon.discountPercent) / 100 : 0, [cartSubtotalGEL, appliedCoupon]);
  const cartTotalGEL = cartSubtotalGEL - discountAmountGEL;

  const crmAnalytics = useMemo(() => {
    return usersList.map(u => {
      const userOrders = orders.filter(o => o.userEmail === u.email || o.customerName === u.name);
      const totalSpent = userOrders.reduce((acc, o) => acc + (Number(o.totalGEL) || 0), u.totalSpentGEL || 0);
      const ordersCount = userOrders.length || u.ordersCount || 0;
      
      let segment = 'ახალი';
      if (totalSpent > 3000 || ordersCount >= 3) segment = 'ლოიალური (VIP)';
      else if (ordersCount > 0) segment = 'აქტიური';

      return { ...u, realOrdersCount: ordersCount, realTotalSpent: totalSpent, segment };
    });
  }, [usersList, orders]);

  const proAnalytics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'ჩაბარებულია');
    const cancelledOrders = orders.filter(o => o.status === 'გაუქმებულია');
    const pendingOrders = orders.filter(o => o.status === 'ახალი' || o.status === 'მზადდება' || o.status === 'გზაშია');

    const totalRevenueGEL = completedOrders.reduce((acc, o) => acc + (Number(o.totalGEL) || 0), 0);
    
    let totalCostGEL = 0;
    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const foundProd = products.find(p => p.id === item.id || p.name === item.name);
        const cost = foundProd ? (Number(foundProd.costPriceGEL) || (Number(foundProd.priceGEL) * 0.75)) : (Number(item.price) * 0.75);
        totalCostGEL += cost * (Number(item.quantity) || 1);
      });
    });

    const netProfitGEL = totalRevenueGEL - totalCostGEL;
    const avgOrderValue = completedOrders.length > 0 ? (totalRevenueGEL / completedOrders.length).toFixed(2) : 0;
    const lowStockProducts = products.filter(p => p.stock <= 3);

    return {
      totalRevenueGEL,
      netProfitGEL,
      totalOrdersCount: orders.length,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      pendingOrdersCount: pendingOrders.length,
      avgOrderValue,
      lowStockProducts
    };
  }, [orders, products]);

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

  // --- SUPABASE-ის გამართული შეკვეთის გაფორმება ---
  const handlePlaceOrder = async (itemsToOrder, totalVal, isExpress = false) => {
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert('⚠️ გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsData = itemsToOrder.map(i => ({ 
      id: i.id, 
      name: i.name, 
      price: i.priceGEL, 
      quantity: i.quantity || 1, 
      vendor: i.vendor || 'GEOSTORE ოფიციალური' 
    }));

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
        `🚨 *ახალი შეკვეთა მარკეტფლეისში!* (#${orderId})\n\n` +
        `👤 *მყიდველი:* ${checkoutForm.name}\n` +
        `📞 *ტელეფონი:* ${checkoutForm.phone}\n` +
        `📍 *მისამართი:* ${checkoutForm.address}\n` +
        `💰 *სულ თანხა:* ${totalVal} ₾\n\n` +
        `📦 *პროდუქტები:*\n${itemsData.map(i => `- ${i.name} (${i.quantity} ც., ვენდერი: ${i.vendor})`).join('\n')}`
      );

      setIsCheckoutOpen(false);
      setQuickBuyProduct(null);
      if (!isExpress) setCart([]);
      setAppliedCoupon(null);
      setCheckoutForm({ name: '', phone: '', address: '', notes: '' });
      showToast('✅ შეკვეთა წარმატებით გაფორმდა!');
      fetchOrders();
    } catch (err) {
      alert("❌ ქსელის შეცდომა შეკვეთისას: " + err.message);
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
      const matchesVendor = selectedVendorFilter === 'ყველა' || p.vendor === selectedVendorFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesVendor && matchesSearch;
    });
  }, [products, selectedCategory, selectedVendorFilter, searchQuery]);

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

  const handleAiAsk = (customQuestion = null) => {
    const queryRaw = (customQuestion || aiInputText).trim();
    if (!queryRaw) return;
    const queryLower = queryRaw.toLowerCase();

    const userMsg = { sender: 'user', text: queryRaw };

    const greetingKeywords = ['გამარჯობა', 'სალამი', 'hi', 'hello', 'როგორ ხარ'];
    if (greetingKeywords.some(k => queryLower.includes(k) && queryLower.length < 20)) {
      const aiGreetingMsg = {
        sender: 'ai',
        text: `მოგესალმებით! 👋 მე ვარ ${siteSettings.storeName}-ის პერსონალური AI ექსპერტი. რით შემიძლია დაგეხმაროთ დღეს?`,
        recommendedProducts: []
      };
      setAiChatHistory(prev => [...prev, userMsg, aiGreetingMsg]);
      setAiInputText('');
      return;
    }

    let matchedProducts = products.filter(p => {
      if (p.priceGEL > aiBudget) return false;
      if (aiCategory !== 'ყველა' && p.category !== aiCategory) return false;
      return p.name.toLowerCase().includes(queryLower) || p.category.toLowerCase().includes(queryLower);
    });

    if (matchedProducts.length === 0) matchedProducts = products.slice(0, 3);

    const aiMsg = {
      sender: 'ai',
      text: `✨ თქვენი მოთხოვნის მიხედვით მოვიძიე შემდეგი პროდუქტები:`,
      recommendedProducts: matchedProducts.slice(0, 4)
    };

    setAiChatHistory(prev => [...prev, userMsg, aiMsg]);
    setAiInputText('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 md:pb-0 selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between overflow-x-hidden w-full">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-xl border border-emerald-300 animate-bounce flex items-center gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-slate-950" />
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-xl w-full">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-slate-950 text-[10px] py-1 px-3 font-black flex justify-between items-center w-full">
          <div className="flex items-center gap-1.5 truncate">
            <span>🇬🇪</span>
            <span className="truncate">{siteSettings.topBarText}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-slate-950 text-emerald-400 hover:text-white px-2.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 font-black border border-emerald-400 shadow">
              <Bot className="w-3.5 h-3.5" /> AI ასისტენტი
            </button>
            <button onClick={() => setCurrency(prev => prev === 'GEL' ? 'USD' : 'GEL')} className="bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-400/40 font-black text-emerald-300 text-[10px]">
              {currency === 'GEL' ? '₾ GEL' : '$ USD'}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-slate-950 font-black">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
              {siteSettings.storeName}
            </span>
          </div>

          <div className="flex-1 max-w-sm relative hidden md:block">
            <input
              type="text"
              placeholder="ძებნა: iPhone, MacBook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-400"
            />
            <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setActiveTab('wishlist')} className="p-2.5 rounded-xl border bg-slate-900 border-emerald-500/30 text-slate-300 relative">
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={() => setActiveTab('cart')} className="p-2.5 rounded-xl border bg-slate-900 border-emerald-500/30 text-slate-300 relative">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
            <button onClick={() => setActiveTab('admin')} className={`p-2.5 rounded-xl border flex items-center gap-1.5 ${activeTab === 'admin' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
              <Settings className="w-4 h-4" />
              <span className="text-xs font-bold">ადმინი</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="max-w-7xl mx-auto px-3 py-5 w-full flex-1 space-y-5">
        {activeTab === 'store' && (
          <div className="space-y-5 w-full">
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                <div className="p-5 md:p-6 md:col-span-7 space-y-2.5">
                  <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full">
                    🏪 მარკეტფლეისი
                  </span>
                  <h1 className="text-xl md:text-2xl font-black text-white">{siteSettings.heroTitle}</h1>
                  <p className="text-slate-300 text-xs">{siteSettings.heroSubtitle}</p>
                  <button onClick={() => setIsAiAssistantOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> AI ასისტენტი
                  </button>
                </div>
                <div className="h-36 md:h-52 md:col-span-5 relative">
                  <img src={banners[0]?.image} alt="Hero" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button onClick={() => setSelectedCategory('ყველა')} className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap border ${selectedCategory === 'ყველა' ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                ✨ ყველა
              </button>
              {categories.map(cat => (
                <button key={cat.id || cat} onClick={() => setSelectedCategory(cat.name || cat)} className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap border ${selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'bg-slate-900 text-slate-300 border-slate-800'}`}>
                  {cat.icon || ''} {cat.name || cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="bg-slate-900 border border-emerald-500/20 hover:border-emerald-400 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 mb-3 p-3 flex items-center justify-center border border-slate-800">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-contain" />
                      {prod.discountPercent > 0 && (
                        <span className="absolute top-2.5 left-2.5 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full">
                          -{prod.discountPercent}%
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase">{prod.category}</span>
                    <h3 className="font-bold text-white text-xs md:text-sm mb-1 line-clamp-2">{prod.name}</h3>
                  </div>
                  <div className="pt-2.5 border-t border-slate-800 space-y-2.5">
                    <div className="text-base md:text-lg font-black text-emerald-400">{formatPrice(prod.priceGEL)}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => addToCart(prod)} className="bg-emerald-500 text-slate-950 py-2 rounded-xl text-xs font-black">
                        კალათაში
                      </button>
                      <button onClick={() => { setQuickBuyProduct(prod); setIsCheckoutOpen(true); }} className="bg-slate-950 border border-emerald-500/40 text-emerald-300 py-2 rounded-xl text-xs font-black">
                        ყიდვა
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-black text-white">🛒 საყიდლების კალათა</h2>
            {cart.length === 0 ? <p className="text-slate-500 text-xs">კალათა ცარიელია.</p> : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-white">{item.name}</h4>
                      <p className="text-emerald-400 font-bold">{formatPrice(item.priceGEL)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 py-1 bg-slate-800 rounded font-bold">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 py-1 bg-slate-800 rounded font-bold">+</button>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-400 font-bold ml-2">✕</button>
                    </div>
                  </div>
                ))}
                <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center">
                  <span className="font-black text-white text-sm">სულ: {formatPrice(cartTotalGEL)}</span>
                  <button onClick={() => setIsCheckoutOpen(true)} className="bg-emerald-500 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs">შეკვეთა</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN PANEL */}
        {activeTab === 'admin' && (
          <div className="space-y-5">
            {!adminLoggedIn ? (
              <div className="max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-center">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto" />
                <h2 className="text-base font-bold text-white">ადმინისტრატორის შესვლა</h2>
                <form onSubmit={handleAdminLogin} className="space-y-2.5">
                  <input type="text" placeholder="მომხმარებელი" value={adminLoginForm.username} onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                  <input type="password" placeholder="პაროლი" value={adminLoginForm.password} onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                  {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="flex gap-2">
                    {['dashboardPro', 'products', 'orders', 'security'].map(sub => (
                      <button key={sub} onClick={() => setAdminActiveSubTab(sub)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${adminActiveSubTab === sub ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-300'}`}>
                        {sub === 'dashboardPro' ? '📊 Dashboard' : sub === 'products' ? '📦 პროდუქცია' : sub === 'orders' ? '📋 შეკვეთები' : '🔒 უსაფრთხოება'}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleAdminLogout} className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold">გასვლა</button>
                </div>

                {adminActiveSubTab === 'dashboardPro' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <p className="text-slate-400 text-xs font-bold">შემოსავალი</p>
                      <p className="text-xl font-black text-emerald-400 mt-1">{proAnalytics.totalRevenueGEL} ₾</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <p className="text-slate-400 text-xs font-bold">შეკვეთები</p>
                      <p className="text-xl font-black text-blue-400 mt-1">{orders.length}</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <p className="text-slate-400 text-xs font-bold">ვიზიტორები</p>
                      <p className="text-xl font-black text-teal-400 mt-1">{visitorCount}</p>
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'products' && (
                  <div className="bg-slate-900 p-5 rounded-2xl space-y-4 border border-slate-800">
                    <h3 className="font-bold text-sm text-white">პროდუქციის დამატება</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const newProd = { ...newProductForm, id: `prod-${Date.now()}`, image: uploadedMainImg || newProductForm.image };
                      setProducts([newProd, ...products]);
                      setUploadedMainImg('');
                      showToast('✅ პროდუქტი დაემატა!');
                    }} className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <input type="text" placeholder="სახელწოდება" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} className="w-full bg-slate-900 p-2 rounded text-xs text-white outline-none" />
                      <input type="number" placeholder="ფასი (₾)" value={newProductForm.priceGEL} onChange={e => setNewProductForm({...newProductForm, priceGEL: Number(e.target.value)})} className="w-full bg-slate-900 p-2 rounded text-xs text-white outline-none" />
                      <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2 rounded text-xs font-bold">+ დამატება</button>
                    </form>
                    <div className="space-y-2">
                      {products.map(p => (
                        <div key={p.id} className="bg-slate-950 p-2.5 rounded-xl text-xs flex justify-between items-center border border-slate-800">
                          <span>{p.name} ({p.priceGEL} ₾)</span>
                          <button onClick={() => setProducts(products.filter(x => x.id !== p.id))} className="text-rose-400 font-bold">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminActiveSubTab === 'orders' && (
                  <div className="bg-slate-900 p-5 rounded-2xl space-y-3 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm text-white">შეკვეთები</h3>
                      <button onClick={exportOrdersCSV} className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold">CSV ექსპორტი</button>
                    </div>
                    {orders.map(o => (
                      <div key={o.id} className="bg-slate-950 p-3 rounded-xl text-xs flex justify-between items-center border border-slate-800">
                        <div>
                          <p className="font-bold text-emerald-400">#{o.id} - {o.customerName} ({o.totalGEL} ₾)</p>
                          <p className="text-slate-400">{o.address}</p>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded font-bold">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 relative space-y-3.5">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-3 right-3 text-slate-400">✕</button>
            <h3 className="text-sm font-bold text-white">შეკვეთის გაფორმება</h3>
            <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(quickBuyProduct ? [quickBuyProduct] : cart, quickBuyProduct ? quickBuyProduct.priceGEL : cartTotalGEL, !!quickBuyProduct); }} className="space-y-2.5">
              <input type="text" required placeholder="სახელი" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-950 p-2.5 rounded text-xs text-white outline-none" />
              <input type="tel" required placeholder="ტელეფონი" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-950 p-2.5 rounded text-xs text-white outline-none" />
              <input type="text" required placeholder="მისამართი" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-950 p-2.5 rounded text-xs text-white outline-none" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded font-black text-xs">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* AI ASSISTANT MODAL */}
      {isAiAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-xl w-full h-[500px] flex flex-col relative">
            <div className="bg-emerald-500 p-3 text-slate-950 font-black flex justify-between items-center shrink-0">
              <span className="flex items-center gap-1"><Bot className="w-5 h-5" /> AI ასისტენტი</span>
              <button onClick={() => setIsAiAssistantOpen(false)} className="bg-slate-950 text-white w-6 h-6 rounded-full text-xs">✕</button>
            </div>
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-slate-950/60">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[90%] ${msg.sender === 'user' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 border border-slate-800 text-white'}`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-slate-900 border-t border-slate-800">
              <form onSubmit={(e) => { e.preventDefault(); handleAiAsk(); }} className="flex gap-2">
                <input type="text" placeholder="ჰკითხეთ AI-ს..." value={aiInputText} onChange={e => setAiInputText(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                <button type="submit" className="bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs">გაგზავნა</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[11px] text-slate-500">
        <p>© 2026 {siteSettings.storeName}. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
