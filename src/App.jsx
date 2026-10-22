import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, 
  ShieldCheck, Truck, RefreshCw, Lock, CheckCircle, 
  Package, CreditCard
} from 'lucide-react';

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Apple iPhone 15 Pro Max 256GB",
    category: "ელექტრონიკა",
    price: 4599,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი, ყველაზე ძლიერი კამერა აიფონის ისტორიაში. გარანტია 1 წელი.",
    stock: 12
  },
  {
    id: 2,
    name: "პრემიუმ ტყავის კეტები",
    category: "ტანსაცმელი და ფეხსაცმელი",
    price: 280,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80",
    description: "100% ნატურალური ტყავი, კომფორტული ძირი და თანამედროვე დიზაინი ყოველდღიურობისთვის.",
    stock: 25
  },
  {
    id: 3,
    name: "უსადენო ყურსასმენი ANC Pro",
    category: "ელექტრონიკა",
    price: 350,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    description: "აქტიური ხმაურის ჩახშობა (ANC), 30 საათიანი მუშაობა ერთჯერადი დატენვით.",
    stock: 8
  },
  {
    id: 4,
    name: "მინიმალისტური ყავის აპარატი",
    category: "სახლის ნივთები",
    price: 620,
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    description: "მოამზადეთ იდეალური ესპრესო და კაპუჩინო სახლის პირობებში მარტივად.",
    stock: 5
  },
  {
    id: 5,
    name: "ორგანული სახის მოვლის ნაკრები",
    category: "სილამაზე და მოვლა",
    price: 145,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    description: "ბუნებრივი ინგრედიენტები ყველა ტიპის კანისთვის. ღრმა დატენიანება და კვება.",
    stock: 19
  },
  {
    id: 6,
    name: "სპორტული ზურგჩანთა Urban",
    category: "აქსესუარები",
    price: 110,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    description: "წყალგაუმტარი მასალა, ლეპტოპის ცალკე განყოფილება და ergonomic დიზაინი.",
    stock: 30
  }
];

const CATEGORIES = ["ყველა", "ელექტრონიკა", "ტანსაცმელი და ფეხსაცმელი", "სახლის ნივთები", "სილამაზე და მოვლა", "აქსესუარები", "სპორტი", "სხვა პროდუქტები"];

