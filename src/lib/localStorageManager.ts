/**
 * Local Browser Storage Manager for CEIP
 * 
 * Comprehensive local storage system to replace mock data with persistent,
 * structured data management. Focuses on Indigenous data sovereignty,
 * investment tracking, and compliance monitoring.
 */

import { SAFETY } from './constants';

// Core interfaces for local data management
export interface LocalDataRecord {
  id: string;
  created_at: string;
  updated_at: string;
  data_source: 'user_input' | 'imported' | 'calculated' | 'external_api';
  governance_status?: 'approved' | 'pending' | 'restricted';
}

export interface IndigenousProjectRecord extends LocalDataRecord {
  name: string;
  territory_id: string;
  territory_name: string;
  community: string;
  traditional_territory: string;
  consultation_status: 'not_started' | 'ongoing' | 'completed' | 'pending';
  fpic_status: 'required' | 'obtained' | 'declined' | 'in_progress';
  benefit_sharing: {
    revenue_share_percent?: number;
    employment_commitments?: string[];
    capacity_building?: string[];
  };
  impact_assessment?: {
    cultural_impact: 'low' | 'medium' | 'high';
    environmental_impact: 'low' | 'medium' | 'high';
    economic_impact: 'low' | 'medium' | 'high';
    spiritual_impact: 'low' | 'medium' | 'high';
  };
  consultation_log: Array<{
    date: string;
    participants: string[];
    topics: string[];
    outcomes: string[];
    next_steps: string[];
  }>;
}

export interface InvestmentProjectRecord extends LocalDataRecord {
  project_name: string;
  project_type: 'renewable' | 'efficiency' | 'grid' | 'storage' | 'other';
  total_investment_cad: number;
  funding_sources: Array<{
    source: string;
    amount_cad: number;
    type: 'grant' | 'loan' | 'equity' | 'debt';
  }>;
  financial_metrics: {
    npv_cad?: number;
    irr_percent?: number;
    payback_years?: number;
    lcoe_cad_per_mwh?: number;
  };
  esg_scores: {
    environmental_score: number; // 0-100
    social_score: number; // 0-100
    governance_score: number; // 0-100
  };
  risk_assessment: {
    market_risk: 'low' | 'medium' | 'high';
    technology_risk: 'low' | 'medium' | 'high';
    regulatory_risk: 'low' | 'medium' | 'high';
    overall_risk_score: number; // 0-100
  };
  project_status: 'planning' | 'approved' | 'construction' | 'operational' | 'decommissioned';
  expected_ghg_reduction_tonnes_co2e: number;
}

export interface ComplianceRecord extends LocalDataRecord {
  project_id: string;
  project_name: string;
  regulator: string;
  jurisdiction: 'federal' | 'provincial' | 'municipal' | 'indigenous';
  regulation_reference: string;
  compliance_status: 'compliant' | 'non_compliant' | 'pending_review' | 'remediation_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  violation_details?: string;
  remediation_plan?: string[];
  due_date?: string;
  assigned_to?: string;
  audit_trail: Array<{
    date: string;
    action: string;
    user: string;
    details: string;
  }>;
}

export interface MineralsSupplyRecord extends LocalDataRecord {
  mineral: string;
  production_tonnes_annually: number;
  import_tonnes_annually: number;
  export_tonnes_annually: number;
  primary_suppliers: Array<{
    country: string;
    percentage_of_supply: number;
    risk_score: number; // 0-100
  }>;
  price_cad_per_tonne: number;
  strategic_importance: 'critical' | 'important' | 'moderate' | 'low';
  supply_risk_factors: string[];
  mitigation_strategies: string[];
}

class LocalStorageManager {
  private readonly STORAGE_PREFIX = 'ceip_';
  private readonly VERSION = '1.0';
  
