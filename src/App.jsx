import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, Lock, CheckCircle, 
  Package, Tag, Eye, X, TrendingUp, User, LogOut, Phone, Mail, 
  MapPin, Clock, Edit2, MessageSquare, Send, Users, ShieldAlert, FileText, Check, Download, Star, Heart
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
    stock: 12,
    rating: 4.9
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
    stock: 25,
    rating: 4.7
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
    stock: 3,
    rating: 4.5
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

  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('geostore_users_list');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "გიორგი ბერიძე", email: "giorgi@gmail.com", phone: "+995 599 11 22 33", date: "2026-10-15" }
    ];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('geostore_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('geostore_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [policyText, setPolicyText] = useState(() => {
    const saved = localStorage.getItem('geostore_policy_text');
    return saved || "მიწოდება ხორციელდება თბილისში 24 საათში (5₾), ხოლო რეგიონებში 48 საათში (10₾). 100₾-ზე მეტი შეკვეთისას მიწოდება უფასოა. ნივთის დაბრუნება შესაძლებელია 14 კალენდარული დღის განმავლობაში.";
  });

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop"); 
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [userChatMessage, setUserChatMessage] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSubTab, setAdminSubTab] = useState("orders");
  
  const [newProd, setNewProd] = useState({ sku: "", name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", city: "თბილისი", address: "", deliveryZone: "tbilisi", paymentMethod: "courier" });
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => { localStorage.setItem('geostore_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('geostore_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('geostore_users_list', JSON.stringify(usersList)); }, [usersList]);
  useEffect(() => { localStorage.setItem('geostore_current_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('geostore_chat_messages', JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem('geostore_policy_text', policyText); }, [policyText]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || (authMode === 'register' && !authForm.name)) {
      alert("გთხოვთ შეავსოთ ყველა ველი!");
      return;
    }
    const userData = {
      id: Date.now(),
      name: authMode === 'register' ? authForm.name : authForm.email.split('@')[0],
      phone: authForm.phone || "+995 500 00 00 00",
      email: authForm.email,
      date: new Date().toISOString().split('T')[0]
    };
    if (authMode === 'register') {
      setUsersList([...usersList, userData]);
    }
    setCurrentUser(userData);
    setIsAuthOpen(false);
    setAuthForm({ name: "", phone: "", email: "", password: "" });
    alert(authMode === 'register' ? "რეგისტრაცია წარმატებით დასრულდა!" : "წარმატებით გაიარეთ ავტორიზაცია!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("shop");
  };

  const deleteUserAccount = (userId) => {
    if (confirm("ნამდვილად გსურთ ამ მომხმარებლის ანგარიშის გაუქმება?")) {
      setUsersList(usersList.filter(u => u.id !== userId));
      alert("მომხმარებლის ანგარიში გაუქმებულია!");
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!userChatMessage.trim()) return;

    const senderName = currentUser ? currentUser.name : (orderForm.name || "სტუმარი");
    const senderPhone = currentUser ? currentUser.phone : (orderForm.phone || "არ არის მითითებული");

    const newMsg = {
      id: Date.now(),
      sender: senderName,
      phone: senderPhone,
      text: userChatMessage,
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAutoReply: false
    };

    const autoReplyMsg = {
      id: Date.now() + 1,
      sender: "GEOSTORE ოპერატორი",
      text: "გამარჯობა! გმადლობთ დაკავშირებისთვის. ჩვენი ოპერატორი უახლოეს წუთებში უპასუხებს თქვენს შეტყობინებას.",
      time: new Date().toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }),
      isAutoReply: true
    };

    setChatMessages(prev => [...prev, newMsg, autoReplyMsg]);
    setUserChatMessage("");
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      setWishlist(wishlist.filter(item => item.id !== product.id));
    } else {
      setWishlist([...wishlist, product]);
    }
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
      status: "ახალი"
    };

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

  const exportOrdersToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Customer,Phone,Total,Status\n";
    orders.forEach(o => {
      csvContent += `${o.id},${o.date},"${o.customer.name}",${o.customer.phone},${o.total},${o.status}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geostore_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      stock: Number(newProd.stock) || 10,
      rating: 5.0
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ sku: "", name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
    alert("პროდუქტი წარმატებით დაემატა!");
  };

  const handleSaveEditedProduct = (e) => {
    e.preventDefault();
    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
    setEditingProduct(null);
    alert("პროდუქტის მონაცემები წარმატებით განახლდა!");
  };

  const deleteProduct = (id) => {
    if (confirm("ნამდვილად გსურთ პროდუქტის წაშლა?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const myOrders = currentUser ? orders.filter(o => o.userEmail === currentUser.email || o.customer.phone === currentUser.phone) : [];
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

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
                <span>შესვლა</span>
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

        {/* PROFILE TAB */}
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
                <Package className="w-5 h-5 text-indigo-600" /> ჩემი შეკვეთები ({myOrders.length})
              </h3>
              {myOrders.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">თქვენ ჯერ არ გაქვთ გაფორმებული შეკვეთები.</p>
              ) : (
                <div className="space-y-4">
                  {myOrders.map(o => (
                    <div key={o.id} className="border rounded-2xl p-5 bg-gray-50 space-y-3">
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <span className="font-black text-base">შეკვეთა #{o.id}</span>
                          <span className="text-xs text-gray-500 ml-2">({o.date})</span>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          o.status === 'ახალი' ? 'bg-blue-100 text-blue-700' :
                          o.status === 'დამუშავებაშია' ? 'bg-yellow-100 text-yellow-700' :
                          o.status === 'ჩაბარებული' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">პროდუქტები: {o.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</p>
                      <div className="flex justify-between items-center pt-2 border-t font-black">
                        <span>სულ:</span>
                        <span>{o.total} ₾</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* POLICY TAB */}
        {activeTab === 'policy' && (
          <div className="bg-white rounded-3xl p-8 border max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-black">წესები, პირობები და დაბრუნების პოლიტიკა</h2>
            <div className="p-4 bg-gray-50 rounded-2xl border text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {policyText}
            </div>
            <button onClick={() => setActiveTab("shop")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">მაღაზიაში დაბრუნება</button>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-3xl p-8 border max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-black">საკონტაქტო ინფორმაცია</h2>
            <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500"/> +995 32 2 00 00 00</p>
            <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500"/> info@geostore.ge</p>
            <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/> თბილისი, რუსთაველის გამზირი #1</p>
          </div>
        )}

        {/* ADMIN TAB */}
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
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-3xl font-black">ადმინისტრაციული პანელი</h2>
                  <div className="flex gap-2">
                    <button onClick={exportOrdersToCSV} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> CSV ექსპორტი
                    </button>
                    <button onClick={() => setIsAdminLoggedIn(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">გასვლა</button>
                  </div>
                </div>

                {/* ADMIN SUB NAVIGATION */}
                <div className="flex gap-2 border-b pb-3 overflow-x-auto">
                  <button onClick={() => setAdminSubTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    შეკვეთები ({orders.length})
                  </button>
                  <button onClick={() => setAdminSubTab('products')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    პროდუქტები & რედაქტირება ({products.length})
                  </button>
                  <button onClick={() => setAdminSubTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'users' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    მომხმარებლები ({usersList.length})
                  </button>
                  <button onClick={() => setAdminSubTab('chat')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'chat' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    ონლაინ ჩათი / შეტყობინებები ({chatMessages.length})
                  </button>
                  <button onClick={() => setAdminSubTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSubTab === 'settings' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    წესები და პირობები
                  </button>
                </div>

                {/* 1. ORDERS TAB */}
                {adminSubTab === 'orders' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შეკვეთების მართვა</h3>
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
                  </div>
                )}

                {/* 2. PRODUCTS & EDIT TAB */}
                {adminSubTab === 'products' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">+ ახალი პროდუქტის დამატება</h3>
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

                    <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                      <h3 className="text-lg font-bold">პროდუქტების რედაქტირება და ფასების შეცვლა</h3>
                      <div className="space-y-3">
                        {products.map(p => (
                          <div key={p.id} className="border p-4 rounded-2xl bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-xl" />
                              <div>
                                <h4 className="font-bold text-sm">{p.name}</h4>
                                <p className="text-xs text-gray-500">SKU: {p.sku} | კატეგორია: {p.category}</p>
                                <p className="text-sm font-black text-indigo-600 mt-0.5">{p.price} ₾ (მარაგი: {p.stock})</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingProduct(p)} className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                                <Edit2 className="w-3.5 h-3.5" /> რედაქტირება
                              </button>
                              <button onClick={() => deleteProduct(p.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                                წაშლა
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. USERS MANAGEMENT TAB */}
                {adminSubTab === 'users' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">დარეგისტრირებული მომხმარებლები ({usersList.length})</h3>
                    <div className="space-y-3">
                      {usersList.map(u => (
                        <div key={u.id} className="border rounded-2xl p-4 bg-gray-50 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm">{u.name}</h4>
                            <p className="text-xs text-gray-500">📧 {u.email} | 📞 {u.phone}</p>
                            <p className="text-[10px] text-gray-400 mt-1">რეგისტრაციის თარიღი: {u.date}</p>
                          </div>
                          <button onClick={() => deleteUserAccount(u.id)} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-200">
                            ექაუნთის გაუქმება
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. LIVE CHAT / MESSAGES TAB */}
                {adminSubTab === 'chat' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">შემოსული შეტყობინებები და ონლაინ ჩათი</h3>
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">შეტყობინებები ჯერ არ არის.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {chatMessages.map(m => (
                          <div key={m.id} className={`p-4 rounded-2xl border ${m.isAutoReply ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50'}`}>
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                              <span>{m.sender} ({m.phone})</span>
                              <span>{m.time}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-800">{m.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SETTINGS / POLICY EDIT TAB */}
                {adminSubTab === 'settings' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
                    <h3 className="text-xl font-bold">წესებისა და პირობების რედაქტირება</h3>
                    <textarea 
                      rows={6}
                      value={policyText} 
                      onChange={e => setPolicyText(e.target.value)} 
                      className="w-full bg-gray-100 border rounded-2xl p-4 text-sm outline-none"
                    />
                    <button onClick={() => alert("წესები და პირობები წარმატებით განახლდა!")} className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold">
                      შენახვა
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* SHOP TAB */}
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
                        onClick={() => toggleWishlist(product)} 
                        className={`absolute top-3 left-3 p-2 rounded-full backdrop-blur-md shadow ${wishlist.some(w => w.id === product.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'}`}
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setQuickViewProduct(product)} 
                        className="absolute top-3 right-3 bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-700 hover:bg-white shadow"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                        <span>{product.category}</span>
                        <span className="flex items-center text-amber-500 gap-0.5"><Star className="w-3 h-3 fill-amber-500"/> {product.rating}</span>
                      </div>
                      <h3 className="font-bold text-base mt-1 text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>
                  
