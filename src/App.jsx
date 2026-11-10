// src/App.jsx
// GEOSTORE — Supabase Auth integration
// არსებული მაღაზიის ფუნქციები და დიზაინი შენარჩუნებულია.

import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';

import Header from './components/Header';
const StoreView = lazy(() => import('./components/StoreView'));

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
import { calculateCartSubtotalGEL, calculateCheckoutTotals, createSecureOrderId, groupCheckoutItems, isReusableCheckout, normalizeOrderItems, normalizeOrderTotal, normalizeTrackingLookup, reconcileCartWithCatalog, validateOrderCreationResponse, CHECKOUT_CATALOG_SELECT } from './utils/orderSafety';
import { buildOrderDeliveryAddress, validateCheckoutContact, validateCheckoutItems } from './utils/checkoutValidation';
import { validateRegistrationPassword, checkPwnedPassword } from './utils/passwordSafety';
import { getCheckoutErrorMessage } from './utils/checkoutMessages';
import { isAuthRestoreCurrent } from './utils/authSafety';
import { addProductToCart, removeProductFromCart, updateProductCartQuantity, sanitizeCartSnapshot, getCartStorageKey, switchCartStorageOwner, canPersistCartForOwner, getCurrentCartItemStock, sanitizeProductCollection, getUserScopedCollectionStorageKey, switchUserScopedCollectionOwner } from './utils/cartSafety';
import { getAvailableProductColors, getAvailableProductSizes, getCustomProductVariant, hasCustomProductVariants, hasSizeColorInventory, getProductSizeColorVariant } from './utils/productVariants.js';
import { matchesProductSearch } from './utils/productSearch.js';

// Heavy, infrequently used screens are loaded only when the user opens them.
const AdminDashboardPro = lazy(() => import('./components/AdminDashboardPro'));
const AIDigitalWardrobe = lazy(() => import('./components/AIDigitalWardrobe'));
const ProductCompareModal = lazy(() => import('./components/ProductCompareModal'));
const ImageSearchModal = lazy(() => import('./components/ImageSearchModal'));
const AiAssistantModal = lazy(() => import('./components/AiAssistantModal'));
const Modals = lazy(() => import('./components/Modals'));

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

const STOREFRONT_MEDIA_BUCKET = 'storefront-media';
const STOREFRONT_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const STOREFRONT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const uploadStorefrontImage = async (imageData, folder, index, userId, uploadedAssets) => {
  const value = String(imageData || '').trim();
  if (!value.startsWith('data:')) {
    if (!value) return '';
    try {
      const parsedUrl = new URL(value, window.location.origin);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported image URL protocol');
      return parsedUrl.href;
    } catch {
      throw new Error('კატეგორიის ან ბანერის ფოტოს ბმული არასწორია. გამოიყენეთ HTTP ან HTTPS მისამართი.');
    }
  }

  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error('კატეგორიის ან ბანერის ფოტოს ფორმატი არასწორია. გამოიყენეთ JPG, PNG, WEBP ან GIF.');
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  const sizeBytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (sizeBytes <= 0 || sizeBytes > STOREFRONT_IMAGE_MAX_BYTES) {
    throw new Error('კატეგორიის ან ბანერის თითოეული ფოტო მაქსიმუმ 5 MB უნდა იყოს.');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 1) bytes[offset] = binary.charCodeAt(offset);

  const startsWithBytes = signature => signature.every((byte, offset) => bytes[offset] === byte);
  const isJpeg = mimeType === 'image/jpeg' && startsWithBytes([0xff, 0xd8, 0xff]);
  const isPng = mimeType === 'image/png' && startsWithBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isGif = mimeType === 'image/gif' && (
    startsWithBytes([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  );
  const isWebp = mimeType === 'image/webp' && bytes.length >= 12 &&
    startsWithBytes([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!(isJpeg || isPng || isGif || isWebp)) {
    throw new Error('ფაილის რეალური ფორმატი მითითებულ ტიპს არ ემთხვევა. ატვირთეთ ნამდვილი JPG, PNG, WEBP ან GIF ფოტო.');
  }

  const extension = STOREFRONT_IMAGE_TYPES[mimeType];
  const safeFolder = folder === 'banners' ? 'banners' : 'categories';
  if (!window.crypto?.getRandomValues) throw new Error('უსაფრთხო ატვირთვისთვის ბრაუზერის კრიპტოგრაფიული ფუნქცია მიუწვდომელია.');
  const randomBytes = new Uint8Array(12);
  window.crypto.getRandomValues(randomBytes);
  const randomSuffix = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const path = `storefront/${safeFolder}/${Date.now()}-${index}-${randomSuffix}.${extension}`;
  const headers = await getSupabaseHeaders({ authenticated: true });
  headers['Content-Type'] = mimeType;
  headers['x-upsert'] = 'false';

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STOREFRONT_MEDIA_BUCKET}/${path}`, {
    method: 'POST',
    headers,
    body: new Blob([bytes], { type: mimeType })
  });
  if (!response.ok) throw new Error('ფოტოს ატვირთვა ვერ მოხერხდა: ' + (await response.text()));

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STOREFRONT_MEDIA_BUCKET}/${encodedPath}`;
  uploadedAssets.push({ path, publicUrl });

  const metadataResponse = await fetch(`${SUPABASE_URL}/rest/v1/storefront_media`, {
    method: 'POST',
    headers: await getSupabaseHeaders({ authenticated: true }),
    body: JSON.stringify({
      storage_path: path,
      public_url: publicUrl,
      file_name: path.split('/').pop(),
      mime_type: mimeType,
      size_bytes: sizeBytes,
      alt_text: '',
      folder: safeFolder,
      is_public: true,
      created_by: userId
    })
  });
  if (!metadataResponse.ok) throw new Error('ფოტო აიტვირთა, მაგრამ მედიის ჩანაწერი ვერ შეინახა: ' + (await metadataResponse.text()));
  return publicUrl;
};

const cleanupStorefrontUploads = async (uploadedAssets) => {
  const assets = Array.isArray(uploadedAssets) ? uploadedAssets : [];
  await Promise.allSettled(assets.map(async ({ path }) => {
    const safePath = String(path || '').replace(/^\/+/, '');
    const isManagedStorefrontPath =
      safePath.startsWith('storefront/categories/') ||
      safePath.startsWith('storefront/banners/');
    if (!isManagedStorefrontPath) return;

    const encodedPath = safePath.split('/').map(encodeURIComponent).join('/');
    const storageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${STOREFRONT_MEDIA_BUCKET}/${encodedPath}`, {
      method: 'DELETE',
      headers: await getSupabaseHeaders({ authenticated: true })
    });

    // Keep the media row if Storage deletion failed. Removing its metadata
    // while the public object still exists would create an untracked orphan.
    // A 404 means the object is already absent, so metadata cleanup is safe.
    if (!storageResponse.ok && storageResponse.status !== 404) {
      console.error('Storefront upload cleanup failed:', safePath, await storageResponse.text());
      return;
    }

    const metadataResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/storefront_media?storage_path=eq.${encodeURIComponent(safePath)}`,
      { method: 'DELETE', headers: await getSupabaseHeaders({ authenticated: true }) }
    );
    if (!metadataResponse.ok) {
      console.error('Storefront media metadata cleanup failed:', safePath, await metadataResponse.text());
    }
  }));
};

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'ტანსაცმელი', icon: 'Shirt', parentId: null },
  { id: 'c1-women', name: 'ქალის ტანსაცმელი', icon: 'Shirt', parentId: 'c1' },
  { id: 'c1-men', name: 'მამაკაცის ტანსაცმელი', icon: 'Shirt', parentId: 'c1' },
  { id: 'c2', name: 'ფეხსაცმელი', icon: 'Footprints', parentId: null },
  { id: 'c3', name: 'აქსესუარები', icon: 'Sparkles', parentId: null }
];

const validateStorefrontCategorySnapshot = (rawCategories, catalogProducts = []) => {
  if (!Array.isArray(rawCategories) || rawCategories.length > 100) {
    throw new Error('კატეგორიების სია არასწორია ან 100 კატეგორიაზე მეტია.');
  }

  const normalized = rawCategories.map((category, index) => {
    if (typeof category === 'string') {
      const name = category.trim();
      return { id: `cat-legacy-${index}`, name, icon: 'Shirt', parentId: null, image: '', img: '' };
    }
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      throw new Error('კატეგორიების სიაში აღმოჩნდა არასწორი ჩანაწერი.');
    }
    const image = typeof category.image === 'string' ? category.image : (typeof category.img === 'string' ? category.img : '');
    return {
      ...category,
      id: String(category.id || `cat-legacy-${index}`).trim(),
      name: String(category.name || '').trim(),
      icon: String(category.icon || 'Shirt'),
      parentId: category.parentId ? String(category.parentId) : null,
      image,
      img: image
    };
  });

  const ids = new Set();
  const names = new Set();
  for (const category of normalized) {
    const normalizedName = category.name.toLocaleLowerCase();
    if (!category.id || category.id.length > 120 || ids.has(category.id)) {
      throw new Error('კატეგორიის ID ცარიელია ან დუბლირებულია.');
    }
    if (category.name.length < 2 || category.name.length > 60 || names.has(normalizedName)) {
      throw new Error('კატეგორიის სახელი უნდა იყოს 2-60 სიმბოლო და უნიკალური.');
    }
    ids.add(category.id);
    names.add(normalizedName);
  }

  const rootIds = new Set(normalized.filter(category => !category.parentId).map(category => category.id));
  for (const category of normalized) {
    if (category.parentId && (!rootIds.has(category.parentId) || category.parentId === category.id)) {
      throw new Error(`„${category.name}“ კატეგორიის მთავარი კატეგორია არასწორია. შეასწორეთ იერარქია და ხელახლა სცადეთ.`);
    }
  }

  const categoryNames = new Set(normalized.map(category => category.name));
  const missingProductCategories = [...new Set(
    (Array.isArray(catalogProducts) ? catalogProducts : [])
      .map(product => String(product?.category || '').trim())
      .filter(name => name && !categoryNames.has(name))
  )];
  if (missingProductCategories.length) {
    throw new Error(`არსებობს პროდუქტები, რომელთა კატეგორია აღარ არსებობს: ${missingProductCategories.slice(0, 5).join(', ')}. ჯერ გადაიტანეთ ეს პროდუქტები არსებულ კატეგორიებში.`);
  }

  return normalized;
};

const DEFAULT_SITE_SETTINGS = {
  storeName: 'GEOSTORE',
  topBarText: 'GEOSTORE — ტანსაცმელი, ფეხსაცმელი და აქსესუარები',
  heroTitle: 'შენი სტილი. შენი არჩევანი.',
  heroSubtitle: 'აღმოაჩინე ტანსაცმლის, ფეხსაცმლისა და აქსესუარების შერჩეული კოლექცია.'
};

const validateStorefrontSiteSettings = (rawSettings) => {
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    throw new Error('საიტის პარამეტრების ფორმატი არასწორია.');
  }
  const settings = { ...DEFAULT_SITE_SETTINGS, ...rawSettings };
  const limits = { storeName: 60, topBarText: 160, heroTitle: 120, heroSubtitle: 240 };
  for (const [key, maxLength] of Object.entries(limits)) {
    if (typeof settings[key] !== 'string') settings[key] = String(settings[key] ?? '');
    settings[key] = settings[key].trim();
    if (settings[key].length > maxLength) {
      throw new Error(`საიტის პარამეტრი „${key}“ მაქსიმუმ ${maxLength} სიმბოლო უნდა იყოს.`);
    }
  }
  if (settings.storeName.length < 2) throw new Error('მაღაზიის დასახელება მინიმუმ 2 სიმბოლო უნდა იყოს.');
  return settings;
};

const validateStorefrontBannerSnapshot = (rawBanners) => {
  if (!Array.isArray(rawBanners) || rawBanners.length > 20) {
    throw new Error('ბანერების სია არასწორია ან 20 ბანერზე მეტია.');
  }
  const ids = new Set();
  return rawBanners.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('ბანერების სიაში აღმოჩნდა არასწორი ჩანაწერი.');
    }
    const banner = { ...raw };
    banner.id = String(banner.id || '').trim();
    banner.title = String(banner.title || '').trim();
    banner.subtitle = String(banner.subtitle || '').trim();
    banner.image = String(banner.image || '').trim();
    banner.link = String(banner.link || '').trim();
    if (!banner.id || banner.id.length > 120 || ids.has(banner.id)) {
      throw new Error('ბანერის ID ცარიელია ან დუბლირებულია.');
    }
    ids.add(banner.id);
    if (!banner.title || banner.title.length > 120 || banner.subtitle.length > 240) {
      throw new Error(`ბანერი №${index + 1}: სათაური სავალდებულოა (მაქს. 120), აღწერა კი მაქს. 240 სიმბოლო.`);
    }
    if (banner.link) {
      try {
        const url = new URL(banner.link);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid protocol');
      } catch {
        throw new Error(`ბანერი „${banner.title}“ შეიცავს არასწორ ბმულს.`);
      }
    }
    return banner;
  });
};

const DEFAULT_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, status: 'აქტიური' },
  { id: 'v2', name: 'TechHub Georgia', commission: 10, status: 'აქტიური' }
];

// Do not seed a demo product into the live storefront. Catalogue items
// must come from Supabase so displayed price and stock match server checkout.
const DEFAULT_PRODUCTS = [];

