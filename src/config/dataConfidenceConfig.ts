const parsePositiveNumber = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const DATA_CONFIDENCE_CONFIG = {
  AESO_POOL_STALE_HOURS_PEAK: parsePositiveNumber(
    import.meta.env.VITE_AESO_POOL_STALE_HOURS_PEAK,
    1
  ),
  AESO_POOL_STALE_HOURS_OFFPEAK: parsePositiveNumber(
    import.meta.env.VITE_AESO_POOL_STALE_HOURS_OFFPEAK,
    6
  ),
  FORECAST_DATA_STALE_HOURS: parsePositiveNumber(
    import.meta.env.VITE_FORECAST_DATA_STALE_HOURS,
    24
  ),
  TIER_INPUT_STALE_DAYS: parsePositiveNumber(
    import.meta.env.VITE_TIER_INPUT_STALE_DAYS,
    7
  ),
  EXPORT_BLOCK_ALERT_THRESHOLD: parsePositiveNumber(
    import.meta.env.VITE_EXPORT_BLOCK_ALERT_THRESHOLD,
    3
  ),
} as const;

export type DataConfidenceConfig = typeof DATA_CONFIDENCE_CONFIG;
