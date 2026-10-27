// src/components/AdminDashboardPro.jsx - Elite Gold Admin & Category Icons Edition
import React, { useState, useEffect } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Tag, Search, Star, Settings, Image as ImageIcon, Percent, Download, FolderTree, Megaphone, Send, Activity, Zap, Printer, Lock, HelpCircle,
  Smartphone, Laptop, Headphones, Watch, Camera as CameraIcon, Tv, Speaker, Sparkles, Gamepad2, Tablet, Printer as PrinterIcon
} from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

export default function AdminDashboardPro({
  adminLoggedIn,
  setAdminLoggedIn,
  adminLoginForm,
  setAdminLoginForm,
  handleAdminLogin,
  adminError,
  proAnalytics,
  orders = [],
  setOrders,
  usersList = [],
  setUsersList,
  products = [],
  setProducts,
  vendorsList = [],
  setVendorsList,
  coupons = [],
  setCoupons,
  categoriesList = [],
  setCategoriesList,
  bannersList = [],
  setBannersList,
  siteSettings,
  setSiteSettings,
  formatPrice
}) {
  const [adminTab, setAdminTab] = useState('analytics'); 
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  const [productForm, setProductForm] = useState({
    name: '', category: 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: '', tags: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);

  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', minOrderGEL: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', commission: '' });
  
  // კატეგორიისა და იკონის ფორმა
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Smartphone');

  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', image: '', link: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [flashSaleForm, setFlashSaleForm] = useState({ discountPercent: '', category: 'ყველა' });
  const [passwordForm, setPasswordForm] = useState({ newUsername: '', newPassword: '' });

  const [supportTickets, setSupportTickets] = useState([]);
  const [replyInputs, setReplyInputs] = useState({});

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSupportTickets(data.map(t => ({
          id: t.id,
          customerName: t.customer_name,
          email: t.email,
          subject: t.subject,
          message: t.message,
          status: t.status || 'ღია',
          reply: t.reply || '',
          date: t.created_at ? new Date(t.created_at).toLocaleDateString('ka-GE') : 'დღეს'
        })));
      }
    } catch {}
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const [activityLogs, setActivityLogs] = useState([
    { id: 'l1', action: 'ადმინისტრატორი შევიდა სისტემაში', time: new Date().toLocaleTimeString('ka-GE') },
    { id: 'l2', action: 'სისტემის მონაცემები წარმატებით ჩაიტვირთა', time: new Date().toLocaleTimeString('ka-GE') }
  ]);

  const [settingsForm, setSettingsForm] = useState({
    storeName: siteSettings?.storeName || 'GEOSTORE',
    topBarText: siteSettings?.topBarText || '',
    heroTitle: siteSettings?.heroTitle || '',
    heroSubtitle: siteSettings?.heroSubtitle || ''
  });

  const logActivity = (actionText) => {
    const newLog = {
      id: `log-${Date.now()}`,
      action: actionText,
      time: new Date().toLocaleTimeString('ka-GE') + ' (' + new Date().toLocaleDateString('ka-GE') + ')'
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  if (!adminLoggedIn) {
    return (
      <div className="max-w-sm mx-auto bg-[#0d0d10] border border-amber-500/35 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-3xl text-center my-16">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Shield className="w-8 h-8 text-amber-400 animate-pulse" />
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-white tracking-tight">ადმინისტრატორის პანელი</h2>
          <p className="text-xs text-slate-400">შეიყვანეთ სამართავი მონაცემები სისტემაში შესასვლელად</p>
        </div>

        <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-4 text-xs">
          <input 
            type="text" 
            name="geo_admin_username_secure"
            autoComplete="off"
            placeholder="მომხმარებელი" 
            value={adminLoginForm?.username || ''} 
            onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
            className="w-full bg-[#08080a] border border-amber-500/20 rounded-2xl p-4 text-white outline-none focus:border-amber-400 shadow-inner transition-all" 
          />
          <input 
            type="password" 
            name="geo_admin_password_secure"
            autoComplete="new-password"
            placeholder="პაროლი" 
            value={adminLoginForm?.password || ''} 
            onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
            className="w-full bg-[#08080a] border border-amber-500/20 rounded-2xl p-4 text-white outline-none focus:border-amber-400 shadow-inner transition-all" 
          />

          <div className="flex items-center gap-2 text-left pt-1 px-1">
            <input 
              type="checkbox" 
              id="remMe" 
              checked={adminLoginForm?.remember || false} 
              onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
              className="rounded accent-amber-400 cursor-pointer w-4 h-4" 
            />
            <label htmlFor="remMe" className="cursor-pointer text-xs text-slate-300 font-bold">მომიმახსოვრე სისტემაში</label>
          </div>

          {adminError && <p className="text-rose-400 text-xs font-bold pt-1">{adminError}</p>}

          <button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer text-xs mt-2">
            სისტემაში შესვლა
          </button>
        </form>
      </div>
    );
  }

  // კატეგორიის დამატება იკონით
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    // ვინახავთ ობიექტის სახით: { name: '...', icon: '...' }
    const newCatObj = { name: newCatName.trim(), icon: newCatIcon };
    
    const categoryExists = (categoriesList || []).some(cat => {
      const cName = typeof cat === 'object' ? cat.name : cat;
      return cName === newCatName.trim();
    });

    if (categoryExists) {
      alert('ეს კატეგორია უკვე არსებობს!');
      return;
    }

    setCategoriesList(prev => [...(prev || []), newCatObj]);
    setNewCatName('');
    logActivity(`დაემატა კატეგორია: ${newCatName.trim()} (${newCatIcon})`);
    alert('✅ კატეგორია და იკონი წარმატებით დაემატა!');
  };

  const handleDeleteCategory = (catName) => {
    if (window.confirm(`ნამდვილად გსურთ კატეგორიის "${catName}" წაშლა?`)) {
      setCategoriesList(prev => (prev || []).filter(c => {
        const cName = typeof c === 'object' ? c.name : c;
        return cName !== catName;
      }));
      logActivity(`წაიშალა კატეგორია: ${catName}`);
    }
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა?')) {
      setProducts(prev => (prev || []).filter(p => p.id !== id));
      logActivity(`წაიშალა პროდუქტი (ID: ${id})`);
    }
  };

  const handleQuickUpdateProduct = (id, field, value) => {
    setProducts(prev => (prev || []).map(p => {
      if (p.id === id) {
        return { ...p, [field]: field === 'priceGEL' || field === 'stock' ? Number(value) : value };
      }
      return p;
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setSelectedImages(prev => [...(prev || []), ...base64Images]);
    });
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.priceGEL) return;

    const mainImage = selectedImages.length > 0 ? selectedImages[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
    const tagsArray = productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const defaultCat = categoriesList?.[0] ? (typeof categoriesList[0] === 'object' ? categoriesList[0].name : categoriesList[0]) : 'სმარტფონები';

    const newProd = {
      id: `prod-${Date.now()}`,
      sku: `GEO-${Math.floor(1000 + Math.random() * 9000)}`,
      ...productForm,
      category: productForm.category || defaultCat,
      priceGEL: Number(productForm.priceGEL),
      oldPriceGEL: productForm.oldPriceGEL ? Number(productForm.oldPriceGEL) : null,
      stock: Number(productForm.stock) || 1,
      tags: tagsArray,
      image: mainImage,
      gallery: selectedImages.length > 0 ? selectedImages : [mainImage]
    };

    setProducts(prev => [newProd, ...(prev || [])]);
    setProductForm({ name: '', category: defaultCat, priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: '', tags: '' });
    setSelectedImages([]);
    logActivity(`დაემატა ახალი პროდუქტი: ${newProd.name}`);
    alert('✅ პროდუქტი წარმატებით დაემატა დეტალური ინფორმაციითა და ტეგებით!');
  };

  const handleExportProducts = () => {
    if (!products || products.length === 0) {
      alert('ექსპორტისთვის პროდუქტები არ არის.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,ID,SKU,Name,Category,Price(GEL),Stock,Vendor\r\n";
    products.forEach(p => {
      const row = [p.id, p.sku || 'N/A', `"${p.name}"`, `"${p.category}"`, p.priceGEL, p.stock || 1, `"${p.vendor || 'GEOSTORE'}"`];
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geostore_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logActivity('გადმოიწერა პროდუქტების CSV ექსპორტი');
  };

  const handleApplyFlashSale = (e) => {
    e.preventDefault();
    const percent = Number(flashSaleForm.discountPercent);
    if (!percent || percent <= 0) return;

    setProducts(prev => (prev || []).map(p => {
      if (flashSaleForm.category === 'ყველა' || p.category === flashSaleForm.category) {
        const basePrice = p.oldPriceGEL ? p.oldPriceGEL : p.priceGEL;
        const discountedPrice = Math.round(basePrice * (1 - percent / 100));
        return {
          ...p,
          oldPriceGEL: basePrice,
          priceGEL: discountedPrice
        };
      }
      return p;
    }));

    logActivity(`გააქტიურდა მასობრივი ფლეშ-აქცია (${percent}%) კატეგორიისთვის: ${flashSaleForm.category}`);
    alert(`⚡ წარმატებით გააქტიურდა ${percent}%-იანი ფასდაკლება!`);
    setFlashSaleForm({ discountPercent: '', category: 'ყველა' });
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('გთხოვთ დაუშვათ Popup ფანჯრები ბრაუზერში.');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>ინვოისი #${order.id}</title>
          <style>
            body { font-family: 'Noto Sans Georgian', sans-serif; padding: 30px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 20px; }
            .store-name { font-size: 24px; font-weight: 900; color: #d97706; }
            .order-info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f8fafc; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="store-name">GEOSTORE</div>
              <p>ონლაინ მარკეტფლეისი საქართველოში</p>
            </div>
            <div style="text-align: right;">
              <h2>შეკვეთა #${order.id}</h2>
              <p>თარიღი: ${order.date}</p>
            </div>
          </div>
          <div class="order-info">
            <p><b>მყიდველი:</b> ${order.customerName}</p>
            <p><b>ტელეფონი:</b> ${order.phone}</p>
            <p><b>მიტანის მისამართი:</b> ${order.address}</p>
            <p><b>სტატუსი:</b> ${order.status || 'ახალი'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>პროდუქტი</th>
                <th>რაოდენობა</th>
                <th>ფასი</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${order.itemSummary || 'შეკვეთილი პროდუქტები'}</td>
                <td>1</td>
                <td>${order.totalGEL} ₾</td>
              </tr>
            </tbody>
          </table>
          <div class="total">
            სულ გადასახდელი: ${formatPrice(order.totalGEL)}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    logActivity(`დაიბეჭდა ინვოისი შეკვეთისთვის #${order.id}`);
  };

  const handleChangeAdminCredentials = (e) => {
    e.preventDefault();
    if (!passwordForm.newUsername && !passwordForm.newPassword) return;

    try {
      if (passwordForm.newUsername) {
        localStorage.setItem('geostore_admin_user', passwordForm.newUsername);
      }
      if (passwordForm.newPassword) {
        localStorage.setItem('geostore_admin_pass', passwordForm.newPassword);
      }
    } catch {}

    logActivity('შეიცვალა ადმინისტრატორის სარეკვიზიტი მონაცემები');
    alert('🔒 ადმინისტრატორის მონაცემები წარმატებით განახლდა!');
    setPasswordForm({ newUsername: '', newPassword: '' });
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      fetchTickets();
      logActivity(`ტიგეტის #${ticketId} სტატუსი შეიცვალა: ${newStatus}`);
    } catch { alert('შეცდომა სტატუსის განახლებისას'); }
  };

  const handleSendTicketReply = async (ticketId) => {
    const replyText = replyInputs[ticketId];
    if (!replyText || !replyText.trim()) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reply: replyText.trim(), status: 'მოგვარებული' })
      });
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
      fetchTickets();
      logActivity(`გაიგზავნა პასუხი ტიგეტზე #${ticketId}`);
      alert('✅ პასუხი წარმატებით გაეგზავნა მომხმარებელს!');
    } catch { alert('შეცდომა პასუხის გაგზავნისას'); }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm('ნამდვილად გსურთ ამ ტიგეტის წაშლა?')) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${ticketId}`, {
          method: 'DELETE',
          headers
        });
        fetchTickets();
        logActivity(`წაიშალა მხარდაჭერის ტიგეტი (ID: ${ticketId})`);
      } catch { alert('შეცდომა ტიგეტის წაშლისას'); }
    }
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
    setCoupons(prev => [newC, ...(prev || [])]);
    setCouponForm({ code: '', discountPercent: '', minOrderGEL: '' });
    logActivity(`შეიქმნა ახალი კუპონი: ${newC.code}`);
  };

  const handleDeleteCoupon = (id) => {
    setCoupons(prev => (prev || []).filter(c => c.id !== id));
    logActivity(`წაიშალა კუპონი (ID: ${id})`);
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
    setVendorsList(prev => [...(prev || []), newV]);
    setVendorForm({ name: '', commission: '' });
    logActivity(`დაემატა ახალი ვენდორი: ${newV.name}`);
    alert('✅ ვენდორი წარმატებით დაემატა!');
  };

  const handleDeleteVendor = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ვენდორის წაშლა?')) {
      setVendorsList(prev => (prev || []).filter(v => v.id !== id));
      logActivity(`წაიშალა ვენდორი (ID: ${id})`);
    }
  };

  const handleAddBanner = (e) => {
    e.preventDefault();
    if (!bannerForm.title) return;
    const newB = {
      id: `b-${Date.now()}`,
      ...bannerForm,
      image: bannerForm.image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&q=80&w=1200'
    };
    setBannersList(prev => [...(prev || []), newB]);
    setBannerForm({ title: '', subtitle: '', image: '', link: '' });
    logActivity(`დაემატა ბანერი: ${newB.title}`);
    alert('✅ სარეკლამო ბანერი წარმატებით დაემატა!');
  };

  const handleDeleteBanner = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ბანერის წაშლა?')) {
      setBannersList(prev => (prev || []).filter(b => b.id !== id));
      logActivity(`წაიშალა ბანერი (ID: ${id})`);
    }
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;
    
    const newNotification = {
      id: `notif-${Date.now()}`,
      title: broadcastForm.title,
      message: broadcastForm.message,
      date: new Date().toLocaleDateString('ka-GE')
    };

    try {
      const existing = JSON.parse(localStorage.getItem('geostore_broadcasts') || '[]');
      localStorage.setItem('geostore_broadcasts', JSON.stringify([newNotification, ...existing]));
    } catch {}

    setBroadcastForm({ title: '', message: '' });
    logActivity(`გაიგზავნა ბროდკასტი: ${broadcastForm.title}`);
    alert('🚀 შეტყობინება წარმატებით გაეგზავნა ყველა მომხმარებელს!');
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => (prev || []).map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    logActivity(`შეკვეთის #${orderId} სტატუსი შეიცვალა: ${newStatus}`);
  };

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
    logActivity('გადმოიწერა შეკვეთების CSV ექსპორტი');
  };

  const handleToggleVipUser = (userId) => {
    setUsersList(prev => (prev || []).map(u => u.id === userId ? { ...u, isVip: !u.isVip } : u));
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) VIP სტატუსი`);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSiteSettings(settingsForm);
    try { localStorage.setItem('geostore_site_settings', JSON.stringify(settingsForm)); } catch {}
    logActivity('განახლდა საიტის გლობალური პარამეტრები');
    alert('საიტის პარამეტრები წარმატებით განახლდა!');
  };

  const filteredUsers = (usersList || []).filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0d0d10] border border-amber-500/30 rounded-[2.5rem] p-6 gap-4 shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-3.5">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl shadow-inner">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">GEOSTORE პროფესიონალური ადმინ პანელი</h2>
            <p className="text-xs text-slate-400 mt-0.5">სრული კონტროლი: მხარდაჭერა, პროდუქტების დეტალები & ტეგები, ფინანსები, შეკვეთები</p>
          </div>
        </div>
        <button 
          onClick={() => { setAdminLoggedIn(false); localStorage.removeItem('geostore_admin_remember'); }} 
          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" /> გამოსვლა
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 border-b border-amber-500/20 scrollbar-none">
        {[
          { id: 'analytics', label: '📊 ანალიტიკა' },
          { id: 'orders', label: '📦 შეკვეთები', count: orders?.length || 0 },
          { id: 'products', label: '🏷️ პროდუქტები & ტეგები', count: products?.length || 0 },
          { id: 'support', label: '💬 მხარდაჭერა & პასუხები', count: supportTickets?.filter(t => t.status === 'ღია' || t.status === 'მუშავდება')?.length || 0 },
          { id: 'discounts', label: '⚡ ფლეშ-აქციები' },
          { id: 'logs', label: '📋 აქტივობები', count: activityLogs?.length || 0 },
          { id: 'broadcasts', label: '📢 შეტყობინებები' },
          { id: 'banners', label: '🖼️ ბანერები', count: bannersList?.length || 0 },
          { id: 'categories', label: '📂 კატეგორიები', count: categoriesList?.length || 0 },
          { id: 'coupons', label: '🎫 კუპონები', count: coupons?.length || 0 },
          { id: 'vendors', label: '🏪 ვენდორები', count: vendorsList?.length || 0 },
          { id: 'users', label: '👥 CRM', count: usersList?.length || 0 },
          { id: 'settings', label: '⚙️ პარამეტრები' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id)}
            className={`px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md ${
              adminTab === tab.id ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 scale-105 font-black' : 'bg-[#121216] text-slate-400 border border-amber-500/15 hover:text-white hover:border-amber-500/30'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${adminTab === tab.id ? 'bg-slate-950 text-amber-400' : 'bg-[#1a1a20] text-slate-300'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {adminTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#0d0d10] border border-amber-500/25 p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-400" /> სრული შემოსავალი</p>
            <p className="text-3xl font-black text-amber-400">{formatPrice(proAnalytics?.totalRevenueGEL || 0)}</p>
          </div>
          <div className="bg-[#0d0d10] border border-amber-500/25 p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-yellow-400" /> სავარაუდო წმინდა მოგება</p>
            <p className="text-3xl font-black text-yellow-400">{formatPrice(proAnalytics?.netProfitGEL || 0)}</p>
          </div>
          <div className="bg-[#0d0d10] border border-amber-500/25 p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><PackageCheck className="w-4 h-4 text-amber-300" /> სულ შეკვეთები</p>
            <p className="text-3xl font-black text-amber-300">{proAnalytics?.totalOrdersCount || 0}</p>
          </div>
          <div className="bg-[#0d0d10] border border-amber-500/25 p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
            <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> დაბალი მარაგი (≤ 3)</p>
            <p className="text-3xl font-black text-amber-400">{proAnalytics?.lowStockProducts?.length || 0} პროდუქტი</p>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {adminTab === 'orders' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-500/20 pb-4">
            <h3 className="font-black text-white text-base flex items-center gap-2.5">
              <PackageCheck className="w-5 h-5 text-amber-400" /> შეკვეთების მართვა, სტატუსები და ინვოისები
            </h3>
            <button 
              onClick={handleExportOrders}
              className="bg-[#121216] hover:bg-[#1a1a20] text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
            >
              <Download className="w-4 h-4" /> შეკვეთების ექსპორტი (CSV)
            </button>
          </div>

          <div className="space-y-3.5">
            {(!orders || orders.length === 0) ? (
              <p className="text-slate-500 text-xs py-6 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-[#08080a] p-5 rounded-3xl border border-amber-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs shadow-inner">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-amber-400 text-sm">#{o.id}</span>
                      <span className="text-slate-500 text-[10px]">({o.date})</span>
                    </div>
                    <p className="text-slate-300">მყიდველი: <b className="text-white">{o.customerName}</b> | 📞 {o.phone}</p>
                    <p className="text-slate-400 text-[11px]">📍 მისამართი: {o.address}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-end">
                    <div className="text-right">
                      <span className="font-black text-white text-base block">{formatPrice(o.totalGEL)}</span>
                      <span className="text-[10px] text-slate-400">სტატუსი: <b className="text-amber-400">{o.status || 'ახალი'}</b></span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => handlePrintInvoice(o)} 
                        title="ინვოისის ბეჭდვა"
                        className="bg-[#121216] hover:bg-[#1a1a20] text-amber-400 border border-amber-500/20 px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                      >
                        <Printer className="w-4 h-4" /> ბეჭდვა
                      </button>

                      <div className="flex items-center gap-1 bg-[#121216] p-1.5 rounded-2xl border border-amber-500/20">
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${o.status === 'ახალი' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ახალი</button>
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'მუშავდება')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${o.status === 'მუშავდება' ? 'bg-amber-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'დასრულებული')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${o.status === 'დასრულებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>დასრულებული</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Support Tab */}
      {adminTab === 'support' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
            <HelpCircle className="w-5 h-5 text-amber-400" /> მომხმარებელთა მხარდაჭერა და პასუხები ({supportTickets?.length || 0})
          </h3>
          <div className="space-y-4">
            {(!supportTickets || supportTickets.length === 0) ? (
              <p className="text-slate-500 text-xs py-8 text-center">მხარდაჭერის ტიგეტები არ არის.</p>
            ) : (
              supportTickets.map(t => (
                <div key={t.id} className="bg-[#08080a] p-6 rounded-3xl border border-amber-500/20 space-y-4 text-xs shadow-inner">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-amber-400 text-sm">#{t.id}</span>
                      <span className="text-white font-black text-sm">{t.subject}</span>
                      <span className="text-slate-500 text-[10px]">({t.date})</span>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 bg-[#121216] p-1.5 rounded-2xl border border-amber-500/20">
                        <button onClick={() => handleUpdateTicketStatus(t.id, 'ღია')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'ღია' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ღია</button>
                        <button onClick={() => handleUpdateTicketStatus(t.id, 'მუშავდება')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მუშავდება' ? 'bg-amber-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                        <button onClick={() => handleUpdateTicketStatus(t.id, 'მოგვარებული')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მოგვარებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მოგვარებული</button>
                      </div>
                      <button onClick={() => handleDeleteTicket(t.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-slate-300">მომხმარებელი: <b className="text-white">{t.customerName}</b> ({t.email})</p>
                    <p className="text-slate-200 bg-[#121216] p-4 rounded-2xl border border-amber-500/20 mt-2">
                      <b className="text-amber-400 block mb-1">კითხვა:</b> "{t.message}"
                    </p>
                  </div>

                  {t.reply && (
                    <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl space-y-1 shadow">
                      <b className="text-amber-400 block text-xs">ადმინისტრატორის პასუხი:</b>
                      <p className="text-slate-200">{t.reply}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <input 
                      type="text" 
                      placeholder="დაწერეთ პასუხი მომხმარებლისთვის..." 
                      value={replyInputs[t.id] !== undefined ? replyInputs[t.id] : ''}
                      onChange={e => setReplyInputs({...replyInputs, [t.id]: e.target.value})}
                      className="flex-1 bg-[#121216] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner"
                    />
                    <button 
                      onClick={() => handleSendTicketReply(t.id)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <Send className="w-4 h-4" /> გაგზავნა
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {adminTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-amber-400" /> ახალი პროდუქტის დამატება (დეტალები, ტეგები და გალერეა)
              </h3>
              <button 
                onClick={handleExportProducts}
                className="bg-[#121216] hover:bg-[#1a1a20] text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> პროდუქტების ექსპორტი (CSV)
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <input type="text" placeholder="პროდუქტის დასახელება *" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
                <input type="number" placeholder="ფასი GEL *" required value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
                <input type="number" placeholder="ძველი ფასი (სურვილისამებრ)" value={productForm.oldPriceGEL} onChange={e => setProductForm({...productForm, oldPriceGEL: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <select 
                  value={productForm.category} 
                  onChange={e => setProductForm({...productForm, category: e.target.value})} 
                  className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                >
                  {(categoriesList || []).map(cat => {
                    const cName = typeof cat === 'object' ? cat.name : cat;
                    return (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
                <input type="number" placeholder="მარაგი (რაოდენობა)" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
                <input type="text" placeholder="ვენდორი" value={productForm.vendor} onChange={e => setProductForm({...productForm, vendor: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" /> ტეგები (გამოყავით მძიმით, მაგ: HOT, NEW, 0% განვადება):
                </label>
                <input 
                  type="text" 
                  placeholder="მაგ: HOT, NEW, 0% განვადება" 
                  value={productForm.tags} 
                  onChange={e => setProductForm({...productForm, tags: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">პროდუქტის სრული აღწერა:</label>
                <textarea 
                  rows="3"
                  placeholder="დაწერეთ დეტალური ტექნიკური მახასიათებლები და აღწერა..." 
                  value={productForm.description} 
                  onChange={e => setProductForm({...productForm, description: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 resize-none shadow-inner" 
                />
              </div>

              <div className="space-y-3 bg-[#08080a] p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                <label className="text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-amber-400" /> აირჩიეთ ფოტოები გალერეიდან (მონიშნეთ რამდენიმე ერთად):
                </label>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-slate-400 text-xs file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-400 file:text-slate-950 hover:file:bg-amber-300 cursor-pointer" />
                
                {selectedImages.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pt-3 pb-1">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 bg-[#121216] border border-amber-500/20 rounded-2xl p-1.5 shrink-0 shadow-lg">
                        <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                        <button type="button" onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[11px] font-black flex items-center justify-center shadow cursor-pointer">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer text-xs">
                პროდუქტის შენახვა ტეგებითა და დეტალებით
              </button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base">პროდუქტების სწრაფი მართვა და მარაგები ({products?.length || 0})</h3>
              <div className="relative w-full sm:w-72">
                <input type="text" placeholder="ძებნა პროდუქტებში..." value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} className="w-full bg-[#08080a] border border-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-amber-400 shadow-inner" />
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-3.5">
              {filteredProducts?.map(p => (
                <div key={p.id} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-inner">
                  <div className="flex items-center gap-3.5">
                    <img src={p.image} alt="" className="w-14 h-14 object-contain bg-[#121216] p-1 rounded-2xl border border-amber-500/20 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">კატეგორია: {p.category} | SKU: {p.sku || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">ფასი (₾):</span>
                      <input 
                        type="number" 
                        value={p.priceGEL} 
                        onChange={e => handleQuickUpdateProduct(p.id, 'priceGEL', e.target.value)}
                        className="w-24 bg-[#121216] border border-amber-500/20 rounded-2xl p-2.5 text-amber-400 font-black text-center outline-none focus:border-amber-400 shadow-inner" 
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">მარაგი:</span>
                      <input 
                        type="number" 
                        value={p.stock !== undefined ? p.stock : 10} 
                        onChange={e => handleQuickUpdateProduct(p.id, 'stock', e.target.value)}
                        className="w-20 bg-[#121216] border border-amber-500/20 rounded-2xl p-2.5 text-white font-black text-center outline-none focus:border-amber-400 shadow-inner" 
                      />
                    </div>

                    <button onClick={() => handleDeleteProduct(p.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Discounts Tab */}
      {adminTab === 'discounts' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
            <Zap className="w-5 h-5 text-amber-400" /> მასობრივი ფლეშ-ფასდაკლებების გააქტიურება
          </h3>
          <form onSubmit={handleApplyFlashSale} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">ფასდაკლება პროცენტულად (%)</label>
                <input 
                  type="number" 
                  placeholder="მაგ: 20" 
                  required 
                  value={flashSaleForm.discountPercent} 
                  onChange={e => setFlashSaleForm({...flashSaleForm, discountPercent: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">კატეგორია</label>
                <select 
                  value={flashSaleForm.category} 
                  onChange={e => setFlashSaleForm({...flashSaleForm, category: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                >
                  <option value="ყველა">ყველა კატეგორია</option>
                  {(categoriesList || []).map(cat => {
                    const cName = typeof cat === 'object' ? cat.name : cat;
                    return (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer">
              <Zap className="w-4 h-4" /> ფასდაკლების მასობრივად გააქტიურება
            </button>
          </form>
        </div>
      )}

      {/* Logs Tab */}
      {adminTab === 'logs' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
            <Activity className="w-5 h-5 text-amber-400" /> სისტემური აქტივობების ჟურნალი (Audit Logs)
          </h3>
          <div className="space-y-3">
            {activityLogs.map(log => (
              <div key={log.id} className="bg-[#08080a] p-4 rounded-2xl border border-amber-500/20 flex justify-between items-center text-xs shadow-inner">
                <span className="font-bold text-slate-200">{log.action}</span>
                <span className="text-slate-500 text-[10px]">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcasts Tab */}
      {adminTab === 'broadcasts' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
            <Send className="w-5 h-5 text-amber-400" /> გლობალური შეტყობინების (Broadcast) გაგზავნა
          </h3>
          <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold">შეტყობინების სათაური</label>
              <input 
                type="text" 
                placeholder="მაგ: ახალი კოლექცია უკვე საიტზეა!" 
                required 
                value={broadcastForm.title} 
                onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} 
                className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400 font-bold">შეტყობინების ტექსტი</label>
              <textarea 
                rows="4"
                placeholder="დაწერეთ შეტყობინება, რომელიც გამოჩნდება მომხმარებლების პანელში..." 
                required 
                value={broadcastForm.message} 
                onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} 
                className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 resize-none shadow-inner" 
              />
            </div>
            <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer">
              <Send className="w-4 h-4" /> შეტყობინების გაგზავნა ყველა მომხმარებელს
            </button>
          </form>
        </div>
      )}

      {/* Banners Tab */}
      {adminTab === 'banners' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <Megaphone className="w-5 h-5 text-amber-400" /> ახალი სარეკლამო ბანერის დამატება
            </h3>
            <form onSubmit={handleAddBanner} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <input 
                  type="text" 
                  placeholder="სათაური (მაგ: ზაფხულის ფასდაკლება!)" 
                  required 
                  value={bannerForm.title} 
                  onChange={e => setBannerForm({...bannerForm, title: e.target.value})} 
                  className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
                <input 
                  type="text" 
                  placeholder="ქვესათაური / აღწერა" 
                  value={bannerForm.subtitle} 
                  onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} 
                  className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
              </div>
              <input 
                type="text" 
                placeholder="ბანერის ფოტოს URL (სურვილისამებრ)" 
                value={bannerForm.image} 
                onChange={e => setBannerForm({...bannerForm, image: e.target.value})} 
                className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
              />
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer">
                ბანერის დამატება
              </button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base">აქტიური ბანერები ({bannersList?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(bannersList || []).map(b => (
                <div key={b.id} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex justify-between items-center text-xs gap-3 shadow-inner">
                  <div className="flex items-center gap-3.5">
                    <img src={b.image} alt="" className="w-16 h-12 object-cover rounded-2xl border border-amber-500/20 shrink-0" />
                    <div>
                      <h4 className="font-black text-white text-sm">{b.title}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">{b.subtitle}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab with Icon Selection */}
      {adminTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <FolderTree className="w-5 h-5 text-amber-400" /> ახალი კატეგორიის დამატება და იკონის არჩევა
            </h3>
            
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <input 
                type="text" 
                placeholder="კატეგორიის დასახელება (მაგ: აქსესუარები)" 
                required 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
              />
              
              <select
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner cursor-pointer"
              >
                <option value="Smartphone">📱 სმარტფონი / ტელეფონი</option>
                <option value="Laptop">💻 ლაპტოპი / კომპიუტერი</option>
                <option value="Headphones">🎧 ყურსასმენი / აუდიო</option>
                <option value="Watch">⌚ საათი</option>
                <option value="Camera">📷 ფოტო / ვიდეო კამერა</option>
                <option value="Tv">📺 ტელევიზორი / მონიტორი</option>
                <option value="Speaker">🔊 დინამიკი</option>
                <option value="Gamepad2">🎮 გეიმინგი</option>
                <option value="Tablet">📱 ტაბლეტი</option>
                <option value="Sparkles">✨ ზოგადი / სხვა</option>
              </select>

              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer">
                კატეგორიის დამატება იკონით
              </button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base">არსებული კატეგორიები ({categoriesList?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(categoriesList || []).map((cat, idx) => {
                const cName = typeof cat === 'object' ? cat.name : cat;
                const cIcon = typeof cat === 'object' ? cat.icon : 'Sparkles';
                return (
                  <div key={idx} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex justify-between items-center text-xs shadow-inner">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">{cIcon}</span>
                      {cName}
                    </span>
                    <button onClick={() => handleDeleteCategory(cName)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {adminTab === 'coupons' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <Tag className="w-5 h-5 text-amber-400" /> ახალი კუპონის შექმნა
            </h3>
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <input type="text" placeholder="კოდი (მაგ: GEO2026)" required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 uppercase shadow-inner" />
              <input type="number" placeholder="ფასდაკლება % (მაგ: 15)" required value={couponForm.discountPercent} onChange={e => setCouponForm({...couponForm, discountPercent: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer">კუპონის დამატება</button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base">აქტიური კუპონები ({coupons?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(coupons || []).map(c => (
                <div key={c.id} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex justify-between items-center text-xs shadow-inner">
                  <div>
                    <h4 className="font-black text-amber-400 text-sm tracking-wider">{c.code}</h4>
                    <p className="text-slate-300 font-bold mt-0.5">ფასდაკლება: {c.discountPercent}%</p>
                  </div>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vendors Tab */}
      {adminTab === 'vendors' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <Store className="w-5 h-5 text-amber-400" /> ახალი ვენდორის დამატება და კომისია
            </h3>
            <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <input type="text" placeholder="ვენდორის სახელი *" required value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              <input type="number" placeholder="კომისია % (მაგ: 10)" required value={vendorForm.commission} onChange={e => setVendorForm({...vendorForm, commission: e.target.value})} className="bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <Percent className="w-4 h-4" /> ვენდორის დამატება
              </button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base">აქტიური ვენდორები ({vendorsList?.length || 0})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(vendorsList || []).map(v => (
                <div key={v.id} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex justify-between items-center text-xs shadow-inner">
                  <div>
                    <h4 className="font-bold text-white text-sm">{v.name}</h4>
                    <p className="text-amber-400 font-bold mt-0.5">კომისია: {v.commission}%</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[9px] font-black">{v.status}</span>
                    <button onClick={() => handleDeleteVendor(v.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {adminTab === 'users' && (
        <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-500/20 pb-4">
            <h3 className="font-black text-white text-base flex items-center gap-2.5">
              <Users className="w-5 h-5 text-amber-400" /> მომხმარებლების CRM მართვა ({usersList?.length || 0})
            </h3>
            <div className="relative w-full sm:w-72">
              <input type="text" placeholder="ძებნა სახელით ან ემაილით..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-[#08080a] border border-amber-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-amber-400 shadow-inner" />
              <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="space-y-3">
            {(!filteredUsers || filteredUsers.length === 0) ? (
              <p className="text-slate-500 text-xs py-8 text-center">მომხმარებლები ვერ მოიძებნა.</p>
            ) : (
              filteredUsers.map((u, i) => (
                <div key={u.id || i} className="bg-[#08080a] p-4 rounded-3xl border border-amber-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-inner">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{u.name}</h4>
                      {u.isVip && <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> VIP</span>}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">📧 {u.email} | 📞 {u.phone}</p>
                  </div>
                  <button onClick={() => handleToggleVipUser(u.id)} className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow ${u.isVip ? 'bg-amber-400 text-slate-950' : 'bg-[#121216] text-slate-300 border border-amber-500/20 hover:text-white'}`}>
                    <Star className="w-4 h-4" /> {u.isVip ? 'VIP სტატუსი მოხსნა' : 'VIP-ად მონიშვნა'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {adminTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <Settings className="w-5 h-5 text-amber-400" /> საიტის გლობალური პარამეტრები
            </h3>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">მაღაზიის დასახელება</label>
                <input type="text" value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">ზედა ზოლის ტექსტი (TopBar)</label>
                <input type="text" value={settingsForm.topBarText} onChange={e => setSettingsForm({...settingsForm, topBarText: e.target.value})} className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">მთავარი სათაური (Hero Title)</label>
                <input type="text" value={settingsForm.heroTitle} onChange={e => setSettingsForm({...settingsForm, heroTitle: e.target.value})} className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" />
              </div>
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer">
                პარამეტრების შენახვა
              </button>
            </form>
          </div>

          <div className="bg-[#0d0d10] border border-amber-500/30 p-8 rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-amber-500/20 pb-4">
              <Lock className="w-5 h-5 text-amber-400" /> ადმინისტრატორის სარეკვიზიტო მონაცემები (უსაფრთხოება)
            </h3>
            <form onSubmit={handleChangeAdminCredentials} autoComplete="off" className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">ახალი ადმინ სახელი (სურვილისამებრ)</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  placeholder="ახალი მომხმარებელი" 
                  value={passwordForm.newUsername} 
                  onChange={e => setPasswordForm({...passwordForm, newUsername: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">ახალი პაროლი (სურვილისამებრ)</label>
                <input 
                  type="password" 
                  autoComplete="new-password"
                  placeholder="ახალი საიდუმლო პაროლი" 
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" 
                />
              </div>
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition cursor-pointer">
                უსაფრთხოების მონაცემების განახლება
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
