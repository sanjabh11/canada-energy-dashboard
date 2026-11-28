import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLeadIntakeDisclosure, isLeadIntakeEnabled, persistLeadIntake } from '../../src/lib/leadIntake';

const approvedConfig = {
  VITE_ENABLE_LEAD_INTAKE: 'true',
  VITE_PRIVACY_NOTICE_APPROVED: 'true',
  VITE_PRIVACY_CONTACT_NAME: 'Privacy Owner',
  VITE_PRIVACY_CONTACT_EMAIL: 'privacy@example.test',
  VITE_PRIVACY_POLICIES_URL: 'https://example.test/privacy',
  VITE_PRIVACY_PROCESSING_LOCATIONS: 'Verified service regions',
  VITE_PRIVACY_RETENTION_SUMMARY: 'Retained for 90 days',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('lead intake collection gate', () => {
  it('stays disabled when the feature flag or approved disclosure is missing', () => {
    expect(isLeadIntakeEnabled({})).toBe(false);
    expect(isLeadIntakeEnabled({ ...approvedConfig, VITE_ENABLE_LEAD_INTAKE: 'false' })).toBe(false);
    expect(isLeadIntakeEnabled({ ...approvedConfig, VITE_PRIVACY_NOTICE_APPROVED: 'false' })).toBe(false);
    expect(isLeadIntakeEnabled({ ...approvedConfig, VITE_PRIVACY_CONTACT_EMAIL: '' })).toBe(false);
  });

  it('requires a valid email, processing locations, and retention details', () => {
    expect(getLeadIntakeDisclosure(approvedConfig)).toEqual({
      contactName: 'Privacy Owner',
      contactEmail: 'privacy@example.test',
      policiesUrl: 'https://example.test/privacy',
      processingLocations: 'Verified service regions',
      retentionSummary: 'Retained for 90 days',
    });
    expect(getLeadIntakeDisclosure({ ...approvedConfig, VITE_PRIVACY_CONTACT_EMAIL: 'not-an-email' })).toBeNull();
    expect(getLeadIntakeDisclosure({ ...approvedConfig, VITE_PRIVACY_CONTACT_NAME: '' })).toBeNull();
    expect(getLeadIntakeDisclosure({ ...approvedConfig, VITE_PRIVACY_POLICIES_URL: 'http://example.test/privacy' })).toBeNull();
    expect(getLeadIntakeDisclosure({ ...approvedConfig, VITE_PRIVACY_PROCESSING_LOCATIONS: ' ' })).toBeNull();
    expect(getLeadIntakeDisclosure({ ...approvedConfig, VITE_PRIVACY_RETENTION_SUMMARY: '' })).toBeNull();
  });

  it('enables collection only when both the switch and full disclosure are present', () => {
    expect(isLeadIntakeEnabled(approvedConfig)).toBe(true);
  });

  it('blocks every intake client call before fetch when the collection gate is off', async () => {
    vi.stubEnv('VITE_ENABLE_LEAD_INTAKE', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await persistLeadIntake({
      company_name: 'Example Co',
      contact_name: 'Example Contact',
      email: 'person@example.test',
      source_route: '/enterprise',
      channel: 'direct',
      segment: 'industrial',
      campaign_id: 'test',
    });

    expect(result).toEqual({ ok: false, error: 'privacy_notice_unapproved' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
