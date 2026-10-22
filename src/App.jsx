import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, 
  ShieldCheck, Truck, RefreshCw, Lock, CheckCircle, 
  Package, CreditCard, BarChart3, Tag, Eye, Filter, X,
  TrendingUp, Users, AlertTriangle, FileText, ChevronRight
} from 'lucide-react';

// საწყისი პროდუქტების ბაზა
const INITIAL_PRODUCTS = [
  { 
    id: 1, 
    sku: "GEO-IPH-15P", 
    name: "Apple iPhone 15 Pro Max 256GB", 
    category: "ელექტრონიკა", 
    price: 4599, 
    oldPrice: 4899,
    costPrice: 4000,
    brand: "Apple",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", 
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი, ყველაზე ძლიერი კამერა. ოფიციალური გარანტია 1 წელი.", 
    stock: 12,
    isPopular: true
  },
  { 
    id: 2, 
    sku: "GEO-SHO-002", 
    name: "პრემიუმ ტყავის კეტები Urban", 
    category: "ტანსაცმელი და ფეხსაცმელი", 
    price: 280, 
    oldPrice: 350,
    costPrice: 150,
    brand: "UrbanStyle",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80", 
    description: "100% ნატურალური ტყავი, ორთოპედიული ძირი და მაღალი გამძლეობა.", 
    stock: 25,
    isPopular: true
  },
  { 
    id: 3, 
    sku: "GEO-EAR-ANC", 
    name: "უსადენო ყურსასმენი ANC Pro", 
    category: "ელექტრონიკა", 
    price: 350, 
    oldPrice: 420,
    costPrice: 200,
    brand: "SoundAudio",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", 
    description: "აქტიური ხმაურის ჩახშობა (ANC), 30 საათიანი ელემენტი.", 
    stock: 3, // დაბალი მარაგი
    isPopular: false
  },
  { 
    id: 4, 
    sku: "GEO-COF-ESP", 
    name: "მინიმალისტური ყავის აპარატი", 
    category: "სახლის ნივთები", 
    price: 620, 
    oldPrice: 700,
    costPrice: 450,
    brand: "HomeChef",
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80", 
    description: "მოამზადეთ იდეალური ესპრესო და კაპუჩინო სახლში.", 
    stock: 8,
    isPopular: true
  }
];

const CATEGORIES = ["ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები"];

