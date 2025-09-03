/**
 * Financial Calculation Engine for Investment Analysis
 *
 * Comprehensive financial mathematics engine supporting:
 * - NPV (Net Present Value) calculations for cash flow analysis
 * - IRR (Internal Rate of Return) calculations with Newton's method
 * - Payback period analysis
 * - Enhanced financial metrics for investment decision support
 */

/**
 * Interface for cash flow data
 */
export interface CashFlow {
  amount: number;
  period: number; // 0 = initial investment, 1-n = future periods
  description?: string;
}

/**
 * Interface for investment analysis results
 */
export interface InvestmentMetrics {
  npv: number;
  irr: number | null; // null if no IRR found
  paybackPeriod: number | null;
  roi: number;
  profitabilityIndex: number;
  totalInvestment: number;
  totalReturns: number;
  discountedCashFlows: number[];
}

/**
 * Configuration for financial calculations
 */
export interface FinancialConfig {
  decimalPlaces?: number;
  convergenceTolerance?: number;
  maxIterations?: number;
  minimumIRR?: number;
  maximumIRR?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<FinancialConfig> = {
  decimalPlaces: 4,
  convergenceTolerance: 1e-6,
  maxIterations: 1000,
  minimumIRR: -0.99, // -99% minimum IRR
  maximumIRR: 1.0    // 100% maximum IRR
};

/**
 * Financial Calculations Engine
 *
 * Provides mathematical functions for investment analysis
 */
export class FinancialEngine {
  private config: Required<FinancialConfig>;