// Never invent a live coupon. Active coupons are loaded from Supabase.
const DEFAULT_COUPONS = [];

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
    'დასრულებული': ['ჩაბარებულია', 'Delivered', 'Доставлен'], completed: ['ჩაბარებულია', 'Delivered', 'Доставлен'], 'ჩაბარებულია': ['ჩაბარებულია', 'Delivered', 'Доставлен'], delivered: ['ჩაბარებულია', 'Delivered', 'Доставлен'], 'доставлен': ['ჩაბარებულია', 'Delivered', 'Доставлен'], 'завершён': ['ჩაბარებულია', 'Delivered', 'Доставлен'],
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
    const saved = loadSafeStorage('geostore_site_settings', DEFAULT_SITE_SETTINGS);
    const settings = {
      ...DEFAULT_SITE_SETTINGS,
      ...(saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {})
    };
    // Replace only the exact legacy technology-marketplace defaults; preserve user edits.
    if (settings.topBarText === 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი') {
      settings.topBarText = DEFAULT_SITE_SETTINGS.topBarText;
    }
    if (/მრავალვენდერიანი|მარკეტფლეისი|ტექნიკის/i.test(settings.heroTitle || '')) {
      settings.heroTitle = DEFAULT_SITE_SETTINGS.heroTitle;
    }
    if (/მომწოდებლ|ბრენდები და მომწოდებლ|ტექნიკის/i.test(settings.heroSubtitle || '')) {
      settings.heroSubtitle = DEFAULT_SITE_SETTINGS.heroSubtitle;
    }
    return settings;
  });

  const [deliveryFees, setDeliveryFees] = useState(() =>
    loadSafeStorage('geostore_delivery_fees', {
      tbilisi: 0,
      bigCities: 10,
      other: 15
    })
  );

  const [selectedRegion, setSelectedRegion] = useState('tbilisi');

  const [categories, setCategoriesList] = useState(() =>
    loadSafeStorage('geostore_cats', DEFAULT_CATEGORIES)
  );

  const [vendorsList, setVendorsList] = useState(() =>
    loadSafeStorage('geostore_vendors', DEFAULT_VENDORS)
  );

  const [products, setProducts] = useState(() =>
    loadSafeStorage('geostore_products', DEFAULT_PRODUCTS)
  );

  const [coupons, setCoupons] = useState(() =>
    loadSafeStorage('geostore_coupons', DEFAULT_COUPONS).filter((coupon) =>
      !(coupon?.id === 'c1' &&
        String(coupon?.code || '').trim().toUpperCase() === 'GEOSTORE2026' &&
        Number(coupon?.discountPercent) === 10)
  ));

  const [bannersList, setBannersList] = useState(() =>
    loadSafeStorage('geostore_banners', [])
  );

  // Notifications are server-owned and scoped to the authenticated account.
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

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
    sanitizeCartSnapshot(loadSafeStorage('geostore_cart:guest', loadSafeStorage('geostore_cart', [])))
  );

  const cartRef = useRef(cart);
  const activeCartOwnerRef = useRef({ initialized: false, userId: null });
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const [wishlist, setWishlistState] = useState(() =>
    sanitizeProductCollection(loadSafeStorage('geostore_wishlist:guest', loadSafeStorage('geostore_wishlist', [])), 100)
  );
  const wishlistRef = useRef(wishlist);
  const setWishlist = (nextValue) => {
    const nextItems = sanitizeProductCollection(
      typeof nextValue === 'function' ? nextValue(wishlistRef.current) : nextValue,
      100
    );
    wishlistRef.current = nextItems;
    setWishlistState(nextItems);
  };

  const [comparisonList, setComparisonListState] = useState(() =>
    sanitizeProductCollection(loadSafeStorage('geostore_comparison:guest', loadSafeStorage('geostore_comparison', [])), 4)
  );
  const comparisonListRef = useRef(comparisonList);
  const setComparisonList = (nextValue) => {
    const nextItems = sanitizeProductCollection(
      typeof nextValue === 'function' ? nextValue(comparisonListRef.current) : nextValue,
      4
    );
    comparisonListRef.current = nextItems;
    setComparisonListState(nextItems);
  };

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
  // Serialize catalogue refreshes and discard results from a previous admin session.
  const productsFetchLock = useRef(false);
  const productsFetchQueued = useRef(false);
  const productsAccessEpoch = useRef(0);
  const adminAccessRef = useRef(adminLoggedIn);
  if (adminAccessRef.current !== adminLoggedIn) {
    adminAccessRef.current = adminLoggedIn;
    productsAccessEpoch.current += 1;
  }
  const [storefrontDraftBusy, setStorefrontDraftBusy] = useState(false);
  const [storefrontPublishBusy, setStorefrontPublishBusy] = useState(false);
  const storefrontSaveLock = useRef(false);
  const storefrontPublishLock = useRef(false);

  const [adminLoginForm, setAdminLoginForm] = useState({
    username: '',
    password: '',
    remember: false
  });

  const [adminError, setAdminError] = useState('');

  const [orders, setOrders] = useState([]);
  const adminOrdersFetchLock = useRef(false);
  const adminOrdersSessionActive = useRef(false);
  const adminOrdersSessionVersion = useRef(0);
  const [myOrders, setMyOrders] = useState([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const orderSubmitLock = useRef(false);
  const authSubmitLock = useRef(false);
  const pendingCheckoutRef = useRef(null);
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
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSubmission, setSupportSubmission] = useState(null);
  const [supportLookupTicketId, setSupportLookupTicketId] = useState('');
  const [supportLookupAccessToken, setSupportLookupAccessToken] = useState('');
  const [supportThreadMessages, setSupportThreadMessages] = useState([]);
  const [supportThreadLoaded, setSupportThreadLoaded] = useState(false);
  const supportThreadMessagesRef = useRef(null);
  const [supportThreadLoading, setSupportThreadLoading] = useState(false);
  const [supportThreadSending, setSupportThreadSending] = useState(false);
  const supportReplyInFlightRef = useRef(false);
  const supportReplyRequestRef = useRef(null);
  const supportCreateRequestRef = useRef(null);
  const [supportThreadError, setSupportThreadError] = useState('');
  const [hasLoadedModals, setHasLoadedModals] = useState(false);
  const [hasLoadedAiAssistant, setHasLoadedAiAssistant] = useState(false);

  useEffect(() => {
    if (!supportOpen || !supportThreadLoaded) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const container = supportThreadMessagesRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [supportOpen, supportThreadLoaded, supportThreadMessages]);

  useEffect(() => {
    if (!supportOpen || !supportThreadLoaded || supportThreadSending) return undefined;

    const ticketId = String(supportLookupTicketId || '').trim();
    const accessToken = String(supportLookupAccessToken || '').trim();
    if (!/^t-[a-f0-9]{32}$/i.test(ticketId) || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return undefined;
    }

    let active = true;
    let requestInFlight = false;
    let refreshRequested = false;
    const refreshSupportThread = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      if (requestInFlight) {
        // Do not lose a Realtime notification that arrives during an in-flight
        // snapshot request; run one more read after the current request settles.
        refreshRequested = true;
        return;
      }
      requestInFlight = true;
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_support_ticket_messages`, {
          method: 'POST',
          headers: await getSupabaseHeaders({ authenticated: true }),
          body: JSON.stringify({ p_ticket_id: ticketId, p_access_token: accessToken })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('Invalid support conversation response');
        if (active) {
          const uniqueRows = [...new Map(rows.filter(row => row?.id != null).map(row => [String(row.id), row])).values()];
          uniqueRows.sort((a, b) => {
            const aTime = Date.parse(a.created_at || '') || 0;
            const bTime = Date.parse(b.created_at || '') || 0;
            return aTime - bTime || String(a.id).localeCompare(String(b.id));
          });
          setSupportThreadMessages(uniqueRows);
        }
      } catch (error) {
        // Keep the last successfully loaded conversation visible during a
        // temporary network failure; the next poll will retry automatically.
        if (active) console.error('Support conversation refresh failed:', error);
      } finally {
        requestInFlight = false;
        if (active && refreshRequested && document.visibilityState === 'visible') {
          refreshRequested = false;
          void refreshSupportThread();
        } else if (!active) {
          refreshRequested = false;
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshSupportThread();
    };

    const channel = supabase
      .channel(`geostore-customer-support-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_ref=eq.${ticketId}`
        },
        () => void refreshSupportThread()
      )
      .subscribe(status => {
        // SUBSCRIBED fires both on first connection and after a reconnect.
        if (status === 'SUBSCRIBED' && active) void refreshSupportThread();
      });

    void refreshSupportThread();
    const interval = window.setInterval(() => void refreshSupportThread(), 15000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [supportOpen, supportThreadLoaded, supportThreadSending, supportLookupTicketId, supportLookupAccessToken]);

  useEffect(() => {
    if (!adminLoggedIn) return undefined;
    let active = true;
    const loadStorefrontDraft = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/storefront_config?config_key=eq.storefront&select=draft_config`,
          { headers: await getSupabaseHeaders({ authenticated: true }) }
        );
        if (!response.ok) throw new Error(await response.text());
        const rows = await response.json();
        const draft = rows?.[0]?.draft_config;
        if (!active || !draft || typeof draft !== 'object' || Array.isArray(draft)) return;
        if (Array.isArray(draft.categories)) setCategoriesList(draft.categories);
        if (Array.isArray(draft.banners)) setBannersList(draft.banners);
        if (draft.siteSettings && typeof draft.siteSettings === 'object' && !Array.isArray(draft.siteSettings)) {
          setSiteSettings(draft.siteSettings);
        }
      } catch (error) {
        console.error('Storefront draft load error:', error);
      }
    };
    loadStorefrontDraft();
    return () => { active = false; };
  }, [adminLoggedIn]);

  useEffect(() => {
    // Admins load their private draft in the separate authenticated effect above.
    // Do not let a slower public-config request overwrite that draft after login.
    if (adminLoggedIn) return undefined;
    let active = true;
    const loadPublishedStorefront = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/storefront_config?config_key=eq.storefront&select=published_config,is_published`,
          { headers: await getSupabaseHeaders() }
        );
        if (!response.ok) return;
        const rows = await response.json();
        const config = rows?.[0]?.is_published ? rows[0].published_config : null;
        if (!active || !config || typeof config !== 'object') return;
        if (Array.isArray(config.categories)) setCategoriesList(config.categories);
        if (Array.isArray(config.banners)) setBannersList(config.banners);
        if (config.siteSettings && typeof config.siteSettings === 'object' && !Array.isArray(config.siteSettings)) setSiteSettings(config.siteSettings);
      } catch (error) {
        console.error('Published storefront config load error:', error);
      }
    };
    loadPublishedStorefront();
    return () => { active = false; };
  }, [adminLoggedIn]);

  useEffect(() => {
    if (isCheckoutOpen || orderConfirmation || isAuthOpen || isTermsOpen || isWarrantyOpen || isTrackerOpen || isNotificationsOpen) {
      setHasLoadedModals(true);
    }
  }, [isCheckoutOpen, orderConfirmation, isAuthOpen, isTermsOpen, isWarrantyOpen, isTrackerOpen, isNotificationsOpen]);

  useEffect(() => {
    if (isAiAssistantOpen) setHasLoadedAiAssistant(true);
  }, [isAiAssistantOpen]);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Supabase Auth: სესიის აღდგენა და ცვლილებების მოსმენა.
  useEffect(() => {
    let mounted = true;
    let authEventVersion = 0;

    // ძველი localStorage მომხმარებლის მონაცემი აღარ გამოიყენება.
    try {
      localStorage.removeItem('geostore_current_user');
    } catch {
      // არაფერია გასაკეთებელი.
    }

    const activateCartOwner = (userId) => {
      const nextOwnerId = userId || null;
      const activeOwner = activeCartOwnerRef.current;
      if (activeOwner.initialized && String(activeOwner.userId ?? '') === String(nextOwnerId ?? '')) return;
      try {
        const switched = switchCartStorageOwner({
          storage: window.localStorage,
          previousOwnerId: activeOwner.userId,
          nextOwnerId,
          currentCart: cartRef.current,
          isInitial: !activeOwner.initialized
        });
        cartRef.current = switched.cart;
        setCart(switched.cart);

        const switchedWishlist = switchUserScopedCollectionOwner({
          storage: window.localStorage, baseKey: 'geostore_wishlist',
          previousOwnerId: activeOwner.userId, nextOwnerId,
          currentItems: wishlistRef.current, isInitial: !activeOwner.initialized, maxItems: 100
        });
        wishlistRef.current = switchedWishlist.items;
        setWishlist(switchedWishlist.items);

        const switchedComparison = switchUserScopedCollectionOwner({
          storage: window.localStorage, baseKey: 'geostore_comparison',
          previousOwnerId: activeOwner.userId, nextOwnerId,
          currentItems: comparisonListRef.current, isInitial: !activeOwner.initialized, maxItems: 4
        });
        comparisonListRef.current = switchedComparison.items;
        setComparisonList(switchedComparison.items);

        // Personal checkout details must not carry over to another account.
        if (activeOwner.initialized && String(activeOwner.userId ?? '') !== String(nextOwnerId ?? '')) {
          // Customer-private data must disappear immediately on account changes,
          // before the next profile/notification requests finish loading.
          setMyOrders([]);
          setMyOrdersError('');
          setMyOrdersLoading(false);
          setNotifications([]);
          setNotificationsError('');
          setNotificationsLoading(false);
          setIsNotificationsOpen(false);
          setCheckoutForm({ name: '', phone: '', email: '', address: '' });
          setAppliedCoupon(null);
          setPromoInput('');
        }
        activeCartOwnerRef.current = { initialized: true, userId: nextOwnerId };
      } catch (error) {
        // Fail closed: never persist the outgoing owner's cart under a new account.
        console.error('Cart owner switch failed:', error);
        cartRef.current = [];
        setCart([]);
        wishlistRef.current = [];
        setWishlist([]);
        comparisonListRef.current = [];
        setComparisonList([]);
        setMyOrders([]);
        setMyOrdersError('');
        setMyOrdersLoading(false);
        setNotifications([]);
        setNotificationsError('');
        setNotificationsLoading(false);
        setIsNotificationsOpen(false);
        activeCartOwnerRef.current = { initialized: false, userId: null };
      }
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      authEventVersion += 1;

      if (event === 'PASSWORD_RECOVERY') {
        setAuthForm((current) => ({ ...current, email: session?.user?.email || current.email, password: '' }));
        setAuthMode('reset-password');
        setIsAuthOpen(true);
      }

      const authUser = session?.user || null;
      const authorizedAdmin = isAuthorizedAdmin(authUser);
      activateCartOwner(authUser?.id || null);
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
      const restoreVersion = authEventVersion;
      try {
        // getUser() ამოწმებს მომხმარებელს Supabase Auth სერვერზე;
        // მხოლოდ სანდო app_metadata.role='admin' ანიჭებს პანელზე წვდომას.
        const { data, error } = await supabase.auth.getUser();

        if (error && error.name !== 'AuthSessionMissingError') {
          throw error;
        }

        if (isAuthRestoreCurrent({ mounted, restoreVersion, currentVersion: authEventVersion })) {
          const authUser = data?.user || null;
          const authorizedAdmin = isAuthorizedAdmin(authUser);
          activateCartOwner(authUser?.id || null);
          setCurrentUser(normalizeAuthUser(authUser));
          setAdminLoggedIn(authorizedAdmin);
          setActiveTab((current) =>
            authorizedAdmin ? 'admin' : current === 'admin' ? 'store' : current
          );
        }
      } catch (error) {
        if (isAuthRestoreCurrent({ mounted, restoreVersion, currentVersion: authEventVersion })) {
          console.error('Supabase session restore error:', error);
          // Fail closed if the server cannot verify the restored session.
          // Clear every privilege-related UI state, not only the profile.
          activateCartOwner(null);
          setCurrentUser(null);
          setAdminLoggedIn(false);
          setActiveTab((current) => current === 'admin' ? 'store' : current);
        }
      } finally {
        if (isAuthRestoreCurrent({ mounted, restoreVersion, currentVersion: authEventVersion })) {
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

  const markAllNotificationsAsRead = async () => {
    const requestOwnerId = currentUser?.id;
    if (!requestOwnerId || String(activeCartOwnerRef.current.userId ?? '') !== String(requestOwnerId) ||
        notificationsLoading || !notifications.some((n) => !n.read)) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/mark_my_order_notifications_read`,
        {
          method: 'POST',
          headers: await getSupabaseHeaders({ authenticated: true }),
          body: JSON.stringify({})
        }
      );
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'შეტყობინებების განახლება ვერ მოხერხდა.');
      }
      if (String(activeCartOwnerRef.current.userId ?? '') !== String(requestOwnerId)) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast(currentLang === 'en' ? '🔔 All notifications marked as read.' : currentLang === 'ru' ? '🔔 Все уведомления отмечены как прочитанные.' : '🔔 ყველა შეტყობინება მონიშნულია წაკითხულად');
    } catch (error) {
      if (String(activeCartOwnerRef.current.userId ?? '') !== String(requestOwnerId)) return;
      console.error('Mark notifications read failed:', error);
      showToast(currentLang === 'en' ? 'Could not update notifications.' : currentLang === 'ru' ? 'Не удалось обновить уведомления.' : 'შეტყობინებების განახლება ვერ მოხერხდა.');
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleSaveStorefrontDraft = async (settingsOverride = siteSettings) => {
    if (!adminLoggedIn || storefrontDraftBusy || storefrontPublishBusy || storefrontSaveLock.current || storefrontPublishLock.current) return;
    storefrontSaveLock.current = true;
    setStorefrontDraftBusy(true);
    const uploadedAssets = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !isAuthorizedAdmin(session.user)) {
        throw new Error('ადმინისტრატორის სესია ვერ დადასტურდა.');
      }

      const validatedCategories = validateStorefrontCategorySnapshot(categories, products);
      const draftCategories = [];
      for (let index = 0; index < validatedCategories.length; index += 1) {
        const category = validatedCategories[index];
        const image = category.image || category.img || '';
        const uploaded = await uploadStorefrontImage(image, 'categories', index, session.user.id, uploadedAssets);
        draftCategories.push({ ...category, image: uploaded, img: uploaded });
      }

      const draftBanners = [];
      const validatedBanners = validateStorefrontBannerSnapshot(bannersList);
      for (let index = 0; index < validatedBanners.length; index += 1) {
        const banner = validatedBanners[index];
        const image = await uploadStorefrontImage(banner.image || '', 'banners', index, session.user.id, uploadedAssets);
        draftBanners.push({ ...banner, image });
      }

      const snapshot = {
        categories: draftCategories,
        banners: draftBanners,
        siteSettings: validateStorefrontSiteSettings(settingsOverride)
      };
      const savedAt = new Date().toISOString();
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/storefront_config?on_conflict=config_key`,
        {
          method: 'POST',
          headers: {
            ...(await getSupabaseHeaders({ authenticated: true })),
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify({
            config_key: 'storefront',
            draft_config: snapshot,
            updated_by: session.user.id,
            draft_updated_at: savedAt
          })
        }
      );
      if (!response.ok) throw new Error('მონახაზის შენახვა ვერ მოხერხდა: ' + (await response.text()));

      setCategoriesList(draftCategories);
      setBannersList(draftBanners);
      alert('მონახაზი უსაფრთხოდ შეინახა Supabase-ში. საიტის ვიზიტორებს ცვლილებები ჯერ არ უჩანთ.');
    } catch (error) {
      if (uploadedAssets.length) await cleanupStorefrontUploads(uploadedAssets);
      alert(error.message || 'მონახაზის შენახვა ვერ მოხერხდა.');
    } finally {
      storefrontSaveLock.current = false;
      setStorefrontDraftBusy(false);
    }
  };

  const handlePublishStorefront = async () => {
    if (!adminLoggedIn || storefrontPublishBusy || storefrontDraftBusy || storefrontPublishLock.current || storefrontSaveLock.current) return;
    storefrontPublishLock.current = true;
    setStorefrontPublishBusy(true);
    const uploadedAssets = [];
    let storefrontPublished = false;
    let publishRequestStarted = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !isAuthorizedAdmin(session.user)) throw new Error('ადმინისტრატორის სესია ვერ დადასტურდა.');

      const validatedCategories = validateStorefrontCategorySnapshot(categories, products);
      const publishedCategories = [];
      for (let index = 0; index < validatedCategories.length; index += 1) {
        const category = validatedCategories[index];
        const image = category.image || category.img || '';
        const uploaded = await uploadStorefrontImage(image, 'categories', index, session.user.id, uploadedAssets);
        publishedCategories.push({ ...category, image: uploaded, img: uploaded });
      }

      const publishedBanners = [];
      const validatedBanners = validateStorefrontBannerSnapshot(bannersList);
      for (let index = 0; index < validatedBanners.length; index += 1) {
        const banner = validatedBanners[index];
        const image = await uploadStorefrontImage(banner.image || '', 'banners', index, session.user.id, uploadedAssets);
        publishedBanners.push({ ...banner, image });
      }

      const snapshot = {
        categories: publishedCategories,
        banners: publishedBanners,
        siteSettings: validateStorefrontSiteSettings(siteSettings)
      };
      const versionLabel = `გამოქვეყნება ${new Date().toLocaleString('ka-GE')}`;
      publishRequestStarted = true;
      const publishResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/publish_storefront_config`,
        {
          method: 'POST',
          headers: await getSupabaseHeaders({ authenticated: true }),
          body: JSON.stringify({
            p_snapshot: snapshot,
            p_version_label: versionLabel
          })
        }
      );
      if (!publishResponse.ok) {
        // A definitive HTTP error means Postgres rejected and rolled back the transaction.
        publishRequestStarted = false;
        throw new Error('საიტის გამოქვეყნება ვერ მოხერხდა: ' + (await publishResponse.text()));
      }
      // The database transaction has committed both the published config
      // and its immutable history row. Do not clean up referenced uploads
      // if response parsing or a later UI update fails.
      storefrontPublished = true;
      const publishResult = await publishResponse.json();
      if (!publishResult?.version_id) {
        throw new Error('საიტი გამოქვეყნდა, თუმცა ვერსიის დადასტურების პასუხი ვერ მივიღეთ. განაახლეთ ისტორიის სია.');
      }

      setCategoriesList(publishedCategories);
      setBannersList(publishedBanners);
      alert('საიტის ცვლილებები წარმატებით გამოქვეყნდა და ვერსიის ისტორიაშიც უსაფრთხოდ შეინახა.');
    } catch (error) {
      if (!storefrontPublished && uploadedAssets.length) {
        if (publishRequestStarted) {
          // A network failure after sending the RPC has an ambiguous outcome.
          // Keep uploaded files rather than risk deleting assets used by a committed publish.
          console.warn('Storefront publish outcome is unknown; uploaded assets were retained for safety.');
        } else {
          await cleanupStorefrontUploads(uploadedAssets);
        }
      }
      alert(error.message || 'საიტის გამოქვეყნება ვერ მოხერხდა.');
    } finally {
      storefrontPublishLock.current = false;
      setStorefrontPublishBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const requestOwnerId = currentUser?.id || null;
    const isCurrentOwner = () => Boolean(active) && Boolean(requestOwnerId) &&
      String(activeCartOwnerRef.current.userId ?? '') === String(requestOwnerId);
    const loadOwnOrders = async () => {
      if (!currentUser?.id) {
        setMyOrders([]);
        setMyOrdersError('');
        setMyOrdersLoading(false);
        return;
      }
      if (requestInFlight) return;
      requestInFlight = true;
      setMyOrdersLoading(true);
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/get_my_orders`,
          {
            method: 'POST',
            headers: await getSupabaseHeaders({ authenticated: true }),
            body: JSON.stringify({})
          }
        );
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(errorBody || 'შეკვეთების ისტორიის მიღება ვერ მოხერხდა.');
        }
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('შეკვეთების ისტორიის მონაცემები არასწორია.');
        if (!isCurrentOwner()) return;
        setMyOrdersError('');
        setMyOrders(rows.map((o) => {
          const parsedDate = o.created_at ? new Date(o.created_at) : null;
          const validDate = parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate : null;
          return {
            id: typeof o.id === 'string' ? o.id : '',
            created_at: validDate ? validDate.toISOString() : null,
            date: validDate
              ? validDate.toLocaleDateString(currentLang === 'en' ? 'en-US' : currentLang === 'ru' ? 'ru-RU' : 'ka-GE')
              : '',
            totalGEL: normalizeOrderTotal(o.total_gel),
            status: typeof o.status === 'string' && o.status.trim() ? o.status : 'ახალი',
            items: normalizeOrderItems(o.items),
            status_changed_at: o.status_changed_at || null
          };
        }).filter((order) => order.id));
      } catch (error) {
        if (isCurrentOwner()) {
          console.error('My orders fetch error:', error);
          // Preserve the last successful order snapshot during transient failures.
          // Account changes and sign-out clear this private state separately.
          setMyOrdersError(currentLang === 'en'
            ? 'Order history is temporarily unavailable. Please try again shortly.'
            : currentLang === 'ru'
              ? 'История заказов временно недоступна. Повторите попытку позже.'
              : 'შეკვეთების ისტორია დროებით მიუწვდომელია. სცადეთ მოგვიანებით.');
        }
      } finally {
        requestInFlight = false;
        if (isCurrentOwner()) setMyOrdersLoading(false);
      }
    };

    if (!currentUser?.id) {
      setMyOrders([]);
      setMyOrdersError('');
      setMyOrdersLoading(false);
      return () => { active = false; };
    }
    if (activeTab !== 'profile') return () => { active = false; };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadOwnOrders();
    };
    const refreshFromRealtimeOrder = () => {
      if (document.visibilityState === 'visible') void loadOwnOrders();
    };
    void loadOwnOrders();
    const interval = window.setInterval(() => void loadOwnOrders(), 30000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('geostore:customer-order-updated', refreshFromRealtimeOrder);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('geostore:customer-order-updated', refreshFromRealtimeOrder);
    };
  }, [currentUser?.id, activeTab, currentLang]);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const requestOwnerId = currentUser?.id || null;
    const isCurrentOwner = () => Boolean(active) && Boolean(requestOwnerId) &&
      String(activeCartOwnerRef.current.userId ?? '') === String(requestOwnerId);
    const loadNotifications = async () => {
      if (!currentUser?.id) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }
      if (requestInFlight) return;
      requestInFlight = true;
      setNotificationsLoading(true);
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/get_my_order_notifications`,
          {
            method: 'POST',
            headers: await getSupabaseHeaders({ authenticated: true }),
            body: JSON.stringify({})
          }
        );
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(errorBody || 'შეტყობინებების მიღება ვერ მოხერხდა.');
        }
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('შეტყობინებების მონაცემები არასწორია.');
        if (!isCurrentOwner()) return;
        setNotificationsError('');
        setNotifications(rows.map((n) => ({
          id: String(n.id),
          orderId: n.order_id,
          status: n.status,
          title: '',
          message: '',
          date: n.created_at ? new Date(n.created_at).toLocaleString(currentLang === 'en' ? 'en-GB' : currentLang === 'ru' ? 'ru-RU' : 'ka-GE') : '',
          read: Boolean(n.read_at),
          readAt: n.read_at || null
        })));
      } catch (error) {
        if (isCurrentOwner()) {
          console.error('Order notifications fetch failed:', error);
          // Keep the last successful notification snapshot during temporary network failures.
          setNotificationsError(currentLang === 'en'
            ? 'Notifications are temporarily unavailable. Please try again shortly.'
            : currentLang === 'ru'
              ? 'Уведомления временно недоступны. Повторите попытку позже.'
              : 'შეტყობინებები დროებით მიუწვდომელია. სცადეთ მოგვიანებით.');
        }
      } finally {
        requestInFlight = false;
        if (isCurrentOwner()) setNotificationsLoading(false);
      }
    };

    if (!currentUser?.id) {
      setNotifications([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return () => { active = false; };
    }
    void loadNotifications();
    const notificationChannel = supabase
      .channel(`geostore-customer-order-notifications-${requestOwnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_notifications',
          filter: `recipient_user_id=eq.${requestOwnerId}`
        },
        () => {
          if (!isCurrentOwner()) return;
          void loadNotifications();
          window.dispatchEvent(new Event('geostore:customer-order-updated'));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isCurrentOwner()) {
          void loadNotifications();
          window.dispatchEvent(new Event('geostore:customer-order-updated'));
        }
      });
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void supabase.removeChannel(notificationChannel);
    };
  }, [currentUser?.id, currentLang]);

  const fetchOrders = async () => {
    // Prevent overlapping 15-second refreshes from applying stale order snapshots.
    if (!adminOrdersSessionActive.current || adminOrdersFetchLock.current) return;
    const requestSessionVersion = adminOrdersSessionVersion.current;
    adminOrdersFetchLock.current = true;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc,id.asc`,
        { headers: await getSupabaseHeaders({ authenticated: true }) }
      );
      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(errorBody || `შეკვეთების მიღება ვერ მოხერხდა (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('შეკვეთების სია არასწორ ფორმატში დაბრუნდა.');
      // Do not restore private admin data after logout while a request is pending.
      if (!adminOrdersSessionActive.current || requestSessionVersion !== adminOrdersSessionVersion.current) return;
      setOrders(data.map((o) => {
        const items = normalizeOrderItems(o.items);
        const checkoutResult = o.checkout_result && typeof o.checkout_result === 'object' && !Array.isArray(o.checkout_result)
          ? o.checkout_result
          : null;
        const checkoutRequest = o.checkout_request && typeof o.checkout_request === 'object' && !Array.isArray(o.checkout_request)
          ? o.checkout_request
          : null;
        const optionalAmount = (value) => {
          if (value === null || value === undefined || value === '') return null;
          const amount = Number(value);
          return Number.isFinite(amount) && amount >= 0 ? amount : null;
        };
        const subtotalGEL = optionalAmount(checkoutResult?.subtotal_gel);
        const discountGEL = optionalAmount(checkoutResult?.discount_gel);
        const deliveryGEL = optionalAmount(checkoutResult?.delivery_gel);
        const checkoutBreakdown = subtotalGEL !== null && discountGEL !== null && deliveryGEL !== null
          ? {
              subtotalGEL,
              discountGEL,
              deliveryGEL,
              couponCode: String(checkoutRequest?.coupon_code || '').trim()
            }
          : null;
        return {
          id: o.id,
          created_at: o.created_at || null,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('ka-GE') : 'დღეს',
          time: o.created_at ? new Date(o.created_at).toLocaleTimeString('ka-GE') : '',
          customerName: o.customer_name || '',
          user_email: o.customer_email || o.user_email || '',
          phone: o.phone || '',
          address: o.address || '',
          totalGEL: normalizeOrderTotal(o.total_gel),
          checkoutBreakdown,
          status: o.status || 'ახალი',
          adminNote: o.admin_note || '',
          items,
          stock_deducted_at: o.stock_deducted_at || null,
          stock_restored_at: o.stock_restored_at || null,
          status_changed_at: o.status_changed_at || null,
          itemSummary: items.length > 0
            ? items.map((i) => `${i.name || 'პროდუქტი'} (x${i.quantity || 1})`).join(', ')
            : 'პროდუქტები'
        };
      }));
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      adminOrdersFetchLock.current = false;
    }
  };

  const fetchProductsFromDatabase = async () => {
    if (productsFetchLock.current) {
      // Coalesce overlapping triggers into one fresh follow-up request.
      productsFetchQueued.current = true;
      return;
    }

    productsFetchLock.current = true;
    const requestAccessEpoch = productsAccessEpoch.current;
    const requestAdminLoggedIn = adminAccessRef.current;

    try {
      let res;
      if (requestAdminLoggedIn) {
        const requestAdminProducts = async () => fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_list_products`, {
          method: 'POST',
          headers: await getSupabaseHeaders({ authenticated: true }),
          body: JSON.stringify({})
        });

        res = await requestAdminProducts();
        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          const isAuthFailure = res.status === 401 || res.status === 403 ||
            errorBody.includes('42501') ||
            errorBody.includes('Not authorized to read admin product data');

          if (isAuthFailure) {
            // A revoked/rotated access token can briefly race the auth listener.
            // Refresh once, then verify the refreshed identity with the Auth server
            // before retrying the privileged RPC. Never weaken the database guard.
            const { data: { session: refreshedSession } = {}, error: refreshError } =
              await supabase.auth.refreshSession();

            if (refreshError || !refreshedSession?.access_token) {
              setAdminLoggedIn(false);
              setActiveTab((current) => current === 'admin' ? 'store' : current);
              throw new Error('ადმინისტრატორის სესია განახლდა ვერ მოხერხდა. ხელახლა შედით ადმინისტრატორის ანგარიშში.');
            }

            const { data: { user: verifiedUser } = {}, error: verifyError } =
              await supabase.auth.getUser(refreshedSession.access_token);

            if (verifyError || !isAuthorizedAdmin(verifiedUser)) {
              setAdminLoggedIn(false);
              setActiveTab((current) => current === 'admin' ? 'store' : current);
              throw new Error('ადმინისტრატორის უფლებები ვერ დადასტურდა. ხელახლა შედით ადმინისტრატორის ანგარიშში.');
            }

            res = await requestAdminProducts();
          } else {
            throw new Error(errorBody || 'პროდუქტების ჩატვირთვა ვერ მოხერხდა.');
          }
        }
      } else {
        res = await fetch(
          `${SUPABASE_URL}/rest/v1/products?select=id,sku,name,category,brand,vendor,price_gel,old_price_gel,stock,image,description,available_sizes,available_colors,material,durability,created_at,gallery,variants,tags,model,cpu,ram,storage,gpu,screen_size,os,is_featured&order=created_at.desc,id.asc`,
          { headers: await getSupabaseHeaders() }
        );
      }

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(errorBody || 'პროდუქტების ჩატვირთვა ვერ მოხერხდა.');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = data.map((p) => ({
          id: p.id,
          createdAt: p.created_at || null,
          sku: p.sku || `GEO-${p.id}`,
          name: p.name,
          category: p.category || 'ტანსაცმელი',
          priceGEL: Number(p.price_gel),
          oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
          stock: Array.isArray(p.variants) && p.variants.some(variant => variant?.variantType === 'size_color')
            ? p.variants.filter(variant => variant?.variantType === 'size_color').reduce((total, variant) => {
                const quantity = Number(variant?.stock);
                return total + (Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0);
              }, 0)
            : (p.stock === null || p.stock === undefined ? 0 : Number(p.stock)),
          vendor: p.vendor || 'GEOSTORE',
          description: p.description || '',
          image: p.image || null,
          availableSizes: Array.isArray(p.available_sizes) ? p.available_sizes : [],
          availableColors: Array.isArray(p.available_colors) ? p.available_colors : [],
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

        // Keep product order deterministic when several rows share a timestamp.
        formatted.sort((left, right) => {
          const leftTime = Date.parse(left.createdAt || '') || 0;
          const rightTime = Date.parse(right.createdAt || '') || 0;
          return rightTime - leftTime || String(left.id ?? '').localeCompare(String(right.id ?? ''));
        });

        // Never let an old auth session or superseded request replace fresh catalogue data.
        if (
          requestAccessEpoch !== productsAccessEpoch.current ||
          productsFetchQueued.current
        ) return;

        // The products state persistence effect below owns the local cache write.
        setProducts(formatted);
      }
    } catch (error) {
      console.error('Products fetch error:', error);
    } finally {
      productsFetchLock.current = false;
      if (productsFetchQueued.current) {
        productsFetchQueued.current = false;
        void fetchProductsFromDatabase();
      }
    }
  };

  const lookupOrderForTracking = async (orderId, phone) => {
    const normalized = normalizeTrackingLookup(orderId, phone);
    if (!normalized.valid) {
      throw new Error(normalized.reason === 'order_id'
        ? 'შეკვეთის კოდი არასწორია.'
        : 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.');
    }
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/lookup_order_for_tracking`,
      {
        method: 'POST',
        headers: await getSupabaseHeaders({ authenticated: true }),
        body: JSON.stringify({ p_order_id: normalized.orderId, p_phone: normalized.phone })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(errorBody || 'შეკვეთის მოძებნა ვერ მოხერხდა.');
    }

    const result = await response.json();
    if (result?.rateLimited === true) {
      throw new Error('ORDER_TRACKING_RATE_LIMITED');
    }
    return result;
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
        setCoupons(Array.isArray(rows) ? rows
          .filter((row) => row && row.active === true && typeof row.code === 'string')
          .map((row) => ({
            id: row.id,
            code: row.code.trim().toUpperCase(),
            discountPercent: Number(row.discount_percent),
            minOrderGEL: Number(row.min_order_gel) || 0,
            status: 'აქტიური'
          })) : []);
      } else {
        // Never leave stale local coupons usable when the authoritative DB request fails.
        setCoupons([]);
        setAppliedCoupon(null);
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
      // A failed authoritative fetch must not leave cached coupon eligibility active.
      setCoupons([]);
      setAppliedCoupon(null);
      console.error('Store pricing settings fetch error:', error);
    }
  };

  useEffect(() => {
    fetchStorePricingSettings();
  }, []);

  useEffect(() => {
    // Product data (including potentially large product images) is fetched on
    // load and when the visitor returns to the active tab, not every 15 seconds.
    fetchProductsFromDatabase();

    const refreshProductsWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchProductsFromDatabase();
      }
    };
    document.addEventListener('visibilitychange', refreshProductsWhenVisible);

    if (!adminLoggedIn) {
      adminOrdersSessionActive.current = false;
      adminOrdersSessionVersion.current += 1;
      // Never retain private administrator order snapshots after access is lost.
      setOrders([]);
      return () => document.removeEventListener('visibilitychange', refreshProductsWhenVisible);
    }

    adminOrdersSessionActive.current = true;
    adminOrdersSessionVersion.current += 1;
    // Realtime delivers new/updated orders immediately. Keep the 15-second
    // refresh as a recovery path if the websocket disconnects or an event is missed.
    fetchOrders();
    const orderChannel = supabase
      .channel('geostore-admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Re-fetch through the authenticated REST path so RLS and
          // session-version checks remain active; never trust event payloads.
          void fetchOrders();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && adminOrdersSessionActive.current) {
          void fetchOrders();
        }
      });
    const interval = setInterval(fetchOrders, 15000);

    return () => {
      adminOrdersSessionActive.current = false;
      adminOrdersSessionVersion.current += 1;
      clearInterval(interval);
      void supabase.removeChannel(orderChannel);
      document.removeEventListener('visibilitychange', refreshProductsWhenVisible);
    };
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
    const activeOwner = activeCartOwnerRef.current;
    if (!canPersistCartForOwner({
      authLoading,
      activeOwner,
      currentUserId: currentUser?.id
    })) return;
    try {
      localStorage.setItem(
        getCartStorageKey(activeOwner.userId),
        JSON.stringify(sanitizeCartSnapshot(cart))
      );
    } catch {}
  }, [cart, currentUser?.id, authLoading]);

  useEffect(() => {
    const activeOwner = activeCartOwnerRef.current;
    if (!canPersistCartForOwner({ authLoading, activeOwner, currentUserId: currentUser?.id })) return;
    try {
      localStorage.setItem(
        getUserScopedCollectionStorageKey('geostore_wishlist', activeOwner.userId),
        JSON.stringify(sanitizeProductCollection(wishlist, 100))
      );
    } catch {}
  }, [wishlist, currentUser?.id, authLoading]);

  useEffect(() => {
    const activeOwner = activeCartOwnerRef.current;
    if (!canPersistCartForOwner({ authLoading, activeOwner, currentUserId: currentUser?.id })) return;
    try {
      localStorage.setItem(
        getUserScopedCollectionStorageKey('geostore_comparison', activeOwner.userId),
        JSON.stringify(sanitizeProductCollection(comparisonList, 4))
      );
    } catch {}
  }, [comparisonList, currentUser?.id, authLoading]);

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

  const cartSubtotalGEL = useMemo(() => calculateCartSubtotalGEL(
    quickBuyProduct ? [quickBuyProduct] : cart
  ), [cart, quickBuyProduct]);

  const currentDeliveryCost = useMemo(() => {
    if (selectedRegion === 'tbilisi') {
      return deliveryFees.tbilisi;
    }

    if (selectedRegion === 'bigCities') {
      return deliveryFees.bigCities;
    }

    return deliveryFees.other;
  }, [selectedRegion, deliveryFees]);

  const eligibleAppliedCoupon = useMemo(() => {
    if (!appliedCoupon) return null;
    const minimum = Number(appliedCoupon.minOrderGEL ?? 0);
    return Number.isFinite(minimum) && minimum >= 0 && cartSubtotalGEL >= minimum
      ? appliedCoupon
      : null;
  }, [appliedCoupon, cartSubtotalGEL]);

  const cartTotalGEL = useMemo(() => calculateCheckoutTotals({
    subtotal: cartSubtotalGEL,
    discountPercent: eligibleAppliedCoupon?.discountPercent,
    deliveryFee: currentDeliveryCost
  }).totalGEL, [cartSubtotalGEL, eligibleAppliedCoupon, currentDeliveryCost]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();

    const cleanCode = promoInput.trim().toUpperCase();

    if (!cleanCode) return;

    const found = (Array.isArray(coupons) ? coupons : []).find(
      (coupon) =>
        typeof coupon?.code === 'string' &&
        coupon.code.trim().toUpperCase() === cleanCode &&
        (coupon.status === 'აქტიური' || !coupon.status)
    );

    const discountPercent = Number(found?.discountPercent);
    const minOrderGEL = Number(found?.minOrderGEL ?? 0);
    if (
      found &&
      Number.isFinite(discountPercent) &&
      discountPercent > 0 &&
      discountPercent <= 100 &&
      Number.isFinite(minOrderGEL) &&
      minOrderGEL >= 0
    ) {
      if (cartSubtotalGEL < minOrderGEL) {
        const message = currentLang === 'en'
          ? `This coupon requires a minimum product subtotal of ${minOrderGEL} ₾.`
          : currentLang === 'ru'
            ? `Для этого купона минимальная сумма товаров — ${minOrderGEL} ₾.`
            : `ამ კუპონისთვის პროდუქციის მინიმალური ღირებულებაა ${minOrderGEL} ₾.`;
        showToast(message);
        return;
      }

      setAppliedCoupon({ ...found, discountPercent, minOrderGEL });
      showToast(`🎉 პრომო-კოდი გააქტიურდა (-${discountPercent}%)!`);
      setPromoInput('');
    } else {
      setAppliedCoupon(null);
      alert(currentLang === 'en' ? 'Invalid or inactive coupon code.' : currentLang === 'ru' ? 'Недействительный или отключённый промокод.' : 'არასწორი ან გაუქმებული პრომო-კოდი!');
    }
  };

  const addToCart = (product, quantity = 1) => {
    const requestedQuantity = Number(quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 100) {
      showToast('რაოდენობა უნდა იყოს მთელი რიცხვი 1-დან 100-მდე.');
      return false;
    }

    const selectedSize = String(product?.selectedSize || '').trim();
    const selectedColor = String(product?.selectedColor || '').trim();
    const customVariantId = String(product?.customVariantId || '').trim();
    const customVariant = customVariantId ? getCustomProductVariant(product, customVariantId) : null;
    const sizeColorInventory = hasSizeColorInventory(product);
    const sizeColorVariant = sizeColorInventory
      ? getProductSizeColorVariant(product, selectedSize, selectedColor)
      : null;
    const selectedInventoryVariant = customVariant || sizeColorVariant;
    const allowedSizes = getAvailableProductSizes(product);
    const allowedColors = getAvailableProductColors(product);

    if (selectedSize && !allowedSizes.includes(selectedSize)) {
      showToast('არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.');
      return false;
    }
    if (selectedColor && !allowedColors.includes(selectedColor)) {
      showToast('არჩეული ფერი ამ პროდუქტისთვის ხელმისაწვდომი არ არის.');
      return false;
    }
    if (sizeColorInventory && (
      !sizeColorVariant ||
      sizeColorVariant.stock <= 0 ||
      sizeColorVariant.id !== customVariantId
    )) {
      showToast('არჩეული ზომისა და ფერის კომბინაცია მარაგში აღარ არის.');
      return false;
    }
    if (customVariantId && !selectedInventoryVariant) {
      showToast('არჩეული ვარიანტი აღარ არის ხელმისაწვდომი.');
      return false;
    }
    if (hasCustomProductVariants(product) && !customVariant) {
      showToast('შეკვეთამდე აირჩიეთ პროდუქტის ინდივიდუალური ვარიანტი.');
      return false;
    }

    // Use the latest cart snapshot synchronously so rapid taps cannot
    // bypass stock limits before React has committed the previous update.
    const result = addProductToCart(cartRef.current, {
      ...product,
      selectedSize: selectedSize || null,
      selectedColor: selectedColor || null,
      customVariantId: selectedInventoryVariant?.id || null,
      customVariantName: selectedInventoryVariant?.name || '',
      stock: selectedInventoryVariant ? selectedInventoryVariant.stock : product.stock
    }, requestedQuantity);

    if (!result.valid) {
      if (result.reason === 'stock') {
        showToast('პროდუქტი ამჟამად მარაგში არ არის.');
      } else if (result.reason === 'limit') {
        showToast(`მარაგში დარჩენილია მხოლოდ ${result.remaining} ცალი.`);
      } else {
        showToast('რაოდენობა უნდა იყოს მთელი რიცხვი 1-დან 100-მდე.');
      }
      return false;
    }

    cartRef.current = result.cart;
    setCart(result.cart);
    showToast(`🛒 "${product.name}" დაემატა კალათაში!`);
    return true;
  };

  const changeCartQuantity = (item, nextQuantity) => {
    const currentProduct = products.find(product => String(product.id) === String(item.id));
    const currentVariant = item.customVariantId ? getCustomProductVariant(currentProduct, item.customVariantId) : null;
    const result = updateProductCartQuantity(cartRef.current, {
      ...item,
      // Never trust the stock snapshot stored in localStorage when the live
      // product or selected custom variant has disappeared from the catalogue.
      stock: getCurrentCartItemStock(currentProduct, item)
    }, nextQuantity);
    if (!result.valid) {
      if (result.reason === 'limit') {
        showToast(currentLang === 'en' ? 'No more stock is available.' : currentLang === 'ru' ? 'Больше товара нет в наличии.' : 'მარაგში მეტი რაოდენობა აღარ არის.');
      }
      return;
    }
    cartRef.current = result.cart;
    setCart(result.cart);
  };

  const removeFromCart = (item) => {
    const nextCart = removeProductFromCart(cartRef.current, item);
    cartRef.current = nextCart;
    setCart(nextCart);
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

    if ((authMode !== 'reset-password' && !email) || (authMode !== 'reset-request' && !password)) {
      alert(currentLang === 'en' ? 'Enter your email and password.' : currentLang === 'ru' ? 'Введите электронную почту и пароль.' : 'შეიყვანეთ ელ-ფოსტა და პაროლი.');
      return;
    }

    if (authMode === 'reset-request' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert(currentLang === 'en' ? 'Enter a valid email address.' : currentLang === 'ru' ? 'Введите корректный адрес электронной почты.' : 'შეიყვანეთ სწორი ელ-ფოსტა.');
      return;
    }

    if (authMode === 'reset-request') {
      if (authSubmitLock.current) return;
      authSubmitLock.current = true;
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://geostore.vercel.app/'
        });
        if (error) throw error;
        setIsAuthOpen(false);
        showToast(currentLang === 'en'
          ? 'If an account exists for this email, a password reset link has been sent.'
          : currentLang === 'ru'
            ? 'Если аккаунт с таким адресом существует, ссылка для сброса пароля отправлена.'
            : 'თუ ამ ელ-ფოსტით ანგარიში არსებობს, პაროლის აღდგენის ბმული გამოგზავნილია.');
      } catch (error) {
        console.error('Password reset request failed:', error);
        alert(currentLang === 'en' ? 'Could not send the reset email. Please try again later.' : currentLang === 'ru' ? 'Не удалось отправить письмо. Попробуйте позже.' : 'აღდგენის წერილის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით.');
      } finally {
        authSubmitLock.current = false;
      }
      return;
    }

    if (password.length < (authMode === 'reset-password' || authMode === 'register' ? 10 : 6)) {
      alert(authMode === 'reset-password' || authMode === 'register' ? (currentLang === 'en' ? 'Password must contain at least 10 characters.' : currentLang === 'ru' ? 'Пароль должен содержать не менее 10 символов.' : 'პაროლი უნდა შეიცავდეს მინიმუმ 10 სიმბოლოს.') : (currentLang === 'en' ? 'Password must contain at least 6 characters.' : currentLang === 'ru' ? 'Пароль должен содержать не менее 6 символов.' : 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.'));
      return;
    }

    // Prevent duplicate Supabase auth requests from rapid taps or repeated submits.
    if (authSubmitLock.current) return;
    authSubmitLock.current = true;

    try {
      if (authMode === 'reset-password') {
        const passwordCheck = validateRegistrationPassword(password);
        if (!passwordCheck.valid) {
          const message = currentLang === 'en'
            ? 'Use at least 10 characters with uppercase, lowercase, a number and a symbol.'
            : currentLang === 'ru'
              ? 'Используйте не менее 10 символов, включая заглавные и строчные буквы, цифру и символ.'
              : 'გამოიყენეთ მინიმუმ 10 სიმბოლო, დიდი და პატარა ასოებით, ციფრითა და სპეციალური სიმბოლოთი.';
          alert(message);
          return;
        }
        const pwned = await checkPwnedPassword(password);
        if (!pwned.valid) {
          alert(currentLang === 'en' ? 'Choose a different password; this password is unsafe or could not be checked.' : currentLang === 'ru' ? 'Выберите другой пароль: этот пароль небезопасен или его не удалось проверить.' : 'აირჩიეთ სხვა პაროლი — ეს პაროლი არასაიმედოა ან მისი შემოწმება ვერ მოხერხდა.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        setCurrentUser(null);
        setAdminLoggedIn(false);
        setActiveTab('store');
        setAuthMode('login');
        setAuthForm({ name: '', phone: '', email: '', password: '' });
        setIsAuthOpen(false);
        showToast(currentLang === 'en' ? 'Password updated. Please sign in again.' : currentLang === 'ru' ? 'Пароль обновлён. Войдите снова.' : 'პაროლი განახლდა. გთხოვთ, ხელახლა შეხვიდეთ.');
      } else if (authMode === 'register') {
        const passwordCheck = validateRegistrationPassword(password);
        if (!passwordCheck.valid) {
          const passwordMessages = {
            length: {
              ka: 'პაროლი უნდა შეიცავდეს მინიმუმ 10 სიმბოლოს.',
              en: 'Password must contain at least 10 characters.',
              ru: 'Пароль должен содержать не менее 10 символов.'
            },
            lowercase: {
              ka: 'პაროლში დაამატეთ მინიმუმ ერთი პატარა ლათინური ასო.',
              en: 'Add at least one lowercase letter.',
              ru: 'Добавьте хотя бы одну строчную латинскую букву.'
            },
            uppercase: {
              ka: 'პაროლში დაამატეთ მინიმუმ ერთი დიდი ლათინური ასო.',
              en: 'Add at least one uppercase letter.',
              ru: 'Добавьте хотя бы одну заглавную латинскую букву.'
            },
            number: {
              ka: 'პაროლში დაამატეთ მინიმუმ ერთი ციფრი.',
              en: 'Add at least one number.',
              ru: 'Добавьте хотя бы одну цифру.'
            },
            symbol: {
              ka: 'პაროლში დაამატეთ მინიმუმ ერთი სპეციალური სიმბოლო.',
              en: 'Add at least one special character.',
              ru: 'Добавьте хотя бы один специальный символ.'
            },
            common: {
              ka: 'ეს პაროლი ძალიან გავრცელებულია. აირჩიეთ განსხვავებული პაროლი.',
              en: 'This password is too common. Choose a different password.',
              ru: 'Этот пароль слишком распространён. Выберите другой пароль.'
            }
          };
          alert(passwordMessages[passwordCheck.reason]?.[currentLang] || passwordMessages.length.ka);
          return;
        }

        const pwnedPasswordCheck = await checkPwnedPassword(password);
        if (!pwnedPasswordCheck.valid) {
          const pwnedMessages = {
            pwned: {
              ka: 'ეს პაროლი ცნობილია მონაცემთა გაჟონვებიდან. უსაფრთხოებისთვის აირჩიეთ სხვა პაროლი.',
              en: 'This password appears in known data breaches. Choose a different password.',
              ru: 'Этот пароль найден в известных утечках данных. Выберите другой пароль.'
            },
            unavailable: {
              ka: 'პაროლის უსაფრთხოების შემოწმება დროებით ვერ შესრულდა. სცადეთ ხელახლა.',
              en: 'The password safety check is temporarily unavailable. Please try again.',
              ru: 'Проверка безопасности пароля временно недоступна. Попробуйте ещё раз.'
            }
          };
          alert(pwnedMessages[pwnedPasswordCheck.reason]?.[currentLang] || pwnedMessages.unavailable.ka);
          return;
        }

        const name = authForm.name.trim();
        const phone = authForm.phone.trim();

        if (name.length < 2 || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
          alert(currentLang === 'en' ? 'Name must contain 2–100 valid characters.' : currentLang === 'ru' ? 'Имя должно содержать 2–100 допустимых символов.' : 'სახელი უნდა შეიცავდეს 2–100 დასაშვებ სიმბოლოს.');
          return;
        }
        const normalizedPhone = phone.replace(/\D/g, '');
        if (!/^\+?[0-9()\s-]+$/.test(phone) || !/^\d{9,15}$/.test(normalizedPhone)) {
          alert(currentLang === 'en' ? 'Enter a valid phone number with 9–15 digits.' : currentLang === 'ru' ? 'Введите корректный номер телефона из 9–15 цифр.' : 'შეიყვანეთ სწორი ტელეფონის ნომერი 9–15 ციფრით.');
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
      } else if (
        message.toLowerCase().includes('email rate limit') ||
        message.toLowerCase().includes('too many requests')
      ) {
        alert(currentLang === 'en' ? 'Too many attempts. Please wait a few minutes and try again.' : currentLang === 'ru' ? 'Слишком много попыток. Подождите несколько минут и повторите.' : 'ძალიან ბევრი მცდელობაა. მოიცადეთ რამდენიმე წუთი და სცადეთ ხელახლა.');
      } else if (
        message.toLowerCase().includes('signup is disabled') ||
        message.toLowerCase().includes('signups not allowed')
      ) {
        alert(currentLang === 'en' ? 'New registrations are temporarily unavailable.' : currentLang === 'ru' ? 'Новая регистрация временно недоступна.' : 'ახალი რეგისტრაცია დროებით მიუწვდომელია.');
      } else if (
        message.toLowerCase().includes('password should be at least') ||
        message.toLowerCase().includes('weak password')
      ) {
        alert(currentLang === 'en' ? 'Choose a stronger password with at least 10 characters and mixed character types.' : currentLang === 'ru' ? 'Выберите более надёжный пароль длиной не менее 10 символов с разными типами символов.' : 'აირჩიეთ უფრო ძლიერი პაროლი — მინიმუმ 10 სიმბოლო, დიდი და პატარა ასო, ციფრი და სპეციალური სიმბოლო.');
      } else {
        alert(
          currentLang === 'en' ? `Sign-in error: ${message || 'Unknown error'}` : currentLang === 'ru' ? `Ошибка входа: ${message || 'Неизвестная ошибка'}` : `ავტორიზაციის შეცდომა: ${message || 'უცნობი შეცდომა'}`
        );
      }
    } finally {
      authSubmitLock.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setCurrentUser(null);
      setAdminLoggedIn(false);
      setOrders([]);
      setMyOrders([]);
      setCheckoutForm({ name: '', phone: '', email: '', address: '' });
      setAuthForm({ name: '', phone: '', email: '', password: '' });
      setAppliedCoupon(null);
      setPromoInput('');
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
    // The submit button already shows the loading state; avoid a stale toast
    // covering the order confirmation dialog after the server commits.

    const customerName = checkoutForm.name?.trim() || '';
    const customerPhone = checkoutForm.phone?.trim() || '';
    const customerEmail = checkoutForm.email?.trim().toLowerCase() || '';
    const customerAddress = checkoutForm.address?.trim() || '';

    const contactValidation = validateCheckoutContact({
      name: customerName,
      phone: customerPhone,
      email: currentUser?.email || customerEmail,
      address: customerAddress,
      requireEmail: !currentUser?.email
    });

    if (!contactValidation.valid) {
      const messages = {
        ka: {
          name: 'სახელი უნდა შეიცავდეს 2–100 სიმბოლოს.',
          phone: 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.',
          email: 'სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელ-ფოსტა.',
          address: 'მისამართი უნდა შეიცავდეს 3–300 სიმბოლოს.'
        },
        en: {
          name: 'Name must contain 2–100 characters.',
          phone: 'Phone number must contain 9–15 digits.',
          email: 'Enter a valid email address for guest checkout.',
          address: 'Address must contain 3–300 characters.'
        },
        ru: {
          name: 'Имя должно содержать 2–100 символов.',
          phone: 'Номер телефона должен содержать 9–15 цифр.',
          email: 'Для гостевого заказа укажите корректный адрес электронной почты.',
          address: 'Адрес должен содержать 3–300 символов.'
        }
      };
      const message = (messages[currentLang] || messages.ka)[contactValidation.field];
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
        : (Number.isFinite(Number(rawPurchaseCost)) && Number(rawPurchaseCost) >= 0 ? Number(rawPurchaseCost) : null);
      return {
        id: item.id,
        name: item.name,
        image: catalogProduct?.image || item.image || item.img || '',
        // Keep the full image set in the order snapshot so historical order photos
        // remain available after the catalogue gallery is edited.
        gallery: Array.isArray(catalogProduct?.gallery)
          ? [...catalogProduct.gallery]
          : (Array.isArray(item.gallery) ? [...item.gallery] : []),
        price: Number(item.basePriceGEL ?? item.priceGEL ?? item.price) || 0,
        quantity: Number(quantity ?? 1),
        selected_size: item.selectedSize || null,
        selected_color: item.selectedColor || null,
        custom_variant_id: item.customVariantId || null,
        custom_variant_name: item.customVariantName || null,
        gift_wrap: item.giftWrap === true,
        vip_warranty: item.vipWarranty === true,
        gift_message: item.giftWrap === true ? String(item.giftMessage ?? '').trim().slice(0, 240) : '',
        purchase_cost: purchaseCost,
        category: catalogProduct?.category || item.category || '',
        vendor: catalogProduct?.vendor || item.vendor || ''
      };
    };

    const itemsToOrder = quickBuyProduct
      ? [buildOrderItemSnapshot(quickBuyProduct, 1)]
      : cart.map(item => buildOrderItemSnapshot(item, item.quantity));

    if (itemsToOrder.length === 0) {
      const message = currentLang === 'en'
        ? 'Your cart is empty. Add a product before checkout.'
        : currentLang === 'ru'
          ? 'Корзина пуста. Добавьте товар перед оформлением заказа.'
          : 'კალათა ცარიელია. დაამატეთ პროდუქტი შეკვეთამდე.';
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    const itemValidation = validateCheckoutItems(itemsToOrder);
    if (!itemValidation.valid) {
      const messages = {
        ka: 'შეკვეთის პროდუქტების ან რაოდენობის მონაცემები არასწორია. გადაამოწმეთ კალათა.',
        en: 'Some product or quantity details are invalid. Please review your cart.',
        ru: 'Данные товара или количество указаны неверно. Проверьте корзину.'
      };
      const message = messages[currentLang] || messages.ka;
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
      // ერთი და იგივე Supabase სესია განსაზღვრავს მომხმარებლის ელფოსტასაც
      // და Authorization ტოკენსაც, რათა RLS შემოწმება თანმიმდევრული იყოს.
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const orderSession = session?.access_token && session?.user?.email ? session : null;

      // Refresh the public catalogue immediately before checkout. This is a
      // customer-facing stale-cart guard; the SQL RPC still rechecks price
      // and stock under row locks and remains the source of truth.
      const catalogueResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=${CHECKOUT_CATALOG_SELECT}`,
        { headers: await getSupabaseHeaders() }
      );
      if (!catalogueResponse.ok) {
        throw new Error('პროდუქტების მიმდინარე ფასისა და მარაგის შემოწმება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.');
      }
      const latestCatalogue = await catalogueResponse.json();
      if (!Array.isArray(latestCatalogue)) {
        throw new Error('პროდუქტების მიმდინარე მონაცემები არასწორია. გთხოვთ, სცადოთ თავიდან.');
      }
      const checkoutCart = quickBuyProduct ? [quickBuyProduct] : cart;
      const reconciliation = reconcileCartWithCatalog(checkoutCart, latestCatalogue);
      if (reconciliation.hasChanges) {
        if (!quickBuyProduct) {
          cartRef.current = reconciliation.cartItems;
          setCart(reconciliation.cartItems);
        }
        setProducts((previous) => previous.map((product) => {
          const current = latestCatalogue.find((entry) => String(entry.id) === String(product.id));
          if (!current) return product;

          const latestVariants = Array.isArray(current.variants) ? current.variants : [];
          const hasSizeColorInventory = latestVariants.some((variant) => variant?.variantType === 'size_color');
          const latestStock = hasSizeColorInventory
            ? latestVariants.reduce((total, variant) => {
                const quantity = Number(variant?.stock);
                return total + (Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0);
              }, 0)
            : Math.max(0, Math.floor(Number(current.stock) || 0));

          // Keep the in-memory catalogue in sync with the exact option matrix
          // used by checkout, so customers can select a newly available variant
          // without refreshing the entire page.
          return {
            ...product,
            name: current.name || product.name,
            priceGEL: Number(current.price_gel),
            stock: latestStock,
            availableSizes: Array.isArray(current.available_sizes) ? current.available_sizes : [],
            availableColors: Array.isArray(current.available_colors) ? current.available_colors : [],
            variants: latestVariants
          };
        }));
        const changedNames = [...new Set(reconciliation.changes.map((change) => change.name).filter(Boolean))].slice(0, 3).join(', ');
        const hasVariantChange = reconciliation.changes.some((change) =>
          String(change.type || '').startsWith('variant_')
        );
        const message = currentLang === 'en'
          ? hasVariantChange
            ? `A selected size or color is no longer available for: ${changedNames}. Remove that item from your cart or choose an available option, then try again.`
            : `The price or stock changed for: ${changedNames}. Your cart has been refreshed. Please review it and place the order again.`
          : currentLang === 'ru'
            ? hasVariantChange
              ? `Выбранный размер или цвет больше недоступен для: ${changedNames}. Удалите товар из корзины или выберите доступный вариант, затем повторите заказ.`
              : `Цена или наличие изменились для: ${changedNames}. Корзина обновлена. Проверьте её и повторите оформление заказа.`
            : hasVariantChange
              ? `არჩეული ზომა ან ფერი აღარ არის ხელმისაწვდომი: ${changedNames}. წაშალეთ ეს ნივთი კალათიდან ან აირჩიეთ ხელმისაწვდომი ვარიანტი და სცადეთ თავიდან.`
              : `შეიცვალა ფასი ან მარაგი: ${changedNames}. კალათა განახლდა. გადაამოწმეთ მონაცემები და ხელახლა გააფორმეთ შეკვეთა.`;
        setCheckoutError(message);
        showToast(message);
        setIsSubmittingOrder(false);
        orderSubmitLock.current = false;
        return;
      }

      // Recheck live coupon and delivery settings immediately before order creation.
      // Any change refreshes the UI and requires the customer to confirm again.
      const pricingHeaders = await getSupabaseHeaders();
      const [freshCouponResponse, freshDeliveryResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/store_coupons?select=id,code,discount_percent,min_order_gel,active&active=eq.true&order=code.asc`, { headers: pricingHeaders }),
        fetch(`${SUPABASE_URL}/rest/v1/store_delivery_fees?select=region,fee_gel`, { headers: pricingHeaders })
      ]);
      if (!freshCouponResponse.ok || !freshDeliveryResponse.ok) {
        throw new Error(currentLang === 'en'
          ? 'Current delivery and coupon settings could not be verified. Please try again.'
          : currentLang === 'ru'
            ? 'Не удалось проверить актуальные условия доставки и купона. Повторите попытку.'
            : 'მიწოდებისა და კუპონის მიმდინარე პირობების შემოწმება ვერ მოხერხდა. სცადეთ თავიდან.');
      }

      const [freshCouponRows, freshDeliveryRows] = await Promise.all([
        freshCouponResponse.json(),
        freshDeliveryResponse.json()
      ]);
      if (!Array.isArray(freshCouponRows) || !Array.isArray(freshDeliveryRows)) {
        throw new Error('Checkout pricing settings are invalid.');
      }

      const freshFees = { ...deliveryFees };
      let selectedFeeFound = false;
      freshDeliveryRows.forEach((row) => {
        if (!Object.prototype.hasOwnProperty.call(freshFees, row.region)) return;
        const fee = Number(row.fee_gel);
        if (!Number.isFinite(fee) || fee < 0) return;
        freshFees[row.region] = fee;
        if (row.region === selectedRegion) selectedFeeFound = true;
      });
      if (!selectedFeeFound) {
        throw new Error(currentLang === 'en'
          ? 'Delivery price for the selected region is unavailable. Please contact support.'
          : currentLang === 'ru'
            ? 'Стоимость доставки для выбранного региона недоступна. Свяжитесь с поддержкой.'
            : 'არჩეული რეგიონის მიწოდების ფასი ვერ მოიძებნა. დაუკავშირდით მხარდაჭერას.');
      }

      const freshCoupons = freshCouponRows.map((row) => ({
        id: row.id,
        code: row.code,
        discountPercent: Number(row.discount_percent),
        minOrderGEL: Number(row.min_order_gel) || 0,
        status: row.active ? 'აქტიური' : 'გამორთული'
      }));
      const oldSelectedFee = Number(currentDeliveryCost);
      const newSelectedFee = Number(freshFees[selectedRegion]);
      let pricingChanged = !Number.isFinite(oldSelectedFee) || oldSelectedFee !== newSelectedFee;
      let freshAppliedCoupon = null;

      if (eligibleAppliedCoupon) {
        freshAppliedCoupon = freshCoupons.find((coupon) =>
          typeof coupon.code === 'string' &&
          coupon.code.trim().toUpperCase() === eligibleAppliedCoupon.code.trim().toUpperCase()
        ) || null;
        if (!freshAppliedCoupon ||
            freshAppliedCoupon.discountPercent !== Number(eligibleAppliedCoupon.discountPercent) ||
            freshAppliedCoupon.minOrderGEL !== Number(eligibleAppliedCoupon.minOrderGEL ?? 0) ||
            cartSubtotalGEL < freshAppliedCoupon.minOrderGEL) {
          pricingChanged = true;
        }
      }

      if (pricingChanged) {
        setDeliveryFees(freshFees);
        setCoupons(freshCoupons);
        setAppliedCoupon(freshAppliedCoupon && cartSubtotalGEL >= freshAppliedCoupon.minOrderGEL
          ? freshAppliedCoupon
          : null);
        const message = currentLang === 'en'
          ? 'Delivery or coupon terms have changed. The latest prices are now shown. Please review your order and submit it again.'
          : currentLang === 'ru'
            ? 'Условия доставки или купона изменились. Показаны актуальные цены. Проверьте заказ и отправьте его повторно.'
            : 'მიწოდების ან კუპონის პირობები შეიცვალა. ნაჩვენებია განახლებული ფასები. გადაამოწმეთ შეკვეთა და ხელახლა დაადასტურეთ.';
        setCheckoutError(message);
        showToast(message);
        setIsSubmittingOrder(false);
        orderSubmitLock.current = false;
        return;
      }

      setDeliveryFees(freshFees);
      setCoupons(freshCoupons);

      orderUserEmail = orderSession?.user?.email || customerEmail;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderUserEmail)) {
        throw new Error('შეკვეთისთვის საჭიროა სწორი ელ-ფოსტა.');
      }

      // Keep one idempotency key for the same checkout payload across retries
      // and page reloads. Only a SHA-256 digest (never contact details) is persisted.
      const checkoutFingerprintPayload = {
        customer_name: customerName,
        phone: customerPhone,
        address: customerAddress,
        user_email: orderSession?.user?.email || 'guest',
        customer_email: orderUserEmail.toLowerCase(),
        items: groupCheckoutItems(itemsToOrder),
        coupon_code: (eligibleAppliedCoupon?.code || '').trim().toUpperCase(),
        delivery_region: selectedRegion
      };
      const fingerprintSource = JSON.stringify(checkoutFingerprintPayload);
      let checkoutFingerprint = fingerprintSource;
      let canPersistFingerprint = false;
      if (window.crypto?.subtle?.digest && typeof TextEncoder !== 'undefined') {
        try {
          const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintSource));
          checkoutFingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
          canPersistFingerprint = true;
        } catch {
          // Keep checkout available; this attempt is protected in memory only.
        }
      }

      let storedPendingCheckout = null;
      if (canPersistFingerprint) {
        try {
          storedPendingCheckout = JSON.parse(window.sessionStorage.getItem('geostore.pendingCheckout') || 'null');
        } catch {
          storedPendingCheckout = null;
        }
      }
      const reusableCheckout = [pendingCheckoutRef.current, storedPendingCheckout]
        .find((entry) => isReusableCheckout(entry, checkoutFingerprint));

      if (reusableCheckout) {
        orderId = reusableCheckout.orderId;
      } else {
        // 128-bit random ID prevents predictable order references; legacy IDs remain valid.
        orderId = createSecureOrderId(window.crypto);
      }

      pendingCheckoutRef.current = { fingerprint: checkoutFingerprint, orderId };
      if (canPersistFingerprint) {
        try {
          window.sessionStorage.setItem('geostore.pendingCheckout', JSON.stringify(pendingCheckoutRef.current));
        } catch {
          // In-memory retry protection remains active if browser storage is unavailable.
        }
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
              address: buildOrderDeliveryAddress({ address: customerAddress, regionText, deliveryFee: currentDeliveryCost }),
              // სტუმრის იდენტობა ბაზის ფუნქციას ცალკე sentinel-ით გადაეცემა;
              // საკონტაქტო ელფოსტა ინახება customer_email ველში.
              user_email: orderSession?.user?.email || 'guest',
              customer_email: orderUserEmail,
              items: itemsToOrder,
              coupon_code: eligibleAppliedCoupon?.code || '',
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
      const orderConfirmationCheck = validateOrderCreationResponse(serverOrderResult, orderId);
      if (!orderConfirmationCheck.valid) {
        throw new Error('სერვერისგან შეკვეთის დადასტურება ვერ მივიღეთ.');
      }
      orderId = orderConfirmationCheck.orderId;
    } catch (err) {
      console.error('Order submission failed:', err);
      const message = getCheckoutErrorMessage(err, currentLang);
      setCheckoutError(message);
      showToast(message);
      setIsSubmittingOrder(false);
      orderSubmitLock.current = false;
      return;
    }

    const confirmedItems = normalizeOrderItems(
      Array.isArray(serverOrderResult.items) ? serverOrderResult.items : itemsToOrder
    );
    const confirmedTotal = Number(serverOrderResult.total_gel);
    const confirmedDelivery = Number(serverOrderResult.delivery_gel);
    const safeConfirmedTotal = Number.isFinite(confirmedTotal) && confirmedTotal >= 0 ? confirmedTotal : 0;
    const safeConfirmedDelivery = Number.isFinite(confirmedDelivery) && confirmedDelivery >= 0 ? confirmedDelivery : 0;
    const newOrderObj = {
      id: orderId,
      date: new Date().toLocaleDateString('ka-GE'),
      customer_name: customerName,
      phone: customerPhone,
      address: `${customerAddress} (${regionText}, მიწოდება: ${safeConfirmedDelivery} ₾)`,
      user_email: orderUserEmail,
      items: confirmedItems,
      totalGEL: safeConfirmedTotal,
      total_gel: safeConfirmedTotal,
      checkoutBreakdown: {
        subtotalGEL: Number(serverOrderResult.subtotal_gel),
        discountGEL: Number(serverOrderResult.discount_gel),
        deliveryGEL: safeConfirmedDelivery,
        couponCode: String(eligibleAppliedCoupon?.code || '').trim()
      },
      status: 'ახალი',
      itemSummary: confirmedItems.length > 0
        ? confirmedItems.map((item) => `${item.name || 'პროდუქტი'}${item.customVariantName ? ` — ${item.customVariantName}` : ''} (x${item.quantity || 1})`).join(', ')
        : 'პროდუქტები'
    };

    setOrders((prev) => [
      newOrderObj,
      ...(prev || [])
    ]);

    // The order is already committed by the server. Never block the
    // customer confirmation on a separate product/stock refresh request.
    // Refresh the storefront in the background after acknowledging the order.
    void fetchProductsFromDatabase();


    setIsCheckoutOpen(false);
    setCheckoutError('');
    setIsSubmittingOrder(false);
    orderSubmitLock.current = false;
    setOrderConfirmation({ id: orderId, email: orderUserEmail, totalGEL: safeConfirmedTotal });
    if (pendingCheckoutRef.current?.orderId === orderId) pendingCheckoutRef.current = null;
    try {
      const savedPendingCheckout = JSON.parse(window.sessionStorage.getItem('geostore.pendingCheckout') || 'null');
      if (savedPendingCheckout?.orderId === orderId) window.sessionStorage.removeItem('geostore.pendingCheckout');
    } catch {
      // Confirmation is already committed; storage cleanup must not block checkout.
    }
    cartRef.current = [];
    setCart([]);
    setAppliedCoupon(null);

    // The confirmation dialog is the single success surface and displays the full order code.
  };

  // Category and subcategory filtering belongs to StoreView, which has the
  // parent/child category tree. Filtering by the parent name here first would
  // discard products assigned to its subcategories before StoreView can include them.
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesVendor =
        selectedVendorFilter === t.allVendors ||
        selectedVendorFilter === 'ყველა' ||
        p.vendor === selectedVendorFilter;

      return matchesVendor && matchesProductSearch(p, searchQuery);
    });
  }, [
    products,
    selectedVendorFilter,
    searchQuery,
    t
  ]);

  const formatPrice = (p) =>
    `${Number(p || 0).toLocaleString('ka-GE')} ₾`;

  return (
    <div className={`geostore-shell ${activeTab !== 'admin' ? 'geostore-fashion-store' : ''} min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 flex flex-col justify-between w-full overflow-x-hidden`}>
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
          <Suspense
            fallback={(
              <div role="status" aria-live="polite" className="w-full min-h-[40vh] flex items-center justify-center text-sm text-stone-500">
                {currentLang === 'ka' ? 'მაღაზია იტვირთება...' : currentLang === 'ru' ? 'Магазин загружается...' : 'Loading store...'}
              </div>
            )}
          >
          <StoreView
            currentLang={currentLang}
            siteSettings={siteSettings}
            banners={bannersList || []}
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
          </Suspense>
        )}

        {activeTab === 'wardrobe' && (
          <Suspense fallback={null}>
            <AIDigitalWardrobe
              products={products}
              addToCart={addToCart}
              formatPrice={formatPrice}
            />
          </Suspense>
        )}

        {activeTab === 'admin' && (
          <Suspense fallback={null}>
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
            onSaveStorefrontDraft={handleSaveStorefrontDraft}
            storefrontDraftBusy={storefrontDraftBusy}
            onPublishStorefront={handlePublishStorefront}
            storefrontPublishBusy={storefrontPublishBusy}
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
            formatPrice={formatPrice}
            deliveryFees={deliveryFees}
            setDeliveryFees={setDeliveryFees}
            />
          </Suspense>
        )}

        {activeTab === 'wishlist' && (
          <div className="gs-wishlist-page space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="gs-wishlist-title text-xl font-black tracking-tight flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                {t.wishlist} ({wishlist.length})
              </h2>

              {wishlist.length > 0 && (
                <button
                  onClick={handleShareWishlist}
                  className="gs-wishlist-share bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  {t.shareList}
                </button>
              )}
            </div>

            {wishlist.length === 0 ? (
              <p className="gs-wishlist-empty text-slate-500 text-xs py-8">
                {t.emptyWishlist}
              </p>
            ) : (
              <div className="gs-wishlist-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map((prod) => (
                  <div
                    key={prod.id}
                    className="gs-wishlist-card bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex items-center justify-between backdrop-blur-2xl shadow-xl"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={prod.image}
                        alt=""
                        className="gs-wishlist-image w-16 h-16 object-contain bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800/80 shadow-inner"
                      />

                      <div>
                        <h4 className="gs-wishlist-product-title font-bold text-xs line-clamp-1">
                          {prod.name}
                        </h4>

                        <p className="gs-wishlist-product-price font-black text-xs mt-1">
                          {formatPrice(prod.priceGEL)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(prod)}
                      className="gs-wishlist-add bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition cursor-pointer"
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
              <div className="gs-cart-empty flex flex-col items-center justify-center gap-3 text-center px-5 py-12 sm:py-16">
                <span className="gs-cart-empty-icon flex items-center justify-center w-14 h-14 rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                  <ShoppingBag className="w-6 h-6" aria-hidden="true" />
                </span>
                <p className="text-slate-500 text-sm font-medium">{t.emptyCart}</p>
              </div>
            ) : (
              <div className="gs-cart-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="gs-cart-items-list lg:col-span-2 space-y-3">
                  {cart.map((item) => {
                    // Older saved cart entries may not contain an image snapshot.
                    // Fall back to the current catalogue record without changing the saved order/cart data.
                    const matchingProduct = products.find((product) => String(product.id) === String(item.id));
                    const itemImage = item.image || item.img || matchingProduct?.image || matchingProduct?.img || matchingProduct?.gallery?.[0] || '';

                    return (
                    <div
                      key={`${item.id}-${item.customVariantId || ''}-${item.name}-${item.selectedSize || ''}-${item.selectedColor || ''}-${item.giftWrap ? 'gift' : ''}-${item.vipWarranty ? 'vip' : ''}-${item.giftMessage || ''}`}
                      className="gs-cart-item bg-slate-900/40 border border-slate-800/80 p-4 rounded-3xl flex items-start sm:items-center gap-3 text-xs backdrop-blur-2xl shadow-xl"
                    >
                      <div className="gs-cart-item-media relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/70">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={item.name || 'GEOSTORE product'}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain p-1"
                            onError={(event) => { event.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[9px] font-black tracking-widest text-amber-400/60">GEOSTORE</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="gs-cart-item-title break-words font-bold text-xs text-white">
                          {item.name}
                        </h4>
                        {item.customVariantName && <p className="gs-cart-item-variant text-amber-300 text-[11px]">ვარიანტი: {item.customVariantName}</p>}

                        {(item.selectedSize || item.selectedColor) && (
                          <p className="gs-cart-item-variant text-slate-400 text-[11px]">
                            {[
                              item.selectedSize ? `${currentLang === 'en' ? 'Size' : currentLang === 'ru' ? 'Размер' : 'ზომა'}: ${item.selectedSize}` : null,
                              item.selectedColor ? `${currentLang === 'en' ? 'Color' : currentLang === 'ru' ? 'Цвет' : 'ფერი'}: ${item.selectedColor}` : null
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        {(item.giftWrap || item.vipWarranty) && (
                          <p className="gs-cart-item-options text-slate-400 text-[10px]">
                            {[
                              item.giftWrap ? (currentLang === 'en' ? 'Gift wrapping (+5 ₾)' : currentLang === 'ru' ? 'Подарочная упаковка (+5 ₾)' : 'სასაჩუქრე შეფუთვა (+5 ₾)') : null,
                              item.vipWarranty ? (currentLang === 'en' ? 'VIP warranty (+15 ₾)' : currentLang === 'ru' ? 'VIP-гарантия (+15 ₾)' : 'VIP გარანტია (+15 ₾)') : null
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {item.giftMessage && (
                          <p className="gs-cart-gift-message text-slate-400 text-[10px] break-words">
                            {currentLang === 'en' ? 'Gift message:' : currentLang === 'ru' ? 'Текст открытки:' : 'სასაჩუქრე ტექსტი:'} {item.giftMessage}
                          </p>
                        )}
                        <p className="gs-cart-item-price text-emerald-400 font-bold">
                          {formatPrice(item.priceGEL)} × {item.quantity}
                        </p>
                        <div className="flex items-center gap-2 pt-1" aria-label={currentLang === 'en' ? 'Quantity controls' : currentLang === 'ru' ? 'Управление количеством' : 'რაოდენობის მართვა'}>
                          <button type="button" onClick={() => changeCartQuantity(item, Number(item.quantity) - 1)} disabled={Number(item.quantity) <= 1} aria-label={currentLang === 'en' ? 'Decrease quantity' : currentLang === 'ru' ? 'Уменьшить количество' : 'რაოდენობის შემცირება'} className="w-8 h-8 rounded-lg border border-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                          <span className="min-w-5 text-center text-white font-semibold tabular-nums">{item.quantity}</span>
                          <button type="button" onClick={() => changeCartQuantity(item, Number(item.quantity) + 1)} aria-label={currentLang === 'en' ? 'Increase quantity' : currentLang === 'ru' ? 'Увеличить количество' : 'რაოდენობის გაზრდა'} className="w-8 h-8 rounded-lg border border-slate-700 text-white">+</button>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item)}
                        aria-label={currentLang === 'en' ? `Remove ${item.name} from cart` : currentLang === 'ru' ? `Удалить ${item.name} из корзины` : `წაშალე ${item.name} კალათიდან`}
                        className="gs-cart-remove shrink-0 self-start text-rose-400 hover:text-rose-300 font-bold p-2 bg-rose-500/10 rounded-xl transition cursor-pointer"
                      >
                        {t.remove}
                      </button>
                    </div>
                    );
                  })}
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

                    {eligibleAppliedCoupon ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <b className="text-amber-300 uppercase">
                            {eligibleAppliedCoupon.code}
                          </b>

                          <span className="text-emerald-400 block text-[10px]">
                            (-{eligibleAppliedCoupon.discountPercent}% {t.discount})
                          </span>
                        </div>

                        <button
                          type="button"
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
                          placeholder="GEOSTORE2026"
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

                    {eligibleAppliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          {t.discount} (-{eligibleAppliedCoupon.discountPercent}%):
                        </span>

                        <span>
                          -{formatPrice(calculateCheckoutTotals({
                            subtotal: cartSubtotalGEL,
                            discountPercent: eligibleAppliedCoupon.discountPercent,
                            deliveryFee: 0
                          }).discountGEL)}
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
                {myOrdersLoading && myOrders.length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">
                    {currentLang === 'en' ? 'Loading orders…' : currentLang === 'ru' ? 'Загрузка заказов…' : 'შეკვეთები იტვირთება…'}
                  </p>
                ) : myOrdersError && myOrders.length === 0 ? (
                  <p role="status" className="text-amber-300 text-xs py-6 text-center">
                    {myOrdersError}
                  </p>
                ) : myOrders.length === 0 ? (
                  <p className="text-slate-500 text-xs py-6 text-center">
                    {t.noOrders}
                  </p>
                ) : (
                  myOrders.map((order) => (
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

                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                              {order.items.slice(0, 3).map((item) =>
                                `${item.name || (currentLang === 'en' ? 'Product' : currentLang === 'ru' ? 'Товар' : 'პროდუქტი')}${item.customVariantName ? ` — ${item.customVariantName}` : ''} ×${Math.max(1, Number(item.quantity) || 1)}`
                              ).join(' · ')}
                              {order.items.length > 3 ? ` +${order.items.length - 3}` : ''}
                            </p>
                          )}
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
            {supportSubmission ? (
              <div className="gs-support-form space-y-3" role="status" aria-live="polite">
                <p className="text-emerald-300 font-bold">
                  {currentLang === 'en' ? 'Your support request was sent.' : currentLang === 'ru' ? 'Ваше обращение отправлено.' : 'მოთხოვნა წარმატებით გაიგზავნა.'}
                </p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {currentLang === 'en' ? 'Save these details. The access code is shown only once and is needed to reopen this conversation.' : currentLang === 'ru' ? 'Сохраните эти данные. Код доступа показывается только один раз и нужен для повторного открытия переписки.' : 'შეინახე ეს მონაცემები. წვდომის კოდი მხოლოდ ერთხელ ჩანს და საჭიროა მიმოწერის ხელახლა გასახსნელად.'}
                </p>
                <label className="block text-xs text-slate-300">
                  {currentLang === 'en' ? 'Ticket number' : currentLang === 'ru' ? 'Номер обращения' : 'მიმართვის ნომერი'}
                  <input readOnly value={supportSubmission.ticketId} onFocus={(event) => event.target.select()} className="gs-support-field mt-1 w-full" />
                </label>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(supportSubmission.ticketId); alert(currentLang === 'en' ? 'Ticket number copied.' : currentLang === 'ru' ? 'Номер скопирован.' : 'ნომერი დაკოპირდა.'); } catch { alert(currentLang === 'en' ? 'Select and copy the ticket number above.' : currentLang === 'ru' ? 'Выделите и скопируйте номер выше.' : 'მონიშნე და დააკოპირე ზემოთ მოცემული ნომერი.'); } }} className="gs-support-submit">
                  {currentLang === 'en' ? 'Copy ticket number' : currentLang === 'ru' ? 'Копировать номер' : 'ნომრის კოპირება'}
                </button>
                <label className="block text-xs text-slate-300">
                  {currentLang === 'en' ? 'Private access code' : currentLang === 'ru' ? 'Личный код доступа' : 'პირადი წვდომის კოდი'}
                  <input readOnly value={supportSubmission.accessToken} onFocus={(event) => event.target.select()} className="gs-support-field mt-1 w-full" />
                </label>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(supportSubmission.accessToken); alert(currentLang === 'en' ? 'Access code copied.' : currentLang === 'ru' ? 'Код доступа скопирован.' : 'წვდომის კოდი დაკოპირდა.'); } catch { alert(currentLang === 'en' ? 'Select and copy the access code above.' : currentLang === 'ru' ? 'Выделите и скопируйте код выше.' : 'მონიშნე და დააკოპირე ზემოთ მოცემული კოდი.'); } }} className="gs-support-submit">
                  {currentLang === 'en' ? 'Copy access code' : currentLang === 'ru' ? 'Копировать код' : 'წვდომის კოდის კოპირება'}
                </button>
                <button type="button" onClick={() => setSupportSubmission(null)} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-slate-200 font-bold">
                  {currentLang === 'en' ? 'Send another request' : currentLang === 'ru' ? 'Отправить ещё одно обращение' : 'ახალი მიმართვის გაგზავნა'}
                </button>
              </div>
            ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmittingSupport) return;

                const name = e.target.cname.value.trim();
                const email = e.target.cemail.value.trim();
                const subject = e.target.csubject.value.trim();
                const message = e.target.cmessage.value.trim();

                if (!name || !message || name.length > 100 || message.length > 4000 || subject.length > 150 || email.length > 254) return;
                setIsSubmittingSupport(true);

                try {
                  if (!window.crypto?.getRandomValues) {
                    throw new Error(currentLang === 'en'
                      ? 'Secure ticket creation is unavailable in this browser.'
                      : currentLang === 'ru'
                        ? 'Создание безопасного номера обращения недоступно в этом браузере.'
                        : 'ამ ბრაუზერში მიმართვის უსაფრთხო ნომრის შექმნა მიუწვდომელია.');
                  }
                  const requestSignature = JSON.stringify([name, email || null, subject || null, message]);
                  let pendingRequest = supportCreateRequestRef.current;

                  // Reuse the same ticket ID, access code and request key when
                  // the same form is retried after a timeout or lost response.
                  if (!pendingRequest || pendingRequest.signature !== requestSignature) {
                    const ticketBytes = new Uint8Array(16);
                    window.crypto.getRandomValues(ticketBytes);
                    const ticketId = `t-${Array.from(ticketBytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;

                    const accessBytes = new Uint8Array(32);
                    window.crypto.getRandomValues(accessBytes);
                    const accessToken = Array.from(accessBytes, byte => byte.toString(16).padStart(2, '0')).join('');

                    const requestBytes = new Uint8Array(16);
                    window.crypto.getRandomValues(requestBytes);
                    requestBytes[6] = (requestBytes[6] & 0x0f) | 0x40;
                    requestBytes[8] = (requestBytes[8] & 0x3f) | 0x80;
                    const requestHex = Array.from(requestBytes, byte => byte.toString(16).padStart(2, '0')).join('');
                    const requestId = `${requestHex.slice(0, 8)}-${requestHex.slice(8, 12)}-${requestHex.slice(12, 16)}-${requestHex.slice(16, 20)}-${requestHex.slice(20)}`;

                    pendingRequest = { signature: requestSignature, ticketId, accessToken, requestId };
                    supportCreateRequestRef.current = pendingRequest;
                  }

                  const { ticketId, accessToken, requestId } = pendingRequest;
                  const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/rpc/create_support_ticket_idempotent`,
                    {
                      method: 'POST',
                      headers: await getSupabaseHeaders({ authenticated: true }),
                      body: JSON.stringify({
                        p_id: ticketId,
                        p_customer_name: name,
                        p_email: email || null,
                        p_subject: subject || null,
                        p_message: message,
                        p_access_token: accessToken,
                        p_request_id: requestId
                      })
                    }
                  );

                  if (!response.ok) {
                    if (response.status === 429) {
                      throw new Error(currentLang === 'en'
                        ? 'Too many support requests. Please try again later.'
                        : currentLang === 'ru'
                          ? 'Слишком много обращений. Попробуйте позже.'
                          : 'ძალიან ბევრი მოთხოვნა გაიგზავნა. გთხოვთ, სცადოთ მოგვიანებით.');
                    }
                    throw new Error(currentLang === 'en'
                      ? 'Could not send the support request. Please try again later.'
                      : currentLang === 'ru'
                        ? 'Не удалось отправить обращение. Попробуйте позже.'
                        : 'მხარდაჭერის შეტყობინების გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით.');
                  }

                  const createdTicket = await response.json();
                  if (!createdTicket || createdTicket.ticket_id !== ticketId) {
                    throw new Error(currentLang === 'en'
                      ? 'The support request response could not be verified. Please retry.'
                      : currentLang === 'ru'
                        ? 'Не удалось проверить ответ сервера. Повторите попытку.'
                        : 'სერვერის პასუხის გადამოწმება ვერ მოხერხდა. ხელახლა სცადე.');
                  }

                  supportCreateRequestRef.current = null;
                  setSupportSubmission({ ticketId, accessToken });
                  e.target.reset();
                } catch (error) {
                  console.error('Support ticket error:', error);
                  alert(
                    error.message || (currentLang === 'en'
                      ? 'Could not send the support request.'
                      : currentLang === 'ru'
                        ? 'Не удалось отправить обращение в поддержку.'
                        : 'მხარდაჭერის შეტყობინების გაგზავნა ვერ მოხერხდა.')
                  );
                } finally {
                  setIsSubmittingSupport(false);
                }
              }}
              className="gs-support-form"
            >
              <input
                type="text"
                name="cname"
                aria-label={currentLang === 'en' ? 'Your name' : currentLang === 'ru' ? 'Ваше имя' : 'თქვენი სახელი'}
                placeholder={currentLang === 'en' ? 'Your name *' : currentLang === 'ru' ? 'Ваше имя *' : 'თქვენი სახელი *'}
                required
                maxLength={100}
                className="gs-support-field"
              />

              <input
                type="email"
                name="cemail"
                maxLength={254}
                aria-label={currentLang === 'en' ? 'Email' : currentLang === 'ru' ? 'Эл. почта' : 'ელფოსტა'}
                placeholder={currentLang === 'en' ? 'Email' : currentLang === 'ru' ? 'Эл. почта' : 'ელფოსტა'}
                className="gs-support-field"
              />

              <input
                type="text"
                name="csubject"
                maxLength={150}
                aria-label={currentLang === 'en' ? 'Subject' : currentLang === 'ru' ? 'Тема' : 'თემა'}
                placeholder={currentLang === 'en' ? 'Subject' : currentLang === 'ru' ? 'Тема' : 'თემა'}
                className="gs-support-field"
              />

              <textarea
                name="cmessage"
                rows="3"
                maxLength={4000}
                aria-label={currentLang === 'en' ? 'Message' : currentLang === 'ru' ? 'Сообщение' : 'შეტყობინება'}
                placeholder={currentLang === 'en' ? 'Write your message...' : currentLang === 'ru' ? 'Напишите сообщение...' : 'დაწერე შეტყობინება...'}
                required
                className="gs-support-field"
              />

              <button
                type="submit"
                disabled={isSubmittingSupport}
                aria-busy={isSubmittingSupport}
                className="gs-support-submit disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingSupport
                  ? (currentLang === 'en' ? 'Sending…' : currentLang === 'ru' ? 'Отправка…' : 'იგზავნება…')
                  : t.sendMessage}
              </button>
            </form>
            )}

            <div className="gs-support-form mt-4 border-t border-slate-700 pt-4 space-y-3">
              <p className="text-sm font-bold text-white">
                {currentLang === 'en' ? 'Continue an existing conversation' : currentLang === 'ru' ? 'Продолжить переписку' : 'არსებული მიმოწერის გაგრძელება'}
              </p>
              <p className="text-xs text-slate-400">
                {currentLang === 'en' ? 'Enter your ticket number and private access code.' : currentLang === 'ru' ? 'Введите номер обращения и личный код доступа.' : 'შეიყვანე მიმართვის ნომერი და პირადი წვდომის კოდი.'}
              </p>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (supportThreadLoading) return;
                  const ticketId = supportLookupTicketId.trim();
                  const accessToken = supportLookupAccessToken.trim();
                  if (!/^t-[a-f0-9]{32}$/i.test(ticketId) || !/^[a-f0-9]{64}$/i.test(accessToken)) {
                    setSupportThreadError(currentLang === 'en' ? 'Check the ticket number and access code.' : currentLang === 'ru' ? 'Проверьте номер обращения и код доступа.' : 'შეამოწმე მიმართვის ნომერი და წვდომის კოდი.');
                    setSupportThreadLoaded(false);
                    setSupportThreadMessages([]);
                    return;
                  }
                  setSupportThreadLoading(true);
                  setSupportThreadError('');
                  setSupportThreadLoaded(false);
                  try {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_support_ticket_messages`, {
                      method: 'POST',
                      headers: await getSupabaseHeaders({ authenticated: true }),
                      body: JSON.stringify({ p_ticket_id: ticketId, p_access_token: accessToken })
                    });
                    if (!response.ok) throw new Error('ACCESS_DENIED');
                    const rows = await response.json();
                    if (!Array.isArray(rows)) throw new Error('INVALID_RESPONSE');
                    setSupportThreadMessages(rows);
                    setSupportThreadLoaded(true);
                  } catch (error) {
                    console.error('Support conversation lookup error:', error);
                    setSupportThreadMessages([]);
                    setSupportThreadLoaded(false);
                    setSupportThreadError(currentLang === 'en'
                      ? 'Conversation not found or the access details are incorrect.'
                      : currentLang === 'ru'
                        ? 'Переписка не найдена или данные доступа неверны.'
                        : 'მიმოწერა ვერ მოიძებნა ან წვდომის მონაცემები არასწორია.');
                  } finally {
                    setSupportThreadLoading(false);
                  }
                }}
                className="space-y-2"
              >
                <input
                  type="text"
                  value={supportLookupTicketId}
                  onChange={(event) => setSupportLookupTicketId(event.target.value)}
                  placeholder={currentLang === 'en' ? 'Ticket number (t-...)' : currentLang === 'ru' ? 'Номер обращения (t-...)' : 'მიმართვის ნომერი (t-...)'}
                  aria-label={currentLang === 'en' ? 'Ticket number' : currentLang === 'ru' ? 'Номер обращения' : 'მიმართვის ნომერი'}
                  autoComplete="off"
                  maxLength={34}
                  className="gs-support-field w-full"
                  required
                />
                <input
                  type="password"
                  value={supportLookupAccessToken}
                  onChange={(event) => setSupportLookupAccessToken(event.target.value)}
                  placeholder={currentLang === 'en' ? 'Private access code' : currentLang === 'ru' ? 'Личный код доступа' : 'პირადი წვდომის კოდი'}
                  aria-label={currentLang === 'en' ? 'Private access code' : currentLang === 'ru' ? 'Личный код доступа' : 'პირადი წვდომის კოდი'}
                  autoComplete="off"
                  maxLength={64}
                  className="gs-support-field w-full"
                  required
                />
                <button type="submit" disabled={supportThreadLoading} className="gs-support-submit disabled:opacity-60">
                  {supportThreadLoading
                    ? (currentLang === 'en' ? 'Loading…' : currentLang === 'ru' ? 'Загрузка…' : 'იტვირთება…')
                    : (currentLang === 'en' ? 'Open conversation' : currentLang === 'ru' ? 'Открыть переписку' : 'მიმოწერის გახსნა')}
                </button>
              </form>

              {supportThreadError && <p role="alert" className="text-xs text-rose-300">{supportThreadError}</p>}

              {supportThreadLoaded && (
                <div className="space-y-3">
                  <div ref={supportThreadMessagesRef} className="max-h-64 overflow-y-auto space-y-2 pr-1" aria-live="polite">
                    {supportThreadMessages.length ? supportThreadMessages.map((item) => (
                      <div key={item.id} className={`rounded-xl p-3 text-xs ${item.sender_role === 'admin' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800 border border-slate-700'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <strong className="text-slate-100">{item.sender_role === 'admin' ? (currentLang === 'en' ? 'GEOSTORE Support' : currentLang === 'ru' ? 'Поддержка GEOSTORE' : 'GEOSTORE მხარდაჭერა') : (item.sender_name || (currentLang === 'en' ? 'You' : currentLang === 'ru' ? 'Вы' : 'თქვენ'))}</strong>
                          <time className="text-[10px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleString(currentLang === 'en' ? 'en-US' : currentLang === 'ru' ? 'ru-RU' : 'ka-GE') : ''}</time>
                        </div>
                        <p className="text-slate-200 whitespace-pre-wrap break-words">{item.message}</p>
                      </div>
                    )) : <p className="text-xs text-slate-400">{currentLang === 'en' ? 'No messages yet.' : currentLang === 'ru' ? 'Сообщений пока нет.' : 'შეტყობინებები ჯერ არ არის.'}</p>}
                  </div>
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (supportReplyInFlightRef.current || supportThreadSending) return;
                      const replyForm = event.currentTarget;
                      const message = String(new FormData(replyForm).get('supportReply') || '').trim();
                      if (!message || message.length > 4000) return;
                      supportReplyInFlightRef.current = true;
                      setSupportThreadSending(true);
                      setSupportThreadError('');
                      try {
                        if (!supportReplyRequestRef.current || supportReplyRequestRef.current.message !== message) {
                          if (!window.crypto?.randomUUID) {
                            throw new Error('უსაფრთხო მოთხოვნის ID ვერ შეიქმნა. განაახლეთ ბრაუზერი და სცადეთ თავიდან.');
                          }
                          supportReplyRequestRef.current = { id: window.crypto.randomUUID(), message };
                        }
                        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_support_ticket_message_idempotent`, {
                          method: 'POST',
                          headers: await getSupabaseHeaders({ authenticated: true }),
                          body: JSON.stringify({
                            p_ticket_id: supportLookupTicketId.trim(),
                            p_message: message,
                            p_access_token: supportLookupAccessToken.trim(),
                            p_request_id: supportReplyRequestRef.current.id
                          })
                        });
                        if (!response.ok) throw new Error(await response.text());

                        // The message is already committed. Clear the composer now so
                        // a refresh failure cannot make the customer resend a duplicate.
                        replyForm.reset();
                        supportReplyRequestRef.current = null;

                        try {
                          const refreshResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_support_ticket_messages`, {
                            method: 'POST',
                            headers: await getSupabaseHeaders({ authenticated: true }),
                            body: JSON.stringify({
                              p_ticket_id: supportLookupTicketId.trim(),
                              p_access_token: supportLookupAccessToken.trim()
                            })
                          });
                          if (!refreshResponse.ok) throw new Error('REFRESH_FAILED');
                          const rows = await refreshResponse.json();
                          if (!Array.isArray(rows)) throw new Error('INVALID_RESPONSE');
                          setSupportThreadMessages(rows);
                        } catch (refreshError) {
                          console.warn('Support reply saved but conversation refresh failed:', refreshError);
                          setSupportThreadError(currentLang === 'en'
                            ? 'Your reply was sent, but the conversation could not refresh. Reopen it or try refreshing.'
                            : currentLang === 'ru'
                              ? 'Ответ отправлен, но переписка не обновилась. Откройте её заново или обновите.'
                              : 'პასუხი გაიგზავნა, მაგრამ მიმოწერის განახლება ვერ მოხერხდა. ხელახლა გახსენი ან განაახლე.');
                        }
                      } catch (error) {
                        console.error('Support reply error:', error);
                        setSupportThreadError(currentLang === 'en'
                          ? 'Your reply could not be sent. Please try again.'
                          : currentLang === 'ru'
                            ? 'Не удалось отправить ответ. Попробуйте ещё раз.'
                            : 'პასუხის გაგზავნა ვერ მოხერხდა. სცადე ხელახლა.');
                      } finally {
                        supportReplyInFlightRef.current = false;
                        setSupportThreadSending(false);
                      }
                    }}
                    className="space-y-2"
                  >
                    <textarea
                      name="supportReply"
                      rows={2}
                      maxLength={4000}
                      required
                      placeholder={currentLang === 'en' ? 'Write a reply…' : currentLang === 'ru' ? 'Напишите ответ…' : 'დაწერე პასუხი…'}
                      className="gs-support-field w-full"
                    />
                    <button type="submit" disabled={supportThreadSending} className="gs-support-submit disabled:opacity-60">
                      {supportThreadSending
                        ? (currentLang === 'en' ? 'Sending…' : currentLang === 'ru' ? 'Отправка…' : 'იგზავნება…')
                        : (currentLang === 'en' ? 'Send reply' : currentLang === 'ru' ? 'Отправить ответ' : 'პასუხის გაგზავნა')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setSupportSubmission(null); setSupportOpen(true); }}
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

      {hasLoadedModals && (
        <Suspense fallback={null}>
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
        notificationsLoading={notificationsLoading}
        notificationsError={notificationsError}
        markAllNotificationsAsRead={markAllNotificationsAsRead}
        orders={orders}
        lookupOrderForTracking={lookupOrderForTracking}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        deliveryFees={deliveryFees}
        currentUser={currentUser}
          />
        </Suspense>
      )}

      {isImageSearchOpen && (
        <Suspense fallback={null}>
          <ImageSearchModal
            isImageSearchOpen={isImageSearchOpen}
            setIsImageSearchOpen={setIsImageSearchOpen}
            products={products}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        </Suspense>
      )}

      {hasLoadedAiAssistant && (
        <Suspense fallback={null}>
          <AiAssistantModal
        currentLang={currentLang}
        isAiAssistantOpen={isAiAssistantOpen}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        products={products}
        categories={categories}
        vendorsList={vendorsList}
        lookupOrderForTracking={lookupOrderForTracking}
        coupons={coupons}
        siteSettings={siteSettings}
        deliveryFees={deliveryFees}
        addToCart={addToCart}
        formatPrice={formatPrice}
          />
        </Suspense>
      )}

      {isComparisonOpen && (
        <Suspense fallback={null}>
          <ProductCompareModal
            isComparisonOpen={isComparisonOpen}
            setIsComparisonOpen={setIsComparisonOpen}
            comparisonList={comparisonList}
            setComparisonList={setComparisonList}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        </Suspense>
      )}

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
