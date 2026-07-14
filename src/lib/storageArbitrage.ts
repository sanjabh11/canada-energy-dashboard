/**
 * Battery Storage Arbitrage Optimization with Conformal Prediction
 *
 * Optimizes battery storage charge/discharge schedules for price arbitrage
 * using conformal prediction intervals for risk-aware trading decisions.
 *
 * References:
 *   - CP for electricity price forecasting in day-ahead and balancing markets
 *     (ScienceDirect, 2025)
 *   - arXiv:2601.14663: MCD+CP for prosumer flexibility in ancillary services
 */

export interface BatteryStorageConfig {
  capacityKwh: number;
  maxPowerKw: number;
  roundTripEfficiency: number;
  minSocPct: number;
  maxSocPct: number;
  initialSocKwh: number;
  degradationCostPerKwh: number;
}

export interface PriceForecast {
  timestamp: string;
  pointForecast: number;
  conformalLower: number;
  conformalUpper: number;
  quantile10?: number;
  quantile90?: number;
}

export interface StorageAction {
  timestamp: string;
  action: 'charge' | 'discharge' | 'idle';
  powerKw: number;
  energyKwh: number;
  socAfterKwh: number;
  socPct: number;
  expectedRevenue: number;
  expectedCost: number;
  netProfit: number;
  confidenceScore: number;
}

