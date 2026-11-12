# GEOSTORE — Admin CRM Persistence Audit (2026-11-12)

## Scope and method
Read-only source inspection on `fix/admin-panel-audit-2026-11-10` at the audited branch head preceding this report. Reviewed:
- `src/App.jsx`
- `src/components/AdminDashboardPro.jsx`
- `src/utils/localCollectionStorage.js`

No Production database, schema, customer account, order, message, Storage object, or deployment was changed.

## Confirmed findings

### 1. Customer CRM fields are browser-local, not server-synchronized
- `App.jsx` initializes `usersList` from `localStorage` key `geostore_users_list`.
- `App.jsx` writes the same state back to that localStorage key.
- The CRM handlers in `AdminDashboardPro.jsx` save VIP flag, CRM block marker, personal discount, and admin notes through `saveLocalCollection(window.localStorage, 'geostore_users_list', ...)`.
- The CRM delete handler explicitly removes only the local CRM row; its confirmation text says it does not delete the Supabase Auth account or orders.
- No server persistence or cross-device synchronization was found for these CRM fields in the inspected data flow.
- UI copy correctly clarifies that the CRM block marker does not block the actual Auth account.

**Impact:** CRM edits are device/browser-specific. They will not reliably appear on another device, browser, or cleared browser storage. This is not a reliable customer directory sourced from Supabase Auth.

### 2. Staff list is also browser-local planning data
- `AdminDashboardPro.jsx` loads and saves `geostore_staff_list` in localStorage.
- The source comment explicitly says this is a local planning list and does not create Supabase Auth users or grant server permissions.

**Impact:** Staff entries and their displayed permission flags do not provision real staff accounts or enforce server-side authorization.

### 3. Broadcast panel includes a local-only test notification path
- The inspected handler writes `geostore_broadcasts` in localStorage.
- The UI confirmation explicitly says the notification is saved only on this device and is not sent to other users.

**Impact:** This feature must not be presented as a live customer notification system.

### 4. Local save helper
- `saveLocalCollection` validates the storage object, key, and array, serializes the collection, then calls `setItem`.
- It does not create server persistence, backups, or cross-device synchronization.
- CRM update handlers update React state only after localStorage write succeeds.

## Recommended safe follow-up (not applied)
1. Decide the intended customer identity source: authenticated customer accounts only, or also guest buyers identified by order contact details. Do not silently merge guest and authenticated identities.
2. Design a dedicated admin-only CRM persistence layer (table plus narrowly scoped server RPCs/RLS) for VIP, notes, discount, and any operational flags. Keep Auth account blocking separate from a CRM marker.
3. Migrate existing browser-local CRM rows only after a preview/export and an explicit matching strategy; preserve unmatchable legacy rows rather than dropping them.
4. Implement actual staff provisioning/permissions separately from the local staff planning list; do not treat local permission labels as authorization.
5. Label test-only local broadcasts clearly or replace with a real server-backed announcement workflow without deleting the existing test history.
6. Add tests for cross-session persistence, role enforcement, customer ownership, guest identity ambiguity, and failed-save rollback.

## Safety / release status
- This is a code-path audit only; no feature was removed or changed.
- No localStorage records were read from the user's device or copied to the repository.
- No Production mutation, migration, merge, or deployment was performed.
- Existing migration-source and backup/release blockers remain in force.
