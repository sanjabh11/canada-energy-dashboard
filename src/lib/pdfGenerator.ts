/**
 * PDF Generator - Solar Permit Document Generation
 * 
 * Generates AUC Form A and permit package documents for MicroGenWizard.
 * Uses jspdf for PDF creation (lighter weight than react-pdf for simple documents).
 * 
 * Documents Generated:
 * - AUC Form A (pre-filled interconnection application)
 * - Site Plan Template
 * - System Summary
 */

import jsPDF from 'jspdf';

export interface MicroGenFormData {
  address: string;
  postalCode: string;
  utility: string;
  propertyType: string;
  annualKwh: string;
  monthlyBill: string;
  roofArea: string;
  roofOrientation: string;
  shading: string;
  estimatedCapacity: number;
  systemSize: string;
  isCompliant: boolean;
}

export interface CalculationResults {
  annualGeneration: number;
  offsetPercentage: number;
  estimatedSavings: number;
  paybackYears: number;
  co2Offset: number;
}

const UTILITY_NAMES: Record<string, string> = {
  'epcor': 'EPCOR Distribution & Transmission Inc.',
  'enmax': 'ENMAX Power Corporation',
  'fortis': 'FortisAlberta Inc.',
  'atco': 'ATCO Electric Ltd.'
};

const UTILITY_ADDRESSES: Record<string, string> = {
  'epcor': '10065-Jasper Avenue, Edmonton, AB T5J 3B1',
  'enmax': '141-50 Avenue SE, Calgary, AB T2G 4S7',
  'fortis': '320-17th Avenue SW, Calgary, AB T2S 2V1',
  'atco': '5302-50th Avenue, Vegreville, AB T9C 1R8'
};

/**
 * Generate complete permit package PDF
 */
export function generatePermitPackagePDF(
  formData: MicroGenFormData,
  calculations: CalculationResults
): void {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-CA');
  
  // Page 1: Cover Page
  addCoverPage(doc, formData, calculations, today);
  
  // Page 2: AUC Form A
  doc.addPage();
  addAUCFormA(doc, formData, calculations, today);
  
  // Page 3: System Summary
  doc.addPage();
  addSystemSummary(doc, formData, calculations);
  
  // Page 4: Site Plan Template
  doc.addPage();
  addSitePlanTemplate(doc, formData);
  
  // Page 5: Checklist
  doc.addPage();
  addInstallationChecklist(doc);
  
  // Save the PDF
  const filename = `Solar_Permit_Package_${formData.postalCode.replace(/\s/g, '')}_${today}.pdf`;
  doc.save(filename);
}

