/**
 * Certificate module content: Policy & Regulatory Compliance track (part 2)
 *
 * Split from src/lib/moduleContent.ts (F-11 / CODE-4 god-object refactor).
 * Module entries are verbatim slices of the original file.
 */
import type { Module } from './types';
export const POLICY_PERMITTING_MODULES: Module[] = [
  {
    id: 'policy-004',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Carbon Credit Calculator',
    description:
      'Calculate offset project eligibility, credit generation, and compliance strategies for Alberta TIER and federal OBPS.',
    sequence_number: 4,
    duration_minutes: 30,
    content_type: 'interactive',
    content_data: {
      tool: 'calculator',
      title: 'Carbon Offset & Credit Calculator',
      description:
        'Model offset project economics and compliance strategies under Alberta TIER and federal OBPS.',
      parameters: {
        inputs: [
          {
            name: 'facilityEmissions',
            label: 'Annual Facility Emissions (tonnes CO2e)',
            type: 'number',
            default: 75000,
          },
          {
            name: 'productionOutput',
            label: 'Annual Production Output (units)',
            type: 'number',
            default: 100000,
          },
          {
            name: 'offsetProject',
            label: 'Offset Project Type',
            type: 'select',
            options: ['none', 'solar', 'wind', 'forestry', 'methane'],
            default: 'none',
          },
          {
            name: 'offsetReduction',
            label: 'Estimated Offset Reduction (tonnes CO2e)',
            type: 'number',
            default: 5000,
          },
          {
            name: 'carbonPrice',
            label: 'Carbon Credit Price ($/tonne)',
            type: 'number',
            default: 65,
          },
        ],
        calculations: {
          emissionsIntensity: 'facilityEmissions / productionOutput',
          benchmarkIntensity: '0.60', // Example benchmark
          excessEmissions: 'max(0, facilityEmissions - (benchmarkIntensity * productionOutput))',
          complianceCost: 'excessEmissions * carbonPrice',
          offsetValue: 'offsetReduction * carbonPrice',
          netCost: 'complianceCost - offsetValue',
        },
      },
    },
    learning_objectives: [
      'Calculate emissions intensity for OBPS/TIER compliance',
      'Determine offset project eligibility',
      'Model carbon credit economics',
      'Compare compliance strategies (pay, reduce, offset)',
      'Understand performance benchmarks and credit mechanisms',
    ],
    prerequisites: ['policy-001', 'policy-002', 'policy-003'],
  },
  {
    id: 'policy-005',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Project Permitting Roadmap',
    description:
      'Navigate multi-jurisdictional approvals, timelines, and stakeholder engagement for energy projects.',
    sequence_number: 5,
    duration_minutes: 45,
    content_type: 'reading',
    content_data: {
      content: `# Project Permitting Roadmap for Energy Projects in Canada

## Introduction

Navigating Canada's complex regulatory landscape requires strategic planning. Major energy projects face 15-30 distinct approval requirements across federal, provincial, and municipal jurisdictions.

**This module provides**: A step-by-step roadmap, timeline estimates, and stakeholder engagement strategies.

## Pre-Application Phase (12-36 months)

### Step 1: Regulatory Scoping (Months 1-3)

**Objective**: Identify all required approvals and establish timelines.

**Key Activities**:
1. **Jurisdictional analysis**:
   - Federal triggers (interprovincial, offshore, federal lands)
   - Provincial permits (development, environment, utilities)
   - Municipal zoning and land use

2. **Create approval matrix**:
   - List all permits required
   - Identify lead agencies
   - Map dependencies (which approvals require others first)
   - Estimate timelines

**Example - Solar Farm (Alberta)**:
- AUC approval for connection (6-12 months)
- AER approval if on Crown land (3-6 months)
- Municipal development permit (2-4 months)
- Federal IA (if >200 MW on federal lands, 18-24 months)

### Step 2: Baseline Studies (Months 3-24)

**Environmental Baseline** (12-24 months):
- Air quality monitoring (4 seasons minimum)
- Water quality sampling (spring, summer, fall, winter)
- Wildlife surveys (breeding bird surveys, ungulate surveys)
- Vegetation inventory
- Soil sampling

**Socio-Economic Baseline** (6-12 months):
- Employment and income data
- Traditional land use studies (Indigenous consultation)
- Cultural and heritage resource assessments
- Visual impact assessments

**Cost**: $500K - $5M depending on project scope

### Step 3: Early Engagement (Months 1-36)

**Indigenous Communities** (Start immediately):
- Identify affected First Nations, Métis, Inuit communities
- Initial notification letters
- Capacity funding for community review
- Traditional Knowledge studies
- Ongoing dialogue (monthly meetings)

**Stakeholders**:
- Landowners (lease negotiations, easements)
- Adjacent industries
- Municipal councils
- Environmental groups
- Industry associations

**Public**:
- Project website with updates
- Community open houses (3-5 events)
- Comment periods and feedback mechanisms

**Timeline**: Minimum 12 months before application; ongoing through project life

## Application Phase (6-18 months)

### Step 4: Application Preparation (Months 24-30)

**Federal Impact Assessment** (if required):
- Initial Project Description (3 months to prepare)
- Detailed Impact Statement (6-12 months to prepare)
  * Description of project
  * Alternatives considered
  * Environmental effects assessment
  * Mitigation measures
  * Follow-up and monitoring program
  * Indigenous consultation record

**Provincial Applications**:
- Development application (AER, AUC, etc.)
- Water licenses
- Air emissions approvals
- Wildlife permits
- Archaeological permits

**Cost**: $1M - $10M for major projects (consultants, studies, legal)

### Step 5: Application Submission & Review (Months 30-48)

**Timelines by Jurisdiction**:

**Federal (Impact Assessment)**:
- Screening: 90 days (can be extended)
- Impact Statement: 300 days (can pause for info requests)
- Decision: Up to 90 days post-report
- **Total**: 18-36 months

**Alberta (AUC for power projects)**:
- Application filing
- Completeness check: 30 days
- Public notice period: 30 days
- Information requests: 2-4 rounds
- Hearing (if required): 3-6 months
- Decision: 90 days post-hearing
- **Total**: 9-18 months

**British Columbia (EAO)**:
- Pre-application: 6-12 months
- Application: 180 days (can suspend for more info)
- Minister's decision: 60 days
- **Total**: 12-24 months

### Step 6: Information Requests & Deficiency Response

**Expect 2-5 rounds of IRs**:
- Regulatory questions
- Indigenous concerns
- Public comments
- Technical clarifications

**Response times**: 30-90 days per round

**Strategy**:
- Anticipate common questions
- Pre-file technical memos
- Maintain open dialogue with regulators

## Approval & Conditions Phase (Months 48-60)

### Step 7: Decision & Conditions

**Typical Approval Conditions**:
- Environmental monitoring (air, water, wildlife)
- Adaptive management triggers
- Reporting requirements (annual, incidents)
- Financial assurances (reclamation bonds)
- Indigenous monitoring participation
- Wildlife mitigation (timing windows, buffers)

**Appeals Period**:
- Federal: No direct appeal of IA decision (judicial review only)
- Provincial: 30 days (Alberta AUC), varies by jurisdiction

### Step 8: Pre-Construction Compliance

**Before breaking ground**:
✓ All regulatory conditions met
✓ Financial assurances posted
✓ Environmental monitors retained
✓ Contractor environmental training
✓ Emergency response plans filed
✓ Indigenous monitors engaged (if required)

## Construction & Operations Phase

### Ongoing Compliance

**Monitoring & Reporting**:
- Environmental monitoring (quarterly, annual)
- Incident reporting (24-hour for significant events)
- Compliance audits (regulatory inspections)
- Annual reports to regulators

**Adaptive Management**:
- Thresholds exceeded → Trigger mitigation
- Example: Bird mortality > threshold → Enhanced deterrents

**Stakeholder Relations**:
- Community liaison committee (quarterly meetings)
- Indigenous working groups
- Complaint hotline and response protocol

## Timeline Summary

**Typical Major Energy Project** (e.g., 500 MW wind farm, interprovincial pipeline):

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| Pre-Application | 24-36 months | Baseline studies, engagement, scoping |
| Application Prep | 6-12 months | IA/EA preparation, technical studies |
| Regulatory Review | 18-36 months | Federal IA, provincial approvals |
| Decision & Appeals | 3-6 months | Conditions, financial assurances |
| **TOTAL** | **51-90 months** | **4-7.5 years pre-construction** |

**Construction**: 12-36 months

**Total Project Timeline**: **5-10 years** from concept to operations

## Common Delays & How to Avoid Them

### Delay #1: Inadequate Indigenous Consultation
**Impact**: 6-24 month delay, potential court challenges
**Avoidance**:
- Start engagement 24-36 months pre-application
- Provide capacity funding
- Co-develop monitoring programs
- Negotiate IBAs early

### Delay #2: Incomplete Baseline Data
**Impact**: 6-12 month delay for additional studies
**Avoidance**:
- Commission baseline studies 24 months before application
- Ensure 4-season coverage
- Use experienced consultants
- Pre-consult with regulators on scope

### Delay #3: Public Opposition
**Impact**: 6-18 month delay from hearings, protests
**Avoidance**:
- Early and ongoing public engagement
- Transparent communication (project website, newsletters)
- Address concerns proactively
- Demonstrate environmental responsibility

### Delay #4: Information Request Cycles
**Impact**: 3-9 months (multiple IR rounds)
**Avoidance**:
- Anticipate questions, file technical memos
- Maintain regular dialogue with regulators
- Respond fully and quickly (don't trigger follow-ups)

### Delay #5: Cumulative Effects Assessment
**Impact**: 12-24 months for additional analysis
**Avoidance**:
- Assess cumulative effects from Day 1
- Consider all existing and reasonably foreseeable projects
- Regional cooperation (share data with other proponents)

## Case Studies

### Case Study 1: Trans Mountain Pipeline Expansion
**Timeline**:
- Application: 2013
- Initial approval: 2016 (Federal Cabinet)
- Federal Court quashed: 2018 (inadequate Indigenous consultation)
- Re-review and approval: 2019
- Construction start: 2019
- **Total**: 6 years pre-construction

**Lessons**:
- Inadequate initial Indigenous consultation = major delay
- Court challenges can add years
- Political risk for controversial projects

### Case Study 2: Travers Solar Project (Alberta, 465 MW)
**Timeline**:
- Application: 2019
- AUC approval: 2020
- Construction: 2021-2023
- **Total**: ~2 years pre-construction

**Lessons**:
- Solar projects in Alberta face streamlined approval (no federal IA)
- Early landowner engagement critical
- Municipal support speeds zoning approvals

## Best Practices Checklist

**Before Application**:
✓ Regulatory roadmap with all approvals identified
✓ 24 months of baseline environmental data
✓ Indigenous engagement well underway (12+ months)
✓ Public consultation plan implemented
✓ Alternatives analysis completed
✓ Project design optimized for environmental performance

**During Review**:
✓ Dedicated regulatory team (internal + consultants)
✓ Rapid response to IRs (< 30 days)
✓ Transparent communication with all stakeholders
✓ Adaptive project design (respond to feedback)
✓ Legal counsel reviewing conditions and risks

**Post-Approval**:
✓ Conditions tracking system (software or spreadsheet)
✓ Environmental monitoring programs operational
✓ Stakeholder relations ongoing
✓ Compliance audits (internal, before regulatory inspections)

## Tools & Resources

**Regulatory Portals**:
- Canadian Impact Assessment Registry: iaac-aeic.gc.ca
- Alberta One Stop: osportal.alberta.ca
- BC EAO Project Information Centre: projects.eao.gov.bc.ca

**Guidance Documents**:
- NRCan: Guide to Impact Assessment
- Alberta AER: Directive 056 (Energy Development Applications)
- CER: Filing Manual (Pipelines and Facilities)

## Action Items

After completing this module:
✓ Draft regulatory roadmap for a sample project in your sector
✓ Estimate total timeline from concept to construction
✓ Identify Indigenous communities to engage
✓ Calculate estimated permitting costs
✓ Review recent case law for similar projects

---

**Certificate Completion**: After mastering the permitting roadmap, you'll receive the **Policy & Regulatory Compliance Certificate** and unlock the **Regulatory Expert** badge (Gold tier, +300 points).
`,
      estimatedReadTime: 35,
    },
    learning_objectives: [
      'Create multi-jurisdictional approval matrix',
      'Estimate realistic project timelines (5-10 years typical)',
      'Design early Indigenous engagement strategy',
      'Identify common delay causes and mitigation',
      'Navigate federal IA and provincial EA processes',
    ],
    prerequisites: ['policy-001', 'policy-002', 'policy-003', 'policy-004'],
  },
];
