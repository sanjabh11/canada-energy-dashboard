import React, { useState } from 'react';
import {
  X, Save, ChevronRight, ChevronLeft, Check, AlertTriangle,
  Building, MapPin, Zap, DollarSign, Users, Shield, Calendar,
  FileText, Eye, EyeOff, Lock, Globe, Upload
} from 'lucide-react';
import NativeLandTerritorySelector from './NativeLandTerritorySelector';
import type { TerritorySearchResult } from '../lib/nativeLandApi';

// Enhanced project data structure matching PRD schema
export interface EnhancedIndigenousProject {
  // Basic Info
  project_name: string;
  community_name: string;
  community_id?: string;
  province: string;
  traditional_territory: string;
  
  // Project Details
  technology_type: string;
  capacity_kw?: number;
  project_status: 'planning' | 'construction' | 'operational' | 'decommissioned';
  start_date?: string;
  operational_date?: string;
  decommission_date?: string;
  
  // Financial
  total_budget?: number;
  actual_cost?: number;
  funding_sources: { source: string; amount: number }[];
  
  // UNDRIP Compliance
  fpic_status: 'obtained' | 'in_progress' | 'not_applicable' | 'required';
  fpic_date?: string;
  undrip_compliant: boolean;
  consent_documentation_url?: string;
  consent_authority?: string; // Who granted consent (e.g., band council)
  
  // Impact Metrics
  jobs_created?: number;
  emissions_avoided_tonnes_co2?: number;
  households_served?: number;
  revenue_sharing_model?: string;
  community_benefits: string[];
  
  // Partnerships
  lead_partners: { name: string; role: string }[];
  consultants: { name: string; role: string }[];
  utility_interconnection?: string;
  
  // Data Sovereignty (OCAP®)
  visibility: 'public' | 'ice_network' | 'private';
  data_owner_name: string;
  data_owner_email: string;
  consent_expires_at?: string;
}

interface IndigenousProjectFormProps {
  onSubmit: (project: EnhancedIndigenousProject) => void;
  onCancel: () => void;
  initialData?: Partial<EnhancedIndigenousProject>;
  isEditing?: boolean;
}

const PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
];

const TECHNOLOGY_TYPES = [
  { value: 'solar', label: 'Solar PV' },
  { value: 'wind', label: 'Wind' },
  { value: 'hydro', label: 'Hydro (Run-of-River)' },
  { value: 'biomass', label: 'Biomass' },
  { value: 'geothermal', label: 'Geothermal' },
  { value: 'storage', label: 'Battery Storage' },
  { value: 'thermal', label: 'District Heating' },
  { value: 'hybrid', label: 'Hybrid System' },
  { value: 'other', label: 'Other' }
];

const FUNDING_SOURCES = [
  'Wah-ila-toos',
  'CERRC',
  'Northern REACHE',
  'Indigenous Services Canada',
  'Provincial Grant',
  'Community Investment',
  'Private Investment',
  'Bank Financing',
  'Other'
];

const FORM_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: Building },
  { id: 'project', title: 'Project Details', icon: Zap },
  { id: 'financial', title: 'Financial', icon: DollarSign },
  { id: 'compliance', title: 'UNDRIP/FPIC', icon: Shield },
  { id: 'impact', title: 'Impact Metrics', icon: Users },
  { id: 'visibility', title: 'Data Sovereignty', icon: Eye }
];

