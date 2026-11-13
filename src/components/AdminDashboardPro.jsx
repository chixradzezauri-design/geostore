// src/components/AdminDashboardPro.jsx - Ultimate Full Elite Edition with Advanced Order Details Modal
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Tag, Search, Star, Settings, Image as ImageIcon, Percent, Download, FolderTree, Megaphone, Send, Activity, Zap, Printer, HelpCircle,
  Smartphone, Laptop, Headphones, Watch, Tv, Speaker, Sparkles, Gamepad2, Tablet, LayoutDashboard, ShoppingCart, BarChart3, Truck, ShieldAlert, Footprints, Shirt, Gem, Cpu, ChevronRight, ChevronUp, ChevronDown, CornerDownRight, KeyRound, Layers, UserX, UserCheck, Edit3, Calculator, Wallet, UserCog, CheckSquare, Square, Eye, EyeOff, X 
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { validateImageFile, isValidImageDataUrl } from '../utils/imageSafety';
import { validateProductVariants, validateSizeColorInventoryVariants } from '../utils/productValidation';
import { getLowStockInventory, groupLowStockInventory, resolveProductCreatedAt } from '../utils/productOrdering';
import { collectReferencedProductImageUrls, collectReferencedOrderImageUrls, collectOrderProductIdsWithoutImageSnapshot, collectReferencedStorefrontImageUrls, collectReferencedLegacyMessageImageUrls, collectReferencedProductImagePaths, collectOwnedProductImagePaths, collectReferencedMediaStoragePaths } from '../utils/productImageCleanup';
import { normalizeOrderItems, normalizeOrderTotal } from '../utils/orderSafety';
import { getPaginationItems } from '../utils/pagination.js';
import { createSecureId } from '../utils/secureId.js';
import { isClothingProductCategory, isShoesProductCategory, isPhoneProductCategory, isLaptopProductCategory, isAccessoryProductCategory, supportsSizeColorInventoryCategory } from '../utils/productCategories.js';
import { parseOptionalMoney, parseStockQuantity } from '../utils/productFormSafety.js';
import { getOrderDeliveryCharge } from '../utils/adminAnalytics.js';
import { attachSupportImageUrls, uploadSupportAttachment, validateSupportAttachment } from '../utils/supportAttachments.js';
import { fetchSupportTicketMessages, fetchSupportTicketUnreadCounts, markSupportTicketMessagesRead } from '../utils/supportThreadApi.js';
import { saveLocalCollection } from '../utils/localCollectionStorage.js';
import { parseDeliveryFeeDrafts } from '../utils/deliveryFeeSafety.js';
import { saveStorefrontCategoryDraft } from '../utils/storefrontDraftStorage.js';
import { normalizeRestorableStorefrontSnapshot } from '../utils/storefrontSnapshots.js';
import { fetchAllProductReviews, isCurrentAdminReviewRequest } from '../utils/productReviewsAdminApi.js';

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
const ADMIN_IMAGE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%231e293b'/%3E%3Cpath d='M12 46l12-14 9 10 7-8 12 12H12z' fill='%2364758b'/%3E%3Ccircle cx='22' cy='21' r='5' fill='%2364758b'/%3E%3C/svg%3E";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_GALLERY_IMAGES = 10;
const getSafeLegacyMessageImage = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) {
    return isValidImageDataUrl(raw, MAX_PRODUCT_IMAGE_BYTES) ? raw : '';
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? raw : '';
  } catch {
    return '';
  }
};
const createAdminId = (prefix) => {
  try { return createSecureId(prefix); }
  catch (error) { console.error('GEOSTORE secure identifier generation failed:', error); return null; }
};
const secureIdError = 'უსაფრთხო იდენტიფიკატორის შექმნა ვერ მოხერხდა. განაახლეთ ბრაუზერი და სცადეთ თავიდან.';

const buildSizeColorStockVariants = (sizes, colors, existing = [], priceGEL = 0) => {
  const normalizedSizes = Array.isArray(sizes) ? sizes.map(value => String(value ?? '').trim()).filter(Boolean) : [];
  const normalizedColors = Array.isArray(colors) ? colors.map(value => String(value ?? '').trim()).filter(Boolean) : [];
  const pairs = normalizedSizes.length && normalizedColors.length
    ? normalizedSizes.flatMap(size => normalizedColors.map(color => ({ size, color })))
    : normalizedSizes.length
      ? normalizedSizes.map(size => ({ size, color: null }))
      : normalizedColors.map(color => ({ size: null, color }));
  const currentRows = Array.isArray(existing) ? existing : [];
  return pairs.map(({ size, color }) => {
    const current = currentRows.find(row =>
      (String(row?.size ?? '').trim() || null) === size &&
      (String(row?.color ?? '').trim() || null) === color
    );
    const label = [size, color].filter(Boolean).join(' / ');
    return current
      ? { ...current, name: label, size, color, priceGEL: Number(priceGEL) || 0, variantType: 'size_color' }
      : {
          id: createAdminId('szc'),
          name: label,
          priceGEL: Number(priceGEL) || 0,
          stock: 0,
          variantType: 'size_color',
          size,
          color
        };
  });
};
const PRODUCT_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const uploadProductImage = async (imageData, productId, index, trackedUploads = []) => {
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

  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`;
  // Track the unique object path before sending the request. A non-2xx
  // response can still be ambiguous (for example, a proxy may fail after the
  // object was accepted), so the caller can run guarded reference-aware cleanup.
  if (Array.isArray(trackedUploads)) trackedUploads.push(publicUrl);
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

  return publicUrl;
};

const deleteProductImages = async (imageUrls, productId) => {
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  // Only exact, validated object paths inside this product's own folder
  // can be deleted. Reject encoded separators and traversal segments.
  const paths = [...collectOwnedProductImagePaths(imageUrls, publicPrefix, productId)];
  if (!paths.length) return true;
  try {
    // A product-owned Storage path can still be referenced by another product.
    // Read the lightweight image references first and fail closed if this check fails.
    const productRows = [];
    const pageSize = 1000;
    for (let offset = 0; offset < 100000; offset += pageSize) {
      const productHeaders = await getSupabaseHeaders();
      productHeaders.Range = `${offset}-${offset + pageSize - 1}`;
      productHeaders['Range-Unit'] = 'items';
      const referenceResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=id,image,gallery&order=id.asc`,
        { headers: productHeaders }
      );
      if (!referenceResponse.ok) throw new Error('პროდუქტის ფოტოების გამოყენების შემოწმება ვერ მოხერხდა.');
      const page = await referenceResponse.json();
      if (!Array.isArray(page)) throw new Error('პროდუქტის ფოტოების სია არასწორია.');
      productRows.push(...page);
      if (page.length < pageSize) break;
      if (offset + pageSize >= 100000) throw new Error('პროდუქტების სრული სიის შემოწმება ვერ დასრულდა; ფოტოს წაშლა შეჩერდა.');
    }

    // Historical order snapshots are independent references to their original
    // photos. Never remove a Storage object while any order still references it.
    const orderRows = [];
    for (let offset = 0; offset < 100000; offset += pageSize) {
      const orderHeaders = await getSupabaseHeaders();
      orderHeaders.Range = `${offset}-${offset + pageSize - 1}`;
      orderHeaders['Range-Unit'] = 'items';
      const orderResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?select=items&order=created_at.asc,id.asc`,
        { headers: orderHeaders }
      );
      if (!orderResponse.ok) throw new Error('შეკვეთებში ფოტოების გამოყენების შემოწმება ვერ მოხერხდა.');
      const page = await orderResponse.json();
      if (!Array.isArray(page)) throw new Error('შეკვეთების ფოტოების სია არასწორია.');
      orderRows.push(...page);
      if (page.length < pageSize) break;
      if (offset + pageSize >= 100000) throw new Error('შეკვეთების სრული სიის შემოწმება ვერ დასრულდა; ფოტოს წაშლა შეჩერდა.');
    }

    const referencedUrls = collectReferencedProductImageUrls(productRows, productId);
    for (const orderUrl of collectReferencedOrderImageUrls(orderRows)) referencedUrls.add(orderUrl);

    // Published/draft storefront settings and immutable historical snapshots
    // may still reference a product-owned image (banner/category/hero/etc.).
    // Fail closed: if either table cannot be fully read, do not delete anything.
    const fetchAllRows = async (table, select, order) => {
      const rows = [];
      for (let offset = 0; offset < 100000; offset += pageSize) {
        const headers = await getSupabaseHeaders();
        headers.Range = `${offset}-${offset + pageSize - 1}`;
        headers['Range-Unit'] = 'items';
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=${order}`,
          { headers }
        );
        if (!response.ok) throw new Error(`${table} მედია-ბმულების შემოწმება ვერ მოხერხდა.`);
        const page = await response.json();
        if (!Array.isArray(page)) throw new Error(`${table} მონაცემების ფორმატი არასწორია.`);
        rows.push(...page);
        if (page.length < pageSize) return rows;
      }
      throw new Error(`${table} სრული სიის შემოწმება ვერ დასრულდა; ფოტოს წაშლა შეჩერდა.`);
    };
    const [storefrontRows, versionRows, legacyMessageRows, mediaRegistryRows] = await Promise.all([
      fetchAllRows('storefront_config', 'draft_config,published_config', 'config_key.asc'),
      fetchAllRows('storefront_versions', 'snapshot', 'created_at.asc,id.asc'),
      // Legacy customer conversations can retain product-owned image URLs.
      // If this read fails, the outer fail-closed handler prevents Storage deletion.
      fetchAllRows('messages', 'image', 'created_at.asc,id.asc'),
      // The media library may independently register a product-owned object.
      // Read both its canonical object path and public URL before cleanup.
      fetchAllRows('storefront_media', 'storage_path,public_url', 'id.asc')
    ]);
    const storefrontReferences = collectReferencedStorefrontImageUrls(
      storefrontRows.map(row => row.draft_config),
      storefrontRows.map(row => row.published_config),
      versionRows.map(row => row.snapshot)
    );
    for (const url of storefrontReferences) referencedUrls.add(url);
    const legacyMessageReferences = collectReferencedLegacyMessageImageUrls(legacyMessageRows);
    for (const url of legacyMessageReferences) referencedUrls.add(url);
    for (const mediaRow of mediaRegistryRows) {
      if (typeof mediaRow?.public_url === 'string' && mediaRow.public_url.trim()) {
        referencedUrls.add(mediaRow.public_url.trim());
      }
    }
    // Compare decoded Storage object paths rather than full URLs. Query strings,
    // fragments, or equivalent percent-encoding must not hide a live reference.
    const referencedPaths = collectReferencedProductImagePaths([...referencedUrls], publicPrefix);
    const registeredMediaPaths = collectReferencedMediaStoragePaths(mediaRegistryRows);
    // Older orders may not contain an image snapshot. Their detail view falls
    // back to the catalogue photo, so retain this product's existing images.
    const legacyOrderProductIds = collectOrderProductIdsWithoutImageSnapshot(orderRows);
    const hasLegacyOrderFallback = legacyOrderProductIds.has(String(productId));
    const safePaths = hasLegacyOrderFallback
      ? []
      : paths.filter(path => !referencedPaths.has(path) && !registeredMediaPaths.has(path));
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

const resolveOrderCheckoutBreakdown = (order) => {
  const breakdown = order?.checkoutBreakdown ?? order?.checkout_breakdown ?? order?.checkout_result ?? null;
  if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return null;
  const subtotalGEL = breakdown.subtotalGEL ?? breakdown.subtotal_gel;
  const discountGEL = breakdown.discountGEL ?? breakdown.discount_gel;
  const deliveryGEL = breakdown.deliveryGEL ?? breakdown.delivery_gel;
  const rawTotal = order?.totalGEL ?? order?.total_gel ?? order?.total;
  const values = [subtotalGEL, discountGEL, deliveryGEL, rawTotal].map(Number);
  if ([subtotalGEL, discountGEL, deliveryGEL, rawTotal].some(value =>
    value === null || value === undefined || String(value).trim() === ''
  ) || values.some(value => !Number.isFinite(value) || value < 0)) return null;

  // Only display a detailed invoice breakdown when it reconciles to the
  // immutable server total. Otherwise retain the trusted total-only fallback.
  const [subtotal, discount, delivery, total] = values;
  const toTetri = value => Math.round((value + Number.EPSILON) * 100);
  const subtotalTetri = toTetri(subtotal);
  const discountTetri = toTetri(discount);
  const deliveryTetri = toTetri(delivery);
  const totalTetri = toTetri(total);
  if (discountTetri > subtotalTetri ||
      Math.abs((Math.max(0, subtotalTetri - discountTetri) + deliveryTetri) - totalTetri) > 1) {
    return null;
  }

  return {
    subtotalGEL: subtotal,
    discountGEL: discount,
    deliveryGEL: delivery,
    couponCode: breakdown.couponCode ?? breakdown.coupon_code ?? ''
  };
};

