import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, Lock, CheckCircle, 
  Package, Tag, Eye, X, TrendingUp, User, LogOut, Phone, Mail, MapPin, Clock, ArrowRight
} from 'lucide-react';

const CATEGORIES = ["ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი", "სხვა პროდუქტები"];

const INITIAL_PRODUCTS = [
  { 
    id: 1, 
    sku: "GEO-IPH-15P", 
    name: "Apple iPhone 15 Pro Max 256GB", 
    category: "ელექტრონიკა", 
    price: 4599, 
    oldPrice: 4899,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", 
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი. ოფიციალური გარანტია 1 წელი.", 
    stock: 12
  },
  { 
    id: 2, 
    sku: "GEO-SHO-002", 
    name: "პრემიუმ ტყავის კეტები Urban", 
    category: "ტანსაცმელი და ფეხსაცმელი", 
    price: 280, 
    oldPrice: 350,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80", 
    description: "100% ნატურალური ტყავი, კომფორტული ძირი.", 
    stock: 25
  },
  { 
    id: 3, 
    sku: "GEO-EAR-ANC", 
    name: "უსადენო ყურსასმენი ANC Pro", 
    category: "ელექტრონიკა", 
    price: 350, 
    oldPrice: 420,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", 
    description: "აქტიური ხმაურის ჩახშობა (ANC), 30 საათიანი ელემენტი.", 
    stock: 3
  }
];

