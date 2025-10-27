/**
 * Test Data Injection System
 *
 * Utility for injecting mock data into components for testing
 * and development purposes. Provides realistic test scenarios.
 */

import { energyDataManager, type DatasetType } from './dataManager';

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  dataOverrides: Record<DatasetType, any[]>;
  connectionStatuses: Record<DatasetType, 'connected' | 'connecting' | 'error' | 'offline'>;
  duration?: number; // Auto-revert after duration (ms)
}

export interface InjectionOptions {
  autoRevert?: boolean;
  duration?: number;
  preserveOriginal?: boolean;
}

export class TestDataInjector {
  private originalData: Map<DatasetType, any[]> = new Map();
  private originalStatuses: Map<DatasetType, any> = new Map();
  private activeInjections: Map<string, NodeJS.Timeout> = new Map();

  // Predefined test scenarios
  public readonly scenarios: TestScenario[] = [
    {
      id: 'high-load',
      name: 'High Load Scenario',
      description: 'Simulate high demand with all systems operational',
      dataOverrides: {
        provincial_generation: this.generateHighLoadGenerationData(),
        ontario_demand: this.generateHighDemandData(),
        ontario_prices: this.generateHighPriceData(),
        hf_electricity_demand: this.generateHighConsumptionData()
      },
      connectionStatuses: {
        provincial_generation: 'connected',
        ontario_demand: 'connected',
        ontario_prices: 'connected',
        hf_electricity_demand: 'connected'
      }
    },
    {
      id: 'outage-simulation',
      name: 'Regional Outage',
      description: 'Simulate power outage in Ontario with reduced generation',
      dataOverrides: {
        provincial_generation: this.generateOutageGenerationData(),
        ontario_demand: this.generateOutageDemandData(),
        ontario_prices: this.generateOutagePriceData(),
        hf_electricity_demand: this.generateNormalConsumptionData()
      },
      connectionStatuses: {
        provincial_generation: 'connected',
        ontario_demand: 'error',
        ontario_prices: 'connected',
        hf_electricity_demand: 'connected'
      }
    },
    {
      id: 'renewable-peak',
      name: 'Renewable Energy Peak',
      description: 'High renewable generation with low fossil fuel usage',
      dataOverrides: {
        provincial_generation: this.generateRenewablePeakData(),
        ontario_demand: this.generateNormalDemandData(),
        ontario_prices: this.generateLowPriceData(),
        hf_electricity_demand: this.generateNormalConsumptionData()
      },
      connectionStatuses: {
        provincial_generation: 'connected',
        ontario_demand: 'connected',
        ontario_prices: 'connected',
        hf_electricity_demand: 'connected'
      }
    },
    {
      id: 'system-stress',
      name: 'System Stress Test',
      description: 'Maximum load with some connection issues',
      dataOverrides: {
        provincial_generation: this.generateStressGenerationData(),
        ontario_demand: this.generateStressDemandData(),
        ontario_prices: this.generateStressPriceData(),
        hf_electricity_demand: this.generateStressConsumptionData()
      },
      connectionStatuses: {
        provincial_generation: 'connecting',
        ontario_demand: 'connected',
        ontario_prices: 'error',
        hf_electricity_demand: 'connected'
      }
    }
  ];

