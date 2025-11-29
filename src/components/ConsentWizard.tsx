/**
 * ConsentWizard Component
 * 
 * Multi-step FPIC/OCAP® consent wizard for Indigenous data governance.
 * Addresses Gap #2: Data Governance & FPIC Consent (HIGH Priority)
 * 
 * Usage:
 * <ConsentWizard
 *   onComplete={(consent) => handleConsentGranted(consent)}
 *   onCancel={() => setShowWizard(false)}
 * />
 */

import React, { useState } from 'react';
import {
  Shield,
  Users,
  Eye,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ExternalLink,
  X
} from 'lucide-react';
import { logConsentGranted, CURRENT_CONSENT_VERSION } from '../lib/consentAuditLog';

export interface ConsentData {
  fpicAccepted: boolean;
  ocapAccepted: boolean;
  dataVisibility: 'public' | 'ice_network' | 'private';
  dataOwnerName: string;
  dataOwnerEmail: string;
  consentAuthority: string;
  expiresAt?: string;
  acknowledgedTerms: boolean;
  consentVersion: string;
  grantedAt: string;
}

interface ConsentWizardProps {
  /** Called when consent is fully granted */
  onComplete: (consent: ConsentData) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Entity ID for audit logging */
  entityId?: string;
  /** Entity type for audit logging */
  entityType?: 'indigenous_project' | 'tek_entry' | 'territory';
  /** User ID for audit logging */
  userId?: string;
  /** Pre-fill data owner info */
  defaultDataOwner?: {
    name: string;
    email: string;
  };
}

const STEPS = [
  { id: 'fpic', title: 'FPIC Consent', icon: Shield },
  { id: 'ocap', title: 'OCAP® Principles', icon: Users },
  { id: 'visibility', title: 'Data Visibility', icon: Eye },
  { id: 'confirm', title: 'Confirmation', icon: FileText }
];

