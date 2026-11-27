import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFunnelEventLog,
  msSinceLanding,
  trackFirstArtifact,
} from '../../src/lib/analytics';

const store = new Map<string, string>();
const sessionStore = new Map<string, string>();

const stubWindow = (plausible: unknown) =>
  vi.stubGlobal('window', {
    plausible,
    sessionStorage: {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, value);
      },
      removeItem: (key: string) => {
        sessionStore.delete(key);
      },
      clear: () => sessionStore.clear(),
    },
  });

beforeEach(() => {
  store.clear();
  sessionStore.clear();
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
  stubWindow(vi.fn());
  vi.stubGlobal('performance', { now: vi.fn(() => 1234) });
});

describe('trackFirstArtifact — shared activation event', () => {
  it('emits a first_artifact event with artifact name and ms_since_landing', () => {
    const plausible = vi.fn();
    stubWindow(plausible);

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
    stubWindow(plausible);
    trackFirstArtifact('byo_csv_proof_report', { sample: 'identifier_risk' });
    const props = plausible.mock.calls[0][1].props;
    expect(props.sample).toBe('identifier_risk');
    expect(props.artifact).toBe('byo_csv_proof_report');
  });

  it('emits at most once per browser session', () => {
    const plausible = vi.fn();
    const sessionStore = new Map<string, string>();
    vi.stubGlobal('window', {
      plausible,
      sessionStorage: {
        getItem: (key: string) => sessionStore.get(key) ?? null,
        setItem: (key: string, value: string) => {
          sessionStore.set(key, value);
        },
      },
    });

    trackFirstArtifact('tier_cfo_memo', { format: 'pdf' });
    trackFirstArtifact('tier_cfo_memo', { format: 'html' });
    trackFirstArtifact('byo_csv_proof_report');

    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible.mock.calls[0][0]).toBe('first_artifact');
    const log = getFunnelEventLog();
    expect(log.filter((record) => record.event === 'first_artifact').length).toBe(1);
  });

  it('emits best-effort when sessionStorage throws', () => {
    // Storage-unavailable semantics: the marker cannot be read or written, so
    // the event still fires once per call (dedupe degrades, delivery does not).
    const plausible = vi.fn();
    vi.stubGlobal('window', {
      plausible,
      sessionStorage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
      },
    });

    trackFirstArtifact('tier_cfo_memo', { format: 'pdf' });

    expect(plausible).toHaveBeenCalledTimes(1);
  });
});

describe('msSinceLanding', () => {
  it('returns a non-negative number when performance is available', () => {
    const ms = msSinceLanding();
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThanOrEqual(0);
  });
});

describe('first-artifact timing semantics', () => {
  const freshSessionStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (k: string): string | null => store.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        store.set(k, v);
      },
    };
  };

  it('dedupe is session-scoped — a simulated reload (fresh sessionStorage) re-fires once', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', { plausible, sessionStorage: freshSessionStorage() });
    trackFirstArtifact('tier_cfo_memo');
    trackFirstArtifact('tier_cfo_memo');
    expect(plausible).toHaveBeenCalledTimes(1);
    vi.stubGlobal('window', { plausible, sessionStorage: freshSessionStorage() });
    trackFirstArtifact('tier_cfo_memo');
    expect(plausible).toHaveBeenCalledTimes(2);
  });

  it('ms_since_landing is null, not a crash, when performance is unavailable', () => {
    const plausible = vi.fn();
    vi.stubGlobal('performance', undefined);
    vi.stubGlobal('window', { plausible, sessionStorage: freshSessionStorage() });
    trackFirstArtifact('tier_cfo_memo');
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible.mock.calls[0][1].props.ms_since_landing).toBeNull();
  });
});
