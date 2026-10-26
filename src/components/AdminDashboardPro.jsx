// src/components/AdminDashboardPro.jsx - GEOSTORE პროფესიონალური ადმინ პანელი (შეკვეთების ექსპორტი და სრული მართვა)
import React, { useState } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Tag, Search, Star, Settings, Image as ImageIcon, Percent, Download
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
  setOrders,
  usersList,
  setUsersList,
  products,
  setProducts,
  vendorsList,
  setVendorsList,
  coupons,
  setCoupons,
  siteSettings,
  setSiteSettings,
  formatPrice
}) {
  const [adminTab, setAdminTab] = useState('analytics'); 
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  const [productForm, setProductForm] = useState({
    name: '', category: 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);

  const [couponForm, setCouponForm] = useState({
    code: '', discountPercent: '', minOrderGEL: ''
  });

  const [vendorForm, setVendorForm] = useState({
    name: '', commission: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    storeName: siteSettings?.storeName || 'GEOSTORE',
    topBarText: siteSettings?.topBarText || '',
    heroTitle: siteSettings?.heroTitle || '',
    heroSubtitle: siteSettings?.heroSubtitle || ''
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

  const handleQuickUpdateProduct = (id, field, value) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: field === 'priceGEL' || field === 'stock' ? Number(value) : value };
      }
      return p;
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setSelectedImages(prev => [...prev, ...base64Images]);
    });
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.priceGEL) return;

    const mainImage = selectedImages.length > 0 ? selectedImages[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';

    const newProd = {
      id: `prod-${Date.now()}`,
      sku: `GEO-${Math.floor(1000 + Math.random() * 9000)}`,
      ...productForm,
      priceGEL: Number(productForm.priceGEL),
      stock: Number(productForm.stock) || 1,
      image: mainImage,
      gallery: selectedImages.length > 0 ? selectedImages : [mainImage]
    };

    setProducts(prev => [newProd, ...prev]);
    setProductForm({ name: '', category: 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: '' });
    setSelectedImages([]);
    alert('✅ პროდუქტი წარმატებით დაემატა!');
  };

  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discountPercent) return;
    const newC = {
      id: `c-${Date.now()}`,
      code: couponForm.code.toUpperCase(),
      discountPercent: Number(couponForm.discountPercent),
      minOrderGEL: Number(couponForm.minOrderGEL) || 0
    };
    setCoupons(prev => [newC, ...prev]);
    setCouponForm({ code: '', discountPercent: '', minOrderGEL: '' });
  };

  const handleDeleteCoupon = (id) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const handleAddVendor = (e) => {
    e.preventDefault();
    if (!vendorForm.name || vendorForm.commission === '') return;
    const newV = {
      id: `v-${Date.now()}`,
      name: vendorForm.name,
      commission: Number(vendorForm.commission),
      status: 'აქტიური'
    };
    setVendorsList(prev => [...prev, newV]);
    setVendorForm({ name: '', commission: '' });
    alert('✅ ვენდორი წარმატებით დაემატა!');
  };

  const handleDeleteVendor = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ვენდორის წაშლა?')) {
      setVendorsList(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // შეკვეთების ექსპორტი CSV / Excel ფორმატში
  const handleExportOrders = () => {
    if (!orders || orders.length === 0) {
      alert('გადმოსაწერი შეკვეთები არ არის.');
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Date,Customer,Phone,Address,Total(GEL),Status\r\n";
    orders.forEach(o => {
      const row = [o.id, o.date, `"${o.customerName}"`, `"${o.phone}"`, `"${o.address}"`, o.totalGEL, o.status || 'ახალი'];
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geostore_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleVipUser = (userId) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isVip: !u.isVip } : u));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSiteSettings(settingsForm);
    try { localStorage.setItem('geostore_site_settings', JSON.stringify(settingsForm)); } catch {}
    alert('საიტის პარამეტრები წარმატებით განახლდა!');
  };

  const filteredUsers = usersList?.filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredProducts = products?.filter(p => 
    p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 rounded-3xl p-5 gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">GEOSTORE პროფესიონალური ადმინ პანელი</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">სრული კონტროლი: ფინანსები, შეკვეთების ექსპორტი, მარაგი, ვენდორები</p>
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
          { id: 'products', label: '🏷️ პროდუქტები & მარაგი', count: products?.length || 0 },
          { id: 'coupons', label: '🎫 კუპონები', count: coupons?.length || 0 },
          { id: 'vendors', label: '🏪 ვენდორები', count: vendorsList?.length || 0 },
          { id: 'users', label: '👥 CRM', count: usersList?.length || 0 },
          { id: 'settings', label: '⚙️ პარამეტრები' }
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

      {/* 📦 შეკვეთების მართვა და ექსპორტის ღილაკი */}
      {adminTab === 'orders' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" /> შეკვეთების მართვა და სტატუსები
            </h3>
            <button 
              onClick={handleExportOrders}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" /> შეკვეთების ექსპორტი (CSV)
            </button>
          </div>

          <div className="space-y-3">
            {(!orders || orders.length === 0) ? (
              <p className="text-slate-500 text-xs py-4 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-sm">#{o.id}</span>
                      <span className="text-slate-500 text-[10px]">({o.date})</span>
                    </div>
                    <p className="text-slate-200">მყიდველი: <b className="text-white">{o.customerName}</b> | 📞 {o.phone}</p>
                    <p className="text-slate-400 text-[11px]">📍 მისამართი: {o.address}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto justify-end">
                    <div className="text-right">
                      <span className="font-black text-white text-base block">{formatPrice(o.totalGEL)}</span>
                      <span className="text-[10px] text-slate-400">სტატუსი: <b className="text-emerald-400">{o.status || 'ახალი'}</b></span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')} className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${o.status === 'ახალი' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>ახალი</button>
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'მუშავდება')} className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${o.status === 'მუშავდება' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'დასრულებული')} className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${o.status === 'დასრულებული' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>დასრულებული</button>
                    </div>
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
              <Plus className="w-5 h-5 text-emerald-400" /> ახალი პროდუქტის დამატება გალერეით
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" placeholder="პროდუქტის დასახელება *" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                <input type="number" placeholder="ფასი GEL *" required value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                <input type="number" placeholder="მარაგი (რაოდენობა)" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-emerald-400" /> აირჩიეთ ფოტოები გალერეიდან (მონიშნეთ რამდენიმე ერთად):
                </label>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-slate-400 text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer" />
                
                {selectedImages.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto pt-3 pb-1">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0 shadow-md">
                        <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                        <button type="button" onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[11px] font-black flex items-center justify-center shadow">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black p-3.5 rounded-xl shadow hover:bg-emerald-400 transition">
                პროდუქტის შენახვა გალერეით
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm">პროდუქტების სწრაფი მართვა და მარაგები ({products?.length || 0})</h3>
              <div className="relative w-full sm:w-64">
                <input type="text" placeholder="ძებნა პროდუქტებში..." value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500" />
                <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-3">
              {filteredProducts?.map(p => (
                <div key={p.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="w-12 h-12 object-contain bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-slate-400 text-[10px]">SKU: {p.sku || 'N/A'} | ვენდორი: {p.vendor || 'GEOSTORE'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">ფასი (₾):</span>
                      <input 
                        type="number" 
                        value={p.priceGEL} 
                        onChange={e => handleQuickUpdateProduct(p.id, 'priceGEL', e.target.value)}
                        className="w-20 bg-slate-900 border border-slate-800 rounded-xl p-2 text-emerald-400 font-black text-center outline-none focus:border-emerald-500" 
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">მარაგი:</span>
                      <input 
                        type="number" 
                        value={p.stock !== undefined ? p.stock : 10} 
                        onChange={e => handleQuickUpdateProduct(p.id, 'stock', e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-black text-center outline-none focus:border-emerald-500" 
                      />
                    </div>

                    <button onClick={() => handleDeleteProduct(p.id)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'coupons' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" /> ახალი კუპონის შექმნა
            </h3>
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input type="text" placeholder="კოდი (მაგ: GEO2026)" required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500 uppercase" />
              <input type="number" placeholder="ფასდაკლება % (მაგ: 15)" required value={couponForm.discountPercent} onChange={e => setCouponForm({...couponForm, discountPercent: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <button type="submit" className="bg-emerald-500 text-slate-950 font-black p-3 rounded-xl shadow hover:bg-emerald-400 transition">კუპონის დამატება</button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm">აქტიური კუპონები ({coupons?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {coupons?.map(c => (
                <div key={c.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-black text-emerald-400 text-sm tracking-wider">{c.code}</h4>
                    <p className="text-slate-300 font-bold mt-0.5">ფასდაკლება: {c.discountPercent}%</p>
                  </div>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-400 hover:text-rose-300 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'vendors' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" /> ახალი ვენდორის დამატება და კომისია
            </h3>
            <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input type="text" placeholder="ვენდორის სახელი *" required value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="number" placeholder="კომისია % (მაგ: 10)" required value={vendorForm.commission} onChange={e => setVendorForm({...vendorForm, commission: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <button type="submit" className="bg-emerald-500 text-slate-950 font-black p-3 rounded-xl shadow hover:bg-emerald-400 transition flex items-center justify-center gap-1">
                <Percent className="w-4 h-4" /> ვენდორის დამატება
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="font-black text-white text-sm">აქტიური ვენდორები ({vendorsList?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendorsList?.map(v => (
                <div key={v.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">{v.name}</h4>
                    <p className="text-emerald-400 font-bold mt-0.5">კომისია: {v.commission}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-black">{v.status}</span>
                    <button onClick={() => handleDeleteVendor(v.id)} className="text-rose-400 hover:text-rose-300 p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> მომხმარებლების CRM მართვა ({usersList?.length || 0})
            </h3>
            <div className="relative w-full sm:w-64">
              <input type="text" placeholder="ძებნა სახელით ან ემაილით..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500" />
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-2.5">
            {(!filteredUsers || filteredUsers.length === 0) ? (
              <p className="text-slate-500 text-xs py-6 text-center">მომხმარებლები ვერ მოიძებნა.</p>
            ) : (
              filteredUsers.map((u, i) => (
                <div key={u.id || i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{u.name}</h4>
                      {u.isVip && <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> VIP</span>}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">📧 {u.email} | 📞 {u.phone}</p>
                  </div>
                  <button onClick={() => handleToggleVipUser(u.id)} className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition ${u.isVip ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'}`}>
                    <Star className="w-3.5 h-3.5" /> {u.isVip ? 'VIP სტატუსი მოხსნა' : 'VIP-ად მონიშვნა'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="font-black text-white text-sm flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" /> საიტის გლობალური პარამეტრები
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">მაღაზიის დასახელება</label>
              <input type="text" value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">ზედა ზოლის ტექსტი (TopBar)</label>
              <input type="text" value={settingsForm.topBarText} onChange={e => setSettingsForm({...settingsForm, topBarText: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-bold">მთავარი სათაური (Hero Title)</label>
              <input type="text" value={settingsForm.heroTitle} onChange={e => setSettingsForm({...settingsForm, heroTitle: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
            </div>
            <button type="submit" className="bg-emerald-500 text-slate-950 font-black px-5 py-3 rounded-xl shadow hover:bg-emerald-400 transition">
              პარამეტრების შენახვა
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
