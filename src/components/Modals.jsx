// src/components/Modals.jsx
import React from 'react';
import { X } from 'lucide-react';

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
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm">შეკვეთის გაფორმება</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
              <input type="text" required placeholder="სახელი, გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="tel" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl shadow hover:bg-emerald-400 transition">შეკვეთის დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-bold">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl shadow hover:bg-emerald-400 transition">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm">🎁 საჩუქრის ქვიზი</h3>
              <button onClick={() => setIsGiftQuizOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-300 font-medium">ვისთვის ეძებთ საჩუქარს?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {['მეგობარი', 'მშობელი', 'მეუღლე', 'კოლეგა'].map(rec => (
                <button key={rec} onClick={() => { setIsGiftQuizOpen(false); if(products[0]) addToCart(products[0]); }} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl font-bold text-white hover:border-emerald-500 transition text-center">
                  🎁 {rec}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
