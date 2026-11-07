// src/components/AdminDashboardPro.jsx - Ultimate Full Elite Edition with Advanced Order Details Modal
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Tag, Search, Star, Settings, Image as ImageIcon, Percent, Download, FolderTree, Megaphone, Send, Activity, Zap, Printer, HelpCircle,
  Smartphone, Laptop, Headphones, Watch, Tv, Speaker, Sparkles, Gamepad2, Tablet, LayoutDashboard, ShoppingCart, BarChart3, Truck, ShieldAlert, Footprints, Shirt, Gem, Cpu, ChevronRight, ChevronUp, ChevronDown, CornerDownRight, KeyRound, Layers, UserX, UserCheck, Edit3, Calculator, Wallet, UserCog, CheckSquare, Square, Eye, X 
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { validateImageFile, isValidImageDataUrl } from '../utils/imageSafety';
import { validateProductVariants } from '../utils/productValidation';
import { resolveProductCreatedAt } from '../utils/productOrdering';
import { collectReferencedProductImageUrls } from '../utils/productImageCleanup';
import { normalizeOrderItems, normalizeOrderTotal } from '../utils/orderSafety';

const SUPABASE_URL = 'https://xmtnszxtnfxnrojionoa.supabase.co';
const getLocalDateInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const SUPABASE_ANON_KEY = supabase.supabaseKey;

const getSupabaseHeaders = async () => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };
};

