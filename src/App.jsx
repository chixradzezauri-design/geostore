// src/App.jsx
// GEOSTORE — Supabase Auth integration
// არსებული მაღაზიის ფუნქციები და დიზაინი შენარჩუნებულია.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';

import Header from './components/Header';
import StoreView from './components/StoreView';
import AdminDashboardPro from './components/AdminDashboardPro';
import AiAssistantModal from './components/AiAssistantModal';
import ProductCompareModal from './components/ProductCompareModal';
import Modals from './components/Modals';
import ImageSearchModal from './components/ImageSearchModal';
import AIDigitalWardrobe from './components/AIDigitalWardrobe';

import {
  MessageSquare,
  Heart,
  ShoppingBag,
  User,
  ShieldCheck,
  FileText,
  Bot,
  Sparkles,
  Tag,
  X,
  Share2,
  Truck,
  Smartphone
} from 'lucide-react';

import { translations } from './utils/translations';

const SUPABASE_URL = 'https://xmtnszxtnfxnrojionoa.supabase.co';

// ეს გასაღები მხოლოდ Supabase-ის საჯარო anon/publishable გასაღები უნდა იყოს.
// არასოდეს გამოიყენო აქ service_role გასაღები.
const SUPABASE_ANON_KEY = supabase.supabaseKey;

const getSupabaseHeaders = async ({ authenticated = false } = {}) => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${authenticated && session?.access_token ? session.access_token : SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
};

// Telegram-ის შეტყობინება დროებით გამორთულია.
// Bot Token არ უნდა ინახებოდეს React-ის ან browser-ის კოდში.
// Telegram-ის ხელახლა ჩართვა საჭიროა მხოლოდ სერვერული ფუნქციით.
const sendTelegramNotification = () => {
  console.warn(
    'Telegram შეტყობინება გამორთულია. საჭიროა უსაფრთხო სერვერული ინტეგრაცია.'
  );
};

const DEFAULT_CATEGORIES = [
  { id: 'fashion-clothing', name: 'ტანსაცმელი', icon: 'Shirt', parentId: null },
  { id: 'fashion-shoes', name: 'ფეხსაცმელი', icon: 'Footprints', parentId: null },
  { id: 'fashion-bags', name: 'ჩანთები', icon: 'Briefcase', parentId: null },
  { id: 'fashion-accessories', name: 'აქსესუარები', icon: 'Sparkles', parentId: null },
  { id: 'fashion-jewelry', name: 'სამკაულები', icon: 'Gem', parentId: null }
];

const DEFAULT_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, status: 'აქტიური' }
];

const DEFAULT_PRODUCTS = [];

const DEFAULT_COUPONS = [];

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'მოგესალმებით GEOSTORE-ში!',
    message: 'აღმოაჩინეთ ტანსაცმლის, ფეხსაცმლისა და აქსესუარების ახალი კოლექცია.',
    date: 'დღეს',
    read: false
  },
  {
    id: 'n2',
    title: 'უფასო მიწოდება',
    message: 'მიწოდება თბილისის მასშტაბით სრულიად უფასოა!',
    date: 'გუშინ',
    read: false
  }
];

// Supabase Auth მომხმარებლის ფორმატის შენარჩუნება,
// რათა არსებული Header და პროფილის კომპონენტები იმუშაოს.
const normalizeAuthUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || '',
    phone: user.user_metadata?.phone || ''
  };
};

// ადმინისტრატორს ვამოწმებთ Supabase-ის სანდო app_metadata.role-ით
// და უცვლელი Auth user ID-ით — ელფოსტის ცვლილება/შეცდომა წვდომას აღარ არღვევს.
const isAuthorizedAdmin = (user) =>
  user?.app_metadata?.role === 'admin' &&
  user?.id === '1060de3d-d28a-45f8-9a64-5e0368cffc4b';

const normalizeOrderStatus = (status) => String(status || '').trim().toLowerCase();

const getOrderStatusClasses = (status) => {
  switch (normalizeOrderStatus(status)) {
    case 'ახალი': case 'new': case 'новый':
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/40';
    case 'მუშავდება': case 'processing': case 'в обработке':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/40';
    case 'გაგზავნილი': case 'გზაშია': case 'shipped': case 'on the way': case 'отправлен': case 'в пути':
      return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/40';
    case 'დასრულებული': case 'ჩაბარებულია': case 'delivered': case 'completed': case 'доставлен': case 'завершён':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40';
    case 'გაუქმებული': case 'cancelled': case 'canceled': case 'отменён':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/40';
    default:
      return 'bg-slate-500/10 text-slate-300 border border-slate-500/40';
  }
};

const localizeOrderStatus = (status, lang = 'ka') => {
  const key = normalizeOrderStatus(status);
  const labels = {
    'ახალი': ['ახალი', 'New', 'Новый'], new: ['ახალი', 'New', 'Новый'], 'новый': ['ახალი', 'New', 'Новый'],
    'მუშავდება': ['მუშავდება', 'Processing', 'В обработке'], processing: ['მუშავდება', 'Processing', 'В обработке'], 'в обработке': ['მუშავდება', 'Processing', 'В обработке'],
    'გაგზავნილი': ['გაგზავნილი', 'Shipped', 'Отправлен'], shipped: ['გაგზავნილი', 'Shipped', 'Отправлен'], 'გზაშია': ['გზაშია', 'On the way', 'В пути'], 'on the way': ['გზაშია', 'On the way', 'В пути'], 'в пути': ['გზაშია', 'On the way', 'В пути'], 'отправлен': ['გაგზავნილი', 'Shipped', 'Отправлен'],
    'დასრულებული': ['დასრულებული', 'Completed', 'Завершён'], completed: ['დასრულებული', 'Completed', 'Завершён'], 'ჩაბარებულია': ['ჩაბარებულია', 'Delivered', 'Доставлен'], delivered: ['ჩაბარებულია', 'Delivered', 'Доставлен'], 'доставлен': ['ჩაბარებულია', 'Delivered', 'Доставлен'], 'завершён': ['დასრულებული', 'Completed', 'Завершён'],
    'გაუქმებული': ['გაუქმებული', 'Cancelled', 'Отменён'], cancelled: ['გაუქმებული', 'Cancelled', 'Отменён'], canceled: ['გაუქმებული', 'Cancelled', 'Отменён'], 'отменён': ['გაუქმებული', 'Cancelled', 'Отменён']
  };
  const languageIndex = lang === 'en' ? 1 : lang === 'ru' ? 2 : 0;
  return labels[key]?.[languageIndex] || status || labels.new[languageIndex];
};

