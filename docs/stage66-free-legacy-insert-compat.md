# Stage 66 — free, rollback-only legacy checkout INSERT compatibility test

**NO Production release. No paid staging created. Draft PR #149 only.**

## Concrete conflict discovered in the source SQL

This is an **optional guest email** compatibility contract, not a suggestion to loosen other checkout validations.

The live-compatible current guest checkout contract in the version-controlled
`private.create_order_with_stock(jsonb)` accepts an anonymous guest when
`user_email='guest'`; the `customer_email` field is optional. The Stage51
public response wrapper validates email length if supplied, but does not make
the field mandatory.

The older *unapplied* SQL file
`20261106210000_validate_checkout_input_on_order_insert.sql` adds a
`BEFORE INSERT` trigger that **requires an email for every guest order**.
If blindly applied, this would reject valid guest checkouts that currently
succeed. The mismatch is an example of why a name/version reconciliation
cannot be replaced with automatic `supabase db push`.

This finding concerns one particular legacy file. It does NOT establish that
the newer Stage51/54/57 security migrations have passed full-schema Supabase
staging, nor does it prove that any other historical SQL file is safe to apply.

## Evidence: real source SQL in no-cost isolated PostgreSQL 17

`tests/sql/stage66_legacy_checkout_insert_compat_gate.sql` is run at the
end of the **existing** GitHub Actions disposable PostgreSQL 17 job. It uses
the previously installed genuine Stage51 public checkout redaction wrapper,
the real Stage61 private checkout, the Stage60 inventory movement triggers,
and Stage62 synthetic variant stock. The test never touches real purchases.

It checks three independent synthetic behaviors:

1. A valid size/color guest checkout **without customer_email succeeds**
   before installing the old trigger. Customer total and selected variant are
   preserved; receipt does not expose cost/vendor data.
2. The same checkout **fails with the exact expected legacy email-validation
   error** after installing the source SQL trigger. An unrelated stock, role,
   schema, authentication or data error will fail the test rather than being
   mislabeled as a legacy incompatibility.
3. The checkout **still succeeds when customer_email is supplied**, after
   installing the old trigger. Exact stock decrement and inventory ledger
   bookkeeping remain consistent.

The original historical SQL is NOT changed. Its `BEGIN/COMMIT` wrapper
is safely omitted by the validated source-extraction helper
`scripts/stage66LegacyCheckoutFixture.mjs` to let the entire experiment
run in ONE caller-owned transaction ending in `ROLLBACK`. A final assertion
checks that the trigger/function, synthetic orders and stock adjustments do
not survive. Its purpose is compatibility discovery, not a migration script.

## Recommended release decision

**Do not replay** the obsolete
`20261106210000_validate_checkout_input_on_order_insert.sql` on Production
without a separately reviewed behavior change. Requiring guests to supply
email may be a product decision, but cannot be introduced accidentally as a
side effect of timestamp reconciliation. Existing customers and live order
history must remain untouched.

The earlier migration history audit still reports **42 migration** files
without matching applied version; three intentional newer finance/checkout
migrations remain staged only. No automatic migration repair is authorized.

Full-schema Supabase staging and live-authenticated JWT/role, checkout,
idempotency, stock, order status/reactivation and finance boundary tests
remain necessary before a coordinated Production deployment. The user
declined any paid staging environment; do not create one, incur usage fees,
or publish the unsafe combined PR as a workaround.

Production remains on its previous stable commit, with no merge or schema
write during this stage.