export function ConsentWizard({
  onComplete,
  onCancel,
  entityId = 'new',
  entityType = 'indigenous_project',
  userId = 'anonymous',
  defaultDataOwner
}: ConsentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [consent, setConsent] = useState<Partial<ConsentData>>({
    fpicAccepted: false,
    ocapAccepted: false,
    dataVisibility: 'private',
    dataOwnerName: defaultDataOwner?.name || '',
    dataOwnerEmail: defaultDataOwner?.email || '',
    consentAuthority: '',
    acknowledgedTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // FPIC
        if (!consent.fpicAccepted) {
          newErrors.fpic = 'You must acknowledge FPIC principles to continue';
        }
        break;
      case 1: // OCAP
        if (!consent.ocapAccepted) {
          newErrors.ocap = 'You must acknowledge OCAP® principles to continue';
        }
        break;
      case 2: // Visibility
        if (!consent.dataOwnerName?.trim()) {
          newErrors.dataOwnerName = 'Data owner name is required';
        }
        if (!consent.dataOwnerEmail?.trim()) {
          newErrors.dataOwnerEmail = 'Data owner email is required';
        }
        break;
      case 3: // Confirm
        if (!consent.acknowledgedTerms) {
          newErrors.terms = 'You must acknowledge the terms to complete';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    const finalConsent: ConsentData = {
      fpicAccepted: consent.fpicAccepted!,
      ocapAccepted: consent.ocapAccepted!,
      dataVisibility: consent.dataVisibility!,
      dataOwnerName: consent.dataOwnerName!,
      dataOwnerEmail: consent.dataOwnerEmail!,
      consentAuthority: consent.consentAuthority || '',
      expiresAt: consent.expiresAt,
      acknowledgedTerms: consent.acknowledgedTerms!,
      consentVersion: CURRENT_CONSENT_VERSION,
      grantedAt: new Date().toISOString()
    };

    // Log consent to audit trail
    await logConsentGranted(userId, entityType, entityId, {
      consentType: 'fpic_ocap',
      authority: finalConsent.consentAuthority,
      expiresAt: finalConsent.expiresAt
    });

    onComplete(finalConsent);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // FPIC
        return (
          <div className="space-y-6">
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-300">
                    Free, Prior and Informed Consent (FPIC)
                  </h4>
                  <p className="text-sm text-amber-200/80 mt-1">
                    FPIC is a fundamental right of Indigenous peoples under UNDRIP. By proceeding,
                    you acknowledge that:
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Consent must be given <strong>freely</strong>, without coercion or manipulation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Consent must be obtained <strong>prior</strong> to any activities affecting
                  Indigenous rights
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Communities must receive <strong>full information</strong> about proposed
                  activities
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Consent can be <strong>withdrawn at any time</strong>
                </span>
              </li>
            </ul>

            <a
              href="https://www.un.org/development/desa/indigenouspeoples/declaration-on-the-rights-of-indigenous-peoples.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              Read UN Declaration on the Rights of Indigenous Peoples
              <ExternalLink className="h-3 w-3" />
            </a>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer border border-slate-600 hover:border-slate-500">
              <input
                type="checkbox"
                checked={consent.fpicAccepted}
                onChange={(e) => setConsent({ ...consent, fpicAccepted: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-200">
                I acknowledge and commit to upholding FPIC principles in all data collection and
                sharing activities.
              </span>
            </label>
            {errors.fpic && <p className="text-red-400 text-sm">{errors.fpic}</p>}
          </div>
        );

      case 1: // OCAP
        return (
          <div className="space-y-6">
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-purple-300">OCAP® Principles</h4>
                  <p className="text-sm text-purple-200/80 mt-1">
                    OCAP® stands for Ownership, Control, Access, and Possession. These principles
                    assert that Indigenous communities have the right to:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h5 className="font-medium text-slate-200 mb-2">Ownership</h5>
                <p className="text-sm text-slate-400">
                  Communities own their cultural knowledge and data collectively.
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h5 className="font-medium text-slate-200 mb-2">Control</h5>
                <p className="text-sm text-slate-400">
                  Communities control how their data is collected, used, and disclosed.
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h5 className="font-medium text-slate-200 mb-2">Access</h5>
                <p className="text-sm text-slate-400">
                  Communities decide who can access their information and under what conditions.
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <h5 className="font-medium text-slate-200 mb-2">Possession</h5>
                <p className="text-sm text-slate-400">
                  Data should be physically stored within community control.
                </p>
              </div>
            </div>

            <a
              href="https://fnigc.ca/ocap-training/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              Learn more about OCAP® from FNIGC
              <ExternalLink className="h-3 w-3" />
            </a>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer border border-slate-600 hover:border-slate-500">
              <input
                type="checkbox"
                checked={consent.ocapAccepted}
                onChange={(e) => setConsent({ ...consent, ocapAccepted: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-200">
                I acknowledge and commit to upholding OCAP® principles. The community retains
                ownership and can request data deletion at any time.
              </span>
            </label>
            {errors.ocap && <p className="text-red-400 text-sm">{errors.ocap}</p>}
          </div>
        );

      case 2: // Visibility
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Visibility <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                {[
                  {
                    value: 'private' as const,
                    label: 'Private',
                    desc: 'Only you and authorized community members can view',
                    icon: '🔒'
                  },
                  {
                    value: 'ice_network' as const,
                    label: 'ICE Network Only',
                    desc: 'Visible to verified Indigenous Clean Energy network members',
                    icon: '👥'
                  },
                  {
                    value: 'public' as const,
                    label: 'Public',
                    desc: 'Anyone can view (ideal for showcasing successful projects)',
                    icon: '🌍'
                  }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors ${
                      consent.dataVisibility === option.value
                        ? 'bg-blue-900/30 border-blue-500'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={consent.dataVisibility === option.value}
                      onChange={() => setConsent({ ...consent, dataVisibility: option.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span className="font-medium text-slate-200">{option.label}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data Owner Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={consent.dataOwnerName}
                  onChange={(e) => setConsent({ ...consent, dataOwnerName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Chief Council Representative"
                />
                {errors.dataOwnerName && (
                  <p className="text-red-400 text-sm mt-1">{errors.dataOwnerName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data Owner Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={consent.dataOwnerEmail}
                  onChange={(e) => setConsent({ ...consent, dataOwnerEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="email@community.ca"
                />
                {errors.dataOwnerEmail && (
                  <p className="text-red-400 text-sm mt-1">{errors.dataOwnerEmail}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Consent Authority (Optional)
              </label>
              <input
                type="text"
                value={consent.consentAuthority}
                onChange={(e) => setConsent({ ...consent, consentAuthority: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Band Council Resolution #2025-01"
              />
            </div>
          </div>
        );

      case 3: // Confirm
        return (
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h4 className="font-medium text-slate-200 mb-3">Consent Summary</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">FPIC Acknowledged:</dt>
                  <dd className="text-emerald-400">
                    {consent.fpicAccepted ? '✓ Yes' : '✗ No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">OCAP® Acknowledged:</dt>
                  <dd className="text-emerald-400">
                    {consent.ocapAccepted ? '✓ Yes' : '✗ No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Data Visibility:</dt>
                  <dd className="text-slate-200 capitalize">{consent.dataVisibility}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Data Owner:</dt>
                  <dd className="text-slate-200">{consent.dataOwnerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Contact Email:</dt>
                  <dd className="text-slate-200">{consent.dataOwnerEmail}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Consent Version:</dt>
                  <dd className="text-slate-200">{CURRENT_CONSENT_VERSION}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                <strong>Your Rights:</strong> You can withdraw consent at any time by contacting
                the platform administrators. All data associated with this consent will be
                soft-deleted and an audit record will be maintained.
              </p>
            </div>

            <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer border border-slate-600 hover:border-slate-500">
              <input
                type="checkbox"
                checked={consent.acknowledgedTerms}
                onChange={(e) => setConsent({ ...consent, acknowledgedTerms: e.target.checked })}
                className="mt-0.5 h-5 w-5 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-slate-200">
                I confirm that I have the authority to grant this consent on behalf of the
                community, and I understand that this action will be logged for audit purposes.
              </span>
            </label>
            {errors.terms && <p className="text-red-400 text-sm">{errors.terms}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Data Governance Consent</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900/50 border-b border-slate-700">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    isActive
                      ? 'border-blue-400 bg-blue-400/20'
                      : isCompleted
                      ? 'border-emerald-400 bg-emerald-400/20'
                      : 'border-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-900/50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
            >
              <Check className="h-4 w-4" />
              Grant Consent
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
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

export default ConsentWizard;
