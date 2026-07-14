import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/pricingCatalog', () => ({
  CEIP_PRICING: {
    direct: { free: 0, consumer_watchdog: 9, professional: 149, industrial_tier: 1500, municipal: 5900, sovereign: 2500 },
    whop: { whop_basic: 29, whop_pro: 99, whop_team: 299 },
    currency: 'USD',
  },
}));

describe('whop', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('isWhopLiveMode', () => {
    it('returns false in standalone mode (default)', async () => {
      vi.stubEnv('VITE_WHOP_MODE', '');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', '');
      const { isWhopLiveMode } = await import('../../src/lib/whop');
      expect(isWhopLiveMode()).toBe(false);
    });

    it('returns false when mode is live but client ID is empty', async () => {
      vi.stubEnv('VITE_WHOP_MODE', 'live');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', '');
      const { isWhopLiveMode } = await import('../../src/lib/whop');
      expect(isWhopLiveMode()).toBe(false);
    });

    it('returns true when mode is live and client ID is set', async () => {
      vi.stubEnv('VITE_WHOP_MODE', 'live');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', 'test-client-id');
      const { isWhopLiveMode } = await import('../../src/lib/whop');
      expect(isWhopLiveMode()).toBe(true);
    });
  });

  describe('isStandaloneMode', () => {
    it('returns true in standalone mode', async () => {
      vi.stubEnv('VITE_WHOP_MODE', 'standalone');
      const { isStandaloneMode } = await import('../../src/lib/whop');
      expect(isStandaloneMode()).toBe(true);
    });

    it('returns false in live mode', async () => {
      vi.stubEnv('VITE_WHOP_MODE', 'live');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', 'test-id');
      const { isStandaloneMode } = await import('../../src/lib/whop');
      expect(isStandaloneMode()).toBe(false);
    });
  });

  describe('getWhopConfigStatus', () => {
    it('returns standalone config when no mode set', async () => {
      vi.stubEnv('VITE_WHOP_MODE', '');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', '');
      const { getWhopConfigStatus } = await import('../../src/lib/whop');
      const status = getWhopConfigStatus();
      expect(status.mode).toBe('standalone');
      expect(status.ready).toBe(true);
    });

    it('returns live config when mode and client ID are set', async () => {
      vi.stubEnv('VITE_WHOP_MODE', 'live');
      vi.stubEnv('VITE_WHOP_CLIENT_ID', 'test-id');
      const { getWhopConfigStatus } = await import('../../src/lib/whop');
      const status = getWhopConfigStatus();
      expect(status.mode).toBe('live');
      expect(status.ready).toBe(true);
      expect(status.hasClientId).toBe(true);
    });
  });
});