function addCoverPage(
  doc: jsPDF,
  formData: MicroGenFormData,
  calculations: CalculationResults,
  date: string
): void {
  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ALBERTA SOLAR PERMIT PACKAGE', 105, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Micro-Generation Interconnection Application', 105, 52, { align: 'center' });
  
  // Property Info Box
  doc.setDrawColor(0, 100, 150);
  doc.setLineWidth(0.5);
  doc.rect(20, 70, 170, 60);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPERTY INFORMATION', 25, 82);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Address: ${formData.address}`, 25, 95);
  doc.text(`Postal Code: ${formData.postalCode}`, 25, 103);
  doc.text(`Property Type: ${formData.propertyType.charAt(0).toUpperCase() + formData.propertyType.slice(1)}`, 25, 111);
  doc.text(`Utility Provider: ${UTILITY_NAMES[formData.utility] || formData.utility}`, 25, 119);
  
  // System Summary Box
  doc.rect(20, 140, 170, 60);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSED SYSTEM', 25, 152);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`System Capacity: ${formData.estimatedCapacity} kW`, 25, 165);
  doc.text(`Estimated Annual Generation: ${calculations.annualGeneration.toLocaleString()} kWh`, 25, 173);
  doc.text(`Annual Consumption Offset: ${calculations.offsetPercentage}%`, 25, 181);
  doc.text(`Estimated Annual Savings: $${calculations.estimatedSavings.toLocaleString()} CAD`, 25, 189);
  
  // Compliance Status
  const statusColor = formData.isCompliant ? [0, 150, 0] : [200, 100, 0];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    formData.isCompliant 
      ? '✓ ELIGIBLE FOR MICRO-GENERATION' 
      : '⚠ REVIEW REQUIRED - See compliance notes',
    105, 220, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${date}`, 20, 270);
  doc.text('Canada Energy Dashboard - Solar Permit Wizard', 105, 270, { align: 'center' });
  doc.text('Page 1 of 5', 190, 270, { align: 'right' });
}

function addAUCFormA(
  doc: jsPDF,
  formData: MicroGenFormData,
  calculations: CalculationResults,
  date: string
): void {
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AUC FORM A - MICRO-GENERATION NOTICE', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Alberta Utilities Commission Rule 007', 105, 28, { align: 'center' });
  
  // Section 1: Customer Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 1: CUSTOMER INFORMATION', 20, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const section1Fields = [
    { label: 'Customer Name:', value: '________________________________' },
    { label: 'Service Address:', value: formData.address || '________________________________' },
    { label: 'Postal Code:', value: formData.postalCode || '_______________' },
    { label: 'Phone Number:', value: '________________________________' },
    { label: 'Email Address:', value: '________________________________' }
  ];
  
  let y = 55;
  section1Fields.forEach(field => {
    doc.text(`${field.label}`, 20, y);
    doc.text(field.value, 70, y);
    y += 8;
  });
  
  // Section 2: Utility Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SECTION 2: DISTRIBUTION UTILITY', 20, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 20;
  
  doc.text('Utility Name:', 20, y);
  doc.text(UTILITY_NAMES[formData.utility] || '________________________________', 70, y);
  y += 8;
  doc.text('Utility Address:', 20, y);
  doc.text(UTILITY_ADDRESSES[formData.utility] || '________________________________', 70, y);
  
  // Section 3: Generation Facility
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y += 15;
  doc.text('SECTION 3: GENERATION FACILITY DETAILS', 20, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 10;
  
  const section3Fields = [
    { label: 'Type of Generation:', value: 'Solar Photovoltaic (PV)' },
    { label: 'Total Nameplate Capacity:', value: `${formData.estimatedCapacity} kW AC` },
    { label: 'Estimated Annual Production:', value: `${calculations.annualGeneration.toLocaleString()} kWh` },
    { label: 'Annual Site Consumption:', value: `${formData.annualKwh || '________'} kWh` },
    { label: 'Inverter Type:', value: '________________________________' },
    { label: 'Panel Manufacturer:', value: '________________________________' }
  ];
  
  section3Fields.forEach(field => {
    doc.text(`${field.label}`, 20, y);
    doc.text(field.value, 80, y);
    y += 8;
  });
  
  // Section 4: Compliance Declaration
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y += 10;
  doc.text('SECTION 4: COMPLIANCE DECLARATION', 20, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 10;
  
  doc.text('I hereby confirm that:', 20, y);
  y += 8;
  
  const declarations = [
    '☐ The generating unit(s) will not produce more energy than consumed on an annual basis',
    '☐ The generating unit(s) will comply with all applicable safety and electrical codes',
    '☐ The installation will be performed by a licensed electrical contractor',
    '☐ Required permits will be obtained from the local authority having jurisdiction'
  ];
  
  declarations.forEach(dec => {
    doc.text(dec, 25, y);
    y += 7;
  });
  
  // Signature
  y += 10;
  doc.text('Customer Signature: ________________________________  Date: ________________', 20, y);
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Pre-filled by Canada Energy Dashboard on ${date}`, 20, 280);
  doc.text('Page 2 of 5', 190, 280, { align: 'right' });
}

