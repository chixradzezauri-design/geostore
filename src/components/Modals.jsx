// src/components/Modals.jsx
import React, { useState } from 'react';
import { ShoppingBag, Heart, X, Gift, CheckSquare, Trash2, ShieldCheck, User } from 'lucide-react';

export default function Modals({
  // Checkout Modal
  isCheckoutOpen,
  setIsCheckoutOpen,
  checkoutForm,
  setCheckoutForm,
  handlePlaceOrder,
  cartTotalGEL,
  
  // Auth Modal
  isAuthOpen,
  setIsAuthOpen,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleAuthSubmit,

  // Gift Quiz Modal
  isGiftQuizOpen,
  setIsGiftQuizOpen,
  products,
  addToCart,

  // Comparison Modal
  isComparisonOpen,
  setIsComparisonOpen,
  comparisonList,
  toggleComparison,

  // Wishlist Tab/Modal
  wishlist,
  toggleWishlist,

  formatPrice
}) {
  const [giftRecipient, setGiftRecipient] = useState('');

  return (
    <>
      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" /> შეკვეთის გაფორმება
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white font-bold p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">სახელი, გვარი *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="მაგ: გიორგი ბერიძე" 
                  value={checkoutForm.name} 
                  onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" 
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">ტელეფონი *</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="მაგ: +995 599 00 00 00" 
                  value={checkoutForm.phone} 
                  onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" 
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">მიწოდების მისამართი *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="ქალაქი, ქუჩა, ბინა" 
                  value={checkoutForm.address} 
                  onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="pt-2 flex items-center justify-between font-black text-sm text-emerald-400 border-t border-slate-800">
                <span>გადასახდელი თანხა:</span>
                <span>{formatPrice(cartTotalGEL)}</span>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow transition">
                შეკვეთის დადასტურება
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AUTH MODAL (LOGIN & REGISTER) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-bold">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 font-bold p-1"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold mb-1 block">სახელი *</label>
                    <input type="text" required placeholder="თქვენი სახელი" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold mb-1 block">ტელეფონი *</label>
                    <input type="tel" required placeholder="ტელეფონის ნომერი" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
                  </div>
                </>
              )}
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">ელ-ფოსტა *</label>
                <input type="email" required placeholder="example@gmail.com" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-bold mb-1 block">პაროლი *</label>
                <input type="password" required placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl shadow transition mt-2">
                {authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GIFT QUIZ MODAL */}
      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400" /> საჩუქრის ქვიზი
              </h3>
              <button onClick={() => setIsGiftQuizOpen(false)} className="text-slate-400 hover:text-white font-bold"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-300 font-medium">ვისთვის ეძებთ საჩუქარს?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {['მეგობარი', 'მშობელი', 'მეუღლე', 'კოლეგა'].map(rec => (
                <button 
                  key={rec} 
                  onClick={() => { 
                    setIsGiftQuizOpen(false); 
                    if(products[0]) addToCart(products[0]);
                  }} 
                  className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl font-bold text-white hover:border-emerald-500 hover:bg-slate-900 transition text-center"
                >
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