  private generateHighLoadGenerationData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      province: ['ON', 'QC', 'BC', 'AB', 'SK', 'MB'][i % 6],
      fuel_type: ['Nuclear', 'Hydro', 'Wind', 'Solar', 'Gas'][i % 5],
      megawatt_hours: 800 + Math.random() * 400,
      generation_gwh: (800 + Math.random() * 400) / 1000,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      completeness_pct: 98 + Math.random() * 2
    }));
  }

  private generateHighDemandData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      hour: new Date(Date.now() - i * 3600000).toISOString(),
      demand_mw: 18000 + Math.random() * 5000,
      temperature: 20 + Math.random() * 15,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      completeness_pct: 97 + Math.random() * 3
    }));
  }

  private generateHighPriceData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      lmp_price: 80 + Math.random() * 40,
      congestion_price: Math.random() * 20,
      loss_price: Math.random() * 10,
      completeness_pct: 96 + Math.random() * 4
    }));
  }

  private generateHighConsumptionData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 900000).toISOString(),
      consumption_kwh: 15 + Math.random() * 10,
      temperature: 18 + Math.random() * 12,
      household_id: `HH${i % 50}`,
      completeness_pct: 95 + Math.random() * 5
    }));
  }

  private generateOutageGenerationData(): any[] {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      province: i < 25 ? 'ON' : ['QC', 'BC', 'AB'][i % 3],
      fuel_type: i < 25 ? 'Gas' : ['Nuclear', 'Hydro', 'Wind'][i % 3],
      megawatt_hours: i < 25 ? 200 + Math.random() * 100 : 600 + Math.random() * 300,
      generation_gwh: (i < 25 ? 200 + Math.random() * 100 : 600 + Math.random() * 300) / 1000,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      completeness_pct: i < 25 ? 85 + Math.random() * 10 : 95 + Math.random() * 5
    }));
  }

  private generateOutageDemandData(): any[] {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      hour: new Date(Date.now() - i * 3600000).toISOString(),
      demand_mw: 12000 + Math.random() * 3000,
      temperature: 22 + Math.random() * 8,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      completeness_pct: 80 + Math.random() * 15
    }));
  }

  private generateOutagePriceData(): any[] {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      lmp_price: 120 + Math.random() * 60,
      congestion_price: 30 + Math.random() * 20,
      loss_price: 15 + Math.random() * 10,
      completeness_pct: 75 + Math.random() * 20
    }));
  }

  private generateNormalConsumptionData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 900000).toISOString(),
      consumption_kwh: 12 + Math.random() * 8,
      temperature: 20 + Math.random() * 10,
      household_id: `HH${i % 50}`,
      completeness_pct: 95 + Math.random() * 5
    }));
  }

  private generateRenewablePeakData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      province: ['ON', 'QC', 'BC', 'AB', 'SK', 'MB'][i % 6],
      fuel_type: i % 3 === 0 ? 'Wind' : i % 3 === 1 ? 'Solar' : 'Hydro',
      megawatt_hours: 700 + Math.random() * 500,
      generation_gwh: (700 + Math.random() * 500) / 1000,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      completeness_pct: 98 + Math.random() * 2
    }));
  }

  private generateNormalDemandData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      hour: new Date(Date.now() - i * 3600000).toISOString(),
      demand_mw: 15000 + Math.random() * 4000,
      temperature: 20 + Math.random() * 15,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      completeness_pct: 97 + Math.random() * 3
    }));
  }

  private generateLowPriceData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 300000).toISOString(),
      lmp_price: 40 + Math.random() * 20,
      congestion_price: Math.random() * 5,
      loss_price: Math.random() * 3,
      completeness_pct: 96 + Math.random() * 4
    }));
  }

  private generateStressGenerationData(): any[] {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      province: ['ON', 'QC', 'BC', 'AB', 'SK', 'MB'][i % 6],
      fuel_type: ['Nuclear', 'Hydro', 'Wind', 'Solar', 'Gas', 'Coal'][i % 6],
      megawatt_hours: 900 + Math.random() * 600,
      generation_gwh: (900 + Math.random() * 600) / 1000,
      timestamp: new Date(Date.now() - i * 30000).toISOString(),
      completeness_pct: 90 + Math.random() * 10
    }));
  }

  private generateStressDemandData(): any[] {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      hour: new Date(Date.now() - i * 1800000).toISOString(),
      demand_mw: 20000 + Math.random() * 8000,
      temperature: 25 + Math.random() * 20,
      timestamp: new Date(Date.now() - i * 1800000).toISOString(),
      completeness_pct: 85 + Math.random() * 15
    }));
  }

  private generateStressPriceData(): any[] {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 150000).toISOString(),
      lmp_price: 150 + Math.random() * 100,
      congestion_price: 50 + Math.random() * 30,
      loss_price: 20 + Math.random() * 15,
      completeness_pct: 80 + Math.random() * 20
    }));
  }

  private generateStressConsumptionData(): any[] {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - i * 450000).toISOString(),
      consumption_kwh: 20 + Math.random() * 15,
      temperature: 15 + Math.random() * 25,
      household_id: `HH${i % 100}`,
      completeness_pct: 85 + Math.random() * 15
    }));
  }

  public async injectScenario(
    scenarioId: string,
    options: InjectionOptions = {}
  ): Promise<void> {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    // Preserve original data if requested
    if (options.preserveOriginal !== false) {
      for (const datasetKey of Object.keys(scenario.dataOverrides) as DatasetType[]) {
        const originalData = energyDataManager.getCachedData(datasetKey);
        if (originalData) {
          this.originalData.set(datasetKey, [...originalData]);
        }
      }
    }

    // Inject data
    for (const [datasetKey, data] of Object.entries(scenario.dataOverrides)) {
      // Simulate cache update
      (energyDataManager as any).dataCache.set(datasetKey, data);
    }

    // Inject connection statuses
    for (const [datasetKey, status] of Object.entries(scenario.connectionStatuses)) {
      const mockStatus = {
        dataset: datasetKey,
        status,
        lastUpdate: new Date(),
        recordCount: scenario.dataOverrides[datasetKey as DatasetType]?.length || 0,
        source: 'test-injection'
      };
      (energyDataManager as any).connectionStatuses.set(datasetKey, mockStatus);
    }

    // Set up auto-revert if specified
    if (options.autoRevert && options.duration) {
      const timeoutId = setTimeout(() => {
        this.revertScenario(scenarioId);
      }, options.duration);
      this.activeInjections.set(scenarioId, timeoutId);
    }

    console.log(`Injected test scenario: ${scenario.name}`);
  }

  public async revertScenario(scenarioId: string): Promise<void> {
    // Clear auto-revert timeout
    const timeoutId = this.activeInjections.get(scenarioId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeInjections.delete(scenarioId);
    }

    // Restore original data
    for (const [datasetKey, originalData] of this.originalData.entries()) {
      if (originalData) {
        (energyDataManager as any).dataCache.set(datasetKey, originalData);
      }
    }

    // Restore original statuses
    for (const [datasetKey, originalStatus] of this.originalStatuses.entries()) {
      if (originalStatus) {
        (energyDataManager as any).connectionStatuses.set(datasetKey, originalStatus);
      }
    }

    this.originalData.clear();
    this.originalStatuses.clear();

    console.log(`Reverted test scenario: ${scenarioId}`);
  }

  public async runAutomatedTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const scenario of this.scenarios) {
      try {
        // Inject scenario
        await this.injectScenario(scenario.id, { duration: 5000 });

        // Wait for components to react
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run basic checks
        const checks = await this.runScenarioChecks(scenario);

        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: checks.every(check => check.passed),
          checks,
          timestamp: new Date()
        });

        // Revert scenario
        await this.revertScenario(scenario.id);

        // Wait between scenarios
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  private async runScenarioChecks(scenario: TestScenario): Promise<CheckResult[]> {
    const checks: CheckResult[] = [];

    // Check data injection
    for (const [datasetKey, expectedData] of Object.entries(scenario.dataOverrides)) {
      const actualData = energyDataManager.getCachedData(datasetKey as DatasetType);
      checks.push({
        name: `Data injection for ${datasetKey}`,
        passed: actualData?.length === expectedData.length,
        details: `Expected ${expectedData.length} records, got ${actualData?.length || 0}`
      });
    }

    // Check status injection
    for (const [datasetKey, expectedStatus] of Object.entries(scenario.connectionStatuses)) {
      const actualStatus = energyDataManager.getConnectionStatus(datasetKey as DatasetType);
      checks.push({
        name: `Status injection for ${datasetKey}`,
        passed: actualStatus.status === expectedStatus,
        details: `Expected ${expectedStatus}, got ${actualStatus.status}`
      });
    }

    return checks;
  }

  public getActiveScenarios(): string[] {
    return Array.from(this.activeInjections.keys());
  }

  public async clearAllInjections(): Promise<void> {
    const activeScenarios = this.getActiveScenarios();
    for (const scenarioId of activeScenarios) {
      await this.revertScenario(scenarioId);
    }
  }
}

export interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  checks?: CheckResult[];
  error?: string;
  timestamp: Date;
}

// Export singleton instance
export const testDataInjector = new TestDataInjector();
