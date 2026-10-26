// src/components/AdminDashboardPro.jsx
import React, { useState } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, Package, RefreshCcw, Download, ShieldAlert, Plus, Edit3, Trash2, RotateCcw, Truck, Store, Key, Settings, BookOpen, Tag
} from 'lucide-react';

export default function AdminDashboardPro({
  proAnalytics,
  crmAnalytics,
  returnsList,
  setReturnsList,
  orders,
  fetchOrders,
  setProducts,
  products,
  categories,
  setCategories,
  vendorsList,
  setVendorsList,
  coupons,
  setCoupons,
  exportOrdersCSV,
  handleManualRefresh,
  setEditingProductId,
  setEditProductForm,
  showToast,
  adminActiveSubTab,
  setAdminActiveSubTab,
  adminSecurityForm,
  setAdminSecurityForm,
  handleChangeAdminPassword,
  siteSettings,
  setSiteSettings,
  usdRate,
  setUsdRate,
  storePolicy,
  setStorePolicy,
  activeInvoiceOrder,
  setActiveInvoiceOrder,
  SUPABASE_URL,
  headers
}) {
  const [uploadedMainImg, setUploadedMainImg] = useState('');

  return (
    <div className="space-y-5 w-full text-xs">
      {/* Sub-tabs Navigation */}
      <div className="flex gap-1.5 bg-slate-900 p-2 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
        {[
          { id: 'dashboardPro', label: '📊 პროფესიონალური Dashboard' },
          { id: 'crmPro', label: '👥 CRM სეგმენტები' },
          { id: 'returnsPro', label: '🔄 დაბრუნებები' },
          { id: 'suppliersPro', label: '🚚 მომწოდებლები' },
          { id: 'orders', label: '📦 შეკვეთები' },
          { id: 'vendors', label: '🏪 ვენდერები' },
          { id: 'products', label: 'პროდუქცია' },
          { id: 'security', label: 'უსაფრთხოება' },
          { id: 'cms', label: 'საიტის CMS' },
          { id: 'policyEditor', label: '📜 წესები' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminActiveSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              adminActiveSubTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- DASHBOARD PRO --- */}
      {adminActiveSubTab === 'dashboardPro' && (
        <div className="space-y-5 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                <span>💰 სრული შემოსავალი</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">{proAnalytics.totalRevenueGEL.toLocaleString('ka-GE')} ₾</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                <span>💎 წმინდა მოგება</span>
                <DollarSign className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-black text-teal-400 mt-2">{proAnalytics.netProfitGEL.toLocaleString('ka-GE')} ₾</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                <span>📦 შეკვეთები</span>
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400 mt-2">{proAnalytics.totalOrdersCount}</div>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center text-slate-400 text-xs font-bold">
                <span>⚠️ დაბალი მარაგი</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2">{proAnalytics.lowStockProducts.length} ცალი</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleManualRefresh} className="bg-slate-900 border border-slate-800 text-emerald-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" /> მონაცემების განახლება
            </button>
            <button onClick={exportOrdersCSV} className="bg-slate-900 border border-slate-800 text-teal-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV ექსპორტი
            </button>
          </div>
        </div>
      )}

      {/* --- CRM PRO --- */}
      {adminActiveSubTab === 'crmPro' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-400" /> მომხმარებელთა CRM სეგმენტები</h3>
          <div className="space-y-2.5">
            {crmAnalytics.map(u => (
              <div key={u.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-xs">{u.name}</p>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{u.segment}</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-1">📧 {u.email} | 📞 {u.phone} | შეკვეთები: <b>{u.realOrdersCount}</b> | დახარჯული: <b className="text-emerald-400">{u.realTotalSpent} ₾</b></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- RETURNS --- */}
      {adminActiveSubTab === 'returnsPro' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-rose-400" /> დაბრუნებების მართვა</h3>
          <div className="space-y-2.5">
            {returnsList.map(r => (
              <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-rose-400">#{r.id}</span> <b className="text-white">{r.productName}</b> ({r.customerName})
                  <p className="text-slate-400 text-[10px]">მიზეზი: {r.reason} | სტატუსი: <b className="text-amber-300">{r.status}</b></p>
                </div>
                <select value={r.status} onChange={e => setReturnsList(returnsList.map(x => x.id === r.id ? {...x, status: e.target.value} : x))} className="bg-slate-900 border border-slate-700 text-emerald-300 font-bold px-2 py-1 rounded-lg">
                  <option value="განხილვაში">განხილვაში</option>
                  <option value="დამტკიცებული">დამტკიცებული</option>
                  <option value="დასრულებული">დასრულებული</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUPPLIERS --- */}
      {adminActiveSubTab === 'suppliersPro' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><Truck className="w-4 h-4 text-teal-400" /> მომწოდებლები</h3>
          <div className="space-y-2">
            {vendorsList.map(sup => (
              <div key={sup.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-black text-teal-300">{sup.name}</span>
                  <p className="text-slate-400 text-[10px]">📞 {sup.phone} | ✉️ {sup.email || 'არ არის'} | საკომისიო: <b className="text-emerald-400">{sup.commission}%</b></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ORDERS --- */}
      {adminActiveSubTab === 'orders' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white">📦 შეკვეთების მართვა ({orders.length})</h3>
          <div className="space-y-2.5">
            {orders.map(o => (
              <div key={o.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-400">#{o.id} ({o.date})</span>
                  <p className="text-slate-300">მყიდველი: <b>{o.customerName}</b> ({o.phone}) | მისამართი: {o.address}</p>
                  <p className="text-slate-400 text-[10px]">{o.items?.map(i => `${i.name} (${i.quantity}ც.)`).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={o.status || 'ახალი'} 
                    onChange={async (e) => {
                      const updatedStatus = e.target.value;
                      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${o.id}`, {
                        method: 'PATCH',
                        headers: { ...headers, 'Prefer': 'return=minimal' },
                        body: JSON.stringify({ status: updatedStatus })
                      });
                      fetchOrders();
                      showToast(`სტატუსი შეიცვალა: ${updatedStatus}`);
                    }}
                    className="bg-slate-900 border border-slate-700 text-emerald-300 font-bold px-2 py-1 rounded-lg"
                  >
                    <option value="ახალი">ახალი</option>
                    <option value="მზადდება">მზადდება</option>
                    <option value="გზაშია">გზაშია</option>
                    <option value="ჩაბარებულია">ჩაბარებულია</option>
                    <option value="გაუქმებულია">გაუქმებულია</option>
                  </select>
                  <span className="font-black text-white">{o.totalGEL} ₾</span>
                  <button onClick={() => setActiveInvoiceOrder(o)} className="bg-slate-800 px-2.5 py-1 rounded-lg text-white font-bold">ინვოისი</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- VENDORS --- */}
      {adminActiveSubTab === 'vendors' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white">🏪 ვენდერების მართვა</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const vName = e.target.vName.value.trim();
            const vPhone = e.target.vPhone.value.trim();
            const vComm = Number(e.target.vComm.value) || 0;
            if(!vName) return;
            setVendorsList([...vendorsList, { id: `v-${Date.now()}`, name: vName, phone: vPhone || '+995 500 00 00', commission: vComm, status: 'აქტიური' }]);
            e.target.reset();
            showToast('ვენდერი დაემატა');
          }} className="flex gap-2">
            <input type="text" name="vName" required placeholder="ვენდერის სახელი..." className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-white flex-1" />
            <input type="text" name="vPhone" placeholder="ტელეფონი" className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-white w-32" />
            <input type="number" name="vComm" placeholder="%" className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-white w-16" />
            <button type="submit" className="bg-teal-500 text-slate-950 font-bold px-3 py-2 rounded-xl">დამატება</button>
          </form>
          <div className="space-y-2">
            {vendorsList.map(v => (
              <div key={v.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span>{v.name} ({v.commission}%)</span>
                {v.name !== 'GEOSTORE ოფიციალური' && (
                  <button onClick={() => setVendorsList(vendorsList.filter(x => x.id !== v.id))} className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PRODUCTS --- */}
      {adminActiveSubTab === 'products' && (
        <div className="bg-slate-900 p-5 rounded-2xl space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white">📦 პროდუქტების დამატება და მართვა ({products.length})</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = e.target;
            const newProd = {
              id: `prod-${Date.now()}`,
              sku: f.sku.value || `SKU-${Math.floor(Math.random()*1000)}`,
              name: f.name.value,
              category: f.category.value,
              vendor: f.vendor.value,
              brand: f.brand.value,
              priceGEL: Number(f.priceGEL.value),
              oldPriceGEL: Number(f.oldPriceGEL.value) || Number(f.priceGEL.value),
              discountPercent: Number(f.discountPercent.value) || 0,
              stock: Number(f.stock.value),
              image: uploadedMainImg || f.mainImageUrl.value || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
              images: [uploadedMainImg || f.mainImageUrl.value || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'],
              description: f.description.value,
              warranty: '1 წელი',
              isPreOrder: f.isPreOrder.checked
            };
            setProducts([newProd, ...products]);
            f.reset();
            setUploadedMainImg('');
            showToast('✅ პროდუქტი დაემატა!');
          }} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <input type="text" name="name" required placeholder="დასახელება *" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
            <input type="text" name="sku" placeholder="SKU კოდი" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
            <select name="category" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white">
              {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
            <select name="vendor" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white">
              {vendorsList.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
            <input type="text" name="brand" placeholder="ბრენდი (Apple, Samsung...)" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
            <div className="grid grid-cols-3 gap-1">
              <input type="number" name="priceGEL" required placeholder="ფასი *" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
              <input type="number" name="oldPriceGEL" placeholder="ძველი ფასი" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
              <input type="number" name="stock" required placeholder="მარაგი *" className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
            </div>
            <input type="url" name="mainImageUrl" placeholder="სურათის URL..." className="md:col-span-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-white" />
            <textarea name="description" placeholder="აღწერა..." className="md:col-span-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-white h-14" />
            <button type="submit" className="md:col-span-2 bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl">დამატება</button>
          </form>

          <div className="space-y-2 pt-2">
            {products.map(p => (
              <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <img src={p.image} alt="" className="w-8 h-8 object-contain bg-slate-900 rounded p-0.5" />
                  <div>
                    <span className="font-bold text-white">{p.name}</span>
                    <p className="text-teal-400 text-[10px]">{p.priceGEL} ₾ (მარაგი: {p.stock})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingProductId(p.id); setEditProductForm({...p}); }} className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded font-bold">რედაქტირება</button>
                  <button onClick={() => setProducts(products.filter(x => x.id !== p.id))} className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECURITY --- */}
      {adminActiveSubTab === 'security' && (
        <div className="bg-slate-900 p-5 rounded-2xl max-w-sm space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><Key className="w-4 h-4 text-emerald-400" /> პაროლის შეცვლა</h3>
          <form onSubmit={handleChangeAdminPassword} className="space-y-2.5">
            <input type="text" value={adminSecurityForm.username} onChange={e => setAdminSecurityForm({...adminSecurityForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="password" required placeholder="ძველი პაროლი" value={adminSecurityForm.oldPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, oldPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="password" required placeholder="ახალი პაროლი" value={adminSecurityForm.newPassword} onChange={e => setAdminSecurityForm({...adminSecurityForm, newPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
            <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2 rounded-xl font-bold">განახლება</button>
          </form>
        </div>
      )}

      {/* --- CMS --- */}
      {adminActiveSubTab === 'cms' && (
        <div className="bg-slate-900 p-5 rounded-2xl max-w-lg space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><Settings className="w-4 h-4 text-emerald-400" /> საიტის CMS</h3>
          <div className="space-y-2 text-xs">
            <label className="text-slate-400">მაღაზიის სახელი:</label>
            <input type="text" value={siteSettings.storeName} onChange={e => setSiteSettings({...siteSettings, storeName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white" />
            <label className="text-slate-400">USD კურსი:</label>
            <input type="number" step="0.01" value={usdRate} onChange={e => setUsdRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white" />
          </div>
        </div>
      )}

      {/* --- POLICY EDITOR --- */}
      {adminActiveSubTab === 'policyEditor' && (
        <div className="bg-slate-900 p-5 rounded-2xl max-w-lg space-y-3.5 border border-slate-800 w-full">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-emerald-400" /> წესები და პოლიტიკა</h3>
          <div className="space-y-2 text-xs">
            <label className="text-slate-400">მიწოდება:</label>
            <textarea value={storePolicy.delivery} onChange={e => setStorePolicy({...storePolicy, delivery: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white h-16" />
            <label className="text-slate-400">გარანტია:</label>
            <textarea value={storePolicy.warranty} onChange={e => setStorePolicy({...storePolicy, warranty: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white h-16" />
          </div>
        </div>
      )}
    </div>
  );
}