const PRODUCT_IMAGE_BUCKET = 'storefront-media';
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_GALLERY_IMAGES = 10;
const PRODUCT_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const uploadProductImage = async (imageData, productId, index) => {
  const value = String(imageData || '').trim();
  if (!value.startsWith('data:')) return value;

  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match || !isValidImageDataUrl(value, MAX_PRODUCT_IMAGE_BYTES)) {
    throw new Error('ფოტოს რეალური ფორმატი არასწორია. ატვირთეთ ნამდვილი JPG, PNG, WEBP ან GIF ფოტო.');
  }

  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  const estimatedBytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('თითოეული ფოტოს ზომა არ უნდა აღემატებოდეს 5 MB-ს.');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 1) bytes[offset] = binary.charCodeAt(offset);

  if (!window.crypto?.getRandomValues) {
    throw new Error('უსაფრთხო ფოტოს ატვირთვისთვის ბრაუზერის კრიპტოგრაფიული ფუნქცია მიუწვდომელია.');
  }
  const randomBytes = new Uint8Array(16);
  window.crypto.getRandomValues(randomBytes);
  const randomSuffix = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const safeProductId = encodeURIComponent(String(productId));
  const path = `products/${safeProductId}/${Date.now()}-${index}-${randomSuffix}.${PRODUCT_IMAGE_TYPES[mimeType]}`;
  const headers = await getSupabaseHeaders();
  delete headers.Prefer;
  headers['Content-Type'] = mimeType;
  headers['x-upsert'] = 'false';

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers,
      body: new Blob([bytes], { type: mimeType })
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error('ფოტოს Storage-ში ატვირთვა ვერ მოხერხდა: ' + detail);
  }

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`;
};

const deleteProductImages = async (imageUrls, productId) => {
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const productPrefix = `products/${String(productId)}/`;
  const paths = [...new Set((Array.isArray(imageUrls) ? imageUrls : []).filter(url => typeof url === 'string' && url.startsWith(publicPrefix)).map(url => {
    try {
      const encodedPath = url.slice(publicPrefix.length).split('?')[0];
      const path = encodedPath.split('/').map(segment => decodeURIComponent(segment)).join('/');
      return path.startsWith(productPrefix) ? path : null;
    } catch { return null; }
  }).filter(Boolean))];
  if (!paths.length) return true;
  try {
    // A product-owned Storage path can still be referenced by another product.
    // Read the lightweight image references first and fail closed if this check fails.
    const referenceResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,image,gallery`,
      { headers: await getSupabaseHeaders() }
    );
    if (!referenceResponse.ok) throw new Error('პროდუქტის ფოტოების გამოყენების შემოწმება ვერ მოხერხდა.');
    const productRows = await referenceResponse.json();
    if (!Array.isArray(productRows)) throw new Error('პროდუქტის ფოტოების სია არასწორია.');
    const referencedUrls = collectReferencedProductImageUrls(productRows, productId);
    const safePaths = paths.filter(path => {
      const canonicalUrl = publicPrefix + path.split('/').map(encodeURIComponent).join('/');
      return !referencedUrls.has(canonicalUrl);
    });
    if (!safePaths.length) return true;
    const headers = await getSupabaseHeaders();
    delete headers.Prefer;
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}`, {
      method: 'DELETE', headers, body: JSON.stringify({ prefixes: safePaths })
    });
    if (!response.ok) throw new Error(await response.text());
    return true;
  } catch (error) {
    console.warn('GEOSTORE product image cleanup failed:', error);
    return false;
  }
};

const getOrderStatusClasses = (status) => {
  switch (String(status || '').trim().toLowerCase()) {
    case 'ახალი':
    case 'new':
      return 'bg-blue-500/10 text-blue-300 border border-blue-500/40';
    case 'მუშავდება':
    case 'processing':
      return 'bg-amber-500/10 text-amber-300 border border-amber-500/40';
    case 'გაგზავნილი':
    case 'გზაშია':
    case 'shipped':
    case 'on the way':
    case 'отправлен':
    case 'в пути':
      return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/40';
    case 'დასრულებული':
    case 'ჩაბარებულია':
    case 'delivered':
    case 'completed':
    case 'доставлен':
    case 'завершён':
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40';
    case 'გაუქმებული':
    case 'cancelled':
    case 'canceled':
    case 'отменён':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/40';
    default:
      return 'bg-slate-500/10 text-slate-300 border border-slate-500/40';
  }
};

const normalizeOrderStatus = (status) => String(status || '').trim().toLowerCase();
const isDeliveredOrderStatus = (status) =>
  ['დასრულებული', 'ჩაბარებულია', 'delivered', 'completed', 'доставлен', 'завершён'].includes(normalizeOrderStatus(status));
const isShippedOrderStatus = (status) =>
  ['გაგზავნილი', 'გზაშია', 'shipped', 'on the way', 'отправлен', 'в пути'].includes(normalizeOrderStatus(status));
const isCancelledOrderStatus = (status) =>
  ['გაუქმებული', 'cancelled', 'canceled', 'отменён'].includes(normalizeOrderStatus(status));

const getOrderStatusFilterKey = (status) => {
  if (isDeliveredOrderStatus(status)) return 'დასრულებული';
  if (isShippedOrderStatus(status)) return 'გაგზავნილი';
  if (isCancelledOrderStatus(status)) return 'გაუქმებული';
  const normalized = normalizeOrderStatus(status);
  if (['ახალი', 'new'].includes(normalized)) return 'ახალი';
  if (['მუშავდება', 'processing', 'в обработке'].includes(normalized)) return 'მუშავდება';
  return String(status || '');
};

export default function AdminDashboardPro({
  adminLoggedIn,
  setAdminLoggedIn,
  adminLoginForm,
  setAdminLoginForm,
  handleAdminLogin,
  handleLogout,
  adminError,
  orders = [],
  setOrders,
  usersList = [],
  setUsersList,
  products = [],
  setProducts,
  vendorsList = [],
  setVendorsList,
  coupons = [],
  setCoupons,
  categoriesList = [],
  setCategoriesList,
  bannersList = [],
  setBannersList,
  onSaveStorefrontDraft,
  storefrontDraftBusy = false,
  onPublishStorefront,
  storefrontPublishBusy = false,
  siteSettings,
  setSiteSettings,
  formatPrice,
  deliveryFees,
  setDeliveryFees
}) {
  const [adminTab, setAdminTab] = useState('analytics'); 
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');  const [quickProductDrafts, setQuickProductDrafts] = useState({});

  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ყველა');
  const [orderPageByStatus, setOrderPageByStatus] = useState({});
  const [analyticsPeriod, setAnalyticsPeriod] = useState('all');
  const ORDERS_PER_PAGE = 5;

  // 🌟 შეკვეთის დეტალების ნახვის მოდალის სახელმწიფო (Order Details Modal)
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [orderAdminNoteInput, setOrderAdminNoteInput] = useState('');
  const [isSavingOrderNote, setIsSavingOrderNote] = useState(false);
  const [reactivationOrder, setReactivationOrder] = useState(null);
  const [reactivationPassword, setReactivationPassword] = useState('');
  const [reactivationError, setReactivationError] = useState('');
  const [isReactivatingOrder, setIsReactivatingOrder] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserDiscount, setEditUserDiscount] = useState('');
  const [editUserNotes, setEditUserNotes] = useState('');

  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('Shirt');
  const [editCatImage, setEditCatImage] = useState('');

  // This is a local planning list only; it does not create Supabase Auth users or grant server permissions.
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('geostore_staff_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });

  const [staffForm, setStaffForm] = useState({ 
    name: '', 
    email: '', 
    role: 'მენეჯერი', 
    permissions: { products: true, orders: true, analytics: false, expenses: false, crm: false, settings: false } 
  });
  
  const [selectedUserEmailForStaff, setSelectedUserEmailForStaff] = useState('');
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [editStaffRole, setEditStaffRole] = useState('');
  const [editStaffPermissions, setEditStaffPermissions] = useState({});

  const [calcForm, setCalcForm] = useState({
    purchaseCost: '45',
    sellingPrice: '99',
    discountPercent: '0',
    shippingCost: '5',
    packagingCost: '2',
    processingFee: '2',
    otherExpenses: '0',
    quantity: '1'
  });

  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ category: 'რეკლამა & მარკეტინგი', amount: '', date: getLocalDateInputValue(), description: '' });

  const [aiQuery, setAiQuery] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState([
    { role: 'assistant', text: 'მოგესალმებით! მე ვარ თქვენი AI ბიზნეს ანალიტიკოსი. შემიძლია გავაანალიზო თქვენი რეალური გაყიდვები, მოგება და ხარჯები. რით გეხმარებით?' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('geostore_staff_list', JSON.stringify(staffList));
    } catch {}
  }, [staffList]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses?select=*&order=created_at.desc`, { headers: await getSupabaseHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data || []);
      }
    } catch {}
  };

  useEffect(() => {
    // Do not poll private finance data until the server-verified admin session is active.
    if (!adminLoggedIn) return undefined;

    fetchExpenses();
    const interval = setInterval(fetchExpenses, 15000);
    return () => clearInterval(interval);
  }, [adminLoggedIn]);



  // Order data is refreshed centrally by App.jsx; this function remains for post-mutation refreshes.


  const safeCategories = React.useMemo(() => {
    try {
      if (!Array.isArray(categoriesList)) return [{ id: 'c1', name: 'ტანსაცმელი', icon: 'Shirt', parentId: null, image: '' }];
      return categoriesList.map((cat, idx) => {
        if (!cat) return null;
        if (typeof cat === 'string') {
          return { id: `cat-str-${idx}`, name: cat, icon: 'Shirt', parentId: null, image: '', img: '' };
        }
        if (typeof cat === 'object') {
          const catImg = cat.image || cat.img || '';
          return {
            ...cat,
            id: cat.id || `cat-obj-${idx}`,
            name: String(cat.name || 'კატეგორია'),
            icon: cat.icon || 'Shirt',
            parentId: cat.parentId || null,
            image: catImg,
            img: catImg
          };
        }
        return null;
      }).filter(Boolean);
    } catch {
      return [{ id: 'c1', name: 'ტანსაცმელი', icon: 'Shirt', parentId: null, image: '', img: '' }];
    }
  }, [categoriesList]);
  
  const productFormInitial = {
    name: '', category: safeCategories[0]?.name || 'ტანსაცმელი', priceGEL: '', oldPriceGEL: '', purchaseCost: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: '', tags: '',
    material: '',
    durability: '',
    brand: 'GEOSTORE',
    model: '',
    cpu: '',
    ram: '',
    storage: '',
    gpu: '',
    screenSize: '',
    os: '',
    availableSizes: ['S', 'M', 'L', 'XL'],
    availableColors: ['შავი', 'თეთრი'],
    isFeatured: false
  };

  const [productForm, setProductForm] = useState(productFormInitial);
  const [stockDrafts, setStockDrafts] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  const handleAddCustomVariant = (e) => {
    e.preventDefault();
    const name = String(newVarName || '').trim();
    const priceText = String(newVarPrice ?? '').trim();
    const stockText = String(newVarStock ?? '').trim();
    const price = Number(priceText);
    const stock = stockText === '' ? 10 : Number(stockText);

    if (!name || name.length > 80) return alert('ვარიანტის სახელი აუცილებელია და მაქსიმუმ 80 სიმბოლო უნდა იყოს.');
    if (!Number.isFinite(price) || price < 0 || price > 1000000000 || !/^\d+(?:\.\d{1,2})?$/.test(priceText)) {
      return alert('ვარიანტის ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    }
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) {
      return alert('ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.');
    }
    if (productVariants.length >= 50) return alert('ერთ პროდუქტზე მაქსიმუმ 50 ვარიანტია დაშვებული.');
    if (productVariants.some(variant => String(variant.name || '').trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return alert('ამ პროდუქტზე ასეთი ვარიანტის სახელი უკვე არსებობს.');

    const generatedVariantId = typeof globalThis.crypto?.randomUUID === 'function'
      ? `var-${globalThis.crypto.randomUUID()}`
      : `var-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const varObj = {
      id: generatedVariantId,
      name,
      priceGEL: price,
      stock
    };
    setProductVariants(prev => [...prev, varObj]);
    setNewVarName('');
    setNewVarPrice('');
    setNewVarStock('');
  };

  const handleRemoveCustomVariant = (id) => {
    setProductVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleCategoryChange = (catName) => {
    const nameLower = catName.toLowerCase();
    let defaultSizes = ['S', 'M', 'L', 'XL'];
    let defaultColors = ['შავი', 'თეთრი'];

    if (nameLower.includes('ფეხსაცმელ') || nameLower.includes('shoe')) {
      defaultSizes = ['38', '39', '40', '41', '42', '43', '44'];
    } else if (nameLower.includes('ტანსაცმელ') || nameLower.includes('ჩაცმა') || nameLower.includes('ქურთუკ') || nameLower.includes('შარვალ')) {
      defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    } else if (nameLower.includes('სმარტფონ') || nameLower.includes('ტელეფონ')) {
      defaultSizes = ['128GB', '256GB', '512GB', '1TB'];
      defaultColors = ['ტიტანი', 'ვერცხლისფერი', 'შავი', 'ოქროსფერი'];
    } else if (nameLower.includes('ლეპტოპ') || nameLower.includes('კომპიუტერ')) {
      defaultSizes = ['8GB RAM / 256GB SSD', '16GB RAM / 512GB SSD', '32GB RAM / 1TB SSD'];
    } else if (nameLower.includes('აქსესუარ') || nameLower.includes('საათ')) {
      defaultSizes = ['Standard / One Size'];
    }

    setProductForm(prev => ({
      ...prev,
      category: catName,
      availableSizes: defaultSizes,
      availableColors: defaultColors
    }));
  };

  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', minOrderGEL: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', commission: '' });
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Shirt');
  const [newCatImage, setNewCatImage] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image: '', link: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [flashSaleForm, setFlashSaleForm] = useState({ discountPercent: '', category: 'ყველა' });
  const [isApplyingFlashSale, setIsApplyingFlashSale] = useState(false);

  const [supportTickets, setSupportTickets] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});
  const [storefrontVersions, setStorefrontVersions] = useState([]);
  const [storefrontVersionsLoading, setStorefrontVersionsLoading] = useState(false);
  const [storefrontVersionsError, setStorefrontVersionsError] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?select=*&order=created_at.desc`, { headers: await getSupabaseHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSupportTickets((data || []).map(t => ({
          id: t.id,
          customerName: t.customer_name,
          email: t.email,
          subject: t.subject,
          message: t.message,
          status: t.status || 'ღია',
          reply: t.reply || '',
          date: t.created_at ? new Date(t.created_at).toLocaleDateString('ka-GE') : 'დღეს'
        })));
      }
    } catch {}
  };

  useEffect(() => {
    if (!adminLoggedIn) return undefined;
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, [adminLoggedIn]);

  useEffect(() => {
    let active = true;
    if (!adminLoggedIn) {
      setStorefrontVersions([]);
      setStorefrontVersionsError('');
      setStorefrontVersionsLoading(false);
      return () => { active = false; };
    }
    if (storefrontPublishBusy) return () => { active = false; };
    const loadStorefrontVersions = async () => {
      setStorefrontVersionsLoading(true);
      setStorefrontVersionsError('');
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/storefront_versions?config_key=eq.storefront&select=id,snapshot,version_label,created_at&order=created_at.desc&limit=20`,
          { headers: await getSupabaseHeaders() }
        );
        if (!response.ok) throw new Error(await response.text());
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('ვერსიების ისტორიის ფორმატი არასწორია.');
        if (active) setStorefrontVersions(rows);
      } catch (error) {
        if (active) setStorefrontVersionsError(error.message || 'ვერსიების ისტორიის ჩატვირთვა ვერ მოხერხდა.');
      } finally {
        if (active) setStorefrontVersionsLoading(false);
      }
    };
    loadStorefrontVersions();
    return () => { active = false; };
  }, [adminLoggedIn, storefrontPublishBusy]);

  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsError, setActivityLogsError] = useState('');

  const fetchActivityLogs = async () => {
    setActivityLogsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_admin_activity_logs`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({ p_limit: 100 })
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('აქტივობების ისტორიის ფორმატი არასწორია.');
      setActivityLogs(rows.map(log => ({
        id: String(log.id),
        action: log.action,
        time: log.created_at ? new Date(log.created_at).toLocaleString('ka-GE') : ''
      })));
      setActivityLogsError('');
    } catch (error) {
      setActivityLogsError(error?.message || 'აქტივობების ისტორიის ჩატვირთვა ვერ მოხერხდა.');
    } finally {
      setActivityLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) {
      setActivityLogs([]);
      setActivityLogsError('');
      setActivityLogsLoading(false);
      return;
    }
    fetchActivityLogs();
  }, [adminLoggedIn]);

  const logActivity = async (actionText) => {
    const action = String(actionText || '').trim().slice(0, 500);
    if (!action) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/write_admin_activity_log`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({ p_action: action })
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      const saved = Array.isArray(rows) ? rows[0] : rows;
      if (!saved?.id) throw new Error('სერვერმა აქტივობის ჩანაწერი არ დააბრუნა.');
      setActivityLogs(prev => [{
        id: String(saved.id),
        action: saved.action,
        time: saved.created_at ? new Date(saved.created_at).toLocaleString('ka-GE') : ''
      }, ...(prev || [])].slice(0, 100));
      setActivityLogsError('');
    } catch (error) {
      setActivityLogsError('აქტივობის შენახვა ვერ მოხერხდა. ' + (error?.message || ''));
      console.error('GEOSTORE admin activity log write failed:', error);
    }
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email) return;
    const newStaffMember = {
      id: `st-${Date.now()}`,
      name: staffForm.name.trim(),
      email: staffForm.email.trim(),
      role: staffForm.role,
      permissions: { ...staffForm.permissions }
    };
    setStaffList(prev => [...prev, newStaffMember]);
    setStaffForm({ 
      name: '', 
      email: '', 
      role: 'მენეჯერი', 
      permissions: { products: true, orders: true, analytics: false, expenses: false, crm: false, settings: false } 
    });
    logActivity(`დაემატა ახალი თანამშრომელი: ${newStaffMember.name} (${newStaffMember.role})`);
    alert('✅ ჩანაწერი დაემატა მხოლოდ ამ მოწყობილობის ლოკალურ სიას. ანგარიშის შექმნა ან წვდომის მინიჭება არ მომხდარა.');
  };

  const handleAddExistingUserAsStaff = (e) => {
    e.preventDefault();
    if (!selectedUserEmailForStaff) return;
    
    const targetUser = (usersList || []).find(u => u.email === selectedUserEmailForStaff || u.id === selectedUserEmailForStaff);
    if (!targetUser) {
      alert('მომხმარებელი ვერ მოიძებნა');
      return;
    }

    const alreadyExists = staffList.some(s => s.email === targetUser.email);
    if (alreadyExists) {
      alert('⚠️ ეს მომხმარებელი უკვე არის თანამშრომლების სიაში!');
      return;
    }

    const newStaffMember = {
      id: `st-${Date.now()}`,
      name: targetUser.name || 'მომხმარებელი',
      email: targetUser.email || 'user@geostore.ge',
      role: 'მენეჯერი',
      permissions: { products: true, orders: true, analytics: true, expenses: false, crm: true, settings: false }
    };

    setStaffList(prev => [...prev, newStaffMember]);
    setSelectedUserEmailForStaff('');
    logActivity(`რეგისტრირებული მომხმარებელი (${newStaffMember.email}) დაწინაურდა მენეჯერად`);
    alert(`✅ მომხმარებელი (${newStaffMember.name}) დაემატა მხოლოდ ლოკალურ სიაში. მენეჯერის რეალური წვდომა არ მინიჭებულა.`);
  };

  const handleSaveEditedStaff = (staffId) => {
    setStaffList(prev => prev.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          role: editStaffRole,
          permissions: { ...editStaffPermissions }
        };
      }
      return s;
    }));
    setEditingStaffId(null);
    logActivity(`განახლდა თანამშრომლის (ID: ${staffId}) როლი და უფლებები`);
    alert('✅ თანამშრომლის უფლებები წარმატებით განახლდა!');
  };

  const handleDeleteStaff = (staffId, staffName) => {
    if (window.confirm(`ნამდვილად გსურთ თანამშრომლის "${staffName}" წაშლა?`)) {
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      logActivity(`წაიშალა თანამშრომელი: ${staffName}`);
    }
  };

  const calculatedSalesMetrics = useMemo(() => {
    const toNonNegative = value => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };
    const pCost = toNonNegative(calcForm.purchaseCost);
    const sPrice = toNonNegative(calcForm.sellingPrice);
    const discPct = Math.min(100, toNonNegative(calcForm.discountPercent));
    const ship = toNonNegative(calcForm.shippingCost);
    const pack = toNonNegative(calcForm.packagingCost);
    const proc = toNonNegative(calcForm.processingFee);
    const other = toNonNegative(calcForm.otherExpenses);
    const qty = Math.max(1, Math.floor(Number.isFinite(Number(calcForm.quantity)) ? Number(calcForm.quantity) : 1));

    const discountedPrice = sPrice * (1 - discPct / 100);
    const revenue = discountedPrice * qty;
    const grossProfit = (discountedPrice - pCost) * qty;
    const netProfit = grossProfit - ((ship + pack + proc + other) * qty);
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const markup = pCost > 0 ? ((discountedPrice - pCost) / pCost) * 100 : 0;

    return { discountedPrice, revenue, grossProfit, netProfit, profitMargin, markup };
  }, [calcForm]);

  const analyticsData = useMemo(() => {
    const isCancelled = order => [
      'გაუქმებული', 'cancelled', 'canceled', 'отменён', 'отменен'
    ].includes(String(order?.status || '').trim().toLowerCase());
    const isDelivered = order => [
      'დასრულებული', 'ჩაბარებულია', 'delivered', 'completed', 'доставлен', 'завершён', 'завершен'
    ].includes(String(order?.status || '').trim().toLowerCase());
    const parseDate = value => {
      if (!value) return null;
      const raw = String(value).trim();
      const localDate = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (localDate) return new Date(Number(localDate[3]), Number(localDate[2]) - 1, Number(localDate[1]));
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const inPeriod = value => {
      if (analyticsPeriod === 'all') return true;
      const date = parseDate(value);
      if (!date) return false;
      const days = Number(analyticsPeriod);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - days + 1);
      return date >= from && date <= today;
    };

    const periodOrders = (orders || []).filter(order => {
      const delivered = !isCancelled(order) && isDelivered(order);
      const reportingDate = delivered
        ? (order.status_changed_at || order.statusChangedAt || order.created_at || order.createdAt || order.date)
        : (order.created_at || order.createdAt || order.date);
      return inPeriod(reportingDate);
    });
    const deliveredOrders = periodOrders.filter(order => !isCancelled(order) && isDelivered(order));
    const pipelineOrders = periodOrders.filter(order => !isCancelled(order) && !isDelivered(order));
    // Legacy rows may predate status/stock audit columns. Keep them in sales
    // history, but expose the missing audit metadata instead of implying it exists.
    const deliveredOrdersMissingStatusDate = deliveredOrders.filter(order =>
      !(order.status_changed_at || order.statusChangedAt)
    ).length;
    const deliveredOrdersWithoutStockTracking = deliveredOrders.filter(order =>
      !(order.stock_deducted_at || order.stockDeductedAt)
    ).length;
    const periodExpenses = (expenses || []).filter(expense => inPeriod(expense.date || expense.created_at || expense.createdAt));
    const productById = new Map((products || []).map(product => [String(product.id), product]));

    let totalSalesRevenue = 0;
    let totalDeliveryRevenue = 0;
    let totalProductRevenue = 0;
    let totalCogs = 0;
    let estimatedCogsItems = 0;
    let unknownCogsItems = 0;
    const incomeTotals = new Map();
    const productProfitTotals = new Map();
    const vendorProfitTotals = new Map();

    deliveredOrders.forEach(order => {
      const orderTotal = normalizeOrderTotal(order.totalGEL ?? order.total_gel);
      totalSalesRevenue += orderTotal;
      const rawItems = Array.isArray(order.items) ? order.items : [];
      const invalidItemCount = rawItems.filter(item => !item || typeof item !== 'object' || Array.isArray(item)).length;
      const items = rawItems.filter(item => item && typeof item === 'object' && !Array.isArray(item));
      if (invalidItemCount > 0) unknownCogsItems += invalidItemCount;
      const lineGross = items.reduce((sum, item) => sum + (Math.max(0, Number(item.priceGEL ?? item.price) || 0) * Math.max(1, Number(item.quantity) || 1)), 0);
      const deliveryMatch = String(order.address || '').match(/მიწოდება:\s*([\d.,]+)\s*₾/i);
      const deliveryCharge = deliveryMatch ? Math.max(0, Number(deliveryMatch[1].replace(',', '.')) || 0) : 0;
      const productNetRevenue = Math.max(0, orderTotal - deliveryCharge);
      totalDeliveryRevenue += Math.min(orderTotal, deliveryCharge);
      totalProductRevenue += productNetRevenue;

      if (!items.length) {
        const label = 'ძველი შეკვეთა — პროდუქტის დეტალები არ არის';
        incomeTotals.set(label, (incomeTotals.get(label) || 0) + orderTotal);
        unknownCogsItems += 1;
        return;
      }

      items.forEach(item => {
        const productId = item.id ?? item.product_id;
        const product = productId === null || productId === undefined ? undefined : productById.get(String(productId));
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const itemGross = Math.max(0, Number(item.priceGEL ?? item.price) || 0) * quantity;
        const allocatedRevenue = lineGross > 0 ? productNetRevenue * (itemGross / lineGross) : 0;
        const vendor = item.vendor || product?.vendor || 'ვენდორი უცნობია';
        const category = item.category || product?.category || 'კატეგორია უცნობია';
        const label = `${vendor} · ${category}`;
        incomeTotals.set(label, (incomeTotals.get(label) || 0) + allocatedRevenue);

        const snapshotCost = item.purchase_cost ?? item.purchaseCost;
        const currentCost = product?.purchaseCost ?? product?.purchase_cost;
        const hasSnapshotCost = snapshotCost !== null && snapshotCost !== undefined && snapshotCost !== '' && Number.isFinite(Number(snapshotCost)) && Number(snapshotCost) >= 0;
        const hasCurrentCost = currentCost !== null && currentCost !== undefined && currentCost !== '' && Number.isFinite(Number(currentCost)) && Number(currentCost) >= 0;
        let itemCost = null;
        const isEstimatedCost = !hasSnapshotCost && hasCurrentCost;
        if (hasSnapshotCost) itemCost = Number(snapshotCost);
        else if (isEstimatedCost) {
          itemCost = Number(currentCost);
          estimatedCogsItems += quantity;
        } else unknownCogsItems += quantity;
        if (itemCost !== null) totalCogs += itemCost * quantity;

        const productKey = String(item.id || item.product_id || item.name || 'unknown-product');
        const productLabel = item.name || product?.name || `პროდუქტი ${productKey}`;
        const productEntry = productProfitTotals.get(productKey) || {
          key: productKey, name: productLabel, vendor, category,
          quantity: 0, revenue: 0, cogs: 0, unknownCostItems: 0, estimatedCostItems: 0
        };
        productEntry.quantity += quantity;
        productEntry.revenue += allocatedRevenue;
        if (itemCost === null) productEntry.unknownCostItems += quantity;
        else productEntry.cogs += itemCost * quantity;
        if (isEstimatedCost) productEntry.estimatedCostItems += quantity;
        productProfitTotals.set(productKey, productEntry);

        const vendorEntry = vendorProfitTotals.get(vendor) || {
          name: vendor, quantity: 0, revenue: 0, cogs: 0, unknownCostItems: 0, estimatedCostItems: 0, productCount: new Set()
        };
        vendorEntry.quantity += quantity;
        vendorEntry.revenue += allocatedRevenue;
        vendorEntry.productCount.add(productKey);
        if (itemCost === null) vendorEntry.unknownCostItems += quantity;
        else vendorEntry.cogs += itemCost * quantity;
        if (isEstimatedCost) vendorEntry.estimatedCostItems += quantity;
        vendorProfitTotals.set(vendor, vendorEntry);
      });
      if (deliveryCharge > 0) incomeTotals.set('მიწოდების საფასური', (incomeTotals.get('მიწოდების საფასური') || 0) + Math.min(orderTotal, deliveryCharge));
    });

    const trendBuckets = new Map();
    const useDailyTrend = analyticsPeriod === '30' || analyticsPeriod === '90';
    deliveredOrders.forEach(order => {
      const date = parseDate(order.status_changed_at || order.statusChangedAt || order.created_at || order.createdAt || order.date);
      if (!date) return;
      const key = useDailyTrend
        ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
        : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      const label = useDailyTrend
        ? date.toLocaleDateString('ka-GE', { day: '2-digit', month: 'short' })
        : date.toLocaleDateString('ka-GE', { month: 'short', year: '2-digit' });
      const current = trendBuckets.get(key) || { key, label, revenue: 0, orders: 0 };
      current.revenue += normalizeOrderTotal(order.totalGEL ?? order.total_gel);
      current.orders += 1;
      trendBuckets.set(key, current);
    });
    const salesTrend = Array.from(trendBuckets.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(useDailyTrend ? -90 : -24);
    const bestSellingProducts = Array.from(productProfitTotals.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5);
    const lowStockProducts = (products || []).filter(product =>
      product.stock !== null && product.stock !== undefined && String(product.stock).trim() !== ''
    ).map(product => ({
      ...product,
      _stockValue: Number(product.stock)
    })).filter(product => Number.isFinite(product._stockValue) && product._stockValue >= 0 && product._stockValue <= 5)
      .sort((a, b) => a._stockValue - b._stockValue);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    // Gross profit is product revenue less product cost. Delivery fees are
    // tracked separately and added to net operating result, not product margin.
    const grossProfit = unknownCogsItems === 0 && estimatedCogsItems === 0 ? totalProductRevenue - totalCogs : null;
    const netProfit = grossProfit === null ? null : grossProfit + totalDeliveryRevenue - totalExpenses;
    const expenseTotals = new Map();
    periodExpenses.forEach(expense => {
      const label = expense.category || 'კატეგორია მითითებული არ არის';
      const current = expenseTotals.get(label) || { label, amount: 0, count: 0 };
      current.amount += Number(expense.amount) || 0;
      current.count += 1;
      expenseTotals.set(label, current);
    });

    return {
      periodOrders, deliveredOrders, pipelineOrders, periodExpenses, salesTrend, bestSellingProducts, lowStockProducts,
      deliveredOrdersMissingStatusDate, deliveredOrdersWithoutStockTracking,
      totalSalesRevenue, totalDeliveryRevenue, totalProductRevenue,
      totalExpenses, totalCogs, grossProfit, netProfit,
      estimatedCogsItems, unknownCogsItems,
      averageOrderValue: deliveredOrders.length ? totalSalesRevenue / deliveredOrders.length : 0,
      incomeSources: Array.from(incomeTotals, ([label, amount]) => ({ label, amount })).sort((x, y) => y.amount - x.amount),
      productProfitability: Array.from(productProfitTotals.values()).map(item => ({
        ...item,
        grossProfit: item.unknownCostItems > 0 || item.estimatedCostItems > 0 ? null : item.revenue - item.cogs,
        margin: item.unknownCostItems > 0 || item.estimatedCostItems > 0 || item.revenue <= 0 ? null : ((item.revenue - item.cogs) / item.revenue) * 100
      })).sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)),
      vendorProfitability: Array.from(vendorProfitTotals.values()).map(item => ({
        ...item,
        productCount: item.productCount.size,
        grossProfit: item.unknownCostItems > 0 || item.estimatedCostItems > 0 ? null : item.revenue - item.cogs,
        margin: item.unknownCostItems > 0 || item.estimatedCostItems > 0 || item.revenue <= 0 ? null : ((item.revenue - item.cogs) / item.revenue) * 100
      })).sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)),
      expenseBreakdown: Array.from(expenseTotals.values()).sort((x, y) => y.amount - x.amount)
    };
  }, [orders, expenses, products, analyticsPeriod]);

  const financialOverview = analyticsData;
  const incomeSources = analyticsData.incomeSources;
  const expenseBreakdown = analyticsData.expenseBreakdown;

  const exportCsv = (filename, headers, rows) => {
    const escapeCell = value => {
      const raw = value === null || value === undefined ? '' : String(value);
      const safe = /^[=+@\\-]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(';')).join('\\r\\n');
    const blob = new Blob(['\\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportAnalytics = () => {
    const periodLabel = analyticsPeriod === 'all' ? 'all-period' : 'last-' + analyticsPeriod + '-days';
    exportCsv(`geostore-financial-summary-${periodLabel}.csv`,
      ['მაჩვენებელი', 'თანხა (GEL)'],
      [
        ['ჩაბარებული შეკვეთები', financialOverview.deliveredOrders.length],
        ['ბრუნვა', financialOverview.totalSalesRevenue.toFixed(2)],
        ['პროდუქტის შემოსავალი', financialOverview.totalProductRevenue.toFixed(2)],
        ['მიწოდების შემოსავალი', financialOverview.totalDeliveryRevenue.toFixed(2)],
        ['თვითღირებულება', financialOverview.unknownCogsItems ? 'უცნობია/არასრულია' : financialOverview.estimatedCogsItems ? 'შეფასებულია' : financialOverview.totalCogs.toFixed(2)],
        ['მიმდინარე პროდუქტის ფასით შეფასებული ერთეულები', financialOverview.estimatedCogsItems],
        ['უცნობი თვითღირებულების ერთეულები', financialOverview.unknownCogsItems],
        ['მთლიანი მოგება', financialOverview.grossProfit === null ? 'ვერ განისაზღვრება — ისტორიული თვითღირებულება არასრულია' : financialOverview.grossProfit.toFixed(2)],
        ['ოპერაციული ხარჯები', financialOverview.totalExpenses.toFixed(2)],
        ['წმინდა მოგება', financialOverview.netProfit === null ? 'ვერ განისაზღვრება — ისტორიული თვითღირებულება არასრულია' : financialOverview.netProfit.toFixed(2)]
      ]);
    exportCsv(`geostore-product-profitability-${periodLabel}.csv`,
      ['პროდუქტი', 'მომწოდებელი', 'კატეგორია', 'რაოდენობა', 'შემოსავალი (GEL)', 'თვითღირებულება (GEL)', 'მოგება (GEL)', 'მარჟა (%)', 'უცნობი თვითღირებულების ერთეულები', 'შეფასებული თვითღირებულების ერთეულები'],
      financialOverview.productProfitability.map(item => [item.name, item.vendor, item.category, item.quantity, item.revenue.toFixed(2), item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2), item.grossProfit === null ? 'ვერ განისაზღვრება' : item.grossProfit.toFixed(2), item.margin === null ? 'ვერ განისაზღვრება' : item.margin.toFixed(2), item.unknownCostItems, item.estimatedCostItems]));
    exportCsv(`geostore-vendor-profitability-${periodLabel}.csv`,
      ['მომწოდებელი', 'პროდუქტების რაოდენობა', 'გაყიდული ერთეულები', 'შემოსავალი (GEL)', 'თვითღირებულება (GEL)', 'მოგება (GEL)', 'მარჟა (%)', 'უცნობი თვითღირებულების ერთეულები', 'შეფასებული თვითღირებულების ერთეულები'],
      financialOverview.vendorProfitability.map(item => [item.name, item.productCount, item.quantity, item.revenue.toFixed(2), item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2), item.grossProfit === null ? 'ვერ განისაზღვრება' : item.grossProfit.toFixed(2), item.margin === null ? 'ვერ განისაზღვრება' : item.margin.toFixed(2), item.unknownCostItems, item.estimatedCostItems]));
    exportCsv(`geostore-expenses-${periodLabel}.csv`,
      ['თარიღი', 'კატეგორია', 'აღწერა', 'თანხა (GEL)'],
      financialOverview.periodExpenses.map(item => [item.date || item.created_at || '', item.category || '', item.description || '', Number(item.amount || 0).toFixed(2)]));
  };

  const handleAiAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || isAiThinking) return;
    const userQuestion = aiQuery.trim();
    setAiQuery('');
    setAiChatLogs(prev => [...prev, { role: 'user', text: userQuestion }]);
    setIsAiThinking(true);

    setTimeout(() => {
      let answer = `🤖 არჩეულ პერიოდში ჩაბარებულია ${financialOverview.deliveredOrders.length} შეკვეთა. რეალიზებული ბრუნვა: ${financialOverview.totalSalesRevenue.toFixed(2)} ₾. წმინდა მოგება: ${financialOverview.netProfit === null ? 'ვერ განისაზღვრება — ისტორიული თვითღირებულება აკლია ან შეფასებულია' : financialOverview.netProfit.toFixed(2) + ' ₾'}.`;
      const qLower = userQuestion.toLowerCase();
      if (qLower.includes('შემოსავალი')) answer = `📊 ჩაბარებული შეკვეთების რეალიზებული შემოსავალია ${financialOverview.totalSalesRevenue.toFixed(2)} ₾.`;
      else if (qLower.includes('მოგება')) answer = `💰 წმინდა მოგება არის ${financialOverview.netProfit === null ? 'ვერ განისაზღვრება — ისტორიული თვითღირებულება აკლია ან შეფასებულია' : financialOverview.netProfit.toFixed(2) + ' ₾'}${financialOverview.estimatedCogsItems > 0 ? '. შენიშვნა: ნაწილის თვითღირებულება მიმდინარე პროდუქტის ფასითაა შეფასებული და არა შეკვეთის ისტორიული ჩანაწერით' : ''}.`;
      else if (qLower.includes('ხარჯი')) answer = `📉 არჩეულ პერიოდში აღრიცხული ხარჯებია ${financialOverview.totalExpenses.toFixed(2)} ₾.`;

      setAiChatLogs(prev => [...prev, { role: 'assistant', text: answer }]);
      setIsAiThinking(false);
    }, 800);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amountText = String(expenseForm.amount ?? '').trim();
    const description = String(expenseForm.description ?? '').trim();
    const category = String(expenseForm.category ?? '').trim();
    const amount = Number(amountText);
    const dateParts = String(expenseForm.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsedExpenseDate = dateParts
      ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
      : null;
    const validDate = Boolean(dateParts && parsedExpenseDate
      && parsedExpenseDate.getFullYear() === Number(dateParts[1])
      && parsedExpenseDate.getMonth() === Number(dateParts[2]) - 1
      && parsedExpenseDate.getDate() === Number(dateParts[3]));

    if (!description || !category) {
      alert('ხარჯის კატეგორია და აღწერა სავალდებულოა.');
      return;
    }
    if (category.length > 80 || description.length > 300) {
      alert('კატეგორია მაქსიმუმ 80, ხოლო აღწერა მაქსიმუმ 300 სიმბოლო უნდა იყოს.');
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      alert('ხარჯის თანხა უნდა იყოს 0-ზე მეტი, მაქსიმუმ 1,000,000,000 და არაუმეტეს 2 ათწილადი ნიშნით.');
      return;
    }
    if (!validDate) {
      alert('ხარჯის თარიღი არასწორია.');
      return;
    }

    const newExp = {
      id: `exp-${Date.now()}`,
      category,
      amount,
      date: expenseForm.date,
      description
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify(newExp)
      });

      if (res.ok) {
        setExpenses(prev => [newExp, ...prev]);
        setExpenseForm({ category: 'რეკლამა & მარკეტინგი', amount: '', date: getLocalDateInputValue(), description: '' });
        logActivity(`დაემატა ახალი ხარჯი: ${newExp.description} (${newExp.amount} ₾)`);
        alert('✅ ხარჯი წარმატებით შეინახა ბაზაში!');
      } else {
        alert('შეცდომა ბაზაში შენახვისას');
      }
    } catch {
      alert('ქსელის შეცდომა სერვერთან მიერთებისას');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ხარჯის წაშლა ბაზიდან?')) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses?id=eq.${id}`, {
          method: 'DELETE',
          headers: await getSupabaseHeaders()
        });

        if (res.ok) {
          setExpenses(prev => prev.filter(e => e.id !== id));
          logActivity(`წაიშალა ხარჯი (ID: ${id})`);
          alert('✅ ხარჯი წარმატებით წაიშალა!');
        } else {
          alert('შეცდომა წაშლისას');
        }
      } catch {
        alert('ქსელის შეცდომა');
      }
    }
  };

  if (!adminLoggedIn) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900/80 border border-emerald-500/35 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-2xl backdrop-blur-3xl text-center my-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-lg font-black text-white tracking-tight">ადმინისტრატორის პანელი</h2>
        <p className="text-xs text-slate-400">
          პანელზე წვდომისთვის შედით GEOSTORE-ში იმ ანგარიშით, რომელსაც Supabase-ში მინიჭებული აქვს ადმინისტრატორის როლი.
        </p>
        <p className="text-xs text-amber-300">
          PIN-ით ან ბრაუზერში შენახული პაროლით შესვლა გამორთულია.
        </p>
      </div>
    );
  }

  const persistCategoryList = (updatedCategories) => {
    if (typeof setCategoriesList === 'function') setCategoriesList(updatedCategories);
    try {
      localStorage.setItem('geostore_cats', JSON.stringify(updatedCategories));
    } catch {
      alert('კატეგორიები განახლდა მიმდინარე სესიაში, მაგრამ მოწყობილობის დროებით მეხსიერებაში შენახვა ვერ მოხერხდა. შეინახეთ მონახაზი Supabase-ში.');
    }
  };

  const handleCategoryFileChange = async (e, isEditing = false) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      await validateImageFile(file, MAX_PRODUCT_IMAGE_BYTES);
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result || !isValidImageDataUrl(result, MAX_PRODUCT_IMAGE_BYTES)) {
          alert('ფოტოს შიგთავსის შემოწმება ვერ მოხერხდა. აირჩიეთ სწორი JPG, PNG, WEBP ან GIF.');
          input.value = '';
          return;
        }
        if (isEditing) setEditCatImage(result);
        else setNewCatImage(result);
        input.value = '';
      };
      reader.onerror = () => {
        alert('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
        input.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error.message || 'ფოტოს ატვირთვა ვერ მოხერხდა.');
      input.value = '';
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const cleanName = String(newCatName || '').trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      alert('კატეგორიის სახელი უნდა შეიცავდეს 2-დან 60 სიმბოლომდე.');
      return;
    }
    if (safeCategories.some(category => category.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      alert('ასეთი სახელის კატეგორია უკვე არსებობს. კატეგორიის სახელები უნიკალური უნდა იყოს.');
      return;
    }
    const parent = selectedParentId ? safeCategories.find(category => category.id === selectedParentId && !category.parentId) : null;
    if (selectedParentId && !parent) {
      alert('არჩეული მთავარი კატეგორია აღარ არსებობს. განაახლეთ არჩევანი.');
      return;
    }
    const catId = typeof globalThis.crypto?.randomUUID === 'function'
      ? `cat-${globalThis.crypto.randomUUID()}`
      : `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const cleanImage = newCatImage.trim() || '';
    const newCatObj = {
      id: catId,
      name: cleanName,
      icon: newCatIcon,
      parentId: parent?.id || null,
      image: cleanImage,
      img: cleanImage
    };

    persistCategoryList([...safeCategories, newCatObj]);
    setNewCatName('');
    setNewCatImage('');
    setSelectedParentId('');
    logActivity(`დაემატა ${parent ? 'სუბკატეგორია' : 'მთავარი კატეგორია'}: ${cleanName}`);
    alert('კატეგორია დაემატა. ცვლილების საიტზე შესანახად გამოიყენეთ „მონახაზის შენახვა“, ხოლო ვიზიტორებისთვის გამოსაჩენად — „გამოქვეყნება“.');
  };

  const handleSaveEditedCategory = (catId) => {
    const existing = safeCategories.find(category => category.id === catId);
    const cleanName = String(editCatName || '').trim();
    if (!existing) {
      alert('კატეგორია ვეღარ მოიძებნა. განაახლეთ გვერდი და სცადეთ თავიდან.');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 60) {
      alert('კატეგორიის სახელი უნდა შეიცავდეს 2-დან 60 სიმბოლომდე.');
      return;
    }
    if (safeCategories.some(category => category.id !== catId && category.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      alert('ასეთი სახელის კატეგორია უკვე არსებობს.');
      return;
    }
    const oldName = String(existing.name || '').trim();
    if (cleanName !== oldName) {
      const assignedCount = (products || []).filter(product => String(product.category || '').trim() === oldName).length;
      if (assignedCount > 0) {
        alert(`კატეგორიაზე „${oldName}“ მიბმულია ${assignedCount} პროდუქტი. ჯერ გადაიტანეთ ეს პროდუქტები სხვა კატეგორიაში, შემდეგ შეცვალეთ სახელი, რათა პროდუქტები კატალოგიდან არ გაქრეს.`);
        return;
      }
    }

    const cleanImg = editCatImage.trim();
    const updatedCategories = safeCategories.map(category => category.id === catId
      ? { ...category, name: cleanName, icon: editCatIcon, image: cleanImg, img: cleanImg }
      : category
    );
    persistCategoryList(updatedCategories);
    setEditingCatId(null);
    setEditCatName('');
    setEditCatImage('');
    logActivity(`განახლდა კატეგორია (ID: ${catId})`);
    alert('კატეგორია განახლდა. შეინახეთ მონახაზი Supabase-ში, შემდეგ კი გამოაქვეყნეთ ცვლილება.');
  };

  const handleDeleteCategory = (targetId, targetName) => {
    const target = safeCategories.find(category => category.id === targetId);
    if (!target) return;
    const idsToDelete = new Set([targetId]);
    if (!target.parentId) {
      safeCategories.filter(category => category.parentId === targetId).forEach(category => idsToDelete.add(category.id));
    }
    const namesToDelete = new Set(safeCategories.filter(category => idsToDelete.has(category.id)).map(category => category.name.trim()));
    const assignedProducts = (products || []).filter(product => namesToDelete.has(String(product.category || '').trim()));
    if (assignedProducts.length > 0) {
      alert(`კატეგორიაზე „${targetName}“ ან მის ქვეკატეგორიაზე მიბმულია ${assignedProducts.length} პროდუქტი. წაშლა დაბლოკილია, რათა პროდუქტები კატალოგიდან არ დაიკარგოს. ჯერ გადაიტანეთ პროდუქტები სხვა კატეგორიაში.`);
      return;
    }
    const childCount = idsToDelete.size - 1;
    const confirmation = childCount > 0
      ? `ნამდვილად გსურთ „${targetName}“-ისა და მისი ${childCount} ქვეკატეგორიის წაშლა? ეს ქმედება ვერ წაშლის პროდუქტებს.`
      : `ნამდვილად გსურთ კატეგორიის „${targetName}“ წაშლა?`;
    if (!window.confirm(confirmation)) return;

    persistCategoryList(safeCategories.filter(category => !idsToDelete.has(category.id)));
    logActivity(`წაიშალა კატეგორია: ${targetName}`);
  };

  const moveCategory = (categoryId, direction) => {
    const current = safeCategories.findIndex(category => category.id === categoryId);
    if (current < 0) return;
    const parentId = safeCategories[current].parentId || null;
    const siblingIndexes = safeCategories
      .map((category, index) => ({ category, index }))
      .filter(item => (item.category.parentId || null) === parentId)
      .map(item => item.index);
    const siblingPosition = siblingIndexes.indexOf(current);
    const targetPosition = siblingPosition + direction;
    if (targetPosition < 0 || targetPosition >= siblingIndexes.length) return;

    const reordered = [...safeCategories];
    const targetIndex = siblingIndexes[targetPosition];
    [reordered[current], reordered[targetIndex]] = [reordered[targetIndex], reordered[current]];
    persistCategoryList(reordered);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა ბაზიდან?')) return;
    const productToDelete = (products || []).find(product => String(product.id) === String(id));
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_delete_product', {
        method: 'POST', headers: await getSupabaseHeaders(),
        body: JSON.stringify({ p_product_id: String(id) })
      });
      if (!res.ok) throw new Error(await res.text());
      if (await res.json() !== true) throw new Error('პროდუქტი ვერ წაიშალა ან აღარ არსებობს.');
      if (typeof setProducts === 'function') setProducts(prev => (prev || []).filter(p => String(p.id) !== String(id)));
      const productImages = [
        ...(Array.isArray(productToDelete?.gallery) ? productToDelete.gallery : []),
        productToDelete?.image
      ].filter(Boolean);
      const imagesCleaned = await deleteProductImages(productImages, id);
      logActivity('წაიშალა პროდუქტი ბაზიდან (ID: ' + id + ')');
      alert(imagesCleaned
        ? '✅ პროდუქტი და მისი ატვირთული ფოტოები წარმატებით წაიშალა!'
        : 'პროდუქტი წაიშალა, მაგრამ ზოგი ფოტო Storage-დან ვერ წაიშალა. პროდუქტი აღარ ჩანს მაღაზიაში; დარჩენილი ფოტოების გასუფთავება ცალკე იქნება საჭირო.');
    } catch (error) { alert('წაშლა ვერ შესრულდა: ' + (error.message || 'ქსელის შეცდომა')); }
  };

  const handleQuickUpdateProduct = async (id, field, value) => {
    const current = (products || []).find(p => String(p.id) === String(id));
    if (!current) return alert('პროდუქტი ვერ მოიძებნა. განაახლეთ გვერდი და სცადეთ თავიდან.');
    const columnByField = { priceGEL: 'price_gel', purchaseCost: 'purchase_cost', stock: 'stock' };
    const column = columnByField[field];
    if (!column) return;
    const val = Number(value);
    if (!Number.isFinite(val) || val < 0 || val > 1000000000) return alert('შეიყვანეთ სწორი რიცხვი 0-დან 1,000,000,000-მდე.');
    if ((field === 'priceGEL' || field === 'purchaseCost') && !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) return alert('ფასი და თვითღირებულება მაქსიმუმ 2 ათწილადი ნიშნით უნდა შეიყვანოთ.');
    if (field === 'stock' && (!Number.isSafeInteger(val) || val > 1000000)) return alert('მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.');
    const currentOldPrice = Number(current.oldPriceGEL ?? current.old_price_gel ?? 0);
    if (field === 'priceGEL' && currentOldPrice > 0 && currentOldPrice <= val) return alert('ჯერ გაასუფთავეთ ან გაზარდეთ ძველი ფასი, შემდეგ შეცვალეთ მიმდინარე ფასი.');
    const currentValue = current[column] ?? current[field];
    const compareFilter = currentValue == null ? column + '=is.null' : column + '=eq.' + encodeURIComponent(String(currentValue));
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(String(id)) + '&' + compareFilter, {
        method: 'PATCH', headers: await getSupabaseHeaders(), body: JSON.stringify({ [column]: val })
      });
      if (!response.ok) throw new Error(await response.text());
      const savedRows = await response.json();
      if (!Array.isArray(savedRows) || savedRows.length !== 1) {
        throw new Error('მონაცემი პარალელურად შეიცვალა. განაახლეთ პროდუქტის სია და სცადეთ ხელახლა.');
      }
      const savedValue = Number(savedRows[0][column]);
      if (!Number.isFinite(savedValue) || savedValue < 0 || (field === 'stock' && !Number.isInteger(savedValue))) {
        throw new Error('სერვერმა არასწორი მნიშვნელობა დააბრუნა. განაახლეთ პროდუქტის სია.');
      }
      if (typeof setProducts === 'function') {
        setProducts(prev => (prev || []).map(p => {
          if (String(p.id) !== String(id)) return p;
          if (field === 'priceGEL') return { ...p, priceGEL: savedValue, price_gel: savedValue };
          if (field === 'purchaseCost') return { ...p, purchaseCost: savedValue, purchase_cost: savedValue };
          return { ...p, stock: savedValue };
        }));
      }
      if (field === 'stock') setStockDrafts(prev => { const next = { ...prev }; delete next[String(id)]; return next; });
      setQuickProductDrafts(prev => { const next = { ...prev }; delete next[field + ':' + String(id)]; return next; });
    } catch (error) {
      alert('პროდუქტის განახლება ვერ შესრულდა: ' + (error.message || 'ქსელის შეცდომა'));
    }
  };
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const currentCount = (selectedImages || []).length;
    if (currentCount + files.length > MAX_PRODUCT_GALLERY_IMAGES) {
      alert(`პროდუქტის გალერეაში მაქსიმუმ ${MAX_PRODUCT_GALLERY_IMAGES} ფოტოს დამატებაა შესაძლებელი.`);
      return;
    }

    try {
      await Promise.all(files.map(file => validateImageFile(file, MAX_PRODUCT_IMAGE_BYTES)));
      const promises = files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ფოტოს წაკითხვა ვერ მოხერხდა.'));
        reader.readAsDataURL(file);
      }));
      const base64Images = await Promise.all(promises);
      setSelectedImages(prev => [...(prev || []), ...base64Images]);
    } catch (error) {
      alert(error.message || 'ფოტოს დამუშავება ვერ მოხერხდა.');
    }
  };

  const handleEditProduct = (p) => {
    setEditingProductId(String(p.id));
    setProductForm({
      ...productFormInitial, name: p.name || '', category: p.category || productFormInitial.category,
      priceGEL: String(p.priceGEL ?? p.price_gel ?? ''), oldPriceGEL: String(p.oldPriceGEL ?? p.old_price_gel ?? ''),
      purchaseCost: String(p.purchaseCost ?? p.purchase_cost ?? ''), stock: String(p.stock ?? 0),
      vendor: p.vendor || '', description: p.description || '', tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      material: p.material || '', durability: p.durability || '', brand: p.brand || '',
      model: p.model || '', cpu: p.cpu || '', ram: p.ram || '', storage: p.storage || '',
      gpu: p.gpu || '', screenSize: p.screenSize || p.screen_size || '', os: p.os || '',
      availableSizes: p.availableSizes || p.available_sizes || [],
      availableColors: p.availableColors || p.available_colors || [],
      isFeatured: Boolean(p.isFeatured ?? p.is_featured)
    });
    setSelectedImages(p.gallery?.length ? p.gallery : (p.image ? [p.image] : []));
    setProductVariants(Array.isArray(p.variants) ? p.variants : []);
    document.getElementById('geostore-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetProductEditor = () => {
    setEditingProductId(null);
    setProductForm(productFormInitial);
    setSelectedImages([]);
    setProductVariants([]);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const productName = String(productForm.name || '').trim();
    if (!productName || productForm.priceGEL === '') return alert('შეავსეთ პროდუქტის სახელი და ფასი.');
    if (productName.length > 160) return alert('პროდუქტის სახელი მაქსიმუმ 160 სიმბოლოს უნდა შეიცავდეს.');
    if (!String(productForm.category || '').trim() || String(productForm.category).trim().length > 80) return alert('აირჩიეთ სწორი კატეგორია (მაქსიმუმ 80 სიმბოლო).');
    const priceValue = Number(productForm.priceGEL);
    if (!Number.isFinite(priceValue) || String(productForm.priceGEL).trim() === '' || priceValue < 0 || priceValue > 1000000000 || !/^\d+(?:\.\d{1,2})?$/.test(String(productForm.priceGEL).trim())) return alert('ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    const purchaseCost = productForm.purchaseCost === '' ? 0 : Number(productForm.purchaseCost);
    if (!Number.isFinite(purchaseCost) || purchaseCost < 0 || purchaseCost > 1000000000 || (productForm.purchaseCost !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(productForm.purchaseCost).trim()))) return alert('თვითღირებულება უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    if (String(productForm.description || '').length > 5000) return alert('აღწერა მაქსიმუმ 5000 სიმბოლოს უნდა შეიცავდეს.');
    if (String(productForm.tags || '').length > 1000) return alert('ტეგების ველი ზედმეტად გრძელია.');
    const normalizeProductOptions = (value, label) => {
      if (!Array.isArray(value)) {
        alert(`${label}: მონაცემები არასწორ ფორმატშია.`);
        return null;
      }
      const options = value.map(item => String(item ?? '').trim()).filter(Boolean);
      if (options.length > 30 || options.some(item => item.length > 40)) {
        alert(`${label}: დასაშვებია მაქსიმუმ 30 ჩანაწერი, თითოეული არაუმეტეს 40 სიმბოლოსი.`);
        return null;
      }
      const normalized = options.map(item => item.toLocaleLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        alert(`${label}: ერთი და იგივე მნიშვნელობა ორჯერ არ უნდა იყოს მითითებული.`);
        return null;
      }
      return options;
    };
    const availableSizes = normalizeProductOptions(productForm.availableSizes, 'ზომები');
    if (availableSizes === null) return;
    const availableColors = normalizeProductOptions(productForm.availableColors, 'ფერები');
    if (availableColors === null) return;
    const originalPrice = productForm.oldPriceGEL === '' ? 0 : Number(productForm.oldPriceGEL);
    if (!Number.isFinite(originalPrice) || originalPrice < 0 || originalPrice > 1000000000 || (productForm.oldPriceGEL !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(productForm.oldPriceGEL).trim()))) return alert('ძველი ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    if (originalPrice > 0 && originalPrice <= priceValue) return alert('ძველი ფასი მიმდინარე ფასზე მეტი უნდა იყოს. თუ ფასდაკლება არ მოქმედებს, ძველი ფასი გაასუფთავეთ.');
    if (productForm.stock !== '' && (!/^\d+$/.test(String(productForm.stock).trim()) || !Number.isSafeInteger(Number(productForm.stock)) || Number(productForm.stock) > 1000000)) return alert('მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.');

    const tagsArray = productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (tagsArray.length > 30 || tagsArray.some(tag => tag.length > 40) ||
        new Set(tagsArray.map(tag => tag.toLocaleLowerCase())).size !== tagsArray.length) {
      return alert('ტეგები უნდა იყოს უნიკალური: მაქსიმუმ 30 ტეგი, თითოეული არაუმეტეს 40 სიმბოლოსი.');
    }
    const variantsValidation = validateProductVariants(productVariants);
    if (!variantsValidation.valid) {
      const variantErrors = {
        count: 'ერთ პროდუქტზე მაქსიმუმ 50 ვარიანტია დაშვებული.',
        shape: 'პროდუქტის ვარიანტის მონაცემები არასწორია.',
        identity: 'თითოეულ ვარიანტს უნდა ჰქონდეს უნიკალური ID და სახელი (მაქსიმუმ 80 სიმბოლო).',
        price: 'ვარიანტის ფასი არასწორია.',
        stock: 'ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.'
      };
      return alert(variantErrors[variantsValidation.reason] || 'პროდუქტის ვარიანტების შემოწმება ვერ მოხერხდა.');
    }
    const prodId = editingProductId || `prod-${Date.now()}`;
    let galleryImages = [];
    let newlyUploadedImages = [];
    let newProdPayload;

    try {
      const sourceImages = selectedImages.length > 0 ? selectedImages : [];
      if (sourceImages.length === 0 && !editingProductId) {
        throw new Error('ახალი პროდუქტის შესანახად ატვირთეთ მინიმუმ ერთი ფოტო.');
      }
      if (sourceImages.length > MAX_PRODUCT_GALLERY_IMAGES) {
        throw new Error(`პროდუქტის გალერეაში მაქსიმუმ ${MAX_PRODUCT_GALLERY_IMAGES} ფოტოა დაშვებული.`);
      }
      newlyUploadedImages = [];
      for (let index = 0; index < sourceImages.length; index += 1) {
        const sourceImage = sourceImages[index];
        const uploadedImage = await uploadProductImage(sourceImage, prodId, index);
        galleryImages.push(uploadedImage);
        if (String(sourceImage || '').startsWith('data:')) newlyUploadedImages.push(uploadedImage);
      }
      const mainImage = galleryImages[0] || null;
      newProdPayload = {
      id: prodId,
      sku: editingProductId ? ((products || []).find(p => String(p.id) === String(editingProductId))?.sku || null) : `GEO-${Math.floor(1000 + Math.random() * 9000)}`,
      name: productName,
      category: String(productForm.category).trim(),
      vendor: productForm.vendor || 'GEOSTORE ოფიციალური',
      price_gel: priceValue,
      old_price_gel: originalPrice > 0 ? originalPrice : null,
      purchase_cost: purchaseCost,
      stock: productForm.stock === '' ? 1 : Number(productForm.stock),
      image: mainImage,
      gallery: galleryImages,
      tags: tagsArray,
      description: productForm.description || '',
      available_sizes: availableSizes,
      available_colors: availableColors,
      variants: productVariants,
      material: productForm.material || '',
      durability: productForm.durability || '',
      brand: productForm.brand || 'GEOSTORE',
      model: productForm.model || '',
      cpu: productForm.cpu || '',
      ram: productForm.ram || '',
      storage: productForm.storage || '',
      gpu: productForm.gpu || '',
      screen_size: productForm.screenSize || '',
      os: productForm.os || '',
      is_featured: productForm.isFeatured || false
    };

      let savedProductRow = null;
      if (editingProductId) {
        // Do not overwrite checkout stock deductions with the editor's stale snapshot.
        const updatePayload = { ...newProdPayload };
        delete updatePayload.id;
        delete updatePayload.stock;
        const updateResponse = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(String(prodId)), {
          method: 'PATCH', headers: await getSupabaseHeaders(), body: JSON.stringify(updatePayload)
        });
        if (!updateResponse.ok) throw new Error(await updateResponse.text());
        const updatedRows = await updateResponse.json();
        if (!Array.isArray(updatedRows) || updatedRows.length !== 1) throw new Error('პროდუქტი ვერ განახლდა. განაახლეთ სია და სცადეთ ხელახლა.');
        savedProductRow = updatedRows[0];
      } else {
        const createResponse = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_save_product', {
          method: 'POST', headers: await getSupabaseHeaders(), body: JSON.stringify({ p_product: newProdPayload })
        });
        if (!createResponse.ok) throw new Error(await createResponse.text());
        const createdResult = await createResponse.json();
        savedProductRow = Array.isArray(createdResult) ? createdResult[0] : createdResult;
        if (
          !savedProductRow ||
          typeof savedProductRow !== 'object' ||
          String(savedProductRow.id ?? '') !== String(prodId) ||
          !savedProductRow.created_at
        ) {
          throw new Error('სერვერმა შექმნილი პროდუქტის დადასტურებული ჩანაწერი ვერ დააბრუნა. განაახლეთ სია და გადაამოწმეთ პროდუქტი.');
        }
      }
      const existingProduct = (products || []).find(p => String(p.id) === String(prodId));
      let imageCleanupWarning = false;
      if (editingProductId && existingProduct) {
        const previousImages = [...new Set([
          ...(Array.isArray(existingProduct.gallery) ? existingProduct.gallery : []),
          existingProduct.image
        ].filter(Boolean))];
        const removedImages = previousImages.filter(url => !galleryImages.includes(url));
        if (removedImages.length > 0) {
          imageCleanupWarning = !(await deleteProductImages(removedImages, prodId));
        }
      }
      const localProdObject = {
        id: prodId, createdAt: resolveProductCreatedAt({ isEditing: Boolean(editingProductId), savedRow: savedProductRow, existingProduct }),
        sku: newProdPayload.sku, name: newProdPayload.name, category: newProdPayload.category,
        vendor: newProdPayload.vendor, priceGEL: newProdPayload.price_gel,
        oldPriceGEL: newProdPayload.old_price_gel, purchaseCost: newProdPayload.purchase_cost,
        stock: editingProductId ? Number(savedProductRow?.stock ?? 0) : newProdPayload.stock,
        image: newProdPayload.image, gallery: galleryImages, tags: tagsArray,
        description: newProdPayload.description, availableSizes: newProdPayload.available_sizes,
        availableColors: newProdPayload.available_colors,
        variants: Array.isArray(savedProductRow?.variants) ? savedProductRow.variants : productVariants,
        material: newProdPayload.material, durability: newProdPayload.durability,
        brand: newProdPayload.brand, isFeatured: newProdPayload.is_featured,
        model: newProdPayload.model, cpu: newProdPayload.cpu, ram: newProdPayload.ram,
        storage: newProdPayload.storage, gpu: newProdPayload.gpu,
        screenSize: newProdPayload.screen_size, os: newProdPayload.os
      };
      if (typeof setProducts === 'function') {
        setProducts(prev => editingProductId ? (prev || []).map(p => String(p.id) === String(editingProductId) ? localProdObject : p) : [localProdObject, ...(prev || [])]);
      }
      const wasEditing = Boolean(editingProductId);
      resetProductEditor();
      logActivity((wasEditing ? 'განახლდა' : 'დაემატა') + ' პროდუქტი: ' + newProdPayload.name);
      alert(imageCleanupWarning
        ? (wasEditing
          ? 'პროდუქტი განახლდა და მარაგი შენარჩუნებულია, მაგრამ ძველი ფოტოების ნაწილი Storage-დან ვერ წაიშალა.'
          : 'პროდუქტი დაემატა, მაგრამ ძველი ფოტოების ნაწილი Storage-დან ვერ წაიშალა.')
        : (wasEditing ? 'პროდუქტი სრულად განახლდა! მარაგი შენარჩუნებულია.' : 'პროდუქტი წარმატებით დაემატა!'));
    } catch (error) {
      if (newlyUploadedImages.length > 0) await deleteProductImages(newlyUploadedImages, prodId);
      alert(error.message || 'პროდუქტის ან ფოტოს შენახვა ვერ მოხერხდა.');
    }
  };

  const handleExportProducts = () => {
    if (!products || products.length === 0) {
      alert('ექსპორტისთვის პროდუქტები არ არის.');
      return;
    }

    exportCsv(
      `geostore_products_${Date.now()}.csv`,
      ['ID', 'SKU', 'Name', 'Category', 'Price (GEL)', 'Stock', 'Vendor'],
      products.map(p => [
        p.id,
        p.sku || 'N/A',
        p.name,
        p.category,
        p.priceGEL,
        p.stock ?? 0,
        p.vendor || 'GEOSTORE'
      ])
    );
    logActivity('გადმოიწერა პროდუქტების CSV ექსპორტი');
  };

  const handleApplyFlashSale = async (e) => {
    e.preventDefault();

    const percent = Number(flashSaleForm.discountPercent);
    const category = String(flashSaleForm.category || 'ყველა').trim();

    if (!Number.isFinite(percent) || percent <= 0 || percent >= 100 || !/^\d+(?:\.\d{1,2})?$/.test(String(flashSaleForm.discountPercent).trim())) {
      alert('ფასდაკლება უნდა იყოს 0%-ზე მეტი და 100%-ზე ნაკლები.');
      return;
    }

    if (!category) {
      alert('აირჩიეთ პროდუქტის კატეგორია.');
      return;
    }

    if (typeof setProducts !== 'function') {
      alert('პროდუქტების განახლება ამჟამად მიუწვდომელია. განაახლეთ გვერდი და სცადეთ თავიდან.');
      return;
    }

    if (isApplyingFlashSale) return;
    setIsApplyingFlashSale(true);

    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_apply_flash_sale', {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({
          p_discount_percent: percent,
          p_category: category
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || 'ფასდაკლების შენახვა ვერ მოხერხდა.');
      }

      const updatedCount = Number(await response.json());
      if (!Number.isInteger(updatedCount) || updatedCount < 0) {
        throw new Error('სერვერისგან მიღებულია არასწორი განახლების პასუხი.');
      }

      if (updatedCount === 0) {
        alert('არჩეულ კატეგორიაში ფასდაკლებისთვის პროდუქტები ვერ მოიძებნა.');
        return;
      }

      // Re-read the server's final values: some products may be skipped when
      // rounding would leave their price unchanged, and concurrent admin edits may occur.
      let refreshedRows = null;
      try {
        const refreshResponse = await fetch(
          SUPABASE_URL + '/rest/v1/products?select=id,price_gel,old_price_gel,stock&' +
          (category === 'ყველა' ? 'order=id.asc' : 'category=eq.' + encodeURIComponent(category) + '&order=id.asc'),
          { headers: await getSupabaseHeaders() }
        );
        if (refreshResponse.ok) {
          const rows = await refreshResponse.json();
          if (Array.isArray(rows)) refreshedRows = rows;
        }
      } catch (refreshError) {
        console.warn('Flash sale saved, but product refresh failed:', refreshError);
      }

      if (refreshedRows) {
        const savedById = new Map(refreshedRows.map(row => [String(row.id), row]));
        setProducts(prev => (prev || []).map(product => {
          const saved = savedById.get(String(product.id));
          if (!saved) return product;
          return {
            ...product,
            priceGEL: Number(saved.price_gel),
            price_gel: Number(saved.price_gel),
            oldPriceGEL: saved.old_price_gel == null ? null : Number(saved.old_price_gel),
            old_price_gel: saved.old_price_gel,
            stock: saved.stock
          };
        }));
      }

      logActivity(`გააქტიურდა ფლეშ-აქცია (${percent}%) კატეგორიისთვის: ${category}; განახლდა ${updatedCount} პროდუქტი`);
      alert(refreshedRows
        ? `⚡ ფასდაკლება ბაზაში წარმატებით შეინახა! განახლდა ${updatedCount} პროდუქტი.`
        : `ფასდაკლება ბაზაში შენახულია (${updatedCount} პროდუქტი), თუმცა სიის განახლება ვერ მოხერხდა. განაახლეთ გვერდი, რომ ფასები ზუსტად გამოჩნდეს.`);
      setFlashSaleForm({ discountPercent: '', category: 'ყველა' });
    } catch (error) {
      console.error('Flash sale update failed:', error);
      alert('ფასდაკლების შენახვა ვერ მოხერხდა: ' + (error?.message || 'ქსელის შეცდომა'));
    } finally {
      setIsApplyingFlashSale(false);
    }
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('გთხოვთ დაუშვათ Popup ფანჯრები ბრაუზერში.');
      return;
    }
    // Prevent the invoice window from navigating the admin tab.
    try { printWindow.opener = null; } catch {}

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

    const safeImageSrc = (value) => {
      const image = String(value ?? '').trim();
      if (/^https:\/\//i.test(image)) return escapeHtml(image);
      if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(image)) return escapeHtml(image);
      return '';
    };

    const numericValue = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : 0;
    };

    const safeOrderItems = normalizeOrderItems(order.items);
    const itemsRows = safeOrderItems.length > 0
      ? safeOrderItems.map((item) => {
          const imageSrc = safeImageSrc(item.image);
          const quantity = Math.max(1, Math.floor(numericValue(item.quantity) || 1));
          const unitPrice = numericValue(item.priceGEL ?? item.price);
          return `
            <tr>
              <td>${imageSrc ? `<img src="${imageSrc}" width="40" height="40" alt="" style="object-fit:contain; border-radius:8px;" />` : ''} ${escapeHtml(item.name)} ${item.selectedSize ? `(ზომა: ${escapeHtml(item.selectedSize)})` : ''} ${item.selectedColor ? `(ფერი: ${escapeHtml(item.selectedColor)})` : '' } ${item.customVariantName ? `(ვარიანტი: ${escapeHtml(item.customVariantName)})` : ''} ${item.gift_wrap ? '(სასაჩუქრე შეფუთვა +5 ₾)' : ''} ${item.vip_warranty ? '(VIP გარანტია +15 ₾)' : ''} ${item.gift_message ? `<br/><small>სასაჩუქრე ტექსტი: ${escapeHtml(item.gift_message)}</small>` : ''}</td>
              <td>${quantity}</td>
              <td>${unitPrice.toFixed(2)} ₾</td>
              <td>${(unitPrice * quantity).toFixed(2)} ₾</td>
            </tr>
          `;
        }).join('')
      : `<tr><td>${escapeHtml(order.itemSummary || 'პროდუქტები')}</td><td>1</td><td>${numericValue(order.totalGEL).toFixed(2)} ₾</td><td>${numericValue(order.totalGEL).toFixed(2)} ₾</td></tr>`;

    const formattedTotal = typeof formatPrice === 'function'
      ? escapeHtml(formatPrice(order.totalGEL))
      : `${numericValue(order.totalGEL).toFixed(2)} ₾`;

    const htmlContent = `
      <!doctype html>
      <html lang="ka">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ინვოისი #${escapeHtml(order.id)}</title>
          <style>
            body { font-family: 'Noto Sans Georgian', sans-serif; padding: 30px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
            .store-name { font-size: 24px; font-weight: 900; color: #059669; }
            .order-info { margin-bottom: 20px; font-size: 14px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f8fafc; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="store-name">GEOSTORE</div>
              <p>ონლაინ მაღაზია</p>
            </div>
            <div style="text-align: right;">
              <h2>შეკვეთა #${escapeHtml(order.id)}</h2>
              <p>თარიღი: ${escapeHtml(order.date)} ${escapeHtml(order.time || '')}</p>
            </div>
          </div>
          <div class="order-info">
            <p><b>მყიდველი:</b> ${escapeHtml(order.customerName)}</p>
            <p><b>ტელეფონი:</b> ${escapeHtml(order.phone)}</p>
            <p><b>ელ-ფოსტა:</b> ${escapeHtml(order.user_email || 'მითითებული არ არის')}</p>
            <p><b>მიტანის მისამართი:</b> ${escapeHtml(order.address)}</p>
            <p><b>სტატუსი:</b> ${escapeHtml(order.status || 'ახალი')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>პროდუქტი / დეტალები</th>
                <th>რაოდენობა</th>
                <th>ერთ. ფასი</th>
                <th>ჯამი</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="total">
            სულ გადასახდელი: ${formattedTotal}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    logActivity(`დაიბეჭდა ინვოისი შეკვეთისთვის #${escapeHtml(order.id)}`);
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'PATCH',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('ტიკეტის სტატუსის განახლება ვერ მოხერხდა.');
      fetchTickets();
      logActivity(`ტიგეტის #${ticketId} სტატუსი შეიცვალა: ${newStatus}`);
    } catch { alert('შეცდომა სტატუსის განახლებისას'); }
  };

  const handleSendTicketReply = async (ticketId) => {
    const replyText = replyInputs[ticketId];
    if (!replyText || !replyText.trim()) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'PATCH',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({ reply: replyText.trim(), status: 'მოგვარებული' })
      });
      if (!response.ok) throw new Error('ტიკეტში პასუხის შენახვა ვერ მოხერხდა.');
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
      fetchTickets();
      logActivity(`გაიგზავნა პასუხი ტიგეტზე #${ticketId}`);
      alert('✅ პასუხი წარმატებით შეინახა მხარდაჭერის ტიკეტში. მომხმარებლისთვის ელფოსტით გაგზავნა ამ მოქმედებით არ ხდება.');
    } catch { alert('შეცდომა პასუხის გაგზავნისას'); }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm('ნამდვილად გსურთ ამ ტიგეტის წაშლა?')) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
          method: 'DELETE',
          headers: await getSupabaseHeaders()
        });
        if (!response.ok) throw new Error('ტიკეტის წაშლა ვერ მოხერხდა.');
        fetchTickets();
        logActivity(`წაიშალა მხარდაჭერის ტიგეტი (ID: ${ticketId})`);
      } catch { alert('შეცდომა ტიგეტის წაშლისას'); }
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    const code = String(couponForm.code || '').trim().toUpperCase().replace(/\s+/g, '');
    const discountText = String(couponForm.discountPercent ?? '').trim();
    const minOrderText = String(couponForm.minOrderGEL ?? '').trim();
    const discountPercent = Number(discountText);
    const minOrderGEL = minOrderText === '' ? 0 : Number(minOrderText);

    const validDiscount = /^\d+(?:\.\d{1,2})?$/.test(discountText)
      && Number.isFinite(discountPercent)
      && discountPercent > 0
      && discountPercent <= 100;
    const validMinimum = (minOrderText === '' || /^\d+(?:\.\d{1,2})?$/.test(minOrderText))
      && Number.isFinite(minOrderGEL)
      && minOrderGEL >= 0
      && minOrderGEL <= 1000000000;

    if (!/^[A-Z0-9_-]{3,64}$/.test(code) || !validDiscount || !validMinimum) {
      alert('კოდი უნდა შეიცავდეს 3-64 ლათინურ ასოს/ციფრს. ფასდაკლება: 0-ზე მეტი და მაქსიმუმ 100% (2 ათწილადი); მინიმალური შეკვეთა: 0-1,000,000,000 ₾ (2 ათწილადი).');
      return;
    }

    const duplicateCode = (coupons || []).some((coupon) =>
      String(coupon?.code || '').trim().toUpperCase() === code
    );
    if (duplicateCode) {
      alert('ეს კუპონის კოდი უკვე არსებობს. გამოიყენეთ სხვა კოდი.');
      return;
    }

    const newC = {
      id: `c-${Date.now()}`,
      code,
      discountPercent,
      minOrderGEL,
      status: 'აქტიური'
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/store_coupons`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({
          id: newC.id,
          code: newC.code,
          discount_percent: newC.discountPercent,
          min_order_gel: newC.minOrderGEL,
          active: true
        })
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'კუპონის ბაზაში შენახვა ვერ მოხერხდა.');
      }

      if (typeof setCoupons === 'function') {
        setCoupons(prev => [newC, ...(prev || []).filter(c => String(c.code || '').trim().toUpperCase() !== newC.code)]);
      }
      setCouponForm({ code: '', discountPercent: '', minOrderGEL: '' });
      logActivity(`შეიქმნა ახალი კუპონი: ${newC.code}`);
      alert('კუპონი წარმატებით შეინახა ბაზაში.');
    } catch (error) {
      console.error('Coupon creation error:', error);
      alert(error.message || 'კუპონის შექმნა ვერ მოხერხდა.');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('ნამდვილად გსურთ ამ კუპონის წაშლა?')) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/store_coupons?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...(await getSupabaseHeaders()),
          Prefer: 'return=representation'
        }
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'კუპონის წაშლა ვერ მოხერხდა.');
      }
      const deletedRows = await response.json();
      if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
        throw new Error('კუპონი ბაზაში ვერ მოიძებნა ან წაშლის უფლება არ გაქვთ.');
      }
      if (typeof setCoupons === 'function') {
        setCoupons(prev => (prev || []).filter(c => c.id !== id));
      }
      logActivity(`წაიშალა კუპონი (ID: ${id})`);
    } catch (error) {
      console.error('Coupon deletion error:', error);
      alert(error.message || 'კუპონის წაშლა ვერ მოხერხდა.');
    }
  };

  const handleSaveDeliveryFees = async () => {
    const rows = [
      { region: 'tbilisi', fee_gel: Number(deliveryFees?.tbilisi) },
      { region: 'bigCities', fee_gel: Number(deliveryFees?.bigCities) },
      { region: 'other', fee_gel: Number(deliveryFees?.other) }
    ];

    if (rows.some(row => !Number.isFinite(row.fee_gel) || row.fee_gel < 0)) {
      alert('მიწოდების საფასური უნდა იყოს 0 ან მეტი.');
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/store_delivery_fees?on_conflict=region`, {
        method: 'POST',
        headers: {
          ...(await getSupabaseHeaders()),
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(rows.map(row => ({ ...row, updated_at: new Date().toISOString() })))
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'მიწოდების ტარიფების ბაზაში შენახვა ვერ მოხერხდა.');
      }
      logActivity('განახლდა მიწოდების ტარიფები');
      alert('მიწოდების ტარიფები წარმატებით შეინახა ბაზაში.');
    } catch (error) {
      console.error('Delivery fee save error:', error);
      alert(error.message || 'მიწოდების ტარიფების შენახვა ვერ მოხერხდა.');
    }
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    const vendorName = String(vendorForm.name || '').trim();
    const commissionText = String(vendorForm.commission ?? '').trim();
    const commission = Number(commissionText);

    if (!vendorName || vendorName.length > 100) {
      alert('ვენდორის სახელი სავალდებულოა და მაქსიმუმ 100 სიმბოლოს უნდა შეიცავდეს.');
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(commissionText) || !Number.isFinite(commission) || commission < 0 || commission > 100) {
      alert('კომისია უნდა იყოს 0-დან 100%-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
      return;
    }
    if ((vendorsList || []).some(v => String(v?.name || '').trim().toLocaleLowerCase() === vendorName.toLocaleLowerCase())) {
      alert('ასეთი სახელის ვენდორი უკვე არსებობს.');
      return;
    }

    const newV = {
      id: `v-${Date.now()}`,
      name: vendorName,
      commission,
      status: 'აქტიური'
    };
    if (typeof setVendorsList === 'function') {
      setVendorsList(prev => [...(prev || []), newV]);
    }
    setVendorForm({ name: '', commission: '' });
    logActivity(`დაემატა ახალი ვენდორი: ${newV.name}`);
    alert('✅ ვენდორი წარმატებით დაემატა!');
  };

  const handleDeleteVendor = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ვენდორის წაშლა?')) {
      if (typeof setVendorsList === 'function') {
        setVendorsList(prev => (prev || []).filter(v => v.id !== id));
      }
      logActivity(`წაიშალა ვენდორი (ID: ${id})`);
    }
  };

  const handleAddBanner = (e) => {
    e.preventDefault();
    const title = String(bannerForm.title || '').trim();
    const subtitle = String(bannerForm.subtitle || '').trim();
    const image = String(bannerForm.image || '').trim();
    if (!title || title.length > 120 || subtitle.length > 240) {
      alert('ბანერის სათაური სავალდებულოა (მაქსიმუმ 120 სიმბოლო), აღწერა კი მაქსიმუმ 240 სიმბოლო.');
      return;
    }
    if (image) {
      try {
        const parsedImageUrl = new URL(image);
        if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) throw new Error('Unsupported image URL protocol');
      } catch {
        alert('ბანერის ფოტოსთვის მიუთითეთ სწორი HTTPS ან HTTP ბმული.');
        return;
      }
    }
    if ((Array.isArray(bannersList) ? bannersList.length : 0) >= 20) {
      alert('ერთდროულად მაქსიმუმ 20 აქტიური ბანერის შენახვა შეიძლება.');
      return;
    }
    const newB = {
      id: `b-${window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`,
      title,
      subtitle,
      image: image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=1200',
      link: String(bannerForm.link || '').trim()
    };
    if (typeof setBannersList === 'function') {
      setBannersList(prev => [...(prev || []), newB]);
    }
    setBannerForm({ title: '', subtitle: '', image: '', link: '' });
    logActivity(`დაემატა ბანერის მონახაზი: ${newB.title}`);
    alert('ბანერის მონახაზი შეინახა. საიტზე გამოსაჩენად დააჭირეთ „ცვლილებების გამოქვეყნება“.');
  };

  const handleDeleteBanner = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ბანერის წაშლა?')) {
      if (typeof setBannersList === 'function') {
        setBannersList(prev => (prev || []).filter(b => b.id !== id));
      }
      logActivity(`წაიშალა ბანერი (ID: ${id})`);
    }
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    const title = String(broadcastForm.title || '').trim();
    const message = String(broadcastForm.message || '').trim();
    if (!title || !message) {
      alert('შეავსეთ შეტყობინების სათაური და ტექსტი.');
      return;
    }
    if (title.length > 120 || message.length > 2000) {
      alert('სათაური მაქსიმუმ 120, ხოლო ტექსტი მაქსიმუმ 2000 სიმბოლოს უნდა შეიცავდეს.');
      return;
    }

    const newNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      date: new Date().toLocaleDateString('ka-GE')
    };

    try {
      const parsed = JSON.parse(localStorage.getItem('geostore_broadcasts') || '[]');
      const existing = Array.isArray(parsed) ? parsed : [];
      localStorage.setItem('geostore_broadcasts', JSON.stringify([newNotification, ...existing]));
    } catch (error) {
      console.error('Local test notification save failed:', error);
      alert('სატესტო შეტყობინება ამ მოწყობილობაზე ვერ შეინახა. შეამოწმეთ მოწყობილობის მეხსიერება და სცადეთ თავიდან.');
      return;
    }

    setBroadcastForm({ title: '', message: '' });
    logActivity(`შეინახა სატესტო შეტყობინება ამ მოწყობილობაზე: ${title}`);
    alert('სატესტო შეტყობინება შეინახა მხოლოდ ამ მოწყობილობაზე. სხვა მომხმარებლებს არ ეგზავნება.');
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const existingOrder = (orders || []).find(order => String(order.id) === String(orderId));
    const currentStatus = normalizeOrderStatus(existingOrder?.status);
    const nextStatus = normalizeOrderStatus(newStatus);

    if (isDeliveredOrderStatus(currentStatus) && !isDeliveredOrderStatus(nextStatus)) {
      alert('ჩაბარებული შეკვეთა დასრულებულად რჩება. სტატუსის უკუსვლა დაუშვებელია; დაბრუნებისთვის საჭიროა ცალკე დაბრუნების პროცესი.');
      return;
    }
    if (isCancelledOrderStatus(currentStatus) && !isCancelledOrderStatus(nextStatus)) {
      setReactivationOrder(existingOrder);
      setReactivationPassword('');
      setReactivationError('');
      return;
    }
    if (isShippedOrderStatus(currentStatus) && !isShippedOrderStatus(nextStatus) && !isDeliveredOrderStatus(nextStatus)) {
      alert('შეკვეთა უკვე გაგზავნილია. მისი წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია; საჭიროების შემთხვევაში გამოიყენეთ დაბრუნების ცალკე პროცესი.');
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_order_status`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({
          p_order_id: orderId,
          p_new_status: newStatus
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'ვერ მოხერხდა შეკვეთის სტატუსის განახლება.');
      }

      if (typeof setOrders === 'function') {
        setOrders(prev => (prev || []).map(order =>
          String(order.id) === String(orderId) ? { ...order, status: newStatus } : order
        ));
      }
      setSelectedOrderForModal(prev =>
        prev && String(prev.id) === String(orderId) ? { ...prev, status: newStatus } : prev
      );

      try {
        const localOrders = JSON.parse(localStorage.getItem('geostore_local_orders') || '[]');
        const updatedLocal = localOrders.map(o => String(o.id) === String(orderId) ? { ...o, status: newStatus } : o);
        localStorage.setItem('geostore_local_orders', JSON.stringify(updatedLocal));
      } catch {}

      logActivity(`შეკვეთის #${orderId} სტატუსი შეიცვალა: ${newStatus}`);
      alert(`✅ შეკვეთის #${orderId} სტატუსი წარმატებით განახლდა: ${newStatus}`);
    } catch (error) {
      alert(error.message || 'ქსელის შეცდომა სტატუსის შეცვლისას');
    }
  };

  const handleConfirmOrderReactivation = async (event) => {
    event.preventDefault();
    if (!reactivationOrder || !reactivationPassword || isReactivatingOrder) return;

    setIsReactivatingOrder(true);
    setReactivationError('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.email) {
        throw new Error('ადმინისტრატორის სესია ვერ დადასტურდა. ხელახლა შედით სისტემაში.');
      }

      // Use an isolated auth client so password reauthentication always creates
      // a fresh session/auth_time without mutating the admin dashboard's main session.
      const reauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      const { data: reauthData, error: passwordError } = await reauthClient.auth.signInWithPassword({
        email: userData.user.email,
        password: reactivationPassword
      });
      if (passwordError) {
        throw new Error('პაროლი არასწორია. შეკვეთა არ გააქტიურებულა.');
      }

      // Use the exact session returned by the fresh password check.
      // Do not re-read a possibly stale session from storage for this sensitive RPC.
      const reauthSession = reauthData?.session;
      if (
        !reauthSession?.access_token ||
        reauthData?.user?.id !== userData.user.id ||
        reauthData?.user?.app_metadata?.role !== 'admin' ||
        reauthData?.user?.id !== '1060de3d-d28a-45f8-9a64-5e0368cffc4b'
      ) {
        throw new Error('პაროლის დადასტურება ვერ მოხერხდა. ხელახლა შედით ადმინისტრატორის ანგარიშში.');
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_reactivate_cancelled_order`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${reauthSession.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ p_order_id: reactivationOrder.id })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'შეკვეთის ხელახლა გააქტიურება ვერ მოხერხდა.');
      }

      if (typeof setOrders === 'function') {
        setOrders(prev => (prev || []).map(order =>
          String(order.id) === String(reactivationOrder.id) ? { ...order, status: 'ახალი' } : order
        ));
      }
      setSelectedOrderForModal(prev =>
        prev && String(prev.id) === String(reactivationOrder.id) ? { ...prev, status: 'ახალი' } : prev
      );
      try {
        const localOrders = JSON.parse(localStorage.getItem('geostore_local_orders') || '[]');
        localStorage.setItem('geostore_local_orders', JSON.stringify(
          localOrders.map(order => String(order.id) === String(reactivationOrder.id) ? { ...order, status: 'ახალი' } : order)
        ));
      } catch {}

      logActivity(`გაუქმებული შეკვეთა #${reactivationOrder.id} ხელახლა გააქტიურდა პაროლის დადასტურებით`);
      setReactivationOrder(null);
      setReactivationPassword('');
      alert(`✅ შეკვეთა #${reactivationOrder.id} ხელახლა გააქტიურდა. მარაგი ხელახლა ჩამოიჭრა.`);
    } catch (error) {
      setReactivationError(error.message || 'შეკვეთის ხელახლა გააქტიურება ვერ მოხერხდა.');
    } finally {
      setIsReactivatingOrder(false);
    }
  };

  const handleSaveOrderAdminNote = async (orderId) => {
    if (isSavingOrderNote) return;
    const noteToSave = String(orderAdminNoteInput ?? '');
    setIsSavingOrderNote(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_save_order_note`, {
        method: 'POST',
        headers: await getSupabaseHeaders({ authenticated: true }),
        body: JSON.stringify({
          p_order_id: String(orderId),
          p_admin_note: noteToSave
        })
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'შენიშვნის ბაზაში შენახვა ვერ მოხერხდა.');
      }
      if (typeof setOrders === 'function') {
        setOrders(prev => (prev || []).map(o =>
          String(o.id) === String(orderId) ? { ...o, adminNote: noteToSave } : o
        ));
      }
      // The modal may have been switched while the request was in flight.
      // Update it only if it still displays the order that was actually saved.
      setSelectedOrderForModal(prev =>
        prev && String(prev.id) === String(orderId) ? { ...prev, adminNote: noteToSave } : prev
      );
      alert('✅ ადმინისტრატორის შენიშვნა წარმატებით შეინახა!');
    } catch (error) {
      console.error('Admin order note save failed:', error);
      alert(error?.message || 'შეცდომა შენიშვნის შენახვისას');
    } finally {
      setIsSavingOrderNote(false);
    }
  };

  const handleExportOrders = () => {
    if (!orders || orders.length === 0) {
      alert('გადმოსაწერი შეკვეთები არ არის.');
      return;
    }

    exportCsv(
      `geostore_orders_${Date.now()}.csv`,
      ['ID', 'Date', 'Customer', 'Phone', 'Address', 'Total (GEL)', 'Status'],
      orders.map(o => [
        o.id,
        o.date,
        o.customerName,
        o.phone,
        o.address,
        o.totalGEL,
        o.status || 'ახალი'
      ])
    );
    logActivity('გადმოიწერა შეკვეთების CSV ექსპორტი');
  };

  const handleToggleVipUser = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => (u.id === userId || u.email === userId) ? { ...u, isVip: !u.isVip } : u));
    }
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) VIP სტატუსი`);
  };

  const handleToggleBlockUser = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => (u.id === userId || u.email === userId) ? { ...u, isBlocked: !u.isBlocked } : u));
    }
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) ბლოკირების სტატუსი`);
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`ნამდვილად გსურთ მომხმარებლის "${userName || userId}" წაშლა სისტემიდან?`)) {
      if (typeof setUsersList === 'function') {
        setUsersList(prev => (prev || []).filter(u => u.id !== userId && u.email !== userId));
      }
      logActivity(`წაიშალა მომხმარებელი: ${userName || userId}`);
    }
  };

  const handleSaveUserCrm = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => {
        if (u.id === userId || u.email === userId) {
          return {
            ...u,
            discountPercent: Number(editUserDiscount) || 0,
            adminNotes: editUserNotes
          };
        }
        return u;
      }));
    }
    setEditingUserId(null);
    setEditUserDiscount('');
    setEditUserNotes('');
    logActivity(`განახლდა CRM მონაცემები მომხმარებლისთვის (ID: ${userId})`);
    alert('✅ მომხმარებლის მონაცემები წარმატებით განახლდა!');
  };

  const handleRestoreStorefrontVersion = (version) => {
    if (!adminLoggedIn || !version?.snapshot || typeof version.snapshot !== 'object' || Array.isArray(version.snapshot)) return;
    const snapshot = version.snapshot;
    if (!Array.isArray(snapshot.categories) || !Array.isArray(snapshot.banners) ||
        !snapshot.siteSettings || typeof snapshot.siteSettings !== 'object' || Array.isArray(snapshot.siteSettings)) {
      alert('ამ ვერსიის მონაცემები არასრულია და უსაფრთხოდ ვერ აღდგება.');
      return;
    }
    const label = String(version.version_label || version.created_at || 'არჩეული ვერსია');
    if (!window.confirm(`გსურთ „${label}“-ის ჩატვირთვა მონახაზში? გამოქვეყნება ავტომატურად არ მოხდება.`)) return;
    if (typeof setCategoriesList === 'function') setCategoriesList(snapshot.categories);
    if (typeof setBannersList === 'function') setBannersList(snapshot.banners);
    if (typeof setSiteSettings === 'function') setSiteSettings(snapshot.siteSettings);
    alert('ვერსია ჩაიტვირთა რედაქტორში. ცვლილებების შესანახად დააჭირეთ „მონახაზის შენახვას“, ხოლო საიტზე გამოსაჩენად ცალკე გამოაქვეყნეთ.');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const normalized = {
      ...siteSettings,
      storeName: String(siteSettings?.storeName || '').trim(),
      topBarText: String(siteSettings?.topBarText || '').trim(),
      heroTitle: String(siteSettings?.heroTitle || '').trim(),
      heroSubtitle: String(siteSettings?.heroSubtitle || '').trim()
    };
    if (normalized.storeName.length < 2 || normalized.storeName.length > 60 ||
        normalized.topBarText.length > 160 || normalized.heroTitle.length > 120 ||
        normalized.heroSubtitle.length > 240) {
      alert('შეამოწმეთ ველების სიგრძე: მაღაზიის სახელი 2–60, ზედა ზოლი 160, მთავარი სათაური 120, აღწერა 240 სიმბოლო.');
      return;
    }
    if (typeof setSiteSettings === 'function') setSiteSettings(normalized);
    if (typeof onSaveStorefrontDraft !== 'function') {
      alert('Supabase-ის მონახაზის შენახვა მიუწვდომელია. ცვლილებები დარჩება მხოლოდ ამ მოწყობილობაზე.');
      return;
    }
    logActivity('მზადდება საიტის პარამეტრების მონახაზის შენახვა');
    await onSaveStorefrontDraft(normalized);
  };

  const filteredUsers = (usersList || []).filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.phone?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredProducts = (products || []).filter(p =>
    p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchQuery.toLowerCase())
  ).sort((left, right) => {
    // Keep the admin catalogue in a deterministic order even when the
    // server returns rows with identical timestamps in a different order.
    const leftTime = Date.parse(left.createdAt || left.created_at || '') || 0;
    const rightTime = Date.parse(right.createdAt || right.created_at || '') || 0;
    return rightTime - leftTime ||
      String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });

  // Keep this as a derived value, not a hook: the login view returns
  // before this section, so a useMemo here would change hook order
  // when adminLoggedIn switches from false to true and crash React.
  const filteredOrders = (orders || []).filter(o => {
    const matchesSearch =
      String(o.id ?? '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      String(o.customerName ?? '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      String(o.phone ?? '').toLowerCase().includes(orderSearchQuery.toLowerCase());

    // Legacy English/Russian status values must appear in the same filter
    // bucket as their Georgian equivalents, rather than disappearing from
    // filtered lists even though tracking recognizes them.
    const matchesStatus = orderStatusFilter === 'ყველა' ||
      getOrderStatusFilterKey(o.status) === orderStatusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const aTime = Date.parse(a.status_changed_at || '') || Date.parse(a.created_at || '') || 0;
    const bTime = Date.parse(b.status_changed_at || '') || Date.parse(b.created_at || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id));
  });

  const currentOrderPage = Math.max(1, orderPageByStatus[orderStatusFilter] || 1);
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safeOrderPage = Math.min(currentOrderPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice((safeOrderPage - 1) * ORDERS_PER_PAGE, safeOrderPage * ORDERS_PER_PAGE);
  const setCurrentOrderPage = (page) => setOrderPageByStatus(prev => ({ ...prev, [orderStatusFilter]: page }));

  const mainCategories = safeCategories.filter(c => !c.parentId);

  const catLower = productForm.category.toLowerCase();
  const isClothing = catLower.includes('ტანსაცმელ') || catLower.includes('ქურთუკ') || catLower.includes('შარვალ');
  const isShoes = catLower.includes('ფეხსაცმელ') || catLower.includes('shoe');
  const isLaptop = catLower.includes('ლეპტოპ') || catLower.includes('კომპიუტერ');
  const isPhone = catLower.includes('სმარტფონ') || catLower.includes('ტელეფონ');

  return (
    <div className="admin-dashboard-pro admin-dashboard-shell flex flex-col lg:flex-row gap-6 sm:gap-8 w-full pb-16 items-start px-2 sm:px-0">
      
      {/* 🧭 SIDEBAR NAVIGATION MENU */}
      <div className="w-full lg:w-72 bg-slate-900/80 border border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-2xl backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-3.5 pb-4 border-b border-emerald-500/20">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl shadow-inner">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm">GEOSTORE Admin</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Database Edition</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            { id: 'analytics', label: '📊 ანალიტიკა & ფინანსები', icon: BarChart3 },
            { id: 'calculator', label: '🧮 მოგების კალკულატორი', icon: Calculator },
            { id: 'expenses', label: '💸 ხარჯების მართვა', count: expenses.length, icon: Wallet },
            { id: 'ai_analyst', label: '🤖 AI ბიზნეს ასისტენტი', icon: Sparkles },
            { id: 'staff', label: '👔 თანამშრომლები & როლები', count: staffList?.length || 0, icon: UserCog },
            { id: 'orders', label: '📦 შეკვეთები', count: orders?.length || 0, icon: PackageCheck },
            { id: 'products', label: '🏷️ პროდუქტები & მახასიათებლები', count: products?.length || 0, icon: Store },
            { id: 'support', label: '💬 მხარდაჭერა', count: supportTickets?.filter(t => t.status === 'ღია' || t.status === 'მუშავდება')?.length || 0, icon: HelpCircle },
            { id: 'discounts', label: '⚡ ფლეშ-აქციები', icon: Zap },
            { id: 'logs', label: '📋 აქტივობები', count: activityLogs?.length || 0, icon: Activity },
            { id: 'broadcasts', label: '📢 შეტყობინებები', icon: Send },
            { id: 'banners', label: '🖼️ ბანერები', count: bannersList?.length || 0, icon: Megaphone },
            { id: 'categories', label: '📂 კატეგორიები & სუბკატეგორიები', count: safeCategories.length, icon: FolderTree },
            { id: 'coupons', label: '🎫 კუპონები', count: coupons?.length || 0, icon: Tag },
            { id: 'vendors', label: '🏪 ვენდორები', count: vendorsList?.length || 0, icon: Store },
            { id: 'users', label: '👥 CRM მომხმარებლები', count: usersList?.length || 0, icon: Users },
            { id: 'settings', label: '⚙️ პარამეტრები & უსაფრთხოება', icon: Settings }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`w-full px-3.5 sm:px-4 py-3 rounded-2xl font-black text-xs transition-all duration-300 flex items-center justify-between cursor-pointer shadow-sm ${
                  isActive 
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-102' 
                    : 'bg-slate-950/60 text-slate-400 border border-emerald-500/10 hover:text-white hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => { if (typeof handleLogout === 'function') handleLogout(); }} 
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-4"
        >
          <LogOut className="w-4 h-4" /> სისტემიდან გასვლა
        </button>
      </div>

      {/* 🖥️ MAIN CONTENT AREA */}
      <div className="flex-1 w-full space-y-6">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/80 border border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 gap-4 shadow-2xl backdrop-blur-3xl">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">მოგესალმებით, ადმინისტრატორ! 👋</h2>
            <p className="text-xs text-slate-400 mt-0.5">სრული კონტროლი მაღაზიის მართვის პანელზე:</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => { if (typeof onSaveStorefrontDraft === 'function') onSaveStorefrontDraft(); }}
              disabled={storefrontDraftBusy || storefrontPublishBusy || typeof onSaveStorefrontDraft !== 'function'}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-wait text-white px-4 py-2.5 rounded-2xl text-xs font-black transition"
            >
              {storefrontDraftBusy ? 'მონახაზის შენახვა...' : 'მონახაზის შენახვა'}
            </button>
            <button
              type="button"
              onClick={() => { if (typeof onPublishStorefront === 'function') onPublishStorefront(); }}
              disabled={storefrontDraftBusy || storefrontPublishBusy || typeof onPublishStorefront !== 'function'}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-wait text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black transition"
            >
              {storefrontPublishBusy ? 'გამოქვეყნება...' : 'ცვლილებების გამოქვეყნება'}
            </button>
            <div className="flex items-center gap-3 bg-slate-950/60 border border-emerald-500/20 px-4 py-2.5 rounded-2xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-bold">CRM & Database აქტიურია</span>
            </div>
          </div>
        </div>

        {adminTab === 'analytics' && (
          <div className="admin-analytics space-y-6">
            <div className="admin-analytics-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/80 border border-emerald-500/25 p-4 rounded-2xl">
              <div>
                <h3 className="text-white font-black text-sm">ფინანსური პერიოდი</h3>
                <p className="text-slate-400 text-[10px] mt-1">მოგებაში ითვლება მხოლოდ ჩაბარებული/დასრულებული შეკვეთები</p>
              </div>
              <select value={analyticsPeriod} onChange={e => setAnalyticsPeriod(e.target.value)} className="bg-slate-950 border border-emerald-500/30 text-white rounded-xl px-4 py-3 text-xs font-bold">
                <option value="all">მთელი პერიოდი</option>
                <option value="30">ბოლო 30 დღე</option>
                <option value="90">ბოლო 90 დღე</option>
                <option value="365">ბოლო 12 თვე</option>
              </select>
              <button type="button" onClick={handleExportAnalytics} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl px-4 py-3 text-xs font-black inline-flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> ანგარიშების CSV ექსპორტი
              </button>
            </div>
            {(financialOverview.deliveredOrdersMissingStatusDate > 0 || financialOverview.deliveredOrdersWithoutStockTracking > 0) && (
              <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
                <strong className="block mb-1">ისტორიული შეკვეთების მონაცემების შენიშვნა</strong>
                {financialOverview.deliveredOrdersMissingStatusDate > 0 && (
                  <span className="block">{financialOverview.deliveredOrdersMissingStatusDate} ჩაბარებულ შეკვეთას სტატუსის ცვლილების თარიღი არ აქვს; პერიოდისთვის გამოყენებულია შეკვეთის შექმნის თარიღი.</span>
                )}
                {financialOverview.deliveredOrdersWithoutStockTracking > 0 && (
                  <span className="block">{financialOverview.deliveredOrdersWithoutStockTracking} ჩაბარებულ შეკვეთაზე მარაგის ჩამოჭრის ჩანაწერი არ არსებობს; ეს ძველი შეკვეთები ფინანსურ ბრუნვაში რჩება, მაგრამ მარაგის ისტორია დადასტურებული არ არის.</span>
                )}
              </div>
            )}
            <div className="admin-analytics-kpis grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 sm:gap-5">
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> შეკვეთების ბრუნვა</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400">{financialOverview.totalSalesRevenue.toFixed(2)} ₾</p>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">მხოლოდ ჩაბარებული შეკვეთები</span>
              </div>
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-cyan-400" /> მთლიანი მოგება</p>
                <p className="text-2xl sm:text-3xl font-black text-cyan-400">{financialOverview.grossProfit === null ? '—' : financialOverview.grossProfit.toFixed(2) + ' ₾'}</p>
                <span className="text-[10px] text-cyan-500 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md">{financialOverview.unknownCogsItems > 0 ? 'თვითღირებულება არასრულია' : financialOverview.estimatedCogsItems > 0 ? 'ნაწილობრივ მიმდინარე თვითღირებულებით' : 'შეკვეთაში დაფიქსირებული თვითღირებულება'}</span>
              </div>
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-rose-400" /> სულ ხარჯები</p>
                <p className="text-2xl sm:text-3xl font-black text-rose-400">{financialOverview.totalExpenses.toFixed(2)} ₾</p>
                <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md">ოპერაციული</span>
              </div>
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><PackageCheck className="w-4 h-4 text-blue-400" /> ჩაბარებული შეკვეთები</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-400">{financialOverview.deliveredOrders.length}</p>
                <span className="text-[10px] text-slate-400">მიმდინარე შეკვეთები: {financialOverview.pipelineOrders.length}</span>
              </div>
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" /> საშუალო შეკვეთა</p>
                <p className="text-2xl sm:text-3xl font-black text-indigo-400">{financialOverview.averageOrderValue.toFixed(2)} ₾</p>
                <span className="text-[10px] text-slate-400">ჩაბარებული შეკვეთების საშუალო ღირებულება</span>
              </div>
              <div className="admin-analytics-card bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> წმინდა მოგება (Net)</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-400">{financialOverview.netProfit === null ? '—' : financialOverview.netProfit.toFixed(2) + ' ₾'}</p>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">{financialOverview.netProfit === null ? 'მოგება ვერ განისაზღვრება — COGS აკლია' : financialOverview.estimatedCogsItems > 0 ? 'შეფასებითი მოგება — ძველი შეკვეთების თვითღირებულება მიმდინარე ფასითაა' : 'მთლიანი მოგება − ოპერაციული ხარჯები'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-slate-900/80 border border-cyan-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">გაყიდვების დინამიკა</h3>
                  <span className="text-[10px] text-slate-400">{analyticsPeriod === '30' || analyticsPeriod === '90' ? 'დღეების მიხედვით' : 'თვეების მიხედვით'}</span>
                </div>
                {financialOverview.salesTrend.length === 0 ? <p className="text-slate-500 text-xs py-6">არჩეულ პერიოდში ჩაბარებული გაყიდვები არ არის.</p> : (
                  <div className="flex items-end gap-1.5 h-44 pt-3">
                    {financialOverview.salesTrend.map(point => {
                      const maxRevenue = Math.max(1, ...financialOverview.salesTrend.map(item => item.revenue));
                      const height = Math.max(4, (point.revenue / maxRevenue) * 100);
                      return (
                        <div key={point.key} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" title={`${point.label}: ${point.revenue.toFixed(2)} ₾ · ${point.orders} შეკვეთა`}>
                          <div className="w-full rounded-t-md bg-cyan-400/80 hover:bg-cyan-300 transition-colors" style={{ height: `${height}%` }} />
                          <span className="text-[8px] text-slate-500 whitespace-nowrap">{point.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-400">ჯამური ბრუნვა: <b className="text-cyan-300">{financialOverview.salesTrend.reduce((sum, point) => sum + point.revenue, 0).toFixed(2)} ₾</b> · ჩაბარებული შეკვეთები: {financialOverview.salesTrend.reduce((sum, point) => sum + point.orders, 0)}</p>
              </div>
              <div className="bg-slate-900/80 border border-amber-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">მარაგის გაფრთხილებები</h3>
                  <span className="text-[10px] text-slate-400">ზღვარი: 5 ცალი</span>
                </div>
                {financialOverview.lowStockProducts.length === 0 ? <p className="text-emerald-300 text-xs py-6">ყველა პროდუქტს საკმარისი მარაგი აქვს ან მარაგი მითითებული არ არის.</p> : financialOverview.lowStockProducts.map(product => (
                  <div key={product.id || product.sku || product.name} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 text-xs">
                    <div className="min-w-0"><b className="text-white block truncate">{product.name || 'უსახელო პროდუქტი'}</b><span className="text-slate-500">{product.sku || product.category || 'პროდუქტი'}</span></div>
                    <span className={product._stockValue === 0 ? 'text-rose-300 font-black whitespace-nowrap' : 'text-amber-300 font-black whitespace-nowrap'}>{product._stockValue === 0 ? 'არ არის მარაგში' : `${product._stockValue} ცალი დარჩა`}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-slate-900/80 border border-indigo-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">ყველაზე გაყიდვადი პროდუქტები</h3>
                  <span className="text-[10px] text-slate-400">ჩაბარებული შეკვეთები</span>
                </div>
                {financialOverview.bestSellingProducts.length === 0 ? <p className="text-slate-500 text-xs py-4">გაყიდვები ჯერ არ არის.</p> : financialOverview.bestSellingProducts.map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 text-xs">
                    <div className="min-w-0"><b className="text-white block truncate">{index + 1}. {item.name}</b><span className="text-slate-500">{item.vendor} · {item.revenue.toFixed(2)} ₾</span></div>
                    <b className="text-indigo-300 whitespace-nowrap">{item.quantity} ც.</b>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <h3 className="font-black text-white text-sm">მარაგის სტატისტიკა</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 rounded-2xl p-4"><p className="text-[10px] text-slate-400">პროდუქტები დაბალი მარაგით</p><b className="text-2xl text-amber-300">{financialOverview.lowStockProducts.length}</b></div>
                  <div className="bg-slate-950/70 rounded-2xl p-4"><p className="text-[10px] text-slate-400">ნულოვანი მარაგი</p><b className="text-2xl text-rose-300">{financialOverview.lowStockProducts.filter(product => product._stockValue === 0).length}</b></div>
                </div>
                <p className="text-[10px] text-slate-500">მონაცემები იკითხება არსებული პროდუქტის stock ველიდან. მარაგი ავტომატურად არ იცვლება.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-slate-900/80 border border-emerald-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">შემოსავლის წყაროები</h3>
                  <span className="text-[10px] text-slate-400">ჩაბარებული შეკვეთები · პროდუქტი და მიწოდება</span>
                </div>
                {incomeSources.length === 0 ? <p className="text-slate-500 text-xs py-4">შემოსავლის წყარო ჯერ არ არის.</p> : incomeSources.map(source => (
                  <div key={source.label} className="flex justify-between gap-3 text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-300">{source.label}</span>
                    <b className="text-emerald-400 whitespace-nowrap">{source.amount.toFixed(2)} ₾</b>
                  </div>
                ))}
                {financialOverview.unknownCogsItems > 0 && <p className="text-amber-300 text-[10px]">თვითღირებულება უცნობია {financialOverview.unknownCogsItems} შეკვეთის/პროდუქტის ჩანაწერზე.</p>}
                {financialOverview.estimatedCogsItems > 0 && <p className="text-amber-300 text-[10px]">ძველი შეკვეთების {financialOverview.estimatedCogsItems} ერთეულზე გამოყენებულია პროდუქტის მიმდინარე თვითღირებულება და არა გაყიდვის დღის ისტორიული ფასი.</p>}
              </div>
              <div className="bg-slate-900/80 border border-rose-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">გასავლები — კატეგორიების მიხედვით</h3>
                  <span className="text-[10px] text-slate-400">ჩანაწერები: {expenses.length}</span>
                </div>
                {expenseBreakdown.length === 0 ? <p className="text-slate-500 text-xs py-4">არჩეულ პერიოდში ხარჯები არ არის.</p> : expenseBreakdown.map(expense => (
                  <div key={expense.label} className="flex justify-between gap-3 text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-300">{expense.label} <span className="text-slate-500">({expense.count} ჩანაწერი)</span></span>
                    <b className="text-rose-400 whitespace-nowrap">{expense.amount.toFixed(2)} ₾</b>
                  </div>
                ))}
                <div className="border-t border-rose-500/20 pt-3 space-y-2">
                  <p className="text-[10px] font-black text-slate-300">ბოლო ხარჯების ჩანაწერები</p>
                  {financialOverview.periodExpenses.slice(0,5).map(expense => (
                    <div key={expense.id} className="flex justify-between gap-3 text-[10px]">
                      <span className="text-slate-400">{expense.date || 'თარიღი უცნობია'} · {expense.description || expense.category}</span>
                      <b className="text-rose-300 whitespace-nowrap">-{(Number(expense.amount)||0).toFixed(2)} ₾</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-slate-900/80 border border-cyan-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">პროდუქტების მომგებიანობა</h3>
                  <span className="text-[10px] text-slate-400">არჩეული პერიოდი</span>
                </div>
                {financialOverview.productProfitability.length === 0 ? <p className="text-slate-500 text-xs py-4">პროდუქტის გაყიდვები არ არის.</p> : financialOverview.productProfitability.map(item => (
                  <div key={item.key} className="border-b border-slate-800 pb-3 space-y-1.5">
                    <div className="flex justify-between gap-3 text-xs"><b className="text-white">{item.name}</b><span className="text-slate-400">{item.quantity} ც.</span></div>
                    <p className="text-[10px] text-slate-400">{item.vendor} · {item.category}</p>
                    <div className="flex flex-wrap justify-between gap-2 text-[11px]"><span className="text-slate-300">შემოსავალი: {item.revenue.toFixed(2)} ₾</span><span className="text-slate-300">თვითღირებულება: {item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2) + ' ₾'}</span></div>
                    <div className="flex justify-between gap-2 text-xs"><b className={item.grossProfit === null ? 'text-amber-300' : item.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>მოგება: {item.grossProfit === null ? '—' : item.grossProfit.toFixed(2) + ' ₾'}</b><span className="text-slate-400">მარჟა: {item.margin === null ? '—' : item.margin.toFixed(1) + '%'}</span></div>
                    {item.unknownCostItems > 0 && <p className="text-[10px] text-amber-300">თვითღირებულება აკლია {item.unknownCostItems} ერთეულს.</p>}
                    {item.estimatedCostItems > 0 && <p className="text-[10px] text-amber-300">მიმდინარე ფასით შეფასებულია {item.estimatedCostItems} ერთეული; მოგება დადასტურებული არ არის.</p>}
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/80 border border-indigo-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">მომწოდებლების მომგებიანობა</h3>
                  <span className="text-[10px] text-slate-400">პროდუქტები და გაყიდვები</span>
                </div>
                {financialOverview.vendorProfitability.length === 0 ? <p className="text-slate-500 text-xs py-4">მომწოდებლის გაყიდვები არ არის.</p> : financialOverview.vendorProfitability.map(item => (
                  <div key={item.name} className="border-b border-slate-800 pb-3 space-y-1.5">
                    <div className="flex justify-between gap-3 text-xs"><b className="text-white">{item.name}</b><span className="text-slate-400">{item.productCount} პროდუქტი · {item.quantity} ც.</span></div>
                    <div className="flex flex-wrap justify-between gap-2 text-[11px]"><span className="text-slate-300">შემოსავალი: {item.revenue.toFixed(2)} ₾</span><span className="text-slate-300">თვითღირებულება: {item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2) + ' ₾'}</span></div>
                    <div className="flex justify-between gap-2 text-xs"><b className={item.grossProfit === null ? 'text-amber-300' : item.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>მოგება: {item.grossProfit === null ? '—' : item.grossProfit.toFixed(2) + ' ₾'}</b><span className="text-slate-400">მარჟა: {item.margin === null ? '—' : item.margin.toFixed(1) + '%'}</span></div>
                    {item.unknownCostItems > 0 && <p className="text-[10px] text-amber-300">თვითღირებულება აკლია {item.unknownCostItems} ერთეულს.</p>}
                    {item.estimatedCostItems > 0 && <p className="text-[10px] text-amber-300">მიმდინარე ფასით შეფასებულია {item.estimatedCostItems} ერთეული; მოგება დადასტურებული არ არის.</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
                <h3 className="font-black text-white text-base flex items-center gap-2.5">
                  <PackageCheck className="w-5 h-5 text-emerald-400" /> ბოლო შეკვეთები ვიტრინიდან
                </h3>
                <button onClick={() => setAdminTab('orders')} className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer">ყველას ნახვა →</button>
              </div>

              <div className="space-y-3">
                {(!orders || orders.length === 0) ? (
                  <p className="text-slate-500 text-xs py-6 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
                ) : (
                  orders.slice(0, 5).map(o => (
                    <div key={o.id} className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-inner">
                      <div>
                        <span className="font-black text-emerald-400">#{o.id}</span>
                        <span className="text-white font-bold ml-2 sm:ml-3">{o.customerName}</span>
                        <span className="text-slate-500 text-[10px] ml-2">({o.date})</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        <span className="font-black text-white">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL) : o.totalGEL + ' ₾'}</span>
                        <span className={`${getOrderStatusClasses(o.status || 'ახალი')} px-3 py-1 rounded-xl text-[10px] font-bold`}>{o.status || 'ახალი'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'calculator' && (
          <div className="admin-profit-calculator bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-6 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Calculator className="w-5 h-5 text-emerald-400" /> გაყიდვებისა და მოგების კალკულატორი
            </h3>
            <div className="admin-calculator-layout grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">თვითღირებულება (₾)</label>
                    <input type="number" value={calcForm.purchaseCost} onChange={e => setCalcForm({...calcForm, purchaseCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">გასაყიდი ფასი (₾)</label>
                    <input type="number" value={calcForm.sellingPrice} onChange={e => setCalcForm({...calcForm, sellingPrice: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">ფასდაკლება (%)</label>
                    <input type="number" value={calcForm.discountPercent} onChange={e => setCalcForm({...calcForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">მიწოდება / ხარჯი (₾)</label>
                    <input type="number" value={calcForm.shippingCost} onChange={e => setCalcForm({...calcForm, shippingCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                </div>
              </div>
              <div className="admin-calculator-results bg-slate-950/80 border border-emerald-500/30 p-6 rounded-3xl space-y-3 shadow-inner flex flex-col justify-center">
                <h4 className="font-black text-emerald-400 text-sm mb-1">გამოთვლილი მონაცემები</h4>
                <div className="flex justify-between"><span>ფასდაკლებული ფასი:</span><b className="text-white">{calculatedSalesMetrics.discountedPrice.toFixed(2)} ₾</b></div>
                <div className="flex justify-between"><span>მთლიანი მოგება:</span><b className="text-emerald-400">{calculatedSalesMetrics.grossProfit.toFixed(2)} ₾</b></div>
                <div className="flex justify-between"><span>წმინდა მოგება:</span><b className="text-cyan-400 text-base">{calculatedSalesMetrics.netProfit.toFixed(2)} ₾</b></div>
                <div className="flex justify-between"><span>მარჟა (Margin):</span><b className="text-amber-400">{calculatedSalesMetrics.profitMargin.toFixed(1)}%</b></div>
                <div className="flex justify-between"><span>მარკაპი (Markup):</span><b className="text-indigo-400">{calculatedSalesMetrics.markup.toFixed(1)}%</b></div>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'expenses' && (
          <div className="admin-expenses space-y-6">
            <div className="admin-staff-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Wallet className="w-5 h-5 text-emerald-400" /> ახალი ხარჯის დამატება (Supabase ბაზაში)
              </h3>
              <form onSubmit={handleAddExpense} className="admin-expense-form space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none">
                    <option value="რეკლამა & მარკეტინგი">რეკლამა & მარკეტინგი</option>
                    <option value="საიტი & ჰოსტინგი">საიტი & ჰოსტინგი</option>
                    <option value="მიწოდება">მიწოდება</option>
                    <option value="ხელფასები">ხელფასები</option>
                    <option value="შეფუთვა">შეფუთვა</option>
                    <option value="სხვა ოპერაციული">სხვა ოპერაციული</option>
                  </select>
                  <input type="number" required placeholder="თანხა (₾)" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                </div>
                <input type="text" required placeholder="აღწერა (მაგ: Facebook Ads)" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition cursor-pointer shadow-lg">+ ხარჯის დამატება ბაზაში</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-4 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">ხარჯების ისტორია ბაზიდან ({expenses.length})</h3>
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">ხარჯები ჯერ არ არის დამატებული.</p>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="admin-expense-row bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 flex justify-between items-center text-xs shadow-inner">
                      <div>
                        <b className="text-white">{exp.description}</b> <span className="text-slate-400">({exp.category})</span> 
                        <span className="text-slate-500 text-[10px] ml-2">{exp.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-rose-400">-{exp.amount} ₾</span>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'ai_analyst' && (
          <div className="admin-ai-analyst bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-6 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" /> AI ბიზნეს ასისტენტი & ანალიტიკოსი
            </h3>
            <div className="admin-ai-chat bg-slate-950/80 border border-emerald-500/20 p-5 rounded-3xl space-y-4 max-h-[400px] overflow-y-auto text-xs shadow-inner">
              {aiChatLogs.map((log, idx) => (
                <div key={idx} className={`admin-ai-message flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`admin-ai-bubble max-w-[85%] p-4 rounded-2xl ${log.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-200 border border-emerald-500/20'}`}>
                    {log.text}
                  </div>
                </div>
              ))}
              {isAiThinking && <div className="text-emerald-400 italic text-[11px]">AI აანალიზებს ბიზნეს მონაცემებს...</div>}
            </div>
            <form onSubmit={handleAiAsk} className="admin-ai-composer flex gap-3">
              <input type="text" placeholder="დასვით კითხვა (მაგ: რა არის ჩვენი სუფთა მოგება?)..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} className="flex-1 bg-slate-950 border border-emerald-500/25 p-4 rounded-2xl text-xs text-white outline-none shadow-inner" />
              <button type="submit" className="bg-emerald-500 text-slate-950 font-black px-6 py-4 rounded-2xl cursor-pointer shadow-lg">გაგზავნა</button>
            </form>
          </div>
        )}

        {adminTab === 'staff' && (
          <div className="admin-staff space-y-6">
            <div role="note" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-6 text-amber-100">
              <strong className="block mb-1">მნიშვნელოვანი: თანამშრომლების მართვა ჯერ რეალურ ავტორიზაციასთან დაკავშირებული არ არის.</strong>
              ეს სია ინახება მხოლოდ ამ ბრაუზერის localStorage-ში. აქ დამატება, როლის ან მოდულების შეცვლა არ ქმნის Supabase ანგარიშს და არ ანიჭებს მონაცემებზე ან ადმინისტრატორის პანელზე წვდომას. სერვერზე დაცული მოქმედებები კვლავ მხოლოდ მთავარ ადმინისტრატორს შეუძლია.
            </div>
            <div className="admin-staff-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Users className="w-5 h-5 text-emerald-400" /> რეგისტრირებული მომხმარებლის ლოკალურ თანამშრომელთა სიაში დამატება
              </h3>
              <form onSubmit={handleAddExistingUserAsStaff} className="admin-staff-existing-form grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <select 
                  value={selectedUserEmailForStaff} 
                  onChange={e => setSelectedUserEmailForStaff(e.target.value)} 
                  className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-bold outline-none focus:border-emerald-400 shadow-inner sm:col-span-2 cursor-pointer"
                >
                  <option value="">-- აირჩიეთ საიტზე რეგისტრირებული მომხმარებელი --</option>
                  {(usersList || []).map(u => (
                    <option key={u.id || u.email} value={u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email} {u.isVip ? '⭐ VIP' : ''}
                    </option>
                  ))}
                </select>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl transition cursor-pointer shadow-lg">
                  + სიაში დამატება
                </button>
              </form>
            </div>

            <div className="admin-staff-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <UserCog className="w-5 h-5 text-emerald-400" /> თანამშრომლის ლოკალური ჩანაწერი & სასურველი მოდულები
              </h3>
              <form onSubmit={handleAddStaff} className="admin-staff-create-form space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <input type="text" placeholder="თანამშრომლის სახელი *" required value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="email" placeholder="ელ-ფოსტა *" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-bold outline-none focus:border-emerald-400 shadow-inner cursor-pointer">
                    <option value="მენეჯერი">მენეჯერი</option>
                    <option value="ოპერატორი">ოპერატორი</option>
                    <option value="ფინანსისტი">ფინანსისტი</option>
                    <option value="პროდუქტების მენეჯერი">პროდუქტების მენეჯერი</option>
                  </select>
                </div>

                <div className="admin-staff-permissions bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 space-y-2">
                  <span className="text-slate-400 font-bold block mb-2">სასურველი მოდულები (წვდომას არ ანიჭებს):</span>
                  <div className="admin-staff-permission-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: 'products', label: 'პროდუქტების მართვა' },
                      { key: 'orders', label: 'შეკვეთების მართვა' },
                      { key: 'analytics', label: 'ანალიტიკა' },
                      { key: 'expenses', label: 'ხარჯები & ფინანსები' },
                      { key: 'crm', label: 'CRM მომხმარებლები' },
                      { key: 'settings', label: 'საიტის პარამეტრები' }
                    ].map(p => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold">
                        <input 
                          type="checkbox" 
                          checked={staffForm.permissions[p.key] || false}
                          onChange={e => {
                            const val = e.target.checked;
                            setStaffForm(prev => ({
                              ...prev,
                              permissions: { ...prev.permissions, [p.key]: val }
                            }));
                          }}
                          className="accent-emerald-400 w-4 h-4 rounded cursor-pointer"
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition cursor-pointer shadow-lg">+ ლოკალურ სიაში დამატება</button>
              </form>
            </div>

            <div className="admin-staff-list-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-4 shadow-2xl backdrop-blur-2xl">
              <h3 className="admin-staff-list-title font-black text-white text-base">ლოკალური თანამშრომელთა ჩანაწერები ({staffList.length})</h3>
              <div className="admin-staff-cards-list space-y-3">
                {staffList.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">თანამშრომლები არ არიან დამატებული.</p>
                ) : (
                  staffList.map(st => {
                    const isEditing = editingStaffId === st.id;

                    return (
                      <div key={st.id} className="admin-staff-card bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-emerald-500/20 space-y-3 shadow-inner">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <b className="text-white text-sm">{st.name}</b>
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">{st.role}</span>
                            </div>
                            <p className="admin-staff-member-email text-slate-400 text-[11px] mt-0.5">📧 {st.email}</p>
                          </div>

                          <div className="admin-staff-actions flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button 
                              onClick={() => {
                                if (isEditing) {
                                  setEditingStaffId(null);
                                } else {
                                  setEditingStaffId(st.id);
                                  setEditStaffRole(st.role || 'მენეჯერი');
                                  setEditStaffPermissions({ ...(st.permissions || {}) });
                                }
                              }}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/20 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> უფლებების შეცვლა
                            </button>
                            <button onClick={() => handleDeleteStaff(st.id, st.name)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {!isEditing && (
                          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                            {Object.entries(st.permissions || {}).map(([key, val]) => (
                              <span key={key} className={`admin-staff-permission-chip px-2.5 py-1 rounded-xl border ${val ? 'is-enabled bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'is-disabled bg-slate-900 text-slate-500 border-slate-800'}`}>
                                <span>{({ products: 'პროდუქტები', orders: 'შეკვეთები', analytics: 'ანალიტიკა', expenses: 'ფინანსები', crm: 'CRM მომხმარებლები', settings: 'საიტის პარამეტრები' })[key] || key}</span>
                                <span aria-label={val ? 'ჩართულია' : 'გამორთულია'}>{val ? '✓' : '✕'}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {isEditing && (
                          <div className="admin-staff-edit-panel bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-in fade-in text-xs">
                            <div className="space-y-1">
                              <label className="text-slate-400 font-bold">როლი</label>
                              <input 
                                type="text" 
                                value={editStaffRole} 
                                onChange={e => setEditStaffRole(e.target.value)} 
                                className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none" 
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 font-bold block">უფლებები:</span>
                              <div className="admin-staff-edit-permissions grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                  { key: 'products', label: 'პროდუქტები' },
                                  { key: 'orders', label: 'შეკვეთები' },
                                  { key: 'analytics', label: 'ანალიტიკა' },
                                  { key: 'expenses', label: 'ხარჯები' },
                                  { key: 'crm', label: 'CRM' },
                                  { key: 'settings', label: 'პარამეტრები' }
                                ].map(p => (
                                  <label key={p.key} className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold">
                                    <input 
                                      type="checkbox" 
                                      checked={editStaffPermissions[p.key] || false}
                                      onChange={e => {
                                        const val = e.target.checked;
                                        setEditStaffPermissions(prev => ({ ...prev, [p.key]: val }));
                                      }}
                                      className="accent-amber-400 w-3.5 h-3.5 rounded cursor-pointer"
                                    />
                                    <span>{p.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => setEditingStaffId(null)} className="px-3 py-1.5 bg-slate-950 text-slate-400 rounded-xl font-bold">გაუქმება</button>
                              <button onClick={() => handleSaveEditedStaff(st.id)} className="px-4 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-black">ცვლილებების შენახვა</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📦 შეკვეთების სრული და პროფესიონალური მართვის პანელი */}
        {adminTab === 'orders' && (
          <div className="admin-orders-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6 shadow-2xl backdrop-blur-2xl">
            <div className="admin-orders-header admin-orders-heading flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/20 pb-5">
              <div>
                <h3 className="font-black text-white text-lg flex items-center gap-2.5">
                  <PackageCheck className="w-6 h-6 text-emerald-400" /> შეკვეთების სრული მართვის სისტემა ({filteredOrders.length})
                </h3>
                <p className="text-xs text-slate-400 mt-1">მართეთ, გაფილტრეთ და აკონტროლეთ თითოეული შეკვეთა დეტალურად</p>
              </div>
              <button 
                onClick={handleExportOrders}
                className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> შეკვეთების ექსპორტი (CSV)
              </button>
            </div>

            {/* ძებნა და სტატუსების ფილტრაცია */}
            <div className="admin-orders-toolbar admin-orders-controls flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="admin-order-search admin-orders-search relative w-full sm:w-80">
                <input 
                  type="text" 
                  placeholder="ძებნა ნომრით, სახელით, ტელეფონით..." 
                  value={orderSearchQuery} 
                  onChange={e => { setOrderSearchQuery(e.target.value); setCurrentOrderPage(1); }} 
                  className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" 
                />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
              </div>

              <div className="admin-order-status-filters flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-emerald-500/20 w-full sm:w-auto overflow-x-auto">
                {['ყველა', 'ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული'].map(st => (
                  <button 
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer transition whitespace-nowrap ${orderStatusFilter === st ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* შეკვეთების სია */}
            <div className="admin-orders-list space-y-4">
              {filteredOrders.length === 0 ? (
                <p className="text-slate-500 text-xs py-10 text-center">შეკვეთები ვერ მოიძებნა.</p>
              ) : (
                paginatedOrders.map(o => (
                  <div key={o.id} className="admin-order-card bg-slate-950/70 p-5 rounded-3xl border border-emerald-500/20 flex flex-col gap-4 text-xs shadow-inner hover:border-emerald-500/40 transition">
                    <div className="admin-order-card-heading flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="font-black text-emerald-400 text-sm">#{o.id}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({o.date} {o.time || ''})</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-black text-white text-base">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL) : o.totalGEL + ' ₾'}</span>
                      </div>
                    </div>

                    <div className="admin-order-card-customer grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <p>მყიდველი: <b className="text-white">{o.customerName}</b></p>
                      <p>ტელეფონი: <b className="text-emerald-300">📞 {o.phone}</b></p>
                      <p className="sm:col-span-2 text-slate-400 text-[11px]">📍 მისამართი: {o.address}</p>
                      {o.adminNote && <p className="sm:col-span-2 text-amber-300 text-[11px] italic">📝 შენიშვნა: "{o.adminNote}"</p>}
                    </div>

                    {!o.stock_deducted_at && (
                      <div className="admin-order-stock-warning rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-[11px] leading-relaxed">
                        ⚠️ ძველი შეკვეთა — მარაგის ჩამოჭრა სისტემაში დადასტურებული არ არის. გაუქმებისას მარაგი ავტომატურად არ აღდგება. გაუქმებამდე გადაამოწმეთ პროდუქტის რეალური მარაგი.
                      </div>
                    )}

                    <div className="admin-order-card-footer flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">სტატუსი:</span>
                        <span className={`admin-order-status-badge ${getOrderStatusClasses(o.status || 'ახალი')} px-3 py-1 rounded-xl text-[10px] font-black`}>
                          {o.status || 'ახალი'}
                        </span>
                      </div>

                      <div className="admin-order-actions flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        <button 
                          onClick={() => {
                            setSelectedOrderForModal(o);
                            setOrderAdminNoteInput(o.adminNote || '');
                          }} 
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                        >
                          <Eye className="w-4 h-4 text-emerald-400" /> სრული დეტალები
                        </button>

                        <button 
                          onClick={() => handlePrintInvoice(o)} 
                          title="ინვოისის ბეჭდვა"
                          className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                        >
                          <Printer className="w-4 h-4" /> ინვოისი
                        </button>

                        {isCancelledOrderStatus(o.status) ? (
                          o.stock_deducted_at && o.stock_restored_at ? (
                            <button
                              onClick={() => { setReactivationOrder(o); setReactivationPassword(''); setReactivationError(''); }}
                              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5 inline mr-1" /> ხელახლა გააქტიურება
                            </button>
                          ) : (
                            <span
                              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200 text-[10px] leading-relaxed"
                              title="რეაქტივაცია მოითხოვს მარაგის ჩამოჭრისა და აღდგენის დადასტურებულ ჩანაწერებს."
                            >
                              რეაქტივაცია მიუწვდომელია — მარაგის ისტორია არასრულია
                            </span>
                          )
                        ) : (
                          <div className="admin-order-status-actions flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-emerald-500/20 overflow-x-auto">
                            <button onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')} disabled={isDeliveredOrderStatus(o.status) || isShippedOrderStatus(o.status)} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'ახალი' ? 'bg-blue-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ახალი</button>
                            <button onClick={() => handleUpdateOrderStatus(o.id, 'მუშავდება')} disabled={isDeliveredOrderStatus(o.status) || isShippedOrderStatus(o.status)} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'მუშავდება' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                            <button onClick={() => handleUpdateOrderStatus(o.id, 'გაგზავნილი')} disabled={isDeliveredOrderStatus(o.status)} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'გაგზავნილი' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>გაგზავნილი</button>
                            <button onClick={() => handleUpdateOrderStatus(o.id, 'დასრულებული')} disabled={isDeliveredOrderStatus(o.status)} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${isDeliveredOrderStatus(o.status) ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ჩაბარებული</button>
                            <button onClick={() => handleUpdateOrderStatus(o.id, 'გაუქმებული')} disabled={isShippedOrderStatus(o.status) || isDeliveredOrderStatus(o.status)} title={isShippedOrderStatus(o.status) || isDeliveredOrderStatus(o.status) ? 'გაგზავნილი ან ჩაბარებული შეკვეთის გაუქმება დაბრუნების პროცესის გარეშე დაუშვებელია.' : undefined} className="px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white">გაუქმება</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {filteredOrders.length > ORDERS_PER_PAGE && (
                <div className="admin-orders-pagination flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/20 pt-4">
                  <p className="text-[11px] text-slate-400">ნაჩვენებია {(safeOrderPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(safeOrderPage * ORDERS_PER_PAGE, filteredOrders.length)} / {filteredOrders.length}</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <button type="button" onClick={() => setCurrentOrderPage(Math.max(1, safeOrderPage - 1))} disabled={safeOrderPage === 1} className="px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed">წინა</button>
                    {Array.from({ length: totalOrderPages }, (_, index) => index + 1).map(page => (
                      <button key={page} type="button" onClick={() => setCurrentOrderPage(page)} aria-current={safeOrderPage === page ? 'page' : undefined} className={`min-w-9 px-3 py-2 rounded-xl text-xs font-black transition ${safeOrderPage === page ? 'bg-emerald-500 text-slate-950' : 'border border-emerald-500/20 text-slate-300 hover:bg-slate-900'}`}>{page}</button>
                    ))}
                    <button type="button" onClick={() => setCurrentOrderPage(Math.min(totalOrderPages, safeOrderPage + 1))} disabled={safeOrderPage === totalOrderPages} className="px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed">შემდეგი</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🌟 ORDER DETAILS FULL MODAL (შეკვეთის დეტალური ხედვის მოდალი) */}
        {selectedOrderForModal && (
          <div className="admin-order-detail-overlay fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
            <div className="admin-order-detail-modal bg-[#0d0d10] border border-emerald-500/50 rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full space-y-6 text-xs text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
              
              <div className="admin-order-detail-header flex justify-between items-center border-b border-emerald-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                    <PackageCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 id="admin-order-detail-title" className="font-black text-base text-white">შეკვეთა #{selectedOrderForModal.id}</h3>
                    <p className="text-[11px] text-slate-400">თარიღი: {selectedOrderForModal.date} {selectedOrderForModal.time || ''}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrderForModal(null)} 
                  className="p-2.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl border border-emerald-500/20 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. მომხმარებლის სრული ინფორმაცია */}
              <div className="admin-order-customer bg-slate-900/80 p-5 rounded-3xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-400 text-sm mb-3">👤 მომხმარებლის სრული ინფორმაცია</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <p>სახელი და გვარი: <b className="text-white">{selectedOrderForModal.customerName}</b></p>
                  <p>ტელეფონი: <a href={`tel:${selectedOrderForModal.phone}`} className="text-emerald-300 font-black hover:underline">📞 {selectedOrderForModal.phone}</a></p>
                  <p>ელფოსტა: <b className="text-white">{selectedOrderForModal.user_email || 'მითითებული არ არის'}</b></p>
                  <p>სტატუსი: <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">{selectedOrderForModal.status || 'ახალი'}</span></p>
                  <p className="sm:col-span-2 text-slate-300 pt-1">📍 სრული მისამართი: <b className="text-white">{selectedOrderForModal.address}</b></p>
                </div>
              </div>

              {/* 2. პროდუქტების სრული ინფორმაცია და ფოტოები */}
              <div className="admin-order-items-section space-y-3">
                <h4 className="font-black text-emerald-400 text-sm">🛍️ შეკვეთილი პროდუქტები ({normalizeOrderItems(selectedOrderForModal.items).length || 1})</h4>
                
                <div className="space-y-3">
                  {normalizeOrderItems(selectedOrderForModal.items).length > 0 ? (
                    normalizeOrderItems(selectedOrderForModal.items).map((item, idx) => (
                      <div key={idx} className="admin-order-item bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-16 h-16 object-contain bg-slate-900 p-1.5 rounded-2xl border border-emerald-500/20 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 text-[10px] shrink-0">No Img</div>
                        )}
                        <div className="admin-order-item-info flex-1 space-y-1">
                          <h5 className="font-black text-white text-sm">{item.name}</h5>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                            {item.sku && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">SKU: <b>{item.sku}</b></span>}
                            {item.selectedSize && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ზომა: <b>{item.selectedSize}</b></span>}
                            {item.selectedColor && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ფერი: <b>{item.selectedColor}</b></span>}
                            {item.customVariantName && <span className="bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">ვარიანტი: <b>{item.customVariantName}</b></span>}
                            {item.gift_wrap === true && <span className="bg-amber-950/40 text-amber-200 px-2 py-0.5 rounded border border-amber-800/60">სასაჩუქრე შეფუთვა (+5 ₾)</span>}
                            {item.vip_warranty === true && <span className="bg-amber-950/40 text-amber-200 px-2 py-0.5 rounded border border-amber-800/60">VIP გარანტია (+15 ₾)</span>}
                            <span>რაოდენობა: <b>{item.quantity || 1}</b></span>
                          </div>
                          {item.gift_message && <p className="text-amber-200 text-[11px] break-words">სასაჩუქრე ტექსტი: {item.gift_message}</p>}
                        </div>
                        <div className="admin-order-item-price text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                          <span className="text-slate-400 text-[10px]">ერთეულის ფასი: {item.priceGEL || item.price || 0} ₾</span>
                          <span className="font-black text-emerald-400 text-sm">{formatPrice ? formatPrice((item.priceGEL || item.price || 0) * (item.quantity || 1)) : ((item.priceGEL || item.price || 0) * (item.quantity || 1)) + ' ₾'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 text-slate-300">
                      <p>{selectedOrderForModal.itemSummary || 'პროდუქტების დეტალური სია არ არის ხელმისაწვდომი.'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. შეკვეთის ფინანსური დეტალები */}
              <div className="admin-order-financials bg-slate-900/80 p-5 rounded-3xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-400 text-sm mb-2">💳 შეკვეთის თანხა</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">გადახდის მეთოდი და გადახდის სტატუსი ამ შეკვეთის მონაცემებში ხელმისაწვდომი არ არის.</p>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>შეკვეთის ჯამი:</span>
                  <span className="text-emerald-400 text-lg">{formatPrice ? formatPrice(selectedOrderForModal.totalGEL) : selectedOrderForModal.totalGEL + ' ₾'}</span>
                </div>
              </div>

              {/* 4. ადმინისტრატორის პირადი შენიშვნა */}
              <div className="admin-order-note-editor space-y-2">
                <label className="text-slate-300 font-bold block">📝 ადმინისტრატორის პირადი შენიშვნა შეკვეთაზე:</label>
                <div className="admin-order-note-controls flex gap-2">
                  <input 
                    type="text" 
                    maxLength={5000}
                    placeholder="ჩაწერეთ შენიშვნა (მაგ: კლიენტმა ითხოვა 14:00 საათზე მოტანა)..." 
                    value={orderAdminNoteInput}
                    disabled={isSavingOrderNote}
                    onChange={e => setOrderAdminNoteInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-emerald-500/20 p-3 rounded-2xl text-white outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveOrderAdminNote(selectedOrderForModal.id)}
                    disabled={isSavingOrderNote}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingOrderNote ? 'ინახება…' : 'შენახვა'}
                  </button>
                </div>
              </div>

              {/* მოდალის ქვედა ღილაკები */}
              <div className="admin-order-detail-footer flex gap-3 pt-2">
                <button 
                  onClick={() => handlePrintInvoice(selectedOrderForModal)} 
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-black py-3.5 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> ინვოისის ბეჭდვა / PDF
                </button>
                <button 
                  onClick={() => setSelectedOrderForModal(null)} 
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl transition cursor-pointer"
                >
                  დახურვა
                </button>
              </div>

            </div>
          </div>
        )}

        {adminTab === 'support' && (
          <div className="admin-support-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <HelpCircle className="w-5 h-5 text-emerald-400" /> მომხმარებელთა მხარდაჭერა და პასუხები ({supportTickets?.length || 0})
            </h3>
            <div className="admin-support-list space-y-4">
              {(!supportTickets || supportTickets.length === 0) ? (
                <p className="text-slate-500 text-xs py-8 text-center">მხარდაჭერის ტიგეტები არ არის.</p>
              ) : (
                supportTickets.map(t => (
                  <div key={t.id} className="admin-support-ticket bg-slate-950/60 p-5 sm:p-6 rounded-3xl border border-emerald-500/20 space-y-4 text-xs shadow-inner">
                    <div className="admin-support-ticket-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                      <div className="admin-support-ticket-meta flex items-center gap-3 flex-wrap">
                        <span className="font-black text-emerald-400 text-sm">#{t.id}</span>
                        <span className="text-white font-black text-sm">{t.subject}</span>
                        <span className="text-slate-500 text-[10px]">({t.date})</span>
                      </div>
                      
                      <div className="admin-support-ticket-controls flex items-center gap-2.5 flex-wrap">
                        <div className="admin-support-status-actions flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-emerald-500/20">
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'ღია')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'ღია' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ღია</button>
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'მუშავდება')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მუშავდება' ? 'bg-emerald-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'მოგვარებული')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მოგვარებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მოგვარებული</button>
                        </div>
                        <button onClick={() => handleDeleteTicket(t.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="admin-support-ticket-content space-y-1.5">
                      <p className="text-slate-300">მომხმარებელი: <b className="text-white">{t.customerName}</b> ({t.email})</p>
                      <p className="admin-support-ticket-message text-slate-200 bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 mt-2">
                        <b className="text-emerald-400 block mb-1">კითხვა:</b> "{t.message}"
                      </p>
                    </div>

                    {t.reply && (
                      <div className="admin-support-ticket-reply bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-1 shadow">
                        <b className="text-emerald-400 block text-xs">ადმინისტრატორის პასუხი:</b>
                        <p className="text-slate-200">{t.reply}</p>
                      </div>
                    )}

                    <div className="admin-support-reply-form flex flex-col sm:flex-row gap-3 pt-2">
                      <input 
                        type="text" 
                        placeholder="დაწერეთ პასუხი მომხმარებლისთვის..." 
                        maxLength={4000}
                        value={replyInputs[t.id] !== undefined ? replyInputs[t.id] : ''}
                        onChange={e => setReplyInputs({...replyInputs, [t.id]: e.target.value})}
                        className="flex-1 bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                      />
                      <button 
                        onClick={() => handleSendTicketReply(t.id)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Send className="w-4 h-4" /> გაგზავნა
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {adminTab === 'products' && (
          <div className="admin-products-panel space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                <h3 className="font-black text-white text-base flex items-center gap-2.5">
                  <Plus className="w-5 h-5 text-emerald-400" /> {editingProductId ? 'პროდუქტის სრული რედაქტირება' : 'პროდუქტის დამატება (კატეგორიის მახასიათებლებით & ვარიანტებით)'}
                </h3>
                <button 
                  onClick={handleExportProducts}
                  className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" /> პროდუქტების ექსპორტი (CSV)
                </button>
              </div>

              <form id="geostore-product-form" onSubmit={handleSaveProduct} className="admin-product-form space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">პროდუქტის დასახელება *</label>
                    <input type="text" required placeholder="მაგ: ჰუდი / iPhone" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">გასაყიდი ფასი (GEL) *</label>
                    <input type="number" required placeholder="99" value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-black outline-none focus:border-emerald-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">თვითღირებულება (COGS ₾)</label>
                    <input type="number" placeholder="45" value={productForm.purchaseCost} onChange={e => setProductForm({...productForm, purchaseCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-cyan-400 font-bold outline-none focus:border-emerald-400 shadow-inner" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">კატეგორია *</label>
                    <select 
                      value={productForm.category} 
                      onChange={e => handleCategoryChange(e.target.value)} 
                      className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-bold outline-none focus:border-emerald-400 shadow-inner cursor-pointer"
                    >
                      {safeCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">ბრენდი</label>
                    <input type="text" placeholder="Apple / Nike" value={productForm.brand} onChange={e => setProductForm({...productForm, brand: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">მარაგი</label>
                    <input type="number" min="0" step="1" inputMode="numeric" placeholder="10" value={productForm.stock} disabled={Boolean(editingProductId)} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner disabled:opacity-60 disabled:cursor-not-allowed" />
                    {editingProductId && <p className="mt-1 text-[11px] leading-relaxed text-amber-300">არსებული პროდუქტის მარაგი შეცვალეთ პროდუქტის სიაში — შეკვეთების ჩამოჭრა უსაფრთხოდ იქნება გათვალისწინებული.</p>}
                  </div>
                </div>

                <div className="admin-product-attributes bg-slate-950 p-5 rounded-3xl border border-emerald-500/30 space-y-4 shadow-inner">
                  <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> 
                    <span>კატეგორიის მახასიათებლები: {productForm.category}</span>
                  </h4>

                  {isClothing && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ზომები</label>
                        <input type="text" value={productForm.availableSizes.join(', ')} onChange={e => setProductForm({...productForm, availableSizes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">მასალა</label>
                        <input type="text" placeholder="100% ბამბა" value={productForm.material} onChange={e => setProductForm({...productForm, material: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productForm.availableColors.join(', ')} onChange={e => setProductForm({...productForm, availableColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                    </div>
                  )}

                  {isShoes && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ზომები (EU)</label>
                        <input type="text" value={productForm.availableSizes.join(', ')} onChange={e => setProductForm({...productForm, availableSizes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">მასალა</label>
                        <input type="text" placeholder="ტყავი" value={productForm.material} onChange={e => setProductForm({...productForm, material: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productForm.availableColors.join(', ')} onChange={e => setProductForm({...productForm, availableColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                    </div>
                  )}

                  {isLaptop && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">პროცესორი (CPU)</label>
                        <input type="text" placeholder="Apple M3 / Intel i7" value={productForm.cpu} onChange={e => setProductForm({...productForm, cpu: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">RAM</label>
                        <input type="text" placeholder="16GB" value={productForm.ram} onChange={e => setProductForm({...productForm, ram: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">SSD</label>
                        <input type="text" placeholder="512GB" value={productForm.storage} onChange={e => setProductForm({...productForm, storage: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                    </div>
                  )}

                  {isPhone && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">მეხსიერება</label>
                        <input type="text" value={productForm.availableSizes.join(', ')} onChange={e => setProductForm({...productForm, availableSizes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">RAM</label>
                        <input type="text" placeholder="8GB" value={productForm.ram} onChange={e => setProductForm({...productForm, ram: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productForm.availableColors.join(', ')} onChange={e => setProductForm({...productForm, availableColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                    </div>
                  )}

                  {!isClothing && !isShoes && !isLaptop && !isPhone && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ზომები</label>
                        <input type="text" value={productForm.availableSizes.join(', ')} onChange={e => setProductForm({...productForm, availableSizes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productForm.availableColors.join(', ')} onChange={e => setProductForm({...productForm, availableColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-product-variants-editor bg-slate-950 p-5 rounded-3xl border border-amber-500/30 space-y-3">
                  <h4 className="text-amber-400 font-black text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> ინდივიდუალური ვარიანტები</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">თითოეულ ვარიანტს აქვს საკუთარი ფასი და მარაგი. შეკვეთისას ორივე სერვერზე მოწმდება.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input value={newVarName} onChange={e => setNewVarName(e.target.value)} maxLength={80} placeholder="ვარიანტის სახელი" className="sm:col-span-2 min-w-0 bg-slate-900 border border-amber-500/20 p-3 rounded-xl text-white text-xs outline-none" />
                    <input value={newVarPrice} onChange={e => setNewVarPrice(e.target.value)} inputMode="decimal" placeholder="ფასი ₾" className="min-w-0 bg-slate-900 border border-amber-500/20 p-3 rounded-xl text-white text-xs outline-none" />
                    <input value={newVarStock} onChange={e => setNewVarStock(e.target.value)} inputMode="numeric" placeholder="მარაგი (ც.)" className="min-w-0 bg-slate-900 border border-amber-500/20 p-3 rounded-xl text-white text-xs outline-none" />
                    <button type="button" onClick={() => handleAddCustomVariant({ preventDefault: () => {} })} className="sm:col-span-4 rounded-xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950">ვარიანტის დამატება</button>
                  </div>
                  {productVariants.length ? <div className="space-y-2">{productVariants.map(variant => (
                    <div key={variant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 p-3 text-xs">
                      <div className="min-w-0"><b className="text-white">{variant.name}</b><span className="ml-2 text-amber-300">{Number(variant.priceGEL).toFixed(2)} ₾</span><span className="ml-2 text-slate-400">მარაგი: {variant.stock}</span></div>
                      <button type="button" onClick={() => handleRemoveCustomVariant(variant.id)} className="rounded-lg bg-rose-500/10 px-3 py-2 font-bold text-rose-300">წაშლა</button>
                    </div>
                  ))}</div> : <p className="text-slate-500 text-xs">ვარიანტები ჯერ არ არის დამატებული.</p>}
                </div>

                <div className="admin-product-gallery space-y-3 bg-slate-950 p-5 rounded-3xl border border-emerald-500/20 shadow-inner">
                  <label className="text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-emerald-400" /> აირჩიეთ ფოტოები გალერეიდან:
                  </label>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="w-full text-slate-400 text-xs file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer" />
                  
                  {selectedImages.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pt-3 pb-1">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 bg-slate-900 border border-emerald-500/20 rounded-2xl p-1.5 shrink-0 shadow-lg">
                          <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                          <button type="button" onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[11px] font-black flex items-center justify-center shadow cursor-pointer">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {editingProductId && <button type="button" onClick={resetProductEditor} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold p-3 rounded-2xl">რედაქტირების გაუქმება</button>}
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-xs">
                  {editingProductId ? 'ცვლილებების შენახვა' : 'პროდუქტის ბაზაში შენახვა'} 🚀
                </button>
              </form>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                <h3 className="admin-product-inventory-title font-black text-white text-base">ბაზაში არსებული პროდუქტები & COGS ({products?.length || 0})</h3>
                <div className="admin-product-search relative w-full sm:w-72">
                  <input type="text" placeholder="ძებნა პროდუქტებში..." value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="admin-products-list space-y-3.5">
                {filteredProducts?.map(p => (
                  <div key={p.id} className="admin-product-row bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-inner">
                    <div className="admin-product-identity flex items-center gap-3.5">
                      {p.image ? <img src={p.image} alt="" loading="lazy" decoding="async" className="w-14 h-14 object-cover bg-slate-950 p-1 rounded-2xl border border-emerald-500/20 shrink-0" /> : <div className="w-14 h-14 flex items-center justify-center bg-slate-950 rounded-2xl border border-emerald-500/20 shrink-0 text-emerald-400"><ImageIcon className="w-5 h-5" /></div>}
                      <div>
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">კატეგორია: {p.category} | SKU: {p.sku || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="admin-product-controls flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">COGS:</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={quickProductDrafts['purchaseCost:' + String(p.id)] ?? String(p.purchaseCost !== undefined ? p.purchaseCost : (p.purchase_cost ?? 0))}
                          onChange={e => setQuickProductDrafts(prev => ({ ...prev, ['purchaseCost:' + String(p.id)]: e.target.value }))}
                          onBlur={e => {
                            const key = 'purchaseCost:' + String(p.id);
                            const draft = quickProductDrafts[key];
                            if (draft === undefined) return;
                            if (draft.trim() === '' || Number(draft) === Number(p.purchaseCost ?? p.purchase_cost ?? 0)) {
                              setQuickProductDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                              return;
                            }
                            handleQuickUpdateProduct(p.id, 'purchaseCost', draft);
                          }}
                          onKeyDown={e => {
                            const key = 'purchaseCost:' + String(p.id);
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') setQuickProductDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                          }}
                          className="w-20 bg-slate-950 border border-emerald-500/20 rounded-2xl p-2.5 text-cyan-400 font-black text-center outline-none shadow-inner"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">ფასი:</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={quickProductDrafts['priceGEL:' + String(p.id)] ?? String(p.priceGEL ?? p.price_gel ?? '')}
                          onChange={e => setQuickProductDrafts(prev => ({ ...prev, ['priceGEL:' + String(p.id)]: e.target.value }))}
                          onBlur={e => {
                            const key = 'priceGEL:' + String(p.id);
                            const draft = quickProductDrafts[key];
                            if (draft === undefined) return;
                            if (draft.trim() === '' || Number(draft) === Number(p.priceGEL ?? p.price_gel)) {
                              setQuickProductDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                              return;
                            }
                            handleQuickUpdateProduct(p.id, 'priceGEL', draft);
                          }}
                          onKeyDown={e => {
                            const key = 'priceGEL:' + String(p.id);
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') setQuickProductDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
                          }}
                          className="w-24 bg-slate-950 border border-emerald-500/20 rounded-2xl p-2.5 text-emerald-400 font-black text-center outline-none shadow-inner"
                        />
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900/70 border border-emerald-500/20 rounded-2xl px-2.5 py-1.5">
                        <span className="text-slate-300 text-[11px] font-bold">მარაგი:</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          aria-label={`მარაგი: ${p.name}`}
                          value={stockDrafts[String(p.id)] ?? String(p.stock ?? 0)}
                          onChange={e => setStockDrafts(prev => ({ ...prev, [String(p.id)]: e.target.value }))}
                          onBlur={e => {
                            const draft = stockDrafts[String(p.id)];
                            if (draft === undefined) return;
                            if (draft.trim() === '' || Number(draft) === Number(p.stock ?? 0)) {
                              setStockDrafts(prev => { const next = { ...prev }; delete next[String(p.id)]; return next; });
                              return;
                            }
                            handleQuickUpdateProduct(p.id, 'stock', draft);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') setStockDrafts(prev => { const next = { ...prev }; delete next[String(p.id)]; return next; });
                          }}
                          className="w-16 bg-slate-950 border border-emerald-500/20 rounded-xl p-2 text-center font-black text-white outline-none focus:border-emerald-400"
                        />
                        <span className={`text-[10px] font-black whitespace-nowrap ${Number(p.stock ?? 0) <= 0 ? 'text-rose-400' : Number(p.stock ?? 0) <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {Number(p.stock ?? 0) <= 0 ? 'არ არის' : Number(p.stock ?? 0) <= 3 ? 'ცოტაა' : 'მარაგშია'}
                        </span>
                      </div>

                      <button type="button" onClick={() => handleEditProduct(p)} className="text-sky-300 hover:text-sky-200 p-2.5 bg-sky-500/10 rounded-2xl cursor-pointer transition" title="პროდუქტის სრული რედაქტირება"><Edit3 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDeleteProduct(p.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'discounts' && (
          <div className="admin-discounts-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Zap className="w-5 h-5 text-emerald-400" /> მასობრივი ფლეშ-ფასდაკლებების გააქტიურება
            </h3>
            <form onSubmit={handleApplyFlashSale} className="admin-flash-sale-form space-y-4 text-xs">
              <div className="admin-flash-sale-fields grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">ფასდაკლება პროცენტულად (%)</label>
                  <input type="number" placeholder="მაგ: 20" required min="0.01" max="99.99" step="0.01" inputMode="decimal" value={flashSaleForm.discountPercent} onChange={e => setFlashSaleForm({...flashSaleForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">კატეგორია</label>
                  <select value={flashSaleForm.category} onChange={e => setFlashSaleForm({...flashSaleForm, category: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer">
                    <option value="ყველა">ყველა კატეგორია</option>
                    {safeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isApplyingFlashSale} className="admin-flash-sale-submit bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer">
                <Zap className="w-4 h-4" /> {isApplyingFlashSale ? 'მუშავდება...' : 'ფასდაკლების მასობრივად გააქტიურება'}
              </button>
            </form>
          </div>
        )}

        {adminTab === 'logs' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Activity className="w-5 h-5 text-emerald-400" /> სისტემური აქტივობების ჟურნალი (Audit Logs)
            </h3>
            <div className="space-y-3">
              {activityLogsLoading && <p className="text-xs text-slate-400">აქტივობების ისტორია იტვირთება...</p>}
              {activityLogsError && <p role="alert" className="text-xs text-amber-300 break-words">{activityLogsError}</p>}
              {!activityLogsLoading && activityLogs.length === 0 && !activityLogsError && (
                <p className="text-xs text-slate-400">შენახული აქტივობები ჯერ არ არის.</p>
              )}
              {activityLogs.map(log => (
                <div key={log.id} className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-inner">
                  <span className="font-bold text-slate-200 break-words min-w-0">{log.action}</span>
                  <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'broadcasts' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Send className="w-5 h-5 text-emerald-400" /> სატესტო შეტყობინება (მხოლოდ ამ მოწყობილობაზე)
            </h3>
            <p className="text-xs text-amber-300 leading-6">ეს ფუნქცია შეტყობინებას მხოლოდ ამ მოწყობილობის ბრაუზერში ინახავს. მომხმარებლებისთვის რეალური გაგზავნა ჯერ დაკავშირებული არ არის.</p>
            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">შეტყობინების სათაური</label>
                <input type="text" placeholder="მაგ: ახალი კოლექცია უკვე საიტზეა!" required value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">შეტყობინების ტექსტი</label>
                <textarea rows="4" placeholder="დაწერეთ შეტყობინება..." required value={broadcastForm.message} onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 resize-none shadow-inner" />
              </div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer">
                <Send className="w-4 h-4" /> სატესტო შეტყობინების შენახვა
              </button>
            </form>
          </div>
        )}

        {adminTab === 'banners' && (
          <div className="admin-banners space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Megaphone className="w-5 h-5 text-emerald-400" /> ახალი სარეკლამო ბანერის დამატება
              </h3>
              <form onSubmit={handleAddBanner} className="admin-banner-form space-y-4 text-xs">
                <div className="admin-banner-fields grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input type="text" placeholder="სათაური" required maxLength={120} value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="text" placeholder="ქვესათაური / აღწერა" maxLength={240} value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <input type="text" placeholder="ბანერის ფოტოს URL (HTTP/HTTPS)" maxLength={2048} value={bannerForm.image} onChange={e => setBannerForm({...bannerForm, image: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">ბანერის დამატება</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური ბანერები ({bannersList?.length || 0})</h3>
              <div className="admin-banner-list grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(bannersList || []).map(b => (
                  <div key={b.id} className="admin-banner-card bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs gap-3 shadow-inner">
                    <div className="flex items-center gap-3.5">
                      <img src={b.image} alt="" loading="lazy" decoding="async" className="w-16 h-12 object-cover rounded-2xl border border-emerald-500/20 shrink-0" />
                      <div>
                        <h4 className="font-black text-white text-sm">{b.title}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">{b.subtitle}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'categories' && (
          <div className="admin-category-manager space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <FolderTree className="w-5 h-5 text-emerald-400" /> ახალი მთავარი კატეგორიის ან სუბკატეგორიის დამატება (ფოტოს ატვირთვა კომპიუტერიდან/მობილურიდან)
              </h3>
              <form onSubmit={handleAddCategory} className="admin-category-form space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <input type="text" placeholder="სახელწოდება *" required maxLength={60} value={newCatName} onChange={e => setNewCatName(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer font-bold">
                    <option value="">📁 მთავარი კატეგორია (Parent)</option>
                    {mainCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>↳ ქვეშ: {cat.name}</option>
                    ))}
                  </select>
                  <select value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer">
                    <option value="Shirt">👕 ტანსაცმელი</option>
                    <option value="Footprints">👟 ფეხსაცმელი</option>
                    <option value="Gem">💎 აქსესუარები</option>
                    <option value="Smartphone">📱 სმარტფონი</option>
                    <option value="Laptop">💻 ლეპტოპი</option>
                    <option value="Watch">⌚ საათი</option>
                    <option value="Sparkles">✨ სხვა</option>
                  </select>
                </div>

                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 shadow-inner">
                  <label className="text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-emerald-400" /> ატვირთეთ კატეგორიის ფოტო / ბანერი (ኮምპიუტერიდან / მობილურიდან):
                  </label>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,image/gif" 
                    onChange={e => handleCategoryFileChange(e, false)} 
                    className="w-full text-slate-400 text-xs file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer" 
                  />
                  {newCatImage && (
                    <div className="relative w-24 h-24 bg-slate-900 border border-emerald-500/30 rounded-2xl p-1.5 mt-3 shadow-lg">
                      <img src={newCatImage} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <button 
                        type="button" 
                        onClick={() => setNewCatImage('')} 
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 text-xs font-black flex items-center justify-center shadow cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">კატეგორიის დამატება 🚀</button>
              </form>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">კატეგორიებისა და სუბკატეგორიების იერარქია და ფოტოების მართვა</h3>
              <p className="text-xs leading-relaxed text-slate-400 bg-slate-950/70 border border-slate-700 rounded-xl p-3">კატეგორიების დამატება, რედაქტირება და დალაგება ჯერ მონახაზში ინახება. ცვლილებების Supabase-ში შესანახად გამოიყენეთ „მონახაზის შენახვა“, ხოლო მომხმარებლებისთვის გამოსაჩენად — „გამოქვეყნება“.</p>
              <div className="admin-category-tree space-y-4">
                {mainCategories.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">მთავარი კატეგორიები არ არის.</p>
                ) : (
                  mainCategories.map(parentCat => {
                    const subCats = safeCategories.filter(c => c.parentId === parentCat.id);
                    const isEditingParent = editingCatId === parentCat.id;
                    const displayImage = parentCat.image || parentCat.img;

                    return (
                      <div key={parentCat.id} className="admin-category-card bg-slate-950/60 border border-emerald-500/20 rounded-3xl p-5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            {displayImage ? (
                              <img src={displayImage} alt="" loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-2xl border border-emerald-500/30 shrink-0 shadow-md" />
                            ) : (
                              <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold text-center">No Img</div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">📁 მთავარი</span>
                                <h4 className="font-black text-white text-sm">{parentCat.name}</h4>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => moveCategory(parentCat.id, -1)} disabled={mainCategories[0]?.id === parentCat.id} className="p-2 bg-slate-900 text-slate-300 border border-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed" title="კატეგორიის ზემოთ აწევა" aria-label={`კატეგორიის ${parentCat.name} ზემოთ აწევა`}><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => moveCategory(parentCat.id, 1)} disabled={mainCategories[mainCategories.length - 1]?.id === parentCat.id} className="p-2 bg-slate-900 text-slate-300 border border-slate-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed" title="კატეგორიის ქვემოთ ჩამოწევა" aria-label={`კატეგორიის ${parentCat.name} ქვემოთ ჩამოწევა`}><ChevronDown className="w-4 h-4" /></button>
                            {!isEditingParent && (
                              <button 
                                onClick={() => { setEditingCatId(parentCat.id); setEditCatName(parentCat.name); setEditCatIcon(parentCat.icon || 'Shirt'); setEditCatImage(displayImage || ''); }} 
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/20 rounded-xl cursor-pointer transition"
                                title="რედაქტირება"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteCategory(parentCat.id, parentCat.name)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {isEditingParent && (
                          <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-in fade-in">
                            <h5 className="font-black text-amber-400 text-xs">კატეგორიის რედაქტირება: {parentCat.name}</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-slate-400 text-[10px] block mb-1">სახელწოდება</label>
                                <input 
                                  type="text" maxLength={60}
                                  value={editCatName} 
                                  onChange={e => setEditCatName(e.target.value)} 
                                  className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 text-[10px] block mb-1">ატვირთეთ ახალი ფოტო კომპიუტერიდან</label>
                                <input 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp,image/gif" 
                                  onChange={e => handleCategoryFileChange(e, true)} 
                                  className="w-full text-slate-400 text-[10px] file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-amber-400 file:text-slate-950 file:font-black cursor-pointer"
                                />
                              </div>
                            </div>
                            {editCatImage && (
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/30 mt-2">
                                <img src={editCatImage} alt="Edit preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                              <button onClick={() => setEditingCatId(null)} className="px-3 py-1.5 bg-slate-950 text-slate-400 rounded-xl font-bold text-xs">გაუქმება</button>
                              <button onClick={() => handleSaveEditedCategory(parentCat.id)} className="px-4 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-black text-xs">შენახვა</button>
                            </div>
                          </div>
                        )}

                        {subCats.length > 0 && (
                          <div className="admin-subcategory-list pl-6 border-l-2 border-emerald-500/30 space-y-2 pt-2">
                            {subCats.map(sub => {
                              const isEditingSub = editingCatId === sub.id;
                              const subImg = sub.image || sub.img;
                              return (
                                <div key={sub.id} className="admin-subcategory-card bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/15 space-y-2">
                                  <div className="flex justify-between items-center text-xs gap-2">
                                    <div className="admin-subcategory-identity flex items-center gap-2.5 flex-1">
                                      <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      {subImg && <img src={subImg} alt="" loading="lazy" decoding="async" className="w-10 h-10 object-cover rounded-xl border border-emerald-500/20 shrink-0 shadow" />}
                                      <span className="font-bold text-slate-200">{sub.name}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button type="button" onClick={() => moveCategory(sub.id, -1)} disabled={subCats[0]?.id === sub.id} className="p-1.5 bg-slate-900 text-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title="სუბკატეგორიის ზემოთ აწევა" aria-label={`სუბკატეგორიის ${sub.name} ზემოთ აწევა`}><ChevronUp className="w-3.5 h-3.5" /></button>
                                      <button type="button" onClick={() => moveCategory(sub.id, 1)} disabled={subCats[subCats.length - 1]?.id === sub.id} className="p-1.5 bg-slate-900 text-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title="სუბკატეგორიის ქვემოთ ჩამოწევა" aria-label={`სუბკატეგორიის ${sub.name} ქვემოთ ჩამოწევა`}><ChevronDown className="w-3.5 h-3.5" /></button>
                                      {!isEditingSub && (
                                        <button 
                                          onClick={() => { setEditingCatId(sub.id); setEditCatName(sub.name); setEditCatIcon(sub.icon || 'Shirt'); setEditCatImage(subImg || ''); }} 
                                          className="p-1.5 bg-slate-900 text-amber-400 rounded-lg cursor-pointer"
                                          title="სუბკატეგორიის რედაქტირება"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button onClick={() => handleDeleteCategory(sub.id, sub.name)} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>

                                  {isEditingSub && (
                                    <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/30 space-y-2.5 animate-in fade-in">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input 
                                          type="text" maxLength={60}
                                          value={editCatName} 
                                          onChange={e => setEditCatName(e.target.value)} 
                                          placeholder="სახელი"
                                          className="bg-slate-950 border border-amber-500/20 p-2 rounded-lg text-white text-xs outline-none w-full"
                                        />
                                        <input 
                                          type="file" 
                                          accept="image/jpeg,image/png,image/webp,image/gif" 
                                          onChange={e => handleCategoryFileChange(e, true)} 
                                          className="w-full text-slate-400 text-[10px] file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:bg-amber-400 file:text-slate-950 file:font-black cursor-pointer"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingCatId(null)} className="px-2.5 py-1 bg-slate-950 text-slate-400 rounded-lg text-[10px]">გაუქმება</button>
                                        <button onClick={() => handleSaveEditedCategory(sub.id)} className="px-3 py-1 bg-amber-400 text-slate-950 rounded-lg font-black text-[10px]">შენახვა</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'coupons' && (
          <div className="admin-coupons-panel space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Tag className="w-5 h-5 text-emerald-400" /> ახალი კუპონის შექმნა
              </h3>
              <form onSubmit={handleCreateCoupon} className="admin-coupon-form grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                <input type="text" placeholder="კოდი" aria-label="კუპონის კოდი" required maxLength={64} value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 uppercase shadow-inner" />
                <input type="number" placeholder="ფასდაკლება %" aria-label="ფასდაკლება პროცენტებში" required min="0.01" max="100" step="0.01" inputMode="decimal" value={couponForm.discountPercent} onChange={e => setCouponForm({...couponForm, discountPercent: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <input type="number" placeholder="მინ. შეკვეთა (₾)" aria-label="მინიმალური შეკვეთის თანხა ლარში" min="0" max="1000000000" step="0.01" inputMode="decimal" value={couponForm.minOrderGEL} onChange={e => setCouponForm({...couponForm, minOrderGEL: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">კუპონის დამატება</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური კუპონები ({coupons?.length || 0})</h3>
              <div className="admin-coupon-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(coupons || []).map(c => (
                  <div key={c.id} className="admin-coupon-card bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs shadow-inner">
                    <div>
                      <h4 className="font-black text-emerald-400 text-sm tracking-wider">{c.code}</h4>
                      <p className="text-slate-300 font-bold mt-0.5">ფასდაკლება: {c.discountPercent}%</p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'vendors' && (
          <div className="admin-vendors-panel space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Store className="w-5 h-5 text-emerald-400" /> ახალი ვენდორის დამატება და კომისია
              </h3>
              <form onSubmit={handleAddVendor} className="admin-vendor-form grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <input type="text" placeholder="ვენდორის სახელი *" required maxLength={100} value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <input type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="კომისია %" required value={vendorForm.commission} onChange={e => setVendorForm({...vendorForm, commission: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5">
                  <Percent className="w-4 h-4" /> ვენდორის დამატება
                </button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური ვენდორები ({vendorsList?.length || 0})</h3>
              <div className="admin-vendor-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(vendorsList || []).map(v => (
                  <div key={v.id} className="admin-vendor-card bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs shadow-inner">
                    <div>
                      <h4 className="font-bold text-white text-sm">{v.name}</h4>
                      <p className="text-emerald-400 font-bold mt-0.5">კომისია: {v.commission}%</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[9px] font-black">{v.status}</span>
                      <button onClick={() => handleDeleteVendor(v.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'users' && (
          <div className="admin-crm-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" /> მრავალფუნქციური CRM მომხმარებლები ({usersList?.length || 0})
              </h3>
              <div className="admin-crm-search relative w-full sm:w-72">
                <input type="text" placeholder="ძებნა სახელით, ემაილით ან ტელეფონით..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="admin-crm-list space-y-4">
              {(!filteredUsers || filteredUsers.length === 0) ? (
                <p className="text-slate-500 text-xs py-8 text-center">მომხმარებლები ვერ მოიძებნა.</p>
              ) : (
                filteredUsers.map((u, i) => {
                  const uId = u.id || u.email || i;
                  const isEditing = editingUserId === uId;

                  return (
                    <div key={uId} className={`admin-crm-user-card bg-slate-950/60 p-5 rounded-3xl border transition space-y-3 shadow-inner ${u.isBlocked ? 'border-rose-500/40 bg-rose-950/10' : 'border-emerald-500/20'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-black text-white text-sm">{u.name}</h4>
                            {u.isVip && <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"><Star className="w-3 h-3 fill-emerald-400" /> VIP</span>}
                            {u.isBlocked && <span className="bg-rose-500/20 text-rose-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">დაბლოკილი</span>}
                            {u.discountPercent > 0 && <span className="bg-amber-500/20 text-amber-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">ფასდაკლება: {u.discountPercent}%</span>}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-1">📧 {u.email} | 📞 {u.phone || 'მითითებული არ არის'}</p>
                          {u.adminNotes && <p className="text-amber-300 text-[11px] mt-1 italic">📝 შენიშვნა: "{u.adminNotes}"</p>}
                        </div>

                        <div className="admin-crm-user-actions flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => handleToggleVipUser(u.id || u.email)} 
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow ${u.isVip ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-emerald-500/20 hover:text-white'}`}
                            title="VIP სტატუსი"
                          >
                            <Star className="w-3.5 h-3.5" /> {u.isVip ? 'VIP მოხსნა' : 'VIP მინიჭება'}
                          </button>

                          <button 
                            onClick={() => handleToggleBlockUser(u.id || u.email)} 
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow ${u.isBlocked ? 'bg-rose-500 text-white' : 'bg-slate-900 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10'}`}
                            title="ბლოკირება / განბლოკვა"
                          >
                            {u.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {u.isBlocked ? 'განბლოკვა' : 'დაბლოკვა'}
                          </button>

                          <button 
                            onClick={() => {
                              if (isEditing) {
                                setEditingUserId(null);
                              } else {
                                setEditingUserId(uId);
                                setEditUserDiscount(u.discountPercent || '');
                                setEditUserNotes(u.adminNotes || '');
                              }
                            }} 
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/20 rounded-xl cursor-pointer transition"
                            title="პერსონალური ფასდაკლება & შენიშვნები"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => handleDeleteUser(u.id || u.email, u.name)} 
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl cursor-pointer transition"
                            title="მომხმარებლის წაშლა"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-in fade-in">
                          <h5 className="font-black text-amber-400 text-xs">პერსონალური CRM პარამეტრები კლიენტისთვის: {u.name}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-400 text-[10px] block mb-1">პერსონალური ფასდაკლება (%)</label>
                              <input 
                                type="number" 
                                placeholder="მაგ: 10" 
                                value={editUserDiscount} 
                                onChange={e => setEditUserDiscount(e.target.value)} 
                                className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-[10px] block mb-1">ადმინისტრატორის შენიშვნა</label>
                              <input 
                                type="text" 
                                placeholder="მაგ: VIP კლიენტი, ჰყავს ფასდაკლება" 
                                value={editUserNotes} 
                                onChange={e => setEditUserNotes(e.target.value)} 
                                className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 bg-slate-950 text-slate-400 rounded-xl font-bold text-xs">გაუქმება</button>
                            <button onClick={() => handleSaveUserCrm(u.id || u.email)} className="px-4 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-black text-xs">შენახვა</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {adminTab === 'settings' && (
          <div className="admin-settings-panel space-y-6">
            <div className="admin-security-notice bg-slate-900/80 border border-amber-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-3 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">ადმინისტრატორის ანგარიშის დაცვა</h3>
              <p className="text-xs text-slate-300 leading-6">
                ადმინისტრატორის წვდომა მოწმდება Supabase Auth-ის სერვერული სესიით და დაცული app_metadata.role მნიშვნელობით.
                ბრაუზერში შენახული PIN/პაროლი და სატესტო Face ID/Passkey ავტორიზაცია გამორთულია.
              </p>
              <p className="text-xs text-amber-300 leading-6">
                რეალური Passkey-ის დასამატებლად საჭიროა სერვერული challenge და კრედენციალის ვერიფიკაცია.
                მანამდე ეს ფუნქცია უსაფრთხოების მიზნით გათიშულია.
              </p>
            </div>

            <div className="admin-delivery-settings bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Truck className="w-5 h-5 text-emerald-400" /> მიწოდების ტარიფების რედაქტირება
              </h3>
              <div className="admin-delivery-fee-fields grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🏙️ თბილისი / რუსთავი (₾):</label>
                  <input type="number" value={deliveryFees?.tbilisi ?? 0} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, tbilisi: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🌆 დიდი ქალაქები (₾):</label>
                  <input type="number" value={deliveryFees?.bigCities ?? 10} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, bigCities: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🏔️ სხვა რეგიონები (₾):</label>
                  <input type="number" value={deliveryFees?.other ?? 15} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, other: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
              </div>
              <button onClick={handleSaveDeliveryFees} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20">
                ტარიფების შენახვა
              </button>
            </div>

            <div className="admin-global-settings bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Settings className="w-5 h-5 text-emerald-400" /> საიტის გლობალური პარამეტრები
              </h3>
              <form onSubmit={handleSaveSettings} className="admin-global-settings-form space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">მაღაზიის დასახელება</label>
                  <input type="text" maxLength={60} value={siteSettings?.storeName || 'GEOSTORE'} onChange={e => setSiteSettings({...siteSettings, storeName: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">ზედა ზოლის ტექსტი (მაქს. 160)</label>
                  <input type="text" maxLength={160} value={siteSettings?.topBarText || ''} onChange={e => setSiteSettings({...siteSettings, topBarText: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">მთავარი სათაური (მაქს. 120)</label>
                  <input type="text" maxLength={120} value={siteSettings?.heroTitle || ''} onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">მთავარი აღწერა (მაქს. 240)</label>
                  <textarea maxLength={240} rows={3} value={siteSettings?.heroSubtitle || ''} onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner resize-y" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">
                  პარამეტრების შენახვა
                </button>
              </form>
              <div className="border-t border-emerald-500/20 pt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">გამოქვეყნების ვერსიების ისტორია</h4>
                </div>
                {storefrontVersionsLoading ? (
                  <p className="text-xs text-slate-400">ვერსიები იტვირთება…</p>
                ) : storefrontVersionsError ? (
                  <p role="alert" className="text-xs text-rose-300">{storefrontVersionsError}</p>
                ) : storefrontVersions.length === 0 ? (
                  <p className="text-xs text-slate-400">შენახული გამოქვეყნების ვერსიები ჯერ არ არსებობს.</p>
                ) : (
                  <div className="space-y-2">
                    {storefrontVersions.map(version => (
                      <div key={version.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white break-words">{version.version_label || 'გამოქვეყნების ვერსია'}</p>
                          <p className="text-[10px] text-slate-400">{version.created_at ? new Date(version.created_at).toLocaleString('ka-GE') : ''}</p>
                        </div>
                        <button type="button" onClick={() => handleRestoreStorefrontVersion(version)} className="shrink-0 rounded-lg border border-emerald-400/40 px-3 py-2 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/10">მონახაზში აღდგენა</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] leading-5 text-slate-500">აღდგენა მხოლოდ რედაქტორში ჩატვირთავს ძველ ვერსიას. ის ავტომატურად არ გამოქვეყნდება და არსებულ ისტორიას არ წაშლის.</p>
              </div>
            </div>
          </div>
        )}

      {reactivationOrder && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reactivation-title">
          <form onSubmit={handleConfirmOrderReactivation} className="w-full max-w-md bg-slate-950 border border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 id="reactivation-title" className="text-white font-black">შეკვეთის ხელახლა გააქტიურება</h3>
                <p className="text-slate-400 text-xs">შეკვეთა #{reactivationOrder.id}</p>
              </div>
            </div>
            <p className="text-slate-300 text-xs leading-5">
              უსაფრთხოებისთვის შეიყვანეთ თქვენი ადმინისტრატორის ანგარიშის მიმდინარე პაროლი. დადასტურების შემდეგ სისტემა შეამოწმებს მარაგს და ხელახლა ჩამოჭრის შეკვეთის რაოდენობას.
            </p>
            <label className="block text-xs font-bold text-slate-300" htmlFor="reactivation-password">ადმინისტრატორის პაროლი</label>
            <input
              id="reactivation-password"
              type="password"
              autoComplete="current-password"
              value={reactivationPassword}
              onChange={event => setReactivationPassword(event.target.value)}
              required
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 p-3.5 rounded-xl text-white outline-none"
              placeholder="შეიყვანეთ პაროლი"
            />
            {reactivationError && <p role="alert" className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{reactivationError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={isReactivatingOrder} onClick={() => { setReactivationOrder(null); setReactivationPassword(''); setReactivationError(''); }} className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold disabled:opacity-50">გაუქმება</button>
              <button type="submit" disabled={isReactivatingOrder || !reactivationPassword} className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black disabled:opacity-50">
                {isReactivatingOrder ? 'მოწმდება...' : 'დადასტურება და გააქტიურება'}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}
