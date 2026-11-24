# Stage89 — support RPC rehearsal and release closure

**NOT RELEASE-READY. Production unchanged.** This stage uses no paid staging.

Ten current public/private support RPC definitions were captured via read-only PostgreSQL catalog metadata on 2026-11-24, without reading ticket, user or order records. Each matches Stage82 function MD5 and anon/authenticated grants. The test-only SQL file is not a new migration and cannot be used for historical repair. The signed local fixture tests customer ownership, outsider denial, guest token checks, idempotent replies, read receipts, customer history and support staff revocation. Existing email fallback is deliberately preserved and is not claimed to be UUID-only. Synthetic fixture does not prove full-schema parity or real ticket creation.

## Release closure — stop adding unrelated enhancements

1. Before any live write, review the exact green PR commit, fresh production schema/catalog and migration history, validate the four pending SQL hashes, and establish a no-cost staging-equivalent/full-schema rehearsal or an explicitly reviewed bounded release risk and targeted rollback plan. Historical differences are documented; no historical replay, blind db push, or automatic history repair. The prior production version must remain available.
2. Phase A: only the three reviewed additive/redaction migrations, in order; verify checkout, history, staff permissions and both order projection RPCs before deploying frontend. If any check fails, stop.
3. Merge/deploy the exact reviewed frontend, verify Vercel READY and customer/admin workflows. Handle old tabs by coordinated refresh, verify the new ledger and image reference APIs. Phase B: only after those checks, revoke legacy raw snapshots; verify authorization and stock/status compatibility again. Do not blindly restore sensitive grants as rollback.

This is a finite release checklist, not authorization to execute it. All previously identified unreconciled SQL, full-schema coverage and cutover risk remain explicit until reviewed; do not add unrelated work as a new release prerequisite. Production unchanged; no live SQL writes or publish in Stage89.
