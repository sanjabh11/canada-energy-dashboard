/**
 * Household Onboarding Flow
 * 5-minute setup wizard for household energy profile
 */

import React, { useState } from 'react';
import { 
  Home, MapPin, Users, Ruler, Thermometer, 
  Wind, Sun, Car, Zap, CheckCircle, ArrowRight, ArrowLeft
} from 'lucide-react';
import { householdDataManager } from '../lib/householdDataManager';
import type { HouseholdProfile, Province, HomeType, HeatingType } from '../lib/types/household';

interface OnboardingProps {
  onComplete: (profile: HouseholdProfile) => void;
}

type OnboardingStep = 'welcome' | 'location' | 'home-details' | 'energy-systems' | 'usage' | 'complete';

const PROVINCES: { value: Province; label: string }[] = [
  { value: 'ON', label: 'Ontario' },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
];

const HouseholdOnboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState<Partial<HouseholdProfile>>({
    userId: `user_${Date.now()}`,
    province: 'ON',
    postalCode: '',
    homeType: 'house',
    squareFootage: 1500,
    occupants: 2,
    heatingType: 'gas',
    hasAC: false,
    hasSolar: false,
    hasEV: false,
    utilityProvider: '',
  });

  const updateFormData = (updates: Partial<HouseholdProfile>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleComplete = () => {
    const completeProfile: HouseholdProfile = {
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as HouseholdProfile;

    householdDataManager.saveProfile(completeProfile);
    householdDataManager.setOnboardingComplete();
    onComplete(completeProfile);
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'location', 'home-details', 'energy-systems', 'usage', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'location', 'home-details', 'energy-systems', 'usage', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const renderProgressBar = () => {
    const steps: OnboardingStep[] = ['welcome', 'location', 'home-details', 'energy-systems', 'usage', 'complete'];
    const currentIndex = steps.indexOf(step);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
        <div
          className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        {renderProgressBar()}

        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="mb-6">
              <Zap className="w-20 h-20 mx-auto text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to My Energy AI
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              I'm your personal energy advisor. In just 5 minutes, I'll help you:
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Understand your energy usage</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Compare to similar homes in your area</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Find ways to save money</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get personalized recommendations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Discover rebates you qualify for</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Up to $10,000+ in available programs</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                🔒 <strong>Privacy First:</strong> Your data stays on your device. We never share or sell your information.
              </p>
            </div>
            <button
              onClick={nextStep}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all inline-flex items-center gap-2"
            >
              Let's Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Location Step */}
        {step === 'location' && (
          <div>
            <div className="text-center mb-8">
              <MapPin className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Where do you live?</h2>
              <p className="text-gray-600 dark:text-gray-400">This helps us provide accurate pricing and rebate information</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Province / Territory
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => updateFormData({ province: e.target.value as Province })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {PROVINCES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData({ postalCode: e.target.value.toUpperCase() })}
                  placeholder="A1A 1A1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Utility Provider (Optional)
                </label>
                <input
                  type="text"
                  value={formData.utilityProvider}
                  onChange={(e) => updateFormData({ utilityProvider: e.target.value })}
                  placeholder="e.g., Hydro One, EPCOR, BC Hydro"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Home Details Step */}
        {step === 'home-details' && (
          <div>
            <div className="text-center mb-8">
              <Home className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tell us about your home</h2>
              <p className="text-gray-600 dark:text-gray-400">This helps us compare you to similar households</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Home Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['house', 'townhouse', 'condo', 'apartment'] as HomeType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => updateFormData({ homeType: type })}
                      className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                        formData.homeType === type
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Square Footage
                </label>
                <input
                  type="number"
                  value={formData.squareFootage}
                  onChange={(e) => updateFormData({ squareFootage: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="100"
                  max="10000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Occupants
                </label>
                <input
                  type="number"
                  value={formData.occupants}
                  onChange={(e) => updateFormData({ occupants: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="20"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Energy Systems Step */}
        {step === 'energy-systems' && (
          <div>
            <div className="text-center mb-8">
              <Thermometer className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Energy systems</h2>
              <p className="text-gray-600 dark:text-gray-400">What powers your home?</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Heating System
                </label>
                <select
                  value={formData.heatingType}
                  onChange={(e) => updateFormData({ heatingType: e.target.value as HeatingType })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="gas">Natural Gas</option>
                  <option value="electric">Electric</option>
                  <option value="oil">Oil</option>
                  <option value="heat-pump">Heat Pump</option>
                  <option value="dual">Dual System</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wind className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Air Conditioning</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Central or window AC</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAC}
                      onChange={(e) => updateFormData({ hasAC: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sun className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Solar Panels</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rooftop solar system</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasSolar}
                      onChange={(e) => updateFormData({ hasSolar: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Electric Vehicle</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Home charging</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasEV}
                      onChange={(e) => updateFormData({ hasEV: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Usage Step (Optional) */}
        {step === 'usage' && (
          <div>
            <div className="text-center mb-8">
              <Zap className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Almost done!</h2>
              <p className="text-gray-600 dark:text-gray-400">We'll analyze your profile and find savings opportunities</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg p-6 mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">What happens next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    We'll generate personalized energy-saving recommendations
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Match you to rebates and incentives worth up to $10,000+
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Compare your usage to similar homes in {PROVINCES.find(p => p.value === formData.province)?.label}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Provide a personal AI advisor you can chat with anytime
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                💡 <strong>Tip:</strong> You can add your electricity bills later for more accurate recommendations
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={() => {
                  handleComplete();
                  setStep('complete');
                }}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all inline-flex items-center justify-center gap-2"
              >
                Complete Setup
                <CheckCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              You're all set!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Your personalized energy dashboard is ready
            </p>
            <div className="animate-pulse">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Analyzing your profile...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseholdOnboarding;
