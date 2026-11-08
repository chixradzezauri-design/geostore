-- Product data integrity guards.
-- Staged only: do not apply until the repository/live migration histories are reconciled.
-- NOT VALID avoids a table scan during installation, while PostgreSQL enforces each
-- constraint for new or updated rows immediately after it is added.

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_price_gel_valid_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_gel_valid_check
      CHECK (price_gel >= 0 AND price_gel <= 1000000000 AND price_gel = round(price_gel, 2))
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_old_price_gel_valid_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_old_price_gel_valid_check
      CHECK (
        old_price_gel IS NULL OR
        (old_price_gel > price_gel AND old_price_gel <= 1000000000 AND old_price_gel = round(old_price_gel, 2))
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_stock_valid_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_valid_check
      CHECK (stock IS NULL OR stock BETWEEN 0 AND 1000000)
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_purchase_cost_valid_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_purchase_cost_valid_check
      CHECK (
        purchase_cost IS NULL OR
        (purchase_cost >= 0 AND purchase_cost <= 1000000000 AND purchase_cost = round(purchase_cost, 2))
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_available_sizes_array_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_available_sizes_array_check
      CHECK (
        available_sizes IS NULL OR
        CASE WHEN jsonb_typeof(available_sizes) = 'array'
          THEN jsonb_array_length(available_sizes) <= 30
          ELSE false
        END
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_available_colors_array_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_available_colors_array_check
      CHECK (
        available_colors IS NULL OR
        CASE WHEN jsonb_typeof(available_colors) = 'array'
          THEN jsonb_array_length(available_colors) <= 30
          ELSE false
        END
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_gallery_array_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_gallery_array_check
      CHECK (
        CASE WHEN jsonb_typeof(gallery) = 'array'
          THEN jsonb_array_length(gallery) <= 10
          ELSE false
        END
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_variants_array_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_variants_array_check
      CHECK (
        CASE WHEN jsonb_typeof(variants) = 'array'
          THEN jsonb_array_length(variants) <= 50
          ELSE false
        END
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND conname = 'products_tags_array_check') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_tags_array_check
      CHECK (
        CASE WHEN jsonb_typeof(tags) = 'array'
          THEN jsonb_array_length(tags) <= 30
          ELSE false
        END
      )
      NOT VALID;
  END IF;
END
$migration$;
