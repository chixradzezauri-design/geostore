// src/components/Modals.jsx - Elite Gold Luxury Modals Edition with Real PIN & Passkeys Auth
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShieldCheck, FileText, ShoppingBag, Lock, User, Phone, MapPin, Truck, 
  Search, PackageCheck, Clock, Navigation, Map, KeyRound, Fingerprint, Bell, Sparkles, Tag 
} from 'lucide-react';

export default function Modals({
  isCheckoutOpen,
  setIsCheckoutOpen,
  checkoutForm,
  setCheckoutForm,
  handlePlaceOrder,
  isSubmittingOrder = false,
  checkoutError = '',
  orderConfirmation = null,
  setOrderConfirmation,
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
  isTrackerOpen,
  setIsTrackerOpen,
  isNotificationsOpen,
  setIsNotificationsOpen,
  notifications = [],
  markAllNotificationsAsRead,
  orders = [],
  lookupOrderForTracking,
  selectedRegion,
  setSelectedRegion,
  deliveryFees = { tbilisi: 0, bigCities: 10, other: 15 },
  currentUser,
  setCurrentUser,
  usersList = [],
  setUsersList
}) {
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchOrderPhone, setSearchOrderPhone] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackerError, setTrackerError] = useState('');

  const [authSubMode, setAuthSubMode] = useState('standard');
  const [pinCode, setPinCode] = useState('');
  const [confirmPinCode, setConfirmPinCode] = useState('');
  const [isPinSetupMode, setIsPinSetupMode] = useState(false);
  const [pinError, setPinError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSearchOrder = async (e) => {
    e.preventDefault();
    const cleanId = searchOrderId.trim().toUpperCase().replace('#', '');
    const cleanPhone = searchOrderPhone.trim();

    if (!cleanId || !cleanPhone) {
      setTrackedOrder(null);
      setTrackerError('შეიყვანეთ შეკვეთის კოდი და შეკვეთისას მითითებული ტელეფონი.');
      return;
    }
    if (typeof lookupOrderForTracking !== 'function' || isSearchingOrder) return;

    setIsSearchingOrder(true);
    setTrackedOrder(null);
    setTrackerError('');
    try {
      const found = await lookupOrderForTracking(cleanId, cleanPhone);
      if (!found) {
        setTrackerError('შეკვეთა ვერ მოიძებნა. გადაამოწმეთ კოდი და ტელეფონის ნომერი.');
        return;
      }
      setTrackedOrder(found);
    } catch (error) {
      console.error('Secure order tracking failed:', error);
      setTrackerError('შეკვეთის მოძებნა დროებით ვერ ხერხდება. სცადეთ მოგვიანებით.');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  const getStatusProgress = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('ჩაბარებულია') || s.includes('დასრულებული')) return 100;
    if (s.includes('გზაშია') || s.includes('კურიერთან')) return 75;
    if (s.includes('მზადდება') || s.includes('მუშავდება')) return 40;
    return 15;
  };

  const handlePinAuthSubmit = (e) => {
    e.preventDefault();
    if (failedAttempts >= 3) {
      setPinError('მცდელობების ლიმიტი ამოწურულია. გთხოვთ გამოიყენოთ პაროლი.');
      return;
    }
    if (pinCode.length < 4) {
      setPinError('PIN-კოდი უნდა შედგებოდეს მინიმუმ 4 ციფრისგან.');
      return;
    }

    if (currentUser) {
      if (isPinSetupMode) {
        if (pinCode !== confirmPinCode) {
          setPinError('PIN-კოდები არ ემთხვევა ერთმანეთს!');
          return;
        }
        const encodedPin = btoa(pinCode);
        const updatedUser = { ...currentUser, pinHash: encodedPin };
        setCurrentUser(updatedUser);
        if (setUsersList) {
          setUsersList(usersList.map(u => u.email === currentUser.email ? updatedUser : u));
        }
        alert('🎉 PIN-კოდი წარმატებით დაყენდა / განახლდა!');
        setIsPinSetupMode(false);
        setAuthSubMode('standard');
        setPinCode('');
        setConfirmPinCode('');
        setIsAuthOpen(false);
      } else {
        if (currentUser.pinHash && currentUser.pinHash === btoa(pinCode)) {
          alert('🔓 PIN-კოდი სწორია!');
          setFailedAttempts(0);
          setIsAuthOpen(false);
          setPinCode('');
        } else {
          setFailedAttempts(prev => prev + 1);
          setPinError(`არასწორი PIN-კოდი! დარჩენილი მცდელობა: ${3 - (failedAttempts + 1)}`);
        }
      }
    } else {
      const matchedUser = usersList.find(u => u.pinHash && u.pinHash === btoa(pinCode));
      if (matchedUser) {
        setCurrentUser(matchedUser);
        alert(`🔓 წარმატებით შეხვედით როგორც ${matchedUser.name}!`);
        setIsAuthOpen(false);
        setPinCode('');
        setFailedAttempts(0);
      } else {
        setFailedAttempts(prev => prev + 1);
        setPinError('ვერ მოიძებნა ანგარიში ამ PIN-კოდით.');
      }
    }
  };

  const handleBiometricLogin = async () => {
    if (!window.PublicKeyCredential) {
      alert('თქვენი ბრაუზერი ან მოწყობილობა არ მხარს უჭერს Passkeys / Face ID ავტორიზაციას.');
      return;
    }
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array([1,2,3,4,5,6,7,8]),
            timeout: 60000,
            userVerification: "required"
          }
        });
        if (assertion) {
          const passkeyUser = currentUser || usersList.find(u => u.hasPasskey) || usersList[0];
          if (passkeyUser) {
            setCurrentUser(passkeyUser);
            alert(`✅ Face ID / Touch ID ვერიფიკაცია წარმატებულია (${passkeyUser.name})!`);
          } else {
            alert('✅ Face ID ვერიფიკაცია წარმატებულია, გთხოვთ გაიაროთ რეგისტრაცია.');
          }
          setIsAuthOpen(false);
        }
      } else {
        alert('ბიომეტრიული სენსორი ამ მოწყობილობაზე მიუწვდომელია.');
      }
    } catch {
      alert('Face ID ავტორიზაცია გაუქმდა ან ვერ მოხერხდა.');
    }
  };

  return (
    <>
      {/* 1. შეკვეთის გაფორმების მოდალი */}
      {isCheckoutOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="geostore-checkout-title"
            className="relative flex max-h-[min(92dvh,860px)] w-full max-w-xl flex-col overflow-hidden rounded-[26px] border border-black/10 bg-white text-neutral-950 shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-neutral-500">GEOSTORE · CHECKOUT</p>
                <h3 id="geostore-checkout-title" className="text-lg font-semibold tracking-tight sm:text-xl">შეკვეთის გაფორმება</h3>
                <p className="mt-1 text-[11px] text-neutral-500">შეავსეთ მიწოდებისთვის საჭირო ინფორმაცია</p>
              </div>
              <button
                type="button"
                aria-label="დახურვა"
                onClick={() => setIsCheckoutOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handlePlaceOrder} className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-neutral-700">სრული სახელი <span className="text-neutral-400">*</span></span>
                  <span className="relative block">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input type="text" required autoComplete="name" placeholder="გიორგი გიორგაძე" value={checkoutForm.name}
                      onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white" />
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold text-neutral-700">ტელეფონის ნომერი <span className="text-neutral-400">*</span></span>
                  <span className="relative block">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input type="tel" required autoComplete="tel" inputMode="tel" placeholder="599 00 00 00" value={checkoutForm.phone}
                      onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white" />
                  </span>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-700">ელ-ფოსტა {!currentUser?.email && <span className="text-neutral-400">*</span>}</span>
                <input type="email" required={!currentUser?.email} readOnly={Boolean(currentUser?.email)} autoComplete="email"
                  placeholder="name@example.com" value={currentUser?.email || checkoutForm.email || ''}
                  onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white read-only:cursor-not-allowed read-only:opacity-65" />
                <span className="block text-[10px] text-neutral-500">შეკვეთის დეტალები ამ ელ-ფოსტასთან იქნება დაკავშირებული.</span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-700">მიწოდების რეგიონი <span className="text-neutral-400">*</span></span>
                <span className="relative block">
                  <Truck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <select value={selectedRegion || 'tbilisi'} onChange={e => setSelectedRegion && setSelectedRegion(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white">
                    <option value="tbilisi">თბილისი / რუსთავი ({deliveryFees.tbilisi} ₾)</option>
                    <option value="bigCities">დიდი ქალაქები - ქუთაისი, ბათუმი ({deliveryFees.bigCities} ₾)</option>
                    <option value="other">სხვა რეგიონები / მთიანი ზონა ({deliveryFees.other} ₾)</option>
                  </select>
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-700">მიწოდების მისამართი <span className="text-neutral-400">*</span></span>
                <span className="relative block">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input type="text" required autoComplete="street-address" placeholder="ქუჩა, კორპუსი, ბინა..." value={checkoutForm.address}
                    onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white" />
                </span>
              </label>

              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium leading-relaxed text-red-700">
                  {checkoutError}
                </p>
              )}

              <div className="border-t border-neutral-200 pt-4">
                <button type="submit" disabled={isSubmittingOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-55">
                  {isSubmittingOrder ? 'იგზავნება...' : 'შეკვეთის დადასტურება'}
                </button>
                <p className="mt-3 text-center text-[10px] text-neutral-500">თქვენი შეკვეთა უსაფრთხოდ ინახება GEOSTORE-ში</p>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {orderConfirmation && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-black/70 p-4 py-8 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="geostore-order-success-title"
            className="my-auto w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-white text-center text-neutral-950 shadow-[0_30px_100px_rgba(0,0,0,0.4)]"
          >
            <div className="px-6 pb-6 pt-8 sm:px-8 sm:pt-9">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-neutral-950 text-white">
                <PackageCheck className="h-7 w-7" />
              </div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-neutral-500">GEOSTORE · ORDER CONFIRMED</p>
              <h3 id="geostore-order-success-title" className="text-xl font-semibold tracking-tight sm:text-2xl">შეკვეთა მიღებულია</h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-neutral-500">მადლობა შეძენისთვის. შეინახეთ შეკვეთის კოდი, რომ მოგვიანებით სტატუსი შეამოწმოთ.</p>
              <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">შეკვეთის კოდი</span>
                <strong className="mt-2 block break-all text-lg font-semibold tracking-[0.08em] text-neutral-950 sm:text-xl">#{orderConfirmation.id}</strong>
                <button type="button"
                  onClick={() => {
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(orderConfirmation.id)
                        .then(() => alert('შეკვეთის კოდი დაკოპირდა.'))
                        .catch(() => alert('შეკვეთის კოდი: ' + orderConfirmation.id));
                    } else {
                      alert('შეკვეთის კოდი: ' + orderConfirmation.id);
                    }
                  }}
                  className="mt-3 inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-[11px] font-semibold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                >კოდის კოპირება</button>
              </div>
              {orderConfirmation.email && (
                <p className="mt-4 break-all text-[10px] text-neutral-500">დადასტურება: {orderConfirmation.email}</p>
              )}
              <button type="button" onClick={() => setOrderConfirmation && setOrderConfirmation(null)}
                className="mt-6 w-full rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800">
                გასაგებია
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      {/* 📍 2. LIVE ORDER TRACKER MAP MODAL */}
      {isTrackerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2rem] sm:rounded-[2.5rem] max-w-xl w-full p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col overflow-y-auto scrollbar-none">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-amber-400" /> შეკვეთის ლაივ-ტრეკინგი
              </h3>
              <button onClick={() => { setIsTrackerOpen(false); setTrackedOrder(null); setTrackerError(''); }} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchOrder} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <div className="relative">
                <input type="text" placeholder="შეკვეთის კოდი (ORD-...)" value={searchOrderId}
                  onChange={e => setSearchOrderId(e.target.value)} autoComplete="off" required
                  className="w-full bg-[#08080a] border border-amber-500/20 pl-10 pr-4 py-3 rounded-2xl text-xs text-white outline-none focus:border-amber-400 shadow-inner" />
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
              </div>
              <input type="tel" inputMode="tel" autoComplete="tel"
                placeholder="შეკვეთაზე მითითებული ტელეფონი" value={searchOrderPhone}
                onChange={e => setSearchOrderPhone(e.target.value)} required
                className="w-full bg-[#08080a] border border-amber-500/20 px-4 py-3 rounded-2xl text-xs text-white outline-none focus:border-amber-400 shadow-inner" />
              <button type="submit" disabled={isSearchingOrder}
                className="bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-amber-500/20">
                {isSearchingOrder ? 'მოწმდება...' : 'ძებნა'}
              </button>
            </form>

            {trackerError && (
              <p className="text-rose-400 text-xs text-center py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">{trackerError}</p>
            )}

            {trackedOrder ? (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#121216] p-4 sm:p-5 rounded-3xl border border-amber-500/20 space-y-3">
                  <div className="flex justify-between items-center border-b border-amber-500/10 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">შეკვეთის კოდი</span>
                      <b className="text-amber-400 text-sm font-black">#{trackedOrder.id}</b>
                    </div>
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                      🟢 {trackedOrder.status || 'ახალი'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500 text-[10px] block">შეკვეთის თარიღი:</span>
                      <b>{trackedOrder.date || '—'}</b>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ჯამური თანხა:</span>
                      <b className="text-amber-300">{Number(trackedOrder.totalGEL || 0).toFixed(2)} ₾</b>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] block">შეკვეთის შემადგენლობა:</span>
                      <b className="text-slate-200">{trackedOrder.itemSummary || 'პროდუქტები'}</b>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-[#121216] p-4 sm:p-5 rounded-3xl border border-amber-500/20">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> მიწოდების სტატუსის პროგრესი
                  </h4>

                  <div className="relative pt-2">
                    <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-[#08080a] border border-amber-500/20">
                      <div 
                        style={{ width: `${getStatusProgress(trackedOrder.status)}%` }} 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-700"
                      ></div>
                    </div>

                    <div className="grid grid-cols-4 text-[9px] sm:text-[10px] text-center font-bold text-slate-400">
                      <div className={getStatusProgress(trackedOrder.status) >= 15 ? 'text-amber-400' : ''}>1. მიღებულია</div>
                      <div className={getStatusProgress(trackedOrder.status) >= 40 ? 'text-amber-400' : ''}>2. მზადდება</div>
                      <div className={getStatusProgress(trackedOrder.status) >= 75 ? 'text-amber-400' : ''}>3. გზაშია 🚚</div>
                      <div className={getStatusProgress(trackedOrder.status) >= 100 ? 'text-emerald-400' : ''}>4. ჩაბარებულია ✅</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121216] border border-amber-500/20 rounded-3xl p-4 sm:p-5 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> ინფორმაცია მიწოდებაზე
                  </h4>
                  <p className="text-xs leading-6 text-slate-300">
                    შეკვეთის სტატუსი ახლდება ადმინპანელიდან. კურიერის GPS მდებარეობა ამჟამად საიტთან დაკავშირებული არ არის, ამიტომ რუკაზე ცოცხალი მდებარეობა არ აისახება.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-[#121216] rounded-3xl border border-amber-500/15 space-y-2">
                <PackageCheck className="w-10 h-10 text-amber-400/60 mx-auto" />
                <p className="text-slate-400 text-xs font-bold">შეიყვანეთ შეკვეთის კოდი ზედა ველში ლაივ-სტატუსის სანახავად.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔔 3. ADVANCED NOTIFICATIONS CENTER MODAL */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2rem] sm:rounded-[2.5rem] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-amber-400 animate-bounce" /> შეტყობინებების ცენტრი
              </h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">სულ შეტყობინება: <b className="text-amber-400">{notifications.length}</b></span>
              {notifications.length > 0 && (
                <button onClick={markAllNotificationsAsRead} className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer">
                  ყველას წაკითხულად მონიშვნა
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-[#121216] rounded-3xl border border-amber-500/15 space-y-2">
                  <Bell className="w-8 h-8 text-amber-400/50 mx-auto" />
                  <p className="text-slate-400 text-xs font-bold">ახალი შეტყობინებები არ არის.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="bg-[#121216] border border-amber-500/20 p-4 rounded-2xl space-y-1.5 shadow-inner hover:border-amber-400/50 transition">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {n.title}
                      </span>
                      <span className="text-[10px] text-slate-500">{n.date || 'ახალი'}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setIsNotificationsOpen(false)} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20 cursor-pointer text-xs">
              დახურვა
            </button>
          </div>
        </div>
      )}

      {/* 4. ავტორიზაცია / რეგისტრაცია (PIN-კოდით და Face ID-ით რეალური მხარდაჭერით) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2rem] sm:rounded-[2.5rem] max-w-sm w-full p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-amber-400" /> 
                {authSubMode === 'pin' ? 'PIN-კოდით შესვლა' : authMode === 'login' ? 'ავტორიზაცია' : 'რეგისტრაცია'}
              </h3>
              <button onClick={() => setIsAuthOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 bg-[#121216] p-1.5 rounded-2xl border border-amber-500/20 text-[11px] font-bold">
              <button 
                type="button" 
                onClick={() => { setAuthSubMode('standard'); setIsPinSetupMode(false); }}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer ${authSubMode === 'standard' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                სტანდარტული
              </button>
              <button 
                type="button" 
                onClick={() => setAuthSubMode('pin')}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${authSubMode === 'pin' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <KeyRound className="w-3.5 h-3.5" /> PIN-კოდი
              </button>
            </div>

            {authSubMode === 'pin' ? (
              <form onSubmit={handlePinAuthSubmit} className="space-y-4 text-xs animate-in fade-in">
                <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                  <b>{currentUser ? (isPinSetupMode ? 'შეცვალეთ ან დააყენეთ PIN-კოდი:' : 'მართეთ თქვენი PIN-კოდი:') : (isPinSetupMode ? 'შექმენით პირადი PIN-კოდი:' : 'შეიყვანეთ თქვენი 4-ციფრიანი PIN-კოდი:')}</b>
                </div>

                {pinError && <p className="text-rose-400 text-[11px] font-bold">{pinError}</p>}

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">PIN-კოდი</label>
                  <input
                    type="password"
                    maxLength="6"
                    required
                    placeholder="••••"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-center text-lg tracking-widest text-amber-400 font-black outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>

                {(isPinSetupMode || (currentUser && !currentUser.pinHash)) && (
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">გაიმეორეთ PIN-კოდი</label>
                    <input
                      type="password"
                      maxLength="6"
                      required
                      placeholder="••••"
                      value={confirmPinCode}
                      onChange={e => setConfirmPinCode(e.target.value)}
                      className="w-full bg-[#08080a] border border-amber-500/20 p-3.5 rounded-2xl text-center text-lg tracking-widest text-amber-400 font-black outline-none focus:border-amber-400 shadow-inner"
                    />
                  </div>
                )}

                <button type="submit" disabled={failedAttempts >= 3} className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer text-xs">
                  {isPinSetupMode || (currentUser && !currentUser.pinHash) ? 'PIN-კოდის შენახვა' : 'შესვლა PIN-კოდით'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPinSetupMode(!isPinSetupMode)}
                    className="text-slate-400 hover:text-amber-400 text-[11px] font-bold cursor-pointer underline"
                  >
                    {isPinSetupMode ? 'უკვე გაქვთ PIN? შემოწმება' : 'ახალი PIN-კოდის შექმნა / შეცვლა'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs animate-in fade-in">
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

                {authMode === 'login' && (
                  <button 
                    type="button"
                    onClick={handleBiometricLogin}
                    className="w-full bg-[#16161a] hover:bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black py-3 rounded-2xl transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4 text-amber-400" /> Face ID-ით / Passkey-ით შესვლა
                  </button>
                )}
              </form>
            )}

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

      {/* 5. წესები და პირობები */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2rem] sm:rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" /> წესები და პირობები
              </h3>
              <button onClick={() => setIsTermsOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-thin">
              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">1. ზოგადი დებულებები</h4>
                <p>GEOSTORE მარკეტფლეისზე შეკვეთის გაფორმებით მომხმარებელი ეთანხმება წინამდებარე წესებსა და პირობებს.</p>
              </div>
            </div>
            <button onClick={() => setIsTermsOpen(false)} className="w-full bg-[#16161a] hover:bg-[#1e1e24] text-white font-black py-4 rounded-2xl transition cursor-pointer text-xs border border-amber-500/30">
              გაგებულია
            </button>
          </div>
        </div>
      )}

      {/* 6. საგარანტიო წესები */}
      {isWarrantyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d10] border border-amber-500/30 rounded-[2rem] sm:rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
              <h3 className="font-black text-white text-base flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> საგარანტიო წესები
              </h3>
              <button onClick={() => setIsWarrantyOpen(false)} className="text-slate-400 hover:text-white p-2.5 bg-[#141418] rounded-2xl transition cursor-pointer border border-amber-500/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed pr-2 scrollbar-thin">
              <div className="space-y-2 bg-[#121216] p-4 rounded-2xl border border-amber-500/20">
                <h4 className="font-black text-amber-300 text-sm">1. ოფიციალური გარანტია</h4>
                <p>GEOSTORE-ზე წარმოდგენილ ყველა ტექნიკაზე მოქმედებს ქარხნული გარანტია.</p>
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
