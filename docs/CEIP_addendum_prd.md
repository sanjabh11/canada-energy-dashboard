const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, 
        AlignmentType, PageNumber, LevelFormat, HeadingLevel, BorderStyle, WidthType, 
        ShadingType, PageBreak } = require('docx');
const fs = require('fs');

// Table border styling
const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
const headerShading = { fill: "1a365d", type: ShadingType.CLEAR }; // Dark blue header
const altRowShading = { fill: "f7fafc", type: ShadingType.CLEAR }; // Light gray alt rows

// Priority colors for visual indicators
const p0Fill = { fill: "fed7d7", type: ShadingType.CLEAR }; // Red - Critical
const p1Fill = { fill: "fefcbf", type: ShadingType.CLEAR }; // Yellow - High
const p2Fill = { fill: "c6f6d5", type: ShadingType.CLEAR }; // Green - Medium
const p3Fill = { fill: "e2e8f0", type: ShadingType.CLEAR }; // Gray - Low

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 48, bold: true, color: "1a365d", font: "Arial" },
        paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1a365d", font: "Arial" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2d3748", font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "4a5568", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-features", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-benefits", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-insights", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-stories", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ 
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "CEIP Addendum PRD - Killer Features for Maximum Monetization", size: 18, color: "718096" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ 
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18 }), new TextRun({ text: " of ", size: 18 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })]
      })] })
    },
    children: [
      // TITLE PAGE
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("CEIP ADDENDUM PRD")] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Killer Features for Maximum Monetization", size: 28, color: "4a5568" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Canada Energy Intelligence Platform", size: 24, italics: true, color: "718096" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Version 2.0 | November 30, 2025", size: 20, color: "718096" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Based on Super Deep Research Across 10 Critical Dimensions", size: 20, bold: true, color: "2d3748" })] }),

      // EXECUTIVE SUMMARY
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("EXECUTIVE SUMMARY")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("This addendum identifies ")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "12 high-impact killer features", bold: true }), new TextRun(" that will transform CEIP from a data visualization platform into a "), new TextRun({ text: "$500K+ annual revenue machine", bold: true, color: "2b6cb0" }), new TextRun(". Each feature is backed by research statistics demonstrating proven ROI in engagement, completion rates, and monetization.")] }),

      // KEY RESEARCH FINDINGS BOX
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Research-Backed Statistics Driving These Recommendations")] }),
      new Table({
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [
            new TableCell({ columnSpan: 2, borders: cellBorders, shading: headerShading, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CRITICAL RESEARCH FINDINGS", bold: true, color: "FFFFFF", size: 24 })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Cohort-Based Learning", bold: true })] }), new Paragraph({ children: [new TextRun("85-98% completion vs 3-6% MOOCs")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "AI Personalization", bold: true })] }), new Paragraph({ children: [new TextRun("91% completion vs 72% traditional")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, shading: altRowShading, children: [new Paragraph({ children: [new TextRun({ text: "Gamification", bold: true })] }), new Paragraph({ children: [new TextRun("93% higher retention, 90% completion")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, shading: altRowShading, children: [new Paragraph({ children: [new TextRun({ text: "Digital Badges", bold: true })] }), new Paragraph({ children: [new TextRun("83% employer preference, 32% salary boost")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Microlearning", bold: true })] }), new Paragraph({ children: [new TextRun("80% focus boost, 4x engagement")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4680, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "API Monetization", bold: true })] }), new Paragraph({ children: [new TextRun("21% of companies: 75%+ revenue from APIs")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ columnSpan: 2, borders: cellBorders, shading: { fill: "ebf8ff", type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★ GOLDEN OPPORTUNITY: Law Society of Alberta MANDATES Indigenous Cultural Competency Education ★", bold: true, color: "2b6cb0", size: 20 })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 1: MANDATORY CPD COMPLIANCE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #1: LAW SOCIETY ALBERTA CPD COMPLIANCE")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P0 (CRITICAL) | Revenue Impact: $150K+/year | Effort: 40 hours", bold: true, color: "c53030" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Market Opportunity Discovery")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("The Law Society of Alberta has "), new TextRun({ text: "MANDATORY Indigenous Cultural Competency Education", bold: true }), new TextRun(" requirements. All active Alberta lawyers MUST complete \"The Path\" training OR demonstrate equivalent knowledge via TRC Call to Action 27 compliance. This creates a captive market of "), new TextRun({ text: "10,000+ Alberta lawyers", bold: true }), new TextRun(" who need CPD credits annually.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Key Regulations Discovered")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun("CPD plans must be submitted by October 1 annually (Rule 67.3)")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun("Failure to submit results in ADMINISTRATIVE SUSPENSION")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun("Indigenous Cultural Competency is a separate MANDATORY requirement")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun("Alberta's CPD has NO minimum hour requirement - competency-based approach")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun("Lawyers select competencies from 9 domains and design their own learning activities")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Competitive Positioning")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Current providers like Indigenous Corporate Training Inc. ($581/course) focus on general cultural awareness. "), new TextRun({ text: "CEIP can offer Indigenous Energy Consultation-specific training", bold: true }), new TextRun(" that combines cultural competency WITH real energy project data, FPIC tracking, and practical consultation workflows - a unique differentiation no competitor offers.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CPD-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Calgary law firm partner")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Access CPD-eligible Indigenous Energy Consultation training that counts toward my mandatory annual competency requirements")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CPD-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Associate lawyer")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Receive a completion certificate that demonstrates TRC Call to Action 27 compliance for my CPD plan submission")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CPD-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Law firm L&D manager")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Book group training sessions for my entire Indigenous affairs practice team (10-20 lawyers) at a corporate discount")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "13", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 2: COHORT-BASED LEARNING
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #2: COHORT-BASED LEARNING ENGINE")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P0 (CRITICAL) | Revenue Impact: $100K+/year | Effort: 30 hours", bold: true, color: "c53030" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Why This Matters")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Research shows cohort-based courses achieve "), new TextRun({ text: "85-98% completion rates vs 3-6% for self-paced MOOCs", bold: true }), new TextRun(". Esme Learning reports 98-100% completion, altMBA achieves 96%, and Section4 maintains 70%+ with 88% of students applying learning within 3 months.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Implementation Model")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun({ text: "4-Week Indigenous Energy Bootcamp Cohorts", bold: true }), new TextRun(" - Maximum 20 participants, live weekly sessions")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun({ text: "Peer Accountability Pods", bold: true }), new TextRun(" - Groups of 4-5 learners moving through material together")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun({ text: "Live Office Hours", bold: true }), new TextRun(" - Weekly Tuesday 2pm MT Zoom sessions with instructor")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun({ text: "Capstone Project", bold: true }), new TextRun(" - Real Indigenous consultation scenario using CEIP dashboards")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("COH-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Career changer")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Join a structured 4-week cohort with peers at my level so I have accountability partners and don't drop out")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("COH-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cohort participant")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Attend live weekly office hours where I can ask questions and get real-time answers from the instructor")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("COH-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cohort graduate")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Complete a capstone project using real CEIP dashboards that I can showcase to employers as portfolio evidence")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "13", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 3: AI-POWERED LEARNING
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #3: AI-POWERED ADAPTIVE LEARNING")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P0 (CRITICAL) | Revenue Impact: $80K+/year | Effort: 50 hours", bold: true, color: "c53030" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Research-Backed Impact")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("AI-powered personalized learning delivers transformational results: "), new TextRun({ text: "91% completion rate (vs 72% traditional), 54% higher test scores, 30% better learning outcomes, and 70% improvement in completion rates", bold: true }), new TextRun(". Students using AI tools report 10x more engagement.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("CEIP AI Integration Points")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "AI Learning Path Generator", bold: true }), new TextRun(" - Gemini 2.5 analyzes learner background (O&G, legal, finance) and creates personalized dashboard exploration sequences")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Adaptive Quiz Engine", bold: true }), new TextRun(" - AI adjusts difficulty based on performance, focusing on knowledge gaps")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "AI Study Companion", bold: true }), new TextRun(" - 24/7 chat assistant that answers questions using CEIP data context")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Predictive Analytics Dashboard", bold: true }), new TextRun(" - Identifies at-risk learners before dropout (reduces dropout by 15%)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("AI-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("New learner")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Take a diagnostic assessment that identifies my knowledge level and creates a personalized learning path through CEIP dashboards")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "13", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("AI-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Active learner")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Ask the AI companion questions about energy data concepts and get contextual answers using real CEIP dashboard information")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("AI-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Platform admin")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("View predictive analytics showing which learners are at risk of dropping out so I can proactively intervene")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 4: BLOCKCHAIN DIGITAL CREDENTIALS
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #4: BLOCKCHAIN-VERIFIED DIGITAL CREDENTIALS")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P0 (CRITICAL) | Revenue Impact: $60K+/year | Effort: 25 hours", bold: true, color: "c53030" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Market Demand Statistics")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Digital credentials are reshaping hiring: "), new TextRun({ text: "83% of employers prefer digital badges when verifying skills, 74% prefer candidates with verified digital credentials over traditional degrees, and professionals with specialized certifications earn 32% more", bold: true }), new TextRun(" (PMP example: $123K avg salary). Over 18 million credentials globally now use blockchain verification.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Credential Framework")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Stackable Micro-Credentials", bold: true }), new TextRun(" - Individual badges for each dashboard mastery (AESO, IESO, CCUS, ESG, Indigenous)")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Master Certification", bold: true }), new TextRun(" - \"Certified Canadian Energy Intelligence Professional\" upon completing all modules")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "LinkedIn Integration", bold: true }), new TextRun(" - One-click badge sharing with embedded verification metadata")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Employer Verification Portal", bold: true }), new TextRun(" - Instant credential verification via unique URL or QR code")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CRED-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Course completer")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Receive a blockchain-verified digital badge upon module completion that I can share on LinkedIn with one click")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p0Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CRED-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Hiring manager")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Verify a candidate's CEIP certification instantly via QR code or URL without contacting the issuer")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("CRED-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Learner")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Collect stackable micro-credentials for each dashboard mastery and unlock a Master Certification after completing all modules")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 5: GAMIFICATION ENGINE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #5: GAMIFICATION & ENGAGEMENT ENGINE")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P1 (HIGH) | Revenue Impact: $40K+/year | Effort: 35 hours", bold: true, color: "d69e2e" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Proven Statistics")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Gamification drives exceptional outcomes: "), new TextRun({ text: "93% higher retention (University of Colorado), 90% completion rates (IBM/Deloitte), 120% increase in participation, and 60% knowledge retention boost", bold: true }), new TextRun(". Companies with gamified training see 47% higher employee engagement (Gartner).")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Gamification Elements")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "XP Points System", bold: true }), new TextRun(" - Earn points for completing modules, answering quiz questions, engaging in community")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Achievement Badges", bold: true }), new TextRun(" - \"First Analysis\", \"Data Explorer\", \"Indigenous Consultation Expert\", \"Grid Master\"")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Leaderboards", bold: true }), new TextRun(" - Weekly, monthly, and all-time rankings with opt-out privacy option")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Learning Streaks", bold: true }), new TextRun(" - Daily/weekly streak tracking with bonus XP multipliers")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Progress Visualization", bold: true }), new TextRun(" - Interactive skill tree showing mastery journey across all dashboards")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("GAM-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Competitive learner")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("See my position on a weekly leaderboard and earn bonus XP for maintaining top-10 ranking")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("GAM-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Daily learner")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Maintain a daily learning streak with visual progress tracking and streak-based XP multipliers")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("GAM-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Achievement hunter")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Unlock special badges for completing hidden challenges like analyzing data at 3am or completing all modules in a weekend")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // KILLER FEATURE 6: API DATA MARKETPLACE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("KILLER FEATURE #6: ENERGY DATA API MARKETPLACE")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P1 (HIGH) | Revenue Impact: $120K+/year | Effort: 60 hours", bold: true, color: "d69e2e" })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("API Monetization Opportunity")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("APIs are revenue machines: "), new TextRun({ text: "21% of companies derive 75%+ of total revenue from APIs", bold: true }), new TextRun(". The global API marketplace market reached $18 billion in 2024 and is projected to hit $49.45 billion by 2030 (18.9% CAGR). Energy-as-a-Service market alone is predicted to reach $221 billion by 2026.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("API Product Tiers")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Free Tier", bold: true }), new TextRun(" - 100 API calls/month, basic endpoints (real-time grid data)")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Developer ($97/mo)", bold: true }), new TextRun(" - 1,000 calls/month, historical data, webhooks")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Business ($497/mo)", bold: true }), new TextRun(" - 10,000 calls/month, Indigenous project database, AI analysis endpoints")] }),
      new Paragraph({ numbering: { reference: "bullet-features", level: 0 }, children: [new TextRun({ text: "Enterprise (Custom)", bold: true }), new TextRun(" - Unlimited calls, dedicated support, custom endpoints, SLA guarantees")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("User Stories")] }),
      new Table({
        columnWidths: [1200, 2400, 4200, 1560],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "ID", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "As a...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "I want to...", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "SP", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("API-001")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Energy developer")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Access CEIP data via REST API to integrate real-time Canadian grid information into my own applications")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "13", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p1Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("API-002")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Utility company")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Subscribe to enterprise API tier with SLA guarantees and dedicated support for mission-critical energy planning")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: p2Fill, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("API-003")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Research institution")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 4200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Access historical energy data via bulk export API endpoints for academic research and modeling")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8", bold: true })] })] })
          ]})
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ADDITIONAL KILLER FEATURES SUMMARY TABLE
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("ADDITIONAL KILLER FEATURES (P2-P3)")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #7: Microlearning Modules")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P2 | Impact: 80% focus boost, 4x engagement", color: "38a169" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("5-10 minute bite-sized lessons for each dashboard feature. Research shows 90% of learners prefer short, focused lessons.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #8: Corporate Simulation Sandbox")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P2 | Impact: $5-10K per workshop", color: "38a169" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Safe training environment with mock AESO/IESO data for corporate workshops. Lawyers and consultants can practice Indigenous consultation scenarios without real project risk.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #9: Energy Sector Certification Prep")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P2 | Impact: Aligns with $3K-5K CEM/CEA courses", color: "38a169" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Prep modules for Certified Energy Manager (CEM) and Certified Energy Auditor (CEA) exams. IESO subsidizes 50% of CEM training - partner opportunity.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #10: Community Discussion Forums")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P2 | Impact: 85% say community helpful for learning", color: "38a169" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Topic-based discussion forums for energy professionals to network, share insights, and collaborate on challenges.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #11: Mobile Learning App")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P3 | Impact: 46% of learners use phones before sleep", color: "718096" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("PWA or native app for learning on-the-go with offline capability for field workers in remote energy sites.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Feature #12: White-Label Enterprise Platform")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Priority: P3 | Impact: $50K+ per enterprise client", color: "718096" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Customizable platform for utilities and energy companies to deploy internally with their own branding for employee training.")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // IMPLEMENTATION ROADMAP
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("IMPLEMENTATION ROADMAP")] }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 1: Foundation (Weeks 1-2)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Implement blockchain digital credentials system (CRED-001, CRED-002)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Build CPD-eligible certificate generation for Law Society Alberta compliance (CPD-001, CPD-002)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Create AI diagnostic assessment for personalized learning paths (AI-001)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 2: Engagement (Weeks 3-4)")] }),
      new Paragraph({ numbering: { reference: "numbered-stories", level: 0 }, children: [new TextRun("Launch gamification engine with XP, badges, and leaderboards (GAM-001, GAM-002)")] }),
      new Paragraph({ numbering: { reference: "numbered-stories", level: 0 }, children: [new TextRun("Build cohort enrollment system for 4-week bootcamp (COH-001)")] }),
      new Paragraph({ numbering: { reference: "numbered-stories", level: 0 }, children: [new TextRun("Implement AI study companion chat interface (AI-002)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 3: Scale (Month 2-3)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Launch API marketplace with tiered pricing (API-001, API-002)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Roll out first cohort bootcamp with 20 participants (COH-002, COH-003)")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun("Execute Calgary law firm outreach campaign (CPD-003)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // REVENUE PROJECTION
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("REVENUE PROJECTION WITH KILLER FEATURES")] }),
      
      new Table({
        columnWidths: [3120, 2080, 2080, 2080],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Year 1", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Year 2", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: headerShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Year 3", bold: true, color: "FFFFFF" })] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Law Firm CPD Training")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$60K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$150K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$250K")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Cohort Bootcamps")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$42K")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$100K")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$180K")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Pro Memberships")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$35K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$85K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$140K")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("API Marketplace")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$24K")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$72K")] })] }),
            new TableCell({ borders: cellBorders, shading: altRowShading, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$120K")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("Advisory Retainers")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$42K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$84K")] })] }),
            new TableCell({ borders: cellBorders, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("$126K")] })] })
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: "2b6cb0", type: ShadingType.CLEAR }, width: { size: 3120, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "2b6cb0", type: ShadingType.CLEAR }, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$203K", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "2b6cb0", type: ShadingType.CLEAR }, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$491K", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: "2b6cb0", type: ShadingType.CLEAR }, width: { size: 2080, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "$816K", bold: true, color: "FFFFFF" })] })] })
          ]})
        ]
      }),

      new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Key Assumptions:", bold: true })] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun("Law Firm CPD: 10 firms Y1 → 25 firms Y2 → 40 firms Y3 at avg $6K/firm")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun("Cohort Bootcamps: 6 cohorts Y1 → 12 cohorts Y2 → 18 cohorts Y3 at $697/student, 10 students/cohort")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun("Pro Memberships: 30 members Y1 → 75 Y2 → 120 Y3 at $97/month")] }),
      new Paragraph({ numbering: { reference: "bullet-benefits", level: 0 }, children: [new TextRun("API Marketplace: 5 Business tier Y1 → 12 Y2 → 20 Y3 at $497/month")] }),

      // FINAL PAGE
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("NEXT STEPS")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun({ text: "Prioritize P0 Features First: ", bold: true }), new TextRun("CPD compliance, cohort system, AI personalization, and digital credentials are the foundation for all monetization")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun({ text: "Contact Law Society of Alberta: ", bold: true }), new TextRun("Verify CPD credit eligibility process and get listed as approved learning resource")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun({ text: "Partner with BCdiploma or Credly: ", bold: true }), new TextRun("Implement blockchain credential verification for instant employer trust")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun({ text: "Reach Out to Calgary Law Firms: ", bold: true }), new TextRun("Fasken, MLT Aikins, Bennett Jones, Osler - warm outreach with CPD-eligible training pitch")] }),
      new Paragraph({ numbering: { reference: "numbered-insights", level: 0 }, children: [new TextRun({ text: "Launch First Cohort by Week 4: ", bold: true }), new TextRun("10-student pilot at $697, use for testimonials and case studies")] }),

      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "★ These 12 killer features, backed by research statistics, will transform CEIP into a $500K+ revenue platform within 24 months ★", bold: true, size: 24, color: "2b6cb0" })] })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/user-data/outputs/CEIP-Addendum-PRD-Killer-Features.docx", buffer);
  console.log("Document created successfully!");
});