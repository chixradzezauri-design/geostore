// src/components/Modals.jsx - Elite Gold Luxury Modals Edition with Delivery Region Selector
import React from 'react';
import { X, ShieldCheck, FileText, ShoppingBag, Lock, User, Phone, MapPin, Truck } from 'lucide-react';

export default function Modals({
  isCheckoutOpen,
  setIsCheckoutOpen,
  checkoutForm,
  setCheckoutForm,
  handlePlaceOrder,
  isAuthOpen,
  setIsAuthOpen,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleAuthSubmit,
  isTermsOpen,
  setIsTermsOpen,
  isWarrantyOpen,
  setIsWarrantyOpen,
  selectedRegion,
  setSelectedRegion,
  deliveryFees = { tbilisi: 0, bigCities: 10, other: 15 }
}) {
  return (
    <>
      {/* 1. შეკვეთის გაფორმების მოდალი რეგიონის ამორჩევით */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-amber-400" /> შეკვეთის გაფორმება
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-amber-400" /> სრული სახელი *</label>
                <input
                  type="text"
                  required
                  placeholder="გიორგი გიორგაძე"
                  value={checkoutForm.name}
                  onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-400" /> ტელეფონის ნომერი *</label>
                <input
                  type="tel"
                  required
                  placeholder="599 00 00 00"
                  value={checkoutForm.phone}
                  onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-amber-400" /> მიწოდების რეგიონი *</label>
                <select
                  value={selectedRegion || 'tbilisi'}
                  onChange={e => setSelectedRegion && setSelectedRegion(e.target.value)}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-amber-400 font-bold outline-none focus:border-amber-400 shadow-inner cursor-pointer"
                >
                  <option value="tbilisi">თბილისი / რუსთავი ({deliveryFees.tbilisi} ₾)</option>
                  <option value="bigCities">დიდი ქალაქები - ქუთაისი, ბათუმი ({deliveryFees.bigCities} ₾)</option>
                  <option value="other">სხვა რეგიონები / მთიანი ზონა ({deliveryFees.other} ₾)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> მიწოდების მისამართი *</label>
                <input
                  type="text"
                  required
                  placeholder="ქუჩა, კორპუსი, ბინა..."
                  value={checkoutForm.address}
                  onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                />
              </div>

              <button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer text-xs mt-3">
                დადასტურება და შეკვეთა
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. ავტორიზაცია / რეგისტრაცია */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2.5rem] max-w-sm w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-amber-400" /> {authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}
              </h3>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">სახელი</label>
                    <input
                      type="text"
                      required
                      placeholder="თქვენი სახელი"
                      value={authForm.name}
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                      className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">ტელეფონი</label>
                    <input
                      type="tel"
                      required
                      placeholder="599 00 00 00"
                      value={authForm.phone}
                      onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                      className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">ელ-ფოსტა</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">პაროლი</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner transition-all"
                />
              </div>

              <button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer text-xs mt-2">
                {authMode === 'login' ? 'შესვლა სისტემაში' : 'რეგისტრაციის დასრულება'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-amber-500/20">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-slate-400 hover:text-amber-400 text-xs font-bold transition-all cursor-pointer"
              >
                {authMode === 'login' ? 'არ გაქვთ ანგარიში? დარეგისტრირდით' : 'უკვე გაქვთ ანგარიში? ავტორიზაცია'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. წესები და პირობები */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2.5rem] max-w-xl w-full p-8 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" /> წესები და პირობები
              </h3>
              <button onClick={() => setIsTermsOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-none">
              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">1. ზოგადი დებულებები</h4>
                <p>GEOSTORE მარკეტფლეისზე შეკვეთის გაფორმებით მომხმარებელი ეთანხმება წინამდებარე წესებსა და პირობებს.</p>
              </div>

              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">2. შეკვეთა და გადახდა</h4>
                <p>შეკვეთის გაფორმებისას მომხმარებელი ვალდებულია მიუთითოს სწორი საკონტაქტო მონაცემები.</p>
              </div>

              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">3. მიწოდების სერვისი</h4>
                <p>მიწოდება ხორციელდება საქართველოს მასშტაბით, თბილისში 1-2 სამუშაო დღეში.</p>
              </div>
            </div>

            <button onClick={() => setIsTermsOpen(false)} className="w-full bg-[#16161a] hover:bg-[#1e1e24] text-white font-black py-4 rounded-2xl transition cursor-pointer text-xs border border-amber-500/30">
              გაგებულია
            </button>
          </div>
        </div>
      )}

      {/* 4. საგარანტიო წესები */}
      {isWarrantyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2.5rem] max-w-xl w-full p-8 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> საგარანტიო წესები
              </h3>
              <button onClick={() => setIsWarrantyOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-none">
              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">1. ოფიციალური გარანტია</h4>
                <p>GEOSTORE-ზე წარმოდგენილ ყველა ტექნიკაზე მოქმედებს 1-დან 3 წლამდე ქარხნული გარანტია.</p>
              </div>

              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">2. საგარანტიო მომსახურება</h4>
                <p>შემთხვევისას ნივთი შეკეთდება ან ჩანაცვლდება ავტორიზებულ სერვის ცენტრში.</p>
              </div>
            </div>

            <button onClick={() => setIsWarrantyOpen(false)} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer text-xs">
              გაგებულია
            </button>
          </div>
        </div>
      )}
    </>
  );
}
