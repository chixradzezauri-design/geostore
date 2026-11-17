-- GEOSTORE Stage 92: append-only inventory movement ledger.
-- This migration is staged in PR #129 only. Do not apply to production
-- until the full migration history is reconciled and staging tests pass.

CREATE TABLE IF NOT EXISTS private.inventory_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id text NOT NULL,
  product_name text NOT NULL,
  variant_id text,
  variant_name text,
  variant_type text,
  before_quantity integer NOT NULL CHECK (before_quantity >= 0),
  after_quantity integer NOT NULL CHECK (after_quantity >= 0),
  quantity_delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'order_deduction',
    'order_cancellation',
    'order_reactivation',
    'manual_adjustment',
    'product_created',
    'product_deleted',
    'unclassified_database_change'
  )),
  actor_id uuid,
  related_order_id text,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT inventory_movements_delta_matches_quantities
    CHECK (quantity_delta = after_quantity - before_quantity),
  CONSTRAINT inventory_movements_nonzero_delta
    CHECK (quantity_delta <> 0)
);

COMMENT ON TABLE private.inventory_movements IS
  'Append-only stock movement audit. Product and order IDs are snapshots without foreign keys so history survives catalog changes.';
COMMENT ON COLUMN private.inventory_movements.related_order_id IS
  'Set only by trusted order RPC transaction context; never inferred from timestamps or product matches.';

