/**
 * TSFM (Time Series Foundation Model) Inference Interface
 *
 * Provides a unified interface for zero-shot and fine-tuned forecasting
 * using foundation models like Chronos-2, Moirai-2, and TTM.
 *
 * In the browser context, this interface defines the contract for
 * server-side inference results. Actual model inference is done in
 * Python (see training/tsfm_benchmarks/).
 *
 * References:
 *   - Chronos-2: https://huggingface.co/amazon/chronos2-120m
 *   - Moirai-2: https://huggingface.co/Salesforce/moirai-2.0-R-large
 *   - IBM TTM: https://huggingface.co/ibm-granite/granite-ttm-r1
 */

export type TsfmModelType = 'chronos2' | 'chronos_bolt' | 'moirai2' | 'ttm';

export interface TsfmForecastResult {
  modelType: TsfmModelType;
  modelName: string;
  horizon: number;
  pointForecast: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  inferenceTimeMs: number;
  contextLength: number;
  modelVersion: string;
}

export interface TsfmBenchmarkMetrics {
  modelType: TsfmModelType;
  horizon: number;
  mae: number;
  rmse: number;
  mape: number;
  crps: number;
  skillVsPersistence: number;
  skillVsSeasonalNaive: number;
  inferenceTimeMs: number;
}

export interface TsfmBenchmarkReport {
  benchmarkDate: string;
  dataSource: string;
  trainSize: number;
  results: TsfmBenchmarkMetrics[];
  bestModel: TsfmModelType;
  bestHorizon: number;
}

export const TSFM_MODEL_INFO: Record<
  TsfmModelType,
  {
    name: string;
    hfId: string;
    params: string;
    supportsCovariates: boolean;
    supportsMultivariate: boolean;
    maxContext: number;
  }
> = {
  chronos2: {
    name: 'Chronos-2',
    hfId: 'amazon/chronos2-120m',
    params: '120M',
    supportsCovariates: true,
    supportsMultivariate: true,
    maxContext: 2048,
  },
  chronos_bolt: {
    name: 'Chronos-Bolt',
    hfId: 'amazon/chronos-bolt-base',
    params: '205M',
    supportsCovariates: false,
    supportsMultivariate: false,
    maxContext: 2048,
  },
  moirai2: {
    name: 'Moirai-2',
    hfId: 'Salesforce/moirai-2.0-R-large',
    params: '411M',
    supportsCovariates: true,
    supportsMultivariate: true,
    maxContext: 1024,
  },
  ttm: {
    name: 'IBM TTM',
    hfId: 'ibm-granite/granite-ttm-r1',
    params: '40M',
    supportsCovariates: true,
    supportsMultivariate: false,
    maxContext: 512,
  },
};

/**
 * Parse a benchmark results JSON file produced by the Python harness.
 */
export function parseBenchmarkReport(json: Record<string, unknown>): TsfmBenchmarkReport {
  const results = (json.results as Array<Record<string, unknown>>).map((r) => ({
    modelType: r.model_id as TsfmModelType,
    horizon: r.horizon as number,
    mae: r.mae as number,
    rmse: r.rmse as number,
    mape: r.mape as number,
    crps: r.crps as number,
    skillVsPersistence: r.skill_vs_persistence as number,
    skillVsSeasonalNaive: r.skill_vs_seasonal as number,
    inferenceTimeMs: (r.inference_time_s as number) * 1000,
  }));

  const best = results.reduce(
    (best, r) => (r.mae < best.mae ? r : best),
    results[0] ?? { modelType: 'chronos2' as TsfmModelType, horizon: 24, mae: Infinity },
  );

  return {
    benchmarkDate: json.benchmark_date as string,
    dataSource: json.data_source as string,
    trainSize: json.train_size as number,
    results,
    bestModel: best.modelType,
    bestHorizon: best.horizon,
  };
}
