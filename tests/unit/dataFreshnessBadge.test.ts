import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataFreshnessBadge } from '../../src/components/ui/DataFreshnessBadge';

describe('DataFreshnessBadge', () => {
  it('renders demo data state when overridden', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataFreshnessBadge, {
        timestamp: '2026-02-01T00:00:00.000Z',
        status: 'demo',
        source: 'IESO Public Reports',
      }),
    );

    expect(html).toContain('Demo Data');
    expect(html).toContain('IESO Public Reports');
  });

  it('renders stale state for older timestamps', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataFreshnessBadge, {
        timestamp: '2026-01-01T00:00:00.000Z',
        staleThresholdMinutes: 60,
      }),
    );

    expect(html).toContain('Stale');
  });
});
