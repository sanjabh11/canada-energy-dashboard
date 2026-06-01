import { describe, expect, it } from 'vitest';
import {
  AICEI_CONSTRUCTED_SCENARIO,
  CREDIT_BANKING_CONSTRUCTED_SCENARIO,
  FUNDER_REPORTING_CONSTRUCTED_SCENARIO,
  SHADOW_BILLING_CONSTRUCTED_SCENARIO,
  UTILITY_CONSTRUCTED_SCENARIOS,
} from '../../src/lib/commercialScenarioBundles';
import { parseAiceiProjects } from '../../src/lib/aiceiReportingSupport';
import { parseComplianceLiabilityCsv, parseCreditHoldingsCsv } from '../../src/lib/creditBankingSupport';
import { parseImportedProjects } from '../../src/lib/funderReportingSupport';
import { parseShadowBillingCsv } from '../../src/lib/shadowBillingSupport';
import { parseUtilityHistoricalLoadCsv } from '../../src/lib/utilityForecasting';

describe('commercial scenario bundles', () => {
  it('keeps utility planning scenarios inside the current CSV import contract', () => {
    UTILITY_CONSTRUCTED_SCENARIOS.forEach((scenario) => {
      const parsed = parseUtilityHistoricalLoadCsv(scenario.downloads[0].content);
      expect(parsed.rows.length).toBeGreaterThan(24);
      expect(parsed.rows[0]?.source_system).toBe('constructed_commercial_scenario');
    });
  });

  it('keeps the shadow billing scenario parseable as a 12-month invoice file', () => {
    const parsed = parseShadowBillingCsv(SHADOW_BILLING_CONSTRUCTED_SCENARIO.downloads[0].content);
    expect(parsed).toHaveLength(12);
    expect(parsed[0]?.retailerName).toContain('Constructed');
  });

  it('keeps the credit banking scenario parseable as holdings and liabilities uploads', () => {
    const holdings = parseCreditHoldingsCsv(CREDIT_BANKING_CONSTRUCTED_SCENARIO.downloads[0].content);
    const liabilities = parseComplianceLiabilityCsv(CREDIT_BANKING_CONSTRUCTED_SCENARIO.downloads[1].content);

    expect(holdings.length).toBeGreaterThan(1);
    expect(liabilities.length).toBe(3);
  });

  it('keeps the AICEI scenario usable in both JSON and CSV upload modes', () => {
    const jsonRows = parseAiceiProjects(
      AICEI_CONSTRUCTED_SCENARIO.downloads[0].filename,
      AICEI_CONSTRUCTED_SCENARIO.downloads[0].content,
    );
    const csvRows = parseAiceiProjects(
      AICEI_CONSTRUCTED_SCENARIO.downloads[1].filename,
      AICEI_CONSTRUCTED_SCENARIO.downloads[1].content,
    );

    expect(jsonRows.length).toBe(3);
    expect(csvRows.length).toBe(3);
    expect(jsonRows.some((row) => row.communityApprovalStatus === 'pending')).toBe(true);
  });

  it('keeps the Wah-ila-toos scenario usable as an uploaded project file', () => {
    const projects = parseImportedProjects(
      FUNDER_REPORTING_CONSTRUCTED_SCENARIO.downloads[0].filename,
      FUNDER_REPORTING_CONSTRUCTED_SCENARIO.downloads[0].content,
    );

    expect(projects.length).toBe(2);
    expect(projects[0]?.fpic_status).toBe('owner_supplied');
  });
});
