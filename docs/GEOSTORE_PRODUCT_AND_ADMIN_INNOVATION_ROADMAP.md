# GEOSTORE Product and Admin Innovation Roadmap

Reviewed: 2026-11-17
Repository: `chixradzezauri-design/geostore`
Status: audit and proposals only — no new customer-facing feature or production database change is implemented by this document.

## 1. Audit snapshot

### Customer storefront — verified existing capabilities
- Product catalogue with category/subcategory browsing, search/filter/sort, product variants, size/color inventory, flash-sale pricing, wishlist, comparison, cart, checkout, order history/tracking, notifications and support tickets.
- The app already contains a PWA install-prompt flow; this should be tested and completed rather than replaced.
- Product image upload is validated and the admin gallery uses Supabase Storage.
- The shopping assistant currently uses a local catalogue/rule-based matching engine and explicitly discloses that answers rely on catalogue data and predefined rules. It is not yet a connected generative-AI assistant.
- The visual-search screen currently accepts and previews an image, but intentionally does not perform image similarity search. It tells customers that real visual matching is not enabled.
- The digital wardrobe stores its data in browser localStorage. It is not yet an account-synchronised, cross-device wardrobe.
- Wishlist and comparison state are currently browser-storage based; cross-device account synchronisation should be verified and added if desired.

### Admin panel — verified existing sections
The dashboard has 18 existing sections: analytics/finance, profit calculator, expenses, AI business assistant, staff/roles, orders, products, support, legacy messages, flash sales, activity logs, broadcasts, banners, categories/subcategories, coupons, vendors, CRM users and settings/security.

Existing order, product, inventory, support, finance, pagination, responsive styling and data-safety work must be retained. Do not redesign or replace working sections merely to add new functionality.

### Features that must not be represented as fully operational yet
- Staff/roles are currently a local planning list in browser storage. They do not create Supabase Auth users or enforce server-side permissions.
- Broadcast UI includes a local-only test notification. It does not deliver messages to all customers.
- Vendor persistence is staged separately in Draft PR #123; the live database currently has no vendor table.
- The customer CRM must not be described as a full customer-segmentation or campaign platform until its server-backed data model and consent-safe delivery are implemented.

## 2. Live database and release findings

Read-only inspection of the connected Supabase project found:
- 14 tables in the public schema, 31 public RLS policies, 31 public functions and 5 tables in the `supabase_realtime` publication.
- The live database has the three Storefront Studio tables: `storefront_config`, `storefront_media` and `storefront_versions`.
- No live tables were found for vendors, staff, customer segments, marketing campaigns, inventory movements or purchase orders.
- The vendor-persistence migration from Draft PR #123 is not applied.
- The private support-RPC migration from Draft PR #124 is not applied.
- The customer support-history pagination and support Broadcast migrations in Draft PR #129 are not applied.
- No migration was applied and no live record, order, message, user, product or setting was changed during this audit.

### Security and performance advisor findings
- Two public SECURITY DEFINER support RPCs are currently callable by `anon`: `get_support_ticket_status` and `mark_support_ticket_messages_read`. Their access-token checks and intended guest workflow must be reviewed together with Draft PR #124. Do not remove guest access or add broad grants as a shortcut.
- The advisor also reports authenticated execution for support RPCs including `get_my_support_tickets` and `get_support_ticket_unread_counts`. Confirm exact intended role/ownership behavior and the private-schema exposure configuration before release.
- Leaked-password protection is disabled in Supabase Auth. Recommend enabling it after explicit owner approval and a controlled authentication test.
- `flash_sale_campaigns` and `flash_sale_items` have RLS enabled but no direct policies. This may be intentional because access is mediated by privileged RPCs; verify the RPC boundary before changing policies. Do not add permissive table policies to silence the warning.
- The advisor reports overlapping permissive SELECT policies on `products`, plus seven unused indexes. Review query plans and actual traffic before consolidating policies or dropping indexes; no database performance change is justified from the warning alone.

## 3. Recommended implementation order

