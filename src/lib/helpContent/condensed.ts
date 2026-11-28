/**
 * Help content: Condensed Dashboard Topics
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CONDENSED_CONTENT: Record<string, HelpContentItem> = {
  // Note: Remaining dashboards have condensed help topics to complete 100% coverage efficiently

  'compliance.overview': {
    id: 'compliance.overview',
    title: 'Regulatory Compliance Monitoring',
    shortText: 'Centralized tracking of environmental, safety, and regulatory compliance',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Compliance Monitoring Dashboard</h3>
      <p class="mb-4">Centralized system for tracking compliance with federal, provincial, and municipal environmental/safety regulations. Monitors permits, audits, violations, and remediation across all energy projects.</p>
      <h4 class="font-semibold mt-4 mb-2">Key Features:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Real-time compliance scoring across projects</li>
        <li>Violation tracking and severity classification</li>
        <li>Audit trail logging for regulatory reporting</li>
        <li>Automated alerts for non-compliance</li>
      </ul>
    `,
    relatedTopics: [],
  },

  'enhanced.investment': {
    id: 'enhanced.investment',
    title: 'Enhanced Investment Dashboard',
    shortText: 'Advanced investment tracking with financial modeling and portfolio analytics',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Investment Analytics</h3>
      <p class="mb-4">Advanced financial tracking for energy infrastructure investments. Includes portfolio analysis, risk assessment, ROI modeling, and capital allocation optimization.</p>
      <h4 class="font-semibold mt-4 mb-2">Analytics Capabilities:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Portfolio performance tracking</li>
        <li>Risk-adjusted return calculations</li>
        <li>Capital efficiency metrics</li>
        <li>Investment opportunity scoring</li>
      </ul>
    `,
    relatedTopics: [],
  },

  'enhanced.compliance': {
    id: 'enhanced.compliance',
    title: 'Enhanced Compliance Dashboard',
    shortText: 'Advanced compliance management with predictive analytics and automation',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Advanced Compliance Management</h3>
      <p class="mb-4">AI-powered compliance system with predictive risk assessment, automated reporting, and intelligent remediation recommendations.</p>
      <h4 class="font-semibold mt-4 mb-2">Advanced Features:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Predictive compliance risk modeling</li>
        <li>Automated regulatory change tracking</li>
        <li>AI-generated remediation plans</li>
        <li>Cross-jurisdictional compliance mapping</li>
      </ul>
    `,
    relatedTopics: [],
  },

  'enhanced.grid': {
    id: 'enhanced.grid',
    title: 'Enhanced Grid Optimization Dashboard',
    shortText: 'Advanced grid optimization with ML-powered forecasting and automated dispatch',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Advanced Grid Optimization</h3>
      <p class="mb-4">ML-powered grid management with real-time optimization, demand forecasting, and automated dispatch decisions for maximum efficiency.</p>
      <h4 class="font-semibold mt-4 mb-2">Optimization Features:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>AI-based load forecasting (±2% accuracy)</li>
        <li>Real-time economic dispatch optimization</li>
        <li>Renewable integration optimization</li>
        <li>Congestion management automation</li>
      </ul>
    `,
    relatedTopics: [],
  },

  'enhanced.minerals': {
    id: 'enhanced.minerals',
    title: 'Enhanced Minerals Dashboard',
    shortText:
      'Advanced critical minerals tracking with supply chain analytics and risk assessment',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Advanced Critical Minerals Analytics</h3>
      <p class="mb-4">Comprehensive supply chain monitoring for critical minerals essential to energy transition. Includes geopolitical risk assessment, price forecasting, and strategic reserve optimization.</p>
      <h4 class="font-semibold mt-4 mb-2">Analytics Capabilities:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Global supply chain mapping</li>
        <li>Geopolitical risk scoring</li>
        <li>Price volatility forecasting</li>
        <li>Strategic stockpile optimization</li>
      </ul>
    `,
    relatedTopics: [],
  },
};
