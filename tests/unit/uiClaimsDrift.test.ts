import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '../../src/components/AboutPage';
import { FeatureAvailability } from '../../src/components/FeatureAvailability';

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
});
