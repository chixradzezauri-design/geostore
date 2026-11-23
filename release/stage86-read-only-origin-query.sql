-- Stage86: read-only Production migration provenance query (no user rows).
-- This queries only pg_catalog, information_schema and applied migration metadata.
-- Exports NO raw migration SQL, function bodies, customer/order/staff or inventory data.
SELECT jsonb_build_object(
 'version',m.version,
 'name',m.name,
 'statementCount',cardinality(m.statements),
 'appliedSqlMd5',md5(array_to_string(m.statements,E'\n')),
 'appliedSqlLength',length(array_to_string(m.statements,E'\n')),
 'createsGuard',array_to_string(m.statements,E'\n') ~* 'CREATE[[:space:]]+(OR[[:space:]]+REPLACE[[:space:]]+)?FUNCTION[[:space:]]+private[.]reject_unpublished_products_in_new_orders',
 'createsTrigger',array_to_string(m.statements,E'\n') ~* 'CREATE[[:space:]]+TRIGGER[[:space:]]+reject_unpublished_products_in_new_orders',
 'createsPublishedColumn',array_to_string(m.statements,E'\n') ~* 'ADD[[:space:]]+COLUMN.*is_published',
 'definitionMd5',md5(pg_get_functiondef('private.reject_unpublished_products_in_new_orders()'::regprocedure)),
 'triggerMd5',(SELECT md5(pg_get_triggerdef(t.oid)) FROM pg_trigger t
   WHERE t.tgrelid='public.orders'::regclass AND t.tgname='reject_unpublished_products_in_new_orders'),
 'published',(SELECT jsonb_build_object(
   'data_type',data_type,'nullable',is_nullable,'default',column_default)
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='products' AND column_name='is_published')
)::text AS snapshot
FROM supabase_migrations.schema_migrations m
WHERE m.version='20261110100653' AND m.name='hide_test_products_from_storefront';
