/**
 * Monetization Components
 *
 * Components for displaying feature monetization analysis, sponsor potential,
 * and Whop tier gating.
 */

export { MonetizationBadge, MonetizationTierLabel, TIER_CONFIG } from './MonetizationBadge';
export type { MonetizationBadgeProps, MonetizationTier } from './MonetizationBadge';

export { MonetizationCard } from './MonetizationCard';
export type { MonetizationCardProps, FeatureMonetization, SponsorCategory } from './MonetizationCard';

export { MonetizationReport, FEATURE_MONETIZATION_DATA } from './MonetizationReport';
export type { MonetizationReportProps } from './MonetizationReport';

// Whop Tier Gating (New - Hybrid Strategy)
export { WhopTierGate, useWhopTier, hasTierAccess, normalizeUserTier } from './WhopTierGate';
export type { WhopTier } from './WhopTierGate';
