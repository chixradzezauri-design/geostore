// src/components/Modals.jsx - Next-Gen Minimalist Apple/Stripe Style Modals
import React from 'react';
import { X, Sparkles, Gift, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  isGiftQuizOpen,
  setIsGiftQuizOpen,
  products,
  addToCart
}) {
  return (
    <>
      {/* 🚀 CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl backdrop-blur-2xl relative">
            <button 
              onClick={() => setIsCheckoutOpen(false)} 
              className="absolute top-6 right-6 p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-2 border-b border-slate-800/80 pb-4">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> უსაფრთხო გადახდა
              </div>
              <h3 className="font-black text-white text-xl tracking-tight">შეკვეთის გაფორმება</h3>
              <p className="text-slate-400 text-xs">შეიყვანეთ თქვენი მონაცემები მიწოდებისთვის:</p>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">სახელი და გვარი *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="მაგ: გიორგი ბერიძე" 
                  value={checkoutForm.name} 
                  onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} 
                  className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">ტელეფონის ნომერი *</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="+995 599 00 00 00" 
                  value={checkoutForm.phone} 
                  onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} 
                  className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">მიწოდების მისამართი *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="ქალაქი, ქუჩა, ბინის ნომერი" 
                  value={checkoutForm.address} 
                  onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} 
                  className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner transition-all" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all duration-300 cursor-pointer active:scale-95 text-sm mt-2"
              >
                შეკვეთის დადასტურება
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔐 AUTHENTICATION MODAL */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-[2.5rem] max-w-sm w-full space-y-6 shadow-2xl backdrop-blur-2xl relative">
            <button 
              onClick={() => setIsAuthOpen(false)} 
              className="absolute top-6 right-6 p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex border-b border-slate-800/80 pb-3 gap-6 text-xs font-black">
              <button 
                onClick={() => setAuthMode('login')} 
                className={`pb-1 transition-all ${authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
              >
                ავტორიზაცია
              </button>
              <button 
                onClick={() => setAuthMode('register')} 
                className={`pb-1 transition-all ${authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
              >
                რეგისტრაცია
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              {authMode === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">სახელი *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="თქვენი სახელი" 
                      value={authForm.name} 
                      onChange={e => setAuthForm({...authForm, name: e.target.value})} 
                      className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">ტელეფონი *</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="+995..." 
                      value={authForm.phone} 
                      onChange={e => setAuthForm({...authForm, phone: e.target.value})} 
                      className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" 
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">ელ-ფოსტა *</label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com" 
                  value={authForm.email} 
                  onChange={e => setAuthForm({...authForm, email: e.target.value})} 
                  className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">პაროლი *</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={authForm.password} 
                  onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                  className="w-full bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl text-white outline-none focus:border-emerald-500 shadow-inner" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 text-xs mt-2"
              >
                {authMode === 'login' ? 'შესვლა სისტემაში' : 'ანგარიშის შექმნა'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🎁 GIFT QUIZ MODAL */}
      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-[2.5rem] max-w-md w-full space-y-6 shadow-2xl backdrop-blur-2xl relative text-xs">
            <button 
              onClick={() => setIsGiftQuizOpen(false)} 
              className="absolute top-6 right-6 p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 border-b border-slate-800/80 pb-4">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5 text-emerald-400" /> AI საჩუქრის ამრჩევი
              </div>
              <h3 className="font-black text-white text-lg tracking-tight">ვისთვის ეძებთ საჩუქარს?</h3>
              <p className="text-slate-400 text-xs">აირჩიეთ მიმღები და ჩვენ შევარჩევთ საუკეთესო გაჯეტს:</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['მეგობარი', 'მშობელი', 'მეუღლე', 'კოლეგა'].map(rec => (
                <button 
                  key={rec} 
                  onClick={() => { 
                    setIsGiftQuizOpen(false); 
                    if(products[0]) addToCart(products[0]); 
                  }} 
                  className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl font-bold text-white hover:border-emerald-500 hover:bg-slate-900 transition-all text-center shadow-lg group cursor-pointer flex flex-col items-center gap-1"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
                  <span>{rec}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
