import { supabase } from './supabaseClient';

export interface FeatureRankingRow {
  id?: string;
  run_id?: string | null;
  model_key: string;
  feature_name: string;
  rank: number;
  score: number;
  retained: boolean;
  drop_reason?: string | null;
  calculated_at?: string;
}

export interface LatestRetainedFeaturesResult {
  modelKey: string;
  calculatedAt: string | null;
  retainedFeatures: string[];
  droppedFeatures: Array<{ feature: string; reason: string; score: number }>;
}

export function selectLatestRetainedFeatures(rows: FeatureRankingRow[], modelKey: string): LatestRetainedFeaturesResult {
  const matching = rows.filter((row) => row.model_key === modelKey);
  const latestCalculatedAt = matching
    .map((row) => row.calculated_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const latestRows = latestCalculatedAt
    ? matching.filter((row) => row.calculated_at === latestCalculatedAt)
    : matching;

  const retainedFeatures = latestRows
    .filter((row) => row.retained)
    .sort((left, right) => left.rank - right.rank)
    .map((row) => row.feature_name);

  const droppedFeatures = latestRows
    .filter((row) => !row.retained)
    .sort((left, right) => left.rank - right.rank)
    .map((row) => ({
      feature: row.feature_name,
      reason: row.drop_reason ?? 'recursive_elimination',
      score: Number(row.score ?? 0),
    }));

  return {
    modelKey,
    calculatedAt: latestCalculatedAt,
    retainedFeatures,
    droppedFeatures,
  };
}

export async function getLatestRetainedFeatures(modelKey: string): Promise<LatestRetainedFeaturesResult> {
  try {
    const { data, error } = await supabase
      .from('ml_feature_rankings')
      .select('run_id, model_key, feature_name, rank, score, retained, drop_reason, calculated_at')
      .eq('model_key', modelKey)
      .order('calculated_at', { ascending: false })
      .limit(100);

    if (error || !Array.isArray(data)) {
      return {
        modelKey,
        calculatedAt: null,
        retainedFeatures: [],
        droppedFeatures: [],
      };
    }

    return selectLatestRetainedFeatures(data as FeatureRankingRow[], modelKey);
  } catch {
    return {
      modelKey,
      calculatedAt: null,
      retainedFeatures: [],
      droppedFeatures: [],
    };
  }
}

