/**
 * Help content: CER Compliance Dashboard
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CER_CONTENT: Record<string, HelpContentItem> = {
  // ========================================
  // CER Compliance Dashboard Topics
  // ========================================

  'cer.overview': {
    id: 'cer.overview',
    title: 'CER Compliance Dashboard',
    shortText:
      'Canada Energy Regulator compliance monitoring for pipelines, power lines, and energy facilities',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada Energy Regulator (CER) Oversight</h3>
      <p class="mb-4">The Canada Energy Regulator (CER) regulates international and interprovincial pipelines, power lines, and offshore renewable energy projects. CER ensures safe, secure, efficient energy infrastructure while protecting the environment and respecting Indigenous rights. This dashboard tracks compliance with CER regulations across ~1,100 regulated facilities.</p>

      <h4 class="font-semibold mt-4 mb-2">Key CER Regulations:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Canadian Energy Regulator Act (2019):</strong> Replaced National Energy Board Act. Lifecycle regulation of energy infrastructure.</li>
        <li><strong>Onshore Pipeline Regulations:</strong> Design, construction, operation, abandonment standards. CSA Z662 compliance mandatory.</li>
        <li><strong>Pipeline Damage Prevention Regulations:</strong> Ground disturbance notification, locate requirements within control zone (30m).</li>
        <li><strong>Environmental Protection:</strong> Spill prevention, emergency response plans, habitat protection, indigenous consultation.</li>
        <li><strong>Safety Management:</strong> Safety culture, incident reporting (within 24 hours), root cause analysis, corrective actions.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Compliance Statistics (2023):</strong> CER conducted 450+ inspections, 85+ audits across regulated facilities. Compliance rate: 94% (up from 91% in 2020). 127 enforcement actions issued: 89 warnings, 32 compliance orders, 6 administrative monetary penalties (total $2.1M). Zero catastrophic incidents on CER-regulated infrastructure.</p>
      </div>
    `,
    relatedTopics: ['cer.facilities', 'cer.violations', 'cer.inspections'],
  },

  'cer.facilities': {
    id: 'cer.facilities',
    title: 'Facility Compliance Tracking',
    shortText: 'Monitoring compliance status across pipelines, power lines, and processing plants',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Facility-Level Compliance</h3>
      <p class="mb-4">Each CER-regulated facility undergoes regular inspections, audits, and performance monitoring. Compliance status reflects adherence to CER conditions, environmental commitments, safety standards, and indigenous engagement obligations.</p>

      <h4 class="font-semibold mt-4 mb-2">Compliance Status Categories:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong class="text-green-600">Compliant:</strong> Meeting all CER conditions and regulations. Routine monitoring, scheduled inspections.</li>
        <li><strong class="text-yellow-600">Under Review:</strong> Recent inspection findings being assessed. CER reviewing operator response.</li>
        <li><strong class="text-orange-600">Conditional:</strong> Operating with specific CER-imposed conditions. Must meet deadlines or face shutdown.</li>
        <li><strong class="text-red-600">Non-Compliant:</strong> Violations of CER regulations. Enforcement action: compliance order, AMP, or suspension.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Inspection Program Types:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Routine Inspections:</strong> Annual or biennial. Covers operations, maintenance, safety management.</li>
        <li><strong>Focused Inspections:</strong> Target specific issues (corrosion, leak detection, environmental compliance).</li>
        <li><strong>Surprise Inspections:</strong> No advance notice. Used when CER suspects non-compliance.</li>
        <li><strong>Comprehensive Audits:</strong> Multi-year review (every 3-5 years). 6-12 month process.</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Example - Trans Mountain Pipeline:</strong> 2023 comprehensive audit reviewed 1,150 km system across BC/AB. Findings: 12 recommendations (all low/medium severity). Operator responded with 18-month corrective action plan. Status: Under review. Expected resolution Q2 2025.</p>
      </div>
    `,
    relatedTopics: ['cer.overview', 'cer.violations', 'cer.inspections'],
  },

  'cer.violations': {
    id: 'cer.violations',
    title: 'Violations & Enforcement',
    shortText: 'Tracking non-compliance incidents, severity levels, and CER enforcement actions',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Violations and Enforcement Actions</h3>
      <p class="mb-4">CER violations range from minor administrative oversights to serious safety/environmental breaches. Enforcement approach is progressive: education first, escalating to warnings, compliance orders, administrative monetary penalties (AMPs), and ultimately facility shutdown for persistent/critical violations.</p>

      <h4 class="font-semibold mt-4 mb-2">Violation Severity Levels:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong class="text-blue-600">Low:</strong> Late report submission, minor documentation gaps → Warning letter</li>
        <li><strong class="text-yellow-600">Medium:</strong> Incomplete safety procedures, missed inspections → Compliance order required</li>
        <li><strong class="text-orange-600">High:</strong> Unauthorized ground disturbance, inadequate spill response → AMP $10k-100k</li>
        <li><strong class="text-red-600">Critical:</strong> Major spill, pipeline rupture, fatality → AMP $100k-1M, suspension/shutdown</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Common Violation Types:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Integrity Management (35%):</strong> Inadequate corrosion monitoring, missed in-line inspections</li>
        <li><strong>Environmental (25%):</strong> Spills/leaks, erosion/sedimentation, wildlife habitat damage</li>
        <li><strong>Safety Management (20%):</strong> Incomplete emergency response plans, insufficient training</li>
        <li><strong>Damage Prevention (10%):</strong> Improper crossing agreements, inadequate ground disturbance notification</li>
        <li><strong>Reporting/Documentation (10%):</strong> Late/incomplete reports, missing records</li>
      </ul>

      <div class="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Notable Case - 2022 Pipeline Spill:</strong> Operator failed to detect 100,000L crude oil leak for 14 hours due to inadequate leak detection system. Enforcement: $400k AMP + mandatory SCADA upgrade ($2M) + enhanced monitoring for 2 years.</p>
      </div>
    `,
    relatedTopics: ['cer.overview', 'cer.facilities', 'cer.inspections'],
  },

  'cer.inspections': {
    id: 'cer.inspections',
    title: 'Inspection Process & Timelines',
    shortText:
      'Understanding CER inspection procedures, schedules, and corrective action requirements',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">CER Inspection Process</h3>
      <p class="mb-4">CER inspections verify operators comply with regulations, conditions, and safety/environmental commitments. Inspection frequency depends on facility risk profile, compliance history, and public concern. Process is transparent - inspection reports publicly available on CER website.</p>

      <h4 class="font-semibold mt-4 mb-2">Typical Inspection Timeline:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Planning (30-60 days):</strong> Scope definition, notification to operator, document requests</li>
        <li><strong>Fieldwork (3-10 days):</strong> Site visit, interviews, record review, physical inspection</li>
        <li><strong>Analysis (30-90 days):</strong> Findings assessment, legal review, draft report preparation</li>
        <li><strong>Operator Response (30-60 days):</strong> Review draft, provide corrective action plan</li>
        <li><strong>Final Report (15-30 days):</strong> CER finalizes report, publishes on website</li>
        <li><strong>Verification (6-24 months):</strong> CER verifies corrective actions implemented effectively</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Corrective Action Requirements:</h4>
      <ol class="list-decimal pl-5 space-y-1 mb-4">
        <li><strong>Immediate Actions (0-7 days):</strong> Address critical safety/environmental issues</li>
        <li><strong>Root Cause Analysis (30 days):</strong> Determine why non-compliance occurred</li>
        <li><strong>Corrective Action Plan (60 days):</strong> Detailed plan with timelines, resources, responsible parties</li>
        <li><strong>Implementation (6-24 months):</strong> Execute corrective actions per approved plan</li>
        <li><strong>Verification:</strong> CER verifies effectiveness through follow-up inspections</li>
      </ol>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Inspection Frequency by Risk:</strong> High-risk facilities (major transmission pipelines, LNG terminals): Annual. Medium-risk: Every 2-3 years. Low-risk: Every 5 years or complaint-driven. Plus: All facilities subject to surprise inspections and incident investigations as needed.</p>
      </div>
    `,
    relatedTopics: ['cer.overview', 'cer.facilities', 'cer.violations'],
  },
};