function addSystemSummary(
  doc: jsPDF,
  formData: MicroGenFormData,
  calculations: CalculationResults
): void {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLAR SYSTEM SUMMARY', 105, 20, { align: 'center' });
  
  // Financial Analysis
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL ANALYSIS', 20, 40);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const financials = [
    { label: 'System Size', value: `${formData.estimatedCapacity} kW` },
    { label: 'Estimated Installation Cost', value: `$${(formData.estimatedCapacity * 2500).toLocaleString()} CAD` },
    { label: 'Annual Energy Savings', value: `$${calculations.estimatedSavings.toLocaleString()} CAD` },
    { label: 'Simple Payback Period', value: `${calculations.paybackYears} years` },
    { label: '25-Year Savings Estimate', value: `$${(calculations.estimatedSavings * 25).toLocaleString()} CAD` }
  ];
  
  let y = 50;
  financials.forEach(item => {
    doc.text(item.label, 25, y);
    doc.text(item.value, 120, y);
    y += 10;
  });
  
  // Environmental Impact
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y += 10;
  doc.text('ENVIRONMENTAL IMPACT', 20, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 10;
  
  const environmental = [
    { label: 'Annual CO₂ Offset', value: `${calculations.co2Offset} tonnes` },
    { label: '25-Year CO₂ Offset', value: `${(calculations.co2Offset * 25).toFixed(1)} tonnes` },
    { label: 'Equivalent Trees Planted', value: `${Math.round(calculations.co2Offset * 45)} trees/year` },
    { label: 'Cars Off Road Equivalent', value: `${(calculations.co2Offset / 4.6).toFixed(1)} cars/year` }
  ];
  
  environmental.forEach(item => {
    doc.text(item.label, 25, y);
    doc.text(item.value, 120, y);
    y += 10;
  });
  
  // Technical Specifications
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y += 10;
  doc.text('TECHNICAL SPECIFICATIONS', 20, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 10;
  
  const orientationLabels: Record<string, string> = {
    'south': 'South (Optimal)',
    'southeast': 'Southeast',
    'southwest': 'Southwest',
    'east': 'East',
    'west': 'West',
    'north': 'North'
  };
  
  const shadingLabels: Record<string, string> = {
    'none': 'No Shading',
    'light': 'Light Shading',
    'moderate': 'Moderate Shading',
    'heavy': 'Heavy Shading'
  };
  
  const technical = [
    { label: 'Usable Roof Area', value: `${formData.roofArea} m²` },
    { label: 'Roof Orientation', value: orientationLabels[formData.roofOrientation] || formData.roofOrientation },
    { label: 'Shading Conditions', value: shadingLabels[formData.shading] || formData.shading },
    { label: 'Annual Generation', value: `${calculations.annualGeneration.toLocaleString()} kWh` },
    { label: 'Consumption Offset', value: `${calculations.offsetPercentage}%` }
  ];
  
  technical.forEach(item => {
    doc.text(item.label, 25, y);
    doc.text(item.value, 120, y);
    y += 10;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.text('Page 3 of 5', 190, 280, { align: 'right' });
}

function addSitePlanTemplate(doc: jsPDF, formData: MicroGenFormData): void {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SITE PLAN TEMPLATE', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete this template or attach a professional site plan', 105, 28, { align: 'center' });
  
  // Drawing area
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(20, 40, 170, 160);
  
  // Grid lines
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  for (let i = 30; i <= 190; i += 10) {
    doc.line(i, 40, i, 200);
  }
  for (let i = 50; i <= 200; i += 10) {
    doc.line(20, i, 190, i);
  }
  
  // Instructions
  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('REQUIRED ELEMENTS:', 20, 215);
  
  const elements = [
    '• Property boundaries and dimensions',
    '• Building footprint with roof area',
    '• Proposed panel locations (shaded area)',
    '• North arrow and scale',
    '• Distance from property lines',
    '• Location of electrical panel/meter',
    '• Any trees or obstructions'
  ];
  
  let y = 223;
  elements.forEach(el => {
    doc.text(el, 25, y);
    y += 6;
  });
  
  // Property info
  doc.setFontSize(8);
  doc.text(`Property: ${formData.address}`, 120, 215);
  doc.text(`Roof Area: ${formData.roofArea} m²`, 120, 222);
  doc.text(`System: ${formData.estimatedCapacity} kW`, 120, 229);
  
  // Footer
  doc.text('Page 4 of 5', 190, 280, { align: 'right' });
}

function addInstallationChecklist(doc: jsPDF): void {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTALLATION CHECKLIST', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const sections = [
    {
      title: 'PRE-INSTALLATION',
      items: [
        'Submit AUC Form A to utility provider',
        'Obtain municipal building permit',
        'Obtain electrical permit',
        'Confirm installer is licensed',
        'Review HOA/condo regulations (if applicable)'
      ]
    },
    {
      title: 'INSTALLATION',
      items: [
        'Roof structural assessment completed',
        'Racking system installed per specifications',
        'Panels mounted and secured',
        'Wiring completed to electrical code',
        'Inverter installed and configured',
        'Disconnect switch installed'
      ]
    },
    {
      title: 'POST-INSTALLATION',
      items: [
        'Electrical inspection passed',
        'Building inspection passed (if required)',
        'Utility interconnection approval received',
        'Bi-directional meter installed',
        'System commissioned and tested',
        'Monitoring system activated'
      ]
    },
    {
      title: 'DOCUMENTATION',
      items: [
        'Warranty documentation received',
        'As-built drawings obtained',
        'Operation manual received',
        'Maintenance schedule established'
      ]
    }
  ];
  
  let y = 35;
  sections.forEach(section => {
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 20, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    section.items.forEach(item => {
      doc.text(`☐ ${item}`, 25, y);
      y += 7;
    });
    y += 5;
  });
  
  // Notes section
  doc.setFont('helvetica', 'bold');
  doc.text('NOTES:', 20, y);
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, y + 3, 170, 30);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Page 5 of 5', 190, 280, { align: 'right' });
  doc.text('Generated by Canada Energy Dashboard - Solar Permit Wizard', 105, 280, { align: 'center' });
}

/**
 * Generate just the AUC Form A PDF
 */
export function generateAUCFormPDF(
  formData: MicroGenFormData,
  calculations: CalculationResults
): void {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-CA');
  
  addAUCFormA(doc, formData, calculations, today);
  
  const filename = `AUC_Form_A_${formData.postalCode.replace(/\s/g, '')}_${today}.pdf`;
  doc.save(filename);
}
