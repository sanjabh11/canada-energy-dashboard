/**
 * Certificate module content: Policy & Regulatory Compliance track (part 1)
 *
 * Split from src/lib/moduleContent.ts (F-11 / CODE-4 god-object refactor).
 * Module entries are verbatim slices of the original file.
 */
import type { Module } from './types';
export const POLICY_REGULATORY_MODULES: Module[] = [
  {
    id: 'policy-001',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Canadian Energy Regulatory Framework',
    description:
      'Navigate federal and provincial energy regulations, carbon pricing, and clean electricity standards.',
    sequence_number: 1,
    duration_minutes: 40,
    content_type: 'reading',
    content_data: {
      content: `# Canadian Energy Regulatory Framework

## Introduction

Canada's energy sector operates under a complex multi-jurisdictional regulatory framework. Understanding federal versus provincial powers is critical for compliance and strategic planning.

## Constitutional Division of Powers

### Federal Jurisdiction
**Under Constitution Act, 1867**:
- Interprovincial and international trade and commerce (s. 91(2))
- Navigation and shipping (s. 91(10))
- Fisheries (s. 91(12))
- Works for general advantage of Canada (s. 92(10)(c))

**Key Federal Agencies**:
- **Natural Resources Canada (NRCan)**: Energy policy, R&D funding
- **Canadian Energy Regulator (CER)**: Interprovincial pipelines, electricity lines, offshore energy
- **Environment and Climate Change Canada (ECCC)**: Emissions regulations, carbon pricing
- **Impact Assessment Agency of Canada (IAAC)**: Major project reviews

### Provincial Jurisdiction
**Under s. 92A (Natural Resources)**:
- Exploration, development, conservation, management of natural resources
- Electricity generation within province
- Resource royalties and taxation

**Example - Alberta**:
- **Alberta Energy Regulator (AER)**: Oil, gas, coal development
- **Alberta Electric System Operator (AESO)**: Electricity market
- **Alberta Utilities Commission (AUC)**: Utility rates, facility siting

## Carbon Pricing in Canada

### Federal Backstop (Greenhouse Gas Pollution Pricing Act)
**Two components**:
1. **Fuel charge**: Applied to fossil fuels
   - Current rate (2024): $65/tonne CO2e
   - Increasing $15/year to $170/tonne by 2030
2. **Output-Based Pricing System (OBPS)**: For large industrial emitters
   - Applies to facilities emitting >50,000 tonnes CO2e/year
   - Pay on emissions above performance standard
   - Can earn credits if below standard

**Provinces with federal backstop** (as of 2024):
- Manitoba, Ontario, Saskatchewan, Alberta (partial)
- Federal system applies where province doesn't meet federal stringency

### Provincial Carbon Pricing Systems

**British Columbia**:
- Carbon tax since 2008 (revenue neutral until 2017)
- Current rate: $65/tonne (aligned with federal)
- Covers ~70% of provincial emissions

**Quebec**:
- Cap-and-trade system since 2013
- Linked with California and Washington (Western Climate Initiative)
- Declining annual cap on emissions
- Allowances auctioned quarterly

**Alberta**:
- Technology Innovation and Emissions Reduction (TIER) regulation
- Output-based system for large emitters
- Equivalent to federal OBPS stringency

## Clean Electricity Regulations (CER)

**Published**: August 2023 (final regulations expected 2024)

**Objective**: Achieve net-zero electricity grid by 2035

**Key Requirements**:
1. **Performance standard**: 30 tonnes CO2/GWh for new natural gas units
2. **Phase-out schedule**:
   - Units commissioned before 2025: Can operate to end of prescribed life (e.g., 20 years for gas)
   - Units after 2025: Must meet 30 tonnes/GWh standard
3. **Compliance mechanisms**:
   - Carbon capture and storage (CCS)
   - Co-firing with hydrogen or ammonia
   - Retirement of units

**Provincial Concerns**:
- Alberta, Saskatchewan: Reliance on natural gas generation
- Economic impact on ratepayers
- Grid reliability during transition

## Net-Zero by 2050

**Canadian Net-Zero Emissions Accountability Act** (2021):

**Binding targets**:
- 2030: 40-45% below 2005 levels
- 2050: Net-zero emissions

**Sectoral pathways**:
- **Electricity**: Net-zero by 2035 (CER)
- **Oil & Gas**: 75% reduction by 2030 (proposed emissions cap)
- **Transportation**: ZEV mandate (100% by 2035)
- **Buildings**: Net-zero energy ready by 2030

**Compliance mechanisms**:
- Carbon pricing ramp-up ($170/tonne by 2030)
- Sector-specific regulations (CER, ZEV mandate, Clean Fuel Regulations)
- Investment Tax Credits (ITCs) for clean technology

## Indigenous Consultation Requirements

### Duty to Consult (Constitution Act, s. 35)

**When required**:
- Crown contemplates action that might adversely affect Aboriginal or treaty rights
- Applies to energy projects on or near traditional territories

**Spectrum of consultation** (Haida Nation v. BC):
1. **Minimal consultation**: Low impact projects
2. **Deep consultation**: Potential for significant adverse effects
3. **Consent required**: Projects directly infringing treaty rights (UNDRIP alignment)

### United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP) Act (2021)

**Free, Prior and Informed Consent (FPIC)**:
- Federal commitment to align laws with UNDRIP
- **NOT** a veto, but requires good-faith negotiation
- Increasingly expected for major projects

**Practical implications**:
- Early engagement with Indigenous communities (pre-application)
- Impact and Benefit Agreements (IBAs)
- Revenue sharing arrangements
- Environmental monitoring partnerships

### Recent Case Law

**Yahey v. British Columbia (2021)**:
- Cumulative impacts of industrial development in Treaty 8 territory
- First case finding treaty infringement from cumulative effects
- Implications: Government must consider cumulative impacts, not just individual projects

## Regulatory Review Processes

### Federal Impact Assessment (Impact Assessment Act, 2019)

**Triggers**:
- Projects on federal list (e.g., interprovincial pipelines, offshore oil)
- Projects designated by Minister

**Process**:
- Early planning and engagement
- Impact Statement preparation
- Public comment period
- Impact Assessment Report
- Decision by Minister or Governor in Council

**Timeline**: 300-600 days (can be extended)

### Provincial Reviews (Example: Alberta)

**Alberta Energy Regulator (AER)**:
- Single-window regulator for energy development
- Integrated review of applications
- Public interest test

**Timeline**: Varies (routine wells: 30 days; large projects: 12-24 months)

## Compliance Best Practices

### For Project Proponents

✓ **Early engagement**: Start Indigenous consultation 12-24 months pre-application
✓ **Baseline studies**: Environmental, socio-economic, cultural (2-3 years)
✓ **Regulatory roadmap**: Identify all required federal and provincial approvals
✓ **Public consultation**: Beyond minimum requirements (builds social license)
✓ **Adaptive management**: Commit to monitoring and adaptive responses

### Common Pitfalls

❌ **Late Indigenous engagement**: Delays, legal challenges
❌ **Underestimating timelines**: Regulatory reviews often take longer than planned
❌ **Inadequate baseline data**: Insufficient environmental studies
❌ **Ignoring cumulative effects**: Required under IAA
❌ **Poor public communication**: Opposition from lack of understanding

## Upcoming Regulatory Changes

**2024-2025 Expectations**:
- **Final CER**: Definitive phase-out schedule for gas generation
- **Emissions cap for oil & gas**: Proposed 2024, final 2025
- **Clean Electricity Investment Tax Credit**: Details for 15-30% ITCs
- **Nature Accountability Act**: Biodiversity commitments

## Action Items

After completing this module:
✓ Map federal and provincial jurisdictions for your sector
✓ Calculate carbon pricing impact on operations (current and 2030 rates)
✓ Identify Indigenous communities in your project area
✓ Review CER applicability to electricity assets
✓ Assess net-zero pathway for your organization

## Next Module Preview

**Module 2** covers Indigenous consultation in depth: FPIC implementation, IBA negotiation strategies, and case studies from successful energy projects.
`,
      estimatedReadTime: 30,
    },
    learning_objectives: [
      'Differentiate federal vs provincial energy jurisdiction',
      'Explain carbon pricing mechanisms across Canada',
      'Understand Clean Electricity Regulations compliance',
      'Navigate Indigenous consultation requirements',
      'Apply regulatory frameworks to project planning',
    ],
  },
  {
    id: 'policy-002',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Indigenous Consultation & UNDRIP',
    description:
      'Master Free, Prior and Informed Consent (FPIC), Impact Benefit Agreements, and consultation best practices.',
    sequence_number: 2,
    duration_minutes: 35,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
      duration: 1800,
      transcript:
        'This video covers Indigenous consultation requirements, FPIC implementation, and case studies...',
      thumbnailUrl:
        'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Indigenous+Consultation',
    },
    learning_objectives: [
      'Implement FPIC in project planning',
      'Negotiate Impact and Benefit Agreements (IBAs)',
      'Conduct culturally appropriate consultation',
      'Navigate treaty rights and traditional territories',
      'Apply learnings from case law (Haida, Yahey)',
    ],
    prerequisites: ['policy-001'],
  },
  {
    id: 'policy-003',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Environmental Compliance Quiz',
    description:
      'Test your knowledge of impact assessments, emissions reporting, and environmental monitoring.',
    sequence_number: 3,
    duration_minutes: 25,
    content_type: 'quiz',
    content_data: {
      questions: [
        {
          id: 'env-q1',
          question:
            'Which projects require a federal Impact Assessment under the Impact Assessment Act (2019)?',
          options: [
            'All energy projects in Canada',
            'Projects on the Project List or designated by Minister',
            'Only interprovincial pipelines',
            'Projects over $100M capital cost',
          ],
          correctAnswer: 1,
          explanation:
            'Federal Impact Assessments are triggered for projects on the designated Project List (e.g., interprovincial pipelines, offshore oil, large hydro) or projects specifically designated by the Minister.',
        },
        {
          id: 'env-q2',
          question: 'What is the 2030 federal carbon price target under current legislation?',
          options: ['$95/tonne CO2e', '$125/tonne CO2e', '$170/tonne CO2e', '$200/tonne CO2e'],
          correctAnswer: 2,
          explanation:
            'The federal carbon price increases $15/year from $65/tonne (2024) to reach $170/tonne by 2030 under the Greenhouse Gas Pollution Pricing Act.',
        },
        {
          id: 'env-q3',
          question:
            'Under the Clean Electricity Regulations, what is the performance standard for new natural gas generation units?',
          options: [
            '0 tonnes CO2/GWh',
            '30 tonnes CO2/GWh',
            '100 tonnes CO2/GWh',
            '420 tonnes CO2/GWh (unabated)',
          ],
          correctAnswer: 1,
          explanation:
            'The CER sets a performance standard of 30 tonnes CO2/GWh for new gas units, effectively requiring CCS, hydrogen co-firing, or other emissions reduction technology.',
        },
        {
          id: 'env-q4',
          question: 'What does FPIC stand for in the context of Indigenous consultation?',
          options: [
            'Federal Project Impact Certificate',
            'Free, Prior and Informed Consent',
            'First Peoples Industrial Coalition',
            'Final Project Implementation Clearance',
          ],
          correctAnswer: 1,
          explanation:
            'FPIC (Free, Prior and Informed Consent) is a principle from UNDRIP requiring meaningful consultation with Indigenous peoples before decisions affecting their rights or territories.',
        },
        {
          id: 'env-q5',
          question:
            'Which landmark case established the "Duty to Consult" for Crown actions affecting Aboriginal rights?',
          options: ['R. v. Sparrow', 'Haida Nation v. BC', 'Delgamuukw v. BC', 'Yahey v. BC'],
          correctAnswer: 1,
          explanation:
            "Haida Nation v. BC (2004) established the Crown's duty to consult and, where appropriate, accommodate Indigenous peoples when contemplating actions that might adversely affect Aboriginal or treaty rights.",
        },
        {
          id: 'env-q6',
          question:
            'What is the minimum facility size threshold for the federal Output-Based Pricing System (OBPS)?',
          options: [
            '10,000 tonnes CO2e/year',
            '25,000 tonnes CO2e/year',
            '50,000 tonnes CO2e/year',
            '100,000 tonnes CO2e/year',
          ],
          correctAnswer: 2,
          explanation:
            'The OBPS applies to facilities emitting 50,000 tonnes CO2e or more per year. These large emitters pay on emissions above their facility-specific performance standard.',
        },
        {
          id: 'env-q7',
          question: "Under federal regulations, what is Canada's net-zero target year?",
          options: ['2030', '2035', '2040', '2050'],
          correctAnswer: 3,
          explanation:
            'The Canadian Net-Zero Emissions Accountability Act (2021) sets a legally binding target of net-zero greenhouse gas emissions by 2050, with interim target of 40-45% reduction below 2005 levels by 2030.',
        },
      ],
      passingScore: 75,
    },
    learning_objectives: [
      'Identify when federal Impact Assessments are required',
      'Calculate carbon pricing obligations',
      'Apply CER performance standards',
      'Understand FPIC and duty to consult',
      'Recognize key regulatory timelines and thresholds',
    ],
    prerequisites: ['policy-001', 'policy-002'],
  },
];