export function IndigenousProjectForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false
}: IndigenousProjectFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritorySearchResult | null>(null);
  const [formData, setFormData] = useState<EnhancedIndigenousProject>({
    project_name: initialData?.project_name || '',
    community_name: initialData?.community_name || '',
    province: initialData?.province || '',
    traditional_territory: initialData?.traditional_territory || '',
    technology_type: initialData?.technology_type || 'solar',
    project_status: initialData?.project_status || 'planning',
    funding_sources: initialData?.funding_sources || [],
    fpic_status: initialData?.fpic_status || 'required',
    undrip_compliant: initialData?.undrip_compliant || false,
    community_benefits: initialData?.community_benefits || [],
    lead_partners: initialData?.lead_partners || [],
    consultants: initialData?.consultants || [],
    visibility: initialData?.visibility || 'private',
    data_owner_name: initialData?.data_owner_name || '',
    data_owner_email: initialData?.data_owner_email || '',
    ...initialData
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newFundingSource, setNewFundingSource] = useState({ source: '', amount: '' });
  const [newPartner, setNewPartner] = useState({ name: '', role: '' });
  const [newBenefit, setNewBenefit] = useState('');

  function updateField<K extends keyof EnhancedIndigenousProject>(
    field: K,
    value: EnhancedIndigenousProject[K]
  ) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Basic Info
        if (!formData.project_name.trim()) newErrors.project_name = 'Project name is required';
        if (!formData.community_name.trim()) newErrors.community_name = 'Community name is required';
        if (!formData.province) newErrors.province = 'Province is required';
        if (!formData.traditional_territory.trim()) newErrors.traditional_territory = 'Traditional territory is required';
        break;
      case 1: // Project Details
        if (!formData.technology_type) newErrors.technology_type = 'Technology type is required';
        break;
      case 3: // UNDRIP/FPIC
        if (formData.fpic_status === 'obtained' && !formData.fpic_date) {
          newErrors.fpic_date = 'FPIC date is required when consent is obtained';
        }
        break;
      case 5: // Data Sovereignty
        if (!formData.data_owner_name.trim()) newErrors.data_owner_name = 'Data owner name is required';
        if (!formData.data_owner_email.trim()) newErrors.data_owner_email = 'Data owner email is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length - 1));
    }
  }

  function handlePrevious() {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }

  function handleSubmit() {
    if (validateStep(currentStep)) {
      onSubmit(formData);
    }
  }

  function addFundingSource() {
    if (newFundingSource.source && newFundingSource.amount) {
      updateField('funding_sources', [
        ...formData.funding_sources,
        { source: newFundingSource.source, amount: parseFloat(newFundingSource.amount) }
      ]);
      setNewFundingSource({ source: '', amount: '' });
    }
  }

  function removeFundingSource(index: number) {
    updateField('funding_sources', formData.funding_sources.filter((_, i) => i !== index));
  }

  function addPartner() {
    if (newPartner.name && newPartner.role) {
      updateField('lead_partners', [...formData.lead_partners, { ...newPartner }]);
      setNewPartner({ name: '', role: '' });
    }
  }

  function removePartner(index: number) {
    updateField('lead_partners', formData.lead_partners.filter((_, i) => i !== index));
  }

  function addBenefit() {
    if (newBenefit.trim()) {
      updateField('community_benefits', [...formData.community_benefits, newBenefit.trim()]);
      setNewBenefit('');
    }
  }

  function removeBenefit(index: number) {
    updateField('community_benefits', formData.community_benefits.filter((_, i) => i !== index));
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={e => updateField('project_name', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 ${
                  errors.project_name ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="e.g., Northern Grid Solar Partnership"
              />
              {errors.project_name && (
                <p className="text-red-400 text-sm mt-1">{errors.project_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Community Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.community_name}
                onChange={e => updateField('community_name', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 ${
                  errors.community_name ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="e.g., Cree Nation of Mistissini"
              />
              {errors.community_name && (
                <p className="text-red-400 text-sm mt-1">{errors.community_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Province/Territory <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.province}
                onChange={e => updateField('province', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 ${
                  errors.province ? 'border-red-500' : 'border-slate-600'
                }`}
              >
                <option value="">Select province...</option>
                {PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.province && (
                <p className="text-red-400 text-sm mt-1">{errors.province}</p>
              )}
            </div>

            <div>
              <NativeLandTerritorySelector
                label="Traditional Territory"
                required
                selectedTerritory={selectedTerritory}
                onSelect={(territory) => {
                  setSelectedTerritory(territory);
                  updateField('traditional_territory', territory?.name || '');
                }}
              />
              {errors.traditional_territory && (
                <p className="text-red-400 text-sm mt-1">{errors.traditional_territory}</p>
              )}
              {formData.traditional_territory && (
                <p className="text-xs text-slate-400 mt-1">
                  Stored as: {formData.traditional_territory}
                </p>
              )}
            </div>
          </div>
        );

      case 1: // Project Details
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Technology Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.technology_type}
                onChange={e => updateField('technology_type', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                {TECHNOLOGY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Capacity (kW)
              </label>
              <input
                type="number"
                value={formData.capacity_kw || ''}
                onChange={e => updateField('capacity_kw', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Project Status
              </label>
              <select
                value={formData.project_status}
                onChange={e => updateField('project_status', e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="planning">Planning</option>
                <option value="construction">Construction</option>
                <option value="operational">Operational</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={e => updateField('start_date', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Operational Date
                </label>
                <input
                  type="date"
                  value={formData.operational_date || ''}
                  onChange={e => updateField('operational_date', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Utility Interconnection
              </label>
              <input
                type="text"
                value={formData.utility_interconnection || ''}
                onChange={e => updateField('utility_interconnection', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Manitoba Hydro, IESO"
              />
            </div>
          </div>
        );

      case 2: // Financial
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Budget ($)
                </label>
                <input
                  type="number"
                  value={formData.total_budget || ''}
                  onChange={e => updateField('total_budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 1500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Actual Cost to Date ($)
                </label>
                <input
                  type="number"
                  value={formData.actual_cost || ''}
                  onChange={e => updateField('actual_cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 750000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Funding Sources
              </label>
              <div className="space-y-2 mb-3">
                {formData.funding_sources.map((fs, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg">
                    <span className="flex-1">{fs.source}</span>
                    <span className="text-emerald-400">${fs.amount.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => removeFundingSource(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={newFundingSource.source}
                  onChange={e => setNewFundingSource(prev => ({ ...prev, source: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select source...</option>
                  {FUNDING_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newFundingSource.amount}
                  onChange={e => setNewFundingSource(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={addFundingSource}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Revenue Sharing Model
              </label>
              <textarea
                value={formData.revenue_sharing_model || ''}
                onChange={e => updateField('revenue_sharing_model', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Describe the revenue sharing arrangement with the community..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Key Partners
              </label>
              <div className="space-y-2 mb-3">
                {formData.lead_partners.map((partner, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg">
                    <span className="flex-1">{partner.name}</span>
                    <span className="text-slate-400">{partner.role}</span>
                    <button
                      type="button"
                      onClick={() => removePartner(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={e => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Partner name"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <input
                  type="text"
                  value={newPartner.role}
                  onChange={e => setNewPartner(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Role"
                  className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={addPartner}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 3: // UNDRIP/FPIC Compliance
        return (
          <div className="space-y-6">
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-300">UNDRIP Compliance Notice</h4>
                  <p className="text-sm text-amber-200/80 mt-1">
                    Free, Prior and Informed Consent (FPIC) is a fundamental right of Indigenous peoples.
                    Ensure all consent documentation is properly obtained and stored.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                FPIC Status <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.fpic_status}
                onChange={e => updateField('fpic_status', e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="required">Required - Not Yet Obtained</option>
                <option value="in_progress">In Progress</option>
                <option value="obtained">Obtained</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>

            {formData.fpic_status === 'obtained' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Date of Consent <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fpic_date || ''}
                    onChange={e => updateField('fpic_date', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 ${
                      errors.fpic_date ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  {errors.fpic_date && (
                    <p className="text-red-400 text-sm mt-1">{errors.fpic_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Consent Authority
                  </label>
                  <input
                    type="text"
                    value={formData.consent_authority || ''}
                    onChange={e => updateField('consent_authority', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Band Council Resolution #2025-01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Consent Documentation URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.consent_documentation_url || ''}
                      onChange={e => updateField('consent_documentation_url', e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      className="px-4 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Documents are stored securely and access is logged for audit purposes.
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="undrip_compliant"
                checked={formData.undrip_compliant}
                onChange={e => updateField('undrip_compliant', e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="undrip_compliant" className="text-slate-300">
                This project is UNDRIP compliant
              </label>
            </div>
          </div>
        );

      case 4: // Impact Metrics
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Jobs Created
                </label>
                <input
                  type="number"
                  value={formData.jobs_created || ''}
                  onChange={e => updateField('jobs_created', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Emissions Avoided (tCO2)
                </label>
                <input
                  type="number"
                  value={formData.emissions_avoided_tonnes_co2 || ''}
                  onChange={e => updateField('emissions_avoided_tonnes_co2', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Households Served
                </label>
                <input
                  type="number"
                  value={formData.households_served || ''}
                  onChange={e => updateField('households_served', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Community Benefits
              </label>
              <div className="space-y-2 mb-3">
                {formData.community_benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="flex-1">{benefit}</span>
                    <button
                      type="button"
                      onClick={() => removeBenefit(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBenefit}
                  onChange={e => setNewBenefit(e.target.value)}
                  placeholder="e.g., Skills training program, Revenue sharing"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <button
                  type="button"
                  onClick={addBenefit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 5: // Data Sovereignty (OCAP®)
        return (
          <div className="space-y-6">
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-300">OCAP® Data Sovereignty</h4>
                  <p className="text-sm text-purple-200/80 mt-1">
                    <strong>O</strong>wnership, <strong>C</strong>ontrol, <strong>A</strong>ccess, <strong>P</strong>ossession - 
                    Communities control who sees their data and can export or delete it at any time.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Visibility <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors ${
                  formData.visibility === 'public' 
                    ? 'bg-emerald-900/30 border-emerald-500' 
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === 'public'}
                    onChange={() => updateField('visibility', 'public')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">Public</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Anyone can view this project. Ideal for showcasing successful projects and attracting partners.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors ${
                  formData.visibility === 'ice_network' 
                    ? 'bg-blue-900/30 border-blue-500' 
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="ice_network"
                    checked={formData.visibility === 'ice_network'}
                    onChange={() => updateField('visibility', 'ice_network')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">ICE Network Members Only</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Only Indigenous Clean Energy Network members can view. Good for benchmarking with peer communities.
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors ${
                  formData.visibility === 'private' 
                    ? 'bg-amber-900/30 border-amber-500' 
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={() => updateField('visibility', 'private')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-400" />
                      <span className="font-medium">Private (Community Only)</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Only your community can view. Data is excluded from all aggregated reports and benchmarks.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Owner Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.data_owner_name}
                onChange={e => updateField('data_owner_name', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 ${
                  errors.data_owner_name ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Name of person or organization responsible for this data"
              />
              {errors.data_owner_name && (
                <p className="text-red-400 text-sm mt-1">{errors.data_owner_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Owner Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.data_owner_email}
                onChange={e => updateField('data_owner_email', e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 ${
                  errors.data_owner_email ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Contact email for data governance inquiries"
              />
              {errors.data_owner_email && (
                <p className="text-red-400 text-sm mt-1">{errors.data_owner_email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Consent Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={formData.consent_expires_at || ''}
                onChange={e => updateField('consent_expires_at', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                If set, data visibility will automatically revert to private after this date.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Edit Project' : 'Register Indigenous Energy Project'}
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    className={`flex flex-col items-center gap-1 ${
                      isActive ? 'text-emerald-400' : 
                      isCompleted ? 'text-emerald-600 cursor-pointer' : 
                      'text-slate-500'
                    }`}
                    disabled={index > currentStep}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-emerald-500/20 ring-2 ring-emerald-500' :
                      isCompleted ? 'bg-emerald-600/20' :
                      'bg-slate-700'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs hidden sm:block">{step.title}</span>
                  </button>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-emerald-600' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <h3 className="text-lg font-medium text-white mb-6">
            {FORM_STEPS[currentStep].title}
          </h3>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          
          {currentStep === FORM_STEPS.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Save Changes' : 'Submit Project'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IndigenousProjectForm;
