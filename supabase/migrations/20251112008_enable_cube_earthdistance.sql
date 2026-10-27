-- Enable cube + earthdistance before first use.
--
-- 20251113004_ev_charging_infrastructure.sql creates a GiST index over
-- ll_to_earth(latitude, longitude), which requires the earthdistance
-- extension; earthdistance itself depends on cube. On the hosted target
-- neither extension was preinstalled, so 20251113004 failed until both
-- were enabled.
--
-- Ports target-only migrations `20261023_enable_cube_for_earthdistance`
-- and `20261023_enable_earthdistance_for_ev` (deviation ledger entries).
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
