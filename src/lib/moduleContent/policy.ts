/**
 * Track 3: Policy & Regulatory Compliance
 * Focus: Policy makers, compliance officers, consultants
 */
import type { Module } from './types';
import { POLICY_REGULATORY_MODULES } from './policyRegulatory';
import { POLICY_PERMITTING_MODULES } from './policyPermitting';

export const POLICY_MODULES: Module[] = [
  ...POLICY_REGULATORY_MODULES,
  ...POLICY_PERMITTING_MODULES,
];