const resolveOrderItemImage = (item, products) => {
  const savedOrderImage = String(item?.image || item?.image_url || item?.imageUrl || '').trim();
  if (savedOrderImage) return savedOrderImage;

  // Order snapshots retain the original gallery even if the catalogue product
  // is later edited or removed. Prefer that historical image before live data.
  const savedGalleryImage = Array.isArray(item?.gallery)
    ? item.gallery.find(image => String(image ?? '').trim())
    : '';
  if (savedGalleryImage) return String(savedGalleryImage).trim();

  const productId = String(item?.id ?? item?.product_id ?? '').trim();
  if (!productId || !Array.isArray(products)) return '';

  const matchingProduct = products.find(product =>
    String(product?.id ?? '').trim() === productId
  );
  return String(
    matchingProduct?.image ||
    matchingProduct?.img ||
    matchingProduct?.image_url ||
    matchingProduct?.imageUrl ||
    (Array.isArray(matchingProduct?.gallery) ? matchingProduct.gallery.find(image => String(image ?? '').trim()) : '') ||
    ''
  ).trim();
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
  ordersError = '',
  onRefreshOrders,
  setOrders,
  usersList = [],
  setUsersList,
  products = [],
  productsError = '',
  onRefreshProducts,
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
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ყველა');
  const [productPage, setProductPage] = useState(1);
  const [productPublishBusyIds, setProductPublishBusyIds] = useState({});
  const [quickProductDrafts, setQuickProductDrafts] = useState({});

  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ყველა');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [orderPageByStatus, setOrderPageByStatus] = useState({});
  const [orderStatusBusyIds, setOrderStatusBusyIds] = useState({});
  const orderStatusInFlight = useRef(new Set());
  const [analyticsPeriod, setAnalyticsPeriod] = useState('all');
  const [deliveryFeeDrafts, setDeliveryFeeDrafts] = useState(() => ({
    tbilisi: String(deliveryFees?.tbilisi ?? 0),
    bigCities: String(deliveryFees?.bigCities ?? 10),
    other: String(deliveryFees?.other ?? 15)
  }));
  useEffect(() => {
    setDeliveryFeeDrafts({
      tbilisi: String(deliveryFees?.tbilisi ?? 0),
      bigCities: String(deliveryFees?.bigCities ?? 10),
      other: String(deliveryFees?.other ?? 15)
    });
  }, [deliveryFees?.tbilisi, deliveryFees?.bigCities, deliveryFees?.other]);
  const ORDERS_PER_PAGE = 5;
  const PRODUCTS_PER_PAGE = 10;

  // 🌟 შეკვეთის დეტალების ნახვის მოდალის სახელმწიფო (Order Details Modal)
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [orderAdminNoteInput, setOrderAdminNoteInput] = useState('');
  const [isSavingOrderNote, setIsSavingOrderNote] = useState(false);
  const [reactivationOrder, setReactivationOrder] = useState(null);
  const [reactivationPassword, setReactivationPassword] = useState('');
  const [reactivationError, setReactivationError] = useState('');
  const [isReactivatingOrder, setIsReactivatingOrder] = useState(false);
  const [productReviews, setProductReviews] = useState([]);
  const [productReviewsLoading, setProductReviewsLoading] = useState(false);
  const [productReviewsError, setProductReviewsError] = useState('');
  const [productReviewFilter, setProductReviewFilter] = useState('pending');
  const [moderatingReviewIds, setModeratingReviewIds] = useState({});

  // Keep the page behind active admin dialogs from scrolling and support Escape
  // as a keyboard close action without interrupting a password re-auth request.
  useEffect(() => {
    const hasActiveDialog = Boolean(selectedOrderForModal || reactivationOrder);
    if (!hasActiveDialog) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleDialogKeyDown = (event) => {
      if (event.key !== 'Escape' || isReactivatingOrder) return;
      if (reactivationOrder) {
        setReactivationOrder(null);
        setReactivationPassword('');
        setReactivationError('');
        return;
      }
      if (selectedOrderForModal) setSelectedOrderForModal(null);
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [Boolean(selectedOrderForModal), Boolean(reactivationOrder), isReactivatingOrder]);

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
  const [expensesError, setExpensesError] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const expenseSubmitInFlight = useRef(false);
  const pendingExpenseRequest = useRef(null);
  const [expenseForm, setExpenseForm] = useState({ category: 'რეკლამა & მარკეტინგი', amount: '', date: getLocalDateInputValue(), description: '' });

  const [aiQuery, setAiQuery] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState([
    { role: 'assistant', text: 'ეს არის ფინანსური სწრაფი მიმოხილვა და არა გენერაციული AI. ამ ეტაპზე პასუხობს შემოსავლის, მოგებისა და ხარჯების შესახებ წინასწარ განსაზღვრულ კითხვებს.' }
  ]);

  useEffect(() => {
    try {
      localStorage.setItem('geostore_staff_list', JSON.stringify(staffList));
    } catch {}
  }, [staffList]);

  const persistAdminLocalCollection = (storageKey, rows, setter, label) => {
    if (typeof setter !== 'function') {
      alert(`${label} ვერ განახლდა: შენახვის ფუნქცია მიუწვდომელია.`);
      return false;
    }
    try {
      saveLocalCollection(window.localStorage, storageKey, rows);
      setter(rows);
      return true;
    } catch (error) {
      console.error(`GEOSTORE local collection save failed (${storageKey}):`, error);
      alert(`${label} ამ მოწყობილობაზე ვერ შეინახა. არსებული ჩანაწერები უცვლელია. გაათავისუფლეთ ბრაუზერის მეხსიერება და სცადეთ თავიდან.`);
      return false;
    }
  };

  const fetchExpenses = async () => {
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses?select=*&order=created_at.desc`, { headers: await getSupabaseHeaders() });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `ხარჯების მიღება ვერ მოხერხდა (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('ხარჯების სია არასწორ ფორმატში დაბრუნდა.');
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      setExpenses(data);
      setExpensesError('');
    } catch (error) {
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      console.error('Expenses fetch error:', error);
      setExpensesError(error?.message || 'ხარჯების ისტორიის ჩატვირთვა ვერ მოხერხდა.');
    }
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
  // Keep comma-separated text drafts separate from parsed arrays so typing does not reset the caret.
  const [productOptionDrafts, setProductOptionDrafts] = useState({
    availableSizes: productFormInitial.availableSizes.join(', '),
    availableColors: productFormInitial.availableColors.join(', ')
  });
  const [stockDrafts, setStockDrafts] = useState({});
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  // Prevent duplicate product creates/updates from rapid double-submit or touch events.
  const productSaveInFlight = useRef(false);
  const [productVariants, setProductVariants] = useState([]);
  const [initialCustomVariantStock, setInitialCustomVariantStock] = useState([]);
  const [sizeColorStock, setSizeColorStock] = useState(() => buildSizeColorStockVariants(productFormInitial.availableSizes, productFormInitial.availableColors, [], 0));
  const [initialSizeColorStock, setInitialSizeColorStock] = useState([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  const handleAddCustomVariant = (e) => {
    e.preventDefault();
    if (sizeColorStock.length > 0) {
      return alert('ამ პროდუქტზე ზომებისა და ფერების მარაგის მატრიცა უკვე ჩართულია. ინდივიდუალური ვარიანტები მასთან ერთად არ გამოიყენება.');
    }
    const name = String(newVarName || '').trim();
    const priceText = String(newVarPrice ?? '').trim();
    const stockText = String(newVarStock ?? '').trim();
    const price = Number(priceText);
    const stock = stockText === '' ? 0 : Number(stockText);

    if (!name || name.length > 80) return alert('ვარიანტის სახელი აუცილებელია და მაქსიმუმ 80 სიმბოლო უნდა იყოს.');
    if (!Number.isFinite(price) || price < 0 || price > 1000000000 || !/^\d+(?:\.\d{1,2})?$/.test(priceText)) {
      return alert('ვარიანტის ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    }
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) {
      return alert('ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.');
    }
    if (productVariants.length >= 50) return alert('ერთ პროდუქტზე მაქსიმუმ 50 ვარიანტია დაშვებული.');
    if (productVariants.some(variant => String(variant.name || '').trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return alert('ამ პროდუქტზე ასეთი ვარიანტის სახელი უკვე არსებობს.');

    const generatedVariantId = createAdminId('var');
    if (!generatedVariantId) return alert(secureIdError);
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

  const handleSizeColorStockChange = (variantId, rawStock) => {
    const stockText = String(rawStock ?? '');
    if (stockText !== '' && (!/^\d+$/.test(stockText) || Number(stockText) > 1000000)) return;
    setSizeColorStock(prev => prev.map(variant => variant.id === variantId
      ? { ...variant, stock: stockText === '' ? 0 : Number(stockText) }
      : variant));
  };

  const handleCustomVariantStockChange = (variantId, rawStock) => {
    const stockText = String(rawStock ?? '');
    if (stockText !== '' && (!/^\d+$/.test(stockText) || Number(stockText) > 1000000)) return;
    setProductVariants(prev => prev.map(variant => String(variant.id) === String(variantId)
      ? { ...variant, stock: stockText === '' ? 0 : Number(stockText) }
      : variant));
  };

  const handleEnableSizeColorStock = () => {
    if (productVariants.length > 0) {
      return alert('ამ პროდუქტს უკვე აქვს ინდივიდუალური ვარიანტები. ზომებისა და ფერების მარაგის მატრიცა მათთან ერთად არ გამოიყენება.');
    }
    const rows = buildSizeColorStockVariants(
      productForm.availableSizes,
      productForm.availableColors,
      sizeColorStock,
      Number(productForm.priceGEL) || 0
    );
    if (!rows.length || rows.length > 50) {
      return alert('ზომებისა და ფერების კომბინაციები უნდა იყოს 1-დან 50-მდე.');
    }
    if (rows.some(row => !row.id)) return alert(secureIdError);
    setSizeColorStock(rows);
  };

  const handleProductOptionChange = (field, rawValue) => {
    if (field !== 'availableSizes' && field !== 'availableColors') return;
    const nextOptions = [...new Set(String(rawValue ?? '').split(',').map(value => value.trim()).filter(Boolean))];
    const nextSizes = field === 'availableSizes' ? nextOptions : productForm.availableSizes;
    const nextColors = field === 'availableColors' ? nextOptions : productForm.availableColors;
    if (sizeColorStock.length > 0) {
      const rows = buildSizeColorStockVariants(nextSizes, nextColors, sizeColorStock, Number(productForm.priceGEL) || 0);
      if (rows.length > 50) {
        alert('ზომისა და ფერის მარაგის მატრიცაში მაქსიმუმ 50 კომბინაციაა დაშვებული.');
        return;
      }
      setSizeColorStock(rows);
    }
    setProductForm(prev => ({ ...prev, [field]: nextOptions }));
  };

  const handleCategoryChange = (catName) => {
    let defaultSizes = ['S', 'M', 'L', 'XL'];
    let defaultColors = ['შავი', 'თეთრი'];

    if (isShoesProductCategory(catName)) {
      defaultSizes = ['38', '39', '40', '41', '42', '43', '44'];
    } else if (isClothingProductCategory(catName)) {
      defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    } else if (isPhoneProductCategory(catName)) {
      defaultSizes = ['128GB', '256GB', '512GB', '1TB'];
      defaultColors = ['ტიტანი', 'ვერცხლისფერი', 'შავი', 'ოქროსფერი'];
    } else if (isLaptopProductCategory(catName)) {
      defaultSizes = ['8GB RAM / 256GB SSD', '16GB RAM / 512GB SSD', '32GB RAM / 1TB SSD'];
    } else if (isAccessoryProductCategory(catName)) {
      defaultSizes = ['Standard / One Size'];
    }

    const isClothingOrShoes = supportsSizeColorInventoryCategory(catName);
    const nextSizeColorStock = isClothingOrShoes && productVariants.length === 0
      ? buildSizeColorStockVariants(defaultSizes, defaultColors, sizeColorStock, Number(productForm.priceGEL) || 0)
      : [];
    const removedSizeColorVariants = sizeColorStock.filter(current =>
      !nextSizeColorStock.some(next => String(next.id) === String(current.id))
    );
    if (editingProductId && removedSizeColorVariants.length > 0) {
      const removedStock = removedSizeColorVariants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);
      const confirmed = window.confirm(
        `კატეგორიის შეცვლა მოაშორებს ${removedSizeColorVariants.length} არსებულ ზომა/ფერის ვარიანტს (ჯამური მარაგი: ${removedStock}). შესაბამისი ვარიანტები წარსულ შეკვეთებში გამოყენების შემთხვევაში ბაზაში დაცულია და წაშლა უარყოფილი იქნება. გსურთ გაგრძელება?`
      );
      // A cancelled confirmation must leave every editor field and inventory row untouched.
      if (!confirmed) return;
    }

    setProductForm(prev => ({
      ...prev,
      category: catName,
      availableSizes: defaultSizes,
      availableColors: defaultColors
    }));
    setProductOptionDrafts({
      availableSizes: defaultSizes.join(', '),
      availableColors: defaultColors.join(', ')
    });
    setSizeColorStock(nextSizeColorStock);
  };

  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', minOrderGEL: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', commission: '' });
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Shirt');
  const [newCatImage, setNewCatImage] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image: '', link: '' });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [broadcastAudienceMode, setBroadcastAudienceMode] = useState('all');
  const [announcementRecipients, setAnnouncementRecipients] = useState([]);
  const [announcementRecipientsLoading, setAnnouncementRecipientsLoading] = useState(false);
  const [announcementRecipientsError, setAnnouncementRecipientsError] = useState('');
  const [announcementRecipientSearch, setAnnouncementRecipientSearch] = useState('');
  const [broadcastSelectedRecipientIds, setBroadcastSelectedRecipientIds] = useState([]);
  const [flashSaleForm, setFlashSaleForm] = useState({ discountPercent: '', category: 'ყველა' });
  const [isApplyingFlashSale, setIsApplyingFlashSale] = useState(false);

  const [supportTickets, setSupportTickets] = useState([]);
  const [supportTicketsError, setSupportTicketsError] = useState('');
  const [ticketStatusBusy, setTicketStatusBusy] = useState({});
  const ticketStatusInFlight = useRef(new Set());
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState(null);
  const [supportTicketThreads, setSupportTicketThreads] = useState({});
  const [supportTicketThreadLoading, setSupportTicketThreadLoading] = useState({});
  const [supportTicketThreadErrors, setSupportTicketThreadErrors] = useState({});
  const [legacyMessages, setLegacyMessages] = useState([]);
  const [legacyMessagesError, setLegacyMessagesError] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const [supportReplyAttachments, setSupportReplyAttachments] = useState({});
  const [replySending, setReplySending] = useState({});
  const supportReplyInFlight = useRef(new Set());
  const supportReplyRequestIds = useRef({});
  const supportThreadFetchInFlight = useRef(new Set());
  const supportThreadRefreshPending = useRef(new Set());
  const [storefrontVersions, setStorefrontVersions] = useState([]);
  const [storefrontVersionsLoading, setStorefrontVersionsLoading] = useState(false);
  const [storefrontVersionsError, setStorefrontVersionsError] = useState('');
  const adminSessionEpoch = useRef(0);
  const adminSessionAccessRef = useRef(adminLoggedIn);
  if (adminSessionAccessRef.current !== adminLoggedIn) {
    adminSessionAccessRef.current = adminLoggedIn;
    adminSessionEpoch.current += 1;
  }

  // Clear private snapshots on logout and ignore requests started in an older session.
  useEffect(() => {
    if (adminLoggedIn) return;
    setExpenses([]);
    setExpensesError('');
    setIsSavingExpense(false);
    setIsSavingOrderNote(false);
    setIsReactivatingOrder(false);
    setIsApplyingFlashSale(false);
    setProductPublishBusyIds({});
    setOrderStatusBusyIds({});
    setTicketStatusBusy({});
    ticketStatusInFlight.current.clear();
    setSupportTickets([]);
    setSupportTicketsError('');
    setSupportTicketThreads({});
    setSupportTicketThreadLoading({});
    setSupportTicketThreadErrors({});
    setSelectedSupportTicketId(null);
    setLegacyMessages([]);
    setLegacyMessagesError('');
    setStorefrontVersions([]);
    setStorefrontVersionsLoading(false);
    setStorefrontVersionsError('');
    setProductReviews([]);
    setProductReviewsLoading(false);
    setProductReviewsError('');
    setModeratingReviewIds({});
    setActivityLogs([]);
    setActivityLogsLoading(false);
    setActivityLogsError('');
    setAnnouncementRecipients([]);
    setAnnouncementRecipientsLoading(false);
    setAnnouncementRecipientsError('');
    setAnnouncementRecipientSearch('');
    setBroadcastSelectedRecipientIds([]);
    setBroadcastAudienceMode('all');
    setSelectedOrderForModal(null);
    setOrderAdminNoteInput('');
    setReactivationOrder(null);
    setReactivationPassword('');
    setReactivationError('');
    supportThreadFetchInFlight.current.clear();
    supportThreadRefreshPending.current.clear();
    supportReplyInFlight.current.clear();
  }, [adminLoggedIn]);

  const fetchAllAdminSupportRows = async (tablePath, label) => {
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return [];
    const pageSize = 500;
    const maxRows = 100000;
    const rowsById = new Map();

    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tablePath}`,
        {
          headers: {
            ...(await getSupabaseHeaders()),
            Range: `${offset}-${offset + pageSize - 1}`,
            'Range-Unit': 'items'
          }
        }
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `${label}: HTTP ${response.status}`);
      }

      const page = await response.json();
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return [];
      if (!Array.isArray(page)) throw new Error(`${label}: მონაცემების ფორმატი არასწორია.`);
      page.forEach(row => {
        if (row?.id !== null && row?.id !== undefined) rowsById.set(String(row.id), row);
      });

      if (page.length < pageSize) return [...rowsById.values()];
    }

    throw new Error(`${label}: ჩანაწერების რაოდენობამ უსაფრთხო 100,000-იან ზღვარს გადააჭარბა. მონაცემები არ ჩაიტვირთა ნაწილობრივ.`);
  };

  const fetchTickets = async () => {
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return;
    try {
      const data = await fetchAllAdminSupportRows(
        'support_tickets?select=*&order=created_at.desc,id.desc',
        'მხარდაჭერის ტიკეტები'
      );
      const unreadRows = await fetchSupportTicketUnreadCounts({
        supabaseUrl: SUPABASE_URL,
        headers: await getSupabaseHeaders()
      });
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      const unreadByTicket = new Map(unreadRows.map(row => [String(row.ticket_id), Number(row.unread_count) || 0]));

      data.sort((a, b) => {
        const aTime = Date.parse(a.created_at || '') || 0;
        const bTime = Date.parse(b.created_at || '') || 0;
        return bTime - aTime || String(b.id).localeCompare(String(a.id));
      });
      setSupportTickets(data.map(t => ({
        id: t.id,
        customerName: t.customer_name,
        email: t.email,
        subject: t.subject,
        message: t.message,
        status: t.status || 'ღია',
        reply: t.reply || '',
        unreadCount: unreadByTicket.get(String(t.id)) || 0,
        date: t.created_at ? new Date(t.created_at).toLocaleDateString('ka-GE') : 'დღეს'
      })));
      setSupportTicketsError('');
    } catch (error) {
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      console.error('GEOSTORE support tickets fetch failed:', error);
      setSupportTicketsError(error?.message || 'მხარდაჭერის ტიკეტების ჩატვირთვა ვერ მოხერხდა.');
    }
  };

  const fetchSupportTicketThread = async (ticketId) => {
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return;
    const normalizedTicketId = String(ticketId || '').trim();
    if (!normalizedTicketId) return;
    if (supportThreadFetchInFlight.current.has(normalizedTicketId)) {
      supportThreadRefreshPending.current.add(normalizedTicketId);
      return;
    }
    supportThreadFetchInFlight.current.add(normalizedTicketId);
    setSupportTicketThreadLoading(prev => ({ ...prev, [normalizedTicketId]: true }));
    setSupportTicketThreadErrors(prev => ({ ...prev, [normalizedTicketId]: '' }));
    try {
      const headers = await getSupabaseHeaders();
      const rows = await fetchSupportTicketMessages({
        supabaseUrl: SUPABASE_URL,
        headers,
        ticketId: normalizedTicketId
      });
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      const rowsWithImages = await attachSupportImageUrls({
        rows,
        supabaseUrl: SUPABASE_URL,
        headers,
        ticketId: normalizedTicketId
      });

      await markSupportTicketMessagesRead({
        supabaseUrl: SUPABASE_URL,
        headers: await getSupabaseHeaders(),
        ticketId: normalizedTicketId
      });
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      const uniqueRows = [...new Map(rowsWithImages.filter(row => row?.id != null).map(row => [String(row.id), row])).values()];
      uniqueRows.sort((a, b) => {
        const aTime = Date.parse(a.created_at || '') || 0;
        const bTime = Date.parse(b.created_at || '') || 0;
        return aTime - bTime || String(a.id).localeCompare(String(b.id));
      });
      setSupportTicketThreads(prev => ({ ...prev, [normalizedTicketId]: uniqueRows }));
      await fetchTickets();
    } catch (error) {
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      console.error('GEOSTORE support ticket thread fetch failed:', error);
      setSupportTicketThreadErrors(prev => ({ ...prev, [normalizedTicketId]: error?.message || 'მიმოწერის ჩატვირთვა ვერ მოხერხდა.' }));
    } finally {
      supportThreadFetchInFlight.current.delete(normalizedTicketId);
      if (adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current) {
        setSupportTicketThreadLoading(prev => ({ ...prev, [normalizedTicketId]: false }));
      }
      if (
        supportThreadRefreshPending.current.delete(normalizedTicketId) &&
        adminSessionAccessRef.current &&
        requestEpoch === adminSessionEpoch.current
      ) {
        // If a Realtime event arrived while this fetch was running, make one
        // follow-up read so the newest message cannot be hidden until polling.
        void Promise.resolve().then(() => fetchSupportTicketThread(normalizedTicketId));
      }
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) {
      setSelectedSupportTicketId(null);
      setSupportTicketThreads({});
      setSupportTicketThreadErrors({});
      supportThreadRefreshPending.current.clear();
      return undefined;
    }
    const channel = supabase
      .channel('geostore-admin-support-ticket-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, payload => {
        const changedTicketId = payload?.new?.ticket_ref || payload?.old?.ticket_ref;
        fetchTickets();
        if (changedTicketId && String(changedTicketId) === String(selectedSupportTicketId)) fetchSupportTicketThread(changedTicketId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        // Ticket status and assignment changes should appear without waiting
        // for the 15-second recovery poll. Fetch through the existing REST/RLS path.
        void fetchTickets();
      })
      .subscribe(status => {
        // A new SUBSCRIBED status is also emitted after websocket recovery.
        if (status === 'SUBSCRIBED' && adminLoggedIn) {
          void fetchTickets();
          if (selectedSupportTicketId) void fetchSupportTicketThread(selectedSupportTicketId);
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [adminLoggedIn, selectedSupportTicketId]);

  useEffect(() => {
    if (!adminLoggedIn) return undefined;
    const refreshAdminSupport = () => {
      void fetchTickets();
      if (selectedSupportTicketId) void fetchSupportTicketThread(selectedSupportTicketId);
    };
    refreshAdminSupport();
    const interval = setInterval(refreshAdminSupport, 15000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshAdminSupport();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [adminLoggedIn, selectedSupportTicketId]);

  const fetchLegacyMessages = async () => {
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return;
    try {
      const rows = await fetchAllAdminSupportRows(
        'messages?select=id,created_at,client_name,sender,text,image,time&order=created_at.desc,id.desc',
        'ძველი მიმოწერები'
      );
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      rows.sort((a, b) => {
        const aTime = Date.parse(a.created_at || '') || 0;
        const bTime = Date.parse(b.created_at || '') || 0;
        return bTime - aTime || Number(b.id) - Number(a.id);
      });
      setLegacyMessages(rows);
      setLegacyMessagesError('');
    } catch (error) {
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      console.error('GEOSTORE legacy messages fetch failed:', error);
      setLegacyMessagesError(error?.message || 'მიმოწერების ჩატვირთვა ვერ მოხერხდა.');
    }
  };

  useEffect(() => {
    if (!adminLoggedIn) {
      setLegacyMessages([]);
      setLegacyMessagesError('');
      return undefined;
    }
    fetchLegacyMessages();
    const interval = setInterval(fetchLegacyMessages, 15000);
    return () => clearInterval(interval);
  }, [adminLoggedIn]);

  useEffect(() => {
    if (!adminLoggedIn) return undefined;
    const channel = supabase
      .channel('geostore-admin-legacy-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          void fetchLegacyMessages();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && adminLoggedIn) {
          void fetchLegacyMessages();
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
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
    const requestEpoch = adminSessionEpoch.current;
    if (!adminSessionAccessRef.current) return;
    setActivityLogsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_admin_activity_logs`, {
        method: 'POST',
        headers: await getSupabaseHeaders(),
        body: JSON.stringify({ p_limit: 100 })
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      if (!Array.isArray(rows)) throw new Error('აქტივობების ისტორიის ფორმატი არასწორია.');
      setActivityLogs(rows.map(log => ({
        id: String(log.id),
        action: log.action,
        time: log.created_at ? new Date(log.created_at).toLocaleString('ka-GE') : ''
      })));
      setActivityLogsError('');
    } catch (error) {
      if (adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current) setActivityLogsError(error?.message || 'აქტივობების ისტორიის ჩატვირთვა ვერ მოხერხდა.');
    } finally {
      if (adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current) setActivityLogsLoading(false);
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
    if (!action || !adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    
    try {
      const headers = await getSupabaseHeaders();
      if (!isCurrentSession()) return;
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/write_admin_activity_log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_action: action })
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!isCurrentSession()) return;
      const saved = Array.isArray(rows) ? rows[0] : rows;
      if (!saved?.id) throw new Error('სერვერმა აქტივობის ჩანაწერი არ დააბრუნა.');
      setActivityLogs(prev => [{
        id: String(saved.id),
        action: saved.action,
        time: saved.created_at ? new Date(saved.created_at).toLocaleString('ka-GE') : ''
      }, ...(prev || [])].slice(0, 100));
      setActivityLogsError('');
    } catch (error) {
      if (!isCurrentSession()) return;
      setActivityLogsError('აქტივობის შენახვა ვერ მოხერხდა. ' + (error?.message || ''));
      console.error('GEOSTORE admin activity log write failed:', error);
    }
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email) return;
    const staffId = createAdminId('st');
    if (!staffId) return alert(secureIdError);
    const newStaffMember = {
      id: staffId,
      name: staffForm.name.trim(),
      email: staffForm.email.trim(),
      role: staffForm.role,
      permissions: { ...staffForm.permissions }
    };
    if (!persistAdminLocalCollection('geostore_staff_list', [...staffList, newStaffMember], setStaffList, 'თანამშრომლის ჩანაწერი')) return;
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

    const staffId = createAdminId('st');
    if (!staffId) return alert(secureIdError);
    const newStaffMember = {
      id: staffId,
      name: targetUser.name || 'მომხმარებელი',
      email: targetUser.email || 'user@geostore.ge',
      role: 'მენეჯერი',
      permissions: { products: true, orders: true, analytics: true, expenses: false, crm: true, settings: false }
    };

    if (!persistAdminLocalCollection('geostore_staff_list', [...staffList, newStaffMember], setStaffList, 'თანამშრომლის ჩანაწერი')) return;
    setSelectedUserEmailForStaff('');
    logActivity(`რეგისტრირებული მომხმარებელი (${newStaffMember.email}) დაემატა ლოკალურ თანამშრომელთა სიას (როლი: მენეჯერი)`);
    alert(`✅ მომხმარებელი (${newStaffMember.name}) დაემატა მხოლოდ ლოკალურ სიაში. მენეჯერის რეალური წვდომა არ მინიჭებულა.`);
  };

  const handleSaveEditedStaff = (staffId) => {
    const updatedStaff = staffList.map(s => s.id === staffId
      ? { ...s, role: editStaffRole, permissions: { ...editStaffPermissions } }
      : s
    );
    if (!persistAdminLocalCollection('geostore_staff_list', updatedStaff, setStaffList, 'თანამშრომლის ჩანაწერი')) return;
    setEditingStaffId(null);
    logActivity(`განახლდა თანამშრომლის ლოკალური ჩანაწერი (ID: ${staffId}); რეალური წვდომა უცვლელია`);
    alert('✅ ლოკალური ჩანაწერი განახლდა. Supabase ანგარიშის ან რეალური წვდომის უფლებები არ შეცვლილა.');
  };

  const handleDeleteStaff = (staffId, staffName) => {
    if (window.confirm(`წაიშლება მხოლოდ ლოკალური თანამშრომლის ჩანაწერი "${staffName}". Supabase ანგარიში და რეალური წვდომის უფლებები უცვლელი დარჩება. გავაგრძელოთ?`)) {
      const updatedStaff = staffList.filter(s => s.id !== staffId);
      if (!persistAdminLocalCollection('geostore_staff_list', updatedStaff, setStaffList, 'თანამშრომლების სია')) return;
      logActivity(`წაიშალა თანამშრომელი: ${staffName}`);
    }
  };

  const calculatedSalesMetrics = useMemo(() => {
    const toNonNegative = value => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };
    const rawPurchaseCost = String(calcForm.purchaseCost ?? '').trim();
    const hasPurchaseCost = rawPurchaseCost !== '' && Number.isFinite(Number(rawPurchaseCost)) && Number(rawPurchaseCost) >= 0;
    const pCost = hasPurchaseCost ? Number(rawPurchaseCost) : null;
    const sPrice = toNonNegative(calcForm.sellingPrice);
    const discPct = Math.min(100, toNonNegative(calcForm.discountPercent));
    const ship = toNonNegative(calcForm.shippingCost);
    const pack = toNonNegative(calcForm.packagingCost);
    const proc = toNonNegative(calcForm.processingFee);
    const other = toNonNegative(calcForm.otherExpenses);
    const qty = Math.max(1, Math.floor(Number.isFinite(Number(calcForm.quantity)) ? Number(calcForm.quantity) : 1));

    const discountedPrice = sPrice * (1 - discPct / 100);
    const revenue = discountedPrice * qty;
    const grossProfit = pCost === null ? null : (discountedPrice - pCost) * qty;
    const netProfit = grossProfit === null ? null : grossProfit - ((ship + pack + proc + other) * qty);
    const profitMargin = netProfit !== null && revenue > 0 ? (netProfit / revenue) * 100 : null;
    const markup = pCost !== null && pCost > 0 ? ((discountedPrice - pCost) / pCost) * 100 : null;

    return { discountedPrice, revenue, grossProfit, netProfit, profitMargin, markup, hasPurchaseCost };
  }, [calcForm]);

  const analyticsData = useMemo(() => {
    const isCancelled = order => [
      'გაუქმებული', 'cancelled', 'canceled', 'отменён', 'отменен'
    ].includes(String(order?.status || '').trim().toLowerCase());
    const isDelivered = order => [
      'დასრულებული', 'ჩაბარებულია', 'delivered', 'completed', 'доставлен', 'завершён', 'завершен'
    ].includes(String(order?.status || '').trim().toLowerCase());
    const parseDate = value => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const raw = String(value).trim();
      // Date-only values represent a calendar day in the admin's local timezone.
      // Parsing YYYY-MM-DD with new Date() treats it as UTC and can shift the
      // reporting day in Georgia and other positive-offset timezones.
      const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const localDate = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      const parts = isoDate
        ? [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])]
        : localDate
          ? [Number(localDate[3]), Number(localDate[2]), Number(localDate[1])]
          : null;
      if (parts) {
        const [year, month, day] = parts;
        const parsedLocal = new Date(year, month - 1, day);
        if (parsedLocal.getFullYear() !== year || parsedLocal.getMonth() !== month - 1 || parsedLocal.getDate() !== day) return null;
        return parsedLocal;
      }
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
    let unknownRevenueItems = 0;
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
      const lineGross = items.reduce((sum, item) => {
        const rawPrice = item.priceGEL ?? item.price;
        const price = rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === '' ? NaN : Number(rawPrice);
        const quantity = Math.max(1, Number(item.quantity) || 1);
        return sum + (Number.isFinite(price) && price >= 0 ? price * quantity : 0);
      }, 0);
      const invalidRevenueQuantity = items.reduce((sum, item) => {
        const rawPrice = item.priceGEL ?? item.price;
        const price = rawPrice === null || rawPrice === undefined || String(rawPrice).trim() === '' ? NaN : Number(rawPrice);
        return sum + (Number.isFinite(price) && price >= 0 ? 0 : Math.max(1, Number(item.quantity) || 1));
      }, 0);
      const deliveryCharge = getOrderDeliveryCharge(order);
      const productNetRevenue = Math.max(0, orderTotal - deliveryCharge);
      // Do not present profit as complete when an order's product revenue
      // cannot be allocated from its immutable item-price snapshot.
      unknownRevenueItems += lineGross <= 0 && productNetRevenue > 0
        ? Math.max(invalidRevenueQuantity, items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0))
        : invalidRevenueQuantity;
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
    const lowStockProducts = getLowStockInventory(products, 5);
    // Reject malformed or non-positive historical expense values from totals.
    // The DB column is numeric but has no positive-value CHECK constraint.
    const validPeriodExpenses = periodExpenses.filter(expense => {
      const amount = Number(expense?.amount);
      return expense?.amount !== null && expense?.amount !== undefined && String(expense.amount).trim() !== ''
        && Number.isFinite(amount) && amount > 0;
    });
    const invalidExpenseItems = periodExpenses.length - validPeriodExpenses.length;
    const totalExpenses = validPeriodExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    // Gross profit is product revenue less product cost. Delivery fees are
    // tracked separately and added to net operating result, not product margin.
    const grossProfit = unknownRevenueItems === 0 && unknownCogsItems === 0 && estimatedCogsItems === 0 ? totalProductRevenue - totalCogs : null;
    const netProfit = grossProfit === null || invalidExpenseItems > 0 ? null : grossProfit + totalDeliveryRevenue - totalExpenses;
    const expenseTotals = new Map();
    validPeriodExpenses.forEach(expense => {
      const label = expense.category || 'კატეგორია მითითებული არ არის';
      const current = expenseTotals.get(label) || { label, amount: 0, count: 0 };
      current.amount += Number(expense.amount);
      current.count += 1;
      expenseTotals.set(label, current);
    });

    return {
      periodOrders, deliveredOrders, pipelineOrders, periodExpenses, validPeriodExpenses, invalidExpenseItems, salesTrend, bestSellingProducts, lowStockProducts,
      deliveredOrdersMissingStatusDate, deliveredOrdersWithoutStockTracking,
      totalSalesRevenue, totalDeliveryRevenue, totalProductRevenue,
      totalExpenses, totalCogs, grossProfit, netProfit,
      estimatedCogsItems, unknownCogsItems, unknownRevenueItems,
      averageOrderValue: deliveredOrders.length ? totalSalesRevenue / deliveredOrders.length : 0,
      incomeSources: Array.from(incomeTotals, ([label, amount]) => ({ label, amount })).sort((x, y) => y.amount - x.amount),
      productProfitability: Array.from(productProfitTotals.values()).map(item => ({
        ...item,
        grossProfit: unknownRevenueItems > 0 || item.unknownCostItems > 0 || item.estimatedCostItems > 0 ? null : item.revenue - item.cogs,
        margin: unknownRevenueItems > 0 || item.unknownCostItems > 0 || item.estimatedCostItems > 0 || item.revenue <= 0 ? null : ((item.revenue - item.cogs) / item.revenue) * 100
      })).sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)),
      vendorProfitability: Array.from(vendorProfitTotals.values()).map(item => ({
        ...item,
        productCount: item.productCount.size,
        grossProfit: unknownRevenueItems > 0 || item.unknownCostItems > 0 || item.estimatedCostItems > 0 ? null : item.revenue - item.cogs,
        margin: unknownRevenueItems > 0 || item.unknownCostItems > 0 || item.estimatedCostItems > 0 || item.revenue <= 0 ? null : ((item.revenue - item.cogs) / item.revenue) * 100
      })).sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)),
      expenseBreakdown: Array.from(expenseTotals.values()).sort((x, y) => y.amount - x.amount)
    };
  }, [orders, expenses, products, analyticsPeriod]);

  const financialOverview = analyticsData;
  const lowStockGroups = useMemo(
    () => groupLowStockInventory(financialOverview.lowStockProducts),
    [financialOverview.lowStockProducts]
  );
  const incomeSources = analyticsData.incomeSources;
  const expenseBreakdown = analyticsData.expenseBreakdown;

  const exportCsv = (filename, headers, rows) => {
    const escapeCell = value => {
      const raw = value === null || value === undefined ? '' : String(value);
      // Excel/LibreOffice may ignore leading Unicode whitespace and control characters before formula parsing.
      const leadingWhitespace = raw.match(/^[\s\p{Cf}\uFEFF]*/u)?.[0] || '';
      const formulaCandidate = raw.slice(leadingWhitespace.length);
      const formulaLike = /^[=+@]/.test(formulaCandidate) ||
        (formulaCandidate.startsWith('-') && !/^-?\d+(?:\.\d+)?$/.test(formulaCandidate));
      const safe = formulaLike ? "'" + raw : raw;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
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
        ['უცნობი შემოსავლის ერთეულები', financialOverview.unknownRevenueItems],
        ['მთლიანი მოგება', financialOverview.grossProfit === null ? (financialOverview.unknownRevenueItems > 0 ? 'ვერ განისაზღვრება — პროდუქტის გასანაწილებელი ფასი აკლია' : 'ვერ განისაზღვრება — ისტორიული თვითღირებულება არასრულია ან შეფასებულია') : financialOverview.grossProfit.toFixed(2)],
        ['ოპერაციული ხარჯები', financialOverview.totalExpenses.toFixed(2)],
        ['არასწორი ხარჯის ჩანაწერები', financialOverview.invalidExpenseItems],
        ['წმინდა მოგება', financialOverview.netProfit === null ? (financialOverview.invalidExpenseItems > 0 ? 'ვერ განისაზღვრება — ხარჯის ჩანაწერები შესამოწმებელია' : 'ვერ განისაზღვრება — თვითღირებულება არასრულია ან შეფასებულია') : financialOverview.netProfit.toFixed(2)]
      ]);
    exportCsv(`geostore-product-profitability-${periodLabel}.csv`,
      ['პროდუქტი', 'მომწოდებელი', 'კატეგორია', 'რაოდენობა', 'შემოსავალი (GEL)', 'თვითღირებულება (GEL)', 'მოგება (GEL)', 'მარჟა (%)', 'უცნობი თვითღირებულების ერთეულები', 'შეფასებული თვითღირებულების ერთეულები'],
      financialOverview.productProfitability.map(item => [item.name, item.vendor, item.category, item.quantity, item.revenue.toFixed(2), item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2), item.grossProfit === null ? 'ვერ განისაზღვრება' : item.grossProfit.toFixed(2), item.margin === null ? 'ვერ განისაზღვრება' : item.margin.toFixed(2), item.unknownCostItems, item.estimatedCostItems]));
    exportCsv(`geostore-vendor-profitability-${periodLabel}.csv`,
      ['მომწოდებელი', 'პროდუქტების რაოდენობა', 'გაყიდული ერთეულები', 'შემოსავალი (GEL)', 'თვითღირებულება (GEL)', 'მოგება (GEL)', 'მარჟა (%)', 'უცნობი თვითღირებულების ერთეულები', 'შეფასებული თვითღირებულების ერთეულები'],
      financialOverview.vendorProfitability.map(item => [item.name, item.productCount, item.quantity, item.revenue.toFixed(2), item.unknownCostItems ? 'არასრულია' : item.estimatedCostItems ? 'შეფასებულია' : item.cogs.toFixed(2), item.grossProfit === null ? 'ვერ განისაზღვრება' : item.grossProfit.toFixed(2), item.margin === null ? 'ვერ განისაზღვრება' : item.margin.toFixed(2), item.unknownCostItems, item.estimatedCostItems]));
    exportCsv(`geostore-expenses-${periodLabel}.csv`,
      ['თარიღი', 'კატეგორია', 'აღწერა', 'თანხა (GEL)', 'სტატუსი'],
      financialOverview.periodExpenses.map(item => { const amount = Number(item.amount); const valid = item.amount !== null && item.amount !== undefined && String(item.amount).trim() !== '' && Number.isFinite(amount) && amount > 0; return [item.date || item.created_at || '', item.category || '', item.description || '', valid ? amount.toFixed(2) : 'შესამოწმებელია', valid ? 'ვალიდური' : 'არავალიდური თანხა']; }));
    logActivity(`გადმოიწერა ფინანსური ანგარიშების 4 CSV ფაილი (პერიოდი: ${periodLabel})`);
  };

  const handleAiAsk = (e) => {
    e.preventDefault();
    const userQuestion = String(aiQuery || '').trim();
    if (!userQuestion) return;
    setAiQuery('');
    setAiChatLogs(prev => [...prev, { role: 'user', text: userQuestion }]);

    const qLower = userQuestion.toLocaleLowerCase();
    let answer;
    if (qLower.includes('შემოსავალ') || qLower.includes('ბრუნვა') || qLower.includes('revenue')) {
      answer = `ჩაბარებული შეკვეთების რეალიზებული შემოსავალია ${financialOverview.totalSalesRevenue.toFixed(2)} ₾.`;
    } else if (qLower.includes('მოგება') || qLower.includes('profit')) {
      answer = `წმინდა მოგება არის ${financialOverview.netProfit === null ? 'ვერ განისაზღვრება — ისტორიული თვითღირებულება აკლია ან შეფასებულია' : financialOverview.netProfit.toFixed(2) + ' ₾'}${financialOverview.estimatedCogsItems > 0 ? '. ნაწილის თვითღირებულება მიმდინარე პროდუქტის ფასითაა შეფასებული და არა შეკვეთის ისტორიული ჩანაწერით.' : '.'}`;
    } else if (qLower.includes('ხარჯ') || qLower.includes('expense') || qLower.includes('cost')) {
      answer = `არჩეულ პერიოდში აღრიცხული ხარჯებია ${financialOverview.totalExpenses.toFixed(2)} ₾.`;
    } else {
      answer = 'ეს განყოფილება ამჟამად არ არის გენერაციული AI. ის პასუხობს მხოლოდ შემოსავლის, მოგებისა და ხარჯების წინასწარ განსაზღვრულ კითხვებს. სხვა შეკითხვებისთვის საჭიროა რეალური AI ინტეგრაცია.';
    }

    setAiChatLogs(prev => [...prev, { role: 'assistant', text: answer }]);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    if (expenseSubmitInFlight.current) return;

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

    const payload = { category, amount, date: expenseForm.date, description };
    let pending = pendingExpenseRequest.current;
    if (pending && JSON.stringify(pending.payload) !== JSON.stringify(payload)) {
      try {
        const checkResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/expenses?id=eq.${encodeURIComponent(pending.id)}&select=id,category,amount,date,description`,
          { headers: await getSupabaseHeaders() }
        );
        if (!isCurrentSession()) return;
        if (!checkResponse.ok) throw new Error('წინა ხარჯის შენახვის მდგომარეობა ვერ გადამოწმდა.');
        const checkRows = await checkResponse.json();
        if (!isCurrentSession()) return;
        if (!Array.isArray(checkRows)) throw new Error('ხარჯის გადამოწმების პასუხი არასწორია.');
        const previous = checkRows[0];
        if (previous) {
          setExpenses(prev => [previous, ...(prev || []).filter(item => String(item.id) !== String(previous.id))]);
          alert('წინა ხარჯის ჩანაწერი უკვე შენახულია. განაახლეთ ისტორია და შემდეგ დაამატეთ ახალი ხარჯი.');
          pendingExpenseRequest.current = null;
          return;
        }
        pendingExpenseRequest.current = null;
        pending = null;
      } catch (error) {
        if (!isCurrentSession()) return;
        alert(error?.message || 'წინა ხარჯის მდგომარეობა ვერ დადასტურდა. მონაცემები უცვლელად დატოვეთ და სცადეთ მოგვიანებით.');
        return;
      }
    }

    if (!pending) {
      const expenseId = createAdminId('exp');
      if (!expenseId) return alert(secureIdError);
      pending = { id: expenseId, payload };
      pendingExpenseRequest.current = pending;
    }

    const newExp = { id: pending.id, ...payload };
    expenseSubmitInFlight.current = true;
    setIsSavingExpense(true);

    try {
      let savedExpense = null;
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
          method: 'POST',
          headers: { ...(await getSupabaseHeaders()), Prefer: 'return=representation' },
          body: JSON.stringify(newExp)
        });
        if (!isCurrentSession()) return;
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(detail || 'ხარჯის ბაზაში შენახვა ვერ მოხერხდა.');
        }
        const rows = await response.json();
        if (!isCurrentSession()) return;
        savedExpense = Array.isArray(rows) ? rows[0] : rows;
      } catch (writeError) {
        // A network interruption can happen after Postgres committed the row.
        // Verify the stable request ID before allowing a retry or a new expense.
        const verifyResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/expenses?id=eq.${encodeURIComponent(newExp.id)}&select=id,category,amount,date,description`,
          { headers: await getSupabaseHeaders() }
        );
        if (!isCurrentSession()) return;
        if (!verifyResponse.ok) throw writeError;
        const verifyRows = await verifyResponse.json();
        if (!isCurrentSession()) return;
        const existing = Array.isArray(verifyRows) ? verifyRows[0] : null;
        const matches = existing &&
          String(existing.id) === String(newExp.id) &&
          String(existing.category) === payload.category &&
          Number(existing.amount) === payload.amount &&
          String(existing.date || '') === String(payload.date || '') &&
          String(existing.description || '') === payload.description;
        if (!matches) throw writeError;
        savedExpense = existing;
      }

      if (
        !savedExpense ||
        String(savedExpense.id) !== String(newExp.id) ||
        String(savedExpense.category) !== payload.category ||
        Number(savedExpense.amount) !== payload.amount ||
        String(savedExpense.date || '') !== String(payload.date || '') ||
        String(savedExpense.description || '') !== payload.description
      ) {
        throw new Error('სერვერმა შენახული ხარჯის ჩანაწერი ვერ დაადასტურა. განაახლეთ ისტორია და გადაამოწმეთ ID.');
      }

      if (!isCurrentSession()) return;
      pendingExpenseRequest.current = null;
      setExpenses(prev => [savedExpense, ...(prev || []).filter(item => String(item.id) !== String(savedExpense.id))]);
      setExpenseForm({ category: 'რეკლამა & მარკეტინგი', amount: '', date: getLocalDateInputValue(), description: '' });
      logActivity(`დაემატა ახალი ხარჯი: ${payload.description} (${payload.amount} ₾)`);
      alert('✅ ხარჯი წარმატებით შეინახა ბაზაში!');
    } catch (error) {
      if (!isCurrentSession()) return;
      alert('ხარჯის შენახვა ვერ დადასტურდა. იგივე მონაცემებით ხელახლა ცდა დუბლიკატს არ შექმნის. ' + (error?.message || 'ქსელის შეცდომა'));
    } finally {
      expenseSubmitInFlight.current = false;
      if (isCurrentSession()) setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    const normalizedId = String(id || '').trim();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    if (!normalizedId || !window.confirm('ნამდვილად გსურთ ამ ხარჯის წაშლა ბაზიდან?')) return;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/expenses?id=eq.${encodeURIComponent(normalizedId)}&select=id`,
        {
          method: 'DELETE',
          headers: {
            ...(await getSupabaseHeaders()),
            Prefer: 'return=representation'
          }
        }
      );
      if (!isCurrentSession()) return;
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || 'ხარჯის წაშლა ვერ მოხერხდა.');
      }
      const deletedRows = await response.json();
      if (!isCurrentSession()) return;
      if (
        !Array.isArray(deletedRows) ||
        deletedRows.length !== 1 ||
        String(deletedRows[0]?.id) !== normalizedId
      ) {
        throw new Error('ხარჯის წაშლა სერვერმა ვერ დაადასტურა. განაახლეთ ხარჯების ისტორია.');
      }

      setExpenses(prev => (prev || []).filter(expense => String(expense.id) !== normalizedId));
      logActivity(`წაიშალა ხარჯი (ID: ${normalizedId})`);
      alert('✅ ხარჯი წარმატებით წაიშალა!');
    } catch (error) {
      if (!isCurrentSession()) return;
      alert(error?.message || 'ხარჯის წაშლისას ქსელის შეცდომა მოხდა.');
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
      saveStorefrontCategoryDraft(window.localStorage, updatedCategories);
    } catch {
      alert('კატეგორიები განახლდა მიმდინარე სესიაში, მაგრამ მონახაზის ლოკალურად შენახვა ვერ მოხერხდა. შეინახეთ მონახაზი Supabase-ში.');
    }
  };

  const handleCategoryFileChange = async (e, isEditing = false) => {
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      await validateImageFile(file, MAX_PRODUCT_IMAGE_BYTES);
      if (!isCurrentSession()) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (!isCurrentSession()) return;
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
        if (!isCurrentSession()) return;
        alert('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
        input.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      if (!isCurrentSession()) return;
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
    const catId = createAdminId('cat');
    if (!catId) return alert(secureIdError);
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
    if (!adminSessionAccessRef.current || !window.confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა ბაზიდან?')) return;
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    const productToDelete = (products || []).find(product => String(product.id) === String(id));
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_delete_product', {
        method: 'POST', headers: await getSupabaseHeaders(),
        body: JSON.stringify({ p_product_id: String(id) })
      });
      if (!isCurrentSession()) return;
      if (!res.ok) throw new Error(await res.text());
      if (await res.json() !== true) throw new Error('პროდუქტი ვერ წაიშალა ან აღარ არსებობს.');
      if (!isCurrentSession()) return;
      if (typeof setProducts === 'function') setProducts(prev => (prev || []).filter(p => String(p.id) !== String(id)));
      const productImages = [
        ...(Array.isArray(productToDelete?.gallery) ? productToDelete.gallery : []),
        productToDelete?.image
      ].filter(Boolean);
      const imagesCleaned = await deleteProductImages(productImages, id);
      if (!isCurrentSession()) return;
      logActivity('წაიშალა პროდუქტი ბაზიდან (ID: ' + id + ')');
      alert(imagesCleaned
        ? '✅ პროდუქტი წაიშალა. ფოტოების უსაფრთხოების შემოწმება დასრულდა; შეკვეთებში ან სხვა პროდუქტებში გამოყენებული ფოტოები შენარჩუნებულია.'
        : 'პროდუქტი წაიშალა, მაგრამ ზოგი ფოტო Storage-დან ვერ გაიწმინდა. პროდუქტი აღარ ჩანს მაღაზიაში; დარჩენილი ფოტოების გასუფთავება ცალკე იქნება საჭირო.');
    } catch (error) { if (!isCurrentSession()) return; alert('წაშლა ვერ შესრულდა: ' + (error.message || 'ქსელის შეცდომა')); }
  };

  const handleToggleProductPublished = async (id) => {
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    const product = (products || []).find(item => String(item.id) === String(id));
    if (!product) return alert('პროდუქტი ვერ მოიძებნა. განაახლეთ სია და სცადეთ თავიდან.');
    const key = String(id);
    if (productPublishBusyIds[key]) return;

    const currentPublished = product.isPublished !== false && product.is_published !== false;
    const nextPublished = !currentPublished;
    setProductPublishBusyIds(prev => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(key) +
        '&is_published=eq.' + String(currentPublished) + '&select=id,is_published',
        {
          method: 'PATCH',
          headers: await getSupabaseHeaders(),
          body: JSON.stringify({ is_published: nextPublished })
        }
      );
      if (!isCurrentSession()) return;
      if (!response.ok) throw new Error(await response.text());
      const savedRows = await response.json();
      if (!isCurrentSession()) return;
      if (!Array.isArray(savedRows) || savedRows.length !== 1 ||
          String(savedRows[0].id) !== key || savedRows[0].is_published !== nextPublished) {
        throw new Error('სტატუსი ვერ დადასტურდა. შესაძლოა პროდუქტი სხვა ადმინისტრატორმა პარალელურად შეცვალა. განაახლეთ სია.');
      }

      if (typeof setProducts === 'function') {
        setProducts(prev => (prev || []).map(item => String(item.id) === key
          ? { ...item, isPublished: nextPublished, is_published: nextPublished }
          : item
        ));
      }
      logActivity((nextPublished ? 'გამოქვეყნდა' : 'დაიმალა') + ' პროდუქტი: ' + (product.name || key));
    } catch (error) {
      if (!isCurrentSession()) return;
      alert('პროდუქტის გამოქვეყნების სტატუსი ვერ შეიცვალა: ' + (error.message || 'ქსელის შეცდომა'));
    } finally {
      // Always release this component-local lock, even if the admin session
      // changed while the request was pending. The request's result remains
      // guarded above, so a stale session cannot update product data.
      setProductPublishBusyIds(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleQuickUpdateProduct = async (id, field, value) => {
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    const current = (products || []).find(p => String(p.id) === String(id));
    if (!current) return alert('პროდუქტი ვერ მოიძებნა. განაახლეთ გვერდი და სცადეთ თავიდან.');
    if (field === 'stock' && Array.isArray(current.variants) && current.variants.length > 0) {
      return alert('ამ პროდუქტს აქვს ზომის/ფერის ან ინდივიდუალური ვარიანტები. მარაგი შეცვალეთ პროდუქტის რედაქტირების ფანჯარაში თითოეული ვარიანტისთვის.');
    }
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
      const response = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(String(id)) + '&' + compareFilter + '&select=id,price_gel,stock,old_price_gel', {
        method: 'PATCH', headers: await getSupabaseHeaders(), body: JSON.stringify({ [column]: val })
      });
      if (!isCurrentSession()) return;
      if (!response.ok) throw new Error(await response.text());
      const savedRows = await response.json();
      if (!isCurrentSession()) return;
      if (!Array.isArray(savedRows) || savedRows.length !== 1) {
        throw new Error('მონაცემი პარალელურად შეიცვალა. განაახლეთ პროდუქტის სია და სცადეთ ხელახლა.');
      }
      const savedValue = field === 'purchaseCost' ? val : Number(savedRows[0][column]);
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
      if (field === 'stock') {
        setStockDrafts(prev => {
          const draftKey = String(id);
          // Do not erase a newer value typed while this request was in flight.
          if (prev[draftKey] !== String(value)) return prev;
          const next = { ...prev };
          delete next[draftKey];
          return next;
        });
      } else {
        setQuickProductDrafts(prev => {
          const draftKey = field + ':' + String(id);
          // Clear only the exact draft that this request successfully saved.
          if (prev[draftKey] !== String(value)) return prev;
          const next = { ...prev };
          delete next[draftKey];
          return next;
        });
      }
    } catch (error) {
      if (!isCurrentSession()) return;
      alert('პროდუქტის განახლება ვერ შესრულდა: ' + (error.message || 'ქსელის შეცდომა'));
    }
  };
  const handleImageChange = async (e) => {
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
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
      if (!isCurrentSession()) return;
      const promises = files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('ფოტოს წაკითხვა ვერ მოხერხდა.'));
        reader.readAsDataURL(file);
      }));
      const base64Images = await Promise.all(promises);
      if (!isCurrentSession()) return;
      setSelectedImages(prev => [...(prev || []), ...base64Images]);
    } catch (error) {
      if (!isCurrentSession()) return;
      alert(error.message || 'ფოტოს დამუშავება ვერ მოხერხდა.');
    }
  };

  const handleEditProduct = (p) => {
    const savedSizes = Array.isArray(p.availableSizes)
      ? p.availableSizes
      : Array.isArray(p.available_sizes) ? p.available_sizes : [];
    const savedColors = Array.isArray(p.availableColors)
      ? p.availableColors
      : Array.isArray(p.available_colors) ? p.available_colors : [];
    setEditingProductId(String(p.id));
    setProductOptionDrafts({
      availableSizes: savedSizes.join(', '),
      availableColors: savedColors.join(', ')
    });
    setProductForm({
      ...productFormInitial, name: p.name || '', category: p.category || productFormInitial.category,
      priceGEL: String(p.priceGEL ?? p.price_gel ?? ''), oldPriceGEL: String(p.oldPriceGEL ?? p.old_price_gel ?? ''),
      purchaseCost: String(p.purchaseCost ?? p.purchase_cost ?? ''), stock: String(p.stock ?? 0),
      vendor: p.vendor || '', description: p.description || '', tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      material: p.material || '', durability: p.durability || '', brand: p.brand || '',
      model: p.model || '', cpu: p.cpu || '', ram: p.ram || '', storage: p.storage || '',
      gpu: p.gpu || '', screenSize: p.screenSize || p.screen_size || '', os: p.os || '',
      availableSizes: savedSizes,
      availableColors: savedColors,
      isFeatured: Boolean(p.isFeatured ?? p.is_featured)
    });
    setSelectedImages(p.gallery?.length ? p.gallery : (p.image ? [p.image] : []));
    const savedVariants = Array.isArray(p.variants) ? p.variants : [];
    const savedSizeColorVariants = savedVariants.filter(variant => variant?.variantType === 'size_color');
    setInitialSizeColorStock(savedSizeColorVariants.map(variant => ({
      id: String(variant.id),
      stock: Number(variant.stock)
    })));
    const savedCustomVariants = savedVariants.filter(variant => variant?.variantType !== 'size_color');
    setInitialCustomVariantStock(savedCustomVariants.map(variant => ({
      id: String(variant.id),
      stock: Number(variant.stock)
    })));
    setProductVariants(savedCustomVariants);
    setSizeColorStock(savedSizeColorVariants);
    document.getElementById('geostore-product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetProductEditor = () => {
    setEditingProductId(null);
    setProductForm(productFormInitial);
    setProductOptionDrafts({
      availableSizes: productFormInitial.availableSizes.join(', '),
      availableColors: productFormInitial.availableColors.join(', ')
    });
    setSelectedImages([]);
    setProductVariants([]);
    setInitialCustomVariantStock([]);
    setInitialSizeColorStock([]);
    setSizeColorStock(buildSizeColorStockVariants(productFormInitial.availableSizes, productFormInitial.availableColors, [], 0));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    if (productSaveInFlight.current) return;

    const productName = String(productForm.name || '').trim();
    if (!productName || productForm.priceGEL === '') return alert('შეავსეთ პროდუქტის სახელი და ფასი.');
    if (productName.length > 160) return alert('პროდუქტის სახელი მაქსიმუმ 160 სიმბოლოს უნდა შეიცავდეს.');
    if (!String(productForm.category || '').trim() || String(productForm.category).trim().length > 80) return alert('აირჩიეთ სწორი კატეგორია (მაქსიმუმ 80 სიმბოლო).');
    const priceValue = Number(productForm.priceGEL);
    if (!Number.isFinite(priceValue) || String(productForm.priceGEL).trim() === '' || priceValue < 0 || priceValue > 1000000000 || !/^\d+(?:\.\d{1,2})?$/.test(String(productForm.priceGEL).trim())) return alert('ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    const purchaseCostResult = parseOptionalMoney(productForm.purchaseCost);
    if (!purchaseCostResult.valid) return alert('თვითღირებულება უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    const purchaseCost = purchaseCostResult.value;
    const stockResult = parseStockQuantity(productForm.stock);
    if (!stockResult.valid) return alert('მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.');
    const stock = stockResult.value;
    
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
    const parseProductOptionDraft = value => String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);
    const availableSizes = normalizeProductOptions(parseProductOptionDraft(productOptionDrafts.availableSizes), 'ზომები');
    if (availableSizes === null) return;
    const availableColors = normalizeProductOptions(parseProductOptionDraft(productOptionDrafts.availableColors), 'ფერები');
    if (availableColors === null) return;
    const effectiveSizeColorStock = sizeColorStock.length > 0
      ? buildSizeColorStockVariants(availableSizes, availableColors, sizeColorStock, priceValue)
      : [];
    if (sizeColorStock.length > 0 && effectiveSizeColorStock.length === 0) {
      return alert('ზომებისა და ფერების მარაგის ცხრილში მინიმუმ ერთი ზომა ან ფერი უნდა დარჩეს.');
    }
    const originalPrice = productForm.oldPriceGEL === '' ? 0 : Number(productForm.oldPriceGEL);
    if (!Number.isFinite(originalPrice) || originalPrice < 0 || originalPrice > 1000000000 || (productForm.oldPriceGEL !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(productForm.oldPriceGEL).trim()))) return alert('ძველი ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და მაქსიმუმ 2 ათწილადი ნიშნით.');
    if (originalPrice > 0 && originalPrice <= priceValue) return alert('ძველი ფასი მიმდინარე ფასზე მეტი უნდა იყოს. თუ ფასდაკლება არ მოქმედებს, ძველი ფასი გაასუფთავეთ.');
    

    const tagsArray = productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (tagsArray.length > 30 || tagsArray.some(tag => tag.length > 40) ||
        new Set(tagsArray.map(tag => tag.toLocaleLowerCase())).size !== tagsArray.length) {
      return alert('ტეგები უნდა იყოს უნიკალური: მაქსიმუმ 30 ტეგი, თითოეული არაუმეტეს 40 სიმბოლოსი.');
    }
    const isSizeColorInventoryCategory = supportsSizeColorInventoryCategory(productForm.category);
    if (sizeColorStock.length > 0 && !isSizeColorInventoryCategory) {
      return alert('ზომებისა და ფერების მარაგი გამოიყენება მხოლოდ ტანსაცმლისა და ფეხსაცმლის კატეგორიებისთვის.');
    }
    if (sizeColorStock.length > 0 && productVariants.length > 0) {
      return alert('ერთი პროდუქტი გამოიყენებს ან ზომა/ფერის მარაგის მატრიცას, ან ინდივიდუალურ ვარიანტებს — ორივეს ერთად არა.');
    }
    const normalizedSizeColorStock = effectiveSizeColorStock.map(variant => ({
      ...variant,
      priceGEL: priceValue,
      stock: Number(variant.stock)
    }));
    const initialStockByVariantId = new Map(initialSizeColorStock.map(variant => [
      String(variant.id),
      Number(variant.stock)
    ]));
    const changedSizeColorStocks = normalizedSizeColorStock
      .filter(variant => {
        const initialStock = initialStockByVariantId.get(String(variant.id));
        return initialStock === undefined
          ? Number(variant.stock) > 0
          : initialStock !== Number(variant.stock);
      })
      .map(variant => ({ id: variant.id, stock: Number(variant.stock) }));
    const initialCustomStockByVariantId = new Map(initialCustomVariantStock.map(variant => [
      String(variant.id), Number(variant.stock)
    ]));
    const changedCustomVariantStocks = productVariants
      .filter(variant => {
        const initialStock = initialCustomStockByVariantId.get(String(variant.id));
        return initialStock === undefined || initialStock !== Number(variant.stock);
      })
      .map(variant => ({ id: String(variant.id), stock: Number(variant.stock) }));
    const sizeColorValidation = validateSizeColorInventoryVariants(normalizedSizeColorStock, availableSizes, availableColors);
    if (!sizeColorValidation.valid) {
      const sizeColorErrors = {
        count: 'ზომისა და ფერის მარაგის კომბინაციები მაქსიმუმ 50 უნდა იყოს.',
        coverage: 'მარაგის ცხრილში ყველა ზომისა და ფერის კომბინაცია უნდა იყოს მითითებული. გადაამოწმეთ ზომები და ფერები.',
        shape: 'ზომისა და ფერის მარაგის ჩანაწერი არასწორია.',
        identity: 'თითოეულ კომბინაციას უნდა ჰქონდეს უნიკალური ID და სახელი.',
        combination: 'ზომისა და ფერის კომბინაცია დუბლირებულია ან აღარ არის ხელმისაწვდომი.',
        price: 'კომბინაციის ფასი არასწორია.',
        stock: 'თითოეული კომბინაციის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.'
      };
      return alert(sizeColorErrors[sizeColorValidation.reason] || 'ზომისა და ფერის მარაგის შემოწმება ვერ მოხერხდა.');
    }
    const variantsValidation = validateProductVariants([...productVariants, ...normalizedSizeColorStock]);
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
    const prodId = editingProductId || createAdminId('prod');
    if (!prodId) return alert(secureIdError);
    const newProductSku = editingProductId
      ? ((products || []).find(p => String(p.id) === String(editingProductId))?.sku || null)
      : createAdminId('GEO');
    if (!editingProductId && !newProductSku) return alert(secureIdError);
    let galleryImages = [];
    let newlyUploadedImages = [];
    let newProdPayload;
    // Keep uploaded images if the database request may have reached Postgres.
    // A lost response must never delete assets that a committed product references.
    let productSaveRequestStarted = false;
    let productSaveCommitted = false;

    productSaveInFlight.current = true;
    try {
      const sourceImages = selectedImages.length > 0 ? selectedImages : [];
      if (sourceImages.length === 0) {
        throw new Error('პროდუქტის შესანახად დატოვეთ ან ატვირთეთ მინიმუმ ერთი ფოტო. არსებული ფოტოები არ წაიშლება.');
      }
      if (sourceImages.length > MAX_PRODUCT_GALLERY_IMAGES) {
        throw new Error(`პროდუქტის გალერეაში მაქსიმუმ ${MAX_PRODUCT_GALLERY_IMAGES} ფოტოა დაშვებული.`);
      }
      newlyUploadedImages = [];
      for (let index = 0; index < sourceImages.length; index += 1) {
        const sourceImage = sourceImages[index];
        const uploadedImage = await uploadProductImage(sourceImage, prodId, index, newlyUploadedImages);
        if (!isCurrentSession()) throw new Error('ადმინისტრატორის სესია დასრულდა. ატვირთული ფოტოები უსაფრთხოდ დამუშავდება; ხელახლა შედით და გადაამოწმეთ პროდუქტი.');
        galleryImages.push(uploadedImage);
      }
      const mainImage = galleryImages[0] || null;
      newProdPayload = {
      id: prodId,
      sku: newProductSku,
      name: productName,
      category: String(productForm.category).trim(),
      vendor: productForm.vendor || 'GEOSTORE ოფიციალური',
      price_gel: priceValue,
      old_price_gel: originalPrice > 0 ? originalPrice : null,
      purchase_cost: purchaseCost,
      stock: normalizedSizeColorStock.length > 0
        ? normalizedSizeColorStock.reduce((total, variant) => total + variant.stock, 0)
        : stock,
      image: mainImage,
      gallery: galleryImages,
      tags: tagsArray,
      description: productForm.description || '',
      available_sizes: availableSizes,
      available_colors: availableColors,
      variants: [...productVariants, ...normalizedSizeColorStock],
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
      let savedVariantStockResult = null;
      let savedCustomVariantStockResult = null;
      if (editingProductId) {
        // The editor never changes base stock. Omit its potentially stale snapshot;
        // inventory is changed only through the explicit stock controls below.
        const productUpdatePayload = { ...newProdPayload };
        delete productUpdatePayload.stock;
        // Product fields and explicit variant stock changes are committed atomically.
        const updateHeaders = await getSupabaseHeaders();
        if (!isCurrentSession()) throw new Error('ადმინისტრატორის სესია დასრულდა. პროდუქტის შენახვა არ დაწყებულა.');
        productSaveRequestStarted = true;
        const updateResponse = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_update_product_with_stock', {
          method: 'POST',
          headers: updateHeaders,
          body: JSON.stringify({
            p_product: productUpdatePayload,
            p_size_color_stocks: changedSizeColorStocks,
            p_custom_variant_stocks: changedCustomVariantStocks
          })
        });
        if (!isCurrentSession()) return;
        if (!updateResponse.ok) {
          // The request reached the RPC endpoint; a gateway/proxy error can
          // arrive after the database transaction committed. Keep the upload
          // until a fresh product read proves it is unreferenced.
          throw new Error(await updateResponse.text());
        }
        productSaveCommitted = true;
        const updatePayload = await updateResponse.json();
        if (!isCurrentSession()) return;
        const updateResult = Array.isArray(updatePayload) ? updatePayload[0] : updatePayload;
        savedProductRow = updateResult?.product ?? null;
        savedVariantStockResult = updateResult?.stock?.size_color ?? null;
        savedCustomVariantStockResult = updateResult?.stock?.custom ?? null;
        if (
          !savedProductRow ||
          typeof savedProductRow !== 'object' ||
          String(savedProductRow.id ?? '') !== String(prodId) ||
          !Array.isArray(savedProductRow.variants)
        ) {
          throw new Error('სერვერმა განახლებული პროდუქტის დადასტურებული ჩანაწერი ვერ დააბრუნა. განაახლეთ სია და გადაამოწმეთ პროდუქტი.');
        }
        if (changedSizeColorStocks.length > 0 && (
          !savedVariantStockResult ||
          Number(savedVariantStockResult.updated) !== changedSizeColorStocks.length ||
          Number(savedVariantStockResult.stock) < 0 ||
          !Number.isSafeInteger(Number(savedVariantStockResult.stock))
        )) {
          throw new Error('ზომებისა და ფერების მარაგის ყველა ცვლილება ვერ დადასტურდა. განაახლეთ პროდუქტის სია.');
        }
        if (changedCustomVariantStocks.length > 0 && (
          !savedCustomVariantStockResult ||
          Number(savedCustomVariantStockResult.updated) !== changedCustomVariantStocks.length ||
          Number(savedCustomVariantStockResult.stock) < 0 ||
          !Number.isSafeInteger(Number(savedCustomVariantStockResult.stock))
        )) {
          throw new Error('ინდივიდუალური ვარიანტების მარაგის ყველა ცვლილება ვერ დადასტურდა. განაახლეთ პროდუქტის სია.');
        }
      } else {
        const createHeaders = await getSupabaseHeaders();
        if (!isCurrentSession()) throw new Error('ადმინისტრატორის სესია დასრულდა. პროდუქტის შექმნა არ დაწყებულა.');
        productSaveRequestStarted = true;
        const createResponse = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_save_product', {
          method: 'POST', headers: createHeaders, body: JSON.stringify({ p_product: newProdPayload })
        });
        if (!isCurrentSession()) return;
        if (!createResponse.ok) {
          // Treat every post-request failure as ambiguous. A proxy can lose
          // the response after commit, so never delete potentially referenced uploads.
          throw new Error(await createResponse.text());
        }
        productSaveCommitted = true;
        const createdResult = await createResponse.json();
        if (!isCurrentSession()) return;
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
      if (!isCurrentSession()) return;
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
      const savedVariants = Array.isArray(savedProductRow?.variants) ? savedProductRow.variants : newProdPayload.variants;
      // Keep the database's latest stock for untouched variants. The editor may
      // have been open while checkout deducted stock, so only overlay quantities
      // that the admin explicitly changed and the stock RPC confirmed.
      const explicitlyChangedStockById = new Map([
        ...changedSizeColorStocks,
        ...changedCustomVariantStocks
      ].map(variant => [String(variant.id), Number(variant.stock)]));
      const localVariants = savedVariants.map(variant => {
        const changedStock = explicitlyChangedStockById.get(String(variant.id));
        return changedStock === undefined ? variant : { ...variant, stock: changedStock };
      });
      const localSizeColorStock = localVariants.filter(variant => variant?.variantType === 'size_color');
      const localProdObject = {
        id: prodId, createdAt: resolveProductCreatedAt({ isEditing: Boolean(editingProductId), savedRow: savedProductRow, existingProduct }),
        sku: newProdPayload.sku, name: newProdPayload.name, category: newProdPayload.category,
        vendor: newProdPayload.vendor, priceGEL: newProdPayload.price_gel,
        oldPriceGEL: newProdPayload.old_price_gel, purchaseCost: newProdPayload.purchase_cost,
        stock: localVariants.length > 0
          ? localVariants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0)
          : (editingProductId ? Number(savedProductRow?.stock ?? 0) : newProdPayload.stock),
        image: newProdPayload.image, gallery: galleryImages, tags: tagsArray,
        description: newProdPayload.description, availableSizes: newProdPayload.available_sizes,
        availableColors: newProdPayload.available_colors,
        variants: localVariants,
        material: newProdPayload.material, durability: newProdPayload.durability,
        brand: newProdPayload.brand, isFeatured: newProdPayload.is_featured,
        isPublished: existingProduct ? (existingProduct.isPublished ?? existingProduct.is_published ?? true) !== false : true,
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
      if (!productSaveCommitted && !productSaveRequestStarted && newlyUploadedImages.length > 0) {
        await deleteProductImages(newlyUploadedImages, prodId);
      }
      if (!isCurrentSession()) return;
      if (productSaveCommitted || productSaveRequestStarted) {
        const detail = error?.message ? ` დეტალი: ${error.message}` : '';
        const outcomeUnknown = productSaveRequestStarted && !productSaveCommitted;
        alert(editingProductId
          ? (outcomeUnknown
            ? 'პროდუქტის განახლების პასუხი დაიკარგა და შედეგი ჯერ გაურკვეველია. ახალი ფოტოები უსაფრთხოდ შევინარჩუნე. განაახლეთ პროდუქტების სია, ხელახლა გახსენით პროდუქტი და მხოლოდ ამის შემდეგ გადაწყვიტეთ ხელახლა შენახვა.' + detail
            : 'პროდუქტისა და ვარიანტების მარაგის ერთიანი განახლება სერვერმა მიიღო, მაგრამ საბოლოო პასუხის დადასტურება ვერ მოხერხდა. განაახლეთ სია, ხელახლა გახსენით პროდუქტი და გადაამოწმეთ შედეგი; ძველი ფორმიდან შენახვა აღარ გაიმეოროთ.' + detail)
          : (outcomeUnknown
            ? 'პროდუქტის შექმნის პასუხი დაიკარგა და შედეგი ჯერ გაურკვეველია. ფოტოები უსაფრთხოდ შევინარჩუნე. ჯერ განაახლეთ პროდუქტების სია და გადაამოწმეთ, ხომ არ შეიქმნა პროდუქტი; თავიდან დამატებამ შეიძლება დუბლიკატი შექმნას.' + detail
            : 'პროდუქტის შექმნის მოთხოვნა სერვერმა მიიღო, მაგრამ საბოლოო დადასტურება ვერ მოხერხდა. ჯერ განაახლეთ პროდუქტის სია და გადაამოწმეთ, ხომ არ შეიქმნა პროდუქტი; თავიდან დამატებამ შეიძლება დუბლიკატი შექმნას.' + detail));
        return;
      }
      alert(error.message || 'პროდუქტის ან ფოტოს შენახვა ვერ მოხერხდა.');
    } finally {
      productSaveInFlight.current = false;
    }
  };

  const handleExportProducts = () => {
    if (!products || products.length === 0) {
      alert('ექსპორტისთვის პროდუქტები არ არის.');
      return;
    }

    // Keep the original seven columns first for existing spreadsheet workflows,
    // then include the complete editable product metadata and variant snapshot.
    exportCsv(
      `geostore_products_${Date.now()}.csv`,
      [
        'ID', 'SKU', 'Name', 'Category', 'Price (GEL)', 'Stock', 'Vendor',
        'Old Price (GEL)', 'Purchase Cost (GEL)', 'Description', 'Tags',
        'Material', 'Durability', 'Brand', 'Model', 'CPU', 'RAM', 'Storage',
        'GPU', 'Screen Size', 'OS', 'Available Sizes (JSON)', 'Available Colors (JSON)',
        'Variants (JSON)', 'Main Image URL', 'Gallery (JSON)', 'Published', 'Featured'
      ],
      products.map(p => [
        p.id,
        p.sku || 'N/A',
        p.name,
        p.category,
        p.priceGEL,
        p.stock ?? 0,
        p.vendor || 'GEOSTORE',
        p.oldPriceGEL ?? p.old_price_gel ?? '',
        p.purchaseCost ?? p.purchase_cost ?? '',
        p.description || '',
        Array.isArray(p.tags) ? JSON.stringify(p.tags) : (p.tags || ''),
        p.material || '',
        p.durability || '',
        p.brand || '',
        p.model || '',
        p.cpu || '',
        p.ram || '',
        p.storage || '',
        p.gpu || '',
        p.screenSize || p.screen_size || '',
        p.os || '',
        JSON.stringify(Array.isArray(p.availableSizes) ? p.availableSizes : p.available_sizes || []),
        JSON.stringify(Array.isArray(p.availableColors) ? p.availableColors : p.available_colors || []),
        JSON.stringify(Array.isArray(p.variants) ? p.variants : []),
        p.image || '',
        JSON.stringify(Array.isArray(p.gallery) ? p.gallery : []),
        (p.isPublished ?? p.is_published) !== false,
        Boolean(p.isFeatured ?? p.is_featured)
      ])
    );
    logActivity(`გადმოიწერა პროდუქტების სრული CSV ექსპორტი (${products.length} პროდუქტი)`);
  };

  const handleApplyFlashSale = async (e) => {
    e.preventDefault();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;


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
      const headers = await getSupabaseHeaders();
      if (!isCurrentSession()) return;
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/admin_apply_flash_sale', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_discount_percent: percent,
          p_category: category
        })
      });

      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || 'ფასდაკლების შენახვა ვერ მოხერხდა.');
      }

      const updatedCount = Number(await response.json());
      if (!isCurrentSession()) return;
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
          if (!isCurrentSession()) return;
          if (Array.isArray(rows)) refreshedRows = rows;
        }
      } catch (refreshError) {
        if (!isCurrentSession()) return;
        console.warn('Flash sale saved, but product refresh failed:', refreshError);
      }
      if (!isCurrentSession()) return;

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
      if (isCurrentSession()) setFlashSaleForm({ discountPercent: '', category: 'ყველა' });
    } catch (error) {
      if (!isCurrentSession()) return;
      console.error('Flash sale update failed:', error);
      alert('ფასდაკლების შენახვა ვერ მოხერხდა: ' + (error?.message || 'ქსელის შეცდომა'));
    } finally {
      if (isCurrentSession()) setIsApplyingFlashSale(false);
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
          const imageSrc = safeImageSrc(
            resolveOrderItemImage(item, products)
          );
          const quantity = Math.max(1, Math.floor(numericValue(item.quantity) || 1));
          const unitPrice = numericValue(item.priceGEL ?? item.price_gel ?? item.price);
          return `
            <tr>
              <td>${imageSrc ? `<img src="${imageSrc}" width="40" height="40" alt="" onerror="this.style.display='none'" style="object-fit:contain; border-radius:8px;" />` : ''} ${escapeHtml(item.name || item.product_name || 'პროდუქტი')} ${item.sku || item.product_sku ? `(SKU: ${escapeHtml(item.sku || item.product_sku)})` : ''} ${item.selectedSize ? `(ზომა: ${escapeHtml(item.selectedSize)})` : ''} ${item.selectedColor ? `(ფერი: ${escapeHtml(item.selectedColor)})` : '' } ${(item.customVariantName || item.custom_variant_name) ? `(ვარიანტი: ${escapeHtml(item.customVariantName || item.custom_variant_name)})` : ''} ${(item.gift_wrap === true || item.giftWrap === true) ? '(სასაჩუქრე შეფუთვა +5 ₾)' : ''} ${(item.vip_warranty === true || item.vipWarranty === true) ? '(VIP გარანტია +15 ₾)' : ''} ${(item.gift_message || item.giftMessage) ? `<br/><small>სასაჩუქრე ტექსტი: ${escapeHtml(item.gift_message || item.giftMessage)}</small>` : ''}</td>
              <td>${quantity}</td>
              <td>${unitPrice.toFixed(2)} ₾</td>
              <td>${(unitPrice * quantity).toFixed(2)} ₾</td>
            </tr>
          `;
        }).join('')
      : `<tr><td>${escapeHtml(order.itemSummary || 'პროდუქტები')}</td><td>1</td><td>${numericValue(order.totalGEL ?? order.total_gel ?? order.total).toFixed(2)} ₾</td><td>${numericValue(order.totalGEL ?? order.total_gel ?? order.total).toFixed(2)} ₾</td></tr>`;

    const invoiceTotal = order.totalGEL ?? order.total_gel ?? order.total;
    const formattedTotal = typeof formatPrice === 'function'
      ? escapeHtml(formatPrice(invoiceTotal))
      : `${numericValue(invoiceTotal).toFixed(2)} ₾`;

    // Keep invoice totals consistent with the server-calculated checkout breakdown.
    // Older orders may not have a persisted breakdown, so retain their total-only invoice.
    const breakdown = resolveOrderCheckoutBreakdown(order);
    const breakdownRows = breakdown
      && Number.isFinite(Number(breakdown.subtotalGEL))
      && Number(breakdown.subtotalGEL) >= 0
      && Number.isFinite(Number(breakdown.discountGEL))
      && Number(breakdown.discountGEL) >= 0
      && Number.isFinite(Number(breakdown.deliveryGEL))
      && Number(breakdown.deliveryGEL) >= 0
      ? `
          <div class="totals-breakdown">
            <div><span>პროდუქტებისა და დამატებითი სერვისების ჯამი:</span><b>${escapeHtml(formatPrice ? formatPrice(breakdown.subtotalGEL) : numericValue(breakdown.subtotalGEL).toFixed(2) + ' ₾')}</b></div>
            ${numericValue(breakdown.discountGEL) > 0 ? `<div class="discount"><span>ფასდაკლება${breakdown.couponCode ? ' (' + escapeHtml(breakdown.couponCode) + ')' : ''}:</span><b>−${escapeHtml(formatPrice ? formatPrice(breakdown.discountGEL) : numericValue(breakdown.discountGEL).toFixed(2) + ' ₾')}</b></div>` : ''}
            <div><span>მიტანის საფასური:</span><b>${escapeHtml(formatPrice ? formatPrice(breakdown.deliveryGEL) : numericValue(breakdown.deliveryGEL).toFixed(2) + ' ₾')}</b></div>
          </div>
        `
      : '';

    const htmlContent = `
      <!doctype html>
      <html lang="ka">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ინვოისი #${escapeHtml(order.id)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Noto Sans Georgian', sans-serif; padding: 24px; color: #111; font-size: 13px; }
            .header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
            .store-name { font-size: 24px; font-weight: 900; color: #059669; }
            .order-info { margin-bottom: 20px; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
            .order-info p { margin: 4px 0; overflow-wrap: anywhere; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { border: 1px solid #ddd; padding: 9px; text-align: left; font-size: 12px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
            th { background-color: #f8fafc; }
            td img { display: inline-block; width: 40px; height: 40px; max-width: 100%; object-fit: contain; vertical-align: middle; margin: 0 6px 4px 0; }
            .totals-breakdown { width: min(100%, 420px); margin: 20px 0 0 auto; display: grid; gap: 8px; font-size: 13px; }
            .totals-breakdown > div { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
            .totals-breakdown > div span { min-width: 0; overflow-wrap: anywhere; }
            .totals-breakdown > div b { flex: 0 0 auto; }
            .totals-breakdown .discount { color: #059669; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 14px; overflow-wrap: anywhere; }
            thead { display: table-header-group; }
            tr, .totals-breakdown, .total { break-inside: avoid; page-break-inside: avoid; }
            @page { size: auto; margin: 12mm; }
            @media (max-width: 640px) {
              body { padding: 12px; }
              .header { gap: 8px; }
              .store-name { font-size: 20px; }
              th, td { padding: 6px 4px; font-size: 10px; }
              .order-info { font-size: 12px; }
            }
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              a { color: inherit; text-decoration: none; }
              img { max-width: 100%; }
            }
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
              <p>თარიღი: ${escapeHtml(order.created_at || order.createdAt || order.date || '—')} ${escapeHtml(order.time || '')}</p>
            </div>
          </div>
          <div class="order-info">
            <p><b>მყიდველი:</b> ${escapeHtml(order.customerName || order.customer_name || order.name || 'მითითებული არ არის')}</p>
            <p><b>გვარი:</b> ${escapeHtml(order.customer_surname || order.customerSurname || order.surname || 'მითითებული არ არის')}</p>
            <p><b>ტელეფონი:</b> ${escapeHtml(order.phone || order.customer_phone || 'მითითებული არ არის')}</p>
            <p><b>ელ-ფოსტა:</b> ${escapeHtml(order.user_email || order.customer_email || order.email || 'მითითებული არ არის')}</p>
            <p><b>მიტანის მისამართი:</b> ${escapeHtml([order.address || order.delivery_address || order.shipping_address, order.city, order.region, order.postal_code || order.postalCode].filter(value => value !== null && value !== undefined && String(value).trim()).join(', ') || 'მითითებული არ არის')}</p>
            <p><b>შეკვეთის სტატუსი:</b> ${escapeHtml(order.status || 'ახალი')}</p>
            <p><b>გადახდის მეთოდი / გადახდის სტატუსი:</b> სისტემაში ცალკე არ ინახება; შეკვეთის სტატუსი გადახდის დადასტურებას არ ნიშნავს.</p>
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
          ${breakdownRows}
          <div class="total">
            სულ გადასახდელი: ${formattedTotal}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onafterprint = () => {
      try { printWindow.close(); } catch {}
    };
    const waitForInvoiceAssets = async () => {
      try {
        if (printWindow.document.fonts?.ready) await printWindow.document.fonts.ready;
        const images = Array.from(printWindow.document.images || []);
        await Promise.all(images.map((image) => {
          if (image.complete) {
            if (image.naturalWidth === 0) image.style.display = 'none';
            return Promise.resolve();
          }
          return new Promise((resolve) => {
            const finish = () => {
              if (image.naturalWidth === 0) image.style.display = 'none';
              resolve();
            };
            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', finish, { once: true });
            setTimeout(finish, 5000);
          });
        }));
      } catch (assetError) {
        console.warn('Invoice asset preparation failed; continuing with available content:', assetError);
      }
      if (printWindow.closed) return;
      printWindow.focus();
      printWindow.print();
    };
    waitForInvoiceAssets();

    logActivity(`გაიხსნა ინვოისის ბეჭდვის ფანჯარა შეკვეთისთვის #${String(order.id ?? '').slice(0, 120)}`);
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    const normalizedTicketId = String(ticketId || '').trim();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    if (!normalizedTicketId || !['ღია', 'მუშავდება', 'მოგვარებული'].includes(newStatus)) return;
    if (ticketStatusInFlight.current.has(normalizedTicketId)) return;

    ticketStatusInFlight.current.add(normalizedTicketId);
    setTicketStatusBusy(prev => ({ ...prev, [normalizedTicketId]: true }));
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${encodeURIComponent(normalizedTicketId)}&select=id,status`,
        {
          method: 'PATCH',
          headers: { ...(await getSupabaseHeaders()), Prefer: 'return=representation' },
          body: JSON.stringify({ status: newStatus })
        }
      );
      if (!isCurrentSession()) return;
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || 'ტიკეტის სტატუსის განახლება ვერ მოხერხდა.');
      }

      const updatedRows = await response.json();
      if (!isCurrentSession()) return;
      if (
        !Array.isArray(updatedRows) ||
        updatedRows.length !== 1 ||
        String(updatedRows[0]?.id) !== normalizedTicketId ||
        updatedRows[0]?.status !== newStatus
      ) {
        throw new Error('სტატუსის ცვლილება სერვერმა ვერ დაადასტურა. განაახლეთ ტიკეტების სია.');
      }

      await Promise.allSettled([
        fetchTickets(),
        String(selectedSupportTicketId) === normalizedTicketId
          ? fetchSupportTicketThread(normalizedTicketId)
          : Promise.resolve()
      ]);
      if (!isCurrentSession()) return;
      logActivity(`ტიკეტის #${normalizedTicketId} სტატუსი შეიცვალა: ${newStatus}`);
    } catch (error) {
      if (!isCurrentSession()) return;
      alert(error?.message || 'ტიკეტის სტატუსის განახლებისას შეცდომა მოხდა.');
    } finally {
      ticketStatusInFlight.current.delete(normalizedTicketId);
      if (isCurrentSession()) setTicketStatusBusy(prev => ({ ...prev, [normalizedTicketId]: false }));
    }
  };

  const handleSendTicketReply = async (ticketId) => {
    const normalizedTicketId = String(ticketId);
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    const replyText = String(replyInputs[ticketId] || '').trim();
    const attachment = supportReplyAttachments[ticketId];
    const file = attachment instanceof File && attachment.size > 0 ? attachment : null;
    const attachmentError = validateSupportAttachment(file);
    if (attachmentError) {
      alert(attachmentError);
      return;
    }
    if ((!replyText && !file) || replyText.length > 4000 || supportReplyInFlight.current.has(normalizedTicketId)) return;

    supportReplyInFlight.current.add(normalizedTicketId);
    setReplySending(prev => ({ ...prev, [normalizedTicketId]: true }));
    try {
      const fileSignature = file ? [file.name, file.size, file.lastModified, file.type].join(':') : '';
      const pendingRequest = supportReplyRequestIds.current[normalizedTicketId];
      if (!pendingRequest || pendingRequest.message !== replyText || pendingRequest.fileSignature !== fileSignature) {
        if (!window.crypto?.randomUUID) {
          throw new Error('უსაფრთხო მოთხოვნის ID ვერ შეიქმნა. განაახლეთ ბრაუზერი და სცადეთ თავიდან.');
        }
        supportReplyRequestIds.current[normalizedTicketId] = {
          id: window.crypto.randomUUID(),
          message: replyText,
          fileSignature
        };
      }
      const headers = await getSupabaseHeaders();
      if (!isCurrentSession()) return;
      if (file) {
        await uploadSupportAttachment({
          supabaseUrl: SUPABASE_URL,
          headers,
          ticketId: normalizedTicketId,
          message: replyText,
          requestId: supportReplyRequestIds.current[normalizedTicketId].id,
          file
        });
      } else {
        const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/add_support_ticket_message_idempotent', {
          method: 'POST', headers,
          body: JSON.stringify({
            p_ticket_id: normalizedTicketId,
            p_message: replyText,
            p_access_token: null,
            p_request_id: supportReplyRequestIds.current[normalizedTicketId].id
          })
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(detail || 'ტიკეტში პასუხის შენახვა ვერ მოხერხდა.');
        }
      }
      if (!isCurrentSession()) return;
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
      setSupportReplyAttachments(prev => ({ ...prev, [ticketId]: null }));
      delete supportReplyRequestIds.current[normalizedTicketId];
      setSelectedSupportTicketId(normalizedTicketId);
      await Promise.allSettled([fetchTickets(), fetchSupportTicketThread(normalizedTicketId)]);
      logActivity(`გაიგზავნა პასუხი ტიგეტზე #${normalizedTicketId}`);
      alert('✅ პასუხი წარმატებით შეინახა მხარდაჭერის მიმოწერაში. მომხმარებლისთვის ელფოსტით გაგზავნა ამ მოქმედებით არ ხდება.');
    } catch (error) {
      if (!isCurrentSession()) return;
      console.error('GEOSTORE support ticket reply failed:', error);
      alert(error?.message || 'შეცდომა პასუხის გაგზავნისას');
    } finally {
      supportReplyInFlight.current.delete(normalizedTicketId);
      if (isCurrentSession()) setReplySending(prev => ({ ...prev, [normalizedTicketId]: false }));
    }
  };

  const couponMutationBusyRef = useRef(false);
  const [isCouponMutationBusy, setIsCouponMutationBusy] = useState(false);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!adminSessionAccessRef.current || couponMutationBusyRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

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

    const couponId = createAdminId('c');
    if (!couponId) return alert(secureIdError);
    const newC = {
      id: couponId,
      code,
      discountPercent,
      minOrderGEL,
      status: 'აქტიური'
    };

    couponMutationBusyRef.current = true;
    setIsCouponMutationBusy(true);
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
      if (!isCurrentSession()) return;
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
      if (!isCurrentSession()) return;
      console.error('Coupon creation error:', error);
      alert(error.message || 'კუპონის შექმნა ვერ მოხერხდა.');
    } finally {
      couponMutationBusyRef.current = false;
      setIsCouponMutationBusy(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!adminSessionAccessRef.current || couponMutationBusyRef.current) return;
    if (!window.confirm('ნამდვილად გსურთ ამ კუპონის წაშლა?')) return;
    if (!adminSessionAccessRef.current || couponMutationBusyRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    couponMutationBusyRef.current = true;
    setIsCouponMutationBusy(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/store_coupons?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...(await getSupabaseHeaders()),
          Prefer: 'return=representation'
        }
      });
      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'კუპონის წაშლა ვერ მოხერხდა.');
      }
      const deletedRows = await response.json();
      if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
        throw new Error('კუპონი ბაზაში ვერ მოიძებნა ან წაშლის უფლება არ გაქვთ.');
      }
      if (!isCurrentSession()) return;
      if (typeof setCoupons === 'function') {
        setCoupons(prev => (prev || []).filter(c => String(c.id) !== String(id)));
      }
      logActivity(`წაიშალა კუპონი (ID: ${id})`);
    } catch (error) {
      if (!isCurrentSession()) return;
      console.error('Coupon deletion error:', error);
      alert(error.message || 'კუპონის წაშლა ვერ მოხერხდა.');
    } finally {
      couponMutationBusyRef.current = false;
      setIsCouponMutationBusy(false);
    }
  };

  const deliveryFeeSaveBusyRef = useRef(false);
  const [isDeliveryFeeSaveBusy, setIsDeliveryFeeSaveBusy] = useState(false);

  const handleSaveDeliveryFees = async () => {
    if (!adminSessionAccessRef.current || deliveryFeeSaveBusyRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
    const submittedDrafts = { ...deliveryFeeDrafts };
    let rows;
    try {
      rows = parseDeliveryFeeDrafts(submittedDrafts);
    } catch (error) {
      alert(error.message || 'შეამოწმეთ სამივე მიწოდების ტარიფი.');
      return;
    }

    deliveryFeeSaveBusyRef.current = true;
    setIsDeliveryFeeSaveBusy(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/store_delivery_fees?on_conflict=region`, {
        method: 'POST',
        headers: {
          ...(await getSupabaseHeaders()),
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(rows.map(row => ({ ...row, updated_at: new Date().toISOString() })))
      });
      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'მიწოდების ტარიფების ბაზაში შენახვა ვერ მოხერხდა.');
      }
      const savedRows = await response.json();
      if (
        !Array.isArray(savedRows) ||
        savedRows.length !== rows.length ||
        rows.some(expected => !savedRows.some(saved =>
          saved.region === expected.region &&
          Number(saved.fee_gel) === expected.fee_gel
        ))
      ) {
        throw new Error('სერვერმა სამივე მიწოდების ტარიფის შენახვა ვერ დაადასტურა. განაახლეთ გვერდი და გადაამოწმეთ ტარიფები.');
      }
      if (!isCurrentSession()) return;
      const confirmedFees = Object.fromEntries(savedRows.map(row => [row.region, Number(row.fee_gel)]));
      if (typeof setDeliveryFees === 'function') setDeliveryFees(confirmedFees);
      setDeliveryFeeDrafts(current => ({
        tbilisi: current.tbilisi === submittedDrafts.tbilisi ? String(confirmedFees.tbilisi) : current.tbilisi,
        bigCities: current.bigCities === submittedDrafts.bigCities ? String(confirmedFees.bigCities) : current.bigCities,
        other: current.other === submittedDrafts.other ? String(confirmedFees.other) : current.other
      }));
      logActivity('განახლდა მიწოდების ტარიფები');
      alert('მიწოდების ტარიფები წარმატებით შეინახა ბაზაში.');
    } catch (error) {
      if (!isCurrentSession()) return;
      console.error('Delivery fee save error:', error);
      alert(error.message || 'მიწოდების ტარიფების შენახვა ვერ მოხერხდა.');
    } finally {
      deliveryFeeSaveBusyRef.current = false;
      setIsDeliveryFeeSaveBusy(false);
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

    const vendorId = createAdminId('v');
    if (!vendorId) return alert(secureIdError);
    const newV = {
      id: vendorId,
      name: vendorName,
      commission,
      status: 'აქტიური'
    };
    if (!persistAdminLocalCollection('geostore_vendors', [...(vendorsList || []), newV], setVendorsList, 'ვენდორის ჩანაწერი')) return;
    setVendorForm({ name: '', commission: '' });
    logActivity(`დაემატა ახალი ვენდორი: ${newV.name}`);
    alert('✅ ვენდორი წარმატებით დაემატა!');
  };

  const handleDeleteVendor = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ვენდორის წაშლა?')) {
      const updatedVendors = (vendorsList || []).filter(v => v.id !== id);
      if (!persistAdminLocalCollection('geostore_vendors', updatedVendors, setVendorsList, 'ვენდორების სია')) return;
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
    const link = String(bannerForm.link || '').trim();
    if (link) {
      try {
        const parsedTargetUrl = new URL(link);
        if (!['http:', 'https:'].includes(parsedTargetUrl.protocol)) throw new Error('Unsupported banner link protocol');
      } catch {
        alert('ბანერის გადასასვლელი ბმული უნდა იყოს სწორი HTTP ან HTTPS მისამართი.');
        return;
      }
    }

    if (editingBannerId) {
      const existingBanner = (Array.isArray(bannersList) ? bannersList : []).find(b => b.id === editingBannerId);
      if (!existingBanner) {
        setEditingBannerId(null);
        setBannerForm({ title: '', subtitle: '', image: '', link: '' });
        alert('არჩეული ბანერი ვეღარ მოიძებნა. სია განახლდა — სცადეთ თავიდან.');
        return;
      }
      const updatedBanner = {
        ...existingBanner,
        title,
        subtitle,
        image: image || existingBanner.image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=1200',
        link
      };
      if (typeof setBannersList === 'function') {
        setBannersList(prev => (prev || []).map(b => b.id === editingBannerId ? updatedBanner : b));
      }
      setEditingBannerId(null);
      setBannerForm({ title: '', subtitle: '', image: '', link: '' });
      logActivity(`განახლდა ბანერის მონახაზი: ${updatedBanner.title} (ID: ${updatedBanner.id})`);
      alert('ბანერის ცვლილება მონახაზში შეინახა. საიტზე გამოსაჩენად ცალკე გამოაქვეყნეთ ცვლილებები.');
      return;
    }

    if ((Array.isArray(bannersList) ? bannersList.length : 0) >= 20) {
      alert('ერთდროულად მაქსიმუმ 20 აქტიური ბანერის შენახვა შეიძლება.');
      return;
    }
    const bannerId = createAdminId('b');
    if (!bannerId) return alert(secureIdError);
    const newB = {
      id: bannerId,
      title,
      subtitle,
      image: image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=1200',
      link
    };
    if (typeof setBannersList === 'function') {
      setBannersList(prev => [...(prev || []), newB]);
    }
    setBannerForm({ title: '', subtitle: '', image: '', link: '' });
    logActivity(`დაემატა ბანერის მონახაზი: ${newB.title}`);
    alert('ბანერის მონახაზი შეინახა. საიტზე გამოსაჩენად დააჭირეთ „ცვლილებების გამოქვეყნება“.');
  };

  const handleEditBanner = (banner) => {
    if (!banner || !banner.id) return;
    setEditingBannerId(banner.id);
    setBannerForm({
      title: String(banner.title || ''),
      subtitle: String(banner.subtitle || ''),
      image: String(banner.image || ''),
      link: String(banner.link || '')
    });
  };

  const handleCancelBannerEdit = () => {
    setEditingBannerId(null);
    setBannerForm({ title: '', subtitle: '', image: '', link: '' });
  };

  const handleMoveBanner = (id, direction) => {
    if (typeof setBannersList !== 'function' || !['up', 'down'].includes(direction)) return;
    setBannersList(prev => {
      const current = Array.isArray(prev) ? [...prev] : [];
      const index = current.findIndex(b => b.id === id);
      const nextIndex = index + (direction === 'up' ? -1 : 1);
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return prev;
      [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
      return current;
    });
  };

  const handleDeleteBanner = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ბანერის წაშლა?')) {
      if (typeof setBannersList === 'function') {
        setBannersList(prev => (prev || []).filter(b => b.id !== id));
      }
      if (editingBannerId === id) handleCancelBannerEdit();
      logActivity(`წაიშალა ბანერი (ID: ${id})`);
    }
  };

  const handleLoadAnnouncementRecipients = async () => {
    if (!adminSessionAccessRef.current || announcementRecipientsLoading) return;
    const requestEpoch = adminSessionEpoch.current;
    setAnnouncementRecipientsLoading(true);
    setAnnouncementRecipientsError('');
    try {
      const { data, error } = await supabase.functions.invoke('admin-announcements', {
        body: { action: 'list-recipients' }
      });
      if (error) throw error;
      if (!data?.success || !Array.isArray(data.recipients)) {
        throw new Error('მომხმარებლების სია არასწორ ფორმატში დაბრუნდა.');
      }
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      const safeRecipients = data.recipients.filter(recipient =>
        recipient && typeof recipient.id === 'string' &&
        typeof recipient.label === 'string'
      );
      setAnnouncementRecipients(safeRecipients);
      setBroadcastSelectedRecipientIds(previous =>
        previous.filter(id => safeRecipients.some(recipient => recipient.id === id))
      );
      setAnnouncementRecipientsError('');
    } catch (error) {
      if (!adminSessionAccessRef.current || requestEpoch !== adminSessionEpoch.current) return;
      console.error('GEOSTORE announcement recipient directory failed:', error);
      setAnnouncementRecipientsError(
        'მომხმარებლების სია ვერ ჩაიტვირთა. გადაამოწმეთ Edge Function-ის ხელმისაწვდომობა და სცადეთ თავიდან.'
      );
    } finally {
      if (adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current) {
        setAnnouncementRecipientsLoading(false);
      }
    }
  };

  const handleToggleAnnouncementRecipient = (recipientId) => {
    const normalizedId = String(recipientId || '').trim().toLowerCase();
    if (!normalizedId || !announcementRecipients.some(recipient => recipient.id === normalizedId)) return;
    setBroadcastSelectedRecipientIds(previous => previous.includes(normalizedId)
      ? previous.filter(id => id !== normalizedId)
      : [...previous, normalizedId]
    );
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

    const notificationId = createAdminId('notif');
    if (!notificationId) return alert(secureIdError);
    const newNotification = {
      id: notificationId,
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
    const normalizedOrderId = String(orderId || '').trim();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    if (!normalizedOrderId || orderStatusInFlight.current.has(normalizedOrderId)) return;

    const existingOrder = (orders || []).find(order => String(order.id) === normalizedOrderId);
    if (!existingOrder) {
      alert('შეკვეთა სიაში აღარ მოიძებნა. განაახლეთ შეკვეთები და სცადეთ თავიდან.');
      return;
    }
    const currentStatus = normalizeOrderStatus(existingOrder.status);
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

    if (nextStatus === 'გაუქმებული' && !isCancelledOrderStatus(currentStatus)) {
      const customerLabel = String(existingOrder.customerName || 'მომხმარებელი').trim();
      const confirmed = window.confirm(
        `ნამდვილად გსურთ შეკვეთის #${normalizedOrderId} გაუქმება?\\nმომხმარებელი: ${customerLabel}\\nმარაგი ავტომატურად აღდგება.`
      );
      if (!confirmed) return;
    }

    orderStatusInFlight.current.add(normalizedOrderId);
    setOrderStatusBusyIds(prev => ({ ...prev, [normalizedOrderId]: true }));
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_order_status`, {
        method: 'POST',
        headers: await getSupabaseHeaders({ authenticated: true }),
        body: JSON.stringify({
          p_order_id: normalizedOrderId,
          p_new_status: newStatus
        })
      });

      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'ვერ მოხერხდა შეკვეთის სტატუსის განახლება.');
      }

      if (!isCurrentSession()) return;
      if (typeof setOrders === 'function') {
        setOrders(prev => (prev || []).map(order =>
          String(order.id) === normalizedOrderId ? { ...order, status: newStatus } : order
        ));
      }
      setSelectedOrderForModal(prev =>
        prev && String(prev.id) === normalizedOrderId ? { ...prev, status: newStatus } : prev
      );

      try {
        const localOrders = JSON.parse(localStorage.getItem('geostore_local_orders') || '[]');
        const updatedLocal = localOrders.map(order => String(order.id) === normalizedOrderId ? { ...order, status: newStatus } : order);
        localStorage.setItem('geostore_local_orders', JSON.stringify(updatedLocal));
      } catch {}

      logActivity(`შეკვეთის #${normalizedOrderId} სტატუსი შეიცვალა: ${newStatus}`);
      alert(`✅ შეკვეთის #${normalizedOrderId} სტატუსი წარმატებით განახლდა: ${newStatus}`);
    } catch (error) {
      if (!isCurrentSession()) return;
      alert(error.message || 'ქსელის შეცდომა სტატუსის შეცვლისას');
    } finally {
      orderStatusInFlight.current.delete(normalizedOrderId);
      if (isCurrentSession()) setOrderStatusBusyIds(prev => ({ ...prev, [normalizedOrderId]: false }));
    }
  };

  const handleConfirmOrderReactivation = async (event) => {
    event.preventDefault();
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () =>
      adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;

    if (!reactivationOrder || !reactivationPassword || isReactivatingOrder) return;

    setIsReactivatingOrder(true);
    setReactivationError('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!isCurrentSession()) return;
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
      if (!isCurrentSession()) return;
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

      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'შეკვეთის ხელახლა გააქტიურება ვერ მოხერხდა.');
      }

      if (!isCurrentSession()) return;
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
      if (!isCurrentSession()) return;
      setReactivationError(error.message || 'შეკვეთის ხელახლა გააქტიურება ვერ მოხერხდა.');
    } finally {
      if (isCurrentSession()) setIsReactivatingOrder(false);
    }
  };

  const handleSaveOrderAdminNote = async (orderId) => {
    if (!adminSessionAccessRef.current || isSavingOrderNote) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentSession = () => adminSessionAccessRef.current && requestEpoch === adminSessionEpoch.current;
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
      if (!isCurrentSession()) return;
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(errorBody || 'შენიშვნის ბაზაში შენახვა ვერ მოხერხდა.');
      }
      if (!isCurrentSession()) return;
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
      logActivity(`შეინახა ადმინისტრატორის შენიშვნა შეკვეთაზე #${String(orderId)}`);
      alert('✅ ადმინისტრატორის შენიშვნა წარმატებით შეინახა!');
    } catch (error) {
      if (!isCurrentSession()) return;
      console.error('Admin order note save failed:', error);
      alert(error?.message || 'შეცდომა შენიშვნის შენახვისას');
    } finally {
      if (isCurrentSession()) setIsSavingOrderNote(false);
    }
  };

  const handleExportOrders = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert('არჩეული ფილტრით გადმოსაწერი შეკვეთები არ არის.');
      return;
    }

    exportCsv(
      `geostore_orders_${Date.now()}.csv`,
      ['შეკვეთის ID', 'შექმნის თარიღი', 'მომხმარებელი', 'გვარი', 'ტელეფონი', 'ელფოსტა', 'მისამართი', 'ქალაქი', 'რეგიონი', 'საფოსტო კოდი', 'პროდუქტების დეტალები', 'პროდუქტის ფოტოები (URL)', 'მიწოდება (GEL)', 'გადახდის მეთოდი', 'გადახდის სტატუსი', 'სულ (GEL)', 'სტატუსი', 'ადმინისტრატორის შენიშვნა'],
      filteredOrders.map(o => {
        const orderItems = normalizeOrderItems(o.items);
        const itemImages = [];
        const itemSummary = orderItems.map(item => {
          const name = String(item.name || item.product_name || 'პროდუქტი').trim();
          const sku = String(item.sku || '').trim();
          const variant = String(item.customVariantName || item.custom_variant_name || '').trim();
          const size = String(item.selectedSize || '').trim();
          const color = String(item.selectedColor || '').trim();
          const rawQuantity = item.quantity ?? 1;
          const parsedQuantity = Number(rawQuantity);
          const hasValidQuantity = Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0;
          const quantity = hasValidQuantity ? parsedQuantity : null;
          const rawUnitPrice = item.priceGEL ?? item.price_gel ?? item.price;
          const parsedUnitPrice = Number(rawUnitPrice);
          const hasValidUnitPrice = rawUnitPrice !== null && rawUnitPrice !== undefined &&
            String(rawUnitPrice).trim() !== '' && Number.isFinite(parsedUnitPrice) && parsedUnitPrice >= 0;
          const details = [
            sku ? `SKU: ${sku}` : '',
            variant,
            size ? `ზომა: ${size}` : '',
            color ? `ფერი: ${color}` : '',
            hasValidQuantity ? `რაოდენობა: ${quantity}` : 'რაოდენობა: შესამოწმებელია',
            hasValidUnitPrice ? `ერთეული: ${parsedUnitPrice.toFixed(2)} GEL` : 'ერთეულის ფასი: შესამოწმებელია',
            hasValidUnitPrice && hasValidQuantity ? `ჯამი: ${(parsedUnitPrice * quantity).toFixed(2)} GEL` : '',
            item.gift_wrap === true ? 'სასაჩუქრე შეფუთვა' : '',
            item.vip_warranty === true ? 'VIP გარანტია' : '',
            item.gift_message ? `სასაჩუქრე ტექსტი: ${String(item.gift_message).trim()}` : ''
          ].filter(Boolean);
          const imageUrl = resolveOrderItemImage(item, products);
          if (typeof imageUrl === 'string' && /^https:\/\//i.test(imageUrl.trim())) {
            itemImages.push(imageUrl.trim());
          }
          return `${name}${details.length ? ` [${details.join('; ')}]` : ''}`;
        }).join(' | ');

        const createdAt = o.created_at || o.createdAt || o.date || '';
        const rawTotal = o.totalGEL ?? o.total_gel ?? o.total;
        const parsedTotal = Number(rawTotal);
        const hasValidTotal = rawTotal !== null && rawTotal !== undefined &&
          String(rawTotal).trim() !== '' && Number.isFinite(parsedTotal) && parsedTotal >= 0;
        const rawDelivery = o.checkoutBreakdown?.deliveryGEL ??
          o.checkout_breakdown?.delivery_gel ?? o.checkout_result?.delivery_gel;
        const hasExplicitDelivery = rawDelivery !== null && rawDelivery !== undefined && String(rawDelivery).trim() !== '';
        const parsedDelivery = Number(rawDelivery);
        const legacyDeliveryMatch = String(o.address || o.delivery_address || o.shipping_address || '').match(/მიწოდება:\s*([\d.,]+)\s*₾/i);
        const legacyDelivery = legacyDeliveryMatch ? Number(legacyDeliveryMatch[1].replace(',', '.')) : null;
        const deliveryValue = hasExplicitDelivery ? parsedDelivery : legacyDelivery;
        const hasValidDelivery = deliveryValue !== null && Number.isFinite(deliveryValue) && deliveryValue >= 0;
        const customerName = o.customerName || o.customer_name || o.name || '';
        return [
          o.id,
          createdAt,
          customerName,
          o.customer_surname || o.customerSurname || o.surname || '',
          o.phone || o.customer_phone || '',
          o.user_email || o.customer_email || o.email || '',
          o.address || o.delivery_address || o.shipping_address || '',
          o.city || '',
          o.region || '',
          o.postal_code || o.postalCode || '',
          itemSummary,
          [...new Set(itemImages)].join(' | '),
          hasValidDelivery ? deliveryValue.toFixed(2) : 'შესამოწმებელია',
          'სისტემაში არ ინახება',
          'სისტემაში არ ინახება',
          hasValidTotal ? parsedTotal.toFixed(2) : 'შესამოწმებელია',
          o.status || 'ახალი',
          o.adminNote || o.admin_note || ''
        ];
      })
    );
    logActivity(`გადმოიწერა შეკვეთების CSV ექსპორტი (${filteredOrders.length} შეკვეთა, მიმდინარე ფილტრი)`);
  };

  const handleToggleVipUser = (userId) => {
    const updatedUsers = (usersList || []).map(u =>
      (u.id === userId || u.email === userId) ? { ...u, isVip: !u.isVip } : u
    );
    if (!persistAdminLocalCollection('geostore_users_list', updatedUsers, setUsersList, 'CRM ჩანაწერი')) return;
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) VIP სტატუსი`);
  };

  const handleToggleBlockUser = (userId) => {
    const updatedUsers = (usersList || []).map(u =>
      (u.id === userId || u.email === userId) ? { ...u, isBlocked: !u.isBlocked } : u
    );
    if (!persistAdminLocalCollection('geostore_users_list', updatedUsers, setUsersList, 'CRM ჩანაწერი')) return;
    logActivity(`შეიცვალა მხოლოდ CRM ჩანაწერის შეზღუდვის ნიშანი (ID: ${userId})`);
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`წაიშლება მხოლოდ ამ მოწყობილობაზე შენახული CRM ჩანაწერი "${userName || userId}". Supabase Auth ანგარიში და შეკვეთები არ წაიშლება. გავაგრძელოთ?`)) {
      const updatedUsers = (usersList || []).filter(u => u.id !== userId && u.email !== userId);
      if (!persistAdminLocalCollection('geostore_users_list', updatedUsers, setUsersList, 'CRM ჩანაწერების სია')) return;
      logActivity(`წაიშალა მხოლოდ ლოკალური CRM ჩანაწერი: ${userName || userId}`);
    }
  };

  const handleSaveUserCrm = (userId) => {
    const updatedUsers = (usersList || []).map(u => {
      if (u.id === userId || u.email === userId) {
        return {
          ...u,
          discountPercent: Number(editUserDiscount) || 0,
          adminNotes: editUserNotes
        };
      }
      return u;
    });
    if (!persistAdminLocalCollection('geostore_users_list', updatedUsers, setUsersList, 'CRM ჩანაწერი')) return;
    setEditingUserId(null);
    setEditUserDiscount('');
    setEditUserNotes('');
    logActivity(`განახლდა CRM მონაცემები მომხმარებლისთვის (ID: ${userId})`);
    alert('✅ მომხმარებლის მონაცემები წარმატებით განახლდა!');
  };

  const handleRestoreStorefrontVersion = (version) => {
    if (!adminLoggedIn || !version?.snapshot || typeof version.snapshot !== 'object' || Array.isArray(version.snapshot)) return;
    let snapshot;
    try {
      snapshot = normalizeRestorableStorefrontSnapshot(version.snapshot);
    } catch (error) {
      alert(error.message || 'ამ ვერსიის მონაცემები არასწორია და უსაფრთხოდ ვერ აღდგება.');
      return;
    }
    const label = String(version.version_label || version.created_at || 'არჩეული ვერსია');
    if (!window.confirm(`გსურთ „${label}“-ის ჩატვირთვა მონახაზში? გამოქვეყნება ავტომატურად არ მოხდება.`)) return;
    if (typeof setCategoriesList === 'function') setCategoriesList(snapshot.categories);
    if (typeof setBannersList === 'function') setBannersList(snapshot.banners);
    if (typeof setSiteSettings === 'function') setSiteSettings(snapshot.siteSettings);
    alert('ვერსია შემოწმდა და ჩაიტვირთა რედაქტორში. ცვლილებების შესანახად დააჭირეთ „მონახაზის შენახვას“, ხოლო საიტზე გამოსაჩენად ცალკე გამოაქვეყნეთ.');
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
    const saved = await onSaveStorefrontDraft(normalized);
    if (saved === true) logActivity('განახლდა საიტის პარამეტრების მონახაზი');
  };

  const filteredUsers = (usersList || []).filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.phone?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const normalizedProductSearch = String(productSearchQuery || '').trim().toLocaleLowerCase();
  const selectedProductCategory = safeCategories.find(category => category.name === productCategoryFilter);
  const productCategoryNames = productCategoryFilter === 'ყველა'
    ? null
    : selectedProductCategory && !selectedProductCategory.parentId
      ? [selectedProductCategory.name, ...safeCategories.filter(category => category.parentId === selectedProductCategory.id).map(category => category.name)]
      : [productCategoryFilter];

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = !normalizedProductSearch || [product.name, product.sku].some(value =>
      String(value ?? '').toLocaleLowerCase().includes(normalizedProductSearch)
    );
    const matchesCategory = !productCategoryNames ||
      productCategoryNames.includes(String(product.category || '').trim());
    return matchesSearch && matchesCategory;
  }).sort((left, right) => {
    // Keep the admin catalogue in a deterministic order even when the
    // server returns rows with identical timestamps in a different order.
    const leftTime = Date.parse(left.createdAt || left.created_at || '') || 0;
    const rightTime = Date.parse(right.createdAt || right.created_at || '') || 0;
    return rightTime - leftTime ||
      String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeProductPage = Math.min(Math.max(1, productPage), totalProductPages);
  const paginatedProducts = filteredProducts.slice(
    (safeProductPage - 1) * PRODUCTS_PER_PAGE,
    safeProductPage * PRODUCTS_PER_PAGE
  );
  const productPaginationItems = getPaginationItems(safeProductPage, totalProductPages);

  // Keep this as a derived value, not a hook: the login view returns
  // before this section, so a useMemo here would change hook order
  // when adminLoggedIn switches from false to true and crash React.
  const normalizedOrderSearch = String(orderSearchQuery || '').trim().toLocaleLowerCase();
  const compactOrderSearch = normalizedOrderSearch.replace(/[^\p{L}\p{N}]/gu, '');
  const getOrderDateFilterValue = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const dateOnlyMatch = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
    const dottedMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dateOnlyMatch || dottedMatch) {
      const dateText = dateOnlyMatch ? dateOnlyMatch[1] :
        dottedMatch[3] + '-' + dottedMatch[2] + '-' + dottedMatch[1];
      const parsedUtc = new Date(dateText + 'T00:00:00Z');
      return Number.isFinite(parsedUtc.getTime()) && parsedUtc.toISOString().slice(0, 10) === dateText
        ? dateText
        : '';
    }
    // Timestamp values use the browser's local calendar date, matching the date picker.
    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return '';
    return parsed.getFullYear() + '-' +
      String(parsed.getMonth() + 1).padStart(2, '0') + '-' +
      String(parsed.getDate()).padStart(2, '0');
  };
  const validOrderDateRange = !orderDateFrom || !orderDateTo || orderDateFrom <= orderDateTo;
  const filteredOrders = (orders || []).filter(o => {
    const orderItems = normalizeOrderItems(o.items);
    const orderDate = [o.created_at, o.createdAt, o.date]
      .map(getOrderDateFilterValue)
      .find(Boolean) || '';
    const matchesDate = validOrderDateRange &&
      (!orderDateFrom || (orderDate && orderDate >= orderDateFrom)) &&
      (!orderDateTo || (orderDate && orderDate <= orderDateTo));
    const searchableOrderValues = [
      o.id,
      o.customerName,
      o.customer_name,
      o.customer_surname,
      o.phone,
      o.user_email,
      o.email,
      o.address,
      o.delivery_address,
      o.shipping_address,
      o.city,
      o.region,
      o.postal_code,
      ...orderItems.flatMap(item => [
        item.name,
        item.product_name,
        item.sku,
        item.selectedSize,
        item.selectedColor,
        item.customVariantName,
        item.custom_variant_name
      ])
    ];
    const matchesSearch = !normalizedOrderSearch || searchableOrderValues.some(value => {
      const normalizedValue = String(value ?? '').trim().toLocaleLowerCase();
      if (normalizedValue.includes(normalizedOrderSearch)) return true;
      return compactOrderSearch.length > 0 &&
        normalizedValue.replace(/[^\p{L}\p{N}]/gu, '').includes(compactOrderSearch);
    });

    // Legacy English/Russian status values must appear in the same filter
    // bucket as their Georgian equivalents, rather than disappearing from
    // filtered lists even though tracking recognizes them.
    const matchesStatus = orderStatusFilter === 'ყველა' ||
      getOrderStatusFilterKey(o.status) === orderStatusFilter;
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    const aTime = Date.parse(a.status_changed_at || a.statusChangedAt || '') ||
      Date.parse(a.created_at || a.createdAt || a.date || '') || 0;
    const bTime = Date.parse(b.status_changed_at || b.statusChangedAt || '') ||
      Date.parse(b.created_at || b.createdAt || b.date || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return String(b.id ?? '').localeCompare(String(a.id ?? ''));
  });

  const currentOrderPage = Math.max(1, orderPageByStatus[orderStatusFilter] || 1);
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const safeOrderPage = Math.min(currentOrderPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice((safeOrderPage - 1) * ORDERS_PER_PAGE, safeOrderPage * ORDERS_PER_PAGE);
  const visibleOrderPageNumbers = Array.from(new Set([1, totalOrderPages, safeOrderPage - 1, safeOrderPage, safeOrderPage + 1])).filter(page => page >= 1 && page <= totalOrderPages).sort((a, b) => a - b);
  const visibleOrderPageItems = visibleOrderPageNumbers.reduce((items, page, index) => {
    if (index > 0 && page - visibleOrderPageNumbers[index - 1] > 1) items.push('ellipsis-' + page);
    items.push(page);
    return items;
  }, []);
  const setCurrentOrderPage = (page) => setOrderPageByStatus(prev => ({ ...prev, [orderStatusFilter]: page }));

  const loadProductReviews = async () => {
    if (!adminSessionAccessRef.current) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentRequest = () => isCurrentAdminReviewRequest(adminSessionAccessRef.current, requestEpoch, adminSessionEpoch.current);
    setProductReviewsLoading(true); setProductReviewsError('');
    try {
      // Supabase applies a row cap to un-ranged SELECTs; fetch every page so
      // older reviews cannot silently disappear from the moderation queue.
      const rows = await fetchAllProductReviews(supabase);
      if (!isCurrentRequest()) return;
      const paths = [...new Set(rows.map(row => row.image_path).filter(path => typeof path === 'string' && path.length > 0))];
      const signed = {};
      for (let offset = 0; offset < paths.length; offset += 40) {
        const { data: signedData, error: signError } = await supabase.functions.invoke('product-reviews', { body: { action: 'sign-images', paths: paths.slice(offset, offset + 40) } });
        if (signError) throw signError;
        if (!isCurrentRequest()) return;
        if (signedData?.signed_urls && typeof signedData.signed_urls === 'object') Object.assign(signed, signedData.signed_urls);
      }
      if (!isCurrentRequest()) return;
      setProductReviews(rows.map(row => ({ ...row, image_url: row.image_path ? signed[row.image_path] || null : null })));
    } catch (error) {
      if (isCurrentRequest()) setProductReviewsError(error?.message || 'შეფასებების ჩატვირთვა ვერ მოხერხდა.');
    } finally {
      if (isCurrentRequest()) setProductReviewsLoading(false);
    }
  };
  const handleModerateProductReview = async (reviewId, status) => {
    if (!adminLoggedIn || !reviewId || !['approved', 'rejected'].includes(status) || moderatingReviewIds[reviewId]) return;
    const requestEpoch = adminSessionEpoch.current;
    const isCurrentRequest = () => isCurrentAdminReviewRequest(adminSessionAccessRef.current, requestEpoch, adminSessionEpoch.current);
    setModeratingReviewIds(previous => ({ ...previous, [reviewId]: true })); setProductReviewsError('');
    try {
      const { error } = await supabase.rpc('admin_moderate_product_review', { p_review_id: reviewId, p_status: status });
      if (error) throw error;
      if (isCurrentRequest()) setProductReviews(previous => previous.map(review => review.id === reviewId ? { ...review, status, moderated_at: new Date().toISOString() } : review));
    } catch (error) {
      if (isCurrentRequest()) setProductReviewsError(error?.message || 'შეფასების სტატუსის შეცვლა ვერ მოხერხდა.');
    } finally {
      // Always release this component-local lock, even if the admin session
      // changed while the request was pending. Keep data updates session-guarded.
      setModeratingReviewIds(previous => ({ ...previous, [reviewId]: false }));
    }
  };
  useEffect(() => { if (adminLoggedIn && adminTab === 'reviews') loadProductReviews(); }, [adminLoggedIn, adminTab]);

  const mainCategories = safeCategories.filter(c => !c.parentId);

  const isClothing = isClothingProductCategory(productForm.category);
  const isShoes = isShoesProductCategory(productForm.category);
  const isLaptop = isLaptopProductCategory(productForm.category);
  const isPhone = isPhoneProductCategory(productForm.category);

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
            { id: 'ai_analyst', label: '📊 ფინანსური სწრაფი მიმოხილვა', icon: Sparkles },
            { id: 'staff', label: '👔 თანამშრომლები & როლები', count: staffList?.length || 0, icon: UserCog },
            { id: 'orders', label: '📦 შეკვეთები', count: orders?.length || 0, icon: PackageCheck },
            { id: 'products', label: '🏷️ პროდუქტები & მახასიათებლები', count: products?.length || 0, icon: Store },
            { id: 'reviews', label: '⭐ შეფასებების მოდერაცია', count: productReviews.filter(review => review.status === 'pending').length, icon: Star },
            { id: 'support', label: '💬 მხარდაჭერა', count: supportTickets?.filter(t => t.status === 'ღია' || t.status === 'მუშავდება')?.length || 0, icon: HelpCircle },
            { id: 'messages', label: '📨 მიმოწერები', count: legacyMessages?.length || 0, icon: HelpCircle },
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
              <span className="text-slate-300 font-bold">საიტის კონფიგურაციის მართვა</span>
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
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">{financialOverview.invalidExpenseItems > 0 ? `მოგება ვერ განისაზღვრება — ${financialOverview.invalidExpenseItems} ხარჯის ჩანაწერი შესამოწმებელია` : financialOverview.netProfit === null ? (financialOverview.unknownRevenueItems > 0 ? 'მოგება ვერ განისაზღვრება — პროდუქტის შემოსავალი არასრულია' : 'მოგება ვერ განისაზღვრება — COGS აკლია') : financialOverview.estimatedCogsItems > 0 ? 'შეფასებითი მოგება — ძველი შეკვეთების თვითღირებულება მიმდინარე ფასითაა' : 'მთლიანი მოგება − ოპერაციული ხარჯები'}</span>
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
              <div className="min-w-0 bg-slate-900/80 border border-amber-500/30 p-3 sm:p-4 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-white text-sm">მარაგის გაფრთხილებები</h3>
                    <p className="text-[10px] text-slate-500 mt-1">მხოლოდ 5 ან ნაკლები ერთეული</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <b className="block text-amber-300 text-sm tabular-nums">{lowStockGroups.length}</b>
                    <span className="text-[9px] text-slate-500">პროდუქტი</span>
                  </div>
                </div>
                {financialOverview.lowStockProducts.length === 0 ? (
                  <p className="text-emerald-300 text-xs py-3">ყველა პროდუქტს საკმარისი მარაგი აქვს ან მარაგი მითითებული არ არის.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{financialOverview.lowStockProducts.length} დაბალი მარაგის პოზიცია</span>
                      <span>დააჭირე პროდუქტს დეტალებისთვის</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto overscroll-contain pr-1 space-y-1.5">
                      {lowStockGroups.map(group => {
                        const zeroCount = group.positions.filter(position => position._stockValue === 0).length;
                        return (
                          <details key={group.key} className="group rounded-xl border border-slate-800 bg-slate-950/50">
                            <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center gap-2 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <b className="block truncate text-xs text-slate-100">{group.name}</b>
                                <span className="block truncate text-[10px] text-slate-500">{group.sku} · {group.positions.length} ვარიანტი</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {zeroCount > 0 && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-300">{zeroCount} ნული</span>}
                                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-300">{group.positions.length} პოზ.</span>
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform group-open:rotate-180" />
                              </div>
                            </summary>
                            <div className="border-t border-slate-800 px-3 py-2 space-y-1.5">
                              {group.positions.map(position => (
                                <div key={position._inventoryKey} className="flex items-center justify-between gap-3 text-[11px]">
                                  <span className="min-w-0 truncate text-slate-400">{position.variantName || 'საერთო მარაგი'}</span>
                                  <span className={position._stockValue === 0 ? 'shrink-0 font-bold text-rose-300' : 'shrink-0 font-bold text-amber-300'}>
                                    {position._stockValue === 0 ? 'ნულოვანი მარაგი' : `${position._stockValue} ცალი`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </>
                )}
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
                  <div className="bg-slate-950/70 rounded-2xl p-4"><p className="text-[10px] text-slate-400">დაბალი მარაგის პოზიციები</p><b className="text-2xl text-amber-300">{financialOverview.lowStockProducts.length}</b></div>
                  <div className="bg-slate-950/70 rounded-2xl p-4"><p className="text-[10px] text-slate-400">ნულოვანი მარაგი</p><b className="text-2xl text-rose-300">{financialOverview.lowStockProducts.filter(product => product._stockValue === 0).length}</b></div>
                </div>
                <p className="text-[10px] text-slate-500">მონაცემები ითვალისწინებს როგორც პროდუქტის საერთო მარაგს, ისე თითოეული ინდივიდუალური ვარიანტის მარაგს.</p>
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
                {financialOverview.unknownRevenueItems > 0 && <p className="text-amber-300 text-[10px]">პროდუქტის გასანაწილებელი ფასი აკლია ან არასწორია {financialOverview.unknownRevenueItems} ერთეულზე; მოგება და ვენდორების წილი სრულად ვერ განისაზღვრება.</p>}
                {financialOverview.unknownCogsItems > 0 && <p className="text-amber-300 text-[10px]">თვითღირებულება უცნობია {financialOverview.unknownCogsItems} შეკვეთის/პროდუქტის ჩანაწერზე.</p>}
                {financialOverview.estimatedCogsItems > 0 && <p className="text-amber-300 text-[10px]">ძველი შეკვეთების {financialOverview.estimatedCogsItems} ერთეულზე გამოყენებულია პროდუქტის მიმდინარე თვითღირებულება და არა გაყიდვის დღის ისტორიული ფასი.</p>}
              </div>
              <div className="bg-slate-900/80 border border-rose-500/30 p-5 sm:p-7 rounded-[2rem] space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
                  <h3 className="font-black text-white text-sm">გასავლები — კატეგორიების მიხედვით</h3>
                  <span className="text-[10px] text-slate-400">ჩანაწერები: {expenses.length}</span>
                </div>
                {financialOverview.invalidExpenseItems > 0 && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{financialOverview.invalidExpenseItems} ხარჯის ჩანაწერს აქვს ნულოვანი, უარყოფითი ან არასწორი თანხა. ისინი ჯამში არ ჩაითვალა და წმინდა მოგება დროებით დამალულია. გადაამოწმეთ ჩანაწერები.</p>}
                {expenseBreakdown.length === 0 ? <p className="text-slate-500 text-xs py-4">არჩეულ პერიოდში ვალიდური ხარჯები არ არის.</p> : expenseBreakdown.map(expense => (
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
                      <b className="text-rose-300 whitespace-nowrap">{Number.isFinite(Number(expense.amount)) && Number(expense.amount) > 0 ? '-' + Number(expense.amount).toFixed(2) + ' ₾' : 'თანხა შესამოწმებელია'}</b>
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
                        <span className="font-black text-white">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL ?? o.total_gel ?? o.total ?? '—') : (o.totalGEL ?? o.total_gel ?? o.total ?? '—') + ' ₾'}</span>
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
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={calcForm.purchaseCost} onChange={e => setCalcForm({...calcForm, purchaseCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">გასაყიდი ფასი (₾)</label>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={calcForm.sellingPrice} onChange={e => setCalcForm({...calcForm, sellingPrice: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">ფასდაკლება (%)</label>
                    <input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={calcForm.discountPercent} onChange={e => setCalcForm({...calcForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">მიწოდება / ხარჯი (₾)</label>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={calcForm.shippingCost} onChange={e => setCalcForm({...calcForm, shippingCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                  </div>
                </div>
              </div>
              <div className="admin-calculator-results bg-slate-950/80 border border-emerald-500/30 p-6 rounded-3xl space-y-3 shadow-inner flex flex-col justify-center">
                <h4 className="font-black text-emerald-400 text-sm mb-1">გამოთვლილი მონაცემები</h4>
                <div className="flex justify-between"><span>ფასდაკლებული ფასი:</span><b className="text-white">{calculatedSalesMetrics.discountedPrice.toFixed(2)} ₾</b></div>
                {!calculatedSalesMetrics.hasPurchaseCost && <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">მიუთითეთ თვითღირებულება — მოგება და მარჟა მანამდე არ გამოითვლება.</p>}
                <div className="flex justify-between"><span>მთლიანი მოგება:</span><b className="text-emerald-400">{calculatedSalesMetrics.grossProfit === null ? '—' : calculatedSalesMetrics.grossProfit.toFixed(2) + ' ₾'}</b></div>
                <div className="flex justify-between"><span>წმინდა მოგება:</span><b className="text-cyan-400 text-base">{calculatedSalesMetrics.netProfit === null ? '—' : calculatedSalesMetrics.netProfit.toFixed(2) + ' ₾'}</b></div>
                <div className="flex justify-between"><span>მარჟა (Margin):</span><b className="text-amber-400">{calculatedSalesMetrics.profitMargin === null ? '—' : calculatedSalesMetrics.profitMargin.toFixed(1) + '%'}</b></div>
                <div className="flex justify-between"><span>მარკაპი (Markup):</span><b className="text-indigo-400">{calculatedSalesMetrics.markup === null ? '—' : calculatedSalesMetrics.markup.toFixed(1) + '%'}</b></div>
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
                  <input type="number" required min="0.01" step="0.01" inputMode="decimal" placeholder="თანხა (₾)" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                </div>
                <input type="text" required placeholder="აღწერა (მაგ: Facebook Ads)" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none" />
                <button type="submit" disabled={isSavingExpense} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition cursor-pointer shadow-lg disabled:opacity-60 disabled:cursor-wait">{isSavingExpense ? 'ინახება…' : '+ ხარჯის დამატება ბაზაში'}</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2.5rem] space-y-4 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">ხარჯების ისტორია ბაზიდან ({expenses.length})</h3>
              {expensesError && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-xs text-rose-200">
                  ხარჯების ისტორიის ჩატვირთვა ვერ მოხერხდა. ბოლო წარმატებით მიღებული მონაცემები შენარჩუნებულია. დეტალი: {expensesError}
                  <button type="button" onClick={fetchExpenses} className="ml-2 underline underline-offset-2">ხელახლა ცდა</button>
                </div>
              )}
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">ხარჯები ჯერ არ არის დამატებული.</p>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="admin-expense-row bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 text-xs shadow-inner">
                      <div className="admin-expense-details min-w-0">
                        <div className="admin-expense-heading flex flex-wrap items-start gap-x-2 gap-y-1 min-w-0">
                          <b className="admin-expense-description text-white break-words">{exp.description || 'ხარჯი'}</b>
                          <span className="admin-expense-category text-slate-300 break-words">({exp.category || 'კატეგორია უცნობია'})</span>
                        </div>
                        <span className="admin-expense-date block text-slate-400 text-[11px] mt-2">{exp.date || 'თარიღი მითითებული არ არის'}</span>
                      </div>
                      <div className="admin-expense-actions flex items-center gap-3">
                        <span className="admin-expense-amount font-black text-rose-300 whitespace-nowrap">-{(Number(exp.amount) || 0).toFixed(2)} ₾</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="admin-expense-delete"
                          aria-label={`ხარჯის წაშლა: ${exp.description || exp.id}`}
                          title="ხარჯის წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>წაშლა</span>
                        </button>
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
              <Sparkles className="w-5 h-5 text-emerald-400" /> ფინანსური სწრაფი მიმოხილვა
            </h3>
            <p role="note" className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
              ეს არ არის გენერაციული AI. პასუხები ეფუძნება წინასწარ განსაზღვრულ ფინანსურ მაჩვენებლებს; თავისუფალ კითხვებზე პასუხი არ გენერირდება.
            </p>
            <div className="admin-ai-chat bg-slate-950/80 border border-emerald-500/20 p-5 rounded-3xl space-y-4 max-h-[400px] overflow-y-auto text-xs shadow-inner">
              {aiChatLogs.map((log, idx) => (
                <div key={idx} className={`admin-ai-message flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`admin-ai-bubble max-w-[85%] p-4 rounded-2xl ${log.role === 'user' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'bg-slate-900 text-slate-200 border border-emerald-500/20'}`}>
                    {log.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAiAsk} className="admin-ai-composer flex gap-3">
              <input type="text" placeholder="კითხვა შემოსავალზე, მოგებაზე ან ხარჯებზე..." value={aiQuery} onChange={e => setAiQuery(e.target.value)} className="flex-1 bg-slate-950 border border-emerald-500/25 p-4 rounded-2xl text-xs text-white outline-none shadow-inner" />
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
          <div className="admin-orders-panel min-w-0 bg-slate-900/80 border border-emerald-500/30 p-3 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2.5rem] space-y-5 sm:space-y-6 shadow-2xl backdrop-blur-2xl">
            <div className="admin-orders-header admin-orders-heading flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/20 pb-5">
              <div>
                <h3 className="min-w-0 break-words font-black text-white text-base sm:text-lg flex items-center gap-2.5">
                  <PackageCheck className="w-6 h-6 text-emerald-400" /> შეკვეთების სრული მართვის სისტემა ({filteredOrders.length})
                </h3>
                <p className="text-xs text-slate-400 mt-1">მართეთ, გაფილტრეთ და აკონტროლეთ თითოეული შეკვეთა დეტალურად</p>
              </div>
              <button
                type="button"
                onClick={handleExportOrders}
                className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> შეკვეთების ექსპორტი (CSV)
              </button>
            </div>
            {ordersError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                შეკვეთების ჩატვირთვა ვერ მოხერხდა. ბოლო წარმატებით მიღებული მონაცემები შენარჩუნებულია. დეტალი: {ordersError}
                <button type="button" onClick={() => typeof onRefreshOrders === 'function' && onRefreshOrders()} className="ml-2 underline underline-offset-2">ხელახლა ცდა</button>
              </div>
            )}

            {/* ძებნა და სტატუსების ფილტრაცია */}
            <div className="admin-orders-toolbar admin-orders-controls flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="admin-order-search admin-orders-search relative w-full sm:w-80">
                <input
                  type="search"
                  aria-label="შეკვეთის ძებნა"
                  autoComplete="off"
                  placeholder="ძებნა ნომრით, სახელით, ტელეფონით, ელფოსტით, მისამართით..."
                  value={orderSearchQuery} 
                  onChange={e => { setOrderSearchQuery(e.target.value); setCurrentOrderPage(1); }} 
                  className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" 
                />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
              </div>

              <div className="admin-order-status-filters flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-emerald-500/20 w-full sm:w-auto overflow-x-auto overscroll-x-contain">
                {['ყველა', 'ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული'].map(st => (
                  <button
                    type="button"
                    key={st}
                    aria-pressed={orderStatusFilter === st}
                    onClick={() => { setOrderStatusFilter(st); setOrderPageByStatus(prev => ({ ...prev, [st]: 1 })); }}
                    className={`px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer transition whitespace-nowrap ${orderStatusFilter === st ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-order-date-filters flex flex-col sm:flex-row sm:items-end gap-3 rounded-2xl border border-emerald-500/15 bg-slate-950/50 p-3">
              <label className="flex-1 min-w-0 text-[11px] text-slate-400">
                თარიღიდან
                <input
                  type="date"
                  aria-label="შეკვეთების საწყისი თარიღი"
                  value={orderDateFrom}
                  max={orderDateTo || undefined}
                  onChange={e => { setOrderDateFrom(e.target.value); setCurrentOrderPage(1); }}
                  className="mt-1 block w-full min-w-0 rounded-xl border border-emerald-500/20 bg-slate-900 px-3 py-2.5 text-xs text-white"
                />
              </label>
              <label className="flex-1 min-w-0 text-[11px] text-slate-400">
                თარიღამდე
                <input
                  type="date"
                  aria-label="შეკვეთების საბოლოო თარიღი"
                  value={orderDateTo}
                  min={orderDateFrom || undefined}
                  onChange={e => { setOrderDateTo(e.target.value); setCurrentOrderPage(1); }}
                  className="mt-1 block w-full min-w-0 rounded-xl border border-emerald-500/20 bg-slate-900 px-3 py-2.5 text-xs text-white"
                />
              </label>
              {(orderDateFrom || orderDateTo) && (
                <button
                  type="button"
                  onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); setCurrentOrderPage(1); }}
                  className="min-h-10 rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
                >
                  თარიღის გასუფთავება
                </button>
              )}
              {!validOrderDateRange && (
                <p role="alert" className="text-xs text-rose-300">საწყისი თარიღი საბოლოო თარიღზე გვიან ვერ იქნება.</p>
              )}
            </div>

            {/* შეკვეთების სია */}
            <div className="admin-orders-list space-y-4">
              {filteredOrders.length === 0 ? (
                <p className="text-slate-500 text-xs py-10 text-center">შეკვეთები ვერ მოიძებნა.</p>
              ) : (
                paginatedOrders.map(o => (
                  <div key={o.id} className="admin-order-card min-w-0 bg-slate-950/70 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-500/20 flex flex-col gap-3 sm:gap-4 text-xs shadow-inner hover:border-emerald-500/40 transition">
                    <div className="admin-order-card-heading flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="font-black text-emerald-400 text-sm break-all">#{o.id}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({o.created_at || o.createdAt || o.date || '—'} {o.time || ''})</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-black text-white text-base">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL) : o.totalGEL + ' ₾'}</span>
                      </div>
                    </div>

                    <div className="admin-order-card-customer min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 [&_p]:min-w-0 [&_p]:break-words">
                      <p>მყიდველი: <b className="text-white">{o.customerName || o.customer_name || o.name || '—'} {o.customer_surname || o.customerSurname || o.surname || ''}</b></p>
                      <p>ტელეფონი: <b className="text-emerald-300">📞 {o.phone || o.customer_phone || '—'}</b></p>
                      <p className="sm:col-span-2 text-slate-400 text-[11px]">📍 მისამართი: {[o.address || o.delivery_address || o.shipping_address, o.city, o.region, o.postal_code || o.postalCode].filter(value => value !== null && value !== undefined && String(value).trim()).join(', ') || '—'}</p>
                      <p className="sm:col-span-2 text-slate-400 text-[11px]">ელფოსტა: {o.user_email || o.customer_email || o.email || '—'}</p>
                      {(o.adminNote || o.admin_note) && <p className="sm:col-span-2 text-amber-300 text-[11px] italic">📝 შენიშვნა: "{o.adminNote || o.admin_note}"</p>}
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

                      <div className="admin-order-actions min-w-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderForModal(o);
                            setOrderAdminNoteInput(o.adminNote || '');
                          }} 
                          className="w-full sm:w-auto min-h-10 justify-center bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                        >
                          <Eye className="w-4 h-4 text-emerald-400" /> სრული დეტალები
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(o)} 
                          title="ინვოისის ბეჭდვა"
                          className="w-full sm:w-auto min-h-10 justify-center bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                        >
                          <Printer className="w-4 h-4" /> ინვოისი
                        </button>

                        {isCancelledOrderStatus(o.status) ? (
                          o.stock_deducted_at && o.stock_restored_at ? (
                            <button
                              type="button"
                              onClick={() => { setReactivationOrder(o); setReactivationPassword(''); setReactivationError(''); }}
                              className="w-full sm:w-auto min-h-10 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] transition cursor-pointer"
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
                          <div className="admin-order-status-actions grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center justify-start sm:justify-end gap-1 bg-slate-900 p-1 rounded-2xl border border-emerald-500/20 w-full sm:w-auto">
                            <button type="button" onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')} aria-pressed={getOrderStatusFilterKey(o.status) === 'ახალი'} disabled={Boolean(orderStatusBusyIds[String(o.id)]) || isDeliveredOrderStatus(o.status) || isShippedOrderStatus(o.status)} className={`min-h-10 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'ახალი' ? 'bg-blue-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ახალი</button>
                            <button type="button" onClick={() => handleUpdateOrderStatus(o.id, 'მუშავდება')} aria-pressed={getOrderStatusFilterKey(o.status) === 'მუშავდება'} disabled={Boolean(orderStatusBusyIds[String(o.id)]) || isDeliveredOrderStatus(o.status) || isShippedOrderStatus(o.status)} className={`min-h-10 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'მუშავდება' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                            <button type="button" onClick={() => handleUpdateOrderStatus(o.id, 'გაგზავნილი')} aria-pressed={getOrderStatusFilterKey(o.status) === 'გაგზავნილი'} disabled={Boolean(orderStatusBusyIds[String(o.id)]) || isDeliveredOrderStatus(o.status)} className={`min-h-10 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${getOrderStatusFilterKey(o.status) === 'გაგზავნილი' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>გაგზავნილი</button>
                            <button type="button" onClick={() => handleUpdateOrderStatus(o.id, 'დასრულებული')} aria-pressed={isDeliveredOrderStatus(o.status)} disabled={Boolean(orderStatusBusyIds[String(o.id)]) || isDeliveredOrderStatus(o.status)} className={`min-h-10 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${isDeliveredOrderStatus(o.status) ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ჩაბარებული</button>
                            <button type="button" onClick={() => handleUpdateOrderStatus(o.id, 'გაუქმებული')} disabled={Boolean(orderStatusBusyIds[String(o.id)]) || isShippedOrderStatus(o.status) || isDeliveredOrderStatus(o.status)} title={isShippedOrderStatus(o.status) || isDeliveredOrderStatus(o.status) ? 'გაგზავნილი ან ჩაბარებული შეკვეთის გაუქმება დაბრუნების პროცესის გარეშე დაუშვებელია.' : undefined} className="col-span-2 sm:col-span-1 min-h-10 px-2 py-2 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white">გაუქმება</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {filteredOrders.length > ORDERS_PER_PAGE && (
                <div className="admin-orders-pagination min-w-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-500/20 pt-4">
                  <p className="text-[11px] text-slate-400 text-center sm:text-left">ნაჩვენებია {(safeOrderPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(safeOrderPage * ORDERS_PER_PAGE, filteredOrders.length)} / {filteredOrders.length}</p>
                  <nav aria-label="შეკვეთების გვერდები" className="max-w-full flex flex-wrap items-center justify-center gap-1.5">
                    <button type="button" aria-label="წინა გვერდი" onClick={() => setCurrentOrderPage(Math.max(1, safeOrderPage - 1))} disabled={safeOrderPage === 1} className="min-h-10 px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed">წინა</button>
                    {visibleOrderPageItems.map(page => typeof page === 'number' ? (
                      <button key={page} type="button" onClick={() => setCurrentOrderPage(page)} aria-label={`გვერდი ${page}`} aria-current={safeOrderPage === page ? 'page' : undefined} className={`min-w-10 min-h-10 px-3 py-2 rounded-xl text-xs font-black transition ${safeOrderPage === page ? 'bg-emerald-500 text-slate-950' : 'border border-emerald-500/20 text-slate-300 hover:bg-slate-900'}`}>{page}</button>
                    ) : (
                      <span key={page} aria-hidden="true" className="px-1 text-slate-500">…</span>
                    ))}
                    <button type="button" aria-label="შემდეგი გვერდი" onClick={() => setCurrentOrderPage(Math.min(totalOrderPages, safeOrderPage + 1))} disabled={safeOrderPage === totalOrderPages} className="min-h-10 px-3 py-2 rounded-xl border border-emerald-500/20 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed">შემდეგი</button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🌟 ORDER DETAILS FULL MODAL (შეკვეთის დეტალური ხედვის მოდალი) */}
        {selectedOrderForModal && (
          <div className="admin-order-detail-overlay fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-contain animate-in fade-in" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
            <div className="admin-order-detail-modal bg-[#0d0d10] border border-emerald-500/50 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 max-w-3xl w-full space-y-5 sm:space-y-6 text-xs text-white shadow-2xl relative max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
              
              <div className="admin-order-detail-header min-w-0 flex justify-between items-start sm:items-center gap-2 border-b border-emerald-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                    <PackageCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 id="admin-order-detail-title" className="min-w-0 break-all font-black text-sm sm:text-base text-white">შეკვეთა #{selectedOrderForModal.id}</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 break-words">თარიღი: {selectedOrderForModal.created_at || selectedOrderForModal.createdAt || selectedOrderForModal.date || '—'} {selectedOrderForModal.time || ''}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="შეკვეთის დეტალების დახურვა"
                  onClick={() => setSelectedOrderForModal(null)}
                  className="shrink-0 p-2.5 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl border border-emerald-500/20 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. მომხმარებლის სრული ინფორმაცია */}
              <div className="admin-order-customer min-w-0 bg-slate-900/80 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-400 text-sm mb-3">👤 მომხმარებლის სრული ინფორმაცია</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <p>სახელი: <b className="text-white">{selectedOrderForModal.customerName || selectedOrderForModal.customer_name || selectedOrderForModal.name || 'მითითებული არ არის'}</b></p>
                  <p>გვარი: <b className="text-white">{selectedOrderForModal.customer_surname || selectedOrderForModal.customerSurname || selectedOrderForModal.surname || 'მითითებული არ არის'}</b></p>
                  <p>ტელეფონი: {(selectedOrderForModal.phone || selectedOrderForModal.customer_phone) ? <a href={`tel:${selectedOrderForModal.phone || selectedOrderForModal.customer_phone}`} className="text-emerald-300 font-black hover:underline">📞 {selectedOrderForModal.phone || selectedOrderForModal.customer_phone}</a> : <b className="text-white">მითითებული არ არის</b>}</p>
                  <p className="min-w-0 break-all">ელფოსტა: <b className="text-white">{selectedOrderForModal.user_email || selectedOrderForModal.customer_email || selectedOrderForModal.email || 'მითითებული არ არის'}</b></p>
                  <p>სტატუსი: <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">{selectedOrderForModal.status || 'ახალი'}</span></p>
                  <p className="sm:col-span-2 min-w-0 break-words text-slate-300 pt-1">📍 სრული მისამართი: <b className="text-white">{[selectedOrderForModal.address || selectedOrderForModal.delivery_address || selectedOrderForModal.shipping_address, selectedOrderForModal.city, selectedOrderForModal.region, selectedOrderForModal.postal_code || selectedOrderForModal.postalCode].filter(value => value !== null && value !== undefined && String(value).trim()).join(', ') || 'მითითებული არ არის'}</b></p>
                </div>
              </div>

              {/* 2. პროდუქტების სრული ინფორმაცია და ფოტოები */}
              <div className="admin-order-items-section space-y-3">
                <h4 className="font-black text-emerald-400 text-sm">🛍️ შეკვეთილი პროდუქტები ({normalizeOrderItems(selectedOrderForModal.items).length || 1})</h4>
                
                <div className="space-y-3">
                  {normalizeOrderItems(selectedOrderForModal.items).length > 0 ? (
                    normalizeOrderItems(selectedOrderForModal.items).map((item, idx) => (
                      <div key={idx} className="admin-order-item bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {resolveOrderItemImage(item, products) ? (
                          <img src={resolveOrderItemImage(item, products)} alt={item.name || 'შეკვეთილი პროდუქტი'} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-16 h-16 object-contain bg-slate-900 p-1.5 rounded-2xl border border-emerald-500/20 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 text-[10px] shrink-0">No Img</div>
                        )}
                        <div className="admin-order-item-info min-w-0 w-full sm:w-auto flex-1 space-y-1">
                          <h5 className="font-black text-white text-sm">{item.name || item.product_name || 'პროდუქტი'}</h5>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                            {(item.sku || item.product_sku) && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">SKU: <b>{item.sku || item.product_sku}</b></span>}
                            {item.selectedSize && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ზომა: <b>{item.selectedSize}</b></span>}
                            {item.selectedColor && <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ფერი: <b>{item.selectedColor}</b></span>}
                            {item.customVariantName && <span className="bg-slate-900 px-2 py-0.5 rounded border border-amber-500/30">ვარიანტი: <b>{item.customVariantName}</b></span>}
                            {(item.gift_wrap === true || item.giftWrap === true) && <span className="bg-amber-950/40 text-amber-200 px-2 py-0.5 rounded border border-amber-800/60">სასაჩუქრე შეფუთვა (+5 ₾)</span>}
                            {(item.vip_warranty === true || item.vipWarranty === true) && <span className="bg-amber-950/40 text-amber-200 px-2 py-0.5 rounded border border-amber-800/60">VIP გარანტია (+15 ₾)</span>}
                            <span>რაოდენობა: <b>{Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1}</b></span>
                          </div>
                          {(item.gift_message || item.giftMessage) && <p className="text-amber-200 text-[11px] break-words">სასაჩუქრე ტექსტი: {item.gift_message || item.giftMessage}</p>}
                        </div>
                        <div className="admin-order-item-price text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                          <span className="text-slate-400 text-[10px]">ერთეულის ფასი: {item.priceGEL ?? item.price_gel ?? item.price ?? '—'} ₾</span>
                          <span className="font-black text-emerald-400 text-sm">{formatPrice ? formatPrice((Number(item.priceGEL ?? item.price_gel ?? item.price) || 0) * (Number(item.quantity) > 0 ? Number(item.quantity) : 1)) : ((Number(item.priceGEL ?? item.price_gel ?? item.price) || 0) * (Number(item.quantity) > 0 ? Number(item.quantity) : 1)) + ' ₾'}</span>
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
              <div className="admin-order-financials min-w-0 bg-slate-900/80 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-500/20 space-y-2">
                <h4 className="font-black text-emerald-400 text-sm mb-2">💳 შეკვეთის თანხა</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">გადახდის მეთოდი და გადახდის სტატუსი ბაზაში ცალკე არ ინახება. შეკვეთის სტატუსი გადახდის დადასტურებას არ ნიშნავს.</p>
                {!resolveOrderCheckoutBreakdown(selectedOrderForModal) && <p className="text-amber-200 text-[11px]">მიტანის საფასურის ცალკე სერვერული ჩანაწერი ამ შეკვეთაში ხელმისაწვდომი არ არის; გადაამოწმეთ ძველი შეკვეთის მონაცემები.</p>}
                {resolveOrderCheckoutBreakdown(selectedOrderForModal) && (
                  <div className="space-y-2 border-y border-slate-800 py-3 text-sm">
                    <div className="flex flex-wrap justify-between items-start gap-2 text-slate-300">
                      <span className="min-w-0 flex-1 break-words">პროდუქტებისა და დამატებითი სერვისების ჯამი:</span>
                      <b>{formatPrice ? formatPrice(resolveOrderCheckoutBreakdown(selectedOrderForModal).subtotalGEL) : resolveOrderCheckoutBreakdown(selectedOrderForModal).subtotalGEL.toFixed(2) + ' ₾'}</b>
                    </div>
                    {resolveOrderCheckoutBreakdown(selectedOrderForModal).discountGEL > 0 && (
                      <div className="flex flex-wrap justify-between items-start gap-2 text-emerald-300">
                        <span>ფასდაკლება{resolveOrderCheckoutBreakdown(selectedOrderForModal).couponCode ? ` (${resolveOrderCheckoutBreakdown(selectedOrderForModal).couponCode})` : ''}:</span>
                        <b>−{formatPrice ? formatPrice(resolveOrderCheckoutBreakdown(selectedOrderForModal).discountGEL) : resolveOrderCheckoutBreakdown(selectedOrderForModal).discountGEL.toFixed(2) + ' ₾'}</b>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-between items-start gap-2 text-slate-300">
                      <span className="min-w-0 flex-1 break-words">მიტანის საფასური:</span>
                      <b>{formatPrice ? formatPrice(resolveOrderCheckoutBreakdown(selectedOrderForModal).deliveryGEL) : resolveOrderCheckoutBreakdown(selectedOrderForModal).deliveryGEL.toFixed(2) + ' ₾'}</b>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap justify-between items-start gap-2 text-base font-black text-white pt-2 border-t border-slate-800">
                  <span className="min-w-0 flex-1 break-words">შეკვეთის ჯამი:</span>
                  <span className="text-emerald-400 text-lg">{formatPrice ? formatPrice(selectedOrderForModal.totalGEL ?? selectedOrderForModal.total_gel ?? selectedOrderForModal.total) : (selectedOrderForModal.totalGEL ?? selectedOrderForModal.total_gel ?? selectedOrderForModal.total ?? '—') + ' ₾'}</span>
                </div>
              </div>

              {/* 4. ადმინისტრატორის პირადი შენიშვნა */}
              <div className="admin-order-note-editor space-y-2">
                <label className="text-slate-300 font-bold block">📝 ადმინისტრატორის პირადი შენიშვნა შეკვეთაზე:</label>
                <div className="admin-order-note-controls flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    maxLength={5000}
                    placeholder="ჩაწერეთ შენიშვნა (მაგ: კლიენტმა ითხოვა 14:00 საათზე მოტანა)..." 
                    value={orderAdminNoteInput}
                    disabled={isSavingOrderNote}
                    onChange={e => setOrderAdminNoteInput(e.target.value)}
                    className="w-full min-w-0 flex-1 bg-slate-950 border border-emerald-500/20 p-3 rounded-2xl text-white outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveOrderAdminNote(selectedOrderForModal.id)}
                    disabled={isSavingOrderNote}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingOrderNote ? 'ინახება…' : 'შენახვა'}
                  </button>
                </div>
              </div>

              {/* მოდალის ქვედა ღილაკები */}
              <div className="admin-order-detail-footer flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedOrderForModal)} 
                  className="w-full min-w-0 flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-black py-3.5 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> ინვოისის ბეჭდვა / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForModal(null)}
                  className="w-full min-w-0 flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-3 rounded-2xl transition cursor-pointer"
                >
                  დახურვა
                </button>
              </div>

            </div>
          </div>
        )}

        {adminTab === 'reviews' && (
          <section className="admin-product-reviews-panel min-w-0 rounded-2xl sm:rounded-[2rem] border border-emerald-500/30 bg-slate-900/80 p-4 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div><h3 className="flex items-center gap-2 text-base font-black text-white"><Star className="h-5 w-5 text-amber-400" /> მომხმარებელთა შეფასებები</h3><p className="mt-1 text-xs text-slate-400">შეფასებები იტვირთება დაცული მონაცემთა ბაზიდან. ფოტოების ბმულები დროებითია.</p></div>
              <button type="button" onClick={loadProductReviews} disabled={productReviewsLoading} className="rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">{productReviewsLoading ? 'იტვირთება…' : 'განახლება'}</button>
            </div>
            {productReviewsError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{productReviewsError}</div>}
            <div className="flex flex-wrap items-center gap-2">{[{value:'pending',label:'მოლოდინში'},{value:'approved',label:'დამტკიცებული'},{value:'rejected',label:'უარყოფილი'},{value:'all',label:'ყველა'}].map(option => <button key={option.value} type="button" onClick={() => setProductReviewFilter(option.value)} aria-pressed={productReviewFilter === option.value} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${productReviewFilter === option.value ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-emerald-500/20 text-slate-300 hover:border-emerald-400'}`}>{option.label} ({option.value === 'all' ? productReviews.length : productReviews.filter(review => review.status === option.value).length})</button>)}</div>
            {productReviewsLoading && productReviews.length === 0 && <p role="status" className="py-8 text-center text-xs text-slate-400">შეფასებები იტვირთება…</p>}
            {!productReviewsLoading && productReviews.filter(review => productReviewFilter === 'all' || review.status === productReviewFilter).length === 0 && <p className="py-8 text-center text-xs text-slate-400">ამ ფილტრში შეფასებები არ არის.</p>}
            <div className="grid grid-cols-1 gap-3">{productReviews.filter(review => productReviewFilter === 'all' || review.status === productReviewFilter).map(review => (
              <article key={review.id} className="min-w-0 rounded-2xl border border-emerald-500/15 bg-slate-950/60 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-black text-white">{review.author_name || 'მომხმარებელი'} <span className="ml-1 text-amber-300">{'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span></p><p className="mt-1 break-all text-[10px] text-slate-500">პროდუქტის ID: {review.product_id} · {review.created_at ? new Date(review.created_at).toLocaleString('ka-GE') : ''}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${review.status === 'approved' ? 'border-emerald-500/30 text-emerald-300' : review.status === 'rejected' ? 'border-rose-500/30 text-rose-300' : 'border-amber-500/30 text-amber-200'}`}>{review.status === 'approved' ? 'დამტკიცებული' : review.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში'}</span></div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{review.review_text}</p>
                {review.image_url && <a href={review.image_url} target="_blank" rel="noreferrer" className="inline-flex"><img src={review.image_url} alt="შეფასების ფოტო" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="h-28 w-28 rounded-xl border border-emerald-500/20 object-cover" /></a>}
                {review.is_legacy && <p className="text-[10px] text-slate-500">ძველი/იმპორტირებული ჩანაწერი</p>}
                {review.status === 'pending' && <div className="flex flex-wrap gap-2 border-t border-emerald-500/10 pt-3"><button type="button" onClick={() => handleModerateProductReview(review.id, 'approved')} disabled={!!moderatingReviewIds[review.id]} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{moderatingReviewIds[review.id] ? 'მუშავდება…' : 'დამტკიცება'}</button><button type="button" onClick={() => handleModerateProductReview(review.id, 'rejected')} disabled={!!moderatingReviewIds[review.id]} className="rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-300 disabled:opacity-50">უარყოფა</button></div>}
              </article>
            ))}</div>
          </section>
        )}

        {adminTab === 'support' && (
          <div className="admin-support-panel min-w-0 bg-slate-900/80 border border-emerald-500/30 p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <HelpCircle className="w-5 h-5 text-emerald-400" /> მომხმარებელთა მხარდაჭერა და პასუხები ({supportTickets?.length || 0})
            </h3>
            <p role="note" className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] leading-relaxed text-cyan-100">
              მიმოწერის ისტორიის შესანარჩუნებლად ტიკეტები აქედან არ იშლება. დასრულებული მოთხოვნა მონიშნეთ სტატუსით „მოგვარებული“.
            </p>
            {supportTicketsError && (
              <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                მხარდაჭერის შეტყობინებების ჩატვირთვა ვერ მოხერხდა. ბოლო წარმატებით მიღებული მონაცემები შენარჩუნებულია. დეტალი: {supportTicketsError}
                <button type="button" onClick={fetchTickets} className="ml-2 underline underline-offset-2">ხელახლა ცდა</button>
              </div>
            )}
            <div className="admin-support-list space-y-4">
              {(!supportTickets || supportTickets.length === 0) ? (
                <p className="text-slate-500 text-xs py-8 text-center">მხარდაჭერის ტიგეტები არ არის.</p>
              ) : (
                supportTickets.map(t => (
                  <div key={t.id} className="admin-support-ticket min-w-0 bg-slate-950/60 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/20 space-y-4 text-xs shadow-inner">
                    <div className="admin-support-ticket-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                      <div className="admin-support-ticket-meta min-w-0 flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="font-black text-emerald-400 text-sm">#{t.id}</span>
                        <span className="min-w-0 break-words text-white font-black text-sm">{t.subject}</span>
                        <span className="text-slate-500 text-[10px]">({t.date})</span>
                        {Number(t.unreadCount) > 0 && (
                          <span className="rounded-full bg-rose-500/15 border border-rose-400/40 px-2 py-1 text-[10px] font-black text-rose-200" aria-label={`წაუკითხავი შეტყობინებები: ${t.unreadCount}`}>
                            წაუკითხავი: {t.unreadCount}
                          </span>
                        )}
                      </div>
                      
                      <div className="admin-support-ticket-controls w-full sm:w-auto min-w-0 flex flex-col sm:flex-row sm:items-center gap-2.5">
                        <div className="admin-support-status-actions w-full sm:w-auto min-w-0 grid grid-cols-3 sm:flex sm:items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-emerald-500/20">
                          <button type="button" disabled={Boolean(ticketStatusBusy[String(t.id)])} onClick={() => handleUpdateTicketStatus(t.id, 'ღია')} className={`min-w-0 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-xl font-bold text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer transition disabled:opacity-50 disabled:cursor-wait ${t.status === 'ღია' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ღია</button>
                          <button type="button" disabled={Boolean(ticketStatusBusy[String(t.id)])} onClick={() => handleUpdateTicketStatus(t.id, 'მუშავდება')} className={`min-w-0 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-xl font-bold text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer transition disabled:opacity-50 disabled:cursor-wait ${t.status === 'მუშავდება' ? 'bg-emerald-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                          <button type="button" disabled={Boolean(ticketStatusBusy[String(t.id)])} onClick={() => handleUpdateTicketStatus(t.id, 'მოგვარებული')} className={`min-w-0 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-xl font-bold text-[9px] sm:text-[10px] whitespace-nowrap cursor-pointer transition disabled:opacity-50 disabled:cursor-wait ${t.status === 'მოგვარებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მოგვარებული</button>
                        </div>
                        <button type="button" onClick={() => {
                          const ticketId = String(t.id);
                          if (String(selectedSupportTicketId) === ticketId) setSelectedSupportTicketId(null);
                          else { setSelectedSupportTicketId(ticketId); fetchSupportTicketThread(ticketId); }
                        }} className="w-full sm:w-auto rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-3 sm:py-2.5 font-bold text-cyan-200 transition hover:bg-cyan-500/20">
                          {String(selectedSupportTicketId) === String(t.id) ? 'მიმოწერის დამალვა' : 'მიმოწერის ნახვა'}
                        </button>

                      </div>
                    </div>

                    <div className="admin-support-ticket-content space-y-1.5">
                      <p className="min-w-0 break-words text-slate-300">მომხმარებელი: <b className="text-white">{t.customerName}</b> (<span className="break-all">{t.email}</span>)</p>
                      <p className="admin-support-ticket-message min-w-0 whitespace-pre-wrap break-words text-slate-200 bg-slate-950 p-3 sm:p-4 rounded-2xl border border-emerald-500/20 mt-2">
                        <b className="text-emerald-400 block mb-1">კითხვა:</b> "{t.message}"
                      </p>
                    </div>

                    {t.reply && (
                      <div className="admin-support-ticket-reply bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-1 shadow">
                        <b className="text-emerald-400 block text-xs">ადმინისტრატორის პასუხი:</b>
                        <p className="text-slate-200 break-words whitespace-pre-wrap">{t.reply}</p>
                      </div>
                    )}

                    {String(selectedSupportTicketId) === String(t.id) && (
                      <div className="min-w-0 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-3 sm:p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <b className="text-cyan-200 text-xs">მიმოწერის სრული ისტორია</b>
                          <button type="button" onClick={() => fetchSupportTicketThread(t.id)} className="text-cyan-300 underline underline-offset-2">განახლება</button>
                        </div>
                        {supportTicketThreadLoading[String(t.id)] ? <p className="text-slate-400 py-3">მიმოწერა იტვირთება…</p>
                          : supportTicketThreadErrors[String(t.id)] ? (
                            <div role="alert" className="text-rose-300 space-y-2">
                              <p>{supportTicketThreadErrors[String(t.id)]}</p>
                              <button type="button" onClick={() => fetchSupportTicketThread(t.id)} className="underline underline-offset-2">ხელახლა ცდა</button>
                            </div>
                          ) : (supportTicketThreads[String(t.id)] || []).length === 0 ? <p className="text-slate-400 py-3">მიმოწერის ჩანაწერები ჯერ არ არის.</p>
                          : (
                            <div className="min-w-0 space-y-2.5 max-h-[60dvh] sm:max-h-96 overflow-y-auto overscroll-contain">
                              {(supportTicketThreads[String(t.id)] || []).map(entry => (
                                <div key={entry.id} className={`min-w-0 rounded-xl border p-3 ${entry.sender_role === 'admin' ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-700 bg-slate-950/70'}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <b className={entry.sender_role === 'admin' ? 'text-emerald-300' : 'text-cyan-200'}>{entry.sender_role === 'admin' ? 'ადმინისტრატორი' : (entry.sender_name || 'მომხმარებელი')}</b>
                                    <span className="text-[10px] text-slate-500 break-all">{entry.created_at ? new Date(entry.created_at).toLocaleString('ka-GE') : ''}</span>
                                  </div>
                                  <p className="text-slate-200 whitespace-pre-wrap break-words">{entry.message}</p>
                                  {entry.attachment_url && (
                                    <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                                      <img src={entry.attachment_url} alt="მიმოწერის მიმაგრებული ფოტო" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="max-h-56 max-w-full rounded-xl border border-slate-600 object-contain" />
                                    </a>
                                  )}
                                  {entry.attachment_path && !entry.attachment_url && <p className="mt-2 text-xs text-amber-300">ფოტოს დროებითი ბმული ვერ ჩაიტვირთა.</p>}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}

                    <div className="admin-support-reply-form min-w-0 flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3 pt-2">
                      <input 
                        type="text" 
                        placeholder="დაწერეთ პასუხი მომხმარებლისთვის..." 
                        maxLength={4000}
                        value={replyInputs[t.id] !== undefined ? replyInputs[t.id] : ''}
                        onChange={e => setReplyInputs({...replyInputs, [t.id]: e.target.value})}
                        className="w-full min-w-0 flex-1 sm:min-w-[12rem] bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                      />
                      <label className="w-full min-w-0 max-w-full sm:w-auto sm:max-w-[220px] flex items-center gap-2 text-[10px] text-slate-400 border border-emerald-500/20 rounded-xl px-3 py-2 cursor-pointer">
                        <ImageIcon className="w-4 h-4" />
                        <span className="min-w-0 truncate">{supportReplyAttachments[t.id]?.name || 'ფოტოს მიმაგრება'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={event => setSupportReplyAttachments(prev => ({ ...prev, [t.id]: event.target.files?.[0] || null }))}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => handleSendTicketReply(t.id)}
                        disabled={!!replySending[String(t.id)] || (!String(replyInputs[t.id] || '').trim() && !supportReplyAttachments[t.id])}
                        aria-busy={!!replySending[String(t.id)]}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" /> {replySending[String(t.id)] ? 'იგზავნება…' : 'გაგზავნა'}
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
            {productsError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                პროდუქტების ჩატვირთვა ვერ მოხერხდა. ბოლო წარმატებით მიღებული მონაცემები შენარჩუნებულია. დეტალი: {productsError}
                <button type="button" onClick={() => typeof onRefreshProducts === 'function' && onRefreshProducts()} className="ml-2 underline underline-offset-2">ხელახლა ცდა</button>
              </div>
            )}
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
                    <input type="number" required min="0" step="0.01" inputMode="decimal" placeholder="99" value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-black outline-none focus:border-emerald-400 shadow-inner" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">თვითღირებულება (COGS ₾)</label>
                    <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="45" value={productForm.purchaseCost} onChange={e => setProductForm({...productForm, purchaseCost: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-cyan-400 font-bold outline-none focus:border-emerald-400 shadow-inner" />
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
                        <input type="text" value={productOptionDrafts.availableSizes} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableSizes: e.target.value }))} onBlur={e => handleProductOptionChange('availableSizes', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">მასალა</label>
                        <input type="text" placeholder="100% ბამბა" value={productForm.material} onChange={e => setProductForm({...productForm, material: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productOptionDrafts.availableColors} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableColors: e.target.value }))} onBlur={e => handleProductOptionChange('availableColors', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                      </div>
                    </div>
                  )}

                  {isShoes && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ზომები (EU)</label>
                        <input type="text" value={productOptionDrafts.availableSizes} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableSizes: e.target.value }))} onBlur={e => handleProductOptionChange('availableSizes', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">მასალა</label>
                        <input type="text" placeholder="ტყავი" value={productForm.material} onChange={e => setProductForm({...productForm, material: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                        <input type="text" value={productOptionDrafts.availableColors} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableColors: e.target.value }))} onBlur={e => handleProductOptionChange('availableColors', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                      </div>
                    </div>
                  )}

                  {isLaptop && (
                    <>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">მოდელი</label>
                          <input type="text" maxLength="120" placeholder="MacBook Pro 14" value={productForm.model} onChange={e => setProductForm({...productForm, model: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ვიდეო ბარათი (GPU)</label>
                          <input type="text" maxLength="120" placeholder="RTX 4060 / Integrated" value={productForm.gpu} onChange={e => setProductForm({...productForm, gpu: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ეკრანის ზომა</label>
                          <input type="text" maxLength="40" placeholder="14.2 inch" value={productForm.screenSize} onChange={e => setProductForm({...productForm, screenSize: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ოპერაციული სისტემა</label>
                          <input type="text" maxLength="80" placeholder="Windows 11 / macOS" value={productForm.os} onChange={e => setProductForm({...productForm, os: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                      </div>
                    </>
                  )}

                  {isPhone && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">მეხსიერება</label>
                          <input type="text" value={productOptionDrafts.availableSizes} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableSizes: e.target.value }))} onBlur={e => handleProductOptionChange('availableSizes', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">RAM</label>
                          <input type="text" placeholder="8GB" value={productForm.ram} onChange={e => setProductForm({...productForm, ram: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                          <input type="text" value={productOptionDrafts.availableColors} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableColors: e.target.value }))} onBlur={e => handleProductOptionChange('availableColors', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">მოდელი</label>
                          <input type="text" maxLength="120" placeholder="iPhone 17 Pro" value={productForm.model} onChange={e => setProductForm({...productForm, model: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">პროცესორი / ჩიპსეტი</label>
                          <input type="text" maxLength="120" placeholder="A19 Pro / Snapdragon" value={productForm.cpu} onChange={e => setProductForm({...productForm, cpu: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ეკრანის ზომა</label>
                          <input type="text" maxLength="40" placeholder="6.3 inch" value={productForm.screenSize} onChange={e => setProductForm({...productForm, screenSize: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ოპერაციული სისტემა</label>
                          <input type="text" maxLength="80" placeholder="iOS / Android" value={productForm.os} onChange={e => setProductForm({...productForm, os: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                      </div>
                    </>
                  )}

                  {!isClothing && !isShoes && !isLaptop && !isPhone && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ზომები</label>
                          <input type="text" value={productOptionDrafts.availableSizes} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableSizes: e.target.value }))} onBlur={e => handleProductOptionChange('availableSizes', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">ფერები</label>
                          <input type="text" value={productOptionDrafts.availableColors} onChange={e => setProductOptionDrafts(prev => ({ ...prev, availableColors: e.target.value }))} onBlur={e => handleProductOptionChange('availableColors', e.target.value)} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white text-base sm:text-xs min-h-[48px] admin-product-option-input outline-none focus:border-emerald-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">მასალა</label>
                          <input type="text" maxLength="160" placeholder="ტყავი / მეტალი / პლასტმასი" value={productForm.material} onChange={e => setProductForm({...productForm, material: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">მახასიათებელი / თავსებადობა</label>
                          <input type="text" maxLength="240" placeholder="მაგ: iPhone 17 / USB-C" value={productForm.durability} onChange={e => setProductForm({...productForm, durability: e.target.value})} className="w-full bg-slate-900 border border-emerald-500/20 p-3 rounded-xl text-white outline-none" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {(isClothing || isShoes) && (
                  <div className="admin-size-color-stock-editor bg-slate-950 p-5 rounded-3xl border border-cyan-500/30 space-y-3">
                    <h4 className="text-cyan-300 font-black text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> ზომისა და ფერის მიხედვით მარაგი</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">თითოეულ კომბინაციას აქვს დამოუკიდებელი რაოდენობა. 0 ნიშნავს, რომ ეს ზომა/ფერი მყიდველისთვის მიუწვდომელია. ძველი საერთო მარაგი ავტომატურად არ ნაწილდება.</p>
                    {sizeColorStock.length === 0 ? (
                      <button type="button" onClick={handleEnableSizeColorStock} className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-xs font-black text-cyan-200">შექმენი ზომებისა და ფერების მარაგის ცხრილი</button>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sizeColorStock.map(variant => (
                            <div key={variant.id} className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-slate-900 p-3">
                              <div className="min-w-0">
                                <b className="block text-white text-xs">{variant.size || '—'} / {variant.color || '—'}</b>
                                <span className="text-[10px] text-slate-500">{Number(variant.priceGEL ?? productForm.priceGEL ?? 0).toFixed(2)} ₾</span>
                              </div>
                              <label className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                                მარაგი
                                <input type="number" min="0" max="1000000" step="1" inputMode="numeric" value={variant.stock} onChange={event => handleSizeColorStockChange(variant.id, event.target.value)} className="w-20 bg-slate-950 border border-cyan-500/30 p-2 rounded-lg text-white text-xs outline-none" />
                              </label>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={handleEnableSizeColorStock} className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-200">ზომებისა და ფერების კომბინაციების განახლება</button>
                      </>
                    )}
                  </div>
                )}

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
                      <div className="min-w-0 flex-1"><b className="text-white">{variant.name}</b><span className="ml-2 text-amber-300">{Number(variant.priceGEL).toFixed(2)} ₾</span></div>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                        მარაგი
                        <input type="number" min="0" max="1000000" step="1" inputMode="numeric" value={variant.stock} onChange={event => handleCustomVariantStockChange(variant.id, event.target.value)} className="w-20 bg-slate-950 border border-amber-500/30 p-2 rounded-lg text-white text-xs outline-none" />
                      </label>
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
                          <img src={img} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-full h-full object-cover rounded-xl" />
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
                <div>
                  <h3 className="admin-product-inventory-title font-black text-white text-base">ბაზაში არსებული პროდუქტები & COGS ({products?.length || 0})</h3>
                  <p className="mt-1 text-[10px] text-slate-400">
                    გამოქვეყნებული: {(products || []).filter(product => (product.isPublished ?? product.is_published) !== false).length}
                    {' · '}დამალული: {(products || []).filter(product => (product.isPublished ?? product.is_published) === false).length}
                  </p>
                </div>
                <div className="admin-product-list-filters flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <select
                    aria-label="პროდუქტის კატეგორიის ფილტრი"
                    value={productCategoryFilter}
                    onChange={e => { setProductCategoryFilter(e.target.value); setProductPage(1); }}
                    className="w-full sm:w-52 bg-slate-950 border border-emerald-500/20 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner"
                  >
                    <option value="ყველა">ყველა კატეგორია</option>
                    {safeCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.parentId ? '↳ ' : ''}{category.name}
                      </option>
                    ))}
                  </select>
                  <div className="admin-product-search relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="ძებნა პროდუქტებში..."
                      value={productSearchQuery}
                      onChange={e => { setProductSearchQuery(e.target.value); setProductPage(1); }}
                      className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner"
                    />
                    <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                  </div>
                </div>
              </div>

              <div className="admin-products-list space-y-3.5">
                {filteredProducts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-500/20 px-4 py-10 text-center text-xs text-slate-400">
                    არჩეულ კატეგორიაში პროდუქტები ვერ მოიძებნა.
                  </div>
                ) : paginatedProducts.map(p => (
                  <div key={p.id} className="admin-product-row bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-inner">
                    <div className="admin-product-identity flex items-center gap-3.5">
                      {p.image ? <img src={p.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-14 h-14 object-cover bg-slate-950 p-1 rounded-2xl border border-emerald-500/20 shrink-0" /> : <div className="w-14 h-14 flex items-center justify-center bg-slate-950 rounded-2xl border border-emerald-500/20 shrink-0 text-emerald-400"><ImageIcon className="w-5 h-5" /></div>}
                      <div>
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">კატეგორია: {p.category} | SKU: {p.sku || 'N/A'}</p>
                        <span className={`inline-flex mt-1 rounded-full px-2 py-1 text-[10px] font-bold ${(p.isPublished ?? p.is_published) === false ? 'bg-amber-500/10 text-amber-300 border border-amber-400/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20'}`}>
                          {(p.isPublished ?? p.is_published) === false ? 'დამალულია მაღაზიაში' : 'გამოქვეყნებულია'}
                        </span>
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
                          value={quickProductDrafts['purchaseCost:' + String(p.id)] ?? String(p.purchaseCost ?? p.purchase_cost ?? '')}
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
                          disabled={Array.isArray(p.variants) && p.variants.length > 0}
                          title={Array.isArray(p.variants) && p.variants.length > 0 ? 'ვარიანტების მარაგი შეცვალეთ პროდუქტის რედაქტირების ფანჯარაში.' : 'მარაგის სწრაფი შეცვლა'}
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
                          className="w-16 bg-slate-950 border border-emerald-500/20 rounded-xl p-2 text-center font-black text-white outline-none focus:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`text-[10px] font-black whitespace-nowrap ${Number(p.stock ?? 0) <= 0 ? 'text-rose-400' : Number(p.stock ?? 0) <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {Number(p.stock ?? 0) <= 0 ? 'არ არის' : Number(p.stock ?? 0) <= 3 ? 'ცოტაა' : 'მარაგშია'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleProductPublished(p.id)}
                        disabled={Boolean(productPublishBusyIds[String(p.id)])}
                        className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[10px] font-bold transition disabled:opacity-50 disabled:cursor-wait ${(p.isPublished ?? p.is_published) === false ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-amber-400/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'}`}
                        title={(p.isPublished ?? p.is_published) === false ? 'პროდუქტის მაღაზიაში გამოქვეყნება' : 'პროდუქტის მაღაზიიდან დამალვა'}
                      >
                        {(p.isPublished ?? p.is_published) === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {productPublishBusyIds[String(p.id)] ? 'ინახება…' : (p.isPublished ?? p.is_published) === false ? 'გამოქვეყნება' : 'დამალვა'}
                      </button>
                      <button type="button" onClick={() => handleEditProduct(p)} className="text-sky-300 hover:text-sky-200 p-2.5 bg-sky-500/10 rounded-2xl cursor-pointer transition" title="პროდუქტის სრული რედაქტირება"><Edit3 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDeleteProduct(p.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredProducts.length > 0 && (
                <div className="admin-product-pagination flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-500/15 pt-4">
                  <p className="text-[10px] text-slate-400 text-center sm:text-left">
                    ნაჩვენებია {(safeProductPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(safeProductPage * PRODUCTS_PER_PAGE, filteredProducts.length)} / {filteredProducts.length}
                  </p>
                  {totalProductPages > 1 && (
                    <nav aria-label="პროდუქტების გვერდები" className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setProductPage(Math.max(1, safeProductPage - 1))}
                        disabled={safeProductPage === 1}
                        className="rounded-xl border border-emerald-500/20 px-3 py-2 text-[10px] font-bold text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed hover:border-emerald-400"
                      >წინა</button>
                      {productPaginationItems.map((page, index) => page === '…' ? (
                        <span key={`gap-${index}`} className="px-1 text-slate-500" aria-hidden="true">…</span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setProductPage(page)}
                          aria-current={safeProductPage === page ? 'page' : undefined}
                          className={`min-w-9 rounded-xl border px-3 py-2 text-[10px] font-black transition ${safeProductPage === page ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-emerald-500/20 text-slate-200 hover:border-emerald-400'}`}
                        >{page}</button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setProductPage(Math.min(totalProductPages, safeProductPage + 1))}
                        disabled={safeProductPage === totalProductPages}
                        className="rounded-xl border border-emerald-500/20 px-3 py-2 text-[10px] font-bold text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed hover:border-emerald-400"
                      >შემდეგი</button>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === 'messages' && (
          <div className="admin-support-panel bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-emerald-400" /> შენახული მიმოწერები ({legacyMessages.length})
                </h3>
                <p className="text-slate-400 text-xs mt-1">არსებული messages ჩანაწერები. განახლება ხდება ავტომატურად ყოველ 15 წამში.</p>
              </div>
              <button type="button" onClick={fetchLegacyMessages} className="rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10">განახლება</button>
            </div>
            {legacyMessagesError && (
              <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                მიმოწერების ჩატვირთვა ვერ მოხერხდა. არსებული ეკრანის მონაცემები არ შეცვლილა. დეტალი: {legacyMessagesError}
              </div>
            )}
            {legacyMessages.length === 0 ? (
              <p className="text-slate-400 text-xs py-8 text-center">შენახული მიმოწერები არ მოიძებნა. ახალი მხარდაჭერის მოთხოვნები იხილეთ „მხარდაჭერა“ განყოფილებაში.</p>
            ) : (
              <div className="space-y-3">
                {legacyMessages.map((message) => (
                  <article key={message.id} className="rounded-2xl border border-emerald-500/15 bg-slate-950/60 p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-white">{message.client_name || 'მომხმარებელი'}</p>
                      <span className="text-[10px] text-slate-400">{message.created_at ? new Date(message.created_at).toLocaleString('ka-GE') : (message.time || '')}</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-emerald-300">{message.sender || 'უცნობი გამომგზავნი'}</p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{message.text || 'ტექსტური შეტყობინება არ არის.'}</p>
                    {message.image && (getSafeLegacyMessageImage(message.image)
                      ? <img src={getSafeLegacyMessageImage(message.image)} alt="მიმოწერის მიმაგრებული ფოტო" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="mt-2 h-40 w-40 max-w-full rounded-xl border border-emerald-500/20 bg-slate-900 object-cover" />
                      : <p className="text-[10px] text-amber-300">მიმაგრებული ფოტოს ბმული ვერ მოწმდება.</p>)}
                    <p className="text-[10px] text-slate-500">ჩანაწერის ID: {message.id}</p>
                  </article>
                ))}
              </div>
            )}
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
            <p className="text-xs text-amber-300 leading-6">ეს ფუნქცია შეტყობინებას მხოლოდ ამ მოწყობილობის ბრაუზერში ინახავს. მომხმარებლებისთვის რეალური გაგზავნა ჯერ დაკავშირებული არ არის. ქვემოთ მიმღებების არჩევა მხოლოდ აუდიტორიის წინასწარი შერჩევაა — რეალური გაგზავნა ჯერ გამორთულია.</p>
            <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 space-y-3" aria-label="შეტყობინების მიმღებების არჩევა">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-white">ვის უნდა მიეწოდოს შეტყობინება?</h4>
                  <p className="text-[11px] text-slate-400 mt-1">მიმღებები აირჩევა რეგისტრირებული Auth ანგარიშებიდან.</p>
                </div>
                <button type="button" onClick={handleLoadAnnouncementRecipients} disabled={announcementRecipientsLoading || !adminLoggedIn} className="rounded-xl border border-emerald-500/40 px-3 py-2 font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">
                  {announcementRecipientsLoading ? 'იტვირთება…' : announcementRecipients.length ? 'სიის განახლება' : 'მომხმარებლების სიის ჩატვირთვა'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer ${broadcastAudienceMode === 'all' ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700'}`}>
                  <input type="radio" name="broadcast-audience-mode" value="all" checked={broadcastAudienceMode === 'all'} onChange={() => setBroadcastAudienceMode('all')} className="mt-1 accent-emerald-400" />
                  <span><span className="block font-bold text-white">ყველა რეგისტრირებული მომხმარებელი</span><span className="block text-[11px] text-slate-400 mt-1">ახალი რეგისტრაციები ძველ შეტყობინებებს ავტომატურად არ მიიღებენ.</span></span>
                </label>
                <label className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer ${broadcastAudienceMode === 'selected' ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700'}`}>
                  <input type="radio" name="broadcast-audience-mode" value="selected" checked={broadcastAudienceMode === 'selected'} onChange={() => setBroadcastAudienceMode('selected')} className="mt-1 accent-emerald-400" />
                  <span><span className="block font-bold text-white">ინდივიდუალურად მონიშნული მომხმარებლები</span><span className="block text-[11px] text-slate-400 mt-1">მოძებნეთ და მონიშნეთ კონკრეტული ანგარიშები.</span></span>
                </label>
              </div>
              {announcementRecipientsError && <p role="alert" className="text-xs text-rose-300">{announcementRecipientsError}</p>}
              {announcementRecipients.length > 0 && broadcastAudienceMode === 'selected' && (
                <div className="space-y-3">
                  <input type="search" value={announcementRecipientSearch} onChange={event => setAnnouncementRecipientSearch(event.target.value)} placeholder="მოძებნეთ ელფოსტით ან მომხმარებლის ID-ით…" aria-label="მომხმარებლის ძიება" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400" />
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-700 divide-y divide-slate-800">
                    {announcementRecipients
                      .filter(recipient => {
                        const query = announcementRecipientSearch.trim().toLowerCase();
                        return !query || [recipient.label, recipient.email, recipient.id].some(value => String(value || '').toLowerCase().includes(query));
                      })
                      .map(recipient => (
                        <label key={recipient.id} className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-800/70">
                          <input type="checkbox" checked={broadcastSelectedRecipientIds.includes(recipient.id)} onChange={() => handleToggleAnnouncementRecipient(recipient.id)} className="h-4 w-4 shrink-0 accent-emerald-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block break-all text-xs font-bold text-white">{recipient.label}</span>
                            <span className="block break-all text-[10px] text-slate-500">{recipient.id}</span>
                          </span>
                        </label>
                      ))}
                    {announcementRecipients.filter(recipient => {
                      const query = announcementRecipientSearch.trim().toLowerCase();
                      return !query || [recipient.label, recipient.email, recipient.id].some(value => String(value || '').toLowerCase().includes(query));
                    }).length === 0 && <p className="p-4 text-xs text-slate-400">ძიების შესაბამისი მომხმარებელი ვერ მოიძებნა.</p>}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-300">არჩეული აუდიტორია: <strong className="text-emerald-300">{broadcastAudienceMode === 'all' ? announcementRecipients.length : broadcastSelectedRecipientIds.filter(id => announcementRecipients.some(recipient => recipient.id === id)).length}</strong> მომხმარებელი</p>
                {broadcastAudienceMode === 'selected' && <button type="button" onClick={() => setBroadcastSelectedRecipientIds([])} disabled={!broadcastSelectedRecipientIds.length} className="text-xs font-bold text-slate-300 underline disabled:opacity-40">მონიშვნის გასუფთავება</button>}
              </div>
              {announcementRecipients.length === 0 && <p className="text-[11px] text-slate-500">ზუსტი რაოდენობის სანახავად ჯერ ჩატვირთეთ მომხმარებლების სია.</p>}
              {broadcastAudienceMode === 'selected' && announcementRecipients.length > 0 && broadcastSelectedRecipientIds.length === 0 && <p className="text-[11px] text-amber-300">ინდივიდუალური აუდიტორიისთვის მონიშნეთ მინიმუმ ერთი მომხმარებელი.</p>}
            </section>
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
                <Megaphone className="w-5 h-5 text-emerald-400" /> {editingBannerId ? 'ბანერის რედაქტირება' : 'ახალი სარეკლამო ბანერის დამატება'}
              </h3>
              <form onSubmit={handleAddBanner} className="admin-banner-form space-y-4 text-xs">
                <div className="admin-banner-fields grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input type="text" placeholder="სათაური" required maxLength={120} value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="text" placeholder="ქვესათაური / აღწერა" maxLength={240} value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <input type="text" placeholder="ბანერის ფოტოს URL (HTTP/HTTPS)" maxLength={2048} value={bannerForm.image} onChange={e => setBannerForm({...bannerForm, image: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <input type="url" placeholder="ბანერის გადასასვლელი ბმული (არასავალდებულო, HTTP/HTTPS)" maxLength={2048} value={bannerForm.link} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">{editingBannerId ? 'ცვლილებების შენახვა' : 'ბანერის დამატება'}</button>
                  {editingBannerId && <button type="button" onClick={handleCancelBannerEdit} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-4 rounded-2xl transition cursor-pointer">გაუქმება</button>}
                </div>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური ბანერები ({bannersList?.length || 0})</h3>
              <div className="admin-banner-list grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(bannersList || []).map(b => (
                  <div key={b.id} className="admin-banner-card bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs gap-3 shadow-inner">
                    <div className="flex items-center gap-3.5">
                      <img src={b.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-16 h-12 object-cover rounded-2xl border border-emerald-500/20 shrink-0" />
                      <div>
                        <h4 className="font-black text-white text-sm">{b.title}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">{b.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => handleMoveBanner(b.id, 'up')} disabled={(bannersList || []).findIndex(item => item.id === b.id) === 0} aria-label={`ბანერის ზემოთ გადატანა: ${b.title || ''}`} className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-2 bg-slate-800 rounded-xl cursor-pointer transition"><ChevronUp className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleMoveBanner(b.id, 'down')} disabled={(bannersList || []).findIndex(item => item.id === b.id) === (bannersList || []).length - 1} aria-label={`ბანერის ქვემოთ გადატანა: ${b.title || ''}`} className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-2 bg-slate-800 rounded-xl cursor-pointer transition"><ChevronDown className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleEditBanner(b)} aria-label={`ბანერის რედაქტირება: ${b.title || ''}`} className="text-emerald-300 hover:text-emerald-200 p-2.5 bg-emerald-500/10 rounded-2xl cursor-pointer transition"><Edit3 className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDeleteBanner(b.id)} aria-label={`ბანერის წაშლა: ${b.title || ''}`} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
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
                      <img src={newCatImage} alt="Preview" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-full h-full object-cover rounded-xl" />
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
                              <img src={displayImage} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-14 h-14 object-cover rounded-2xl border border-emerald-500/30 shrink-0 shadow-md" />
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
                                <img src={editCatImage} alt="Edit preview" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-full h-full object-cover" />
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
                                      {subImg && <img src={subImg} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = ADMIN_IMAGE_FALLBACK; }} className="w-10 h-10 object-cover rounded-xl border border-emerald-500/20 shrink-0 shadow" />}
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
                <button type="submit" disabled={isCouponMutationBusy} aria-busy={isCouponMutationBusy} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{isCouponMutationBusy ? "მუშავდება..." : "კუპონის დამატება"}</button>
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
                    <button type="button" onClick={() => handleDeleteCoupon(c.id)} disabled={isCouponMutationBusy} aria-busy={isCouponMutationBusy} aria-label={`კუპონის ${c.code} წაშლა`} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'vendors' && (
          <div className="admin-vendors-panel space-y-6">
            <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] leading-relaxed text-amber-100">
              ვენდორების სია ამჟამად ინახება მხოლოდ ამ ბრაუზერში და სხვა მოწყობილობებთან არ სინქრონდება. ეს ჩანაწერები გადახდებს ან რეალურ ანგარიშსწორებას არ მართავს.
            </p>
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
                <Users className="w-5 h-5 text-emerald-400" /> CRM ჩანაწერები — ლოკალური სია ({usersList?.length || 0})
              </h3>
              <div className="admin-crm-search relative w-full sm:w-72">
                <input type="text" placeholder="ძებნა სახელით, ემაილით ან ტელეფონით..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              </div>
            </div>
            <p className="text-amber-200/90 text-[11px] leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              ეს არის ძველი CRM სია, რომელიც ინახება მხოლოდ ამ მოწყობილობის ბრაუზერში. VIP/შეზღუდვის ნიშნები აქ მხოლოდ CRM ჩანაწერს ეხება — ისინი არ ცვლიან Supabase Auth ანგარიშის უფლებებს. ფასდაკლების ველი მხოლოდ ადგილობრივი ჩანაწერია და checkout-ის ფასს ავტომატურად არ ცვლის. ჩანაწერის წაშლა არ შლის რეალურ ანგარიშს, შეკვეთებს ან ბაზის მონაცემებს.
            </p>

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
                            {u.isBlocked && <span className="bg-rose-500/20 text-rose-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">CRM შეზღუდვის ნიშანი</span>}
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
                            title="მხოლოდ ლოკალური CRM ჩანაწერის ნიშანი; Auth ანგარიშს არ ბლოკავს"
                          >
                            {u.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {u.isBlocked ? 'ნიშნის მოხსნა' : 'CRM-ში შეზღუდულად მონიშვნა'}
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
                            title="მხოლოდ ლოკალური CRM ჩანაწერის წაშლა; Auth ანგარიშს არ შლის"
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
                                min="0" max="100" step="0.01" inputMode="decimal"
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
                  <input type="number" min="0" step="0.01" inputMode="decimal" value={deliveryFeeDrafts.tbilisi} onChange={e => setDeliveryFeeDrafts(current => ({ ...current, tbilisi: e.target.value }))} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🌆 დიდი ქალაქები (₾):</label>
                  <input type="number" min="0" step="0.01" inputMode="decimal" value={deliveryFeeDrafts.bigCities} onChange={e => setDeliveryFeeDrafts(current => ({ ...current, bigCities: e.target.value }))} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🏔️ სხვა რეგიონები (₾):</label>
                  <input type="number" min="0" step="0.01" inputMode="decimal" value={deliveryFeeDrafts.other} onChange={e => setDeliveryFeeDrafts(current => ({ ...current, other: e.target.value }))} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
              </div>
              <button type="button" onClick={handleSaveDeliveryFees} disabled={isDeliveryFeeSaveBusy} aria-busy={isDeliveryFeeSaveBusy} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {isDeliveryFeeSaveBusy ? "ინახება..." : "ტარიფების შენახვა"}
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