  constructor(config: FinancialConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate Discounted Cash Flow at a specific period
   * @param cashFlowAmount - Cash flow amount at the period
   * @param period - Period number (0-based)
   * @param discountRate - Annual discount rate (as decimal)
   * @returns Discounted cash flow value
   */
  public calculateDCF(
    cashFlowAmount: number,
    period: number,
    discountRate: number
  ): number {
    return cashFlowAmount / Math.pow(1 + discountRate, period);
  }

  /**
   * Calculate Net Present Value of a series of cash flows
   *
   * NPV = CF₀ + Σ(CFᵢ / (1+r)ⁱ) for i = 1 to n
   *
   * @param cashFlows - Array of cash flow objects
   * @param discountRate - Annual discount rate (as decimal, e.g., 0.10 for 10%)
   * @returns Net Present Value
   */
  public calculateNPV(cashFlows: CashFlow[], discountRate: number): number {
    if (!cashFlows || cashFlows.length === 0) return 0;

    let npv = 0;
    const discountedFlows: number[] = [];

    for (const cashFlow of cashFlows) {
      const discountedValue = this.calculateDCF(
        cashFlow.amount,
        cashFlow.period,
        discountRate
      );

      discountedFlows.push(
        parseFloat(discountedValue.toFixed(this.config.decimalPlaces))
      );

      npv += discountedValue;
    }

    return parseFloat(npv.toFixed(this.config.decimalPlaces));
  }

  /**
   * Calculate potential ROI (Return on Investment)
   * @param totalReturns - Total positive cash flows
   * @param totalInvestment - Total negative cash flows (investments)
   * @returns ROI as a percentage
   */
  public calculateROI(totalReturns: number, totalInvestment: number): number {
    if (totalInvestment === 0) return 0;
    return ((totalReturns - totalInvestment) / totalInvestment) * 100;
  }

  /**
   * Calculate Profitability Index (PI)
   * PI = (Present Value of Future Cash Flows) / Initial Investment
   * Values > 1 indicate potentially profitable projects
   */
  public calculateProfitabilityIndex(
    cashFlows: CashFlow[],
    discountRate: number
  ): number {
    const futureCashFlows = cashFlows.filter(cf => cf.period > 0 && cf.amount > 0);
    const initialInvestment = Math.abs(
      cashFlows.find(cf => cf.period === 0 && cf.amount < 0)?.amount || 0
    );

    const pvFutureCashFlows = futureCashFlows.map(cf =>
      this.calculateDCF(cf.amount, cf.period, discountRate)
    ).reduce((sum, pv) => sum + pv, 0);

    if (initialInvestment === 0) return 0;

    const pi = pvFutureCashFlows / initialInvestment;

    return parseFloat(pi.toFixed(this.config.decimalPlaces));
  }

  /**
   * Calculate Payback Period using discounted cash flows
   * @param cashFlows - Array of cash flow objects
   * @param discountRate - Annual discount rate (as decimal)
   * @returns Payback period in periods, null if never pays back
   */
  public calculatePaybackPeriod(
    cashFlows: CashFlow[],
    discountRate: number = 0
  ): number | null {
    if (!cashFlows || cashFlows.length < 2) return null;

    // Separate initial investment and future cash flows
    const initialInvestment = Math.abs(
      cashFlows.find(cf => cf.period === 0)?.amount || 0
    );

    const futureCashFlows = cashFlows
      .filter(cf => cf.period > 0)
      .sort((a, b) => a.period - b.period);

    // Handle discounted payback if discountRate > 0
    const discountedCashFlows = discountRate > 0
      ? futureCashFlows.map(cf => ({
          ...cf,
          discountedAmount: this.calculateDCF(cf.amount, cf.period, discountRate)
        }))
      : futureCashFlows.map(cf => ({
          ...cf,
          discountedAmount: cf.amount
        }));

    let cumulativeCashFlow = 0;
    let paybackPeriod = 0;

    for (let i = 0; i < discountedCashFlows.length; i++) {
      cumulativeCashFlow += discountedCashFlows[i].discountedAmount;

      if (cumulativeCashFlow >= initialInvestment) {
        // Interpolated payback period for better precision
        const remainingInvestment = initialInvestment - cumulativeCashFlow;
        const additionalCashFlow = discountedCashFlows[i].discountedAmount;

        const fraction = remainingInvestment / additionalCashFlow;
        paybackPeriod = discountedCashFlows[i].period - fraction;

        return parseFloat(paybackPeriod.toFixed(this.config.decimalPlaces));
      }
    };

    return null; // Never pays back
  }

  /**
   * Calculate Internal Rate of Return using Newton's method
   *
   * Newton-Raphson method iteratively finds IRR where NPV(rate) = 0
   *
   * f(rate) = NPV(rate)
   * f'(rate) = dNPV/drate = Σ( -period × CFᵢ / (1+rate)^(period+1) )
   *
   * @param cashFlows - Array of cash flow objects
   * @param guess - Initial guess for IRR (typically 0.1 for 10%)
   * @returns IRR as decimal rate, null if convergence fails
   */
  private calculateNPVDerivative(
    cashFlows: CashFlow[],
    rate: number
  ): number {
    let derivative = 0;

    for (const cashFlow of cashFlows) {
      if (cashFlow.period > 0) {
        const period = cashFlow.period;
        derivative -= (period * cashFlow.amount) / Math.pow(1 + rate, period + 1);
      }
    }

    return derivative;
  }

  public calculateIRR(
    cashFlows: CashFlow[],
    guess: number = 0.1
  ): number | null {
    if (!cashFlows || cashFlows.length < 2) return null;

    // Check if there are both positive and negative cash flows
    const hasPositive = cashFlows.some(cf => cf.amount > 0);
    const hasNegative = cashFlows.some(cf => cf.amount < 0);

    if (!hasPositive || !hasNegative) return null;

    let rate = guess;
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      const npv = this.calculateNPV(cashFlows, rate);
      const derivative = this.calculateNPVDerivative(cashFlows, rate);

      // Newton's method step
      const newRate = rate - npv / derivative;

      // Check for convergence
      if (Math.abs(newRate - rate) < this.config.convergenceTolerance &&
          Math.abs(npv) < this.config.convergenceTolerance) {
        // Ensure IRR is within reasonable bounds
        if (newRate >= this.config.minimumIRR && newRate <= this.config.maximumIRR) {
          return parseFloat(newRate.toFixed(this.config.decimalPlaces));
        }
        return null; // IRR out of bounds
      }

      // Check bounds for new rate
      if (newRate < this.config.minimumIRR || newRate > this.config.maximumIRR) {
        return null; // Irrational or impossible IRR
      }

      rate = newRate;
      iteration++;
    }

    return null; // Did not converge
  }

