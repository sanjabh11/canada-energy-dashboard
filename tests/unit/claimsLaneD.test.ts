/**
 * Lane D — G12/G13/G15/G16 claims and acquisition-removal assertions.
 *
 * Grep-level guards over owned surfaces:
 * - Whop acquisition copy is absent from pages/SEO the lane owns.
 * - The canonical positioning sentence is present in README + pricing copy.
 * - The canonical suppression registry exists with the required schema.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

const CANONICAL_POSITIONING =
  'TIER = current focused pilot hypothesis (desk-research validated only); utility forecasting = documented fallback pending buyer evidence';

// Acquisition-promotion strings that must not appear on owned surfaces.
const WHOP_ACQUISITION_PATTERNS = [
  /Powered by Whop/i,
  /Join (on )?Whop/i,
  /whop\.com\/checkout/i,
  /Sign (up|in) with Whop(?! \(existing members\))/i, // OAuth sign-in CTA removed
  /Whop marketplace/i,
  /free trial/i,
  /wedge/i,
];

const OWNED_PAGE_FILES = [
  'src/components/WhopDiscoverPage.tsx',
  'src/components/PricingPage.tsx',
  'src/components/TIERComplianceLandingPage.tsx',
  'src/components/WhopDashboardPage.tsx',
  'src/components/WhopExperiencePage.tsx',
];

describe('Lane D — Whop acquisition removal (G12)', () => {
  it.each(OWNED_PAGE_FILES)('%s carries no Whop acquisition CTA/marketing', (file) => {
    const source = read(file);
    for (const pattern of WHOP_ACQUISITION_PATTERNS) {
      expect(source, `${file} matches ${pattern}`).not.toMatch(pattern);
    }
  });

  it('AuthModal no longer offers the dead Whop OAuth sign-in path', () => {
    const source = read('src/components/auth/AuthModal.tsx');
    expect(source).not.toContain('getWhopLoginUrl');
    expect(source).not.toContain('handleWhopLogin');
  });

  it('sitemap does not index Whop routes', () => {
    const sitemap = read('public/sitemap.xml');
    expect(sitemap).not.toContain('/whop');
  });

  it('index.html carries no Whop marketing meta', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/whop/i);
  });
});

describe('Lane D — claims reconciliation (G13/G16)', () => {
  it('public home page labels workflow and timing claims as unvalidated hypotheses', () => {
    const home = read('src/components/CommercialLandingPage.tsx');
    expect(home).toContain('buyer validation pending');
    expect(home).toContain('Buyer demand, delivery time, pricing, savings, and procurement fit have');
    expect(home).toContain('Proposed workflow concepts');
    expect(home).not.toMatch(/sellable proof packs|target pilot path|30 to 60 day pilots|under ninety/i);
  });

  it('landfill screening copy cites final regulations and the ECCC assessment tool', () => {
    const landfill = read('src/components/LandfillMethane.tsx');
    expect(landfill).toContain('Landfill Methane Regulations in December 2025');
    expect(landfill).toContain('Landfill Methane Modelling Tool');
    expect(landfill).not.toContain('Proposed federal regulations');
    expect(landfill).not.toContain('58% of Canadian landfill methane is currently uncontrolled');
  });

  it('README carries the canonical positioning sentence', () => {
    expect(read('README.md')).toContain(CANONICAL_POSITIONING);
  });

  it('pricing copy carries the canonical positioning sentence', () => {
    // Prettier reflows JSX text across lines — normalize whitespace so the
    // canonical sentence is matched on content, not literal line breaks.
    const squashed = read('src/components/PricingPage.tsx').replace(/\s+/g, ' ');
    expect(squashed).toContain(CANONICAL_POSITIONING);
  });

  it.each(['README.md', 'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md', 'docs/marketing/MESSAGING_HIERARCHY.md'])(
    '%s contains no unsupported ROI/testimonial/timing promises',
    (file) => {
      const source = read(file);
      expect(source).not.toMatch(/776%/);
      expect(source).not.toMatch(/memo in minutes/i);
      expect(source).not.toMatch(/ready to sell/i);
      expect(source).not.toMatch(/guaranteed ROI/i);
    },
  );
});

describe('Lane D — suppression registry (G15)', () => {
  const REGISTRY = 'docs/growth/SUPPRESSION_REGISTRY_LIVE.csv';

  it('canonical suppression registry exists with the required columns', () => {
    const filePath = path.join(repoRoot, REGISTRY);
    expect(existsSync(filePath)).toBe(true);
    const header = read(REGISTRY)
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#'));
    expect(header).toBe('email,domain,reason,source,suppressed_at,suppressed_by');
  });

  it.each([
    'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
    'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
    'docs/growth/GTM_CHANNEL_ROLE_MATRIX.md',
    'docs/growth/CEIP_CANADA_OUTREACH_AND_IMMIGRATION_MATRIX.md',
    'docs/sales/BATTLE_CARD_ORENNIA.md',
    'docs/marketing/MESSAGING_HIERARCHY.md',
  ])('%s references the canonical suppression registry', (file) => {
    expect(read(file)).toContain('SUPPRESSION_REGISTRY_LIVE.csv');
  });

  it.each([
    'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
    'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
    'docs/growth/CEIP_CANADA_OUTREACH_AND_IMMIGRATION_MATRIX.md',
  ])('%s requires the CASL consent-basis checklist fields', (file) => {
    const source = read(file);
    for (const needle of [
      'consent_basis',
      'consent_source',
      'consent_date',
      'unsubscribe',
      'sender',
    ]) {
      expect(source.toLowerCase(), `${file} missing "${needle}"`).toContain(
        needle.toLowerCase(),
      );
    }
  });
});
