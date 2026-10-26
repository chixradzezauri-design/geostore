// src/App.jsx - სრული და თავდაპირველი ორიგინალური კოდი
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, BookOpen, Image as ImageIcon, Bell, TrendingUp, BarChart2, PackageCheck, Upload, Bot, Gift, Cpu, CheckSquare, Zap, Compass, HelpCircle, Palette, Store, DownloadCloud, Smartphone, Laptop, Users, RotateCcw
} from 'lucide-react';

import { 
  SUPABASE_URL, headers, sendTelegramNotification, 
  INITIAL_CATEGORIES, INITIAL_VENDORS, INITIAL_PRODUCTS, 
  INITIAL_BANNERS, INITIAL_PROMO_SLOTS, INITIAL_COUPONS, INITIAL_POLICY 
} from './config';

export default function App() {
  const [currency, setCurrency] = useState('GEL'); 
  const [usdRate, setUsdRate] = useState(2.70);

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

  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ყველა');
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', sku: '', category: '', brand: '', vendor: '', priceGEL: 0, oldPriceGEL: 0, discountPercent: 0, stock: 0, image: '', description: '', warranty: '', isPreOrder: false });

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

  // --- AI ASSISTANT STATE ---
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiBudget, setAiBudget] = useState(10000);
  const [aiCategory, setAiCategory] = useState('ყველა');
  const [aiInputText, setAiInputText] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: 'გამარჯობა! 🤖 მე ვარ GEOSTORE-ის ჭკვიანი AI ასისტენტი. მე რეალურ დროში ვამოწმებ მაღაზიის მარაგებს, მიმდინარე ფასებს, ფასდაკლებებს, შეკვეთების სტატუსებსა და საიტის წესებს! რით შეგვიძლია დაგეხმაროთ დღეს?',
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

  const handlePlaceOrder = async (itemsToOrder, totalVal, isExpress = false) => {
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert('⚠️ გთხოვთ შეავსოთ ყველა ველი');
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsData = itemsToOrder.map(i => ({ id: i.id, name: i.name, price: i.priceGEL, quantity: i.quantity || 1, vendor: i.vendor || 'GEOSTORE ოფიციალური' }));

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
        date: new Date().toISOString().slice(0, 10),
        notes: ''
      };
      setUsersList([newUser, ...usersList]);
      setCurrentUser(newUser);
      setIsAuthOpen(false);
      setAuthForm({ name: '', phone: '', email: '', password: '', remember: false });
      showToast('🎉 რეგისტრაცია წარმატებულია!');
    } else {
      const found = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (found) {
        setCurrentUser(found);
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
    showToast('გახვედით ადმინ პანელიდან');
  };

  const handleChangeAdminPassword = (e) => {
    e.preventDefault();
    if (adminSecurityForm.oldPassword !== adminAuth.password) {
      alert('ძველი პაროლი არასწორია!');
      return;
    }
    const updated = {
      username: adminSecurityForm.username || adminAuth.username,
      password: adminSecurityForm.newPassword
    };
    setAdminAuth(updated);
    setAdminSecurityForm({ username: updated.username, oldPassword: '', newPassword: '' });
    showToast('🔑 პაროლი წარმატებით შეიცვალა!');
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

  const handleAiAsk = (customQuestion = null) => {
    const queryRaw = (customQuestion || aiInputText).trim();
    if (!queryRaw) return;

    const userMsg = { sender: 'user', text: queryRaw };
    let budgetLimit = aiBudget;

    let matched = products.filter(p => p.priceGEL <= budgetLimit);
    if (matched.length === 0) matched = products;

    setAiChatHistory(prev => [...prev, userMsg, {
      sender: 'ai',
      text: `📱 რეალურ დროში მოძიებული შედეგები (ბიუჯეტი: ${budgetLimit}₾):`,
      recommendedProducts: matched.slice(0, 4)
    }]);
    setAiInputText('');
  };

  const handleSendMessage = async (text, senderName, imageUrl = '') => {
    if (!text.trim() && !imageUrl) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
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
      setChatInput('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 md:pb-0 selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between overflow-x-hidden w-full">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-xl border border-emerald-300 animate-bounce flex items-center gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-slate-950" />
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black flex items-center gap-1.5 shadow">
              <Store className="w-5 h-5" />
              <span className="text-sm tracking-wide">{siteSettings.storeName}</span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">{siteSettings.topBarText}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setCurrency(currency === 'GEL' ? 'USD' : 'GEL')} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 text-emerald-300">
              <DollarSign className="w-3.5 h-3.5" /> {currency}
            </button>
            <button onClick={() => setIsAiAssistantOpen(true)} className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
              <Bot className="w-4 h-4" /> AI ასისტენტი
            </button>
            <button onClick={() => setIsGiftQuizOpen(true)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
              <Gift className="w-4 h-4" /> საჩუქრის ქვიზი
            </button>
            <button onClick={() => setActiveTab('wishlist')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
            </button>
            <button onClick={() => setActiveTab('admin')} className="p-2 bg-slate-800 rounded-xl text-emerald-400 font-bold text-xs flex items-center gap-1">
              <Shield className="w-4 h-4" /> ადმინ
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* HERO BANNER */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-10 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">მრავალვენდერიანი მარკეტფლეისი</span>
              <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{siteSettings.heroTitle}</h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-xl">{siteSettings.heroSubtitle}</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsAiAssistantOpen(true)} className="bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow flex items-center gap-2">
                  <Bot className="w-4 h-4" /> AI ასისტენტი
                </button>
                <button onClick={() => setIsGiftQuizOpen(true)} className="bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs border border-slate-700 flex items-center gap-2">
                  <Gift className="w-4 h-4" /> საჩუქრის ქვიზი
                </button>
              </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="მოძებნე პროდუქტი..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {categories.map(cat => (
                  <button 
                    key={cat.id || cat} 
                    onClick={() => setSelectedCategory(cat.name || cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
                  >
                    {cat.name || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* PRODUCTS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-3">
                  <div className="relative group">
                    <img src={prod.image} alt={prod.name} className="w-full h-40 object-contain bg-slate-950 rounded-xl p-2 border border-slate-800" />
                    <button onClick={() => toggleWishlist(prod)} className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-rose-400 hover:bg-slate-900">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] text-teal-400 font-bold uppercase">{prod.vendor || 'GEOSTORE'}</span>
                    <h3 className="font-bold text-white text-xs mt-1 line-clamp-1">{prod.name}</h3>
                    <p className="text-emerald-400 font-black text-sm mt-1">{formatPrice(prod.priceGEL)}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => addToCart(prod)} className="flex-1 bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-xs shadow">კალათაში</button>
                    <button onClick={() => toggleComparison(prod)} className="bg-slate-800 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700">⚔️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">❤️ სურვილების სია ({wishlist.length})</h2>
            {wishlist.length === 0 ? <p className="text-slate-500 text-xs">სია ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishlist.map(prod => (
                  <div key={prod.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
                    <img src={prod.image} alt="" className="w-14 h-14 object-contain bg-slate-950 rounded-lg p-1 border border-slate-800" />
                    <div>
                      <h4 className="font-bold text-xs text-white">{prod.name}</h4>
                      <p className="text-emerald-400 font-black text-xs mt-0.5">{formatPrice(prod.priceGEL)}</p>
                      <button onClick={() => addToCart(prod)} className="mt-1.5 bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-bold">კალათაში</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">🛒 საყიდლების კალათა</h2>
            {cart.length === 0 ? <p className="text-slate-500 text-xs">კალათა ცარიელია.</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-2.5">
                  {cart.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-xs text-white">{item.name}</h4>
                        <p className="text-emerald-400 font-bold mt-0.5">{formatPrice(item.priceGEL)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 py-0.5 bg-slate-800 rounded-lg text-white font-bold">-</button>
                        <span className="font-bold px-1.5">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 py-0.5 bg-slate-800 rounded-lg text-white font-bold">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="text-rose-400 ml-2 font-bold">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl h-fit space-y-3.5 shadow-lg">
                  <div className="text-lg font-black text-emerald-400">სულ: {formatPrice(cartTotalGEL)}</div>
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow">შეკვეთის გაფორმება</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-5">
            {!adminLoggedIn ? (
              <div className="max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-center shadow-xl">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto" />
                <h2 className="text-base font-bold text-white">ადმინისტრატორის შესვლა</h2>
                <form onSubmit={handleAdminLogin} className="space-y-2.5">
                  <input type="text" placeholder="მომხმარებელი" value={adminLoginForm.username} onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                  <input type="password" placeholder="პაროლი" value={adminLoginForm.password} onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                  {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs shadow">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-3 shadow">
                  <span className="text-xs font-black text-emerald-400">📊 პროფესიონალური ადმინ პანელი (ანალიტიკა და მართვა)</span>
                  <button onClick={handleAdminLogout} className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-xl text-xs font-bold">გასვლა</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <p className="text-slate-400 text-xs font-bold">💰 სრული შემოსავალი</p>
                    <p className="text-2xl font-black text-emerald-400">{proAnalytics.totalRevenueGEL.toLocaleString('ka-GE')} ₾</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <p className="text-slate-400 text-xs font-bold">💎 წმინდა მოგება</p>
                    <p className="text-2xl font-black text-teal-400">{proAnalytics.netProfitGEL.toLocaleString('ka-GE')} ₾</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <p className="text-slate-400 text-xs font-bold">📦 შეკვეთები</p>
                    <p className="text-2xl font-black text-blue-400">{proAnalytics.totalOrdersCount}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <p className="text-slate-400 text-xs font-bold">⚠️ დაბალი მარაგი</p>
                    <p className="text-2xl font-black text-amber-400">{proAnalytics.lowStockProducts.length} ცალი</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-white">📦 შეკვეთების სია ({orders.length})</h3>
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-emerald-400">#{o.id} ({o.date})</span>
                          <p className="text-slate-300">მყიდველი: <b>{o.customerName}</b> ({o.phone}) | მისამართი: {o.address}</p>
                        </div>
                        <span className="font-black text-white">{o.totalGEL} ₾</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-white text-sm">📦 შეკვეთის გაფორმება</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePlaceOrder(cart, cartTotalGEL);
            }} className="space-y-3 text-xs">
              <input type="text" required placeholder="სახელი, გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <input type="text" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl shadow">შეკვეთის დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* AI ASSISTANT MODAL */}
      {isAiAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-white text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-400" /> AI ასისტენტი</h3>
              <button onClick={() => setIsAiAssistantOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl h-60 overflow-y-auto space-y-3 border border-slate-800 text-xs">
              {aiChatHistory.map((m, idx) => (
                <div key={idx} className={`p-3 rounded-xl ${m.sender === 'user' ? 'bg-emerald-500/20 text-emerald-200 ml-6' : 'bg-slate-900 text-slate-200 mr-6'}`}>
                  <p>{m.text}</p>
                  {m.recommendedProducts && m.recommendedProducts.map(p => (
                    <div key={p.id} className="mt-2 bg-slate-950 p-2 rounded-lg flex items-center justify-between border border-slate-800">
                      <span className="font-bold">{p.name} - {p.priceGEL} ₾</span>
                      <button onClick={() => addToCart(p)} className="bg-emerald-500 text-slate-950 px-2 py-1 rounded text-[10px] font-black">ყიდვა</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="სთხოვე რაიმე AI-ს..." value={aiInputText} onChange={e => setAiInputText(e.target.value)} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white flex-1 outline-none" />
              <button onClick={() => handleAiAsk()} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs">გაგზავნა</button>
            </div>
          </div>
        </div>
      )}

      {/* GIFT QUIZ MODAL */}
      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-white text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-emerald-400" /> საჩუქრის ქვიზი</h3>
              <button onClick={() => setIsGiftQuizOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <p className="text-slate-400">ვისთვის ეძებთ საჩუქარს?</p>
            <div className="grid grid-cols-2 gap-2">
              {['მეგობარი', 'მშობელი', 'მეუღლე', 'კოლეგა'].map(rec => (
                <button key={rec} onClick={() => { setGiftRecipient(rec); setIsGiftQuizOpen(false); showToast(`შერჩეულია: ${rec}`); addToCart(products[0]); }} className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-bold text-white hover:border-emerald-500">{rec}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[11px] text-slate-500 mt-10">
        <p>© 2026 {siteSettings.storeName}. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
