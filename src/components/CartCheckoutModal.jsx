// src/components/CartCheckoutModal.jsx - 100% Full Code with Smart Size Persistence & Supabase Order Persistence
import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, Plus, Minus, CheckCircle2, ShieldCheck, Truck, Tag, CreditCard, Send, Ruler } from 'lucide-react';

const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export default function CartCheckoutModal({
  isOpen,
  onClose,
  cart = [],
  setCart,
  formatPrice,
  deliveryFees = { tbilisi: 0, bigCities: 10, other: 15 },
  setOrders
}) {
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    cityRegion: 'თბილისი / რუსთავი',
    paymentMethod: 'ბარათით ადგილზე / კურიერთან'
  });

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);

  if (!isOpen) return null;

  const handleQuantityChange = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.priceGEL * (item.quantity || 1)), 0);
  };

  const getDeliveryCost = () => {
    if (checkoutForm.cityRegion.includes('თბილისი')) return deliveryFees.tbilisi ?? 0;
    if (checkoutForm.cityRegion.includes('დიდი ქალაქები')) return deliveryFees.bigCities ?? 10;
    return deliveryFees.other ?? 15;
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    if (couponInput.toUpperCase() === 'GEO2026' || couponInput.toUpperCase() === 'GEOSTORE10') {
      setAppliedCoupon({ code: couponInput.toUpperCase(), discountPercent: 10 });
      setCouponError('');
      setCouponInput('');
      alert('✅ კუპონი წარმატებით გააქტიურდა (-10%)!');
    } else {
      setCouponError('არასწორი ან ვადაგასული კუპონი');
    }
  };

  const subtotal = calculateSubtotal();
  const deliveryCost = getDeliveryCost();
  const discountAmount = appliedCoupon ? Math.round(subtotal * (appliedCoupon.discountPercent / 100)) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryCost;

  // 🚀 შეკვეთის გაფორმება და პირდაპირ Supabase ბაზაში გაგზავნა ზომების ინტეგრაციით
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!checkoutForm.customerName || !checkoutForm.phone || !checkoutForm.address) {
      alert('გთხოვთ შეავსოთ ყველა სავალდებულო ველი!');
      return;
    }

    const orderId = Math.floor(100000 + Math.random() * 900000);
    const itemSummary = cart.map(i => `${i.name} ${i.selectedSize ? `[ზომა: ${i.selectedSize}]` : ''} (x${i.quantity || 1})`).join(', ');

    const newOrderPayload = {
      id: String(orderId),
      customer_name: checkoutForm.customerName,
      phone: checkoutForm.phone,
      address: `${checkoutForm.cityRegion} - ${checkoutForm.address}`,
      total_gel: finalTotal,
      status: 'ახალი',
      item_summary: itemSummary
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newOrderPayload)
      });

      if (res.ok) {
        const localOrderObj = {
          id: String(orderId),
          customerName: checkoutForm.customerName,
          phone: checkoutForm.phone,
          address: `${checkoutForm.cityRegion} - ${checkoutForm.address}`,
          totalGEL: finalTotal,
          status: 'ახალი',
          itemSummary: itemSummary,
          date: new Date().toLocaleDateString('ka-GE')
        };

        if (setOrders) {
          setOrders(prev => [localOrderObj, ...(prev || [])]);
        }

        setLastOrderId(orderId);
        setIsSuccess(true);
        setCart([]);
      } else {
        const errText = await res.text();
        alert('შეცდომა შეკვეთის გაფორმებისას: ' + errText);
      }
    } catch {
      alert('ქსელის შეცდომა სერვერთან მიერთებისას');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="relative bg-[#0d0d10] border border-emerald-500/50 rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-emerald-500/25 bg-[#121216] shrink-0">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> კალათა & ზომების კონტროლი
          </span>
          <button onClick={onClose} className="p-2 bg-[#1a1a20] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl border border-emerald-500/30 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 scrollbar-thin">
          {isSuccess ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">შეკვეთა წარმატებით გაფორმდა! 🎉</h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                თქვენი შეკვეთის ნომერია <b className="text-emerald-400">#{lastOrderId}</b>. ოპერატორი მალე დაგიკავშირდებათ ზომებისა და დეტალების დასაზუსტებლად.
              </p>
              <button 
                onClick={onClose} 
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 mt-4"
              >
                მთავარ გვერდზე დაბრუნება
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
              <p className="text-slate-400 text-sm font-bold">თქვენი კალათა ცარიელია.</p>
              <button onClick={onClose} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs transition cursor-pointer">
                შოპინგის დაწყება
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* Cart Items List */}
              <div className="space-y-3">
                <h3 className="font-black text-white text-sm border-b border-emerald-500/20 pb-2">კალათაში არსებული პროდუქტები ({cart.length})</h3>
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-[#08080a] p-4 rounded-3xl border border-emerald-500/20 flex items-center justify-between gap-4 shadow-inner">
                    <div className="flex items-center gap-3.5">
                      <img src={item.image} alt="" className="w-14 h-14 object-contain bg-[#121216] p-1 rounded-2xl border border-emerald-500/20 shrink-0" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                        {item.selectedSize && (
                          <p className="text-amber-400 font-bold text-[11px] flex items-center gap-1 mt-0.5">
                            <Ruler className="w-3 h-3" /> არჩეული ზომა: {item.selectedSize}
                          </p>
                        )}
                        <p className="text-emerald-400 font-black mt-0.5">{formatPrice(item.priceGEL)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#121216] p-1 rounded-xl border border-emerald-500/20">
                        <button onClick={() => handleQuantityChange(item.id, -1)} className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-slate-300 transition cursor-pointer"><Minus className="w-3 h-3" /></button>
                        <span className="font-black text-white px-2">{item.quantity || 1}</span>
                        <button onClick={() => handleQuantityChange(item.id, 1)} className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-slate-300 transition cursor-pointer"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-300 p-2 bg-rose-500/10 rounded-xl cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2 bg-[#08080a] p-4 rounded-3xl border border-emerald-500/20">
                <input 
                  type="text" 
                  placeholder="შეიყვანეთ კუპონის კოდი..." 
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                  className="flex-1 bg-[#121216] border border-emerald-500/20 p-3 rounded-2xl text-white outline-none focus:border-emerald-400 uppercase shadow-inner"
                />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl transition cursor-pointer shrink-0">
                  გააქტიურება
                </button>
              </form>
              {appliedCoupon && <p className="text-emerald-400 font-bold px-2">✅ კუპონი აქტიურია: {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)</p>}
              {couponError && <p className="text-rose-400 font-bold px-2">{couponError}</p>}

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2 border-t border-emerald-500/20">
                <h3 className="font-black text-white text-sm">მიწოდების და საკონტაქტო მონაცემები</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input 
                    type="text" 
                    placeholder="სახელი და გვარი *" 
                    required
                    value={checkoutForm.customerName}
                    onChange={e => setCheckoutForm({...checkoutForm, customerName: e.target.value})}
                    className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                  />
                  <input 
                    type="tel" 
                    placeholder="ტელეფონის ნომერი (5xx xx xx xx) *" 
                    required
                    value={checkoutForm.phone}
                    onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                    className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <select 
                    value={checkoutForm.cityRegion}
                    onChange={e => setCheckoutForm({...checkoutForm, cityRegion: e.target.value})}
                    className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer font-bold"
                  >
                    <option value="თბილისი / რუსთავი">🏙️ თბილისი / რუსთავი ({deliveryFees.tbilisi ?? 0} ₾)</option>
                    <option value="დიდი ქალაქები">🌆 დიდი ქალაქები (ქუთაისი, ბათუმი...) ({deliveryFees.bigCities ?? 10} ₾)</option>
                    <option value="სხვა რეგიონები">🏔️ სხვა რეგიონები ({deliveryFees.other ?? 15} ₾)</option>
                  </select>

                  <input 
                    type="text" 
                    placeholder="ზუსტი მისამართი (ქუჩა, კორპუსი, ბინა) *" 
                    required
                    value={checkoutForm.address}
                    onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
                    className="bg-[#08080a] border border-emerald-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-400 shadow-inner"
                  />
                </div>

                {/* Summary Box */}
                <div className="bg-[#08080a] p-5 rounded-3xl border border-emerald-500/20 space-y-2.5 shadow-inner">
                  <div className="flex justify-between text-slate-300">
                    <span>პროდუქტების ღირებულება:</span>
                    <b className="text-white">{formatPrice(subtotal)}</b>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-400">
                      <span>ფასდაკლება ({appliedCoupon.discountPercent}%):</span>
                      <b>-{formatPrice(discountAmount)}</b>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>მიწოდება:</span>
                    <b className="text-emerald-400">{deliveryCost === 0 ? 'უფასო' : formatPrice(deliveryCost)}</b>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-emerald-500/20">
                    <span>სულ გადასახდელი:</span>
                    <span className="text-emerald-400 text-lg">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4" /> შეკვეთის დადასტურება და ბაზაში გაგზავნა
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
