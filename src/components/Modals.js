// src/components/Modals.js
import React from 'react';
import { Gift, CheckSquare, Bell, Edit3, MessageSquare, Send, ImageIcon } from 'lucide-react';

export default function Modals({
  // Gift Quiz
  isGiftQuizOpen,
  setIsGiftQuizOpen,
  giftStep,
  setGiftStep,
  giftRecipient,
  setGiftRecipient,
  giftOccasion,
  setGiftOccasion,
  giftInterest,
  setGiftInterest,
  giftBudgetMax,
  setGiftBudgetMax,
  giftQuizResults,
  setGiftQuizResults,
  products,
  addToCart,

  // Comparison
  isComparisonOpen,
  setIsComparisonOpen,
  comparisonList,
  toggleComparison,

  // Price Alert
  priceAlertModal,
  setPriceAlertModal,
  alertEmail,
  setAlertEmail,
  showToast,

  // Edit Product
  editingProductId,
  setEditingProductId,
  editProductForm,
  setEditProductForm,
  setProducts,
  vendorsList,
  categories,

  // Quick View
  selectedProductQuickView,
  setSelectedProductQuickView,

  // Auth
  isAuthOpen,
  setIsAuthOpen,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleAuthSubmit,

  // Checkout
  isCheckoutOpen,
  setIsCheckoutOpen,
  checkoutForm,
  setCheckoutForm,
  quickBuyProduct,
  setQuickBuyProduct,
  cart,
  cartTotalGEL,
  handlePlaceOrder,

  // Invoice
  activeInvoiceOrder,
  setActiveInvoiceOrder,

  // Live Chat
  isChatOpen,
  setIsChatOpen,
  chatClientName,
  setChatClientName,
  clientNameInput,
  setClientNameInput,
  clientChatView,
  chatInput,
  setChatInput,
  handleSendMessage
}) {
  return (
    <>
      {/* GIFT QUIZ MODAL */}
      {isGiftQuizOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/50 rounded-2xl max-w-md w-full p-5 relative space-y-4 text-xs shadow-xl">
            <button onClick={() => setIsGiftQuizOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white font-bold text-xs">✕</button>
            
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Gift className="w-6 h-6 text-teal-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-black text-white">🎁 ჭკვიანი სასაჩუქრე ასისტენტი</h3>
                <p className="text-[9px] text-teal-300 font-semibold">შეარჩიეთ საჩუქარი 4 სწრაფ ნაბიჯში</p>
              </div>
            </div>

            {giftStep === 1 && (
              <div className="space-y-3">
                <p className="text-slate-200 font-black text-xs">1. ვისთვის გსურთ საჩუქრის არჩევა?</p>
                <div className="grid grid-cols-2 gap-2">
                  {['მეუღლე / საყვარელი', 'მშობელი', 'შვილი / მოზარდი', 'მეგობარი / კოლეგა'].map(rec => (
                    <button 
                      key={rec} 
                      onClick={() => { setGiftRecipient(rec); setGiftStep(2); }} 
                      className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-400 rounded-xl font-bold text-white text-left transition"
                    >
                      👤 {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {giftStep === 2 && (
              <div className="space-y-3">
                <p className="text-slate-200 font-black text-xs">2. რა შემთხვევისთვის ეძებთ საჩუქარს?</p>
                <div className="grid grid-cols-2 gap-2">
                  {['დაბადების დღე 🎂', 'ახალი წელი 🎄', 'იუბილე / დღესასწაული 🎉', 'სიურპრიზი ✨'].map(occ => (
                    <button 
                      key={occ} 
                      onClick={() => { setGiftOccasion(occ); setGiftStep(3); }} 
                      className="p-3 bg-slate-950 border border-slate-800 hover:border-teal-400 rounded-xl font-bold text-white text-left transition"
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {giftStep === 3 && (
              <div className="space-y-3">
                <p className="text-slate-200 font-black text-xs">3. ინტერესი და მაქსიმალური ბიუჯეტი:</p>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold block text-[10px]">ინტერესი:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['გეიმინგი / ტექნიკა', 'მუსიკა / აუდიო', 'სმარტფონები', 'ყველაფერი'].map(ins => (
                      <button 
                        key={ins} 
                        onClick={() => setGiftInterest(ins)} 
                        className={`p-2 rounded-xl font-bold border text-[11px] transition ${
                          giftInterest === ins ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      >
                        {ins}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">მაქსიმალური ბიუჯეტი:</span>
                    <span className="text-teal-400 font-black">{giftBudgetMax} ₾</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="6000" 
                    step="100" 
                    value={giftBudgetMax} 
                    onChange={e => setGiftBudgetMax(Number(e.target.value))} 
                    className="w-full accent-teal-400 cursor-pointer h-1" 
                  />
                </div>

                <button 
                  onClick={() => {
                    const matched = products.filter(p => p.priceGEL <= giftBudgetMax);
                    setGiftQuizResults(matched.length > 0 ? matched.slice(0, 3) : products.slice(0, 3));
                    setGiftStep(4);
                  }} 
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3 rounded-xl text-xs shadow transition"
                >
                  🎁 საჩუქრის გენერირება
                </button>
              </div>
            )}

            {giftStep === 4 && (
              <div className="space-y-3">
                <div className="text-center space-y-0.5">
                  <h4 className="font-black text-teal-400 text-sm">🎉 შერჩეული საჩუქრები!</h4>
                  <p className="text-slate-400 text-[10px]">{giftRecipient} • {giftOccasion} • {giftBudgetMax}₾</p>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {giftQuizResults.map(p => (
                    <div key={p.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5">
                      <img src={p.image} alt="" className="w-11 h-11 object-contain bg-slate-900 rounded-lg p-1 shrink-0" />
                      <div className="flex-1">
                        <h5 className="font-bold text-white text-[11px] line-clamp-1">{p.name}</h5>
                        <p className="text-teal-400 font-black text-xs">{p.priceGEL} ₾</p>
                      </div>
                      <button 
                        onClick={() => { addToCart(p); setIsGiftQuizOpen(false); }} 
                        className="bg-teal-500 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[10px] shrink-0"
                      >
                        ყიდვა
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setGiftStep(1)} className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 font-bold py-2 rounded-xl text-[11px]">
                    🔄 თავიდან
                  </button>
                  <button onClick={() => setIsGiftQuizOpen(false)} className="bg-slate-800 text-white font-bold px-3 py-2 rounded-xl text-[11px]">
                    დახურვა
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPARISON MODAL */}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-5 relative space-y-3.5 text-xs shadow-xl">
            <button onClick={() => setIsComparisonOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-xs">✕</button>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-white">⚔️ პროდუქტების შედარება</h3>
            </div>

            {comparisonList.length === 0 ? (
              <p className="text-slate-400 text-center py-6">შედარების სია ცარიელია.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-x-auto">
                {comparisonList.map(prod => (
                  <div key={prod.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <img src={prod.image} alt="" className="w-20 h-20 object-contain mx-auto bg-slate-900 p-1.5 rounded-xl mb-2" />
                      <h4 className="font-bold text-white text-xs mb-0.5 line-clamp-1">{prod.name}</h4>
                      <p className="text-cyan-400 font-black text-sm">{prod.priceGEL} ₾</p>
                    </div>
                    <div className="space-y-1 text-slate-300 border-t border-slate-800 pt-2 text-[11px]">
                      <p><b>ვენდერი:</b> {prod.vendor || 'GEOSTORE'}</p>
                      <p><b>კატეგორია:</b> {prod.category}</p>
                      <p><b>მარაგი:</b> {prod.stock} ც.</p>
                    </div>
                    <button onClick={() => toggleComparison(prod)} className="w-full bg-rose-500/20 text-rose-400 py-1.5 rounded-xl font-bold border border-rose-500/30 text-[11px]">ამოღება</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRICE ALERT MODAL */}
      {priceAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-5 relative space-y-3 text-xs shadow-xl">
            <button onClick={() => setPriceAlertModal(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-xs">✕</button>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Bell className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white">🔔 შემატყობინე მარაგში შევსებისას</h3>
            </div>
            <p className="text-slate-300 text-[11px]">პროდუქტი: <b className="text-amber-400">{priceAlertModal.name}</b></p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if(!alertEmail.trim()) return;
              showToast('✅ თქვენ წარმატებით გამოიწერეთ შეტყობინება!');
              setPriceAlertModal(null);
              setAlertEmail('');
            }} className="space-y-2.5">
              <input type="email" required placeholder="თქვენი ელ-ფოსტა..." value={alertEmail} onChange={e => setAlertEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white outline-none" />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl shadow text-xs">გამოწერა</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProductId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 relative space-y-3 text-xs shadow-xl">
            <button onClick={() => setEditingProductId(null)} className="absolute top-3 right-3 text-slate-400 text-xs">✕</button>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-400" /> პროდუქტის რედაქტირება
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setProducts(products.map(p => p.id === editingProductId ? {
                ...p,
                name: editProductForm.name,
                sku: editProductForm.sku,
                category: editProductForm.category,
                brand: editProductForm.brand,
                vendor: editProductForm.vendor,
                priceGEL: Number(editProductForm.priceGEL),
                oldPriceGEL: Number(editProductForm.oldPriceGEL),
                discountPercent: Number(editProductForm.discountPercent),
                stock: Number(editProductForm.stock),
                image: editProductForm.image,
                description: editProductForm.description,
                warranty: editProductForm.warranty,
                isPreOrder: editProductForm.isPreOrder
              } : p));
              setEditingProductId(null);
              showToast('✅ პროდუქტი წარმატებით განახლდა!');
            }} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">დასახელება:</label>
                <input type="text" required value={editProductForm.name} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px]">ვენდერი:</label>
                  <select value={editProductForm.vendor} onChange={e => setEditProductForm({...editProductForm, vendor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none">
                    {vendorsList.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[10px]">კატეგორია:</label>
                  <select value={editProductForm.category} onChange={e => setEditProductForm({...editProductForm, category: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none">
                    {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px]">ფასი (₾):</label>
                  <input type="number" required value={editProductForm.priceGEL} onChange={e => setEditProductForm({...editProductForm, priceGEL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px]">ძველი ფასი:</label>
                  <input type="number" value={editProductForm.oldPriceGEL} onChange={e => setEditProductForm({...editProductForm, oldPriceGEL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px]">ფასდაკლება %:</label>
                  <input type="number" value={editProductForm.discountPercent} onChange={e => setEditProductForm({...editProductForm, discountPercent: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-[10px]">მარაგი:</label>
                  <input type="number" required value={editProductForm.stock} onChange={e => setEditProductForm({...editProductForm, stock: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px]">გარანტია:</label>
                  <input type="text" value={editProductForm.warranty} onChange={e => setEditProductForm({...editProductForm, warranty: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <input type="checkbox" checked={editProductForm.isPreOrder} onChange={e => setEditProductForm({...editProductForm, isPreOrder: e.target.checked})} id="editPreOrder" className="rounded accent-emerald-500 w-3.5 h-3.5" />
                <label htmlFor="editPreOrder" className="text-slate-300 font-bold cursor-pointer text-[11px]">წინასწარი შეკვეთა (Pre-Order)</label>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">ფოტოს URL:</label>
                <input type="url" required value={editProductForm.image} onChange={e => setEditProductForm({...editProductForm, image: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px]">აღწერა:</label>
                <textarea value={editProductForm.description} onChange={e => setEditProductForm({...editProductForm, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-white outline-none h-16" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl text-xs">შენახვა</button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK VIEW MODAL */}
      {selectedProductQuickView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 relative space-y-3 text-xs shadow-xl">
            <button onClick={() => setSelectedProductQuickView(null)} className="absolute top-3 right-3 text-slate-400 text-xs">✕</button>
            <img src={selectedProductQuickView.image} alt="" className="w-36 h-36 object-contain mx-auto bg-slate-950 rounded-xl p-3 border border-slate-800" />
            <h3 className="text-sm font-bold text-white">{selectedProductQuickView.name}</h3>
            <p className="text-teal-400 font-bold text-[11px]">🏪 ვენდერი: {selectedProductQuickView.vendor || 'GEOSTORE'}</p>
            {selectedProductQuickView.images && selectedProductQuickView.images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto py-1">
                {selectedProductQuickView.images.map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt="" onClick={() => setSelectedProductQuickView({...selectedProductQuickView, image: imgUrl})} className="w-10 h-10 object-contain bg-slate-950 rounded-lg cursor-pointer border border-slate-800 hover:border-emerald-500 p-0.5" />
                ))}
              </div>
            )}
            <p className="text-slate-400 leading-relaxed text-[11px]">{selectedProductQuickView.description}</p>
            {selectedProductQuickView.warranty && <p className="text-emerald-300 font-bold text-[11px]">🛡️ გარანტია: {selectedProductQuickView.warranty}</p>}
            <p className="text-teal-400 font-bold text-[11px]">💳 0% განვადება: თვეში ~{Math.round(selectedProductQuickView.priceGEL / 12)} ₾</p>
            <div className="text-lg font-black text-emerald-400">{selectedProductQuickView.priceGEL} ₾</div>
            <button disabled={selectedProductQuickView.stock <= 0} onClick={() => { addToCart(selectedProductQuickView); setSelectedProductQuickView(null); }} className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow">კალათაში დამატება</button>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 relative space-y-3.5 shadow-xl">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-3 right-3 text-slate-400 text-xs">✕</button>
            <div className="flex gap-3 border-b border-slate-800 pb-2 font-bold text-xs">
              <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>შესვლა</button>
              <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-slate-500'}>რეგისტრაცია</button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
              {authMode === 'register' && (
                <>
                  <input type="text" required placeholder="სახელი *" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                  <input type="tel" required placeholder="ტელეფონი *" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
                </>
              )}
              <input type="email" required placeholder="ელ-ფოსტა *" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
              <input type="password" required placeholder="პაროლი *" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
              
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <input 
                  type="checkbox" 
                  id="userRemember"
                  checked={authForm.remember} 
                  onChange={e => setAuthForm({...authForm, remember: e.target.checked})} 
                  className="rounded accent-emerald-500"
                />
                <label htmlFor="userRemember" className="cursor-pointer text-[11px]">მომიმახსოვრე</label>
              </div>

              <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-bold text-xs shadow">{authMode === 'login' ? 'შესვლა' : 'რეგისტრაცია'}</button>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 relative space-y-3.5 shadow-xl">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-3 right-3 text-slate-400 text-xs">✕</button>
            <h3 className="text-sm font-bold text-white">შეკვეთის გაფორმება</h3>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              handlePlaceOrder(quickBuyProduct ? [quickBuyProduct] : cart, quickBuyProduct ? quickBuyProduct.priceGEL : cartTotalGEL, !!quickBuyProduct); 
            }} className="space-y-2.5">
              <input type="text" required placeholder="სახელი და გვარი *" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
              <input type="tel" required placeholder="ტელეფონი *" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
              <input type="text" required placeholder="მისამართი *" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none" />
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow">დადასტურება</button>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-xs">ინვოისი #{activeInvoiceOrder.id}</h3>
              <button onClick={() => setActiveInvoiceOrder(null)} className="text-xs">✕</button>
            </div>
            <p className="text-[11px]"><b>მყიდველი:</b> {activeInvoiceOrder.customerName} ({activeInvoiceOrder.phone})</p>
            <p className="text-[11px]"><b>მისამართი:</b> {activeInvoiceOrder.address}</p>
            <p className="text-[11px]"><b>სტატუსი:</b> {activeInvoiceOrder.status}</p>
            <div className="text-xs font-bold text-emerald-600">სულ: {activeInvoiceOrder.totalGEL} ₾</div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold">ბეჭდვა</button>
          </div>
        </div>
      )}

      {/* LIVE CHAT BUTTON / WIDGET */}
      <div className="fixed bottom-14 md:bottom-5 right-3 md:right-5 z-40">
        {!isChatOpen ? (
          <button onClick={() => setIsChatOpen(true)} className="bg-emerald-500 text-slate-950 p-3.5 rounded-full shadow-xl flex items-center justify-center relative hover:scale-105 transition transform">
            <MessageSquare className="w-5 h-5" />
          </button>
        ) : (
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl w-72 sm:w-80 md:w-88 overflow-hidden flex flex-col h-[420px] backdrop-blur-xl">
            <div className="bg-emerald-500 p-3 text-slate-950 font-bold flex justify-between items-center text-xs shadow">
              <span>მხარდაჭერა (ჩათი) {chatClientName ? `(${chatClientName})` : ''}</span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    if(window.confirm('გსურთ ჩათის დასრულება?')) {
                      showToast('ჩათი დასრულდა');
                    }
                  }} 
                  className="bg-slate-950 text-white px-2 py-0.5 rounded text-[9px]"
                >
                  დასრულება
                </button>
                <button onClick={() => setIsChatOpen(false)} className="text-xs">✕</button>
              </div>
            </div>

            {!chatClientName ? (
              <div className="flex-1 p-5 flex flex-col justify-center items-center text-center space-y-2.5 bg-slate-950 text-xs">
                <h4 className="font-bold text-emerald-400 text-xs">გამარჯობა! გთხოვთ შეიყვანოთ თქვენი სახელი</h4>
                <p className="text-slate-400 text-[10px]">რომ მენეჯერმა იცოდეს ვის ესაუბრება.</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if(!clientNameInput.trim()) return;
                  setChatClientName(clientNameInput.trim());
                  try { localStorage.setItem('geostore_chat_client_name', clientNameInput.trim()); } catch(e){}
                  showToast('✅ სახელი დაფიქსირდა');
                }} className="w-full space-y-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="თქვენი სახელი..." 
                    value={clientNameInput} 
                    onChange={e => setClientNameInput(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white text-xs outline-none" 
                  />
                  <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-xl text-xs">დაწყება</button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 text-xs bg-slate-950">
                  {clientChatView.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === chatClientName ? 'items-end' : 'items-start'}`}>
                      <div className={`p-2.5 rounded-xl max-w-[85%] ${m.sender === chatClientName ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-white border border-slate-800'}`}>
                        <b>{m.sender}:</b> {m.text}
                        {m.image && (
                          <img src={m.image} alt="Attachment" className="mt-1.5 rounded-lg max-h-32 object-cover w-full border border-slate-800" />
                        )}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-0.5 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-slate-900 border-t border-slate-800 space-y-1.5">
                  <div className="flex gap-1.5 items-center">
                    <label className="p-2 rounded-xl border bg-slate-950 text-slate-300 border-slate-800 cursor-pointer hover:bg-slate-800 transition" title="აირჩიეთ ფოტო">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = function(evt) {
                              handleSendMessage('ფოტო:', chatClientName, evt.target.result);
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>

                    <input 
                      type="text" 
                      placeholder="შეტყობინება..." 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      onKeyDown={(e) => { 
                        if(e.key === 'Enter') { 
                          e.preventDefault();
                          if(!chatInput.trim()) return; 
                          handleSendMessage(chatInput, chatClientName);
                        } 
                      }} 
                      className="flex-1 bg-slate-950 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none border border-slate-800" 
                    />

                    <button 
                      onClick={() => { 
                        if(!chatInput.trim()) return; 
                        handleSendMessage(chatInput, chatClientName);
                      }} 
                      className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-bold"
                    >
                      <Send className="w-3 h-3"/>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
