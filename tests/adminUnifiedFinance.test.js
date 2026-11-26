import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('finance overview promotes the eight existing KPIs without changing verification or amounts',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const area=app.slice(app.indexOf('<div className="admin-analytics space-y-6">'),app.indexOf('<div className="admin-profit-calculator'));
 assert.ok(area.indexOf('data-admin-pro-finance-state')<area.indexOf('className="admin-analytics-kpis'));
 assert.ok(area.indexOf('className="admin-analytics-kpis')<area.indexOf('aria-labelledby="admin-business-comparison-title"'));
 assert.deepEqual([...area.matchAll(/data-admin-pro-finance-kpi="([^"]+)"/g)].map(m=>m[1]),['revenue','gross','expense','delivered','cancelled','average','addons','net']);
 for(const term of ['!verifiedFinanceSnapshot || financialOverview.netProfit === null','ordersVerifiedForReports ? financialOverview.totalSalesRevenue','expensesVerifiedForReports ? financialOverview.totalExpenses','handleExportAnalytics','financialOverview.salesTrend.map','point.revenue.toFixed(2)','Math.max(0, (point.revenue / maxRevenue) * 100)'])assert.ok(area.includes(term),term);
 for(const term of ['handleAddExpense','handleDeleteExpense(exp.id)','calculatedSalesMetrics.netProfit.toFixed(2)','calculatedSalesMetrics.profitMargin.toFixed(1)','data-admin-unified-expense-state'])assert.ok(app.includes(term),term);
});
test('financial presentation uses responsive grids and a zero-based chart, without page clipping',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 09 — finance and analytics.')[1];
 for(const term of ['admin-unified-chart-column','@container (min-width: 400px)','@container (min-width: 850px)','data-admin-unified-net="loss"','data-admin-unified-expense-state="verified"'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
