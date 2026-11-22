# Stage 76 — exhaustive review of same-version / changed-content historical SQL

**NOT RELEASE-READY. Production unchanged. PR #149 remains Draft.**

## Read-only source comparison

Previous Stage75 results left **61** migrations with exactly matching remote
Supabase applied **versions and logical names**, but different SQL content
MD5s. We compared **all 61** actual applied SQL sources (read-only
`supabase_migrations.schema_migrations.statements[1]`) to the matching
GitHub SQL. The same conservative lexer used in Stage74 preserves SQL string
literals, SQL symbols, and nested dollar-quoted PL/pgSQL body tokens while
ignoring comments and whitespace.

- **50 of 61** local and applied migrations have the same executable SQL
  token sequence; their differences were comments/whitespace outside literals.
- **11 of 61** have different executable tokens and require explicit review.
  Some differences may not change the effective runtime result, but they
  cannot be automatically declared equivalent.

The read-only query exposed NO customer, order, staff, financial or stock
records. The PR stores only `version/name`, original source Git blob SHA,
applied SQL MD5 and one-time review classification, not applied SQL bodies.
`release/stage76-existing-version-sql-divergence.json` pins all 61. The
offline CI gate `scripts/stage76ExistingVersionSqlDivergenceGate.mjs`
validates every source blob, MD5, exactly identified critical difference,
and unchanged Stage72–75 baseline. **It does not re-lex remote SQL in CI**,
does not access live Supabase and is not proof of database schema parity.

## Eleven executable-token differences — not safe to replay blindly

| Historical migration | Reviewed difference | Priority |
| --- | --- | --- |
| `20261103044438_add_idempotent_checkout_replay.sql` | Checkout quantity variable declarations differ | Checkout |
| `20261103151704_use_amr_for_admin_order_reactivation.sql` | Admin authorization's historical account literal differs; never infer correct email from the GitHub owner name | Authorization |
| `20261103194444_secure_admin_save_order_note.sql` | Extra SQL statement terminator | SQL syntax |
| `20261106103325_preserve_order_item_variants.sql` | Product query/variant snapshot selection differs | Checkout / stock |
| `20261107115218_persist_checkout_addons_server_pricing.sql` | Input bound **300** in applied source versus **400** in local file | Checkout validation |
| `20261107130302_add_order_status_notifications.sql` | Public wrapper **SECURITY DEFINER** in applied source versus **SECURITY INVOKER** locally | Authorization |
| `20261109102126_support_ticket_threading_and_secure_access.sql` | Ticket threading DDL and routines differ | Support / authorization |
| `20261109102221_fix_support_ticket_message_lookup.sql` | RPC initially in `public` versus local `private` implementation | Support / authorization |
| `20261109102338_harden_support_ticket_rpc_wrappers.sql` | Public/private wrapper implementation and grants differ | Support / authorization |
| `20261109160629_allow_partial_size_color_stock_updates.sql` | Localized stock-error wording differs | Presentation |
| `20261120122908_replenishment_optimistic_concurrency.sql` | Local file has a trailing transaction `COMMIT` absent in applied source | Transaction boundary |

**Current live function metadata was also inspected read-only:** the visible
checkout, order notification, admin order-note and support-ticket public RPCs
are `SECURITY INVOKER` wrappers to protected `private` implementations,
where those exist. This is the current state, not proof that every recorded
historical migration source is equivalent or safe to run again.

## Exact release blockers after Stage76

All **61** same-version SQL-content differences are now classified:
**50 token-equivalent**, **11 token-different**. Separately, of the
remaining **11** different-version/name-matched historical files,
10 were previously token-equivalent and one had a real
`service_role` grant/transaction difference. **Seven** earlier
unregistered migrations remain unapproved (four have proven regressions).
**Four** new release SQL migrations remain pending and source-pinned.

Even with the detailed audit, do not `supabase db push`, replay old
checkout/permission/order functions, auto-repair history or merge the Draft
PR. History fingerprint matching does not replace full **full-schema Supabase**
authenticated **JWT**/PostgREST testing and true end-to-end order/stock
scenarios, which are still unavailable in a free isolated environment.

Publish only after coordinated **Phase A** (3 redaction and add-only
admin-order RPC migrations), new frontend ready and verified, and **Phase B**
(1 post-frontend revoke of raw finance-bearing order reads).

No production SQL/DDL/DML, PR merge, new paid environments, live data change,
or Vercel Production deploy was made. **No paid staging**; **Production unchanged**.
