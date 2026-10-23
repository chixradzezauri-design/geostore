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
      rating:
