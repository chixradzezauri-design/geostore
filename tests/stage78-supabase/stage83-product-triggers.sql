-- Stage83: run exact source-trigger extraction against synthetic local data.
\set ON_ERROR_STOP on
\i /tmp/stage83-original-stock-triggers.sql
-- Restore parent aggregate for a fixture inserted before source triggers.
UPDATE public.products SET variants=variants WHERE id='STAGE80-SHOE';
DO $check$
BEGIN
 IF (SELECT stock FROM public.products WHERE id='STAGE80-SHOE')<>5 THEN
   RAISE EXCEPTION 'Stage83 size/color product aggregate not 5';
 END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.products'::regclass
    AND tgenabled='O' AND NOT tgisinternal AND tgname IN
    ('preserve_product_variant_stock','zz_sync_size_color_aggregate_stock',
     'products_inventory_movement_after_change'))<>3 THEN
   RAISE EXCEPTION 'Stage83 source guard/aggregate/ledger trigger triad missing';
 END IF;
END $check$;
NOTIFY pgrst, 'reload schema';