CREATE INDEX IF NOT EXISTS inventory_movements_product_cursor_idx
  ON private.inventory_movements (product_id, id DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_order_idx
  ON private.inventory_movements (related_order_id, id DESC)
  WHERE related_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_occurred_at_idx
  ON private.inventory_movements (occurred_at DESC, id DESC);

ALTER TABLE private.inventory_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.inventory_movements FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.reject_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Inventory movement history is append-only.'
    USING ERRCODE = '55000';
END;
$function$;

DROP TRIGGER IF EXISTS inventory_movements_append_only ON private.inventory_movements;
CREATE TRIGGER inventory_movements_append_only
BEFORE UPDATE OR DELETE ON private.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION private.reject_inventory_movement_mutation();

CREATE OR REPLACE FUNCTION private.append_inventory_movement(
  p_product_id text,
  p_product_name text,
  p_variant_id text,
  p_variant_name text,
  p_variant_type text,
  p_before integer,
  p_after integer,
  p_reason text,
  p_actor_id uuid,
  p_order_id text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_reason text;
  v_order_id text;
BEGIN
  IF p_before IS NULL OR p_after IS NULL
     OR p_before < 0 OR p_after < 0
     OR p_before = p_after
     OR coalesce(trim(p_product_id), '') = '' THEN
    RETURN;
  END IF;

  v_reason := CASE
    WHEN p_reason IN (
      'order_deduction',
      'order_cancellation',
      'order_reactivation',
      'manual_adjustment',
      'product_created',
      'product_deleted',
      'unclassified_database_change'
    ) THEN p_reason
    ELSE 'unclassified_database_change'
  END;

  v_order_id := CASE
    WHEN v_reason IN ('order_deduction', 'order_cancellation', 'order_reactivation')
      THEN nullif(trim(p_order_id), '')
    ELSE NULL
  END;

  INSERT INTO private.inventory_movements (
    product_id, product_name, variant_id, variant_name, variant_type,
    before_quantity, after_quantity, quantity_delta, reason,
    actor_id, related_order_id, metadata
  ) VALUES (
    p_product_id, coalesce(nullif(trim(p_product_name), ''), p_product_id),
    nullif(trim(p_variant_id), ''), nullif(trim(p_variant_name), ''),
    nullif(trim(p_variant_type), ''),
    p_before, p_after, p_after - p_before, v_reason,
    p_actor_id, v_order_id, coalesce(p_metadata, '{}'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.append_inventory_movement(
  text, text, text, text, text, integer, integer, text, uuid, text, jsonb
) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.record_product_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_variants jsonb := '[]'::jsonb;
  v_new_variants jsonb := '[]'::jsonb;
  v_old_has_variants boolean := false;
  v_new_has_variants boolean := false;
  v_variant record;
  v_before integer;
  v_after integer;
  v_reason text;
  v_order_id text;
  v_actor uuid;
  v_product_id text;
  v_product_name text;
  v_metadata jsonb;
BEGIN
  v_reason := nullif(current_setting('geostore.inventory_reason', true), '');
  v_order_id := nullif(current_setting('geostore.inventory_order_id', true), '');
  v_actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_product_id := NEW.id;
    v_product_name := NEW.name;
    v_metadata := jsonb_build_object('category', NEW.category, 'operation', 'insert');
    v_new_variants := CASE
      WHEN jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) = 'array'
        THEN coalesce(NEW.variants, '[]'::jsonb)
      ELSE '[]'::jsonb
    END;
    v_new_has_variants := jsonb_array_length(v_new_variants) > 0;

    IF v_new_has_variants THEN
      FOR v_variant IN
        SELECT value AS item
          FROM jsonb_array_elements(v_new_variants) AS entries(value)
      LOOP
        v_after := CASE
          WHEN coalesce(v_variant.item->>'stock', '') ~ '^[0-9]{1,7}$'
            THEN (v_variant.item->>'stock')::integer
          ELSE 0
        END;
        PERFORM private.append_inventory_movement(
          v_product_id, v_product_name, v_variant.item->>'id',
          v_variant.item->>'name', v_variant.item->>'variantType',
          0, v_after, coalesce(v_reason, 'product_created'), v_actor,
          v_order_id, v_metadata
        );
      END LOOP;
    ELSE
      PERFORM private.append_inventory_movement(
        v_product_id, v_product_name, NULL, NULL, NULL,
        0, coalesce(NEW.stock, 0), coalesce(v_reason, 'product_created'),
        v_actor, v_order_id, v_metadata
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.id;
    v_product_name := OLD.name;
    v_metadata := jsonb_build_object('category', OLD.category, 'operation', 'delete');
    v_old_variants := CASE
      WHEN jsonb_typeof(coalesce(OLD.variants, '[]'::jsonb)) = 'array'
        THEN coalesce(OLD.variants, '[]'::jsonb)
      ELSE '[]'::jsonb
    END;
    v_old_has_variants := jsonb_array_length(v_old_variants) > 0;

    IF v_old_has_variants THEN
      FOR v_variant IN
        SELECT value AS item
          FROM jsonb_array_elements(v_old_variants) AS entries(value)
      LOOP
        v_before := CASE
          WHEN coalesce(v_variant.item->>'stock', '') ~ '^[0-9]{1,7}$'
            THEN (v_variant.item->>'stock')::integer
          ELSE 0
        END;
        PERFORM private.append_inventory_movement(
          v_product_id, v_product_name, v_variant.item->>'id',
          v_variant.item->>'name', v_variant.item->>'variantType',
          v_before, 0, coalesce(v_reason, 'product_deleted'), v_actor,
          v_order_id, v_metadata
        );
      END LOOP;
    ELSE
      PERFORM private.append_inventory_movement(
        v_product_id, v_product_name, NULL, NULL, NULL,
        coalesce(OLD.stock, 0), 0, coalesce(v_reason, 'product_deleted'),
        v_actor, v_order_id, v_metadata
      );
    END IF;
    RETURN OLD;
  END IF;

  v_product_id := NEW.id;
  v_product_name := NEW.name;
  v_metadata := jsonb_build_object('category', NEW.category, 'operation', 'update');
  v_old_variants := CASE
    WHEN jsonb_typeof(coalesce(OLD.variants, '[]'::jsonb)) = 'array'
      THEN coalesce(OLD.variants, '[]'::jsonb)
    ELSE '[]'::jsonb
  END;
  v_new_variants := CASE
    WHEN jsonb_typeof(coalesce(NEW.variants, '[]'::jsonb)) = 'array'
      THEN coalesce(NEW.variants, '[]'::jsonb)
    ELSE '[]'::jsonb
  END;
  v_old_has_variants := jsonb_array_length(v_old_variants) > 0;
  v_new_has_variants := jsonb_array_length(v_new_variants) > 0;

  IF NOT v_old_has_variants AND NOT v_new_has_variants THEN
    PERFORM private.append_inventory_movement(
      v_product_id, v_product_name, NULL, NULL, NULL,
      coalesce(OLD.stock, 0), coalesce(NEW.stock, 0),
      coalesce(v_reason, 'unclassified_database_change'), v_actor,
      v_order_id, v_metadata
    );
    RETURN NEW;
  END IF;

  -- When switching inventory models, explicitly close the old base-stock
  -- position or open the new one. The aggregate parent stock of a variant
  -- product is never counted as a second inventory position.
  IF NOT v_old_has_variants AND v_new_has_variants THEN
    PERFORM private.append_inventory_movement(
      v_product_id, v_product_name, NULL, NULL, 'base',
      coalesce(OLD.stock, 0), 0,
      coalesce(v_reason, 'manual_adjustment'), v_actor, NULL,
      v_metadata || jsonb_build_object('inventory_model_change', true)
    );
  ELSIF v_old_has_variants AND NOT v_new_has_variants THEN
    PERFORM private.append_inventory_movement(
      v_product_id, v_product_name, NULL, NULL, 'base',
      0, coalesce(NEW.stock, 0),
      coalesce(v_reason, 'manual_adjustment'), v_actor, NULL,
      v_metadata || jsonb_build_object('inventory_model_change', true)
    );
  END IF;

  FOR v_variant IN
    SELECT
      coalesce(old_rows.item->>'id', new_rows.item->>'id') AS variant_id,
      coalesce(old_rows.item->>'name', new_rows.item->>'name') AS variant_name,
      coalesce(old_rows.item->>'variantType', new_rows.item->>'variantType') AS variant_type,
      CASE
        WHEN old_rows.item IS NULL THEN 0
        WHEN coalesce(old_rows.item->>'stock', '') ~ '^[0-9]{1,7}$'
          THEN (old_rows.item->>'stock')::integer
        ELSE 0
      END AS before_quantity,
      CASE
        WHEN new_rows.item IS NULL THEN 0
        WHEN coalesce(new_rows.item->>'stock', '') ~ '^[0-9]{1,7}$'
          THEN (new_rows.item->>'stock')::integer
        ELSE 0
      END AS after_quantity
    FROM jsonb_array_elements(
      CASE WHEN v_old_has_variants THEN v_old_variants ELSE '[]'::jsonb END
    ) AS old_rows(item)
    FULL JOIN jsonb_array_elements(
      CASE WHEN v_new_has_variants THEN v_new_variants ELSE '[]'::jsonb END
    ) AS new_rows(item)
      ON old_rows.item->>'id' = new_rows.item->>'id'
    WHERE
      CASE
        WHEN old_rows.item IS NULL THEN 0
        WHEN coalesce(old_rows.item->>'stock', '') ~ '^[0-9]{1,7}$'
          THEN (old_rows.item->>'stock')::integer
        ELSE 0
      END
      IS DISTINCT FROM
      CASE
        WHEN new_rows.item IS NULL THEN 0
        WHEN coalesce(new_rows.item->>'stock', '') ~ '^[0-9]{1,7}$'
          THEN (new_rows.item->>'stock')::integer
        ELSE 0
      END
  LOOP
    PERFORM private.append_inventory_movement(
      v_product_id, v_product_name, v_variant.variant_id,
      v_variant.variant_name, v_variant.variant_type,
      v_variant.before_quantity, v_variant.after_quantity,
      coalesce(v_reason, 'unclassified_database_change'), v_actor,
      v_order_id, v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.record_product_inventory_movement()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS products_inventory_movement_after_change ON public.products;
CREATE TRIGGER products_inventory_movement_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.record_product_inventory_movement();

CREATE OR REPLACE FUNCTION private.list_inventory_movements(
  p_product_id text DEFAULT NULL,
  p_before_id bigint DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT m.*
      FROM private.inventory_movements AS m
     WHERE (p_product_id IS NULL OR m.product_id = p_product_id)
       AND (p_before_id IS NULL OR m.id < p_before_id)
     ORDER BY m.id DESC
     LIMIT v_limit + 1
  ),
  visible_page AS (
    SELECT *
      FROM page
     ORDER BY id DESC
     LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'items', coalesce(
      (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id DESC) FROM visible_page AS v),
      '[]'::jsonb
    ),
    'has_more', (SELECT count(*) > v_limit FROM page),
    'next_cursor', CASE
      WHEN (SELECT count(*) > v_limit FROM page)
        THEN (SELECT min(id) FROM visible_page)
      ELSE NULL
    END
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION private.list_inventory_movements(text, bigint, integer)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_inventory_movements(
  p_product_id text DEFAULT NULL,
  p_before_id bigint DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.list_inventory_movements(p_product_id, p_before_id, p_limit);
$function$;

REVOKE ALL ON FUNCTION public.admin_list_inventory_movements(text, bigint, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_inventory_movements(text, bigint, integer)
  TO authenticated;

-- Add trustworthy reason/order context to the existing stock RPCs without
-- replacing their validation, locking, stock arithmetic, or transaction flow.
DO $migration$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  v_definition := pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure);
  v_old := '  perform set_config(''geostore.variant_stock_adjustment'', ''on'', true);';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected checkout stock marker was not found; aborting ledger migration.';
  END IF;
  v_new :=
    '  perform set_config(''geostore.inventory_reason'', ''order_deduction'', true);' || E'\n' ||
    '  perform set_config(''geostore.inventory_order_id'', v_order_id, true);' || E'\n' ||
    v_old;
  EXECUTE replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef('private.admin_update_order_status(text,text)'::regprocedure);
  v_old := '     and v_order.stock_restored_at is null then';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected cancellation stock marker was not found; aborting ledger migration.';
  END IF;
  v_new := v_old || E'\n' ||
    '    perform set_config(''geostore.inventory_reason'', ''order_cancellation'', true);' || E'\n' ||
    '    perform set_config(''geostore.inventory_order_id'', p_order_id, true);';
  EXECUTE replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef('private.admin_reactivate_cancelled_order(text)'::regprocedure);
  v_old := '  perform set_config(''geostore.variant_stock_adjustment'', ''on'', true);';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected reactivation stock marker was not found; aborting ledger migration.';
  END IF;
  v_new :=
    '  perform set_config(''geostore.inventory_reason'', ''order_reactivation'', true);' || E'\n' ||
    '  perform set_config(''geostore.inventory_order_id'', p_order_id, true);' || E'\n' ||
    v_old;
  EXECUTE replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef('private.admin_set_product_variant_stocks(text,jsonb)'::regprocedure);
  v_old := '  PERFORM set_config(''geostore.variant_stock_adjustment'', ''on'', true);';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected size/color admin stock marker was not found; aborting ledger migration.';
  END IF;
  v_new :=
    '  PERFORM set_config(''geostore.inventory_reason'', ''manual_adjustment'', true);' || E'\n' ||
    '  PERFORM set_config(''geostore.inventory_order_id'', '''', true);' || E'\n' ||
    v_old;
  EXECUTE replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef('private.admin_set_product_custom_variant_stocks(text,jsonb)'::regprocedure);
  v_old := '  PERFORM set_config(''geostore.variant_stock_adjustment'', ''on'', true);';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected custom-variant admin stock marker was not found; aborting ledger migration.';
  END IF;
  v_new :=
    '  PERFORM set_config(''geostore.inventory_reason'', ''manual_adjustment'', true);' || E'\n' ||
    '  PERFORM set_config(''geostore.inventory_order_id'', '''', true);' || E'\n' ||
    v_old;
  EXECUTE replace(v_definition, v_old, v_new);

  v_definition := pg_get_functiondef(
    'private.admin_update_product_with_stock(jsonb,jsonb,jsonb)'::regprocedure
  );
  v_old := '  update public.products as p' || E'\n' || '     set (';
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected admin product update marker was not found; aborting ledger migration.';
  END IF;
  v_new :=
    '  perform set_config(''geostore.inventory_reason'', ''manual_adjustment'', true);' || E'\n' ||
    '  perform set_config(''geostore.inventory_order_id'', '''', true);' || E'\n' ||
    v_old;
  EXECUTE replace(v_definition, v_old, v_new);
END;
$migration$;
