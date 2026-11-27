# GEOSTORE — deep admin visual audit, 2026-11-27

Base: d85dfa864ae8a9078016d99091dda51e4eb81da6, merged PR #174. One new draft PR, no production merge or deliberate preview deployments. Previous PR #174 head had four successful Actions workflows: build, dependency security, CodeQL and responsive browser smoke. Historical evidence only.

## Stage 1: inventory and measurement
Main dashboard ~682 KB, CharacterStudio ~72 KB and PanelVisualEditor ~181 KB. Legacy global admin CSS, delayed admin core, visual editor, video refinements and unified workspace rules coexist. Do not delete layers or reset owner settings without computed-style evidence. Existing owner fixture covers 23 modules with synthetic backend, no writes. It does not cover every populated order/finance/CRM state, real staff accounts or every custom preset. Prioritize confirmed findings.

Extend Chromium/WebKit matrix to 1920px in addition to 320/360/390/430/768/1024/1440. Record width-short controls, text below 12px, horizontal text overflow and inspected text counts alongside existing height, overflow and navigation checks. New counts are diagnostic only; intentional truncation and native rendering require inspection before gating. Keep existing strict geometry and no-write gates. No text, identifiers, input values or live customer data collected.

## Progression
1. Inspect measurement results and isolate actual CSS precedence conflicts.
2. Unify Georgian-capable typography, spacing, semantic colors, focus and control sizing while honoring saved customizations.
3. Navigation and dashboard; products, categories, orders and inventory; finance, analytics, suppliers and purchases; staff, CRM and support; promotions, banners, flash, coupons and editors/settings.
4. Extend isolated fixture coverage with populated states, long labels, staff roles and custom themes; actual-device audit separately.
5. Verify exact final commit through build, unit, Chromium/WebKit and relevant security gates; explicit approval before merge.

Stage 1 changes only tests, audit notes and branch-specific Vercel deployment exclusion. No runtime CSS, Auth, database, business handler or migration changes. New CI results and authenticated production visuals not yet verified.
