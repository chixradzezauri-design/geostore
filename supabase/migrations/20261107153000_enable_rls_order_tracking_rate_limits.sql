-- Enable RLS on the private order-tracking rate-limit table.
-- Direct client roles have no table privileges; the tracking RPC runs as postgres
-- with an empty search_path and performs the rate-limit operation internally.
ALTER TABLE private.order_tracking_rate_limits ENABLE ROW LEVEL SECURITY;
