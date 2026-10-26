// src/components/AdminDashboardPro.jsx
import React from 'react';
import { Shield, TrendingUp, DollarSign, PackageCheck, Bell, LogOut } from 'lucide-react';

export default function AdminDashboardPro({
  adminLoggedIn,
  setAdminLoggedIn,
  adminLoginForm,
  setAdminLoginForm,
  handleAdminLogin,
  adminError,
  proAnalytics,
  orders,
  formatPrice
}) {
  if (!adminLoggedIn) {
    return (
      <div className="max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl text-center my-10">
        <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-base font-bold text-white">ადმინისტრატორის შესვლა</h2>
        <p className="text-[10px] text-slate-400">მხოლოდ უფლებამოსილი პირებისთვის (admin / admin123)</p>
        <form onSubmit={handleAdminLogin} className="space-y-3 text-xs">
          <input 
            type="text" 
            placeholder="მომხმარებელი" 
            value={adminLoginForm.username} 
            onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})} 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500" 
          />
          <input 
            type="password" 
            placeholder="პაროლი" 
            value={adminLoginForm.password} 
            onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})} 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500" 
          />
          <div className="flex items-center gap-2 text-left">
            <input 
              type="checkbox" 
              id="remMe" 
              checked={adminLoginForm.remember} 
              onChange={e => setAdminLoginForm({...adminLoginForm, remember: e.target.checked})} 
              className="rounded accent-emerald-500" 
            />
            <label htmlFor="remMe" className="cursor-pointer text-[11px] text-slate-300">მომიმახსოვრე</label>
          </div>
          {adminError && <p className="text-rose-400 text-xs font-bold">{adminError}</p>}
          <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-xl shadow hover:bg-emerald-400 transition">
            შესვლა პანელში
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-3 shadow">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" /> პროფესიონალური ადმინ პანელი
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">სისტემის მართვის ცენტრი და ფინანსური ანალიტიკა</p>
        </div>
        <button 
          onClick={() => { setAdminLoggedIn(false); localStorage.removeItem('geostore_admin_remember'); }} 
          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" /> გასვლა
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-emerald-400" /> შემოსავალი</p>
          <p className="text-2xl font-black text-emerald-400">{formatPrice(proAnalytics.totalRevenueGEL)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-teal-400" /> სავარაუდო მოგება</p>
          <p className="text-2xl font-black text-teal-400">{formatPrice(proAnalytics.netProfitGEL)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><PackageCheck className="w-4 h-4 text-blue-400" /> შეკვეთები</p>
          <p className="text-2xl font-black text-blue-400">{proAnalytics.totalOrdersCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 shadow">
          <p className="text-slate-400 text-xs font-bold flex items-center gap-1.5"><Bell className="w-4 h-4 text-amber-400" /> დაბალი მარაგი</p>
          <p className="text-2xl font-black text-amber-400">{proAnalytics.lowStockProducts.length}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-emerald-400" /> შეკვეთების სია ({orders.length})
        </h3>
        <div className="space-y-2.5">
          {orders.length === 0 ? (
            <p className="text-slate-500 text-xs">შეკვეთები არ მოიძებნა.</p>
          ) : (
            orders.map(o => (
              <div key={o.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-emerald-400">#{o.id} ({o.date})</span>
                  <p className="text-slate-200 mt-1">მყიდველი: <b>{o.customerName}</b> ({o.phone})</p>
                </div>
                <span className="font-black text-white text-sm">{formatPrice(o.totalGEL)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
