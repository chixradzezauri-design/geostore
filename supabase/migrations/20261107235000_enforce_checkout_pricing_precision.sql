-- GEOSTORE: keep every checkout pricing input at GEL cent precision.
-- The browser calculates totals in integer tetri; these constraints ensure the
-- server cannot persist a higher-precision value that would produce a different total.

ALTER TABLE public.store_delivery_fees
  ADD CONSTRAINT store_delivery_fees_cent_precision_check
  CHECK (
    fee_gel >= 0
    AND fee_gel <= 1000000000
    AND fee_gel = round(fee_gel, 2)
  );

ALTER TABLE public.store_coupons
  ADD CONSTRAINT store_coupons_code_format_check
  CHECK (
    code = upper(btrim(code))
    AND code ~ '^[A-Z0-9_-]{3,64}$'
  ),
  ADD CONSTRAINT store_coupons_discount_cent_precision_check
  CHECK (
    discount_percent > 0
    AND discount_percent <= 100
    AND discount_percent = round(discount_percent, 2)
  ),
  ADD CONSTRAINT store_coupons_minimum_cent_precision_check
  CHECK (
    min_order_gel >= 0
    AND min_order_gel <= 1000000000
    AND min_order_gel = round(min_order_gel, 2)
  );

-- Product prices are also read directly by the checkout RPC. Keep base and
-- comparison prices in the same two-decimal unit used by the storefront.
ALTER TABLE public.products
  ADD CONSTRAINT products_price_gel_cent_precision_check
  CHECK (
    price_gel >= 0
    AND price_gel <= 1000000000
    AND price_gel = round(price_gel, 2)
  ),
  ADD CONSTRAINT products_old_price_gel_cent_precision_check
  CHECK (
    old_price_gel IS NULL
    OR (
      old_price_gel >= 0
      AND old_price_gel <= 1000000000
      AND old_price_gel = round(old_price_gel, 2)
    )
  );
