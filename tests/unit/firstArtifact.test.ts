import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFunnelEventLog,
  msSinceLanding,
  trackFirstArtifact,
} from '../../src/lib/analytics';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  vi.stubGlobal('window', { plausible: vi.fn() });
});

describe('trackFirstArtifact — shared activation event', () => {
  it('emits a first_artifact event with artifact name and ms_since_landing', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', { plausible });

    trackFirstArtifact('tier_cfo_memo', { format: 'pdf' });

    expect(plausible).toHaveBeenCalledTimes(1);
    const [event, options] = plausible.mock.calls[0];
    expect(event).toBe('first_artifact');
    expect(options.props.artifact).toBe('tier_cfo_memo');
    expect(options.props.format).toBe('pdf');
    expect(typeof options.props.ms_since_landing).toBe('number');
    expect(options.props.ms_since_landing).toBeGreaterThanOrEqual(0);
  });

  it('persists the event in the local funnel log', () => {
    trackFirstArtifact('byo_csv_proof_report');
    const log = getFunnelEventLog();
    expect(log.length).toBe(1);
    expect(log[0].event).toBe('first_artifact');
    expect(log[0].props.artifact).toBe('byo_csv_proof_report');
    expect(typeof log[0].props.ms_since_landing).toBe('number');
  });

  it('merges caller props without dropping artifact identity', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', { plausible });
    trackFirstArtifact('byo_csv_proof_report', { sample: 'identifier_risk' });
    const props = plausible.mock.calls[0][1].props;
    expect(props.sample).toBe('identifier_risk');
    expect(props.artifact).toBe('byo_csv_proof_report');
  });
});

describe('msSinceLanding', () => {
  it('returns a non-negative number when performance is available', () => {
    const ms = msSinceLanding();
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThanOrEqual(0);
  });
});