export default function App() {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('geostore_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('geostore_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // მომხმარებლის ავტორიზაციის და რეგისტრაციის სტეიტი
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop"); // shop, admin, profile, policy, contact
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login ან register
  const [authForm, setAuthForm] = useState({ name: "", phone: "", email: "", password: "" });

  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  // ადმინ ავტორიზაცია
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", city: "თბილისი", address: "", deliveryZone: "tbilisi", paymentMethod: "courier" });
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    localStorage.setItem('geostore_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('geostore_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('geostore_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // რეგისტრაცია / შესვლა
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (authMode === 'register' && !authForm.name)) {
      alert("გთხოვთ შეავსოთ ყველა ველი!");
      return;
    }

    const userData = {
      name: authMode === 'register' ? authForm.name : authForm.email.split('@')[0],
      phone: authForm.phone || "+995 500 00 00 00",
      email: authForm.email
    };

    setCurrentUser(userData);
    setIsAuthOpen(false);
    setAuthForm({ name: "", phone: "", email: "", password: "" });
    alert(authMode === 'register' ? "რეგისტრაცია წარმატებით დასრულდა!" : "წარმატებით გაიარეთ ავტორიზაცია!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("shop");
  };

  // ფილტრაცია
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // კალათა
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "GEO2026") {
      setDiscountPercent(10);
      alert("კუპონი გააქტიურდა! (-10%)");
    } else {
      alert("არასწორი კუპონი! გამოიყენეთ: GEO2026");
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = (subTotal * discountPercent) / 100;
  const deliveryFee = orderForm.deliveryZone === "tbilisi" ? 5 : 10;
  const grandTotal = subTotal - discountAmount + (cart.length > 0 ? deliveryFee : 0);

  // შეკვეთის გაფორმება
  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.address) {
      alert("გთხოვთ შეავსოთ სავალდებულო ველები!");
      return;
    }

    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total: grandTotal,
      customer: { ...orderForm },
      userEmail: currentUser ? currentUser.email : "guest",
      status: "ახალი" // თავდაპირველი სტატუსი
    };

    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  // ადმინის ავტორიზაცია
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === "1234") {
      setIsAdminLoggedIn(true);
      setAdminError("");
    } else {
      setAdminError("არასწორი პინ-კოდი! (სატესტოა: 1234)");
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.image) {
      alert("გთხოვთ შეავსოთ სავალდებულო ველები!");
      return;
    }
    const productToAdd = {
      id: Date.now(),
      sku: newProd.sku || `GEO-${Math.floor(Math.random() * 1000)}`,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      image: newProd.image,
      description: newProd.description || "აღწერა არ არის",
      stock: Number(newProd.stock) || 10
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ sku: "", name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
    alert("პროდუქტი წარმატებით დაემატა!");
  };

  const deleteProduct = (id) => {
    if (confirm("ნამდვილად გსურთ წაშლა?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // მომხმარებლის შეკვეთები
  const myOrders = currentUser ? orders.filter(o => o.userEmail === currentUser.email || o.customer.phone === currentUser.phone) : [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {/* TOP BAR */}
      <div className="bg-black text-white text-xs py-2 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto w-full">
        <span>✨ უფასო მიწოდება 100₾-ის ზემოთ | კუპონი: <strong>GEO2026</strong></span>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab("policy")} className="hover:underline">მიწოდება და პოლიტიკა</button>
          <button onClick={() => setActiveTab("contact")} className="hover:underline">კონტაქტი</button>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => setActiveTab("shop")} className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-black text-white px-3 py-1 rounded-xl">GEO</span>
            <span>STORE</span>
          </button>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="მოძებნე დასახელებით ან SKU კოდით..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-transparent focus:border-black rounded-full pl-10 pr-4 py-2.5 text-sm outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <button 
                onClick={() => setActiveTab("profile")} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{currentUser.name}</span>
              </button>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }} 
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gray-100 hover:bg-gray-200"
              >
                <User className="w-4 h-4" />
                <span>შესვლა / რეგისტრაცია</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("admin")} 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ადმინ</span>
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-4 py-2.5 rounded-full flex items-center gap-2 hover:bg-zinc-800 text-sm font-medium transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">კალათა</span>
              {cart.reduce((s, i) => s + i.qty, 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* 🟢 PROFILE TAB (მომხმარებლის პირადი კაბინეტი და შეკვეთების სტატუსები) */}
        {activeTab === 'profile' && currentUser && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black">გამარჯობა, {currentUser.name}!</h2>
                <p className="text-xs text-gray-500 mt-1">📧 {currentUser.email} | 📞 {currentUser.phone}</p>
              </div>
              <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-red-100">
                <LogOut className="w-4 h-4" /> გამოსვლა
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" /> ჩემი შეკვეთები და მათი სტატუსები ({myOrders.length})
              </h3>
              {myOrders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">თქვენ ჯერ არ გაქვთ გაფორმებული შეკვეთები.</p>
              ) : (
                <div className="space-y-4">
                  {myOrders.map(o => (
                    <div key={o.id} className="border rounded-2xl p-5 bg-gray-50 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                        <div>
                          <span className="font-black text-base">შეკვეთა #{o.id}</span>
                          <span className="text-xs text-gray-500 ml-2">({o.date})</span>
                        </div>
                        {/* შეკვეთის ვიზუალური სტატუსი */}
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          o.status === 'ახალი' ? 'bg-blue-100 text-blue-700' :
                          o.status === 'დამუშავებაშია' ? 'bg-yellow-100 text-yellow-700' :
                          o.status === 'გზაშია' ? 'bg-purple-100 text-purple-700' :
                          o.status === 'ჩაბარებული' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          სტატუსი: {o.status}
                        </span>
                      </div>
                      
                      <div className="text-xs space-y-1 text-gray-600">
                        <p><strong>მიწოდება:</strong> {o.customer.city}, {o.customer.address}</p>
                        <p><strong>პროდუქტები:</strong> {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-gray-500">გადახდა: {o.customer.paymentMethod === 'courier' ? 'კურიერთან' : 'ონლაინ'}</span>
                        <span className="text-base font-black">{o.total} ₾</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🟢 POLICY TAB */}
        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-black">წესები, პირობები და დაბრუნების პოლიტიკა</h2>
            <p className="text-sm text-gray-600 leading-relaxed">მიწოდება თბილისში 24 საათში (5₾), რეგიონებში 48 საათში (10₾). 100₾-ზე მეტი შეკვეთისას მიწოდება უფასოა. ნივთის დაბრუნება შესაძლებელია 14 დღის განმავლობაში.</p>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">მაღაზიაში დაბრუნება</button>
          </div>
        )}

        {/* 🟢 CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl p-8 border max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">საკონტაქტო ინფორმაცია</h2>
            <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500"/> +995 32 2 00 00 00</p>
            <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500"/> info@geostore.ge</p>
            <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/> თბილისი, რუსთაველის გამზირი #1</p>
          </div>
        )}

        {/* 🟢 ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">ადმინისტრაციის შესვლა</h2>
                  <p className="text-gray-500 text-sm mt-1">პინ-კოდი: 1234</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input 
                    type="password" placeholder="პინ-კოდი (1234)" 
                    value={adminPin} onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full bg-gray-100 border rounded-xl px-4 py-3 text-center text-lg outline-none"
                  />
                  {adminError && <p className="text-red-500 text-xs text-center font-medium">{adminError}</p>}
                  <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-3xl font-black">ადმინ პანელი</h2>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" /> შეკვეთების მართვა და სტატუსები ({orders.length})
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">შეკვეთები არ არის.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(o => (
                        <div key={o.id} className="border rounded-2xl p-4 bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-1 text-sm">
                            <span className="font-bold">შეკვეთა #{o.id} ({o.date})</span>
                            <p className="text-xs text-gray-600">მყიდველი: {o.customer.name} | 📞 {o.customer.phone}</p>
                            <p className="text-xs text-gray-600">მისამართი: {o.customer.city}, {o.customer.address}</p>
                            <p className="text-xs font-semibold text-indigo-600">პროდუქტები: {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-3 justify-end">
                            <span className="text-lg font-black">{o.total} ₾</span>
                            <select 
                              value={o.status} 
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              className="bg-white border rounded-xl px-3 py-1 text-xs font-bold text-indigo-600"
                            >
                              <option value="ახალი">ახალი</option>
                              <option value="დამუშავებაშია">დამუშავებაშია</option>
                              <option value="გზაშია">გზაშია</option>
                              <option value="ჩაბარებული">ჩაბარებული</option>
                              <option value="გაუქმებული">გაუქმებული</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                  <h3 className="text-lg font-bold">+ პროდუქტის დამატება</h3>
                  <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="SKU კოდი" value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="text" placeholder="დასახელება *" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                      {CATEGORIES.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="ფასი (₾) *" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="number" placeholder="მარაგი" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="text" placeholder="ფოტოს ბმული (URL) *" value={newProd.image} onChange={e => setNewProd({...newProd, image: e.target.value})} className="sm:col-span-2 bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm">დამატება</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🟢 SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="space-y-8">
            <div className="bg-black text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-xl">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">GEOSTORE 2026</span>
                <h1 className="text-3xl md:text-5xl font-black mt-4 leading-tight">პრემიუმ ხარისხი საქართველოში</h1>
                <p className="text-gray-300 text-sm mt-3">სწრაფი მიწოდება მთელი საქართველოს მასშტაბით 24-48 საათში.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border hover:bg-gray-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between group">
                  <div>
                    <div className="relative overflow-hidden h-64 bg-gray-100">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <button 
                        onClick={() => setQuickViewProduct(product)} 
                        className="absolute top-3 right-3 bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-700 hover:bg-white shadow"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{product.category}</span>
                      <h3 className="font-bold text-base mt-1 text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between">
                    <span className="text-xl font-black text-gray-900">{product.price} ₾</span>
                    <button 
                      onClick={() => addToCart(product)} 
                      disabled={product.stock === 0}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition ${product.stock > 0 ? 'bg-black text-white hover:bg-zinc-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {product.stock > 0 ? 'კალათაში' : 'ამოწურულია'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* AUTH MODAL (რეგისტრაცია და შესვლა) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-2">
              <h3 className="text-2xl font-bold">{authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}</h3>
              <p className="text-xs text-gray-500 mt-1">მართეთ თქვენი შეკვეთები მარტივად</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი და გვარი" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                  <input type="tel" required placeholder="ტელეფონი (+995 ...)" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="password" required placeholder="პაროლი" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              
              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                {authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                {authMode === 'login' ? "არ გაქვთ ანგარიში? დარეგისტრირდით" : "უკვე გაქვთ ანგარიში? შედით"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW MODAL */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-6">
            <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-6 h-6" />
            </button>
            <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full md:w-1/2 h-64 object-cover rounded-2xl" />
            <div className="flex-1 space-y-3">
              <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full">{quickViewProduct.category}</span>
              <h3 className="text-xl font-bold">{quickViewProduct.name}</h3>
              <p className="text-xs text-gray-500">{quickViewProduct.description}</p>
              <div className="text-2xl font-black">{quickViewProduct.price} ₾</div>
              <button 
                onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }} 
                className="w-full bg-black text-white py-3 rounded-2xl font-bold text-sm"
              >
                კალათაში დამატება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">კალათა ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">კალათა ცარიელია</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.price} ₾ x {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded-lg"><Minus className="w-3 h-3"/></button>
                      <span className="text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded-lg"><Plus className="w-3 h-3"/></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="კუპონი (GEO2026)" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value)} 
                    className="flex-1 bg-gray-100 border rounded-xl px-3 py-2 text-xs outline-none uppercase font-bold"
                  />
                  <button onClick={applyCoupon} className="bg-gray-200 px-3 py-2 rounded-xl text-xs font-bold">გამოყენება</button>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>ჯამი:</span>
                    <span>{subTotal} ₾</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-green-600 font-bold">
                      <span>ფასდაკლება ({discountPercent}%):</span>
                      <span>-{discountAmount} ₾</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-lg pt-2 border-t">
                    <span>საბოლოო:</span>
                    <span>{grandTotal} ₾</span>
                  </div>
                </div>

                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                  შეკვეთის გაფორმება
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold">შეკვეთის გაფორმება</h3>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი *" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონის ნომერი *" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              
              <div className="grid grid-cols-2 gap-2">
                <select value={orderForm.deliveryZone} onChange={e => setOrderForm({...orderForm, deliveryZone: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                  <option value="tbilisi">თბილისი (+5₾)</option>
                  <option value="region">რეგიონები (+10₾)</option>
                </select>
                <input type="text" required placeholder="მისამართი *" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              </div>

              <select value={orderForm.paymentMethod} onChange={e => setOrderForm({...orderForm, paymentMethod: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none font-medium">
                <option value="courier">💵 გადახდა კურიერთან (ნაღდი/ბარათი)</option>
              </select>

              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-bold text-sm">
                დადასტურება ({grandTotal} ₾)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">შეკვეთა მიღებულია!</h3>
            <p className="text-xs text-gray-500 mt-1">შეკვეთის N: #{orderSuccess.id}</p>
            <p className="text-gray-600 text-sm my-4">თქვენი შეკვეთა წარმატებით გაფორმდა. სტატუსის ნახვა შეგიძლიათ პირად კაბინეტში.</p>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-3 rounded-xl font-bold">
              მთავარ გვერდზე დაბრუნება
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t mt-12 py-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab("policy")} className="hover:underline">წესები და პოლიტიკა</button>
            <button onClick={() => setActiveTab("contact")} className="hover:underline">კონტაქტი</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
