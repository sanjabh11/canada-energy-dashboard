/**
 * Whop Mini-App - Barrel Export
 * 
 * This folder contains an isolated mini-app for the Whop marketplace.
 * All components here are designed to:
 * 1. Work without external API calls
 * 2. Work without ProtectedRoute wrappers
 * 3. Parse Whop JWT tokens for auth
 * 4. Load quickly (<2MB bundle, <1.5s FCP)
 */

export { default as WhopMiniApp } from './WhopMiniApp';
export { default as WatchdogCalculator } from './WatchdogCalculator';
export { default as EnergyQuiz } from './EnergyQuiz';
export { default as EnergyTrader } from './EnergyTrader';
export { default as CertificatePreview } from './CertificatePreview';
export { default as DashboardDemo } from './DashboardDemo';