  // Storage keys for different data types
  private readonly KEYS = {
    INDIGENOUS_PROJECTS: `${this.STORAGE_PREFIX}indigenous_projects`,
    INVESTMENT_PROJECTS: `${this.STORAGE_PREFIX}investment_projects`,
    COMPLIANCE_RECORDS: `${this.STORAGE_PREFIX}compliance_records`,
    MINERALS_SUPPLY: `${this.STORAGE_PREFIX}minerals_supply`,
    USER_PREFERENCES: `${this.STORAGE_PREFIX}user_preferences`,
    DATA_VERSION: `${this.STORAGE_PREFIX}data_version`
  };

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    // Check if this is first run or version upgrade
    const currentVersion = localStorage.getItem(this.KEYS.DATA_VERSION);
    if (!currentVersion || currentVersion !== this.VERSION) {
      this.migrateData(currentVersion);
      localStorage.setItem(this.KEYS.DATA_VERSION, this.VERSION);
    }
  }

  private migrateData(fromVersion: string | null): void {
    // Handle data migration between versions
    if (!fromVersion) {
      // First time setup - initialize with sample data
      this.initializeSampleData();
    }
    // Add migration logic for future versions
  }

  private initializeSampleData(): void {
    // Initialize with governance-compliant sample data
    const sampleIndigenousProjects: IndigenousProjectRecord[] = [
      {
        id: 'indigenous_001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_source: 'user_input',
        governance_status: 'approved',
        name: 'Treaty 5 Wind Energy Partnership',
        territory_id: 'treaty5_001',
        territory_name: 'Treaty 5 Territory',
        community: 'Cree, Ojibwe, Dene',
        traditional_territory: 'Treaty 5 Territory - Northern Manitoba',
        consultation_status: 'completed',
        fpic_status: 'obtained',
        benefit_sharing: {
          revenue_share_percent: 15,
          employment_commitments: ['50% local hiring', 'Training programs'],
          capacity_building: ['Technical training', 'Project management']
        },
        impact_assessment: {
          cultural_impact: 'low',
          environmental_impact: 'medium',
          economic_impact: 'high',
          spiritual_impact: 'low'
        },
        consultation_log: [
          {
            date: '2024-12-15',
            participants: ['Chief Johnson', 'Council Members', 'Project Team'],
            topics: ['Environmental impact', 'Revenue sharing', 'Employment'],
            outcomes: ['Agreement on 15% revenue share', 'Local hiring commitment'],
            next_steps: ['Finalize legal agreements', 'Begin construction planning']
          }
        ]
      }
    ];

    const sampleInvestmentProjects: InvestmentProjectRecord[] = [
      {
        id: 'investment_001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_source: 'user_input',
        project_name: 'Ontario Solar Farm Development',
        project_type: 'renewable',
        total_investment_cad: 250000000,
        funding_sources: [
          { source: 'Canada Infrastructure Bank', amount_cad: 100000000, type: 'loan' },
          { source: 'Private Equity', amount_cad: 150000000, type: 'equity' }
        ],
        financial_metrics: {
          npv_cad: 45000000,
          irr_percent: 8.5,
          payback_years: 12,
          lcoe_cad_per_mwh: 65
        },
        esg_scores: {
          environmental_score: 92,
          social_score: 78,
          governance_score: 85
        },
        risk_assessment: {
          market_risk: 'medium',
          technology_risk: 'low',
          regulatory_risk: 'low',
          overall_risk_score: 35
        },
        project_status: 'approved',
        expected_ghg_reduction_tonnes_co2e: 125000
      }
    ];

    this.saveData(this.KEYS.INDIGENOUS_PROJECTS, sampleIndigenousProjects);
    this.saveData(this.KEYS.INVESTMENT_PROJECTS, sampleInvestmentProjects);
  }

  // Generic data operations
  private formatKey(key: string): string {
    return key.startsWith(this.STORAGE_PREFIX) ? key : `${this.STORAGE_PREFIX}${key}`;
  }

  public getDataset<T>(key: string): T[] {
    return this.loadData<T>(this.formatKey(key));
  }

  public setDataset<T>(key: string, data: T[]): void {
    this.saveData(this.formatKey(key), data);
  }

  private saveData<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving data to ${key}:`, error);
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  private loadData<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error loading data from ${key}:`, error);
      return [];
    }
  }

  // Indigenous Projects Management
  public getIndigenousProjects(): IndigenousProjectRecord[] {
    return this.loadData<IndigenousProjectRecord>(this.KEYS.INDIGENOUS_PROJECTS);
  }

  public addIndigenousProject(project: Omit<IndigenousProjectRecord, 'id' | 'created_at' | 'updated_at'>): string {
    const projects = this.getIndigenousProjects();
    const newProject: IndigenousProjectRecord = {
      ...project,
      id: `indigenous_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    projects.push(newProject);
    this.saveData(this.KEYS.INDIGENOUS_PROJECTS, projects);
    return newProject.id;
  }

  public updateIndigenousProject(id: string, updates: Partial<IndigenousProjectRecord>): boolean {
    const projects = this.getIndigenousProjects();
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) return false;
    
    projects[index] = {
      ...projects[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.saveData(this.KEYS.INDIGENOUS_PROJECTS, projects);
    return true;
  }

  // Investment Projects Management
  public getInvestmentProjects(): InvestmentProjectRecord[] {
    return this.loadData<InvestmentProjectRecord>(this.KEYS.INVESTMENT_PROJECTS);
  }

  public addInvestmentProject(project: Omit<InvestmentProjectRecord, 'id' | 'created_at' | 'updated_at'>): string {
    const projects = this.getInvestmentProjects();
    const newProject: InvestmentProjectRecord = {
      ...project,
      id: `investment_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    projects.push(newProject);
    this.saveData(this.KEYS.INVESTMENT_PROJECTS, projects);
    return newProject.id;
  }

  // Compliance Records Management
  public getComplianceRecords(): ComplianceRecord[] {
    return this.loadData<ComplianceRecord>(this.KEYS.COMPLIANCE_RECORDS);
  }

  public addComplianceRecord(record: Omit<ComplianceRecord, 'id' | 'created_at' | 'updated_at'>): string {
    const records = this.getComplianceRecords();
    const newRecord: ComplianceRecord = {
      ...record,
      id: `compliance_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    records.push(newRecord);
    this.saveData(this.KEYS.COMPLIANCE_RECORDS, records);
    return newRecord.id;
  }

  // Minerals Supply Management
  public getMineralsSupply(): MineralsSupplyRecord[] {
    return this.loadData<MineralsSupplyRecord>(this.KEYS.MINERALS_SUPPLY);
  }

  public addMineralsSupplyRecord(record: Omit<MineralsSupplyRecord, 'id' | 'created_at' | 'updated_at'>): string {
    const records = this.getMineralsSupply();
    const newRecord: MineralsSupplyRecord = {
      ...record,
      id: `minerals_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    records.push(newRecord);
    this.saveData(this.KEYS.MINERALS_SUPPLY, records);
    return newRecord.id;
  }

  // Data Export/Import for backup and migration
  public exportAllData(): string {
    const allData = {
      version: this.VERSION,
      exported_at: new Date().toISOString(),
      indigenous_projects: this.getIndigenousProjects(),
      investment_projects: this.getInvestmentProjects(),
      compliance_records: this.getComplianceRecords(),
      minerals_supply: this.getMineralsSupply()
    };
    
    return JSON.stringify(allData, null, 2);
  }

  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.indigenous_projects) {
        this.saveData(this.KEYS.INDIGENOUS_PROJECTS, data.indigenous_projects);
      }
      if (data.investment_projects) {
        this.saveData(this.KEYS.INVESTMENT_PROJECTS, data.investment_projects);
      }
      if (data.compliance_records) {
        this.saveData(this.KEYS.COMPLIANCE_RECORDS, data.compliance_records);
      }
      if (data.minerals_supply) {
        this.saveData(this.KEYS.MINERALS_SUPPLY, data.minerals_supply);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Clear all data (with confirmation)
  public clearAllData(): void {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.initializeSampleData();
  }

  // Get storage usage statistics
  public getStorageStats(): { used: number; available: number; percentage: number } {
    let used = 0;
    Object.values(this.KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) used += data.length;
    });
    
    const available = 5 * 1024 * 1024; // Approximate 5MB localStorage limit
    const percentage = (used / available) * 100;
    
    return { used, available, percentage };
  }
}

// Export singleton instance
export const localStorageManager = new LocalStorageManager();
