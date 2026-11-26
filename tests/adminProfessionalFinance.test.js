import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO finance keeps report verification, eight financial KPI identities and financial operations',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 assert.deepEqual([...app.matchAll(/data-admin-pro-finance-kpi="([^"]+)"/g)].map(m=>m[1]),['revenue','gross','expense','delivered','cancelled','average','addons','net']);
 for(const term of ['verifiedFinanceSnapshot ? "verified" : "pending"','!verifiedFinanceSnapshot || financialOverview.netProfit === null','ordersVerifiedForReports ? financialOverview.totalSalesRevenue','expensesVerifiedForReports ? financialOverview.totalExpenses','handleExportAnalytics','handleAddExpense','handleDeleteExpense(exp.id)','visibleAdminTab === \'analytics\' && !isOwner && <StaffAnalyticsSummary />','calculatedSalesMetrics.netProfit < 0 ? "loss" : "nonnegative"','calculatedSalesMetrics.profitMargin.toFixed(1)','onSubmit={handleAiAsk}','data-admin-pro-assistant-role','გარე AI მოდელი დაკავშირებული არ არის'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 09')[1];
 assert.ok(css.includes('var(--admin-vd-cardTitleText-active'));
 assert.ok(css.includes('overscroll-behavior-inline:contain'));
 assert.ok(css.includes('.admin-ai-composer'));
});