### Priority 0 — release safety and operational correctness
1. Reconcile the draft migrations in a controlled release sequence: vendor persistence (#123), private support RPC wrappers (#124), then the customer history/Broadcast migrations in #129. Check dependencies, exact live migration history, RLS, grants, exposed schemas and rollback strategy before any production application.
2. Complete browser-based regression testing for storefront, checkout, authentication, order management and support at 320, 390, 768, 1024 and 1440 CSS-pixel widths.
3. Verify that Realtime failure always degrades to polling without losing updates, and that all admin-only actions are checked by the database rather than hidden only in the UI.
4. Review Auth leaked-password protection and the support RPC advisor findings. No production setting or migration is changed without approval.

### Priority 1 — make the admin panel a real operations workspace
1. **Admin Command Center:** a new first-screen dashboard with actionable queues: new/unprocessed orders, overdue support tickets, low-stock products, expiring flash sales, failed uploads and recent system errors. Every card should deep-link to the relevant existing tab.
2. **Inventory movement ledger:** record each stock change with product/variant, quantity delta, reason, linked order or purchase receipt, actor and timestamp. Keep the current stock field as the fast current balance; make the ledger append-only and reconcile it against orders.
3. **Low-stock automation:** per-product/per-variant thresholds, low-stock alerts, suggested replenishment quantity and a notification history. Avoid automatic stock changes.
4. **Real staff accounts and permissions:** Supabase Auth invitations, server-enforced role/permission checks, least-privilege access, session revocation and immutable admin audit events. Replace local-only staff planning only after a migration and permission tests are ready.
5. **Supplier and purchase-order workflow:** supplier records, draft/approved purchase orders, receiving, partial deliveries, cost history and stock updates only after confirmed receipt. Build on PR #123 rather than duplicating vendor storage.
6. **CRM segments:** customer lifetime value, repeat-purchase status, last order, favourite categories and consent state. Segments should be calculated from permitted order data, not guessed from personal attributes.
7. **Campaign delivery:** customer opt-in, channel selection, preview, scheduled delivery, unsubscribe/suppression, delivery/failure reporting and campaign attribution. A local notification must never be labelled as a sent campaign.
8. **System health:** live Supabase connection/realtime status, last successful order sync, failed jobs/uploads, pending migrations and recent admin activity. Show degraded/unknown states honestly.

### Priority 2 — customer-facing visual and shopping innovation
1. **Real visual product search:** turn the existing upload-and-preview screen into image similarity search using a server-side embedding pipeline and a vector index. Search only published products, return explainable matches and never claim AI matches until the service is configured. Make image retention optional and disclose it.
2. **Smart size and fit assistant:** category-specific size charts, brand fit notes, optional measurements, variant availability and confidence/explanation. Keep measurement data private, optional and deletable; never promise a guaranteed fit.
3. **Cross-device personal wardrobe:** let signed-in customers optionally sync wardrobe items to their account, while preserving guest local storage and offering explicit import/merge. Add outfit suggestions using available catalogue items.
4. **Shop-the-look / outfit builder:** combine clothing, shoes and accessories into a visual outfit, show per-item stock and total price, and add selected items to cart individually or as a set.
5. **Richer product media:** full-screen swipe gallery, zoom, short product video and optional 360-degree spin. Optimize images and lazy-load media to protect mobile performance.
6. **Verified reviews and Q&A:** reviews tied to completed purchases, photo moderation, helpful votes and product questions. Prevent fake review claims.
7. **Wishlist and back-in-stock alerts:** synchronise signed-in wishlists across devices and notify customers only when a selected variant is actually restocked.
8. **Loyalty and referrals:** points for completed orders, tier benefits and referral credits with clear expiry, fraud controls and auditable balances.
9. **Personalized storefront:** recently viewed items, relevant categories and recommendations based on the customer's own interactions, with a clear privacy control.
10. **PWA completion:** verify manifest, icons, offline fallback, update prompts and push-notification consent. The existing install-prompt code should be retained.

## 4. Suggested visual direction

- Keep the existing premium dark/navy and emerald admin identity; improve hierarchy rather than applying another full redesign.
- Make the Command Center more visual with compact KPI cards, trend sparklines, actionable status queues and a clear activity timeline.
- Use consistent product cards with stronger image presentation, concise specifications, stock/variant availability and one clear primary action.
- Use a restrained accent palette: emerald for success/primary actions, amber for pending/warning, red only for destructive/error states.
- On mobile, convert wide admin navigation to a collapsible drawer, keep primary order actions reachable, and make detail modals full-height with sticky action bars.
- Add accessible contrast, keyboard focus, loading skeletons, empty states, clear errors and reduced-motion support.

## 5. Suggested delivery phases

- **Phase A:** close current support/session audit, reconcile migrations and complete browser regression testing.
- **Phase B:** Admin Command Center and stock movement ledger.
- **Phase C:** real staff permissions, vendor/purchase orders and CRM foundations.
- **Phase D:** working visual search, smart sizing and account-synchronised wardrobe.
- **Phase E:** media upgrades, reviews, loyalty and personalised merchandising.

Each phase should be delivered as a small, tested draft PR. Preserve all existing data and behavior, run the complete test suite/build, and require explicit approval before merging, production migrations or deployment.
