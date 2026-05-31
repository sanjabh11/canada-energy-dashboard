import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '../../src/components/AboutPage';
import { FeatureAvailability } from '../../src/components/FeatureAvailability';

const publicClaimSurfaceFiles = [
  'index.html',
  'public/manifest.json',
  'public/schema-webapp.jsonld',
  'src/lib/seo.ts',
  'src/components/SEOHead.tsx',
  'src/components/AboutPage.tsx',
  'src/components/CommercialLandingPage.tsx',
  'src/components/ContactPage.tsx',
  'src/components/EmployersPage.tsx',
  'src/components/SolutionsNavigatorPage.tsx',
  'src/components/TIERROICalculator.tsx',
  'src/components/TrainingCoordinatorsPage.tsx',
];

const activeRuntimeClaimSurfaceFiles = [
  'src/App.tsx',
  'src/lib/i18n.ts',
  'src/components/AIAnalyticsWidget.tsx',
  'src/components/AIEnergyOracle.tsx',
  'src/components/AnalyticsTrendsDashboard.tsx',
  'src/components/ArcticEnergySecurityMonitor.tsx',
  'src/components/AssetHealthDashboard.tsx',
  'src/components/CurtailmentAnalyticsDashboard.tsx',
  'src/components/DigitalTwinDashboard.tsx',
  'src/components/EnergyCopilot.tsx',
  'src/components/EnergyDataDashboard.tsx',
  'src/components/GridOptimizationDashboard.tsx',
  'src/components/ImpactMetricsDashboard.tsx',
  'src/components/IndigenousProjectForm.tsx',
  'src/components/InvestmentCards.tsx',
  'src/components/RealTimeDashboard.tsx',
  'src/components/RenewableOptimizationHub.tsx',
  'src/components/StakeholderDashboard.tsx',
  'src/components/WhopDiscoverPage.tsx',
  'src/components/auth/AuthModal.tsx',
  'src/components/dashboard/HomeTab.tsx',
  'src/components/dashboard/ProvincesTab.tsx',
  'src/components/whop/WelcomeModal.tsx',
];

const bannedPublicClaimPatterns = [
  { label: 'market-leadership superlative', pattern: /\bthe only\b/i },
  { label: 'AI-powered lead positioning', pattern: /\bAI-powered\b/i },
  { label: 'unqualified real-time positioning', pattern: /\breal[- ]time\b/i },
  { label: 'OCAP compliance claim', pattern: /\bOCAP(?:\u00ae)?[- ]?compliant\b|\bOCAP(?:\u00ae)?\s+compliance\b/i },
  { label: 'OCAP data sovereignty claim', pattern: /\bOCAP(?:\u00ae)?\s+data\s+sovereignty\b/i },
  { label: 'Indigenous data sovereignty claim', pattern: /\bIndigenous\s+data\s+sovereignty\b/i },
  { label: 'UNDRIP compliance claim', pattern: /\bUNDRIP\s+compliance\b/i },
  { label: 'FPIC compliance claim', pattern: /\bFPIC\s+compliance\b/i },
  { label: 'unqualified carbon savings amount', pattern: /\$70\/t\b/i },
  { label: 'dashboard-count lead positioning', pattern: /\b25\+\s+dashboards\b/i },
  { label: 'TIER arbitrage lead positioning', pattern: /\bTIER\s+arbitrage\b/i },
  { label: 'carbon arbitrage lead positioning', pattern: /\bcarbon\s+arbitrage\b/i },
  { label: 'guaranteed savings claim', pattern: /\bguaranteed\s+savings\b/i },
];

function stripCodeComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('UI claims drift regressions', () => {
  it('renders province-only coverage and honest cadence text on the about page', () => {
    const html = renderToStaticMarkup(React.createElement(AboutPage));

    expect(html).toContain('10/10');
    expect(html).toContain('30s polling');
    expect(html).toContain('Best-effort');
    expect(html).not.toContain('< 30 seconds');
  });

  it('renders roadmap items without the expired phase-2 heading', () => {
    const html = renderToStaticMarkup(React.createElement(FeatureAvailability));

    expect(html).toContain('Roadmap &amp; Deferred Features');
    expect(html).toContain('Overdue');
    expect(html).not.toContain('Coming in Phase 2 - Q1 2026');
  });

  it('keeps Indigenous governance copy bounded to workflow review, not certification readiness', () => {
    const incubatorsSource = readFileSync(path.join(process.cwd(), 'src/components/IncubatorsPage.tsx'), 'utf8');
    const vaultSource = readFileSync(path.join(process.cwd(), 'src/components/SovereignDataVault.tsx'), 'utf8');

    expect(incubatorsSource).toContain('FPIC/OCAP® review workflow');
    expect(incubatorsSource).not.toContain('FPIC/OCAP® certification');
    expect(vaultSource).toContain('OCAP review score');
    expect(vaultSource).toContain('OCAP-aligned local review workflow');
    expect(vaultSource).not.toContain('OCAP-ready score');
    expect(vaultSource).not.toContain('OCAP-ready local workflow');
  });

  it('keeps public metadata and runtime SEO free of unbounded commercial claims', () => {
    for (const file of publicClaimSurfaceFiles) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');

      for (const bannedClaim of bannedPublicClaimPatterns) {
        expect(source, `${file} contains ${bannedClaim.label}`).not.toMatch(bannedClaim.pattern);
      }
    }
  });

  it('keeps commercial entry-page metadata aligned to the active top ten', () => {
    const landingSource = readFileSync(path.join(process.cwd(), 'src/components/CommercialLandingPage.tsx'), 'utf8');
    const solutionsSource = readFileSync(path.join(process.cwd(), 'src/components/SolutionsNavigatorPage.tsx'), 'utf8');
    const roadmapSource = readFileSync(path.join(process.cwd(), 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md'), 'utf8');

    expect(landingSource).toContain('Ontario GA/ICI 5CP decision support');
    expect(landingSource).toContain('BYO-CSV privacy proof');
    expect(solutionsSource).toContain('Ontario GA ICI 5CP');
    expect(solutionsSource).toContain('BYO CSV privacy proof');
    expect(roadmapSource).toContain('Large-load and API are reserve/support surfaces');

    expect(landingSource).not.toContain('APIs, and large-load readiness');
    expect(roadmapSource).not.toContain('billing, large-load, API packs');
  });

  it('keeps active runtime copy free of unbounded commercial claims', () => {
    for (const file of activeRuntimeClaimSurfaceFiles) {
      const source = stripCodeComments(readFileSync(path.join(process.cwd(), file), 'utf8'));

      for (const bannedClaim of bannedPublicClaimPatterns) {
        expect(source, `${file} contains ${bannedClaim.label}`).not.toMatch(bannedClaim.pattern);
      }
    }
  });
});
