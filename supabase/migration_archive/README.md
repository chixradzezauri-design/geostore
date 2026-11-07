# GEOSTORE migration reconciliation archive

The live Supabase migration ledger was read-only inspected and its latest recorded version was
`20261107221605`. The SQL snapshots in this directory were staged under earlier version
numbers but were not present in the live ledger. They are archived here so they are preserved
for review without being picked up by `supabase db push`.

Do not apply files from this directory.

The forward-only replacements are in `supabase/migrations`, in this order:

1. `20261108030000_bind_order_ownership_to_auth_user_uuid.sql`
2. `20261108030100_restrict_public_storefront_config_columns.sql`
3. `20261108030200_enforce_checkout_pricing_precision.sql`
4. `20261108030300_add_product_optimistic_version.sql`
5. `20261108030400_add_secure_product_reviews.sql`

The previous order-history redaction migration is superseded by the stricter UUID-scoped,
field-whitelisted `get_my_orders` implementation in step 1.

These migrations are staged only. They have not been applied to the live Supabase database.
Before production application, review the complete diff and run a controlled migration test.
