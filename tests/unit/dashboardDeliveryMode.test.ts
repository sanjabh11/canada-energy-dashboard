import { describe, expect, it } from 'vitest';
import { resolveDashboardDeliveryMode } from '../../src/lib/dashboardDeliveryMode';

describe('resolveDashboardDeliveryMode', () => {
  it('prefers unavailable when there is no data', () => {
    expect(
      resolveDashboardDeliveryMode({
        hasData: false,
        usingCachedSnapshot: false,
      }),
    ).toBe('unavailable');
  });

  it('prefers browser cache over persisted snapshot metadata when the current render came from local cache', () => {
    expect(
      resolveDashboardDeliveryMode({
        hasData: true,
        usingCachedSnapshot: true,
        snapshotType: 'persisted_snapshot',
        isFallback: true,
      }),
    ).toBe('browser_cache');
  });

  it('returns persisted snapshot when server metadata marks the response as backend fallback', () => {
    expect(
      resolveDashboardDeliveryMode({
        hasData: true,
        usingCachedSnapshot: false,
        snapshotType: 'persisted_snapshot',
        isFallback: true,
      }),
    ).toBe('persisted_snapshot');
  });

  it('returns live for authoritative source-backed responses', () => {
    expect(
      resolveDashboardDeliveryMode({
        hasData: true,
        usingCachedSnapshot: false,
        snapshotType: 'live',
        isFallback: false,
      }),
    ).toBe('live');
  });
});
