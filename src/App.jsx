// src/App.jsx - GEOSTORE სრული, ერთიანი და ადმინ-ოპტიმიზებული მთავარი ფაილი
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import StoreView from './components/StoreView';
import AdminDashboardPro from './components/AdminDashboardPro';
import AiAssistantModal from './components/AiAssistantModal';
import Modals from './components/Modals';

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

const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'სმარტფონები', icon: '📱' },
  { id: 'cat-2', name: 'ლეპტოპები', icon: '💻' },
  { id: 'cat-3', name: 'აქსესუარები', icon: '🎧' },
  { id: 'cat-4', name: 'ჭკვიანი საათები', icon: '⌚' }
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
    heroTitle: 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით',
    heroSubtitle: 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!'
  }));

  const [categories] = useState(() => loadSafeStorage('geostore_cats', INITIAL_CATEGORIES));
  const [vendorsList] = useState(() => loadSafeStorage('geostore_vendors', INITIAL_VENDORS));
  const [products, setProducts] = useState(() => loadSafeStorage('geostore_products', INITIAL_PRODUCTS));
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

  // Auth States
  const [usersList, setUsersList] = useState(() => loadSafeStorage('geostore_users_list', []));
  const [currentUser, setCurrentUser] = useState(() => loadSafeStorage('geostore_current_user', null));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });

  // Admin States
  const [adminAuth] = useState({ username: "admin", password: "admin123" });
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => {
    try { return localStorage.getItem('geostore_admin_remember') === 'true'; } catch { return false; }
  });
  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '', remember: false });
  const [adminError, setAdminError] = useState('');

  // Orders & Modals
  const [orders, setOrders] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [quickBuyProduct] = useState(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isGiftQuizOpen, setIsGiftQuizOpen] = useState(false);

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
    } catch (err) {
      console.warn("Background auto-sync warning:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch{} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch{} }, [currentUser]);
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch{} }, [products]);

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
    if (adminLoginForm.username === adminAuth.username && adminLoginForm.password === adminAuth.password) {
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
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-xl border border-emerald-300 animate-bounce flex items-center gap-2 text-xs">
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
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
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
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

        {/* ADMIN DASHBOARD PRO COMPONENT */}
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
            usersList={usersList}
            products={products}
            setProducts={setProducts}
            vendorsList={vendorsList}
            categories={categories}
            siteSettings={siteSettings}
            setSiteSettings={setSiteSettings}
            formatPrice={formatPrice}
          />
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">❤️ სურვილების სია ({wishlist.length})</h2>
            {wishlist.length === 0 ? <p className="text-slate-500 text-xs">სია ცარიელია.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishlist.map(prod => (
                  <div key={prod.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={prod.image} alt="" className="w-14 h-14 object-contain bg-slate-950 rounded-lg p-1 border border-slate-800" />
                      <div>
                        <h4 className="font-bold text-xs text-white">{prod.name}</h4>
                        <p className="text-emerald-400 font-black text-xs mt-0.5">{formatPrice(prod.priceGEL)}</p>
                      </div>
                    </div>
                    <button onClick={() => addToCart(prod)} className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold shadow">კალათაში</button>
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
                      <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-rose-400 font-bold">წაშლა</button>
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

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 text-xs shadow-xl">
            <h2 className="text-base font-black text-white">👤 მომხმარებლის პროფილი</h2>
            <p><b>სახელი:</b> {currentUser.name}</p>
            <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p><b>ტელეფონი:</b> {currentUser.phone}</p>
            <button onClick={() => { setCurrentUser(null); setActiveTab('store'); showToast('გახვედით პროფილიდან'); }} className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold">გამოსვლა</button>
          </div>
        )}
      </main>

      {/* MODALS */}
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
        isGiftQuizOpen={isGiftQuizOpen}
        setIsGiftQuizOpen={setIsGiftQuizOpen}
        products={products}
        addToCart={addToCart}
      />

      {/* AI ASSISTANT MODAL */}
      <AiAssistantModal 
        isAiAssistantOpen={isAiAssistantOpen}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        products={products}
        categories={categories}
        addToCart={addToCart}
        formatPrice={formatPrice}
      />

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[11px] text-slate-500 mt-10">
        <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
