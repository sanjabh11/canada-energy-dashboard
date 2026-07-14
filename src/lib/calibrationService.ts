import { supabase } from './supabaseClient';

export interface CalibrationStateResponse {
  alpha: number;
  targetAlpha: number;
  gamma: number;
  empiricalCoverage: number;
  calibrationSize: number;
  lastObservationTimestamp: string | null;
  source: string;
}

export interface CalibrationObservation {
  timestamp: string;
  forecastMw: number;
  actualMw: number;
  lowerQ: number | null;
  upperQ: number | null;
  nonconformityScore: number | null;
  covered: boolean | null;
}

export async function fetchCalibrationState(
  source = 'aeso',
): Promise<CalibrationStateResponse | null> {
  const { data, error } = await supabase
    .from('conformal_calibration_state')
    .select(
      'alpha, target_alpha, gamma, empirical_coverage, calibration_size, last_observation_timestamp, source',
    )
    .eq('source', source)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    alpha: data.alpha,
    targetAlpha: data.target_alpha,
    gamma: data.gamma,
    empiricalCoverage: data.empirical_coverage,
    calibrationSize: data.calibration_size,
    lastObservationTimestamp: data.last_observation_timestamp,
    source: data.source,
  };
}

export async function fetchRecentObservations(
  source = 'aeso',
  limit = 100,
): Promise<CalibrationObservation[]> {
  const { data, error } = await supabase
    .from('conformal_observations')
    .select('timestamp, forecast_mw, actual_mw, lower_q, upper_q, nonconformity_score, covered')
    .eq('source', source)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    timestamp: row.timestamp,
    forecastMw: row.forecast_mw,
    actualMw: row.actual_mw,
    lowerQ: row.lower_q,
    upperQ: row.upper_q,
    nonconformityScore: row.nonconformity_score,
    covered: row.covered,
  }));
}
