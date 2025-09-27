-- Ontario nodal pricing table and seed data

BEGIN;

CREATE TABLE IF NOT EXISTS public.ontario_nodal_prices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  datetime timestamptz NOT NULL,
  node_name text NOT NULL,
  lmp_price numeric(10,2) NOT NULL,
  energy_price numeric(10,2) NOT NULL,
  congestion_price numeric(10,2) NOT NULL,
  loss_price numeric(10,2) NOT NULL,
  zone text,
  market_date date,
  interval_ending timestamptz,
  source text DEFAULT 'kaggle',
  version text DEFAULT '1.0'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ontario_prices_datetime_node
  ON public.ontario_nodal_prices (datetime, node_name);

INSERT INTO public.ontario_nodal_prices (
  datetime,
  node_name,
  lmp_price,
  energy_price,
  congestion_price,
  loss_price,
  zone,
  market_date,
  interval_ending,
  source,
  version
)
VALUES
  ('2025-09-25T12:00:00Z', 'ON_NODE_1', 32.15, 30.10, 1.50, 0.55, 'ON', '2025-09-25', '2025-09-25T12:05:00Z', 'kaggle', '1.0-seed'),
  ('2025-09-25T12:05:00Z', 'ON_NODE_1', 33.05, 31.00, 1.60, 0.45, 'ON', '2025-09-25', '2025-09-25T12:10:00Z', 'kaggle', '1.0-seed'),
  ('2025-09-25T12:10:00Z', 'ON_NODE_1', 33.75, 31.50, 1.70, 0.55, 'ON', '2025-09-25', '2025-09-25T12:15:00Z', 'kaggle', '1.0-seed'),
  ('2025-09-25T12:00:00Z', 'ON_NODE_5', 29.80, 28.40, 1.10, 0.30, 'ON', '2025-09-25', '2025-09-25T12:05:00Z', 'kaggle', '1.0-seed'),
  ('2025-09-25T12:05:00Z', 'ON_NODE_5', 30.25, 28.70, 1.30, 0.25, 'ON', '2025-09-25', '2025-09-25T12:10:00Z', 'kaggle', '1.0-seed'),
  ('2025-09-25T12:10:00Z', 'ON_NODE_5', 31.05, 29.20, 1.45, 0.40, 'ON', '2025-09-25', '2025-09-25T12:15:00Z', 'kaggle', '1.0-seed')
ON CONFLICT (datetime, node_name) DO UPDATE
SET lmp_price = EXCLUDED.lmp_price,
    energy_price = EXCLUDED.energy_price,
    congestion_price = EXCLUDED.congestion_price,
    loss_price = EXCLUDED.loss_price,
    zone = EXCLUDED.zone,
    market_date = EXCLUDED.market_date,
    interval_ending = EXCLUDED.interval_ending,
    version = EXCLUDED.version;

COMMIT;
