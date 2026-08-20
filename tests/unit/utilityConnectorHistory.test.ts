import { describe, expect, it } from 'vitest';
import { normalizePersistedUtilityIntervalHistory } from '../../src/lib/utilityConnectorHistory';

describe('normalizePersistedUtilityIntervalHistory', () => {
  it('maps and sorts persisted Green Button history into canonical forecast rows', () => {
    const result = normalizePersistedUtilityIntervalHistory([
      {
        observed_at: '2026-04-26T13:00:00-04:00',
        source_kind: 'green_button_cmd',
        source_system: 'green_button_cmd',
        geography_level: 'system',
        geography_id: 'ON-UP-1',
        customer_class: 'mixed',
        demand_mw: '1.25',
        temperature_c: '14.5',
        quality_flags: ['missing_temperature', 'unknown_future_flag'],
      },
      {
        observed_at: '2026-04-26T12:00:00-04:00',
        source_kind: 'green_button_cmd',
        geography_level: 'feeder',
        geography_id: 'ON-FEEDER-1',
        customer_class: 'commercial',
        demand_mw: 0,
        customer_count: 12,
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      timestamp: '2026-04-26T16:00:00.000Z',
      geography_level: 'feeder',
      geography_id: 'ON-FEEDER-1',
      demand_mw: 0,
      source_system: 'green_button_cmd',
      customer_count: 12,
    });
    expect(result.rows[1]).toMatchObject({
      timestamp: '2026-04-26T17:00:00.000Z',
      demand_mw: 1.25,
      temperature_c: 14.5,
      quality_flags: ['missing_temperature'],
    });
  });

  it('fails closed for an empty history response', () => {
    const result = normalizePersistedUtilityIntervalHistory([]);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(['No persisted Green Button interval history was supplied.']);
  });

  it('rejects untagged, invalid, or negative rows as a whole batch', () => {
    const result = normalizePersistedUtilityIntervalHistory([
      {
        observed_at: 'not-a-date',
        source_kind: 'utility_batch_csv',
        geography_level: 'system',
        geography_id: 'ON-UP-1',
        customer_class: 'mixed',
        demand_mw: 1,
      },
      {
        observed_at: '2026-04-26T12:00:00Z',
        source_kind: 'green_button_cmd',
        geography_level: 'system',
        geography_id: 'ON-UP-2',
        customer_class: 'mixed',
        demand_mw: -1,
      },
    ]);

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('source_kind must be green_button_cmd');
    expect(result.errors[0]).toContain('observed_at must be a valid timestamp');
    expect(result.errors[1]).toContain('demand_mw must be a finite non-negative number');
  });

  it('does not invent freshness or a current timestamp when optional fields are absent', () => {
    const result = normalizePersistedUtilityIntervalHistory([
      {
        observed_at: '2026-04-26T12:00:00Z',
        source_kind: 'green_button_cmd',
        geography_level: 'system',
        geography_id: 'ON-UP-1',
        customer_class: 'mixed',
        demand_mw: 1,
      },
    ]);

    expect(result.rows[0]?.timestamp).toBe('2026-04-26T12:00:00.000Z');
    expect(result.rows[0]?.temperature_c).toBeNull();
    expect(result.rows[0]?.source_system).toBe('green_button_cmd');
  });
});
