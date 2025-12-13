/**
 * MicroGenWizard - Alberta Solar Permitting Automation
 * 
 * "TurboTax for Solar" - Strategy 2 from Gemini research
 * Automates AUC Form A and Micro-generation Regulation compliance checking.
 * 
 * Target Users: Homeowners wanting solar, Solar installers
 * Monetization: $50 one-time fee for "Permit Pack" PDF
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Sun,
    Home,
    FileText,
    Upload,
    Calculator,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Download,
    Zap,
    MapPin,
    DollarSign,
    Leaf
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { generatePermitPackagePDF, generateAUCFormPDF } from '../lib/pdfGenerator';

// Wizard step interface
interface WizardStep {
    id: number;
    title: string;
    description: string;
}

const WIZARD_STEPS: WizardStep[] = [
    { id: 1, title: 'Property Info', description: 'Enter your Alberta address' },
    { id: 2, title: 'Energy Usage', description: 'Upload or enter your utility bill data' },
    { id: 3, title: 'Solar Potential', description: 'Calculate your roof\'s solar capacity' },
    { id: 4, title: 'Compliance Check', description: 'Verify Micro-generation eligibility' },
    { id: 5, title: 'Documents', description: 'Generate your permit package' }
];

// Alberta utility data
const ALBERTA_UTILITIES = [
    { id: 'epcor', name: 'EPCOR', region: 'Edmonton' },
    { id: 'enmax', name: 'ENMAX', region: 'Calgary' },
    { id: 'fortis', name: 'FortisAlberta', region: 'Rural Alberta' },
    { id: 'atco', name: 'ATCO Electric', region: 'Northern Alberta' }
];

export function MicroGenWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: Property
        address: '',
        postalCode: '',
        utility: '',
        propertyType: 'residential',

        // Step 2: Usage
        annualKwh: '',
        monthlyBill: '',
        uploadedBill: null as File | null,

        // Step 3: Solar
        roofArea: '',
        roofOrientation: 'south',
        shading: 'none',
        estimatedCapacity: 0,

        // Step 4: Compliance
        systemSize: '',
        isCompliant: false,
        complianceIssues: [] as string[]
    });

    const [calculations, setCalculations] = useState({
        annualGeneration: 0,
        offsetPercentage: 0,
        estimatedSavings: 0,
        paybackYears: 0,
        co2Offset: 0
    });

    const updateFormData = (updates: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const calculateSolarPotential = () => {
        // Alberta averages 4.5 peak sun hours
        const peakSunHours = 4.5;
        const panelEfficiency = 0.20; // 20% efficient panels
        const roofAreaNum = parseFloat(formData.roofArea) || 0;

        // Orientation factor
        const orientationFactor = {
            'south': 1.0,
            'southeast': 0.95,
            'southwest': 0.95,
            'east': 0.85,
            'west': 0.85,
            'north': 0.6
        }[formData.roofOrientation] || 1.0;

        // Shading factor
        const shadingFactor = {
            'none': 1.0,
            'light': 0.9,
            'moderate': 0.75,
            'heavy': 0.5
        }[formData.shading] || 1.0;

        // Calculate capacity (kW)
        const capacity = (roofAreaNum * panelEfficiency * orientationFactor * shadingFactor) / 10;

        // Annual generation (kWh)
        const annualGen = capacity * peakSunHours * 365 * 0.85; // 85% system efficiency

        // Annual usage
        const annualUsage = parseFloat(formData.annualKwh) || 10000;

        // Offset
        const offset = Math.min((annualGen / annualUsage) * 100, 100);

        // Savings (at 15¢/kWh average)
        const savings = Math.min(annualGen, annualUsage) * 0.15;

        // CO2 offset (Alberta grid is ~0.6 kg CO2/kWh)
        const co2 = Math.min(annualGen, annualUsage) * 0.6 / 1000; // tonnes

        updateFormData({ estimatedCapacity: Math.round(capacity * 10) / 10 });
        setCalculations({
            annualGeneration: Math.round(annualGen),
            offsetPercentage: Math.round(offset),
            estimatedSavings: Math.round(savings),
            paybackYears: Math.round((capacity * 2500) / savings * 10) / 10, // $2500/kW installed
            co2Offset: Math.round(co2 * 10) / 10
        });
    };

    const checkCompliance = () => {
        const issues: string[] = [];
        const systemKw = parseFloat(formData.systemSize) || formData.estimatedCapacity;
        const annualUsage = parseFloat(formData.annualKwh) || 10000;
        const annualGen = systemKw * 4.5 * 365 * 0.85;

        // Alberta Micro-generation Regulation checks
        if (annualGen > annualUsage) {
            issues.push('System production exceeds annual consumption (not eligible for Micro-gen)');
        }

        if (systemKw > 150) {
            issues.push('System exceeds 150 kW maximum for Micro-generation');
        }

        if (!formData.utility) {
            issues.push('Utility provider required for interconnection');
        }

        updateFormData({
            isCompliant: issues.length === 0,
            complianceIssues: issues
        });
    };

    const nextStep = () => {
        if (currentStep === 3) {
            calculateSolarPotential();
        }
        if (currentStep === 4) {
            checkCompliance();
        }
        setCurrentStep(prev => Math.min(prev + 1, 5));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const generatePermitPack = () => {
        try {
            generatePermitPackagePDF(formData, calculations);
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('PDF generation requires jspdf library. Please install with: npm install jspdf');
        }
    };

    const generateAUCFormOnly = () => {
        try {
            generateAUCFormPDF(formData, calculations);
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('PDF generation requires jspdf library. Please install with: npm install jspdf');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900">
            <SEOHead
                title="Alberta Solar Permit Wizard | Micro-Generation Compliance Tool"
                description="Automate your Alberta solar permit application. Check Micro-generation eligibility and generate AUC Form A in minutes."
                path="/solar-wizard"
                keywords={['Alberta solar permit', 'micro-generation', 'AUC Form A', 'solar compliance', 'FortisAlberta interconnection']}
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Sun className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Alberta Solar Permit Wizard</h1>
                            <p className="text-amber-100">TurboTax for Solar – Micro-generation compliance made easy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-800 border-b border-slate-700 py-4 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        {WIZARD_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep > step.id
                                        ? 'bg-emerald-500 text-white'
                                        : currentStep === step.id
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-slate-700 text-slate-400'
                                        }`}>
                                        {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
                                    </div>
                                    <span className={`hidden md:block text-sm ${currentStep === step.id ? 'text-white' : 'text-slate-500'
                                        }`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < WIZARD_STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-700'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Wizard Content */}
            <div className="max-w-4xl mx-auto py-8 px-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8">

                    {/* Step 1: Property Info */}
                    {currentStep === 1 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Property Information</h2>
                            <p className="text-slate-400 mb-6">Enter your Alberta property details</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Street Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => updateFormData({ address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            placeholder="123 Main Street, Calgary"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Postal Code</label>
                                        <input
                                            type="text"
                                            value={formData.postalCode}
                                            onChange={(e) => updateFormData({ postalCode: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            placeholder="T2P 1J9"
                                            maxLength={7}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Utility Provider</label>
                                        <select
                                            value={formData.utility}
                                            onChange={(e) => updateFormData({ utility: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">Select your utility...</option>
                                            {ALBERTA_UTILITIES.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.region})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Property Type</label>
                                    <div className="flex gap-4">
                                        {['residential', 'commercial', 'farm'].map(type => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="propertyType"
                                                    value={type}
                                                    checked={formData.propertyType === type}
                                                    onChange={(e) => updateFormData({ propertyType: e.target.value })}
                                                    className="text-amber-500 focus:ring-amber-500"
                                                />
                                                <span className="text-slate-300 capitalize">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Energy Usage */}
                    {currentStep === 2 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Energy Usage</h2>
                            <p className="text-slate-400 mb-6">Help us calculate your optimal system size</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Annual Electricity Usage (kWh)
                                    </label>
                                    <div className="relative">
                                        <Zap className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input
                                            type="number"
                                            value={formData.annualKwh}
                                            onChange={(e) => updateFormData({ annualKwh: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            placeholder="e.g., 10000"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Alberta average: ~7,500 kWh/year for homes</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Average Monthly Bill ($)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <input
                                            type="number"
                                            value={formData.monthlyBill}
                                            onChange={(e) => updateFormData({ monthlyBill: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            placeholder="e.g., 150"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-900 border border-dashed border-slate-600 rounded-lg p-6 text-center">
                                    <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                                    <p className="text-slate-400 mb-2">Upload your utility bill (optional)</p>
                                    <p className="text-xs text-slate-500">We'll extract usage data automatically</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.png"
                                        className="hidden"
                                        id="bill-upload"
                                        onChange={(e) => updateFormData({ uploadedBill: e.target.files?.[0] || null })}
                                    />
                                    <label
                                        htmlFor="bill-upload"
                                        className="inline-block mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm cursor-pointer transition-colors"
                                    >
                                        Choose File
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Solar Potential */}
                    {currentStep === 3 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Solar Potential</h2>
                            <p className="text-slate-400 mb-6">Tell us about your roof</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Usable Roof Area (sq meters)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.roofArea}
                                        onChange={(e) => updateFormData({ roofArea: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                        placeholder="e.g., 50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Roof Orientation</label>
                                    <select
                                        value={formData.roofOrientation}
                                        onChange={(e) => updateFormData({ roofOrientation: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="south">South (Best)</option>
                                        <option value="southeast">Southeast</option>
                                        <option value="southwest">Southwest</option>
                                        <option value="east">East</option>
                                        <option value="west">West</option>
                                        <option value="north">North (Poor)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Shading</label>
                                    <select
                                        value={formData.shading}
                                        onChange={(e) => updateFormData({ shading: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="none">No shading</option>
                                        <option value="light">Light (trees nearby)</option>
                                        <option value="moderate">Moderate (partial shade)</option>
                                        <option value="heavy">Heavy (significant obstruction)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Compliance Check */}
                    {currentStep === 4 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Compliance Check</h2>
                            <p className="text-slate-400 mb-6">Verify your Micro-generation eligibility</p>

                            {/* Calculation Results */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                                    <Sun className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{formData.estimatedCapacity} kW</div>
                                    <div className="text-sm text-slate-400">Recommended System Size</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                                    <Zap className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{calculations.annualGeneration.toLocaleString()} kWh</div>
                                    <div className="text-sm text-slate-400">Annual Generation</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                                    <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">${calculations.estimatedSavings.toLocaleString()}</div>
                                    <div className="text-sm text-slate-400">Annual Savings</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
                                    <Leaf className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-white">{calculations.co2Offset} tonnes</div>
                                    <div className="text-sm text-slate-400">CO₂ Offset/Year</div>
                                </div>
                            </div>

                            {/* System Size Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Proposed System Size (kW) – adjust if needed
                                </label>
                                <input
                                    type="number"
                                    value={formData.systemSize || formData.estimatedCapacity}
                                    onChange={(e) => updateFormData({ systemSize: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            {/* Compliance Status */}
                            <div className={`p-4 rounded-lg border ${formData.isCompliant
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-amber-500/10 border-amber-500/30'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {formData.isCompliant ? (
                                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-amber-400" />
                                    )}
                                    <span className={`font-medium ${formData.isCompliant ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {formData.isCompliant ? 'Eligible for Micro-generation' : 'Review Required'}
                                    </span>
                                </div>
                                {formData.complianceIssues.length > 0 && (
                                    <ul className="text-sm text-slate-400 list-disc list-inside">
                                        {formData.complianceIssues.map((issue, i) => (
                                            <li key={i}>{issue}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Generate Documents */}
                    {currentStep === 5 && (
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Your Permit Package</h2>
                            <p className="text-slate-400 mb-6">Download your ready-to-submit documents</p>

                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-6">
                                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-white text-center mb-2">
                                    Analysis Complete!
                                </h3>
                                <p className="text-slate-400 text-center">
                                    Your {formData.estimatedCapacity} kW system will generate {calculations.annualGeneration.toLocaleString()} kWh/year,
                                    saving ~${calculations.estimatedSavings}/year and offsetting {calculations.co2Offset} tonnes of CO₂.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-amber-400" />
                                        <div>
                                            <div className="text-white font-medium">AUC Form A (Pre-filled)</div>
                                            <div className="text-xs text-slate-500">Micro-generation interconnection application</div>
                                        </div>
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Home className="h-5 w-5 text-amber-400" />
                                        <div>
                                            <div className="text-white font-medium">Site Plan Template</div>
                                            <div className="text-xs text-slate-500">Property layout with panel locations</div>
                                        </div>
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Zap className="h-5 w-5 text-amber-400" />
                                        <div>
                                            <div className="text-white font-medium">Single-Line Diagram</div>
                                            <div className="text-xs text-slate-500">Electrical connection schematic</div>
                                        </div>
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                <button
                                    onClick={generatePermitPack}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    <Download className="h-5 w-5" />
                                    Download Complete Permit Package (5-page PDF)
                                </button>
                                
                                <button
                                    onClick={generateAUCFormOnly}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    <FileText className="h-5 w-5" />
                                    Download AUC Form A Only
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 text-center mt-4">
                                Documents include pre-filled AUC Form A, site plan template, system summary, and installation checklist.
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Continue
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <Link
                                to="/for-employers"
                                className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Learn About the Builder
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="py-8 px-6 border-t border-slate-800">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                        ← Back to Dashboard
                    </Link>
                    <div className="text-xs text-slate-500">
                        Based on Alberta Micro-generation Regulation and AUC Rule 007
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MicroGenWizard;
