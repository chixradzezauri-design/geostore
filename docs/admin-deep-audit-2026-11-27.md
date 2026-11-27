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

## Stage 2 — focused cascade and readability corrections
Stage 1 build check failed on one stale source assertion in adminUnifiedResponsive.test.js expecting exactly seven widths; updated it to require the full eight-width matrix rather than removing or weakening the assertion. Dependency audit passed; responsive browser and CodeQL were still running when inspected. Static CSS review found overlapping 10px/11px finance trend-label rules: remove the older size declaration, retain its muted theme color, use the active table-header typography token with a 12px floor in the unified workspace. Increase sidebar group captions from 11px to 12px. Remove the earlier redundant inactive-nav hover background declaration while preserving its border and the later existing color-mix hover treatment. No palette reset, new CSS layer, logic or data change. Add targeted regression source checks. Rendered effects and exact-commit CI remain unverified; continue audit based on measured results.

## Stage 3 — navigation, header and command center
Stage 2 exact-head build and dependency security audit passed. CodeQL and browser smoke were in progress at inspection. Consolidate navigation group and section-context font sizes in the unified layer; remove older contradictory declarations. Dashboard intro title and KPI values use bounded active title typography, KPI labels use bounded active body typography and card-title color. At 1440px+ use a second header column only when publication actions are present, and let the action group take its intrinsic width. Preserve native navigation, owner/staff gates, disabled states, KPI computations and all handlers. Add actual header-region and action collision/containment assertions for every audited width/module, without replacing existing tests. No new CSS layer or data/logic changes. New rendered effects and full CI are pending.
