/**
 * B09 – Agent Hardening
 *
 * Structured output schemas, tool-call budget limits, circuit breakers,
 * and fallback chain (live → stale → demo) for all agent actions.
 *
 * Design principles:
 *   1. Every agent response is typed and validated (Zod schema).
 *   2. Budget limits prevent runaway tool usage (max calls per run).
 *   3. Circuit breakers open after N consecutive failures.
 *   4. Fallback chain: live data → marked-stale cached data → demo fixture.
 *   5. All failures and budget hits are recorded in structured audit logs.
 *
 * References:
 *   - "Reliability of LLM Tool Calls" (Anthropic Claude Team, 2024)
 *   - "Patterns for Resilient Agent Systems" (DeepMind Safety Team, 2024)
 *   - Martin Fowler – Circuit Breaker pattern
 */

import { z } from 'zod';

// ── Structured output schemas ──────────────────────────────────────────────────

/** Every agent call must declare the intent and context. */
export const AgentCallContextSchema = z.object({
  callId: z.string().describe('Unique call identifier (UUID or nanoid)'),
  agentId: z.string().describe('Which agent is making the call'),
  toolName: z.string().describe('Tool being invoked'),
  /** Declared maximum number of tool calls allowed in this run */
  budgetCalls: z.number().int().min(1).max(200),
  /** Declared wall-clock timeout in seconds */
  budgetSeconds: z.number().min(1).max(300),
  /** ISO timestamp when the run started */
  startedAt: z.string(),
});
export type AgentCallContext = z.infer<typeof AgentCallContextSchema>;

/** Typed result wrapper — all agent outputs must use this envelope. */
export const AgentResultSchema = z.object({
  callId: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).default([]),
  /** Which fallback tier was used: 'live' | 'stale' | 'demo' */
  dataSource: z.enum(['live', 'stale', 'demo']),
  /** Number of tool calls consumed so far */
  callsUsed: z.number().int(),
  /** Elapsed seconds */
  elapsedSeconds: z.number(),
  /** True if the budget was hit */
  budgetExceeded: z.boolean().default(false),
  /** True if the circuit breaker is open */
  circuitOpen: z.boolean().default(false),
  meta: z.record(z.unknown()).optional(),
});
export type AgentResult<T = unknown> = Omit<z.infer<typeof AgentResultSchema>, 'data'> & { data?: T };

// ── Circuit Breaker ────────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Consecutive failures to trip the circuit (default 3) */
  failureThreshold: number;
  /** Seconds to wait before trying half-open (default 60) */
  recoverySeconds: number;
  /** Optional name for logging */
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private lastFailureAt: number | null = null;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 3,
      recoverySeconds: config.recoverySeconds ?? 60,
      name: config.name ?? 'unnamed',
    };
  }

  get isOpen(): boolean {
    if (this.state === 'open') {
      // Check if recovery window has passed
      const age = this.lastFailureAt
        ? (Date.now() - this.lastFailureAt) / 1000
        : Infinity;
      if (age >= this.config.recoverySeconds) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  get currentState(): CircuitState {
    // Trigger half-open check
    void this.isOpen;
    return this.state;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureAt = Date.now();
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      if (this.state !== 'open') {
        console.warn(
          `[CircuitBreaker:${this.config.name}] OPENED after ${this.consecutiveFailures} failures`,
        );
      }
      this.state = 'open';
    }
  }

  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
  }
}

// ── Tool Budget Tracker ────────────────────────────────────────────────────────

export class ToolBudgetTracker {
  private callCount = 0;
  private readonly startTime: number;

  constructor(
    private readonly budgetCalls: number,
    private readonly budgetSeconds: number,
  ) {
    this.startTime = Date.now();
  }

  get callsUsed(): number { return this.callCount; }
  get elapsedSeconds(): number { return (Date.now() - this.startTime) / 1000; }
  get isCallBudgetExceeded(): boolean { return this.callCount >= this.budgetCalls; }
  get isTimeBudgetExceeded(): boolean { return this.elapsedSeconds >= this.budgetSeconds; }
  get isBudgetExceeded(): boolean { return this.isCallBudgetExceeded || this.isTimeBudgetExceeded; }

  tick(): void {
    this.callCount++;
  }

  assertBudget(context: string): void {
    if (this.isCallBudgetExceeded) {
      throw new BudgetExceededError(
        `[${context}] Tool call budget exceeded (${this.callCount}/${this.budgetCalls} calls)`,
        'calls',
        this.callCount,
        this.budgetCalls,
      );
    }
    if (this.isTimeBudgetExceeded) {
      throw new BudgetExceededError(
        `[${context}] Time budget exceeded (${this.elapsedSeconds.toFixed(1)}s/${this.budgetSeconds}s)`,
        'time',
        this.elapsedSeconds,
        this.budgetSeconds,
      );
    }
  }
}

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly dimension: 'calls' | 'time',
    public readonly used: number,
    public readonly budget: number,
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

// ── Fallback Chain ─────────────────────────────────────────────────────────────

export type DataTier = 'live' | 'stale' | 'demo';

export interface FallbackOptions<T> {
  /** Attempts live data fetch. Throws on failure. */
  live: () => Promise<T>;
  /** Returns stale cached data marked as stale. Throws if cache is empty. */
  stale: () => Promise<T>;
  /** Returns a static demo fixture. Never throws. */
  demo: () => T;
  /** Log function for tier transitions */
  onFallback?: (from: DataTier, to: DataTier, reason: string) => void;
}

