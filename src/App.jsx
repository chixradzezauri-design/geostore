import React, { useState } from 'react';
import { ShoppingBag, Search, Lock, CheckCircle, Trash2, Truck, ShieldCheck, RefreshCw } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState([
    { id: 1, name: "Apple iPhone 15 Pro", category: "ელექტრონიკა", price: 4599, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80", description: "ტიტანის კორპუსი, A17 Pro ჩიპი.", stock: 12 },
    { id: 2, name: "პრემიუმ ტყავის კეტები", category: "ტანსაცმელი", price: 280, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80", description: "100% ნატურალური ტყავი.", stock: 25 }
  ]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("shop");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [orderDone, setOrderDone] = useState(false);

  const addToCart = (p) => {
    setCart([...cart, { ...p, qty: 1 }]);
    alert("პროდუქტი დაემატა კალათაში!");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 max-w-4xl mx-auto">
      <header className="flex justify-between items-center py-4 border-b mb-6">
        <h1 className="text-2xl font-black bg-black text-white px-3 py-1 rounded-lg">GEOSTORE</h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("admin")} className="bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" /> ადმინ პანელი
          </button>
          <button onClick={() => alert(`კალათაშია: ${cart.length} პროდუქტი`)} className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" /> კალათა ({cart.length})
          </button>
        </div>
      </header>

      {activeTab === 'admin' ? (
        <div className="bg-white p-6 rounded-2xl shadow border">
          <h2 className="text-xl font-bold mb-4">ადმინ პანელი</h2>
          {!isAdmin ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">შეიყვანეთ პინ-კოდი: 1234</p>
              <input type="password" placeholder="პინ-კოდი" value={pin} onChange={e => setPin(e.target.value)} className="border p-2 rounded w-full" />
              <button onClick={() => pin === "1234" ? setIsAdminLoggedIn(true) || setIsAdmin(true) : alert("არასწორი კოდი!")} className="bg-black text-white w-full py-2 rounded">შესვლა</button>
            </div>
          ) : (
            <div>
              <p className="text-green-600 font-bold mb-4">✅ წარმატებით შეხვედით ადმინისტრატორის პანელში!</p>
              <button onClick={() => setActiveTab("shop")} className="bg-gray-800 text-white px-4 py-2 rounded text-xs">მაღაზიაში დაბრუნება</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-black text-white p-8 rounded-3xl mb-8">
            <h2 className="text-3xl font-black mb-2">ონლაინ მაღაზია საქართველოში</h2>
            <p className="text-sm text-gray-300">საუკეთესო პროდუქცია და სწრაფი მიწოდება.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <img src={p.image} alt={p.name} className="w-full h-48 object-cover rounded-xl mb-3" />
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-black text-lg">{p.price} ₾</span>
                  <button onClick={() => addToCart(p)} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold">კალათაში</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