  /**
   * Safety check for IRR calculation - detect multiple IRRs or pathological cases
   */
  public validateCashFlowsForIRR(cashFlows: CashFlow[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Sort cash flows by period
    const sortedFlows = [...cashFlows].sort((a, b) => a.period - b.period);

    // Check for empty periods
    const periods = sortedFlows.map(cf => cf.period);
    const consecutivePeriods = [];
    for (let i = 0; i <= Math.max(...periods); i++) {
      if (!periods.includes(i)) {
        issues.push(`Missing cash flow for period ${i}`);
        recommendations.push('Add cash flows for all periods or specify appropriate assumption');
      }
    }

    // Check for multiple sign changes (causes multiple IRRs)
    let signChanges = 0;
    let lastNonZeroSign = 0;

    sortedFlows.forEach(cf => {
      const sign = cf.amount > 0 ? 1 : cf.amount < 0 ? -1 : 0;
      if (sign !== 0) {
        if (sign !== lastNonZeroSign && lastNonZeroSign !== 0) {
          signChanges++;
        }
        lastNonZeroSign = sign;
      }
    });

    if (signChanges > 1) {
      issues.push(`Multiple sign changes (${signChanges}) may lead to multiple IRRs or computation issues`);
      recommendations.push('Consider Modified IRR (MIRR) for projects with multiple sign changes');
    }

    // Check for zero cash flows in early periods
    const earlyFlows = sortedFlows.filter(cf => cf.period <= 2);
    const earlyZeroFlows = earlyFlows.filter(cf => cf.amount === 0).length;

    if (earlyZeroFlows > 0) {
      issues.push(`Zero cash flows in early periods (${earlyZeroFlows})`);
      recommendations.push('Verify that early zero cash flows are intentional');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Calculate comprehensive investment metrics
   *
   * @param cashFlows - Array of cash flow objects
   * @param discountRate - Discount rate for NPV calculation
   * @returns Complete investment analysis
   */
  public analyzeInvestment(
    cashFlows: CashFlow[],
    discountRate: number
  ): InvestmentMetrics {
    const npv = this.calculateNPV(cashFlows, discountRate);
    const irr = this.calculateIRR(cashFlows);
    const paybackPeriod = this.calculatePaybackPeriod(cashFlows, discountRate);
    const roi = this.calculateROI(
      cashFlows.filter(cf => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0),
      Math.abs(cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0))
    );
    const profitabilityIndex = this.calculateProfitabilityIndex(cashFlows, discountRate);

    const totalInvestment = Math.abs(
      cashFlows.filter(cf => cf.amount < 0 && cf.period === 0)
        .reduce((sum, cf) => sum + cf.amount, 0)
    );

    const totalReturns = cashFlows.filter(cf => cf.amount > 0)
      .reduce((sum, cf) => sum + cf.amount, 0);

    const discountedCashFlows = cashFlows.map(cf =>
      this.calculateDCF(cf.amount, cf.period, discountRate)
    );

    return {
      npv,
      irr,
      paybackPeriod,
      roi,
      profitabilityIndex,
      totalInvestment,
      totalReturns,
      discountedCashFlows
    };
  }
}

export const financialEngine = new FinancialEngine();

// Simplified investment interface for Phase 2B components
export interface SimpleInvestment {
  id: number;
  name: string;
  description: string;
  cashFlows: CashFlow[];
  discountRate: number;
  analysis?: InvestmentMetrics;
}

/**
 * Utility functions for common financial calculations
 */
export const FinancialUtils = {
  /**
   * Convert percentage to decimal
   */
  percentageToDecimal: (percentage: number): number => percentage / 100,

  /**
   * Convert decimal to percentage
   */
  decimalToPercentage: (decimal: number): number => decimal * 100,

  /**
   * Format currency for display
   */
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Format percentage for display
   */
  formatPercentage: (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Check if IRR calculation converged
   */
  isIRRValid: (irr: number | null): boolean => {
    return irr !== null && !isNaN(irr) && isFinite(irr) && irr !== Infinity && irr !== -Infinity;
  }
};

/**
 * Type definitions for external integrations
 */
export interface InvestmentProject {
  id: number;
  name: string;
  description: string;
  cashFlows: CashFlow[];
  discountRate: number;
  analysis?: InvestmentMetrics;
  createdAt: string;
}

export interface ESGData {
  id: number;
  projectId: number;
  score: number;
  factors: Record<string, any>;
  createdAt: string;
}

/**
 * Enhanced project analysis with ESG integration
 */
export interface ESGInvestmentMetrics extends InvestmentMetrics {
  esgScore: number;
  environmentalImpact: number;
  socialImpact: number;
  governanceScore: number;
  riskAdjustedReturn: number;
}

// Default configuration for common use cases
export const FinancialDefaults = {
  CORPORATE_TAX_RATE: 0.25,
  STANDARD_DISCOUNT_RATE: 0.10,
  SMALL_BUSINESS_DISCOUNT_RATE: 0.12,
  HIGH_RISK_DISCOUNT_RATE: 0.15,
  LOW_RISK_DISCOUNT_RATE: 0.08,
  ANALYSIS_PERIOD_YEARS: 10
} as const;