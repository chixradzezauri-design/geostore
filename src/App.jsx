// src/App.jsx - ეტაპი 1: საიტის ბაზა, კალათა და მომხმარებლის ავტორიზაცია/რეგისტრაცია
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Heart, Search, User, ShieldCheck, Truck, RefreshCw, 
  Clock, Star, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  MessageSquare, Send, FileText, Download, Tag, Sliders, ArrowRight, 
  Eye, Grid, List, CheckCircle, AlertCircle, Phone, MapPin, Globe,
  Menu, Sparkles, Percent, DollarSign, Settings, Layers, Lock, LogOut, Key, Shield, Printer, BookOpen, Image as ImageIcon, Bell, TrendingUp, BarChart2, PackageCheck, Upload, Bot, Gift, Cpu, CheckSquare, Zap, Compass, HelpCircle, Palette, Store, DownloadCloud, Smartphone, Laptop, Users, RotateCcw
} from 'lucide-react';

// ================= SUPABASE & CONFIG =================
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
  }).catch(err => console.log("TG Error:", err));
};

const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'სმარტფონები', icon: '📱' },
  { id: 'cat-2', name: 'ლეპტოპები', icon: '💻' },
  { id: 'cat-3', name: 'აქსესუარები', icon: '🎧' },
  { id: 'cat-4', name: 'ჭკვიანი საათები', icon: '⌚' }
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
    } catch (e) { return fallback; }
  };

  const [siteSettings, setSiteSettings] = useState(() => loadSafeStorage('geostore_site_settings', {
    storeName: 'GEOSTORE',
    topBarText: 'GEOSTORE - N1 ტექნიკის ონლაინ მარკეტფლეისი',
    heroTitle: 'მრავალვენდერიანი მარკეტფლეისი საუკეთესო შეთავაზებებით',
    heroSubtitle: 'აღმოაჩინე შენი საყვარელი ბრენდები და მომწოდებლები ერთ სივრცეში!'
  }));

  const [categories, setCategories] = useState(() => loadSafeStorage('geostore_cats', INITIAL_CATEGORIES));
  const [products, setProducts] = useState(() => loadSafeStorage('geostore_products', INITIAL_PRODUCTS));
  
  const [activeTab, setActiveTab] = useState('store'); 
  const [selectedCategory, setSelectedCategory] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  // --- მომხმარებლის რეგისტრაცია და ავტორიზაცია ---
  const [usersList, setUsersList] = useState(() => loadSafeStorage('geostore_users_list', [
    { id: 'u1', name: 'გიორგი ბერიძე', email: 'giorgi@gmail.com', phone: '599123456', password: '123' }
  ]));
  const [currentUser, setCurrentUser] = useState(() => loadSafeStorage('geostore_current_user', null));
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ name: '', phone: '', email: '', password: '' });

  const [orders, setOrders] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });

  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // LocalStorage შენახვა
  useEffect(() => { try { localStorage.setItem('geostore_products', JSON.stringify(products)); } catch(e){} }, [products]);
  useEffect(() => { try { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); } catch(e){} }, [usersList]);
  useEffect(() => { try { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); } catch(e){} }, [currentUser]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`🛒 "${product.name}" დაემატა კალათაში!`);
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
        password: authForm.password
      };
      setUsersList([...usersList, newUser]);
      setCurrentUser(newUser);
      setIsAuthOpen(false);
      setAuthForm({ name: '', phone: '', email: '', password: '' });
      showToast('🎉 რეგისტრაცია წარმატებულია!');
    } else {
      const found = usersList.find(u => u.email === authForm.email && u.password === authForm.password);
      if (found) {
        setCurrentUser(found);
        setIsAuthOpen(false);
        setAuthForm({ name: '', phone: '', email: '', password: '' });
        showToast('🔑 ავტორიზაცია წარმატებულია!');
      } else {
        alert('არასწორი ელ-ფოსტა ან პაროლი!');
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ყველა' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 flex flex-col justify-between w-full">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-xl border border-emerald-300 animate-bounce flex items-center gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-slate-950" />
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('store')}>
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black flex items-center gap-1.5 shadow">
              <Store className="w-5 h-5" />
              <span className="text-sm tracking-wide">{siteSettings.storeName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('wishlist')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={() => setActiveTab('cart')} className="relative p-2 bg-slate-800 rounded-xl text-slate-200">
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
            </button>

            {currentUser ? (
              <button onClick={() => setActiveTab('profile')} className="px-3 py-1.5 bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs">{currentUser.name}</button>
            ) : (
              <button onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow">შესვლა</button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-10 rounded-3xl space-y-4 shadow-xl">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">მრავალვენდერიანი მარკეტფლეისი</span>
              <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{siteSettings.heroTitle}</h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-xl">{siteSettings.heroSubtitle}</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setSelectedCategory('ყველა')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'ყველა' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>ყველა</button>
              {categories.map(cat => (
                <button key={cat.id || cat} onClick={() => setSelectedCategory(cat.name || cat)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === (cat.name || cat) ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
                  {cat.icon || ''} {cat.name || cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-3">
                  <div className="relative group">
                    <img src={prod.image} alt={prod.name} className="w-full h-40 object-contain bg-slate-950 rounded-xl p-2 border border-slate-800" />
                    <button onClick={() => {
                      setWishlist(prev => prev.some(w => w.id === prod.id) ? prev.filter(w => w.id !== prod.id) : [...prev, prod]);
                      showToast('❤️ დაემატა სურვილებში');
                    }} className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-rose-400">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] text-teal-400 font-bold uppercase">{prod.vendor || 'GEOSTORE'}</span>
                    <h3 className="font-bold text-white text-xs mt-1 line-clamp-1">{prod.name}</h3>
                    <p className="text-emerald-400 font-black text-sm mt-1">{prod.priceGEL} ₾</p>
                  </div>
                  <button onClick={() => addToCart(prod)} className="w-full bg-emerald-500 text-slate-950 font-black py-2 rounded-xl text-xs shadow">კალათაში</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && currentUser && (
          <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <h2 className="text-base font-black text-white">👤 მომხმარებლის პროფილი</h2>
            <p><b>სახელი:</b> {currentUser.name}</p>
            <p><b>ელ-ფოსტა:</b> {currentUser.email}</p>
            <p><b>ტელეფონი:</b> {currentUser.phone}</p>
            <button onClick={() => { setCurrentUser(null); setActiveTab('store'); showToast('გახვედით პროფილიდან'); }} className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold">გამოსვლა</button>
          </div>
        )}
      </main>

      {/* AUTH MODAL */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-bold">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-2.5 text-xs">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl shadow">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-[11px] text-slate-500">
        <p>© 2026 {siteSettings.storeName}. ყველა უფლება დაცულია.</p>
      </footer>
    </div>
  );
}
