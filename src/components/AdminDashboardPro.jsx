// src/components/AdminDashboardPro.js
import React from 'react';
import { BarChart2, Download, DownloadCloud, DollarSign, Smartphone, Users, RotateCcw, PackageCheck, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminDashboardPro({ 
  proAnalytics, 
  crmAnalytics, 
  returnsList, 
  orders, 
  setReturnsList, 
  setUsersList, 
  exportOrdersCSV, 
  handleManualRefresh, 
  setActiveTab, 
  setAdminActiveSubTab 
}) {
  return (
    <div className="space-y-5 w-full bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" /> Dashboard Analytics Pro
          </h2>
          <p className="text-slate-400 text-xs">რეალური ფინანსური ანალიტიკა და ბიზნეს მეტრიკები სრულად აწყობილი.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportOrdersCSV} className="bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
          <button onClick={handleManualRefresh} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow">
            <DownloadCloud className="w-3.5 h-3.5" /> Download Report
          </button>
        </div>
      </div>

      {/* Top 3 Metric Cards Matching Image Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-bold">Total Products Sales</span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">+10% 📈</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">{proAnalytics.totalRevenueGEL.toLocaleString()}</div>
          <button onClick={() => setActiveTab('store')} className="text-xs text-emerald-400 font-bold flex items-center gap-1 hover:underline">
            View Sales Details &rarr;
          </button>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign className="w-24 h-24 text-emerald-400" /></div>
          <div className="flex justify-between items-center z-10">
            <span className="text-slate-300 text-xs font-bold">Total Sales (Revenue & Net)</span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">+45% 🚀</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight z-10">${proAnalytics.netProfitGEL.toLocaleString()}</div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 z-10 font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Revenue</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Total Profit</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-bold">Total Sales Statistics</span>
            <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-bold">Monthly ▾</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-[11px] text-slate-300">
              <p>🪑 Furniture: <b className="text-white">89.532</b></p>
              <p>💻 Electronics: <b className="text-white">90.231</b></p>
              <p>👕 Clothes: <b className="text-white">88.865</b></p>
              <p>👟 Shoes: <b className="text-white">1.88.500</b></p>
            </div>
            <div className="relative w-24 h-24 rounded-full border-4 border-emerald-500/40 flex items-center justify-center bg-slate-950 text-center shadow-inner">
              <div>
                <p className="text-xs font-black text-emerald-400">23,324</p>
                <p className="text-[8px] text-emerald-500 font-bold">+45% 🔄</p>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-bold">
            <span>Total Number of Sales</span>
            <span className="text-white text-xs font-black">3,44,0031</span>
          </div>
        </div>
      </div>

      {/* Second Row: Volume & Monthly Bar Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className="lg:col-span-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-slate-400 text-xs font-bold">Total Volume Of Products</span>
            <div className="text-2xl font-black text-white mt-2">123,726</div>
            <span className="inline-block mt-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">-12% 📉</span>
          </div>
          <button onClick={() => setActiveTab('store')} className="mt-4 text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1">
            View All Products &rarr;
          </button>
        </div>

        <div className="lg:col-span-8 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-xs text-slate-300">Monthly Revenue & Volume Dynamics</h4>
            <span className="text-[10px] text-emerald-400 font-bold">2026 Real-Time Sync</span>
          </div>
          <div className="grid grid-cols-5 gap-3 items-end h-32 pt-4">
            {[
              { month: 'Jan', val: '65%', amount: '3,400₾' },
              { month: 'Feb', val: '45%', amount: '2,800₾' },
              { month: 'Mar', val: '85%', amount: '5,200₾' },
              { month: 'Apr', val: '50%', amount: '3,100₾' },
              { month: 'May', val: '75%', amount: '4,600₾' }
            ].map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[9px] text-emerald-400 font-bold">{m.amount}</span>
                <div className="w-full bg-slate-950 rounded-xl overflow-hidden h-full flex items-end border border-slate-800">
                  <div style={{ height: m.val }} className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Third Row: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className="lg:col-span-8 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3.5 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-sm text-white">Recent Orders</h4>
              <p className="text-[10px] text-slate-400">Keep track of recent order data and others information.</p>
            </div>
            <button onClick={() => setAdminActiveSubTab('orders')} className="text-xs text-emerald-400 font-bold hover:underline">View All &rarr;</button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="pb-2">Order Id</th>
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Payment</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                <tr>
                  <td className="py-2.5 font-bold text-emerald-400">#202523</td>
                  <td className="py-2.5 text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Airpods Pro Max</td>
                  <td className="py-2.5 text-slate-400">28 Mar 2025</td>
                  <td className="py-2.5 text-slate-300">Mastercard</td>
                  <td className="py-2.5 font-bold text-white">$1,230.00</td>
                  <td className="py-2.5"><span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold text-[9px]">In Progress</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-emerald-400">#202522</td>
                  <td className="py-2.5 text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Summer Clothes</td>
                  <td className="py-2.5 text-slate-400">27 Mar 2025</td>
                  <td className="py-2.5 text-slate-300">Paypal</td>
                  <td className="py-2.5 font-bold text-white">$3,112.00</td>
                  <td className="py-2.5"><span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold text-[9px]">Complete</span></td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-emerald-400">#202521</td>
                  <td className="py-2.5 text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Nike Shoes</td>
                  <td className="py-2.5 text-slate-400">26 Mar 2025</td>
                  <td className="py-2.5 text-slate-300">Mastercard</td>
                  <td className="py-2.5 font-bold text-white">$1,211.00</td>
                  <td className="py-2.5"><span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold text-[9px]">Waiting</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-white">Top Selling Products</h4>
            <span className="text-[10px] bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-bold">Monthly ▾</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-lg p-1 border border-slate-800 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs">Apple Watch Series 10 46mm GPS</h5>
                <p className="text-[10px] text-slate-400">Brand: Apple | 10k Stock Available</p>
                <p className="text-emerald-400 font-black text-xs mt-0.5">$799.00</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400">Tue</p>
              <p className="text-xs font-black text-emerald-400 mt-1">840</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400">Wed</p>
              <p className="text-xs font-black text-emerald-400 mt-1">2000</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400">Thu</p>
              <p className="text-xs font-black text-emerald-400 mt-1">6000</p>
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
              <p className="text-[9px] text-slate-400">Fri</p>
              <p className="text-xs font-black text-emerald-400 mt-1">1200</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
