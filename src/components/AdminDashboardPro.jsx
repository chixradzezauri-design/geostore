// src/components/AdminDashboardPro.jsx
import React, { useState } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, Package, RefreshCcw, FileText, Download, ShieldAlert, Plus, Edit, Trash2, Tag, Layers
} from 'lucide-react';

export default function AdminDashboardPro({
  proAnalytics,
  crmAnalytics,
  returnsList,
  orders,
  setReturnsList,
  setUsersList,
  exportOrdersCSV,
  handleManualRefresh,
  products,
  setProducts,
  categories,
  setCategories,
  vendorsList,
  setVendorsList,
  coupons,
  setCoupons,
  setEditingProductId,
  setEditProductForm,
  showToast
}) {
  const [activeSubSection, setActiveSubSection] = useState('overview');
  
  // New Product Form State
  const [newProd, setNewProd] = useState({
    name: '', sku: '', category: categories[0]?.name || 'სმარტფონები', brand: 'Apple',
    vendor: vendorsList[0]?.name || 'GEOSTORE', priceGEL: 1000, oldPriceGEL: 1200,
    discountPercent: 10, stock: 10, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    description: 'ახალი პროდუქტის აღწერა...', warranty: '1 წელი', isPreOrder: false
  });

  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `p-${Date.now()}`,
      ...newProd,
      priceGEL: Number(newProd.priceGEL),
      oldPriceGEL: Number(newProd.oldPriceGEL),
      discountPercent: Number(newProd.discountPercent),
      stock: Number(newProd.stock),
      images: [newProd.image]
    };
    setProducts([created, ...products]);
    showToast('✅ პროდუქტი წარმატებით დაემატა!');
    setNewProd({
      name: '', sku: '', category: categories[0]?.name || 'სმარტფონები', brand: 'Apple',
      vendor: vendorsList[0]?.name || 'GEOSTORE', priceGEL: 1000, oldPriceGEL: 1200,
      discountPercent: 10, stock: 10, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      description: 'ახალი პროდუქტის აღწერა...', warranty: '1 წელი', isPreOrder: false
    });
  };

  return (
    <div className="space-y-6 w-full text-xs">
      {/* 🧭 ADMIN SUB-NAVIGATION */}
      <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 overflow-x-auto">
        <button onClick={() => setActiveSubSection('overview')} className={`px-3 py-1.5 rounded-lg font-bold transition ${activeSubSection === 'overview' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>📊 მიმოხილვა</button>
        <button onClick={() => setActiveSubSection('products')} className={`px-3 py-1.5 rounded-lg font-bold transition ${activeSubSection === 'products' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>📦 პროდუქტების მართვა</button>
        <button onClick={() => setActiveSubSection('orders')} className={`px-3 py-1.5 rounded-lg font-bold transition ${activeSubSection === 'orders' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>🛒 შეკვეთები</button>
        <button onClick={() => setActiveSubSection('crm')} className={`px-3 py-1.5 rounded-lg font-bold transition ${activeSubSection === 'crm' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>👥 CRM & მომხმარებლები</button>
      </div>

      {activeSubSection === 'overview' && (
        <>
          {/* 📊 ANALYTICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>მთლიანი შემოსავალი</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">{proAnalytics.totalRevenueGEL.toLocaleString()} ₾</div>
              <p className="text-[10px] text-slate-500">წმინდა მოგება: ~{proAnalytics.netProfitGEL.toLocaleString()} ₾</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>შეკვეთები</span>
                <ShoppingCart className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xl font-black text-white">{proAnalytics.totalOrdersCount}</div>
              <p className="text-[10px] text-slate-500">ჩაბარებული: {proAnalytics.completedOrdersCount}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>საშუალო შეკვეთა</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white">{proAnalytics.avgOrderValue} ₾</div>
              <p className="text-[10px] text-slate-500">AOV მაჩვენებელი</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>კრიტიკული მარაგი</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-400">{proAnalytics.lowStockProducts.length}</div>
              <p className="text-[10px] text-slate-500">პროდუქტი ამოწურვის პირასაა</p>
            </div>
          </div>

          {/* 🚀 QUICK ACTIONS */}
          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleManualRefresh} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow">
              <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" /> მონაცემების განახლება
            </button>
            <button onClick={exportOrdersCSV} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow">
              <Download className="w-3.5 h-3.5 text-teal-400" /> ექსპორტი (CSV)
            </button>
          </div>
        </>
      )}

      {activeSubSection === 'products' && (
        <div className="space-y-5">
          {/* Add Product Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" /> ახალი პროდუქტის დამატება
            </h3>
            <form onSubmit={handleAddProductSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <input type="text" placeholder="პროდუქტის დასელება *" required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                <input type="text" placeholder="SKU კოდი *" required value={newProd.sku} onChange={e => setNewProd({...newProd, sku: e.target.value})} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <input type="number" placeholder="ფასი (₾) *" required value={newProd.priceGEL} onChange={e => setNewProd({...newProd, priceGEL: e.target.value})} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                <input type="number" placeholder="მარაგი *" required value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
                <input type="url" placeholder="ფოტოს URL *" required value={newProd.image} onChange={e => setNewProd({...newProd, image: e.target.value})} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              </div>
              <button type="submit" className="bg-emerald-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow">დამატება</button>
            </form>
          </div>

          {/* Products List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-black text-white">არსებული პროდუქტები ({products.length})</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="p-2">ფოტო</th>
                    <th className="p-2">სახელწოდება</th>
                    <th className="p-2">ფასი</th>
                    <th className="p-2">მარაგი</th>
                    <th className="p-2 text-right">მოქმედება</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-950/40">
                      <td className="p-2"><img src={p.image} alt="" className="w-8 h-8 object-contain bg-slate-950 rounded p-0.5" /></td>
                      <td className="p-2 font-bold text-white">{p.name}</td>
                      <td className="p-2 font-black text-emerald-400">{p.priceGEL} ₾</td>
                      <td className="p-2">{p.stock} ც.</td>
                      <td className="p-2 text-right space-x-2">
                        <button onClick={() => { setEditingProductId(p.id); setEditProductForm({...p}); }} className="bg-emerald-500/20 text-emerald-300 p-1.5 rounded-lg border border-emerald-500/30 font-bold"><Edit className="w-3.5 h-3.5 inline" /></button>
                        <button onClick={() => { setProducts(products.filter(item => item.id !== p.id)); showToast('წაიშალა'); }} className="bg-rose-500/20 text-rose-300 p-1.5 rounded-lg border border-rose-500/30 font-bold"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubSection === 'orders' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-400" /> შეკვეთების მართვა
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="p-2">ID</th>
                  <th className="p-2">თარიღი</th>
                  <th className="p-2">მყიდველი</th>
                  <th className="p-2">თანხა</th>
                  <th className="p-2">სტატუსი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-500">შეკვეთები არ არის.</td></tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-950/40">
                      <td className="p-2 font-bold text-emerald-400">#{o.id}</td>
                      <td className="p-2 text-slate-400">{o.date}</td>
                      <td className="p-2 font-bold text-white">{o.customerName} ({o.phone})</td>
                      <td className="p-2 font-black text-emerald-400">{o.totalGEL} ₾</td>
                      <td className="p-2">
                        <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubSection === 'crm' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" /> მომხმარებელთა სეგმენტაცია (CRM)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="p-2">სახელი</th>
                  <th className="p-2">კონტაქტი</th>
                  <th className="p-2">სეგმენტი</th>
                  <th className="p-2">შეკვეთები</th>
                  <th className="p-2">დახარჯული</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {crmAnalytics.map(u => (
                  <tr key={u.id} className="hover:bg-slate-950/40">
                    <td className="p-2 font-bold text-white">{u.name}</td>
                    <td className="p-2 text-slate-400">{u.email} • {u.phone}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        u.segment.includes('VIP') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {u.segment}
                      </span>
                    </td>
                    <td className="p-2 font-bold">{u.realOrdersCount}</td>
                    <td className="p-2 font-black text-emerald-400">{u.realTotalSpent} ₾</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
