import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WhopDiscoverPage } from '../../src/components/WhopDiscoverPage';
import { whopClient } from '../../src/lib/whop';

describe('legacy Whop route', () => {
  it('keeps existing-member billing access without exposing acquisition checkout', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(WhopDiscoverPage)),
    );

    expect(html).toContain('Manage an existing Whop membership');
    expect(html).toContain('https://whop.com/hub/settings/memberships');
    expect(html).toContain('New Whop memberships are not offered here');
    expect(html).not.toContain('ignite-be15');
    expect(html).not.toContain('Get Started');
    expect(html).not.toContain('View Pricing');
  });

  it('routes legacy upgrade calls to the existing-member page rather than Whop checkout', () => {
    expect(whopClient.getUpgradeUrl('pro')).toBe('/whop/discover');
    expect(whopClient.getUpgradeUrl('team')).toBe('/whop/discover');
  });
});