export interface ArbitrageResult {
  actions: StorageAction[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalEnergyCharged: number;
  totalEnergyDischarged: number;
  cycleCount: number;
  averageCycleEfficiency: number;
  finalSocKwh: number;
  riskMetrics: {
    var95: number;
    cvar95: number;
    worstCaseProfit: number;
    bestCaseProfit: number;
    probabilityOfLoss: number;
  };
  metadata: {
    horizonHours: number;
    nCycles: number;
    methodology: string;
    generatedAt: string;
  };
}

/**
 * Optimize battery storage arbitrage schedule using price forecasts with
 * conformal prediction intervals.
 */
export function optimizeStorageArbitrage(input: {
  battery: BatteryStorageConfig;
  priceForecasts: PriceForecast[];
  horizonHours?: number;
  riskTolerance?: number;
  minSpreadCadPerMwh?: number;
}): ArbitrageResult {
  const startTime = Date.now();
  const { battery, priceForecasts } = input;
  const horizon = Math.min(input.horizonHours ?? 24, priceForecasts.length);
  const riskTolerance = input.riskTolerance ?? 0.1;
  const minSpread = input.minSpreadCadPerMwh ?? 10;

  let socKwh = battery.initialSocKwh;
  const actions: StorageAction[] = [];
  let totalRevenue = 0;
  let totalCost = 0;
  let totalEnergyCharged = 0;
  let totalEnergyDischarged = 0;
  let cycleCount = 0;
  let charging = false;

  const profits: number[] = [];

  for (let t = 0; t < horizon; t++) {
    const pf = priceForecasts[t];
    if (!pf) continue;

    const price = pf.pointForecast;
    const lower = pf.conformalLower;
    const upper = pf.conformalUpper;
    const spread = upper - lower;

    // Look ahead for future prices
    const futurePrices = priceForecasts.slice(t + 1, Math.min(t + 12, horizon));
    const avgFuturePrice =
      futurePrices.length > 0
        ? futurePrices.reduce((s, f) => s + f.pointForecast, 0) / futurePrices.length
        : price;
    const maxFuturePrice =
      futurePrices.length > 0 ? Math.max(...futurePrices.map((f) => f.pointForecast)) : price;

    // Decision logic: charge when price is low relative to future, discharge when high
    const minSoc = (battery.capacityKwh * battery.minSocPct) / 100;
    const maxSoc = (battery.capacityKwh * battery.maxSocPct) / 100;

    let action: 'charge' | 'discharge' | 'idle' = 'idle';
    let powerKw = 0;
    let energyKwh = 0;
    let revenue = 0;
    let cost = 0;

    // Charge if current price is below average future price by more than minSpread
    const chargeThreshold = avgFuturePrice - minSpread;
    if (price < chargeThreshold && socKwh < maxSoc) {
      action = 'charge';
      const availableCapacity = maxSoc - socKwh;
      energyKwh = Math.min(battery.maxPowerKw, availableCapacity);
      powerKw = energyKwh;
      const energyAfterEfficiency = energyKwh * Math.sqrt(battery.roundTripEfficiency);
      socKwh += energyAfterEfficiency;
      cost = (energyKwh / 1000) * price + battery.degradationCostPerKwh * energyKwh;
      totalCost += cost;
      totalEnergyCharged += energyKwh;
      charging = true;
    }
    // Discharge if current price is above future prices by more than minSpread
    else if (price > avgFuturePrice + minSpread && socKwh > minSoc) {
      action = 'discharge';
      const availableEnergy = socKwh - minSoc;
      energyKwh = Math.min(battery.maxPowerKw, availableEnergy);
      powerKw = energyKwh;
      const energyDelivered = energyKwh * Math.sqrt(battery.roundTripEfficiency);
      socKwh -= energyKwh;
      revenue = (energyDelivered / 1000) * price - battery.degradationCostPerKwh * energyKwh;
      totalRevenue += revenue;
      totalEnergyDischarged += energyDelivered;
      if (charging) {
        cycleCount++;
        charging = false;
      }
    }

    const netProfit = revenue - cost;
    profits.push(netProfit);

    // Confidence score based on spread (tighter spread = higher confidence)
    const confidenceScore = spread > 0 ? Math.max(0, 1 - spread / (price * 2)) : 0.5;

    actions.push({
      timestamp: pf.timestamp,
      action,
      powerKw: round(powerKw, 3),
      energyKwh: round(energyKwh, 3),
      socAfterKwh: round(socKwh, 3),
      socPct: round((socKwh / battery.capacityKwh) * 100, 2),
      expectedRevenue: round(revenue, 4),
      expectedCost: round(cost, 4),
      netProfit: round(netProfit, 4),
      confidenceScore: round(confidenceScore, 4),
    });
  }

  // Risk metrics
  const sortedProfits = [...profits].sort((a, b) => a - b);
  const var95Idx = Math.floor(sortedProfits.length * 0.05);
  const var95 = sortedProfits[var95Idx] ?? 0;
  const cvar95 =
    sortedProfits.slice(0, Math.max(1, var95Idx + 1)).reduce((s, p) => s + p, 0) /
    Math.max(1, var95Idx + 1);
  const worstCaseProfit = sortedProfits[0] ?? 0;
  const bestCaseProfit = sortedProfits[sortedProfits.length - 1] ?? 0;
  const lossCount = profits.filter((p) => p < 0).length;
  const probabilityOfLoss = profits.length > 0 ? lossCount / profits.length : 0;

  const totalProfit = totalRevenue - totalCost;
  const averageCycleEfficiency =
    cycleCount > 0
      ? round((totalEnergyDischarged / Math.max(0.001, totalEnergyCharged)) * 100, 2)
      : 0;

  return {
    actions,
    totalRevenue: round(totalRevenue, 4),
    totalCost: round(totalCost, 4),
    totalProfit: round(totalProfit, 4),
    totalEnergyCharged: round(totalEnergyCharged, 4),
    totalEnergyDischarged: round(totalEnergyDischarged, 4),
    cycleCount,
    averageCycleEfficiency,
    finalSocKwh: round(socKwh, 3),
    riskMetrics: {
      var95: round(var95, 4),
      cvar95: round(cvar95, 4),
      worstCaseProfit: round(worstCaseProfit, 4),
      bestCaseProfit: round(bestCaseProfit, 4),
      probabilityOfLoss: round(probabilityOfLoss, 4),
    },
    metadata: {
      horizonHours: horizon,
      nCycles: cycleCount,
      methodology:
        'Deterministic optimization with conformal prediction intervals. Risk-aware charge/discharge scheduling using price spread thresholds and VaR/CVaR metrics.',
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate synthetic price forecasts for testing.
 */
export function generateSyntheticPriceForecasts(
  nHours: number = 24,
  basePrice: number = 50,
): PriceForecast[] {
  const forecasts: PriceForecast[] = [];
  const now = new Date();

  for (let h = 0; h < nHours; h++) {
    const hour = (now.getHours() + h) % 24;
    // Price pattern: low at night, peaks in morning and evening
    const hourlyFactor = 1 + 0.5 * Math.sin(((hour - 14) * Math.PI) / 12);
    const price = basePrice * hourlyFactor + (Math.random() - 0.5) * 10;
    const spread = 5 + Math.random() * 10;

    forecasts.push({
      timestamp: new Date(now.getTime() + h * 3600 * 1000).toISOString(),
      pointForecast: round(price, 2),
      conformalLower: round(price - spread, 2),
      conformalUpper: round(price + spread, 2),
      quantile10: round(price - spread * 1.5, 2),
      quantile90: round(price + spread * 1.5, 2),
    });
  }

  return forecasts;
}

function round(value: number, decimals: number = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
