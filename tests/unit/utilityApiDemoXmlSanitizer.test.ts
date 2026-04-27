import { describe, expect, it } from 'vitest';
import { sanitizeUtilityApiLiveXml } from '../../ops/utility-connector-bridge/scripts/sanitize-utilityapi-live-xml';
import { parseGreenButtonXml } from '../../src/lib/utilityLiveData';

const LIVE_LIKE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:espi="http://naesb.org/espi">
  <id>https://utilityapi.com/DataCustodian/espi/1_1/resource/Batch/Subscription/123456789</id>
  <entry>
    <id>https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/UsagePoint/UP-REAL-123</id>
    <link rel="self" href="https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/UsagePoint/UP-REAL-123" />
    <content>
      <espi:UsagePoint>
        <espi:mRID>UP-REAL-123</espi:mRID>
        <espi:name>Acme Headquarters</espi:name>
      </espi:UsagePoint>
    </content>
  </entry>
  <entry>
    <id>https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/LocalTimeParameters/LTP-REAL-456</id>
    <link rel="self" href="https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/LocalTimeParameters/LTP-REAL-456" />
    <content>
      <espi:LocalTimeParameters>
        <espi:tzOffset>-18000</espi:tzOffset>
      </espi:LocalTimeParameters>
    </content>
  </entry>
  <entry>
    <id>https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/MeterReading/MR-REAL-789</id>
    <link rel="self" href="https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/MeterReading/MR-REAL-789" />
    <link rel="up" href="https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/UsagePoint/UP-REAL-123" />
    <link rel="related" href="https://utilityapi.com/DataCustodian/espi/1_1/resource/Subscription/123456789/LocalTimeParameters/LTP-REAL-456" />
    <content>
      <espi:IntervalBlock>
        <espi:IntervalReading>
          <espi:timePeriod>
            <espi:duration>900</espi:duration>
            <espi:start>1767225600</espi:start>
          </espi:timePeriod>
          <espi:value>12500000</espi:value>
          <espi:ReadingQuality>estimated gap fill</espi:ReadingQuality>
        </espi:IntervalReading>
      </espi:IntervalBlock>
    </content>
  </entry>
  <entry>
    <content>
      <espi:RetailCustomer>
        <espi:email>customer@example.com</espi:email>
        <espi:phone>555-111-2222</espi:phone>
        <espi:street>123 Main Street</espi:street>
      </espi:RetailCustomer>
    </content>
  </entry>
</feed>`;

describe('utilityApiDemoXmlSanitizer', () => {
  it('rewrites live identifiers and PII while preserving XML structures needed by the parser', () => {
    const result = sanitizeUtilityApiLiveXml(LIVE_LIKE_XML);

    expect(result.validationErrors).toEqual([]);
    expect(result.sanitizedXml).not.toContain('utilityapi.com');
    expect(result.sanitizedXml).not.toContain('UP-REAL-123');
    expect(result.sanitizedXml).not.toContain('customer@example.com');
    expect(result.sanitizedXml).not.toContain('555-111-2222');
    expect(result.sanitizedXml).toContain('sanitized.utilityapi.local');
    expect(result.sanitizedXml).toContain('<espi:ReadingQuality>estimated gap fill</espi:ReadingQuality>');
    expect(result.sanitizedXml).toContain('<espi:tzOffset>-18000</espi:tzOffset>');
    expect(result.sanitizedXml).toContain('<espi:value>12500000</espi:value>');

    const parsed = parseGreenButtonXml(result.sanitizedXml, { jurisdiction: 'Ontario' });
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.quality_flags).toContain('vee_estimated');
    expect(parsed.rows[0]?.quality_flags).toContain('meter_gap_filled');
  });
});
