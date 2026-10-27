// src/components/Modals.jsx - Next-Gen Minimalist Modals with Smooth Glassmorphism
import React from 'react';
import { X, ShieldCheck, FileText, ShoppingBag, Lock, User, Phone, MapPin, Mail } from 'lucide-react';

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
  setIsWarrantyOpen
}) {
  return (
    <>
      {/* 1. შეკვეთის გაფორმების მოდალი */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/95 border border-slate-800 rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl backdrop-blur-3xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-emerald-400" /> შეკვეთის გაფორმება
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-slate-800/60 rounded-2xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-emerald-400" /> სრული სახელი *</label>
                <input
                  type="text"
                  required
                  placeholder="გიორგი გიორგაძე"
                  value={checkoutForm.name}
                  onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400" /> ტელეფონის ნომერი *</label>
                <input
                  type="tel"
                  required
                  placeholder="599 00 00 00"
                  value={checkoutForm.phone}
                  onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> მიწოდების მისამართი *</label>
                <input
                  type="text"
                  required
                  placeholder="თბილისი, ჭავჭავაძის გამზ. #..."
                  value={checkoutForm.address}
                  onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer text-xs mt-3">
                დადასტურება და შეკვეთა
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. ავტორიზაცია / რეგისტრაცია (AI სტილში გაუმჯობესებული ფორმები) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/95 border border-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 space-y-6 shadow-2xl backdrop-blur-3xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-emerald-400" /> {authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}
              </h3>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-slate-800/60 rounded-2xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold">სახელი</label>
                    <input
                      type="text"
                      required
                      placeholder="თქვენი სახელი"
                      value={authForm.name}
                      onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold">ტელეფონი</label>
                    <input
                      type="tel"
                      required
                      placeholder="599 00 00 00"
                      value={authForm.phone}
                      onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">ელ-ფოსტა</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">პაროლი</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer text-xs mt-2">
                {authMode === 'login' ? 'შესვლა სისტემაში' : 'რეგისტრაციის დასრულება'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-slate-400 hover:text-emerald-400 text-xs font-bold transition-all cursor-pointer"
              >
                {authMode === 'login' ? 'არ გაქვთ ანგარიში? დარეგისტრირდით' : 'უკვე გაქვთ ანგარიში? ავტორიზაცია'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. წესები და პირობები (TERMS & CONDITIONS MODAL) */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/95 border border-slate-800 rounded-[2.5rem] max-w-xl w-full p-8 space-y-5 shadow-2xl backdrop-blur-3xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" /> წესები და პირობები
              </h3>
              <button onClick={() => setIsTermsOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-slate-800/60 rounded-2xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-none">
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">1. ზოგადი დებულებები</h4>
                <p>GEOSTORE მარკეტფლეისზე შეკვეთის გაფორმებით მომხმარებელი ეთანხმება წინამდებარე წესებსა და პირობებს. საიტი იტოვებს უფლებას ნებისმიერ დროს განაახლოს პირობები.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">2. შეკვეთა და გადახდა</h4>
                <p>შეკვეთის გაფორმებისას მომხმარებელი ვალდებულია მიუთითოს სწორი საკონტაქტო მონაცემები. გადახდა ხორციელდება ონლაინ ან ნაღდი ანგარიშსწორებით მიწოდებისას.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">3. მიწოდების სერვისი</h4>
                <p>მიწოდება ხორციელდება საქართველოს მასშტაბით. თბილისში მიწოდება ხდება 1-2 სამუშაო დღეში, ხოლო რეგიონებში 2-4 სამუშაო დღეში.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">4. დაბრუნების პოლიტიკა</h4>
                <p>მომხმარებელს უფლება აქვს დააბრუნოს პროდუქტი 14 დღის განმავლობაში, თუ შენარჩუნებულია ნივთის თავდაპირველი იერსახე და ქარხნული შეფუთვა.</p>
              </div>
            </div>

            <button onClick={() => setIsTermsOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition cursor-pointer text-xs">
              გაგებულია
            </button>
          </div>
        </div>
      )}

      {/* 4. საგარანტიო წესები (WARRANTY TERMS MODAL) */}
      {isWarrantyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/95 border border-slate-800 rounded-[2.5rem] max-w-xl w-full p-8 space-y-5 shadow-2xl backdrop-blur-3xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> საგარანტიო წესები
              </h3>
              <button onClick={() => setIsWarrantyOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-slate-800/60 rounded-2xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-none">
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">1. ოფიციალური გარანტია</h4>
                <p>GEOSTORE-ზე წარმოდგენილ ყველა ტექნიკაზე მოქმედებს 1-დან 3 წლამდე ოფიციალური ქარხნული გარანტია (ბრენდის მიხედვით).</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">2. საგარანტიო მომსახურება</h4>
                <p>საგარანტიო შემთხვევისას ნივთი შეკეთდება ან ჩანაცვლდება ახლით ავტორიზებულ სერვის ცენტრში, თუ დაზიანება გამოწვეულია ქარხნული წუნით.</p>
              </div>

              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <h4 className="font-black text-white text-sm">3. საგარანტიო პირობების გამონაკლისები</h4>
                <p>გარანტია არ ვრცელდება დაზიანებებზე, რომლებიც გამოწვეულია: მექანიკური ზემოქმედებით, სითხის მოხვედრით, არასწორი ექსპლუატაციით ან მესამე პირის მიერ შეკეთების მცდელობით.</p>
              </div>
            </div>

            <button onClick={() => setIsWarrantyOpen(false)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer text-xs">
              გაგებულია
            </button>
          </div>
        </div>
      )}
    </>
  );
}
