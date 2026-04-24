import React from 'react';
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
});