export default function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ყველა");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("shop"); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [newProd, setNewProd] = useState({ name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", city: "", address: "", paymentMethod: "courier" });
  const [orderSuccess, setOrderSuccess] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === "ყველა" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
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

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingCost = totalPrice > 100 || totalPrice === 0 ? 0 : 10;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!orderForm.name || !orderForm.phone || !orderForm.city || !orderForm.address) {
      alert("გთხოვთ შეავსოთ ყველა ველი!");
      return;
    }
    const newOrder = {
      id: Date.now().toString().slice(-6),
      date: new Date().toLocaleString('ka-GE'),
      items: [...cart],
      total: totalPrice + shippingCost,
      customer: { ...orderForm },
      status: "ახალი"
    };
    setOrders([newOrder, ...orders]);
    setCart([]);
    setIsCheckoutOpen(false);
    setOrderSuccess(true);
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
      alert("გთხოვთ შეავსოთ ძირითადი ველები!");
      return;
    }
    const productToAdd = {
      id: Date.now(),
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      image: newProd.image,
      description: newProd.description || "აღწერა არ არის",
      stock: Number(newProd.stock) || 10
    };
    setProducts([productToAdd, ...products]);
    setNewProd({ name: "", category: "ელექტრონიკა", price: "", image: "", description: "", stock: "" });
    alert("პროდუქტი წარმატებით დაემატა!");
  };

  const deleteProduct = (id) => {
    if (confirm("ნამდვილად გსურთ პროდუქტის წაშლა?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      <div className="bg-black text-white text-xs py-2 px-4 text-center font-medium">
        ✨ უფასო მიწოდება 100₾-ის ზემოთ საქართველოს მასშტაბით | ცხელი ხაზი: *1234
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <button onClick={() => { setActiveTab("shop"); setSelectedProduct(null); }} className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <span className="bg-black text-white px-3 py-1 rounded-lg">GEO</span>
            <span>STORE</span>
          </button>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="მოძებნე პროდუქტი..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveTab("shop"); setSelectedProduct(null); }}
              className="w-full bg-gray-100 border border-transparent focus:border-black rounded-full pl-10 pr-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab("admin")} 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold ${activeTab === 'admin' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ადმინ პანელი</span>
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-4 py-2.5 rounded-full flex items-center gap-2 hover:bg-zinc-800 text-sm font-medium"
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {orderSuccess && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">შეკვეთა მიღებულია!</h3>
              <p className="text-gray-600 text-sm mb-6">ჩვენი მენეჯერი უახლოეს დროში დაგიკავშირდებათ.</p>
              <button onClick={() => setOrderSuccess(false)} className="w-full bg-black text-white py-3 rounded-xl font-semibold">
                მთავარ გვერდზე დაბრუნება
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-8">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border mt-10">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">ადმინისტრაციის შესვლა</h2>
                  <p className="text-gray-500 text-sm mt-1">შეიყვანეთ პინ-კოდი: 1234</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input 
                    type="password" placeholder="პინ-კოდი (1234)" 
                    value={adminPin} onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full bg-gray-100 border rounded-xl px-4 py-3 text-center text-lg outline-none"
                  />
                  {adminError && <p className="text-red-500 text-xs text-center">{adminError}</p>}
                  <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold">შესვლა</button>
                </form>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-3xl font-black">ადმინისტრაციული პანელი</h2>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="text-red-600 text-sm font-semibold">გასვლა</button>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" /> შეკვეთები ({orders.length})
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4 text-center">შეკვეთები ჯერ არ არის.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(order => (
                        <div key={order.id} className="border rounded-2xl p-4 bg-gray-50 flex justify-between items-center">
                          <div>
                            <span className="font-bold">შეკვეთა #{order.id}</span>
                            <p className="text-xs text-gray-600">{order.customer.name} ({order.customer.phone}) - {order.customer.city}, {order.customer.address}</p>
                          </div>
                          <span className="text-lg font-black">{order.total} ₾</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border">
                  <h3 className="text-lg font-bold mb-4">+ ახალი პროდუქტის დამატება</h3>
                  <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="პროდუქტის დასახელება" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none">
                      {CATEGORIES.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="ფასი (₾)" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <input type="text" placeholder="ფოტოს ბმული (URL)" value={newProd.image} onChange={e => setNewProd({...newProd, image: e.target.value})} className="bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
                    <button type="submit" className="sm:col-span-2 bg-black text-white py-3 rounded-xl font-semibold text-sm">დამატება კატალოგში</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-8">
            <div className="bg-black text-white rounded-3xl p-8 md:p-12">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">ახალი კოლექცია 2026</span>
              <h1 className="text-3xl md:text-5xl font-black mt-4">აღმოაჩინე პრემიუმ ხარისხი საქართველოში</h1>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-gray-700 border'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-3xl border overflow-hidden flex flex-col justify-between">
                  <div>
                    <img src={product.image} alt={product.name} className="w-full h-60 object-cover" />
                    <div className="p-5">
                      <h3 className="font-bold text-base">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                    </div>
                  </div>
                  <div className="p-5 pt-0 flex items-center justify-between">
                    <span className="text-xl font-black">{product.price} ₾</span>
                    <button onClick={() => addToCart(product)} className="bg-black text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> კალათაში
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">კალათა ({cart.length})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.price} ₾ x {item.qty}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-xs font-bold">წაშლა</button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex justify-between font-black text-lg mb-4">
                  <span>სულ:</span>
                  <span>{totalPrice + shippingCost} ₾</span>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-black text-white py-3 rounded-2xl font-bold">
                  შეკვეთის გაფორმება
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold">შეკვეთის გაფორმება</h3>
            <form onSubmit={handleCheckoutSubmit} className="space-y-3">
              <input type="text" required placeholder="სახელი და გვარი" value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="tel" required placeholder="ტელეფონის ნომერი" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="text" required placeholder="ქალაქი" value={orderForm.city} onChange={e => setOrderForm({...orderForm, city: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <input type="text" required placeholder="მისამართი" value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} className="w-full bg-gray-100 border rounded-xl p-3 text-sm outline-none" />
              <button type="submit" className="w-full bg-black text-white py-3 rounded-2xl font-bold">დადასტურება ({totalPrice + shippingCost} ₾)</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
