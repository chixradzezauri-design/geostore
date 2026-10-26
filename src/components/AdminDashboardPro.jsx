// src/components/AdminDashboardPro.jsx - GEOSTORE პროფესიონალური ადმინ პანელი (ეტაპი 1)
import React, { useState } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Package
} from 'lucide-react';

export default function AdminDashboardPro({
  adminLoggedIn,
  setAdminLoggedIn,
  adminLoginForm,
  setAdminLoginForm,
  handleAdminLogin,
  adminError,
  proAnalytics,
  orders,
  usersList,
  products,
  setProducts,
  vendorsList,
  categories,
  siteSettings,
  setSiteSettings,
  formatPrice
}) {
  const [adminTab, setAdminTab] = useState('analytics'); // analytics, orders, products, users, vendors
  
  // პროდუქტის დამატების / რედაქტირების State
  const [productForm, setProductForm] = useState({
    name: '', category: 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', image: '', description: ''
  });

  if (!adminLoggedIn) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl text-center my-10">
        <Shield className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
        <h2 className="text-lg font-black text-white">ადმინისტრატორის შესვლა</h2>
        <p className="text-[11px] text-slate-400">GEOSTORE მართვის სისტემა (admin / admin123)</p>
        <form onSubmit={handleAdminLogin} className="space-y-3 text-xs">
          <input 
            type="text" 
            placeholder="მომხმარებელი" 
            value={adminLoginForm.username} 
            onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500" 
          />
          <input 
            type="password" 
            placeholder="პაროლი" 
            value={adminLoginForm.password} 
            onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500" 
          />
          <div className="flex items-center gap-2 text-left">
            <input 
              type="checkbox" 
              id="remMe" 
              checked={adminLoginForm.remember} 
              onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
              className="rounded accent-emerald-500 cursor-pointer" 
            />
            <label htmlFor="remMe" className="cursor-pointer text-[11px] text-slate-300">მომიმახსოვრე სისტემაში</label>
          </div>
          {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
          <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl shadow hover:bg-emerald-400 transition">
            ადმინ პანელში შესვლა
          </button>
        </form>
      </div>
    );
  }

  const handleDeleteProduct = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.priceGEL) return;

    const newProd = {
      id: `prod-${Date.now()}`,
      sku: `GEO-${Math.floor(1000 + Math.random() * 9000)}`,
      ...productForm,
      priceGEL: Number(productForm.priceGEL),
      stock: Number(productForm.stock) || 1
    };
    setProducts(prev => [newProd, ...prev]);
    setProductForm({ name: '', category: 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', image: '', description: '' });
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 rounded-3xl p-5 gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">GEOSTORE პროფესიონალური ადმინ პანელი</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">სრული კონტროლი: ფინანსები, შეკვეთები, პროდუქტები, მომხმარებლები</p>
          </div>
        </div>
        <button 
          onClick={() => { setAdminLoggedIn(false); localStorage.removeItem('geostore_admin_remember'); }} 
          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" /> გამოსვლა
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          { id: 'analytics', label: '📊 ანალიტიკა' },
          { id: 'orders', label: '📦 შეკვეთები', count: orders?.length || 0 },
          { id: 'products', label: '🏷️ პროდუქტები', count: products?.length || 0 },
          { id: 'users', label: '👥 მომხმარებლები', count: usersList?.length || 0 },
          { id: 'vendors', label: '🏪 ვენდორები', count: vendorsList?.length || 0 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-2 ${
              adminTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${adminTab === tab.id ? 'bg-slate-950 text-emerald-400 font-black' : 'bg-slate-800 text-slate-300'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {adminTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-400" /> სრული შემოსავალი</p>
            <p className="text-2xl font-black text-emerald-400">{formatPrice(proAnalytics.totalRevenueGEL)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-teal-400" /> სავარაუდო წმინდა მოგება</p>
            <p className="text-2xl font-black text-teal-400">{formatPrice(proAnalytics.netProfitGEL)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><PackageCheck className="w-4 h-4 text-blue-400" /> სულ შეკვეთები</p>
            <p className="text-2xl font-black text-blue-400">{proAnalytics.totalOrdersCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><Bell className="w-4 h-4 text-amber-400" /> დაბალი მარაგი (≤ 3)</p>
            <p className="text-2xl font-black text-amber-400">{proAnalytics.lowStockProducts?.length || 0} პროდუქტი</p>
          </div>
        </div>
      )}

      {adminTab === 'orders' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="font-black text-white text-sm flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" /> Supabase შეკვეთების სრული მართვა
          </h3>
          <div className="space-y-3">
            {(!orders || orders.length === 0) ? (
              <p className="text-slate-500 text-xs py-4 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-sm">#{o.id}</span>
                      <span className="text-slate-500 text-[10px]">({o.date})</span>
                    </div>
                    <p className="text-slate-200">მყიდველი: <b className="text-white">{o.customerName}</b> | 📞 {o.phone}</p>
                    <p className="text-slate-400 text-[11px]">📍 მისამართი: {o.address}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl font-bold text-[11px]">
                      {o.status || 'ახალი'}
                    </span>
                    <span className="font-black text-white text-base">{formatPrice(o.totalGEL)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adminTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> ახალი პროდუქტის დამატება
            </h3>
            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <input type="text" placeholder="პროდუქტის დასახელება *" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="number" placeholder="ფასი GEL *" required value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="number" placeholder="მარაგი (რაოდენობა)" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="text" placeholder="სურათის URL" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <button type="submit" className="bg-emerald-500 text-slate-950 font-black p-3 rounded-xl shadow hover:bg-emerald-400 transition col-span-1 sm:col-span-2">პროდუქტის დამატება</button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm">არსებული პროდუქტები ({products?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products?.map(p => (
                <div key={p.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="w-12 h-12 object-contain bg-slate-900 p-1 rounded-xl border border-slate-800" />
                    <div>
                      <h4 className="font-bold text-white line-clamp-1">{p.name}</h4>
                      <p className="text-emerald-400 font-black mt-0.5">{formatPrice(p.priceGEL)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-rose-400 hover:text-rose-300 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="font-black text-white text-sm flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400" /> რეგისტრირებული მომხმარებლები ({usersList?.length || 0})</h3>
          <div className="space-y-2">
            {(!usersList || usersList.length === 0) ? (
              <p className="text-slate-500 text-xs py-4 text-center">მომხმარებლები ჯერ არ არიან რეგისტრირებული.</p>
            ) : (
              usersList.map((u, i) => (
                <div key={u.id || i} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-white">{u.name}</h4>
                    <p className="text-slate-400 text-[11px]">{u.email} | 📞 {u.phone}</p>
                  </div>
                  <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-xl text-[10px] font-bold">მომხმარებელი</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adminTab === 'vendors' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="font-black text-white text-sm flex items-center gap-2"><Store className="w-5 h-5 text-emerald-400" /> მარკეტფლეისის ვენდორები</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendorsList?.map(v => (
              <div key={v.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-white">{v.name}</h4>
                  <p className="text-slate-400 text-[11px]">კომისია: {v.commission}%</p>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] font-bold">{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