export default function App() {
  const loadSafeStorage = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);

      if (item !== null && item !== 'undefined' && item !== 'null') {
        return JSON.parse(item);
      }

      return fallback;
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        // localStorage შეიძლება მიუწვდომელი იყოს.
      }

      return fallback;
    }
  };

  const [currentLang, setCurrLang] = useState(() => {
    try {
      return localStorage.getItem('geostore_lang') || 'ka';
    } catch {
      return 'ka';
    }
  });

  const t = translations[currentLang] || translations.ka;

  const [siteSettings, setSiteSettings] = useState(() => {
    const defaults = {
      storeName: 'GEOSTORE',
      topBarText: 'GEOSTORE — შენი სტილი, შენი არჩევანი',
      heroTitle: 'შენი სტილი. შენი არჩევანი.',
      heroSubtitle: 'აღმოაჩინე ტანსაცმლის, ფეხსაცმლისა და აქსესუარების შერჩეული კოლექცია.'
    };
    const saved = loadSafeStorage('geostore_site_settings', null);
    if (!saved || typeof saved !== 'object') return defaults;

    // Migrate only untouched legacy technology-store copy; preserve owner edits.
    return {
      ...defaults,
      ...saved,
      topBarText: saved.topBarText === 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი' ? defaults.topBarText : saved.topBarText,
      heroTitle: saved.heroTitle === 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით' ? defaults.heroTitle : saved.heroTitle,
      heroSubtitle: saved.heroSubtitle === 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!' ? defaults.heroSubtitle : saved.heroSubtitle
    };
  });

  const [deliveryFees, setDeliveryFees] = useState(() =>
    loadSafeStorage('geostore_delivery_fees', {
      tbilisi: 0,
      bigCities: 10,
      other: 15
    })
  );

  const [selectedRegion, setSelectedRegion] = useState('tbilisi');

  const [categories, setCategoriesList] = useState(() => {
    const saved = loadSafeStorage('geostore_cats', null);
    const legacyTechnologyCategories = new Set([
      'სმარტფონები', 'ლეპტოპები', 'აქსესუარები', 'ჭკვიანი საათები', 'ტელევიზორები'
    ]);
    const isUntouchedLegacySeed =
      Array.isArray(saved) &&
      saved.length > 0 &&
      saved.length <= 5 &&
      saved.every((category) => legacyTechnologyCategories.has(category?.name));

    // Replace only the untouched default technology categories; custom categories stay intact.
    return !Array.isArray(saved) || saved.length === 0 || isUntouchedLegacySeed
      ? DEFAULT_CATEGORIES
      : saved;
  });

  const [vendorsList, setVendorsList] = useState(() =>
    loadSafeStorage('geostore_vendors', DEFAULT_VENDORS)
  );

  const [products, setProducts] = useState(() =>
    loadSafeStorage('geostore_products', DEFAULT_PRODUCTS)
  );

  const [coupons, setCoupons] = useState(() =>
    loadSafeStorage('geostore_coupons', DEFAULT_COUPONS)
  );

  const [bannersList, setBannersList] = useState(() =>
    loadSafeStorage('geostore_banners', [])
  );

  const [notifications, setNotifications] = useState(() =>
    loadSafeStorage('geostore_notifications', DEFAULT_NOTIFICATIONS)
  );

  const [promoSlots] = useState([
    {
      id: 'ps1',
      title: 'საგაზაფხულო ფასდაკლებები',
      tag: 'HOT DEAL',
      bgGradient: 'from-emerald-600/30 to-teal-800/40'
    },
    {
      id: 'ps2',
      title: '0% განვადება 24 თვემდე',
      tag: 'FINANCE',
      bgGradient: 'from-cyan-600/30 to-blue-800/40'
    },
    {
      id: 'ps3',
      title: 'უფასო მიწოდება თბილისში',
      tag: 'EXPRESS',
      bgGradient: 'from-green-600/30 to-emerald-900/40'
    }
  ]);

  const [activeTab, setActiveTab] = useState('store');

  // ეს URL პარამეტრი მხოლოდ ძველი ინტერფეისის გადართვას აკეთებს.
  // ის არ არის უსაფრთხო ადმინისტრატორის ავტორიზაცია.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('admin') === 'secret') {
      setActiveTab('admin');
    } else {
      setActiveTab((current) =>
        current === 'admin' ? 'store' : current
      );
    }
  }, []);

  const [selectedVendorFilter] = useState('ყველა');
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState(() =>
    loadSafeStorage('geostore_cart', [])
  );

  const [wishlist, setWishlist] = useState(() =>
    loadSafeStorage('geostore_wishlist', [])
  );

  const [comparisonList, setComparisonList] = useState(() =>
    loadSafeStorage('geostore_comparison', [])
  );

  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // მომხმარებლების ძველი ადგილობრივი სია შენარჩუნებულია
  // ადმინისტრაციული კომპონენტის თავსებადობისთვის.
  // ის აღარ გამოიყენება მომხმარებლის შესვლის ან რეგისტრაციისთვის.
  const [usersList, setUsersList] = useState(() =>
    loadSafeStorage('geostore_users_list', [])
  );

  // მომხმარებლის მდგომარეობა ახლა Supabase Auth-ის სესიიდან მოდის.
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [authForm, setAuthForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  // ადმინისტრატორის სტატუსი არასოდეს აღდგება localStorage-იდან.
  // ის დგინდება მხოლოდ Supabase Auth-ის დადასტურებული მომხმარებლით.
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const [adminLoginForm, setAdminLoginForm] = useState({
    username: '',
    password: '',
    remember: false
  });

  const [adminError, setAdminError] = useState('');

  const [orders, setOrders] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const orderSubmitLock = useRef(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

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

  // Supabase Auth: სესიის აღდგენა და ცვლილებების მოსმენა.
  useEffect(() => {
    let mounted = true;

    // ძველი localStorage მომხმარებლის მონაცემი აღარ გამოიყენება.
    try {
      localStorage.removeItem('geostore_current_user');
    } catch {
      // არაფერია გასაკეთებელი.
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const authUser = session?.user || null;
      const authorizedAdmin = isAuthorizedAdmin(authUser);
      setCurrentUser(normalizeAuthUser(authUser));
      setAdminLoggedIn(authorizedAdmin);
      // Route verified administrator accounts directly to the dashboard.
      // Ordinary users remain in the storefront; URL flags never grant access.
      setActiveTab((current) =>
        authorizedAdmin ? 'admin' : current === 'admin' ? 'store' : current
      );
      setAuthLoading(false);
    });

    const restoreSession = async () => {
      try {
        // getUser() ამოწმებს მომხმარებელს Supabase Auth სერვერზე;
        // მხოლოდ სანდო app_metadata.role='admin' ანიჭებს პანელზე წვდომას.
        const { data, error } = await supabase.auth.getUser();

        if (error && error.name !== 'AuthSessionMissingError') {
          throw error;
        }

        if (mounted) {
          const authUser = data?.user || null;
          const authorizedAdmin = isAuthorizedAdmin(authUser);
          setCurrentUser(normalizeAuthUser(authUser));
          setAdminLoggedIn(authorizedAdmin);
          setActiveTab((current) =>
            authorizedAdmin ? 'admin' : current === 'admin' ? 'store' : current
          );
        }
      } catch (error) {
        console.error('Supabase session restore error:', error);

        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    return () =>
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
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
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

    showToast('🔔 ყველა შეტყობინება მონიშნულია წაკითხულად');
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`,
        { headers: await getSupabaseHeaders({ authenticated: true }) }
      );

      if (res.ok) {
        const data = await res.json();

        setOrders(
          data.map((o) => ({
            id: o.id,
            date: o.created_at
              ? new Date(o.created_at).toLocaleDateString('ka-GE')
              : 'დღეს',
            customerName: o.customer_name,
            user_email: o.customer_email || o.user_email || '',
            phone: o.phone,
            address: o.address,
            totalGEL: Number(o.total_gel) || 0,
            status: o.status || 'ახალი',
            adminNote: o.admin_note || '',
            items: Array.isArray(o.items) ? o.items : [],
            stock_deducted_at: o.stock_deducted_at || null,
            stock_restored_at: o.stock_restored_at || null,
            itemSummary: Array.isArray(o.items)
              ? o.items
                  .map((i) => `${i.name} (x${i.quantity})`)
                  .join(', ')
              : 'პროდუქტები'
          }))
        );
      }
    } catch (error) {
      console.error('Orders fetch error:', error);
    }
  };

  const fetchProductsFromDatabase = async () => {
    try {
      const headers = await getSupabaseHeaders({ authenticated: adminLoggedIn });
      const res = adminLoggedIn
        ? await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_list_products`, {
            method: 'POST',
            headers,
            body: JSON.stringify({})
          })
        : await fetch(
            `${SUPABASE_URL}/rest/v1/products?select=id,sku,name,category,brand,vendor,price_gel,old_price_gel,stock,image,description,available_sizes,available_colors,material,durability,created_at,gallery,variants,tags,model,cpu,ram,storage,gpu,screen_size,os,is_featured&order=created_at.desc`,
            { headers }
          );

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(errorBody || 'პროდუქტების ჩატვირთვა ვერ მოხერხდა.');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map((p) => ({
          id: p.id,
          sku: p.sku || `GEO-${p.id}`,
          name: p.name,
          category: p.category || 'სმარტფონები',
          priceGEL: Number(p.price_gel),
          oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
          stock: p.stock === null || p.stock === undefined ? 0 : Number(p.stock),
          vendor: p.vendor || 'GEOSTORE',
          description: p.description || '',
          image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
          availableSizes: p.available_sizes || ['S', 'M', 'L', 'XL'],
          availableColors: p.available_colors || ['შავი', 'თეთრი'],
          gallery: p.gallery || (p.image ? [p.image] : []),
          variants: p.variants || [],
          tags: p.tags || [],
          // purchase_cost is returned only by the admin-only RPC.
          purchaseCost: p.purchase_cost === null || p.purchase_cost === undefined ? null : Number(p.purchase_cost),
          material: p.material || '',
          durability: p.durability || '',
          brand: p.brand || '',
          model: p.model || '',
          cpu: p.cpu || '',
          ram: p.ram || '',
          storage: p.storage || '',
          gpu: p.gpu || '',
          screenSize: p.screen_size || '',
          os: p.os || '',
          isFeatured: Boolean(p.is_featured)
        }));

        setProducts(formatted);
        try {
          localStorage.setItem('geostore_products', JSON.stringify(formatted));
        } catch {
          // localStorage შეიძლება მიუწვდომელი იყოს.
        }
      }
    } catch (error) {
      console.error('Products fetch error:', error);
    }
  };

  const lookupOrderForTracking = async (orderId, phone) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/lookup_order_for_tracking`,
      {
        method: 'POST',
        headers: await getSupabaseHeaders({ authenticated: true }),
        body: JSON.stringify({ p_order_id: orderId, p_phone: phone })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(errorBody || 'შეკვეთის მოძებნა ვერ მოხერხდა.');
    }

    return response.json();
  };

  const fetchStorePricingSettings = async () => {
    try {
      const headers = await getSupabaseHeaders();
      const [couponResponse, deliveryResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/store_coupons?select=id,code,discount_percent,min_order_gel,active&active=eq.true&order=code.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/store_delivery_fees?select=region,fee_gel`, { headers })
      ]);

      if (couponResponse.ok) {
        const rows = await couponResponse.json();
        if (Array.isArray(rows)) {
          setCoupons(rows.map((row) => ({
            id: row.id,
            code: row.code,
            discountPercent: Number(row.discount_percent),
            minOrderGEL: Number(row.min_order_gel) || 0,
            status: row.active ? 'აქტიური' : 'გამორთული'
          })));
        }
      }

      if (deliveryResponse.ok) {
        const rows = await deliveryResponse.json();
        if (Array.isArray(rows)) {
          setDeliveryFees((current) => {
            const next = { ...current };
            rows.forEach((row) => {
              if (Object.prototype.hasOwnProperty.call(next, row.region)) {
                next[row.region] = Number(row.fee_gel);
              }
            });
            return next;
          });
        }
      }
    } catch (error) {
      console.error('Store pricing settings fetch error:', error);
    }
  };

  useEffect(() => {
    fetchStorePricingSettings();
  }, []);
  const buildStorefrontSnapshot = () => ({
    schemaVersion: 1,
    siteSettings,
    categories,
    banners: bannersList || [],
    updatedAt: new Date().toISOString()
  });

  const fetchStorefrontConfig = async (adminMode = false) => {
    try {
      if (adminMode) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isAuthorizedAdmin(session?.user)) return;
      }
      const headers = await getSupabaseHeaders({ authenticated: adminMode });
      const fields = adminMode ? 'draft_config,published_config' : 'published_config';
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/storefront_config?config_key=eq.main&select=${fields}`,
        { headers }
      );
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      const config = adminMode
        ? (rows?.[0]?.draft_config || rows?.[0]?.published_config)
        : rows?.[0]?.published_config;
      if (!config || typeof config !== 'object') return;

      if (config.siteSettings && typeof config.siteSettings === 'object') {
        setSiteSettings((current) => ({ ...current, ...config.siteSettings }));
      }
      if (Array.isArray(config.categories)) setCategoriesList(config.categories);
      if (Array.isArray(config.banners)) setBannersList(config.banners);
    } catch (error) {
      console.error('Storefront config fetch error:', error);
    }
  };

  const saveStorefrontDraft = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!isAuthorizedAdmin(session?.user)) {
      throw new Error('დიზაინის მონახაზის შესანახად საჭიროა ადმინისტრატორის ავტორიზაცია.');
    }
    const headers = await getSupabaseHeaders({ authenticated: true });
    const existingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/storefront_config?config_key=eq.main&select=is_published`,
      { headers }
    );
    if (!existingResponse.ok) throw new Error(await existingResponse.text());
    const existingRows = await existingResponse.json();
    const snapshot = buildStorefrontSnapshot();
    const now = new Date().toISOString();
    const payload = {
      config_key: 'main',
      draft_config: snapshot,
      is_published: Boolean(existingRows?.[0]?.is_published),
      draft_updated_at: now,
      updated_by: session.user.id
    };
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/storefront_config?on_conflict=config_key`,
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) throw new Error(await response.text());
    showToast('მაღაზიის დიზაინის მონახაზი უსაფრთხოდ შეინახა.');
    return snapshot;
  };

  const publishStorefrontConfig = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!isAuthorizedAdmin(session?.user)) {
      throw new Error('გამოსაქვეყნებლად საჭიროა ადმინისტრატორის ავტორიზაცია.');
    }
    const snapshot = await saveStorefrontDraft();
    const headers = await getSupabaseHeaders({ authenticated: true });
    const versionResponse = await fetch(`${SUPABASE_URL}/rest/v1/storefront_versions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        config_key: 'main',
        snapshot,
        version_label: `GEOSTORE publish ${new Date().toLocaleString('ka-GE')}`,
        created_by: session.user.id
      })
    });
    if (!versionResponse.ok) throw new Error(await versionResponse.text());

    const now = new Date().toISOString();
    const publishResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/storefront_config?on_conflict=config_key`,
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          config_key: 'main',
          draft_config: snapshot,
          published_config: snapshot,
          is_published: true,
          draft_updated_at: now,
          published_at: now,
          updated_by: session.user.id
        })
      }
    );
    if (!publishResponse.ok) throw new Error(await publishResponse.text());
    showToast('მაღაზიის ცვლილებები გამოქვეყნდა.');
    return true;
  };

  useEffect(() => {
    fetchStorefrontConfig(false);
  }, []);

  useEffect(() => {
    if (adminLoggedIn) fetchStorefrontConfig(true);
  }, [adminLoggedIn]);

  useEffect(() => {
    if (adminLoggedIn) {
      fetchOrders();
    }
    fetchProductsFromDatabase();

    const interval = setInterval(() => {
      // Avoid background polling on hidden tabs and reduce unnecessary Supabase traffic.
      if (document.visibilityState !== 'visible') return;
      if (adminLoggedIn) fetchOrders();
      fetchProductsFromDatabase();
    }, 30000);

    return () => clearInterval(interval);
  }, [adminLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_users_list',
        JSON.stringify(usersList)
      );
    } catch {
      // localStorage შეიძლება მიუწვდომელი იყოს.
    }
  }, [usersList]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_products',
        JSON.stringify(products)
      );
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_cats',
        JSON.stringify(categories)
      );
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_vendors',
        JSON.stringify(vendorsList)
      );
    } catch {}
  }, [vendorsList]);

  useEffect(() => {
    try {
      localStorage.setItem('geostore_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_wishlist',
        JSON.stringify(wishlist)
      );
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_comparison',
        JSON.stringify(comparisonList)
      );
    } catch {}
  }, [comparisonList]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_coupons',
        JSON.stringify(coupons)
      );
    } catch {}
  }, [coupons]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_site_settings',
        JSON.stringify(siteSettings)
      );
    } catch {}
  }, [siteSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_delivery_fees',
        JSON.stringify(deliveryFees)
      );
    } catch {}
  }, [deliveryFees]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_banners',
        JSON.stringify(bannersList)
      );
    } catch {}
  }, [bannersList]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'geostore_notifications',
        JSON.stringify(notifications)
      );
    } catch {}
  }, [notifications]);

  const cartSubtotalGEL = useMemo(() => {
    const itemsToCalc = quickBuyProduct
      ? [quickBuyProduct]
      : cart;

    return itemsToCalc.reduce(
      (acc, item) =>
        acc + item.priceGEL * (item.quantity || 1),
      0
    );
  }, [cart, quickBuyProduct]);

  const currentDeliveryCost = useMemo(() => {
    if (selectedRegion === 'tbilisi') {
      return deliveryFees.tbilisi;
    }

    if (selectedRegion === 'bigCities') {
      return deliveryFees.bigCities;
    }

    return deliveryFees.other;
  }, [selectedRegion, deliveryFees]);

  const cartTotalGEL = useMemo(() => {
    const sub = appliedCoupon
      ? cartSubtotalGEL -
        (cartSubtotalGEL * appliedCoupon.discountPercent) / 100
      : cartSubtotalGEL;

    return Math.max(0, sub) + currentDeliveryCost;
  }, [cartSubtotalGEL, appliedCoupon, currentDeliveryCost]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();

    const cleanCode = promoInput.trim().toUpperCase();

    if (!cleanCode) return;

    const found = coupons.find(
      (c) =>
        c.code.toUpperCase() === cleanCode &&
        (c.status === 'აქტიური' || !c.status)
    );

    if (found) {
      setAppliedCoupon(found);

      showToast(
        `🎉 პრომო-კოდი გააქტიურდა (-${found.discountPercent}%)!`
      );

      setPromoInput('');
    } else {
      alert('არასწორი ან გაუქმებული პრომო-კოდი!');
    }
  };

  const proAnalytics = useMemo(() => {
    const totalRevenueGEL = orders.reduce(
      (acc, o) => acc + (Number(o.totalGEL) || 0),
      0
    );

    return {
      totalRevenueGEL,
      netProfitGEL: totalRevenueGEL * 0.25,
      totalOrdersCount: orders.length,
      lowStockProducts: products.filter((p) => p.stock <= 3)
    };
  }, [orders, products]);

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity
              }
            : item
        );
      }

      return [...prev, { ...product, quantity }];
    });

    showToast(`🛒 "${product.name}" დაემატა კალათაში!`);
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some(
        (item) => item.id === product.id
      );

      if (exists) {
        showToast('წაიშალა სურვილების სიიდან');

        return prev.filter(
          (item) => item.id !== product.id
        );
      }

      showToast('❤️ დაემატა სურვილების სიაში!');

      return [...prev, product];
    });
  };

  const toggleComparison = (product) => {
    setComparisonList((prev) => {
      const exists = prev.some(
        (item) => item.id === product.id
      );

      if (exists) {
        showToast('წაიშალა შედარების სიიდან');

        return prev.filter(
          (item) => item.id !== product.id
        );
      }

      if (prev.length >= 4) {
        alert(
          'შედარებაში შესაძლებელია მაქსიმუმ 4 პროდუქტის დამატება!'
        );

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

    const wishlistText =
      `🎁 ჩემი ფავორიტი პროდუქტების სია GEOSTORE-დან:\n` +
      wishlist
        .map(
          (w, idx) =>
            `${idx + 1}. ${w.name} - ${w.priceGEL} ₾`
        )
        .join('\n') +
      `\n\nაღმოაჩინე საუკეთესო ტექნოლოგიები!`;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(wishlistText)
        .then(() => {
          showToast(
            '📋 სურვილების სიის ტექსტი დაკოპირდა ბუფერში!'
          );
        })
        .catch(() => {
          alert(wishlistText);
        });
    } else {
      alert(wishlistText);
    }
  };

  // Supabase Auth რეგისტრაცია და შესვლა.
  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;

    if (!email || !password) {
      alert(currentLang === 'en' ? 'Enter your email and password.' : currentLang === 'ru' ? 'Введите электронную почту и пароль.' : 'შეიყვანეთ ელ-ფოსტა და პაროლი.');
      return;
    }

    if (password.length < 6) {
      alert(currentLang === 'en' ? 'Password must contain at least 6 characters.' : currentLang === 'ru' ? 'Пароль должен содержать не менее 6 символов.' : 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.');
      return;
    }

    try {
      if (authMode === 'register') {
        const name = authForm.name.trim();
        const phone = authForm.phone.trim();

        if (!name || !phone) {
          alert(currentLang === 'en' ? 'Enter your name and phone number.' : currentLang === 'ru' ? 'Укажите имя и номер телефона.' : 'შეავსეთ სახელი და ტელეფონის ნომერი.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              phone
            }
          }
        });

        if (error) {
          throw error;
        }

        // თუ Supabase-ში Email Confirmation ჩართულია,
        // მომხმარებელი შესული არ არის მანამ, სანამ სესია არ შეიქმნება.
        if (data.session && data.user) {
          setCurrentUser(normalizeAuthUser(data.user));
          setIsAuthOpen(false);

          setAuthForm({
            name: '',
            phone: '',
            email: '',
            password: ''
          });

          showToast(currentLang === 'en' ? '🎉 Registration successful!' : currentLang === 'ru' ? '🎉 Регистрация прошла успешно!' : '🎉 რეგისტრაცია წარმატებულია!');
        } else {
          setIsAuthOpen(false);

          setAuthForm({
            name: '',
            phone: '',
            email: '',
            password: ''
          });

          alert(
            currentLang === 'en' ? 'Registration received. Check your email and confirm your account to finish signing in.' : currentLang === 'ru' ? 'Заявка на регистрацию принята. Проверьте почту и подтвердите аккаунт, чтобы завершить вход.' : 'რეგისტრაცია მიღებულია. შესვლის დასასრულებლად შეამოწმეთ ელ-ფოსტა და დაადასტურეთ ანგარიში.'
          );
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          throw error;
        }

        if (!data.session || !data.user) {
          throw new Error(
            currentLang === 'en' ? 'Could not create a sign-in session. Please try again.' : currentLang === 'ru' ? 'Не удалось создать сеанс входа. Попробуйте еще раз.' : 'ავტორიზაციის სესია ვერ შეიქმნა. სცადეთ ხელახლა.'
          );
        }

        setCurrentUser(normalizeAuthUser(data.user));
        setIsAuthOpen(false);

        setAuthForm({
          name: '',
          phone: '',
          email: '',
          password: ''
        });

        showToast(currentLang === 'en' ? '🔑 Signed in successfully!' : currentLang === 'ru' ? '🔑 Вход выполнен успешно!' : '🔑 ავტორიზაცია წარმატებულია!');
      }
    } catch (error) {
      console.error('Supabase authentication error:', error);

      const message = error?.message || '';

      if (
        message.toLowerCase().includes('invalid login credentials')
      ) {
        alert(currentLang === 'en' ? 'Incorrect email or password.' : currentLang === 'ru' ? 'Неверная почта или пароль.' : 'არასწორი ელ-ფოსტა ან პაროლი.');
      } else if (
        message.toLowerCase().includes('user already registered')
      ) {
        alert(currentLang === 'en' ? 'This email is already registered. Please sign in.' : currentLang === 'ru' ? 'Этот адрес электронной почты уже зарегистрирован. Войдите в аккаунт.' : 'ეს ელ-ფოსტა უკვე რეგისტრირებულია. სცადეთ შესვლა.');
      } else if (
        message.toLowerCase().includes('email not confirmed')
      ) {
        alert(currentLang === 'en' ? 'Please confirm your email address first.' : currentLang === 'ru' ? 'Сначала подтвердите адрес электронной почты.' : 'გთხოვთ, ჯერ დაადასტუროთ ელ-ფოსტა.');
      } else {
        alert(
          currentLang === 'en' ? `Sign-in error: ${message || 'Unknown error'}` : currentLang === 'ru' ? `Ошибка входа: ${message || 'Неизвестная ошибка'}` : `ავტორიზაციის შეცდომა: ${message || 'უცნობი შეცდომა'}`
        );
      }
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setCurrentUser(null);
      setActiveTab('store');

      showToast(currentLang === 'en' ? 'Signed out successfully.' : currentLang === 'ru' ? 'Вы успешно вышли из аккаунта.' : 'ანგარიშიდან წარმატებით გამოხვედით.');
    } catch (error) {
      console.error('Supabase logout error:', error);

      alert(
        currentLang === 'en' ? 'Could not sign out. Please try again.' : currentLang === 'ru' ? 'Не удалось выйти из аккаунта. Попробуйте еще раз.' : 'ანგარიშიდან გამოსვლა ვერ მოხერხდა. სცადეთ ხელახლა.'
      );
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      if (!isAuthorizedAdmin(data?.user)) {
        setAdminLoggedIn(false);
        setAdminError('ამ ანგარიშს ადმინისტრატორის უფლებები არ აქვს.');
        return;
      }

      setAdminLoggedIn(true);
      showToast('🔓 ადმინისტრატორის წვდომა დადასტურებულია.');
    } catch (error) {
      setAdminLoggedIn(false);
      setAdminError(error.message || 'ვერ მოხერხდა ანგარიშის შემოწმება.');
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // Synchronous lock prevents rapid double taps before React rerenders.
    if (orderSubmitLock.current) return;
    orderSubmitLock.current = true;
    setIsSubmittingOrder(true);
    setCheckoutError('');
    showToast('შეკვეთის გაგზავნა დაიწყო...');

    const customerName = checkoutForm.name?.trim() || '';
    const customerPhone = checkoutForm.phone?.trim() || '';
    const customerEmail = checkoutForm.email?.trim().toLowerCase() || '';
    const customerAddress = checkoutForm.address?.trim() || '';

    if (!customerName || !customerPhone || !customerAddress) {
      const message = 'შეავსეთ სახელი, ტელეფონი და მისამართი.';
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    if (!currentUser?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      const message = 'სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელ-ფოსტა.';
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    const buildOrderItemSnapshot = (item, quantity) => {
      const catalogProduct = (products || []).find(product => String(product.id) === String(item.id));
      const rawPurchaseCost = catalogProduct?.purchaseCost ?? catalogProduct?.purchase_cost;
      const purchaseCost = rawPurchaseCost === null || rawPurchaseCost === undefined || rawPurchaseCost === ''
        ? null
        : (Number.isFinite(Number(rawPurchaseCost)) && Number(rawPurchaseCost) > 0 ? Number(rawPurchaseCost) : null);
      return {
        id: item.id,
        name: item.name,
        price: Number(item.priceGEL ?? item.price) || 0,
        quantity: Math.max(1, Number(quantity) || 1),
        purchase_cost: purchaseCost,
        category: catalogProduct?.category || item.category || '',
        vendor: catalogProduct?.vendor || item.vendor || ''
      };
    };

    const itemsToOrder = quickBuyProduct
      ? [buildOrderItemSnapshot(quickBuyProduct, 1)]
      : cart.map(item => buildOrderItemSnapshot(item, item.quantity));

    if (itemsToOrder.length === 0) {
      const message = 'კალათა ცარიელია. დაამატეთ პროდუქტი შეკვეთამდე.';
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    const regionText =
      selectedRegion === 'tbilisi'
        ? t.tbilisiDelivery
        : selectedRegion === 'bigCities'
          ? t.bigCitiesDelivery
          : t.otherDelivery;

    let orderUserEmail = 'guest';
    let serverOrderResult = null;
    // Keep the order ID in the outer scope: it is needed after the RPC succeeds.
    let orderId = '';

    try {
      // 128-bit random ID prevents predictable order references; legacy IDs remain valid.
      const randomOrderIdBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomOrderIdBytes);
      orderId = `ORD-${Array.from(randomOrderIdBytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

      // ერთი და იგივე Supabase სესია განსაზღვრავს მომხმარებლის ელფოსტასაც
      // და Authorization ტოკენსაც, რათა RLS შემოწმება თანმიმდევრული იყოს.
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const orderSession = session?.access_token && session?.user?.email ? session : null;
      orderUserEmail = orderSession?.user?.email || customerEmail;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderUserEmail)) {
        throw new Error('შეკვეთისთვის საჭიროა სწორი ელ-ფოსტა.');
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/create_order_with_stock`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${orderSession?.access_token || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_order: {
              id: orderId,
              customer_name: customerName,
              phone: customerPhone,
              address: `${customerAddress} (${regionText}, მიწოდება: ${currentDeliveryCost} ₾)`,
              // სტუმრის იდენტობა ბაზის ფუნქციას ცალკე sentinel-ით გადაეცემა;
              // საკონტაქტო ელფოსტა ინახება customer_email ველში.
              user_email: orderSession?.user?.email || 'guest',
              customer_email: orderUserEmail,
              items: itemsToOrder,
              coupon_code: appliedCoupon?.code || '',
              delivery_region: selectedRegion,
              total_gel: cartTotalGEL
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          errorBody || 'შეკვეთა ბაზაში ვერ შეინახა. გთხოვთ, სცადოთ თავიდან.'
        );
      }

      serverOrderResult = await response.json();
      if (!serverOrderResult?.order_id || serverOrderResult.order_id !== orderId) {
        throw new Error('სერვერისგან შეკვეთის დადასტურება ვერ მივიღეთ.');
      }
    } catch (err) {
      console.error('Order submission failed:', err);
      const message =
        err.message || 'შეკვეთის გაგზავნა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.';
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    const newOrderObj = {
      id: orderId,
      date: new Date().toLocaleDateString('ka-GE'),
      customer_name: customerName,
      customerName: customerName,
      phone: customerPhone,
      address: `${customerAddress} (${regionText}, მიწოდება: ${Number(serverOrderResult.delivery_gel) || 0} ₾)`,
      user_email: orderUserEmail,
      items: Array.isArray(serverOrderResult.items) ? serverOrderResult.items : itemsToOrder,
      totalGEL: Number(serverOrderResult.total_gel),
      total_gel: Number(serverOrderResult.total_gel),
      status: 'ახალი',
      itemSummary: (Array.isArray(serverOrderResult.items) ? serverOrderResult.items : itemsToOrder)
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(', ')
    };

    setOrders((prev) => [
      newOrderObj,
      ...(prev || [])
    ]);

    // The order is already committed by the server. Never block the
    // customer confirmation on a separate product/stock refresh request.
    // Refresh the storefront in the background after acknowledging the order.
    void fetchProductsFromDatabase();

    sendTelegramNotification();

    setIsCheckoutOpen(false);
    setCheckoutError('');
    setIsSubmittingOrder(false);
    orderSubmitLock.current = false;
    setOrderConfirmation({ id: orderId, email: orderUserEmail, totalGEL: Number(serverOrderResult.total_gel) });
    setCart([]);
    setAppliedCoupon(null);

    showToast(
      `✅ შეკვეთა #${orderId} წარმატებით გაფორმდა!`
    );
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === t.allCategories ||
        selectedCategory === 'ყველა' ||
        p.category === selectedCategory;

      const matchesVendor =
        selectedVendorFilter === t.allVendors ||
        selectedVendorFilter === 'ყველა' ||
        p.vendor === selectedVendorFilter;

      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return (
        matchesCategory &&
        matchesVendor &&
        matchesSearch
      );
    });
  }, [
    products,
    selectedCategory,
    selectedVendorFilter,
    searchQuery,
    t
  ]);

  const formatPrice = (p) =>
    `${Number(p || 0).toLocaleString('ka-GE')} ₾`;

  return (
    <div className={`geostore-shell ${activeTab === 'store' ? 'geostore-fashion-store' : '' } min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 flex flex-col justify-between w-full overflow-x-hidden`}>
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl border border-emerald-300 animate-bounce flex items-center gap-2.5 text-xs">
          {toastMessage}
        </div>
      )}

      <div className="w-full max-w-full overflow-visible">
        <Header
          siteSettings={siteSettings}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          wishlistCount={wishlist.length}
          cartCount={cart.reduce(
            (a, b) => a + b.quantity,
            0
          )}
          comparisonCount={comparisonList.length}
          currentUser={currentUser}
          setIsAuthOpen={setIsAuthOpen}
          setAuthMode={setAuthMode}
          setIsAiAssistantOpen={setIsAiAssistantOpen}
          setIsImageSearchOpen={setIsImageSearchOpen}
          setIsComparisonOpen={setIsComparisonOpen}
          setIsTrackerOpen={setIsTrackerOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          setSupportOpen={setSupportOpen}
          setIsTermsOpen={setIsTermsOpen}
          setIsWarrantyOpen={setIsWarrantyOpen}
          adminLoggedIn={adminLoggedIn}
          unreadNotificationsCount={unreadNotificationsCount}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          handleInstallClick={handleInstallClick}
          currentLang={currentLang}
          setCurrLang={setCurrLang}
        />
      </div>

      {adminLoggedIn && !authLoading && (
        <div className="geostore-admin-shortcut w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 flex justify-end box-border">
          <button
            onClick={() => setActiveTab('admin')}
            aria-label="ადმინ პანელის გახსნა"
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border ${activeTab === 'admin' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            ადმინ პანელი
          </button>
        </div>
      )}

      <main className="w-full max-w-[1440px] min-w-0 mx-auto px-4 sm:px-6 py-6 flex-1 space-y-8 box-border">
        {activeTab === 'store' && (
          <StoreView
            currentLang={currentLang}
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

        {activeTab === 'wardrobe' && (
          <AIDigitalWardrobe
            products={products}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardPro
            adminLoggedIn={adminLoggedIn}
            setAdminLoggedIn={setAdminLoggedIn}
            adminLoginForm={
              adminLoginForm || {
                username: '',
                password: '',
                remember: false
              }
            }
            setAdminLoginForm={setAdminLoginForm}
            handleAdminLogin={handleAdminLogin}
            handleLogout={handleLogout}
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
            onSaveStorefrontDraft={saveStorefrontDraft}
            onPublishStorefront={publishStorefrontConfig}
          />
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                {t.wishlist} ({wishlist.length})
              </h2>

              {wishlist.length > 0 && (
                <button
                  onClick={handleShareWishlist}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  {t.shareList}
                </button>
              )}
            </div>

            {wishlist.length === 0 ? (
              <p className="text-slate-500 text-xs py-8">
                {t.emptyWishlist}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex items-center justify-between backdrop-blur-2xl shadow-xl"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={prod.image}
                        alt=""
                        className="w-16 h-16 object-contain bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800/80 shadow-inner"
                      />

                      <div>
                        <h4 className="font-bold text-xs text-white line-clamp-1">
                          {prod.name}
                        </h4>

                        <p className="text-emerald-400 font-black text-xs mt-1">
                          {formatPrice(prod.priceGEL)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(prod)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      {t.addToCart}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="gs-cart-page gs-cart-layout space-y-6">
            <h2 className="gs-cart-title text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              {t.cart}
            </h2>

            {cart.length === 0 ? (
              <p className="text-slate-500 text-xs py-8">
                {t.emptyCart}
              </p>
            ) : (
              <div className="gs-cart-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="gs-cart-items-list lg:col-span-2 space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="gs-cart-item bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex justify-between items-center text-xs backdrop-blur-2xl shadow-xl"
                    >
                      <div className="space-y-1">
                        <h4 className="gs-cart-item-title font-bold text-xs text-white">
                          {item.name}
                        </h4>

                        <p className="gs-cart-item-price text-emerald-400 font-bold">
                          {formatPrice(item.priceGEL)} x {item.quantity}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((c) => c.id !== item.id)
                          )
                        }
                        className="gs-cart-remove text-rose-400 hover:text-rose-300 font-bold p-2 bg-rose-500/10 rounded-xl transition cursor-pointer"
                      >
                        {t.remove}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="gs-cart-summary bg-slate-900/40 border border-slate-800/80 p-6 rounded-[2.5rem] h-fit space-y-5 shadow-2xl backdrop-blur-2xl">
                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs">
                      <Truck className="w-3.5 h-3.5" />
                      {t.deliveryRegion}
                    </span>

                    <select
                      value={selectedRegion}
                      onChange={(e) =>
                        setSelectedRegion(e.target.value)
                      }
                      className="w-full bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-bold cursor-pointer"
                    >
                      <option value="tbilisi">
                        {t.tbilisiDelivery} ({deliveryFees.tbilisi} ₾)
                      </option>

                      <option value="bigCities">
                        {t.bigCitiesDelivery} ({deliveryFees.bigCities} ₾)
                      </option>

                      <option value="other">
                        {t.otherDelivery} ({deliveryFees.other} ₾)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs">
                      <Tag className="w-3.5 h-3.5" />
                      {t.promoCode}
                    </span>

                    {appliedCoupon ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <b className="text-amber-300 uppercase">
                            {appliedCoupon.code}
                          </b>

                          <span className="text-emerald-400 block text-[10px]">
                            (-{appliedCoupon.discountPercent}% {t.discount})
                          </span>
                        </div>

                        <button
                          onClick={() => setAppliedCoupon(null)}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleApplyCoupon}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          placeholder="პრომო-კოდი"
                          value={promoInput}
                          onChange={(e) =>
                            setPromoInput(e.target.value)
                          }
                          className="flex-1 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                        />

                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                        >
                          {t.apply}
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="gs-cart-totals space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>{t.subtotal}</span>
                      <span>{formatPrice(cartSubtotalGEL)}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          {t.discount} (-{appliedCoupon.discountPercent}%):
                        </span>

                        <span>
                          -{formatPrice(
                            (cartSubtotalGEL *
                              appliedCoupon.discountPercent) /
                              100
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>{t.deliveryCost}</span>

                      <span>
                        {currentDeliveryCost === 0
                          ? t.free
                          : formatPrice(currentDeliveryCost)}
                      </span>
                    </div>

                    <div className="text-xl font-black text-amber-400 flex justify-between items-center pt-2 border-t border-slate-800">
                      <span>{t.total}</span>
                      <span>{formatPrice(cartTotalGEL)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutError('');
                      setIsCheckoutOpen(true);
                    }}
                    className="gs-cart-checkout w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-xl shadow-emerald-500/20 transition cursor-pointer"
                  >
                    {t.checkout}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div className="gs-profile-page max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="gs-profile-card bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] space-y-4 text-xs shadow-2xl backdrop-blur-2xl">
              <h2 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-4">
                <User className="w-5 h-5 text-emerald-400" />
                {t.profile}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-300 pt-2">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    {currentLang === 'en' ? 'Name' : currentLang === 'ru' ? 'Имя' : 'სახელი'}
                  </span>

                  <b className="text-white text-sm mt-1 block">
                    {currentUser.name}
                  </b>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    {currentLang === 'en' ? 'Email' : currentLang === 'ru' ? 'Эл. почта' : 'ელ-ფოსტა'}
                  </span>

                  <b className="text-white text-sm mt-1 block truncate">
                    {currentUser.email}
                  </b>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">
                    {currentLang === 'en' ? 'Phone' : currentLang === 'ru' ? 'Телефон' : 'ტელეფონი'}
                  </span>

                  <b className="text-white text-sm mt-1 block">
                    {currentUser.phone}
                  </b>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h3 className="font-black text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t.security}
                </h3>

                <p className="text-slate-400 text-xs leading-relaxed">
                  {currentLang === 'en'
                    ? 'Account security and password management are handled by Supabase Auth. PIN and Face ID sign-in are disabled in this version because the previous implementation did not provide reliable authentication.'
                    : currentLang === 'ru'
                      ? 'Защита аккаунта и управление паролем обеспечиваются Supabase Auth. Вход по PIN и Face ID отключён в этой версии, поскольку прежняя реализация не обеспечивала надёжную аутентификацию.'
                      : 'ანგარიშის დაცვა და პაროლის მართვა ხორციელდება Supabase Auth-ის მეშვეობით. PIN და Face ID ფუნქციები ამ ვერსიაში გამორთულია, რადგან ძველი იმპლემენტაცია რეალურ უსაფრთხო ავტორიზაციას არ უზრუნველყოფდა.'}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl font-bold transition cursor-pointer mt-4"
              >
                {t.logout}
              </button>
            </div>

            <div className="gs-profile-orders bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] space-y-4 text-xs shadow-2xl backdrop-blur-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-4">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                {t.orderHistory}
              </h3>

              <div className="space-y-3">
                {orders.filter(
                  (o) =>
                    o.user_email === currentUser.email
                ).length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">
                    {t.noOrders}
                  </p>
                ) : (
                  orders
                    .filter(
                      (o) =>
                        o.user_email === currentUser.email
                    )
                    .map((order) => (
                      <div
                        key={order.id}
                        className="gs-profile-order-row bg-slate-950/60 border border-slate-800/80 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-inner"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="gs-profile-order-code font-black text-emerald-400">#{order.id}</span>

                            <span className="text-slate-500 text-[10px]">
                              ({order.date})
                            </span>
                          </div>

                          <p className="text-slate-300 text-[11px]">
                            📍 {currentLang === 'en' ? 'Address' : currentLang === 'ru' ? 'Адрес' : 'მისამართი'}: {order.address}
                          </p>

                          <p className="text-slate-400 text-[11px]">
                            📞 {currentLang === 'en' ? 'Phone' : currentLang === 'ru' ? 'Телефон' : 'ტელეფონი'}: {order.phone}
                          </p>
                        </div>

                        <div className="text-right flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto">
                          <span className="font-black text-white text-sm">
                            {formatPrice(order.totalGEL)}
                          </span>

                          <span className={`${getOrderStatusClasses(order.status || 'New')} px-3 py-1 rounded-xl text-[10px] font-bold mt-1`}>
                            {localizeOrderStatus(order.status || 'New', currentLang)}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="gs-floating-ai">
        <button
          type="button"
          onClick={() => setIsAiAssistantOpen(true)}
          className="gs-floating-action gs-floating-action--ai"
          aria-label={currentLang === 'en' ? 'Open AI assistant' : currentLang === 'ru' ? 'Открыть AI-помощника' : 'AI ასისტენტის გახსნა'}
        >
          <span className="gs-floating-action-icon">
            <Bot aria-hidden="true" />
            <Sparkles className="gs-floating-sparkle" aria-hidden="true" />
          </span>
          <span className="gs-floating-action-copy">
            <strong>{currentLang === 'en' ? 'AI Assistant' : currentLang === 'ru' ? 'AI-помощник' : 'AI ასისტენტი'}</strong>
            <small>{currentLang === 'en' ? 'Style & recommendations' : currentLang === 'ru' ? 'Стиль и рекомендации' : 'რჩევები და შერჩევა'}</small>
          </span>
          <span className="gs-floating-action-arrow" aria-hidden="true">↗</span>
        </button>
      </div>

      <div className="gs-floating-support">
        {supportOpen ? (
          <div className="gs-support-panel">
            <div className="gs-support-panel-heading">
              <span className="gs-support-heading-icon"><MessageSquare aria-hidden="true" /></span>
              <span className="gs-support-heading-copy">
                <strong>{t.supportChat}</strong>
                <small>{currentLang === 'en' ? 'GEOSTORE · Customer care' : currentLang === 'ru' ? 'GEOSTORE · Поддержка клиентов' : 'GEOSTORE · მომხმარებელთა დახმარება'}</small>
              </span>
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="gs-support-close"
                aria-label={currentLang === 'en' ? 'Close' : currentLang === 'ru' ? 'Закрыть' : 'დახურვა'}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                const name = e.target.cname.value;
                const email = e.target.cemail.value;
                const subject = e.target.csubject.value;
                const message = e.target.cmessage.value;

                if (!name || !message) return;

                const ticketId = `t-${Math.floor(
                  1000 + Math.random() * 9000
                )}`;

                try {
                  const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/support_tickets`,
                    {
                      method: 'POST',
                      headers: {
                        ...(await getSupabaseHeaders()),
                        Prefer: 'return=representation'
                      },
                      body: JSON.stringify({
                        id: ticketId,
                        customer_name: name,
                        email: email || 'guest@geostore.ge',
                        subject: subject || 'General',
                        message,
                        status: 'Open'
                      })
                    }
                  );

                  if (!response.ok) {
                    throw new Error(
                      'მხარდაჭერის შეტყობინების გაგზავნა ვერ მოხერხდა.'
                    );
                  }

                  alert(currentLang === 'en'
                    ? 'Support request sent successfully.'
                    : currentLang === 'ru'
                      ? 'Обращение в поддержку успешно отправлено.'
                      : 'მხარდაჭერის მოთხოვნა წარმატებით გაიგზავნა.');

                  e.target.reset();
                  setSupportOpen(false);
                } catch (error) {
                  console.error('Support ticket error:', error);
                  alert(
                    error.message || (currentLang === 'en'
                      ? 'Could not send the support request.'
                      : currentLang === 'ru'
                        ? 'Не удалось отправить обращение в поддержку.'
                        : 'მხარდაჭერის შეტყობინების გაგზავნა ვერ მოხერხდა.')
                  );
                }
              }}
              className="gs-support-form"
            >
              <input
                type="text"
                name="cname"
                placeholder={currentLang === 'en' ? 'Your name *' : currentLang === 'ru' ? 'Ваше имя *' : 'თქვენი სახელი *'}
                required
                className="gs-support-field"
              />

              <input
                type="email"
                name="cemail"
                placeholder={currentLang === 'en' ? 'Email' : currentLang === 'ru' ? 'Эл. почта' : 'ელფოსტა'}
                className="gs-support-field"
              />

              <input
                type="text"
                name="csubject"
                placeholder={currentLang === 'en' ? 'Subject' : currentLang === 'ru' ? 'Тема' : 'თემა'}
                className="gs-support-field"
              />

              <textarea
                name="cmessage"
                rows="3"
                placeholder={currentLang === 'en' ? 'Write your message...' : currentLang === 'ru' ? 'Напишите сообщение...' : 'დაწერე შეტყობინება...'}
                required
                className="gs-support-field"
              />

              <button
                type="submit"
                className="gs-support-submit"
              >
                {t.sendMessage}
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="gs-floating-action gs-floating-action--support"
            aria-label={currentLang === 'en' ? 'Open support chat' : currentLang === 'ru' ? 'Открыть чат поддержки' : 'მხარდაჭერის ჩატის გახსნა'}
          >
            <span className="gs-floating-action-icon"><MessageSquare aria-hidden="true" /></span>
            <span className="gs-floating-action-copy">
              <strong>{currentLang === 'en' ? 'Support' : currentLang === 'ru' ? 'Поддержка' : 'დახმარება'}</strong>
              <small>{currentLang === 'en' ? 'We are here to help' : currentLang === 'ru' ? 'Мы готовы помочь' : 'მოგვწერე ნებისმიერ დროს'}</small>
            </span>
            <span className="gs-support-online-dot" aria-label={currentLang === 'en' ? 'Online' : currentLang === 'ru' ? 'В сети' : 'ონლაინ'} />
          </button>
        )}
      </div>

      <Modals
        currentLang={currentLang}
        isCheckoutOpen={isCheckoutOpen}
        setIsCheckoutOpen={setIsCheckoutOpen}
        checkoutForm={checkoutForm}
        setCheckoutForm={setCheckoutForm}
        handlePlaceOrder={handlePlaceOrder}
        isSubmittingOrder={isSubmittingOrder}
        orderConfirmation={orderConfirmation}
        setOrderConfirmation={setOrderConfirmation}
        checkoutError={checkoutError}
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
        lookupOrderForTracking={lookupOrderForTracking}
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
        currentLang={currentLang}
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
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>

              <div>
                <h3 className="font-black text-sm text-white">
                  App Installation
                </h3>

                <p className="text-[11px] text-slate-400">
                  Follow simple instructions:
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <footer className="geostore-site-footer w-full mt-6 py-6 text-center space-y-3">
        <div className="geostore-footer-links flex justify-center items-center gap-6 text-slate-400 font-bold">
          <button
            onClick={() => setIsTermsOpen(true)}
            className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {t.terms}
          </button>

          <span>•</span>

          <button
            onClick={() => setIsWarrantyOpen(true)}
            className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            {t.warranty}
          </button>
        </div>

        <p>© 2026 GEOSTORE. {t.allRightsReserved}</p>
      </footer>
    </div>
  );
}
