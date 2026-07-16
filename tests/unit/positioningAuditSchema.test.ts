import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const AUDIT_DIR = path.join(process.cwd(), '.positioning-audit');

function readJson(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(AUDIT_DIR, filename), 'utf8'));
}

function readArtifact(filename: string): string {
  return readFileSync(path.join(AUDIT_DIR, 'artifacts', filename), 'utf8');
}

describe('positioning audit schema validity', () => {
  const state = readJson('state.json') as Record<string, unknown>;
  const evidenceCorpus = readJson('evidence-corpus.json') as Record<string, unknown>;
  const experiments = readJson('experiments.json') as Record<string, unknown>;
  const hypotheses = readJson('hypotheses.json') as Record<string, unknown>;

  it('state.json declares schema_version', () => {
    expect(state.schema_version).toBeDefined();
  });

  it('state.json hypotheses is an array', () => {
    expect(Array.isArray(state.hypotheses)).toBe(true);
  });

  it('state.json gates_passed is an array of objects', () => {
    expect(Array.isArray(state.gates_passed)).toBe(true);
    if ((state.gates_passed as unknown[]).length > 0) {
      expect(typeof (state.gates_passed as unknown[])[0]).toBe('object');
    }
  });

  it('state.json phases_completed contains strings not numbers', () => {
    const phases = state.phases_completed as unknown[];
    expect(phases.every((p) => typeof p === 'string')).toBe(true);
  });

  it('state.json completed_at is ISO date-time or null', () => {
    const v = state.completed_at;
    if (v !== null && v !== undefined) {
      expect(typeof v).toBe('string');
      expect(String(v).length).toBeGreaterThan(10);
      expect(String(v)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('state.json has product_context field', () => {
    expect(state.product_context).toBeDefined();
  });

  it('evidence-corpus items use evidence_id as canonical identifier', () => {
    const items = (evidenceCorpus.evidence_items ?? evidenceCorpus.items ?? []) as Record<string, unknown>[];
    if (items.length > 0) {
      expect(items[0].evidence_id).toBeDefined();
    }
  });

  it('evidence-corpus items have timestamp not date_collected', () => {
    const items = (evidenceCorpus.evidence_items ?? evidenceCorpus.items ?? []) as Record<string, unknown>[];
    if (items.length > 0) {
      expect(items[0].timestamp).toBeDefined();
    }
  });

  it('evidence-corpus items have required schema fields', () => {
    const items = (evidenceCorpus.evidence_items ?? evidenceCorpus.items ?? []) as Record<string, unknown>[];
    const required = ['evidence_id', 'type', 'source', 'source_tier', 'timestamp', 'freshness', 'grade', 'confidence', 'provenance', 'is_customer_commercial'];
    for (const item of items) {
      for (const field of required) {
        expect(item[field]).toBeDefined();
      }
    }
  });

  it('experiments items use experiment_id not id', () => {
    const exps = (experiments.experiments ?? []) as Record<string, unknown>[];
    if (exps.length > 0) {
      expect(exps[0].experiment_id).toBeDefined();
    }
  });

  it('experiments items have required schema fields', () => {
    const exps = (experiments.experiments ?? []) as Record<string, unknown>[];
    const required = ['experiment_id', 'hypothesis_id', 'claim_being_tested', 'owner', 'fidelity', 'method', 'sample_size', 'success_threshold', 'failure_threshold', 'decision_rule', 'risk_check', 'instrumentation', 'status'];
    for (const exp of exps) {
      for (const field of required) {
        expect(exp[field]).toBeDefined();
      }
    }
  });

  it('experiments sample_size is a number or string (v7 allows legacy string)', () => {
    const exps = (experiments.experiments ?? []) as Record<string, unknown>[];
    for (const exp of exps) {
      if (exp.sample_size !== undefined) {
        expect(['number', 'string']).toContain(typeof exp.sample_size);
      }
    }
  });
});

describe('positioning audit count consistency', () => {
  const state = readJson('state.json') as Record<string, unknown>;
  const experiments = readJson('experiments.json') as Record<string, unknown>;
  const hypotheses = readJson('hypotheses.json') as Record<string, unknown>;

  it('state.experiments_designed matches experiments.json count', () => {
    const designed = state.experiments_designed as number;
    const actual = (experiments.experiments as unknown[])?.length ?? 0;
    expect(designed).toBe(actual);
  });

  it('state hypothesis count matches hypotheses.json count', () => {
    const stateHyps = state.hypotheses as unknown[];
    const jsonHyps = hypotheses.hypotheses as unknown[];
    if (Array.isArray(stateHyps) && Array.isArray(jsonHyps)) {
      expect(stateHyps.length).toBe(jsonHyps.length);
    }
  });
});

describe('positioning audit artifact drift', () => {
  const state = readJson('state.json') as Record<string, unknown>;

  it('phase-5 artifact does not claim 8 experiments when state has 10', () => {
    const phase5 = readArtifact('phase-5-validation-plan.md');
    const designed = state.experiments_designed as number;
    if (designed === 10) {
      expect(phase5).not.toMatch(/\b8 experiments\b/i);
      expect(phase5).not.toMatch(/"experiments_designed":\s*8/);
    }
  });

  it('phase-5 artifact validation score matches state', () => {
    const phase5 = readArtifact('phase-5-validation-plan.md');
    const validationScore = (state.decision_confidence as Record<string, number>)?.validation;
    if (validationScore === 0) {
      expect(phase5).not.toMatch(/"validation":\s*5/);
    }
  });

  it('phase-7 artifact does not say COMPLETE when state is VALIDATION_PENDING', () => {
    const phase7 = readArtifact('phase-7-drift-tracking.md');
    const currentPhase = state.current_phase as string;
    const marketStatus = state.market_validation_status as string;
    if (currentPhase === 'VALIDATION_PENDING' || marketStatus === 'validation_pending') {
      expect(phase7).not.toMatch(/"current_phase":\s*"COMPLETE"/);
    }
  });
});

describe('positioning audit gate semantics', () => {
  const state = readJson('state.json') as Record<string, unknown>;

  it('validation score is 0 when experiments_executed is 0', () => {
    const executed = state.experiments_executed as number;
    const validation = (state.decision_confidence as Record<string, number>)?.validation;
    if (executed === 0) {
      expect(validation).toBe(0);
    }
  });

  it('market_validation_status is validation_pending when no buyer evidence', () => {
    const evidenceTypes = state.evidence_types_present as string[];
    const buyerTypes = ['user_quote', 'behavioral_observation', 'support_ticket', 'analytics_data', 'sales_data'];
    const hasBuyerEvidence = evidenceTypes?.some((t) => buyerTypes.includes(t));
    if (!hasBuyerEvidence) {
      expect(state.market_validation_status).toBe('validation_pending');
    }
  });

  it('current_phase is VALIDATION_PENDING when experiments_executed is 0', () => {
    const executed = state.experiments_executed as number;
    if (executed === 0) {
      expect(state.current_phase).toBe('VALIDATION_PENDING');
    }
  });
});
