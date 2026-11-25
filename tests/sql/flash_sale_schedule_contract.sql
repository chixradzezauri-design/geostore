\set ON_ERROR_STOP on
DO $ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private,auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
CREATE TABLE public.products(id text PRIMARY KEY,category text,price_gel numeric,old_price_gel numeric,variants jsonb,flash_sale_started_at timestamptz,flash_sale_ends_at timestamptz,flash_sale_percent numeric);
CREATE TABLE public.flash_sale_items(product_id text);
\ir ../../release/staged-flash-sale-schedule.sql
INSERT INTO public.products(id,category,price_gel,old_price_gel,variants) VALUES ('base','bags',100,NULL,'[]'),('markdown','bags',80,100,'[]'),('variant','bags',100,NULL,'[{}]'),('other','shoes',100,NULL,'[]'),('legacy','bags',100,NULL,'[]');
INSERT INTO public.flash_sale_items VALUES ('legacy');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT set_config('request.jwt.claims','{"app_metadata":{"role":"admin"}}',false);
DO $$ BEGIN
  BEGIN PERFORM public.admin_schedule_flash_sale('bags',20,1,now()+interval '2 hours'); RAISE EXCEPTION 'non-owner allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','1060de3d-d28a-45f8-9a64-5e0368cffc4b',false);
SELECT public.admin_schedule_flash_sale('bags',20,1,now()+interval '2 hours');
DO $$ BEGIN
 IF jsonb_array_length(public.admin_list_flash_sale_schedule())<>1 THEN RAISE EXCEPTION 'list failed'; END IF;
 BEGIN PERFORM public.admin_schedule_flash_sale('ყველა',20,1,now()+interval '2 hours'); RAISE EXCEPTION 'overlap allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.admin_schedule_flash_sale(text,numeric,integer,timestamptz)','EXECUTE') OR has_function_privilege('authenticated','private.run_due_flash_sale_schedule()','EXECUTE') OR has_table_privilege('authenticated','private.flash_sale_schedule','SELECT') THEN RAISE EXCEPTION 'unexpected privileges'; END IF;
 IF private.run_due_flash_sale_schedule()<>0 OR (SELECT price_gel FROM public.products WHERE id='base')<>100 THEN RAISE EXCEPTION 'early price update'; END IF;
END $$;
UPDATE private.flash_sale_schedule SET starts_at=now()-interval '1 minute', ends_at=now()+interval '59 minutes';
DO $$ BEGIN
 IF private.run_due_flash_sale_schedule()<>1 OR (SELECT price_gel FROM public.products WHERE id='base')<>80 THEN RAISE EXCEPTION 'activation failed'; END IF;
 IF (SELECT updated_count FROM private.flash_sale_schedule)<>1 OR (SELECT old_price_gel FROM public.products WHERE id='base')<>100 THEN RAISE EXCEPTION 'incorrect scope'; END IF;
 IF private.run_due_flash_sale_schedule()<>0 THEN RAISE EXCEPTION 'duplicate activation'; END IF;
 IF EXISTS(SELECT 1 FROM public.products WHERE id IN ('variant','other','legacy') AND price_gel<>100) OR (SELECT price_gel FROM public.products WHERE id='markdown')<>80 THEN RAISE EXCEPTION 'unsafe price change'; END IF;
END $$;
-- Cancellation and missed window are non-mutating terminal outcomes.
SET ROLE authenticated;
SELECT public.admin_schedule_flash_sale('shoes',30,1,now()+interval '2 hours');
SELECT public.admin_cancel_flash_sale_schedule((public.admin_list_flash_sale_schedule()->0->>'id')::uuid);
RESET ROLE;
INSERT INTO private.flash_sale_schedule(category,discount_percent,starts_at,ends_at,created_by) VALUES('shoes',20,now()-interval '2 hours',now()-interval '1 hour','1060de3d-d28a-45f8-9a64-5e0368cffc4b');
DO $$ BEGIN
 IF private.run_due_flash_sale_schedule()<>1 OR (SELECT price_gel FROM public.products WHERE id='other')<>100 THEN RAISE EXCEPTION 'missed schedule changed price'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.flash_sale_schedule WHERE status='cancelled') OR NOT EXISTS(SELECT 1 FROM private.flash_sale_schedule WHERE outcome='missed_window') THEN RAISE EXCEPTION 'terminal state missing'; END IF;
END $$;