export default function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState(5000);
  const [activeTab, setActiveTab] = useState("shop"); // shop, admin, policy
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  // შეკვეთების ისტორია
  const [orders, setOrders] = useState([
    { 
      id: "1001", 
      date: "2026-10-20", 
      items: [{ name: "iPhone 15 Pro Max", price: 4599, qty: 1 }], 
      total: 4599, 
      customer: { name: "გიორგი ბერიძე", phone: "+995 599 11 22 33", city: "თბილისი", address: "ჭავჭავაძის 15", deliveryZone: "tbilisi", paymentMethod: "courier" }, 
      status: "ჩაბარებული" 
    }
  ]);

  // ადმინ ავტორიზაცია
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  
  // ფორმის სტეიტები
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", image: "", description: "", stock: "" });
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", city: "თბილისი", address: "", deliveryZone: "tbilisi", paymentMethod: "courier", comment: "" });
  const [orderSuccess, setOrderSuccess] = useState(null);

  // ფილტრაცია
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = p.price <= maxPriceFilter;
    return matchesCat && matchesSearch && matchesPrice;
  });

  // კალათის ფუნქციები
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

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // კუპონის გამოყენება
  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "GEO2026") {
      setDiscountPercent(10); // 10% ფასდაკლება
      alert("კუპონი წარმატებით გააქტიურდა! (-10%)");
    } else {
      alert("არასწორი კუპონის კოდი! გამოიყენეთ: GEO2026");
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = (subTotal * discountPercent) / 100;
  const deliveryFee = orderForm.deliveryZone === "tbilisi" ? 5 : 10;
  const grandTotal = subTotal - discountAmount + (cart.length > 0 ? deliveryFee : 0);

  // შეკვეთის დადასტურება
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
      status: "ახალი"
    };

    // მარაგის შემცირება ავტომატურად
    setProducts(prevProducts => prevProducts.map(p => {
      const cartItem = cart.find(ci => ci.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      }
      return p;
    }));

    setOrders([newOrder, ...orders]);
    setOrderSuccess(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  // ადმინ სისტემა
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
      alert("გთხოვთ შეავსოთ სახელი, ფასი და ფოტოს URL!");
      return;
    }
    const productToAdd = {
      id: Date.now(),
      sku: newProd.sku || `GEO-${Math.floor(Math.random() * 1000)}`,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      costPrice: Number(newProd.costPrice) || Number(newProd.price) * 0.7,
      image: newProd.image,
      description: newProd.description || "აღწერა არ არის",
      stock: Number(newProd.stock) || 10,
      isPopular: false
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ sku: "", name: "", category: "ელექტრონიკა", price: "", costPrice: "", image: "", description: "", stock: "" });
    alert("პროდუქტი წარმატებით დაემატა კატალოგში!");
  };

  const deleteProduct = (id) => {
    if (confirm("ნამდვილად გსურთ პროდუქტის წაშლა?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // ადმინის ანალიტიკა
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const lowStockProducts = products.filter(p => p.stock < 5);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      
      {/* ზედა შეტყობინების ზოლი */}
      <div className="bg-black text-white text-xs py-2 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto w-full">
        <span>✨ უფასო მიწოდება 100₾-ის ზემოთ | კუპონი: <strong>GEO2026</strong></span>
        <span className="hidden sm:inline">📞 მხარდაჭერა: *1234</span>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => setActiveTab("shop")} className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-black text-white px-3 py-1 rounded-xl">GEO</span>
            <span>STORE</span>
          </button>

          {/* საძიებო ზოლი */}
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
            <button 
              onClick={() => setActiveTab("admin")} 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ადმინ პანელი</span>
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* 🟢 ADMIN DASHBOARD TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">ადმინისტრაციის შესვლა</h2>
                  <p className="text-gray-500 text-sm mt-1">შეიყვანეთ პინ-კოდი: 1234</p>
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
                  <div>
                    <h2 className="text-3xl font-black">ადმინ პანელი & ანალიტიკა</h2>
                    <p className="text-xs text-gray-500 mt-0.5">მართეთ მაღაზიის ყველა მაჩვენებელი რეალურ დროში</p>
                  </div>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100">გასვლა</button>
                </div>

                {/* KPI ანალიტიკის ბლოკები */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">სულ შემოსავალი</p>
                      <h4 className="text-2xl font-black mt-1">{totalRevenue} ₾</h4>
                    </div>
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">სულ შეკვეთები</p>
                      <h4 className="text-2xl font-black mt-1">{totalOrders}</h4>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">პროდუქტები კატალოგში</p>
                      <h4 className="text-2xl font-black mt-1">{products.length}</h4>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                      <Tag className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">დაბალი მარაგი (&lt;5)</p>
                      <h4 className="text-2xl font-black text-red-600 mt-1">{lowStockProducts.length}</h4>
                    </div>
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* შეკვეთების სია */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" /> შემოსული შეკვეთები
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">შეკვეთები ჯერ არ არის.</p>
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
                            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ახალი პროდუქტის დამატება */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                  <h3 className="text-lg font-bold">+ პროდუქტის დამატება კატალოგში</h3>
                  <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="SKU კოდი (მაგ: GEO-101)" value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="text" placeholder="პროდუქტის დასახელება" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                      {CATEGORIES.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="გასაყიდი ფასი (₾)" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="number" placeholder="თვითღირებულება (₾)" value={newProd.costPrice} onChange={e => setNewProd({...newProd, costPrice: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="number" placeholder="მარაგის რაოდენობა" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="text" placeholder="ფოტოს ბმული (URL)" value={newProd.image} onChange={e => setNewProd({...newProd, image: e.target.value})} className="sm:col-span-2 bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <button type="submit" className="bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-zinc-800">დამატება</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🟢 MAING SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="space-y-8">
            
            {/* HERO BANNER */}
            <div className="bg-black text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-xl">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">ონლაინ მაღაზია 2026</span>
                <h1 className="text-3xl md:text-5xl font-black mt-4 leading-tight">საუკეთესო პროდუქცია საქართველოში</h1>
                <p className="text-gray-300 text-sm mt-3">მიიღეთ შეკვეთა კურიერისგან მთელი საქართველოს მასშტაბით 24-48 საათში.</p>
              </div>
            </div>

            {/* CATEGORIES & FILTERS */}
            <div className="space-y-4">
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
            </div>

            {/* PRODUCT CATALOG GRID */}
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
                      <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        SKU: {product.sku}
                      </span>
                    </div>

                    <div className="p-5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{product.category}</span>
                      <h3 className="font-bold text-base mt-1 text-gray-900 group-hover:text-indigo-600 transition">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black text-gray-900">{product.price} ₾</span>
                      {product.oldPrice && <span className="text-xs text-gray-400 line-through ml-2">{product.oldPrice} ₾</span>}
                    </div>

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
              <p className="text-xs text-gray-600">მარაგი: {quickViewProduct.stock} ცალი</p>
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
              <h3 className="font-bold text-lg">თქვენი კალათა ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
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
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-2"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-3">
                {/* კუპონის შეყვანა */}
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
                <input type="text" required placeholder="მისამართი *" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              </div>

              <select value={orderForm.paymentMethod} onChange={e => setOrderForm({...orderForm, paymentMethod: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none font-medium">
                <option value="courier">💵 გადახდა კურიერთან (ნაღდი/ბარათი)</option>
                <option value="online">💳 ონლაინ გადახდა ბარათით (BOG / TBC)</option>
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
            <p className="text-gray-600 text-sm my-4">ჩვენი ოპერატორი მალე დაგიკავშირდებათ ნომერზე: {orderSuccess.customer.phone}</p>
            <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-3 rounded-xl font-bold">
              დახურვა
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t mt-12 py-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 GEOSTORE. ყველა უფლება დაცულია.</p>
          <div className="flex gap-4">
            <span>მიწოდების პოლიტიკა</span>
            <span>კონფიდენციალურობა</span>
            <span>წესები და პირობები</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
