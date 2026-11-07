-- Enforce non-negative inventory at the database boundary.
-- NULL remains allowed for legacy rows; checkout treats NULL as zero stock.
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_nonnegative_check
  CHECK (stock IS NULL OR stock >= 0)
  NOT VALID;

ALTER TABLE public.products
  VALIDATE CONSTRAINT products_stock_nonnegative_check;
