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


test('finance chart and captions use bounded readable presentation without changing values',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),video=read('src/adminVideoRedesign.css'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.match(css,/\.admin-analytics-trend-bars \[role="listitem"\] \{[^}]*flex: 1 0 56px !important; min-inline-size: 56px/);
 assert.ok(css.includes('clamp(12px,var(--admin-vd-bodyFontSize-active,14px),16px)'));
 assert.doesNotMatch(video,/\.admin-analytics-value \{[^}]*font-size:clamp\(20px,calc\(var\(--admin-vd-titleFontSize-active,18px\)/);
 assert.ok(css.includes('#admin-expense-description-help,#admin-expense-amount-help'));
 assert.ok(smoke.includes('financial form help too small'));
 assert.ok(smoke.includes('finance chart column too narrow'));
});


test('finance video follow-up owns operational surfaces and separates error from neutral progress',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminUnifiedWorkspace.css');
 for(const cls of ['admin-analytics-card','admin-analytics-toolbar','admin-finance-sources-panel','admin-finance-expenses-panel','admin-finance-products-panel','admin-finance-vendors-panel','admin-profit-calculator','admin-calculator-results','admin-expense-entry-panel','admin-local-vendor-entry-panel','admin-local-vendor-list-panel']){
   const classes=[...app.matchAll(/className="([^"]+)"/g)].map(m=>m[1]).filter(s=>s.split(/\s+/).includes(cls));
   assert.ok(classes.length>0,cls);
   assert.ok(classes.every(s=>!/(?:bg-slate-9|shadow-|backdrop-blur|rounded-\[2\.5rem\])/.test(s)),cls);
 }
 assert.ok(app.includes('admin-finance-reconciliation-warning'));
 const stage=css.split('/* Finance video follow-up:')[1];
 assert.match(stage,/admin-expense-mutation-notice\[role="alert"\][^}]+background: #fce5e8 !important; color: #9c2538/);
 assert.match(stage,/admin-expense-mutation-notice\[role="status"\][^}]+background: var\(--av-inset\) !important; color: var\(--av-text\)/);
 assert.ok(stage.includes('admin-local-vendor-list-panel'));
 assert.ok(app.includes('onSubmit={handleAddExpense}'));
 assert.ok(app.includes('onSubmit={handleAddVendor}'));
});
