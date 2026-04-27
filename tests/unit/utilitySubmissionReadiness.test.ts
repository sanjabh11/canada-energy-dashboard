import { describe, expect, it } from 'vitest';
import {
  buildOntarioSubmissionSprintBundle,
  renderDemoEvidenceMarkdown,
  renderSubmissionPacketMarkdown,
} from '../../src/lib/utilitySubmissionReadiness';

describe('utilitySubmissionReadiness', () => {
  it('builds London Hydro primary and Alectra reserve packets with canonical public legal links', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: 'https://ceip.example.com',
      bridgeBaseUrl: 'https://gb.ceip.example.com',
      currentOrigin: 'https://ceip.example.com',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(bundle.packets).toHaveLength(2);
    expect(bundle.packets.map((packet) => `${packet.utility_name}:${packet.phase}`)).toEqual([
      'London Hydro:primary',
      'Alectra Utilities:reserve',
    ]);
    expect(bundle.utility_security_statement_url).toBe('https://ceip.example.com/utility-security');
    expect(bundle.utility_connector_base_url).toBe('https://gb.ceip.example.com');
    expect(bundle.readiness_tracks.find((track) => track.label === 'Production submission readiness')?.status).toBe('blocked');
    expect(bundle.readiness_tracks.find((track) => track.label === 'Staging internet readiness')?.status).toBe('blocked');
    expect(bundle.submission_gate.find((item) => item.label === 'Current browser origin matches configured app URL')?.status).toBe('ready');
    expect(bundle.submission_gate.find((item) => item.label === 'Custom Green Button bridge host configured and live')?.status).toBe('ready');
    expect(bundle.submission_gate.find((item) => item.label === 'Configured hosts are canonical production submission hosts')?.status).toBe('ready');
    expect(bundle.submission_gate.find((item) => item.label === 'Signer-backed provenance is required for London Hydro bridge mode')?.status).toBe('ready');
    expect(bundle.submission_gate.find((item) => item.label === 'Outbound TLS mode confirmed (server_tls or mtls_upstream)')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Burner staging domain registered and routed')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Public callback reachability evidence exists')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Private bridge contract evidence exists')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Utility-facing TLS evidence exists')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Ontario corporation formed and legal company name locked')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.find((item) => item.label === 'Parent domain registered to the final name / brand')?.status).toBe('operator_supplied');
    expect(bundle.submission_gate.some((item) => item.label === 'Public utility security statement')).toBe(true);
    expect(bundle.claim_guardrails.some((item) => item.includes('Ontario-wide certification'))).toBe(true);
    expect(bundle.claim_guardrails.some((item) => item.includes('UtilityAPI'))).toBe(true);
    expect(bundle.claim_guardrails.some((item) => item.includes('drop-in env swap'))).toBe(true);
    expect(bundle.claim_guardrails.some((item) => item.includes('NERC CIP applicability'))).toBe(true);
    expect(bundle.has_blocking_repo_misconfiguration).toBe(false);
    expect(bundle.packets[0]?.submission_status).toBe('do_not_submit_yet');
    expect(bundle.packets[0]?.field_mappings.some((field) => field.label === 'Application description / marketplace copy')).toBe(true);
    expect(bundle.packets[0]?.field_mappings.some((field) => field.label === 'Business contact pack')).toBe(true);
    expect(bundle.packets[0]?.field_mappings.find((field) => field.label === 'OAuth redirect URL')?.value).toBe('https://gb.ceip.example.com/cmd/callback?utility_name=London%20Hydro');
  });

  it('marks missing canonical app URL as misconfigured and avoids localhost submission artifacts', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      bridgeBaseUrl: 'https://gb.ceip.example.com',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(bundle.canonical_app_url).toBe('');
    expect(bundle.has_blocking_repo_misconfiguration).toBe(true);
    expect(bundle.submission_gate.find((item) => item.label === 'Custom frontend host configured and live')?.status).toBe('misconfigured');
    expect(bundle.warnings.some((warning) => warning.includes('VITE_PUBLIC_APP_URL'))).toBe(true);
    expect(bundle.packets[0]?.field_mappings.find((field) => field.label === 'Application / portal login page URL')?.value).toContain('<set-VITE_PUBLIC_APP_URL>');
  });

  it('marks missing bridge host as misconfigured and avoids supabase callback artifacts in the submission packet', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: 'https://ceip.example.com',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(bundle.has_blocking_repo_misconfiguration).toBe(true);
    expect(bundle.submission_gate.find((item) => item.label === 'Custom Green Button bridge host configured and live')?.status).toBe('misconfigured');
    expect(bundle.warnings.some((warning) => warning.includes('VITE_UTILITY_CONNECTOR_BASE_URL'))).toBe(true);
    expect(bundle.packets[0]?.field_mappings.find((field) => field.label === 'OAuth redirect URL')?.value).toContain('<set-VITE_UTILITY_CONNECTOR_BASE_URL>');
  });

  it('marks origin mismatch as misconfigured even when the canonical app URL is set', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: 'https://ceip.example.com',
      bridgeBaseUrl: 'https://gb.ceip.example.com',
      currentOrigin: 'http://127.0.0.1:5173',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(bundle.has_blocking_repo_misconfiguration).toBe(true);
    expect(bundle.submission_gate.find((item) => item.label === 'Current browser origin matches configured app URL')?.status).toBe('misconfigured');
    expect(bundle.warnings.some((warning) => warning.includes('does not match the canonical production URL'))).toBe(true);
  });

  it('keeps burner staging hosts on the staging fast path while blocking production submission', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: 'https://app-staging.burner-ceip.dev',
      bridgeBaseUrl: 'https://gb-staging.burner-ceip.dev',
      currentOrigin: 'https://app-staging.burner-ceip.dev',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(bundle.readiness_tracks.find((track) => track.label === 'Staging internet readiness')?.status).toBe('ready');
    expect(bundle.readiness_tracks.find((track) => track.label === 'Production submission readiness')?.status).toBe('blocked');
    expect(bundle.readiness_tracks.find((track) => track.label === 'Staging internet readiness')?.blockers.some((item) => item.includes('UtilityAPI'))).toBe(true);
    expect(bundle.submission_gate.find((item) => item.label === 'Configured hosts are canonical production submission hosts')?.status).toBe('misconfigured');
    expect(bundle.warnings.some((warning) => warning.includes('burner staging hosts'))).toBe(true);
    expect(bundle.packets[0]?.submission_status).toBe('do_not_submit_yet');
  });

  it('renders packet and demo evidence markdown with claim guardrails', () => {
    const bundle = buildOntarioSubmissionSprintBundle({
      canonicalAppUrl: 'https://ceip.example.com',
      bridgeBaseUrl: 'https://gb.ceip.example.com',
      currentOrigin: 'https://ceip.example.com',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    const londonPacket = bundle.packets[0]!;
    const packetMarkdown = renderSubmissionPacketMarkdown(londonPacket);
    const demoMarkdown = renderDemoEvidenceMarkdown(bundle);

    expect(packetMarkdown).toContain('# London Hydro Submission Packet');
    expect(packetMarkdown).toContain('Usage Information');
    expect(packetMarkdown).toContain('Claims To Avoid');
    expect(packetMarkdown).toContain('Terms acceptance prerequisites');
    expect(packetMarkdown).toContain('Connectivity bridge callback forwarding target');
    expect(demoMarkdown).toContain('# Ontario Green Button Demo Evidence Pack');
    expect(demoMarkdown).toContain('## Readiness Tracks');
    expect(demoMarkdown).toContain('Production submission readiness');
    expect(demoMarkdown).toContain('Layer A callback reachability evidence');
    expect(demoMarkdown).toContain('signer-verified bridge contract evidence');
    expect(demoMarkdown).toContain('Outbound TLS mode confirmed');
    expect(demoMarkdown).toContain('Ontario corporation formed and legal company name locked');
    expect(demoMarkdown).toContain('Ontario-wide certification');
  });
});
