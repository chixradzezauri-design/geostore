// src/components/AdminDashboardPro.jsx - Ultimate Full Elite Edition with Complete CRM & Variants
import React, { useState, useEffect } from 'react';
import { 
  Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut, 
  Plus, Trash2, Users, Store, Tag, Search, Star, Settings, Image as ImageIcon, Percent, Download, FolderTree, Megaphone, Send, Activity, Zap, Printer, Lock, HelpCircle,
  Smartphone, Laptop, Headphones, Watch, Tv, Speaker, Sparkles, Gamepad2, Tablet, LayoutDashboard, ShoppingCart, BarChart3, Truck, ShieldAlert, Footprints, Shirt, Gem, Cpu, ChevronRight, CornerDownRight, KeyRound, Fingerprint, Layers, UserX, UserCheck, Edit3 
} from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
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
  formatPrice,
  deliveryFees,
  setDeliveryFees
}) {
  const [adminTab, setAdminTab] = useState('analytics'); 
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [adminAuthSubMode, setAdminAuthSubMode] = useState('standard'); 
  const [adminPinCode, setAdminPinCode] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // 🌟 CRM ედიტირების მენეჯმენტი
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserDiscount, setEditUserDiscount] = useState('');
  const [editUserNotes, setEditUserNotes] = useState('');

  // 🌟 შეკვეთების რეალურ დროში წამოღება Supabase ბაზიდან ადმინ პანელისთვის
  const fetchAdminOrders = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (typeof setOrders === 'function') {
          setOrders(data.map(o => ({
            id: o.id,
            date: o.created_at ? new Date(o.created_at).toLocaleDateString('ka-GE') : 'დღეს',
            customerName: o.customer_name,
            user_email: o.user_email || '',
            phone: o.phone,
            address: o.address,
            totalGEL: Number(o.total_gel) || 0,
            status: o.status || 'ახალი',
            itemSummary: Array.isArray(o.items) ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'პროდუქტები'
          })));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchAdminOrders();
    const interval = setInterval(fetchAdminOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const safeCategories = React.useMemo(() => {
    try {
      if (!Array.isArray(categoriesList)) return [{ id: 'c1', name: 'სმარტფონები', icon: 'Smartphone', parentId: null }];
      return categoriesList.map((cat, idx) => {
        if (!cat) return null;
        if (typeof cat === 'string') {
          return { id: `cat-str-${idx}`, name: cat, icon: 'Shirt', parentId: null };
        }
        if (typeof cat === 'object') {
          return {
            id: cat.id || `cat-obj-${idx}`,
            name: cat.name || 'კატეგორია',
            icon: cat.icon || 'Shirt',
            parentId: cat.parentId || null
          };
        }
        return null;
      }).filter(Boolean);
    } catch {
      return [{ id: 'c1', name: 'სმარტფონები', icon: 'Smartphone', parentId: null }];
    }
  }, [categoriesList]);
  
  const productFormInitial = {
    name: '', category: safeCategories[0]?.name || 'სმარტფონები', priceGEL: '', oldPriceGEL: '', stock: '', vendor: 'GEOSTORE ოფიციალური', description: '', tags: '',
    material: '',
    durability: '',
    availableSizes: ['S', 'M', 'L', 'XL'],
    availableColors: ['შავი', 'თეთრი'],
    customAttributes: ''
  };
  const [productForm, setProductForm] = useState(productFormInitial);
  const [selectedImages, setSelectedImages] = useState([]);

  // 🌟 ვარიანტების მართვის სახელმწიფო (Variants Builder)
  const [productVariants, setProductVariants] = useState([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  const handleAddCustomVariant = (e) => {
    e.preventDefault();
    if (!newVarName.trim() || !newVarPrice) return;
    const varObj = {
      id: `var-${Date.now()}`,
      name: newVarName.trim(),
      priceGEL: Number(newVarPrice),
      stock: Number(newVarStock) || 10
    };
    setProductVariants(prev => [...prev, varObj]);
    setNewVarName('');
    setNewVarPrice('');
    setNewVarStock('');
  };

  const handleRemoveCustomVariant = (id) => {
    setProductVariants(prev => prev.filter(v => v.id !== id));
  };

  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', minOrderGEL: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', commission: '' });
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Shirt');
  const [selectedParentId, setSelectedParentId] = useState('');

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
        setSupportTickets((data || []).map(t => ({
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
    const interval = setInterval(fetchTickets, 4000);
    return () => clearInterval(interval);
  }, []);

  const [activityLogs, setActivityLogs] = useState([
    { id: 'l1', action: 'ადმინისტრატორი შევიდა სისტემაში', time: new Date().toLocaleTimeString('ka-GE') },
    { id: 'l2', action: 'სისტემის მონაცემები წარმატებით ჩაიტვირთა', time: new Date().toLocaleTimeString('ka-GE') }
  ]);

  const logActivity = (actionText) => {
    const newLog = {
      id: `log-${Date.now()}`,
      action: actionText,
      time: new Date().toLocaleTimeString('ka-GE') + ' (' + new Date().toLocaleDateString('ka-GE') + ')'
    };
    setActivityLogs(prev => [newLog, ...(prev || [])]);
  };

  const handleAdminPinSubmit = (e) => {
    e.preventDefault();
    const savedPinHash = localStorage.getItem('geostore_admin_pin') || btoa('1234'); 
    if (btoa(adminPinCode) === savedPinHash) {
      if (typeof setAdminLoggedIn === 'function') setAdminLoggedIn(true);
      setAdminPinError('');
      logActivity('ადმინისტრატორი შევიდა სისტემაში PIN-კოდით');
    } else {
      setAdminPinError('არასწორი PIN-კოდი! (ნაგულისხმევია: 1234)');
    }
  };

  const handleAdminBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      alert('თქვენი ბრაუზერი არ უზრუნველყოფს Passkeys-ს.');
      return;
    }
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array([9,8,7,6,5,4,3,2]),
          timeout: 60000,
          userVerification: "required"
        }
      });
      if (assertion) {
        if (typeof setAdminLoggedIn === 'function') setAdminLoggedIn(true);
        logActivity('ადმინისტრატორი შევიდა სისტემაში Face ID / Passkey-ით');
        alert('✅ Face ID ვერიფიკაცია წარმატებულია!');
      }
    } catch {
      alert('Face ID ავტორიზაცია გაუქმდა.');
    }
  };

  if (!adminLoggedIn) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900/80 border border-emerald-500/35 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-3xl text-center my-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-white tracking-tight">ადმინისტრატორის პანელი</h2>
          <p className="text-xs text-slate-400">აირჩიეთ ავტორიზაციის მეთოდი სისტემაში შესასვლელად</p>
        </div>

        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-emerald-500/20 text-[11px] font-bold">
          <button 
            type="button" 
            onClick={() => setAdminAuthSubMode('standard')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${adminAuthSubMode === 'standard' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            პაროლით
          </button>
          <button 
            type="button" 
            onClick={() => setAdminAuthSubMode('pin')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${adminAuthSubMode === 'pin' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <KeyRound className="w-3.5 h-3.5" /> PIN / Face ID
          </button>
        </div>

        {adminAuthSubMode === 'pin' ? (
          <form onSubmit={handleAdminPinSubmit} className="space-y-4 text-xs animate-in fade-in">
            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-300">
              შეიყვანეთ ადმინისტრატორის PIN-კოდი (ნაგულისხმევი: 1234):
            </div>
            {adminPinError && <p className="text-rose-400 font-bold">{adminPinError}</p>}
            
            <input 
              type="password" 
              maxLength="6"
              required
              placeholder="••••" 
              value={adminPinCode} 
              onChange={e => setAdminPinCode(e.target.value)} 
              className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 text-center text-lg tracking-widest text-emerald-400 font-black outline-none focus:border-emerald-400 shadow-inner" 
            />

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer text-xs">
              შესვლა PIN-კოდით
            </button>

            <button 
              type="button"
              onClick={handleAdminBiometricLogin}
              className="w-full bg-slate-950 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black py-3 rounded-2xl transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4 text-emerald-400" /> Face ID-ით / Passkey-ით შესვლა
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-4 text-xs animate-in fade-in">
            <input 
              type="text" 
              name="geo_admin_username_secure"
              autoComplete="off"
              placeholder="მომხმარებელი" 
              value={adminLoginForm?.username || ''} 
              onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
              className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 text-white outline-none focus:border-emerald-400 shadow-inner transition-all" 
            />
            <input 
              type="password" 
              name="geo_admin_password_secure"
              autoComplete="new-password"
              placeholder="პაროლი" 
              value={adminLoginForm?.password || ''} 
              onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
              className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 text-white outline-none focus:border-emerald-400 shadow-inner transition-all" 
            />

            <div className="flex items-center gap-2 text-left pt-1 px-1">
              <input 
                type="checkbox" 
                id="remMe" 
                checked={adminLoginForm?.remember || false} 
                onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
                className="rounded accent-emerald-400 cursor-pointer w-4 h-4" 
              />
              <label htmlFor="remMe" className="cursor-pointer text-xs text-slate-300 font-bold">მომიმახსოვრე სისტემაში</label>
            </div>

            {adminError && <p className="text-rose-400 text-xs font-bold pt-1">{adminError}</p>}

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer text-xs mt-2">
              სისტემაში შესვლა
            </button>
          </form>
        )}
      </div>
    );
  }

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cleanName = newCatName.trim();
    const catId = `cat-${Date.now()}`;
    
    const newCatObj = { 
      id: catId, 
      name: cleanName, 
      icon: newCatIcon, 
      parentId: selectedParentId || null 
    };

    const updatedCategories = [...safeCategories, newCatObj];
    if (typeof setCategoriesList === 'function') setCategoriesList(updatedCategories);
    try {
      localStorage.setItem('geostore_cats', JSON.stringify(updatedCategories));
    } catch {}

    setNewCatName('');
    setSelectedParentId('');
    logActivity(`დაემატა ${selectedParentId ? 'სუბკატეგორია' : 'მთავარი კატეგორია'}: ${cleanName}`);
    alert('✅ კატეგორია წარმატებით დაემატა!');
  };

  const handleDeleteCategory = (targetId, targetName) => {
    if (window.confirm(`ნამდვილად გსურთ კატეგორიის "${targetName}" წაშლა?`)) {
      const updatedCategories = safeCategories.filter(c => c.id !== targetId && c.parentId !== targetId);

      if (typeof setCategoriesList === 'function') setCategoriesList(updatedCategories);
      try {
        localStorage.setItem('geostore_cats', JSON.stringify(updatedCategories));
      } catch {}

      logActivity(`წაიშალა კატეგორია: ${targetName}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა ბაზიდან?')) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
          method: 'DELETE',
          headers
        });
        if (res.ok) {
          if (typeof setProducts === 'function') {
            setProducts(prev => (prev || []).filter(p => p.id !== id));
          }
          logActivity(`წაიშალა პროდუქტი ბაზიდან (ID: ${id})`);
          alert('✅ პროდუქტი წარმატებით წაიშალა!');
        } else {
          alert('შეცდომა ბაზიდან წაშლისას');
        }
      } catch {
        alert('ქსელის შეცდომა');
      }
    }
  };

  const handleQuickUpdateProduct = async (id, field, value) => {
    const val = field === 'priceGEL' || field === 'stock' ? Number(value) : value;
    
    if (typeof setProducts === 'function') {
      setProducts(prev => (prev || []).map(p => {
        if (p.id === id) {
          return { ...p, [field]: val };
        }
        return p;
      }));
    }

    const dbField = field === 'priceGEL' ? 'price_gel' : field;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ [dbField]: val })
      });
    } catch {}
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

  const handleToggleSizeSelection = (size) => {
    setProductForm(prev => {
      const current = prev.availableSizes || [];
      if (current.includes(size)) {
        return { ...prev, availableSizes: current.filter(s => s !== size) };
      } else {
        return { ...prev, availableSizes: [...current, size] };
      }
    });
  };

  const handleToggleColorSelection = (color) => {
    setProductForm(prev => {
      const current = prev.availableColors || [];
      if (current.includes(color)) {
        return { ...prev, availableColors: current.filter(c => c !== color) };
      } else {
        return { ...prev, availableColors: [...current, color] };
      }
    });
  };

  const handleCategoryChange = (catName) => {
    const nameLower = catName.toLowerCase();
    let defaultSizes = ['S', 'M', 'L', 'XL'];
    let defaultColors = ['შავი', 'თეთრი'];

    if (nameLower.includes('ფეხსაცმელ') || nameLower.includes('shoe')) {
      defaultSizes = ['38', '39', '40', '41', '42', '43', '44'];
    } else if (nameLower.includes('ტანსაცმელ') || nameLower.includes('ჩაცმა') || nameLower.includes('ქურთუკ') || nameLower.includes('შარვალ')) {
      defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    } else if (nameLower.includes('სმარტფონ') || nameLower.includes('ტელეფონ') || nameLower.includes('ელექტრონიკ') || nameLower.includes('ლეპტოპ')) {
      defaultSizes = ['64GB', '128GB', '256GB', '512GB', '1TB', '8GB RAM', '16GB RAM'];
      defaultColors = ['ტიტანი', 'ვერცხლისფერი', 'შავი', 'ოქროსფერი'];
    } else if (nameLower.includes('აქსესუარ') || nameLower.includes('საათ')) {
      defaultSizes = ['Standard / One Size'];
    }

    setProductForm(prev => ({
      ...prev,
      category: catName,
      availableSizes: defaultSizes,
      availableColors: defaultColors
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.priceGEL) return;

    const mainImage = selectedImages.length > 0 ? selectedImages[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
    const galleryImages = selectedImages.length > 0 ? selectedImages : [mainImage];
    const tagsArray = productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const defaultCat = safeCategories[0]?.name || 'სმარტფონები';

    const prodId = `prod-${Date.now()}`;
    const newProdPayload = {
      id: prodId,
      sku: `GEO-${Math.floor(1000 + Math.random() * 9000)}`,
      name: productForm.name,
      category: productForm.category || defaultCat,
      vendor: productForm.vendor || 'GEOSTORE ოფიციალური',
      price_gel: Number(productForm.priceGEL),
      old_price_gel: productForm.oldPriceGEL ? Number(productForm.oldPriceGEL) : null,
      stock: Number(productForm.stock) || 1,
      image: mainImage,
      gallery: galleryImages,
      description: productForm.description || '',
      available_sizes: productForm.availableSizes?.length > 0 ? productForm.availableSizes : ['S', 'M', 'L', 'XL'],
      available_colors: productForm.availableColors?.length > 0 ? productForm.availableColors : ['შავი', 'თეთრი'],
      variants: productVariants,
      material: productForm.material || '',
      durability: productForm.durability || ''
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newProdPayload)
      });

      if (res.ok) {
        const localProdObject = {
          id: prodId,
          sku: newProdPayload.sku,
          name: newProdPayload.name,
          category: newProdPayload.category,
          vendor: newProdPayload.vendor,
          priceGEL: newProdPayload.price_gel,
          oldPriceGEL: newProdPayload.old_price_gel,
          stock: newProdPayload.stock,
          image: newProdPayload.image,
          gallery: galleryImages,
          description: newProdPayload.description,
          availableSizes: newProdPayload.available_sizes,
          availableColors: newProdPayload.available_colors,
          variants: productVariants,
          material: newProdPayload.material,
          durability: newProdPayload.durability,
          tags: tagsArray
        };

        if (typeof setProducts === 'function') {
          setProducts(prev => [localProdObject, ...(prev || [])]);
        }
        setProductForm(productFormInitial);
        setSelectedImages([]);
        setProductVariants([]);
        logActivity(`დაემატა ახალი პროდუქტი ვარიანტებით: ${newProdPayload.name}`);
        alert('✅ პროდუქტი და მისი ვარიანტები წარმატებით შეინახა ბაზაში!');
      } else {
        const err = await res.text();
        alert('შეცდომა ბაზაში შენახვისას: ' + err);
      }
    } catch {
      alert('ქსელის შეცდომა სერვერთან მიერთებისას');
    }
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

    if (typeof setProducts === 'function') {
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
    }

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
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
            .store-name { font-size: 24px; font-weight: 900; color: #059669; }
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
                <th>პროდუქტი / ვარიანტი</th>
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
            სულ გადასახდელი: ${typeof formatPrice === 'function' ? formatPrice(order.totalGEL) : order.totalGEL + ' ₾'}
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
    if (typeof setCoupons === 'function') {
      setCoupons(prev => [newC, ...(prev || [])]);
    }
    setCouponForm({ code: '', discountPercent: '', minOrderGEL: '' });
    logActivity(`შეიქმნა ახალი კუპონი: ${newC.code}`);
  };

  const handleDeleteCoupon = (id) => {
    if (typeof setCoupons === 'function') {
      setCoupons(prev => (prev || []).filter(c => c.id !== id));
    }
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
    if (typeof setVendorsList === 'function') {
      setVendorsList(prev => [...(prev || []), newV]);
    }
    setVendorForm({ name: '', commission: '' });
    logActivity(`დაემატა ახალი ვენდორი: ${newV.name}`);
    alert('✅ ვენდორი წარმატებით დაემატა!');
  };

  const handleDeleteVendor = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ვენდორის წაშლა?')) {
      if (typeof setVendorsList === 'function') {
        setVendorsList(prev => (prev || []).filter(v => v.id !== id));
      }
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
    if (typeof setBannersList === 'function') {
      setBannersList(prev => [...(prev || []), newB]);
    }
    setBannerForm({ title: '', subtitle: '', image: '', link: '' });
    logActivity(`დაემატა ბანერი: ${newB.title}`);
    alert('✅ სარეკლამო ბანერი წარმატებით დაემატა!');
  };

  const handleDeleteBanner = (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ბანერის წაშლა?')) {
      if (typeof setBannersList === 'function') {
        setBannersList(prev => (prev || []).filter(b => b.id !== id));
      }
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

  // 🌟 განახლებული შეკვეთის სტატუსის მართვის ფუნქცია (ბაზისა და ლოკალის ერთდროული განახლებით)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        if (typeof setOrders === 'function') {
          setOrders(prev => (prev || []).map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
        
        try {
          const localOrders = JSON.parse(localStorage.getItem('geostore_local_orders') || '[]');
          const updatedLocal = localOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
          localStorage.setItem('geostore_local_orders', JSON.stringify(updatedLocal));
        } catch {}

        logActivity(`შეკვეთის #${orderId} სტატუსი შეიცვალა: ${newStatus}`);
      } else {
        alert('ვერ მოხერხდა ბაზაში სტატუსის განახლება');
      }
    } catch {
      alert('ქსელის შეცდომა სტატუსის შეცვლისას');
    }
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

  // 🌟 CRM მომხმარებელთა მართვის ფუნქციები:
  const handleToggleVipUser = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => (u.id === userId || u.email === userId) ? { ...u, isVip: !u.isVip } : u));
    }
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) VIP სტატუსი`);
  };

  const handleToggleBlockUser = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => (u.id === userId || u.email === userId) ? { ...u, isBlocked: !u.isBlocked } : u));
    }
    logActivity(`შეიცვალა მომხმარებლის (ID: ${userId}) ბლოკირების სტატუსი`);
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`ნამდვილად გსურთ მომხმარებლის "${userName || userId}" წაშლა სისტემიდან?`)) {
      if (typeof setUsersList === 'function') {
        setUsersList(prev => (prev || []).filter(u => u.id !== userId && u.email !== userId));
      }
      logActivity(`წაიშალა მომხმარებელი: ${userName || userId}`);
    }
  };

  const handleSaveUserCrm = (userId) => {
    if (typeof setUsersList === 'function') {
      setUsersList(prev => (prev || []).map(u => {
        if (u.id === userId || u.email === userId) {
          return {
            ...u,
            discountPercent: Number(editUserDiscount) || 0,
            adminNotes: editUserNotes
          };
        }
        return u;
      }));
    }
    setEditingUserId(null);
    setEditUserDiscount('');
    setEditUserNotes('');
    logActivity(`განახლდა CRM მონაცემები მომხმარებლისთვის (ID: ${userId})`);
    alert('✅ მომხმარებლის მონაცემები წარმატებით განახლდა!');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (typeof setSiteSettings === 'function') {
      setSiteSettings(siteSettings);
    }
    try { localStorage.setItem('geostore_site_settings', JSON.stringify(siteSettings)); } catch {}
    logActivity('განახლდა საიტის გლობალური პარამეტრები');
    alert('საიტის პარამეტრები წარმატებით განახლდა!');
  };

  const filteredUsers = (usersList || []).filter(u => 
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.phone?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const mainCategories = safeCategories.filter(c => !c.parentId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 w-full pb-16 items-start px-2 sm:px-0">
      
      {/* 🧭 SIDEBAR NAVIGATION MENU */}
      <div className="w-full lg:w-72 bg-slate-900/80 border border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-2xl backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-3.5 pb-4 border-b border-emerald-500/20">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl shadow-inner">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm">GEOSTORE Admin</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Database Edition</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            { id: 'analytics', label: '📊 ანალიტიკა', icon: BarChart3 },
            { id: 'orders', label: '📦 შეკვეთები', count: orders?.length || 0, icon: PackageCheck },
            { id: 'products', label: '🏷️ პროდუქტები & ვარიანტები', count: products?.length || 0, icon: Store },
            { id: 'support', label: '💬 მხარდაჭერა', count: supportTickets?.filter(t => t.status === 'ღია' || t.status === 'მუშავდება')?.length || 0, icon: HelpCircle },
            { id: 'discounts', label: '⚡ ფლეშ-აქციები', icon: Zap },
            { id: 'logs', label: '📋 აქტივობები', count: activityLogs?.length || 0, icon: Activity },
            { id: 'broadcasts', label: '📢 შეტყობინებები', icon: Send },
            { id: 'banners', label: '🖼️ ბანერები', count: bannersList?.length || 0, icon: Megaphone },
            { id: 'categories', label: '📂 კატეგორიები & სუბკატეგორიები', count: safeCategories.length, icon: FolderTree },
            { id: 'coupons', label: '🎫 კუპონები', count: coupons?.length || 0, icon: Tag },
            { id: 'vendors', label: '🏪 ვენდორები', count: vendorsList?.length || 0, icon: Store },
            { id: 'users', label: '👥 CRM მომხმარებლები', count: usersList?.length || 0, icon: Users },
            { id: 'settings', label: '⚙️ პარამეტრები', icon: Settings }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = adminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`w-full px-3.5 sm:px-4 py-3 rounded-2xl font-black text-xs transition-all duration-300 flex items-center justify-between cursor-pointer shadow-sm ${
                  isActive 
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-102' 
                    : 'bg-slate-950/60 text-slate-400 border border-emerald-500/10 hover:text-white hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-900 text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => { if (typeof setAdminLoggedIn === 'function') setAdminLoggedIn(false); localStorage.removeItem('geostore_admin_remember'); }} 
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-4"
        >
          <LogOut className="w-4 h-4" /> სისტემიდან გასვლა
        </button>
      </div>

      {/* 🖥️ MAIN CONTENT AREA */}
      <div className="flex-1 w-full space-y-6">

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/80 border border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 gap-4 shadow-2xl backdrop-blur-3xl">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">მოგესალმებით, ადმინისტრატორ! 👋</h2>
            <p className="text-xs text-slate-400 mt-0.5">სრული კონტროლი მაღაზიის მართვის პანელზე:</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/60 border border-emerald-500/20 px-4 py-2.5 rounded-2xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-bold">CRM & Database აქტიურია</span>
          </div>
        </div>

        {/* Analytics Tab */}
        {adminTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> სრული შემოსავალი</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400">{typeof formatPrice === 'function' ? formatPrice(proAnalytics?.totalRevenueGEL || 0) : (proAnalytics?.totalRevenueGEL || 0) + ' ₾'}</p>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">რეალური ბაზიდან</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-cyan-400" /> სავარაუდო წმინდა მოგება</p>
                <p className="text-2xl sm:text-3xl font-black text-cyan-400">{typeof formatPrice === 'function' ? formatPrice(proAnalytics?.netProfitGEL || 0) : (proAnalytics?.netProfitGEL || 0) + ' ₾'}</p>
                <span className="text-[10px] text-cyan-500 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md">მარჟა ~25%</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><PackageCheck className="w-4 h-4 text-emerald-300" /> სულ შეკვეთები</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-300">{proAnalytics?.totalOrdersCount || 0}</p>
                <span className="text-[10px] text-emerald-300/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">დადასტურებული</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-2 shadow-2xl backdrop-blur-2xl">
                <p className="text-slate-400 text-xs font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> რეგისტრირებული მომხმარებლები</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-400">{usersList?.length || 0}</p>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">აქტიური ბაზა</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
                <h3 className="font-black text-white text-base flex items-center gap-2.5">
                  <PackageCheck className="w-5 h-5 text-emerald-400" /> ბოლო შეკვეთები ვიტრინიდან
                </h3>
                <button onClick={() => setAdminTab('orders')} className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer">ყველას ნახვა →</button>
              </div>

              <div className="space-y-3">
                {(!orders || orders.length === 0) ? (
                  <p className="text-slate-500 text-xs py-6 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
                ) : (
                  orders.slice(0, 5).map(o => (
                    <div key={o.id} className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-inner">
                      <div>
                        <span className="font-black text-emerald-400">#{o.id}</span>
                        <span className="text-white font-bold ml-2 sm:ml-3">{o.customerName}</span>
                        <span className="text-slate-500 text-[10px] ml-2">({o.date})</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        <span className="font-black text-white">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL) : o.totalGEL + ' ₾'}</span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] font-bold">{o.status || 'ახალი'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {adminTab === 'orders' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-emerald-400" /> შეკვეთების მართვა და სტატუსები
              </h3>
              <button 
                onClick={handleExportOrders}
                className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> შეკვეთების ექსპორტი (CSV)
              </button>
            </div>

            <div className="space-y-4">
              {(!orders || orders.length === 0) ? (
                <p className="text-slate-500 text-xs py-6 text-center">შეკვეთები ჯერ არ ფიქსირდება.</p>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-slate-950/60 p-4 sm:p-5 rounded-3xl border border-emerald-500/20 flex flex-col gap-4 text-xs shadow-inner">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="font-black text-emerald-400 text-sm">#{o.id}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({o.date})</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-black text-white text-base">{typeof formatPrice === 'function' ? formatPrice(o.totalGEL) : o.totalGEL + ' ₾'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-300">
                      <p>მყიდველი: <b className="text-white">{o.customerName}</b> | 📞 {o.phone}</p>
                      <p className="text-slate-400 text-[11px]">📍 მისამართი: {o.address}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">სტატუსი:</span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] font-bold">
                          {o.status || 'ახალი'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        <button 
                          onClick={() => handlePrintInvoice(o)} 
                          title="ინვოისის ბეჭდვა"
                          className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow"
                        >
                          <Printer className="w-4 h-4" /> ბეჭდვა
                        </button>

                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-emerald-500/20 overflow-x-auto max-w-full">
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition whitespace-nowrap ${o.status === 'ახალი' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ახალი</button>
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'მუშავდება')} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition whitespace-nowrap ${o.status === 'მუშავდება' ? 'bg-emerald-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                          <button onClick={() => handleUpdateOrderStatus(o.id, 'დასრულებული')} className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition whitespace-nowrap ${o.status === 'დასრულებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>დასრულებული</button>
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
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <HelpCircle className="w-5 h-5 text-emerald-400" /> მომხმარებელთა მხარდაჭერა და პასუხები ({supportTickets?.length || 0})
            </h3>
            <div className="space-y-4">
              {(!supportTickets || supportTickets.length === 0) ? (
                <p className="text-slate-500 text-xs py-8 text-center">მხარდაჭერის ტიგეტები არ არის.</p>
              ) : (
                supportTickets.map(t => (
                  <div key={t.id} className="bg-slate-950/60 p-5 sm:p-6 rounded-3xl border border-emerald-500/20 space-y-4 text-xs shadow-inner">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-emerald-400 text-sm">#{t.id}</span>
                        <span className="text-white font-black text-sm">{t.subject}</span>
                        <span className="text-slate-500 text-[10px]">({t.date})</span>
                      </div>
                      
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-emerald-500/20">
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'ღია')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'ღია' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>ღია</button>
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'მუშავდება')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მუშავდება' ? 'bg-emerald-500/80 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მუშავდება</button>
                          <button onClick={() => handleUpdateTicketStatus(t.id, 'მოგვარებული')} className={`px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition ${t.status === 'მოგვარებული' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>მოგვარებული</button>
                        </div>
                        <button onClick={() => handleDeleteTicket(t.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-slate-300">მომხმარებელი: <b className="text-white">{t.customerName}</b> ({t.email})</p>
                      <p className="text-slate-200 bg-slate-950 p-4 rounded-2xl border border-emerald-500/20 mt-2">
                        <b className="text-emerald-400 block mb-1">კითხვა:</b> "{t.message}"
                      </p>
                    </div>

                    {t.reply && (
                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-1 shadow">
                        <b className="text-emerald-400 block text-xs">ადმინისტრატორის პასუხი:</b>
                        <p className="text-slate-200">{t.reply}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <input 
                        type="text" 
                        placeholder="დაწერეთ პასუხი მომხმარებლისთვის..." 
                        value={replyInputs[t.id] !== undefined ? replyInputs[t.id] : ''}
                        onChange={e => setReplyInputs({...replyInputs, [t.id]: e.target.value})}
                        className="flex-1 bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                      />
                      <button 
                        onClick={() => handleSendTicketReply(t.id)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
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

        {/* Products Tab with Dynamic Category & Variants Builder */}
        {adminTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                <h3 className="font-black text-white text-base flex items-center gap-2.5">
                  <Plus className="w-5 h-5 text-emerald-400" /> ახალი პროდუქტის დამატება (დინამიური ვარიანტებით)
                </h3>
                <button 
                  onClick={handleExportProducts}
                  className="bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" /> პროდუქტების ექსპორტი (CSV)
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <input type="text" placeholder="პროდუქტის დასახელება *" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="number" placeholder="საბაზისო ფასი GEL *" required value={productForm.priceGEL} onChange={e => setProductForm({...productForm, priceGEL: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="number" placeholder="ძველი ფასი (სურვილისამებრ)" value={productForm.oldPriceGEL} onChange={e => setProductForm({...productForm, oldPriceGEL: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <select 
                    value={productForm.category} 
                    onChange={e => handleCategoryChange(e.target.value)} 
                    className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-emerald-400 font-bold outline-none focus:border-emerald-400 shadow-inner cursor-pointer"
                  >
                    {safeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <input type="number" placeholder="ზოგადი მარაგი" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="text" placeholder="მომწოდებელი / ბრენდი" value={productForm.vendor} onChange={e => setProductForm({...productForm, vendor: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>

                {/* 🌟 კატეგორიაზე მორგებული ზომები */}
                <div className="bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 space-y-2">
                  <label className="text-emerald-400 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>ზომები / მეხსიერება კატეგორიისთვის: <span className="text-white underline">{productForm.category}</span></span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '64GB', '128GB', '256GB', '512GB', '1TB', '8GB RAM', '16GB RAM', 'Standard / One Size'].map(sz => {
                      const isSelected = productForm.availableSizes?.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleToggleSizeSelection(sz)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer border ${isSelected ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-emerald-500/20 hover:text-white'}`}
                        >
                          {isSelected ? '✓ ' : '+ '}{sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🌟 ფერების ასორტიმენტი */}
                <div className="bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 space-y-2">
                  <label className="text-emerald-400 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>ხელმისაწვდომი ფერები:</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['შავი', 'თეთრი', 'ტიტანი', 'ვერცხლისფერი', 'ოქროსფერი', 'ლურჯი', 'წითელი', 'მწვანე', 'ნაცრისფერი'].map(col => {
                      const isSelected = productForm.availableColors?.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleToggleColorSelection(col)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer border ${isSelected ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow' : 'bg-slate-900 text-slate-400 border-emerald-500/20 hover:text-white'}`}
                        >
                          {isSelected ? '✓ ' : '+ '}{col}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🌟 ხელით შექმნილი ვარიანტები (Variants Builder) */}
                <div className="bg-slate-950 p-4 rounded-3xl border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-amber-400 font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>ინდივიდუალური ვარიანტების დამატება (ფასი & მარაგი თითოეულისთვის)</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">მაგალითად: "128GB / ტიტანი" ან "XL ზომა / შავი" თავისი ინდივიდუალური ფასითა და მარაგით.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                    <input 
                      type="text" 
                      placeholder="ვარიანტის სახელი (მაგ: 256GB / შავი)" 
                      value={newVarName} 
                      onChange={e => setNewVarName(e.target.value)} 
                      className="bg-slate-900 border border-emerald-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                    />
                    <input 
                      type="number" 
                      placeholder="ფასი (GEL)" 
                      value={newVarPrice} 
                      onChange={e => setNewVarPrice(e.target.value)} 
                      className="bg-slate-900 border border-emerald-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                    />
                    <input 
                      type="number" 
                      placeholder="მარაგი" 
                      value={newVarStock} 
                      onChange={e => setNewVarStock(e.target.value)} 
                      className="bg-slate-900 border border-emerald-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddCustomVariant}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl transition cursor-pointer text-xs"
                    >
                      + ვარიანტის დამატება
                    </button>
                  </div>

                  {productVariants.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {productVariants.map(v => (
                        <div key={v.id} className="bg-slate-900 p-3 rounded-2xl border border-emerald-500/20 flex justify-between items-center text-xs">
                          <div>
                            <b className="text-white">{v.name}</b>
                            <span className="text-emerald-400 font-bold ml-3">{v.priceGEL} ₾</span>
                            <span className="text-slate-400 ml-2">(მარაგი: {v.stock})</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveCustomVariant(v.id)} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input 
                    type="text" 
                    placeholder="მასალა / შემადგენლობა" 
                    value={productForm.material} 
                    onChange={e => setProductForm({...productForm, material: e.target.value})} 
                    className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
                  />
                  <input 
                    type="text" 
                    placeholder="მოვლა / მდგრადობა" 
                    value={productForm.durability} 
                    onChange={e => setProductForm({...productForm, durability: e.target.value})} 
                    className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" /> ტეგები (გამოყავით მძიმით):
                  </label>
                  <input 
                    type="text" 
                    placeholder="მაგ: NEW, HOT, SALE" 
                    value={productForm.tags} 
                    onChange={e => setProductForm({...productForm, tags: e.target.value})} 
                    className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">პროდუქტის სრული აღწერა:</label>
                  <textarea 
                    rows="3"
                    placeholder="დაწერეთ დეტალური აღწერა..." 
                    value={productForm.description} 
                    onChange={e => setProductForm({...productForm, description: e.target.value})} 
                    className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 resize-none shadow-inner" 
                  />
                </div>

                <div className="space-y-3 bg-slate-950 p-5 rounded-3xl border border-emerald-500/20 shadow-inner">
                  <label className="text-slate-300 font-bold flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-emerald-400" /> აირჩიეთ ფოტოები გალერეიდან:
                  </label>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full text-slate-400 text-xs file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer" />
                  
                  {selectedImages.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pt-3 pb-1">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 bg-slate-900 border border-emerald-500/20 rounded-2xl p-1.5 shrink-0 shadow-lg">
                          <img src={img} alt="" className="w-full h-full object-contain rounded-xl" />
                          <button type="button" onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[11px] font-black flex items-center justify-center shadow cursor-pointer">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer text-xs">
                  პროდუქტის ბაზაში შენახვა ვარიანტებით 🚀
                </button>
              </form>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
                <h3 className="font-black text-white text-base">ბაზაში არსებული პროდუქტები ({products?.length || 0})</h3>
                <div className="relative w-full sm:w-72">
                  <input type="text" placeholder="ძებნა პროდუქტებში..." value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="space-y-3.5">
                {filteredProducts?.map(p => (
                  <div key={p.id} className="bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-inner">
                    <div className="flex items-center gap-3.5">
                      <img src={p.image} alt="" className="w-14 h-14 object-contain bg-slate-950 p-1 rounded-2xl border border-emerald-500/20 shrink-0" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <p className="text-slate-400 text-[11px] mt-0.5">კატეგორია: {p.category} | SKU: {p.sku || 'N/A'} {p.variants?.length > 0 ? `| ვარიანტები: ${p.variants.length}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">ფასი (₾):</span>
                        <input 
                          type="number" 
                          value={p.priceGEL} 
                          onChange={e => handleQuickUpdateProduct(p.id, 'priceGEL', e.target.value)}
                          className="w-24 bg-slate-950 border border-emerald-500/20 rounded-2xl p-2.5 text-emerald-400 font-black text-center outline-none focus:border-emerald-400 shadow-inner" 
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">მარაგი:</span>
                        <input 
                          type="number" 
                          value={p.stock !== undefined ? p.stock : 10} 
                          onChange={e => handleQuickUpdateProduct(p.id, 'stock', e.target.value)}
                          className="w-20 bg-slate-950 border border-emerald-500/20 rounded-2xl p-2.5 text-white font-black text-center outline-none focus:border-emerald-400 shadow-inner" 
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

        {adminTab === 'discounts' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Zap className="w-5 h-5 text-emerald-400" /> მასობრივი ფლეშ-ფასდაკლებების გააქტიურება
            </h3>
            <form onSubmit={handleApplyFlashSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">ფასდაკლება პროცენტულად (%)</label>
                  <input type="number" placeholder="მაგ: 20" required value={flashSaleForm.discountPercent} onChange={e => setFlashSaleForm({...flashSaleForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">კატეგორია</label>
                  <select value={flashSaleForm.category} onChange={e => setFlashSaleForm({...flashSaleForm, category: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer">
                    <option value="ყველა">ყველა კატეგორია</option>
                    {safeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer">
                <Zap className="w-4 h-4" /> ფასდაკლების მასობრივად გააქტიურება
              </button>
            </form>
          </div>
        )}

        {adminTab === 'logs' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Activity className="w-5 h-5 text-emerald-400" /> სისტემური აქტივობების ჟურნალი (Audit Logs)
            </h3>
            <div className="space-y-3">
              {activityLogs.map(log => (
                <div key={log.id} className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-inner">
                  <span className="font-bold text-slate-200">{log.action}</span>
                  <span className="text-slate-500 text-[10px]">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'broadcasts' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
              <Send className="w-5 h-5 text-emerald-400" /> გლობალური შეტყობინების (Broadcast) გაგზავნა
            </h3>
            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">შეტყობინების სათაური</label>
                <input type="text" placeholder="მაგ: ახალი კოლექცია უკვე საიტზეა!" required value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold">შეტყობინების ტექსტი</label>
                <textarea rows="4" placeholder="დაწერეთ შეტყობინება..." required value={broadcastForm.message} onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 resize-none shadow-inner" />
              </div>
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer">
                <Send className="w-4 h-4" /> შეტყობინების გაგზავნა ყველა მომხმარებელს
              </button>
            </form>
          </div>
        )}

        {adminTab === 'banners' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Megaphone className="w-5 h-5 text-emerald-400" /> ახალი სარეკლამო ბანერის დამატება
              </h3>
              <form onSubmit={handleAddBanner} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input type="text" placeholder="სათაური" required value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                  <input type="text" placeholder="ქვესათაური / აღწერა" value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <input type="text" placeholder="ბანერის ფოტოს URL" value={bannerForm.image} onChange={e => setBannerForm({...bannerForm, image: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">ბანერის დამატება</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური ბანერები ({bannersList?.length || 0})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(bannersList || []).map(b => (
                  <div key={b.id} className="bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs gap-3 shadow-inner">
                    <div className="flex items-center gap-3.5">
                      <img src={b.image} alt="" className="w-16 h-12 object-cover rounded-2xl border border-emerald-500/20 shrink-0" />
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

        {adminTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <FolderTree className="w-5 h-5 text-emerald-400" /> მთავარი კატეგორიის ან სუბკატეგორიის დამატება
              </h3>
              <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
                <input type="text" placeholder="სახელწოდება *" required value={newCatName} onChange={e => setNewCatName(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <select value={selectedParentId} onChange={e => setSelectedParentId(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer font-bold">
                  <option value="">📁 მთავარი კატეგორია (Parent)</option>
                  {mainCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>↳ ქვეშ: {cat.name}</option>
                  ))}
                </select>
                <select value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer">
                  <option value="Shirt">👕 ტანსაცმელი</option>
                  <option value="Footprints">👟 ფეხსაცმელი</option>
                  <option value="Gem">💎 აქსესუარები</option>
                  <option value="Smartphone">📱 სმარტფონი</option>
                  <option value="Laptop">💻 ლეპტოპი</option>
                  <option value="Watch">⌚ საათი</option>
                  <option value="Sparkles">✨ სხვა</option>
                </select>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">დამატება</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">კატეგორიებისა და სუბკატეგორიების იერარქია</h3>
              <div className="space-y-4">
                {mainCategories.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">მთავარი კატეგორიები არ არის.</p>
                ) : (
                  mainCategories.map(parentCat => {
                    const subCats = safeCategories.filter(c => c.parentId === parentCat.id);
                    return (
                      <div key={parentCat.id} className="bg-slate-950/60 border border-emerald-500/20 rounded-3xl p-5 space-y-3 shadow-inner">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">📁 მთავარი</span>
                            <h4 className="font-black text-white text-sm">{parentCat.name}</h4>
                          </div>
                          <button onClick={() => handleDeleteCategory(parentCat.id, parentCat.name)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        {subCats.length > 0 && (
                          <div className="pl-6 border-l-2 border-emerald-500/30 space-y-2 pt-1">
                            {subCats.map(sub => (
                              <div key={sub.id} className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/15 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-200 flex items-center gap-2">
                                  <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" /> {sub.name}
                                </span>
                                <button onClick={() => handleDeleteCategory(sub.id, sub.name)} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'coupons' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Tag className="w-5 h-5 text-emerald-400" /> ახალი კუპონის შექმნა
              </h3>
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <input type="text" placeholder="კოდი" required value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 uppercase shadow-inner" />
                <input type="number" placeholder="ფასდაკლება %" required value={couponForm.discountPercent} onChange={e => setCouponForm({...couponForm, discountPercent: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">კუპონის დამატება</button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური კუპონები ({coupons?.length || 0})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(coupons || []).map(c => (
                  <div key={c.id} className="bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs shadow-inner">
                    <div>
                      <h4 className="font-black text-emerald-400 text-sm tracking-wider">{c.code}</h4>
                      <p className="text-slate-300 font-bold mt-0.5">ფასდაკლება: {c.discountPercent}%</p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'vendors' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Store className="w-5 h-5 text-emerald-400" /> ახალი ვენდორის დამატება და კომისია
              </h3>
              <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <input type="text" placeholder="ვენდორის სახელი *" required value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <input type="number" placeholder="კომისია %" required value={vendorForm.commission} onChange={e => setVendorForm({...vendorForm, commission: e.target.value})} className="bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5">
                  <Percent className="w-4 h-4" /> ვენდორის დამატება
                </button>
              </form>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base">აქტიური ვენდორები ({vendorsList?.length || 0})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(vendorsList || []).map(v => (
                  <div key={v.id} className="bg-slate-950/60 p-4 rounded-3xl border border-emerald-500/20 flex justify-between items-center text-xs shadow-inner">
                    <div>
                      <h4 className="font-bold text-white text-sm">{v.name}</h4>
                      <p className="text-emerald-400 font-bold mt-0.5">კომისია: {v.commission}%</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[9px] font-black">{v.status}</span>
                      <button onClick={() => handleDeleteVendor(v.id)} className="text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-2xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🌟 FULL CRM USERS MANAGEMENT TAB */}
        {adminTab === 'users' && (
          <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" /> მრავალფუნქციური CRM მომხმარებლები ({usersList?.length || 0})
              </h3>
              <div className="relative w-full sm:w-72">
                <input type="text" placeholder="ძებნა სახელით, ემაილით ან ტელეფონით..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 shadow-inner" />
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-4">
              {(!filteredUsers || filteredUsers.length === 0) ? (
                <p className="text-slate-500 text-xs py-8 text-center">მომხმარებლები ვერ მოიძებნა.</p>
              ) : (
                filteredUsers.map((u, i) => {
                  const uId = u.id || u.email || i;
                  const isEditing = editingUserId === uId;

                  return (
                    <div key={uId} className={`bg-slate-950/60 p-5 rounded-3xl border transition space-y-3 shadow-inner ${u.isBlocked ? 'border-rose-500/40 bg-rose-950/10' : 'border-emerald-500/20'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-black text-white text-sm">{u.name}</h4>
                            {u.isVip && <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1"><Star className="w-3 h-3 fill-emerald-400" /> VIP</span>}
                            {u.isBlocked && <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">დაბლოკილი</span>}
                            {u.discountPercent > 0 && <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black">ფასდაკლება: {u.discountPercent}%</span>}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-1">📧 {u.email} | 📞 {u.phone || 'მითითებული არ არის'}</p>
                          {u.adminNotes && <p className="text-amber-300 text-[11px] mt-1 italic">📝 შენიშვნა: "{u.adminNotes}"</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => handleToggleVipUser(u.id || u.email)} 
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow ${u.isVip ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-emerald-500/20 hover:text-white'}`}
                            title="VIP სტატუსი"
                          >
                            <Star className="w-3.5 h-3.5" /> {u.isVip ? 'VIP მოხსნა' : 'VIP მინიჭება'}
                          </button>

                          <button 
                            onClick={() => handleToggleBlockUser(u.id || u.email)} 
                            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow ${u.isBlocked ? 'bg-rose-500 text-white' : 'bg-slate-900 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10'}`}
                            title="ბლოკირება / განბლოკვა"
                          >
                            {u.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {u.isBlocked ? 'განბლოკვა' : 'დაბლოკვა'}
                          </button>

                          <button 
                            onClick={() => {
                              if (isEditing) {
                                setEditingUserId(null);
                              } else {
                                setEditingUserId(uId);
                                setEditUserDiscount(u.discountPercent || '');
                                setEditUserNotes(u.adminNotes || '');
                              }
                            }} 
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/20 rounded-xl cursor-pointer transition"
                            title="პერსონალური ფასდაკლება & შენიშვნები"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => handleDeleteUser(u.id || u.email, u.name)} 
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl cursor-pointer transition"
                            title="მომხმარებლის წაშლა"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* CRM Edit Box */}
                      {isEditing && (
                        <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-in fade-in">
                          <h5 className="font-black text-amber-400 text-xs">პერსონალური CRM პარამეტრები კლიენტისთვის: {u.name}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-400 text-[10px] block mb-1">პერსონალური ფასდაკლება (%)</label>
                              <input 
                                type="number" 
                                placeholder="მაგ: 10" 
                                value={editUserDiscount} 
                                onChange={e => setEditUserDiscount(e.target.value)} 
                                className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-[10px] block mb-1">ადმინისტრატორის შენიშვნა</label>
                              <input 
                                type="text" 
                                placeholder="მაგ: VIP კლიენტი, ჰყავს ფასდაკლება" 
                                value={editUserNotes} 
                                onChange={e => setEditUserNotes(e.target.value)} 
                                className="w-full bg-slate-950 border border-amber-500/20 p-2.5 rounded-xl text-white outline-none text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingUserId(null)} className="px-3 py-1.5 bg-slate-950 text-slate-400 rounded-xl font-bold text-xs">გაუქმება</button>
                            <button onClick={() => handleSaveUserCrm(u.id || u.email)} className="px-4 py-1.5 bg-amber-400 text-slate-950 rounded-xl font-black text-xs">შენახვა</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {adminTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Truck className="w-5 h-5 text-emerald-400" /> მიწოდების ტარიფების რედაქტირება
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🏙️ თბილისი / რუსთავი (₾):</label>
                  <input type="number" value={deliveryFees?.tbilisi ?? 0} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, tbilisi: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🌆 დიდი ქალაქები (₾):</label>
                  <input type="number" value={deliveryFees?.bigCities ?? 10} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, bigCities: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
                  <label className="text-slate-300 font-bold">🏔️ სხვა რეგიონები (₾):</label>
                  <input type="number" value={deliveryFees?.other ?? 15} onChange={e => { if (typeof setDeliveryFees === 'function') setDeliveryFees({...deliveryFees, other: Number(e.target.value)}); }} className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 font-black outline-none" />
                </div>
              </div>
              <button onClick={() => alert('✅ მიწოდების ტარიფები წარმატებით შენახდა!')} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20">
                ტარიფების შენახვა
              </button>
            </div>
            <div className="bg-slate-900/80 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 shadow-2xl backdrop-blur-2xl">
              <h3 className="font-black text-white text-base flex items-center gap-2.5 border-b border-emerald-500/20 pb-4">
                <Settings className="w-5 h-5 text-emerald-400" /> საიტის გლობალური პარამეტრები
              </h3>
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">მაღაზიის დასახელება</label>
                  <input type="text" value={siteSettings.storeName} onChange={e => setSiteSettings({...siteSettings, storeName: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold">ზედა ზოლის ტექსტი (TopBar)</label>
                  <input type="text" value={siteSettings.topBarText} onChange={e => setSiteSettings({...siteSettings, topBarText: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer">
                  პარამეტრების შენახვა
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