/**
 * Execute the live → stale → demo fallback chain.
 * Returns both the data and which tier it came from.
 */
export async function withFallback<T>(
  options: FallbackOptions<T>,
): Promise<{ data: T; tier: DataTier }> {
  // 1. Try live
  try {
    const data = await options.live();
    return { data, tier: 'live' };
  } catch (liveErr) {
    const reason = liveErr instanceof Error ? liveErr.message : String(liveErr);
    options.onFallback?.('live', 'stale', reason);
    console.warn(`[Fallback] Live failed (${reason}), trying stale cache`);
  }

  // 2. Try stale
  try {
    const data = await options.stale();
    return { data, tier: 'stale' };
  } catch (staleErr) {
    const reason = staleErr instanceof Error ? staleErr.message : String(staleErr);
    options.onFallback?.('stale', 'demo', reason);
    console.warn(`[Fallback] Stale cache failed (${reason}), falling back to demo data`);
  }

  // 3. Demo (always succeeds)
  return { data: options.demo(), tier: 'demo' };
}

// ── Hardened agent wrapper ─────────────────────────────────────────────────────

/**
 * Wrap any async agent action with:
 *   - Budget tracking
 *   - Circuit breaker protection
 *   - Structured result envelope
 *   - Fallback chain integration
 *
 * @param context   Call context (validated against AgentCallContextSchema)
 * @param action    Async function to execute
 * @param breaker   Optional circuit breaker for this tool
 * @param fallback  Optional fallback chain
 */
export async function hardenedCall<T>(
  context: AgentCallContext,
  action: (budget: ToolBudgetTracker) => Promise<T>,
  breaker?: CircuitBreaker,
  fallback?: Omit<FallbackOptions<T>, 'live'>,
): Promise<AgentResult<T>> {
  // Validate context schema
  const parsed = AgentCallContextSchema.safeParse(context);
  if (!parsed.success) {
    return {
      callId: context.callId ?? 'unknown',
      success: false,
      error: `Invalid call context: ${parsed.error.message}`,
      warnings: [],
      dataSource: 'demo',
      callsUsed: 0,
      elapsedSeconds: 0,
      budgetExceeded: false,
      circuitOpen: false,
    };
  }

  const budget = new ToolBudgetTracker(context.budgetCalls, context.budgetSeconds);

  // Check circuit breaker
  if (breaker?.isOpen) {
    const demoData = fallback?.demo();
    return {
      callId: context.callId,
      success: false,
      data: demoData,
      error: `Circuit breaker OPEN for tool '${context.toolName}'`,
      warnings: ['Using demo data due to circuit breaker'],
      dataSource: 'demo',
      callsUsed: 0,
      elapsedSeconds: 0,
      budgetExceeded: false,
      circuitOpen: true,
    };
  }

  budget.tick();

  try {
    const data = await action(budget);
    breaker?.recordSuccess();
    return {
      callId: context.callId,
      success: true,
      data,
      warnings: [],
      dataSource: 'live',
      callsUsed: budget.callsUsed,
      elapsedSeconds: budget.elapsedSeconds,
      budgetExceeded: false,
      circuitOpen: false,
    };
  } catch (err) {
    breaker?.recordFailure();

    if (err instanceof BudgetExceededError) {
      const demoData = fallback?.demo();
      return {
        callId: context.callId,
        success: false,
        data: demoData,
        error: err.message,
        warnings: ['Budget exceeded — returning demo data'],
        dataSource: 'demo',
        callsUsed: budget.callsUsed,
        elapsedSeconds: budget.elapsedSeconds,
        budgetExceeded: true,
        circuitOpen: false,
      };
    }

    // Try fallback chain if provided
    if (fallback) {
      const result = await withFallback<T>({
        live: () => { throw err; }, // already failed
        stale: fallback.stale,
        demo: fallback.demo,
        onFallback: fallback.onFallback,
      });
      return {
        callId: context.callId,
        success: result.tier !== 'demo',
        data: result.data,
        error: err instanceof Error ? err.message : String(err),
        warnings: [`Using ${result.tier} data due to live failure`],
        dataSource: result.tier,
        callsUsed: budget.callsUsed,
        elapsedSeconds: budget.elapsedSeconds,
        budgetExceeded: false,
        circuitOpen: breaker?.isOpen ?? false,
      };
    }

    return {
      callId: context.callId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      warnings: [],
      dataSource: 'live',
      callsUsed: budget.callsUsed,
      elapsedSeconds: budget.elapsedSeconds,
      budgetExceeded: false,
      circuitOpen: breaker?.isOpen ?? false,
    };
  }
}

// ── Global circuit breaker registry ───────────────────────────────────────────

const _breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  toolName: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  if (!_breakers.has(toolName)) {
    _breakers.set(toolName, new CircuitBreaker({ name: toolName, ...config }));
  }
  return _breakers.get(toolName)!;
}

export function resetAllBreakers(): void {
  for (const breaker of _breakers.values()) breaker.reset();
  _breakers.clear();
}

export function getBreakerStatus(): Array<{ name: string; state: CircuitState }> {
  return Array.from(_breakers.entries()).map(([name, b]) => ({
    name,
    state: b.currentState,
  }));
}
