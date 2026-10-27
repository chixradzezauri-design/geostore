// src/App.jsx - GEOSTORE Next-Gen Edition (Fixed Footer & Sync)
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import AdminDashboardPro from './components/AdminDashboardPro';
import AiAssistantModal from './components/AiAssistantModal';
import Modals from './components/Modals';
import ImageSearchModal from './components/ImageSearchModal'; 
import { MessageSquare, Heart, ShoppingBag, User, ShieldCheck, FileText, Bot, Sparkles } from 'lucide-react';

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

// 📌 საწყისი კატეგორიები იკონების მხარდაჭერით
const INITIAL_CATEGORIES = [
  { name: 'სმარტფონები', icon: 'Smartphone' },
  { name: 'ლეპტოპები', icon: 'Laptop' },
  { name: 'აქსესუარები', icon: 'Sparkles' },
  { name: 'ჭკვიანი საათები', icon: 'Watch' }
];

const INITIAL_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, status: 'აქტიური' },
  { id: 'v2', name: 'TechHub Georgia', commission: 10, status: 'აქტიური' }
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
    stock: 8,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით.'
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
    stock: 4,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით.'
  }
];

export default function App() {
  const loadSafeStorage = (key, fallback) => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } catch { return fallback; }
  };

  const [siteSettings, setSiteSettings] = useState(() => loadSafeStorage('geostore_site_settings', {
    storeName: 'GEOSTORE',
    topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი',
    heroTitle: 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით',
    heroSubtitle: 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!'
  }));

  const [categories, setCategoriesList] = useState(() => loadSafeStorage('geostore_cats', INITIAL_CATEGORIES));
  const [vendorsList, setVendorsList] = useState(() => loadSafeStorage('geostore_vendors', INITIAL_VENDORS));
  const [products, setProducts] = useState(() => loadSafeStorage('geostore_products', INITIAL_PRODUCTS));
  const [coupons, setCoupons] = useState(() => loadSafeStorage('geostore_coupons', []));
  const [bannersList, setBannersList] = useState(() => loadSafeStorage('geostore_banners', []));

  const [promoSlots] = useState([
    { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-emerald-600/30 to-teal-800/40' },
    { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-cyan-600/30 to-blue-800/40' },
    { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-green-600/30 to-emerald-900/40' }
  ]);

  const [activeTab, setActiveTab] = useState('store'); 
  const [selectedVendorFilter] = useState('ყველა');
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState(() => loadSafeStorage('geostore_cart', []));
  const [wishlist, setWishlist] = useState(() => loadSafeStorage('geostore_wishlist', []));

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
  const [isGiftQuizOpen, setIsGiftQuizOpen] = useState(false);

  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key) return;
      if (e.key === 'geostore_products') {
        try { setProducts(JSON.parse(e.newValue) || INITIAL_PRODUCTS); } catch {}
      }
      if (e.key === 'geostore_cats') {
        try { setCategoriesList(JSON.parse(e.newValue) || INITIAL_CATEGORIES); } catch {}
      }
      if (e.key === 'geostore_site_settings') {
        try { setSiteSettings(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'geostore_vendors') {
        try { setVendorsList(JSON.parse(e.newValue) || INITIAL_VENDORS); } catch {}
      }
      if (e.key === 'geostore_cart') {
        try { setCart(JSON.parse(e.newValue) || []); } catch {}
      }
      if (e.key === 'geostore_wishlist') {
        try { setWishlist(JSON.parse(e.newValue) || []); } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.map(o => ({
          id: o.id,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('ka-GE') : 'დღეს',
          customerName: o.customer_name,
          phone: o.phone,
          address: o.address,
          totalGEL: o.total_gel,
          status: o.status || 'ახალი'
        })));
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch{} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch{} }, [currentUser]);
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch{} }, [products]);
  useEffect(() => { try { localStorage.setItem('geostore_cats', JSON.stringify(categories)); } catch{} }, [categories]);
  useEffect(() => { try { localStorage.setItem('geostore_vendors', JSON.stringify(vendorsList)); } catch{} }, [vendorsList]);
  useEffect(() => { try { localStorage.setItem('geostore_cart', JSON.stringify(cart)); } catch{} }, [cart]);
  useEffect(() => { try { localStorage.setItem('geostore_wishlist', JSON.stringify(wishlist)); } catch{} }, [wishlist]);
  useEffect(() => { try { localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings)); } catch{} }, [siteSettings]);

  const cartTotalGEL = useMemo(() => {
    const itemsToCalc = quickBuyProduct ? [quickBuyProduct] : cart;
    return itemsToCalc.reduce((acc, item) => acc + (item.priceGEL * (item.quantity || 1)), 0);
  }, [cart, quickBuyProduct]);

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

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return;

    if (authMode === 'register') {
      if (!authForm.name || !authForm.phone) { alert('შეავსეთ ყველა ველი!'); return; }
      const newUser = { id: `u-${Date.now()}`, ...authForm };
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

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: orderId,
          customer_name: checkoutForm.name,
          phone: checkoutForm.phone,
          address: checkoutForm.address,
          user_email: currentUser ? currentUser.email : 'guest',
          items: itemsToOrder,
          total_gel: cartTotalGEL,
          status: 'ახალი'
        })
      });
      sendTelegramNotification(`🚨 *ახალი შეკვეთა #${orderId}*\n👤 მყიდველი: ${checkoutForm.name}\n📞 ტელეფონი: ${checkoutForm.phone}\n💰 თანხა: ${cartTotalGEL} ₾`);
      setIsCheckoutOpen(false);
      setCart([]);
      showToast('✅ შეკვეთა წარმატებით გაფორმდა!');
      fetchOrders();
    } catch { alert('შეცდომა შეკვეთისას'); }
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
        currentUser={currentUser}
        setIsAuthOpen={setIsAuthOpen}
        setAuthMode={setAuthMode}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        setIsGiftQuizOpen={setIsGiftQuizOpen}
        setIsImageSearchOpen={setIsImageSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 space-y-8">
        {activeTab === 'store' && (
          <StoreView 
            siteSettings={siteSettings}
            promoSlots={promoSlots}
            categories={categories}
            vendorsList={vendorsList}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            filteredProducts={filteredProducts}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            addToCart={addToCart}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardPro 
            adminLoggedIn={adminLoggedIn}
            setAdminLoggedIn={setAdminLoggedIn}
            adminLoginForm={adminLoginForm}
            setAdminLoginForm={setAdminLoginForm}
            handleAdminLogin={handleAdminLogin}
            adminError={adminError}
            proAnalytics={proAnalytics}
            orders={orders}
            setOrders={setOrders}
            usersList={usersList}
            setUsersList={setUsersList}
            products={products}
            setProducts={setProducts}
            vendorsList={vendorsList}
            setVendorsList={setVendorsList}
            coupons={coupons}
            setCoupons={setCoupons}
            categoriesList={categories}
            setCategoriesList={setCategoriesList}
            bannersList={bannersList}
            setBannersList={setBannersList}
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> სურვილების სია ({wishlist.length})
            </h2>
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
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-[2.5rem] h-fit space-y-4 shadow-2xl backdrop-blur-2xl">
                  <div className="text-xl font-black text-emerald-400">სულ: {formatPrice(cartTotalGEL)}</div>
                  <button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-xl shadow-emerald-500/20 transition cursor-pointer">შეკვეთის გაფორმება</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-800/80 p-8 rounded-[2.5rem] space-y-4 text-xs shadow-2xl backdrop-blur-2xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" /> მომხმარებლის პროფილი
            </h2>
            <div className="space-y-2 text-slate-300">
              <p><b>სახელი:</b> {currentUser.name}</p>
              <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
              <p><b>ტელეფონი:</b> {currentUser.phone}</p>
            </div>
            <button onClick={() => { setCurrentUser(null); setActiveTab('store'); showToast('გახვედით პროფილიდან'); }} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl font-bold transition cursor-pointer">გამოსვლა</button>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-6 z-50">
        <button 
          onClick={() => setIsAiAssistantOpen(true)}
          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black p-4 rounded-full shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2.5 group cursor-pointer border border-emerald-300/40"
        >
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
              <h4 className="font-black flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" /> GEOSTORE მხარდაჭერა
              </h4>
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
                  body: JSON.stringify({
                    id: ticketId,
                    customer_name: name,
                    email: email || 'guest@geostore.ge',
                    subject: subject || 'ზოგადი კითხვა',
                    message: message,
                    status: 'ღია'
                  })
                });

                alert('✅ თქვენი შეტყობინება წარმატებით გაეგზავნა ადმინისტრატორს! მალე გიპასუხებთ.');
                e.target.reset();
                setSupportOpen(false);
              } catch {
                alert('შეცდომა შეტყობინების გაგზავნისას.');
              }
            }} className="space-y-3">
              <input type="text" name="cname" placeholder="თქვენი სახელი *" required className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <input type="email" name="cemail" placeholder="ელ-ფოსტა" className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <input type="text" name="csubject" placeholder="თემა (მაგ: შეკვეთა #102)" className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" />
              <textarea name="cmessage" rows="3" placeholder="დაწერეთ თქვენი კითხვა ან საჩივარი..." required className="w-full bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl text-white outline-none focus:border-emerald-500 resize-none shadow-inner"></textarea>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">
                შეტყობინების გაგზავნა
              </button>
            </form>
          </div>
        ) : (
          <button 
            onClick={() => setSupportOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-full shadow-2xl transition flex items-center gap-2 group cursor-pointer"
          >
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
        addToCart={addToCart}
        formatPrice={formatPrice}
      />

      <footer className="bg-slate-950 border-t border-slate-900/80 py-8 text-center text-xs text-slate-500 mt-12 backdrop-blur-md space-y-3">
        <div className="flex justify-center items-center gap-6 text-slate-400 font-bold">
          <button onClick={() => setIsTermsOpen(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
            <FileText className="w-4 h-4" /> წესები და პირობები
          </button>
          <span>•</span>
          <button onClick={() => setIsWarrantyOpen(true)} className="hover:text-emerald-400 transition flex items-center gap-1.5 cursor-pointer">
            <ShieldCheck className="w-4 h-4" /> საგარანტიო წესები
          </button>
        </div>
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
