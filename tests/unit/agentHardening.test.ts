/**
 * Unit tests for B09 – Agent Hardening
 * Tests circuit breaker, budget tracker, fallback chain, and hardenedCall wrapper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  ToolBudgetTracker,
  BudgetExceededError,
  withFallback,
  hardenedCall,
  resetAllBreakers,
  getCircuitBreaker,
} from '../../src/lib/agentHardening.ts';
import type { AgentCallContext } from '../../src/lib/agentHardening.ts';

function makeContext(overrides: Partial<AgentCallContext> = {}): AgentCallContext {
  return {
    callId: 'test-call-001',
    agentId: 'test-agent',
    toolName: 'test-tool',
    budgetCalls: 10,
    budgetSeconds: 30,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Circuit Breaker ─────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const cb = new CircuitBreaker();
    expect(cb.isOpen).toBe(false);
    expect(cb.currentState).toBe('closed');
  });

  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen).toBe(true);
  });

  it('resets to closed on success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen).toBe(true);
    cb.recordSuccess();
    expect(cb.isOpen).toBe(false);
  });

  it('transitions to half-open after recovery window', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, recoverySeconds: 0.01 });
    cb.recordFailure();
    expect(cb.isOpen).toBe(true);
    await new Promise((r) => setTimeout(r, 15)); // wait > 10ms
    expect(cb.isOpen).toBe(false); // half-open now allows one attempt
    expect(cb.currentState).toBe('half-open');
  });

  it('manual reset clears all state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure();
    cb.reset();
    expect(cb.isOpen).toBe(false);
    expect(cb.currentState).toBe('closed');
  });
});

// ── Tool Budget Tracker ─────────────────────────────────────────────────────

describe('ToolBudgetTracker', () => {
  it('starts at zero calls', () => {
    const t = new ToolBudgetTracker(10, 30);
    expect(t.callsUsed).toBe(0);
    expect(t.isBudgetExceeded).toBe(false);
  });

  it('tracks calls', () => {
    const t = new ToolBudgetTracker(5, 30);
    t.tick(); t.tick(); t.tick();
    expect(t.callsUsed).toBe(3);
    expect(t.isCallBudgetExceeded).toBe(false);
    t.tick(); t.tick();
    expect(t.isCallBudgetExceeded).toBe(true);
  });

  it('assertBudget throws BudgetExceededError on call overflow', () => {
    const t = new ToolBudgetTracker(1, 30);
    t.tick(); // uses the 1 budget
    t.tick(); // exceeds
    expect(() => t.assertBudget('test')).toThrow(BudgetExceededError);
  });
});

// ── Fallback Chain ──────────────────────────────────────────────────────────

describe('withFallback', () => {
  it('returns live data on success', async () => {
    const result = await withFallback({
      live: async () => 'live-data',
      stale: async () => 'stale-data',
      demo: () => 'demo-data',
    });
    expect(result.data).toBe('live-data');
    expect(result.tier).toBe('live');
  });

  it('falls back to stale on live failure', async () => {
    const result = await withFallback({
      live: async () => { throw new Error('live-error'); },
      stale: async () => 'stale-data',
      demo: () => 'demo-data',
    });
    expect(result.data).toBe('stale-data');
    expect(result.tier).toBe('stale');
  });

  it('falls back to demo when both live and stale fail', async () => {
    const result = await withFallback({
      live: async () => { throw new Error('live-error'); },
      stale: async () => { throw new Error('stale-error'); },
      demo: () => 'demo-data',
    });
    expect(result.data).toBe('demo-data');
    expect(result.tier).toBe('demo');
  });

  it('calls onFallback callback for each tier transition', async () => {
    const transitions: Array<[string, string, string]> = [];
    await withFallback({
      live: async () => { throw new Error('live-error'); },
      stale: async () => { throw new Error('stale-error'); },
      demo: () => 'demo-data',
      onFallback: (from, to, reason) => transitions.push([from, to, reason]),
    });
    expect(transitions).toHaveLength(2);
    expect(transitions[0][0]).toBe('live');
    expect(transitions[1][0]).toBe('stale');
  });
});

// ── hardenedCall ────────────────────────────────────────────────────────────

describe('hardenedCall', () => {
  beforeEach(() => resetAllBreakers());

  it('returns success result for successful action', async () => {
    const result = await hardenedCall(
      makeContext(),
      async () => ({ answer: 42 }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ answer: 42 });
    expect(result.dataSource).toBe('live');
    expect(result.budgetExceeded).toBe(false);
    expect(result.circuitOpen).toBe(false);
  });

  it('returns error result for failed action without fallback', async () => {
    const result = await hardenedCall(
      makeContext(),
      async () => { throw new Error('action-failed'); },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('action-failed');
  });

  it('uses demo fallback when circuit breaker is open', async () => {
    const breaker = getCircuitBreaker('my-tool', { failureThreshold: 1 });
    breaker.recordFailure(); // trip the breaker

    const result = await hardenedCall(
      makeContext({ toolName: 'my-tool' }),
      async () => 'live',
      breaker,
      { stale: async () => 'stale', demo: () => 'demo-fixture' },
    );
    expect(result.circuitOpen).toBe(true);
    expect(result.data).toBe('demo-fixture');
    expect(result.dataSource).toBe('demo');
  });

  it('falls back to stale on action failure', async () => {
    const result = await hardenedCall(
      makeContext(),
      async () => { throw new Error('live-fail'); },
      undefined,
      {
        stale: async () => 'stale-value',
        demo: () => 'demo-value',
      },
    );
    expect(result.dataSource).toBe('stale');
    expect(result.data).toBe('stale-value');
  });

  it('falls back to demo when both fail', async () => {
    const result = await hardenedCall(
      makeContext(),
      async () => { throw new Error('live-fail'); },
      undefined,
      {
        stale: async () => { throw new Error('stale-fail'); },
        demo: () => 'demo-value',
      },
    );
    expect(result.dataSource).toBe('demo');
    expect(result.data).toBe('demo-value');
  });

  it('returns error for invalid context schema', async () => {
    const badContext = { callId: 'x', agentId: 'a' } as AgentCallContext;
    const result = await hardenedCall(badContext, async () => 'ok');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid call context');
  });
});
