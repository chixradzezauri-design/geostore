// src/components/AdminDashboardPro.jsx
import React from 'react';
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, Package, RefreshCcw, FileText, Download, ShieldAlert 
} from 'lucide-react';

export default function AdminDashboardPro({
  proAnalytics,
  crmAnalytics,
  returnsList,
  orders,
  setReturnsList,
  setUsersList,
  exportOrdersCSV,
  handleManualRefresh
}) {
  return (
    <div className="space-y-6 w-full text-xs">
      {/* 📊 ANALYTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>მთლიანი შემოსავალი</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{proAnalytics.totalRevenueGEL.toLocaleString()} ₾</div>
          <p className="text-[10px] text-slate-500">წმინდა მოგება: ~{proAnalytics.netProfitGEL.toLocaleString()} ₾</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>შეკვეთები</span>
            <ShoppingCart className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-black text-white">{proAnalytics.totalOrdersCount}</div>
          <p className="text-[10px] text-slate-500">ჩაბარებული: {proAnalytics.completedOrdersCount}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>საშუალო ქეკვეთა</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">{proAnalytics.avgOrderValue} ₾</div>
          <p className="text-[10px] text-slate-500">AOV მაჩვენებელი</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>კრიტიკული მარაგი</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{proAnalytics.lowStockProducts.length}</div>
          <p className="text-[10px] text-slate-500">პროდუქტი ამოწურვის პირასაა</p>
        </div>
      </div>

      {/* 🚀 QUICK ACTIONS */}
      <div className="flex flex-wrap gap-2.5">
        <button onClick={handleManualRefresh} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow">
          <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" /> მონაცემების განახლება
        </button>
        <button onClick={exportOrdersCSV} className="bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow">
          <Download className="w-3.5 h-3.5 text-teal-400" /> ექსპორტი (CSV)
        </button>
      </div>

      {/* 👥 CRM CLIENTS & SEGMENTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-400" /> მომხმარებელთა სეგმენტაცია (CRM)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="p-2">სახელი</th>
                <th className="p-2">კონტაქტი</th>
                <th className="p-2">სეგმენტი</th>
                <th className="p-2">შეკვეთები</th>
                <th className="p-2">დახარჯული</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {crmAnalytics.map(u => (
                <tr key={u.id} className="hover:bg-slate-950/40">
                  <td className="p-2 font-bold text-white">{u.name}</td>
                  <td className="p-2 text-slate-400">{u.email} • {u.phone}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      u.segment.includes('VIP') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {u.segment}
                    </span>
                  </td>
                  <td className="p-2 font-bold">{u.realOrdersCount}</td>
                  <td className="p-2 font-black text-emerald-400">{u.realTotalSpent} ₾</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📦 ORDERS MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <Package className="w-4 h-4 text-emerald-400" /> შეკვეთების მართვა
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="p-2">ID</th>
                <th className="p-2">თარიღი</th>
                <th className="p-2">მყიდველი</th>
                <th className="p-2">თანხა</th>
                <th className="p-2">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-slate-500">შეკვეთები არ არის.</td></tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-950/40">
                    <td className="p-2 font-bold text-emerald-400">#{o.id}</td>
                    <td className="p-2 text-slate-400">{o.date}</td>
                    <td className="p-2 font-bold text-white">{o.customerName} ({o.phone})</td>
                    <td className="p-2 font-black text-emerald-400">{o.totalGEL} ₾</td>
                    <td className="p-2">
                      <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
