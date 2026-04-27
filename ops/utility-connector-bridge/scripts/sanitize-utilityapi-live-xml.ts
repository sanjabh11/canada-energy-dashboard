import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const SANITIZED_HOST = 'sanitized.utilityapi.local';
const RESOURCE_SEGMENTS = new Set([
  'Batch',
  'Subscription',
  'UsagePoint',
  'MeterReading',
  'UsageSummary',
  'LocalTimeParameters',
  'ReadingType',
  'IntervalBlock',
  'IntervalReading',
  'RetailCustomer',
  'CustomerAgreement',
  'CustomerAccount',
  'ServiceLocation',
  'Meter',
  'ReadingSet',
]);

const IDENTIFIER_FIELDS = new Set([
  'subscriptionid',
  'authorizationid',
  'authorizationuid',
  'referral',
  'referralcode',
  'accountnumber',
  'customerid',
  'servicepointid',
]);

const PII_FIELDS = new Set([
  'email',
  'phone',
  'phonenumber',
  'firstname',
  'lastname',
  'middlename',
  'fullname',
  'name',
  'line1',
  'line2',
  'line3',
  'street',
  'address',
  'city',
  'state',
  'province',
  'postalcode',
  'zipcode',
  'zip',
  'country',
]);

interface SanitizeState {
  resourceMap: Map<string, string>;
  genericMap: Map<string, string>;
  piiCounters: Map<string, number>;
}

export interface UtilityApiXmlSanitizeResult {
  sanitizedXml: string;
  validationErrors: string[];
}

function getOrCreateMappedValue(
  map: Map<string, string>,
  key: string,
  prefix: string,
): string {
  const existing = map.get(key);
  if (existing) return existing;
  const nextValue = `${prefix}-${map.size + 1}`;
  map.set(key, nextValue);
  return nextValue;
}

function normalizeResourceType(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'resource';
}

function sanitizeGenericIdentifier(value: string, state: SanitizeState, prefix = 'id'): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const mapped = getOrCreateMappedValue(state.genericMap, `${prefix}:${trimmed}`, prefix);
  if (prefix === 'xml-id') {
    return `urn:uuid:${mapped}`;
  }
  return mapped;
}

function sanitizeSensitiveText(fieldName: string, value: string, state: SanitizeState): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const current = state.piiCounters.get(fieldName) ?? 0;
  const next = current + 1;
  state.piiCounters.set(fieldName, next);
  return `sanitized-${fieldName}-${next}`;
}

function rewriteResourcePath(pathname: string, state: SanitizeState): string {
  const parts = pathname.split('/');
  for (let index = 0; index < parts.length - 1; index += 1) {
    const resourceType = parts[index];
    if (!RESOURCE_SEGMENTS.has(resourceType)) continue;
    const rawId = parts[index + 1];
    if (!rawId || RESOURCE_SEGMENTS.has(rawId)) continue;
    parts[index + 1] = getOrCreateMappedValue(
      state.resourceMap,
      `${resourceType}:${rawId}`,
      normalizeResourceType(resourceType),
    );
    index += 1;
  }
  return parts.join('/');
}

function sanitizeResourceReference(value: string, state: SanitizeState): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    url.protocol = 'https:';
    url.host = SANITIZED_HOST;
    url.pathname = rewriteResourcePath(url.pathname, state);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  if (trimmed.startsWith('/')) {
    return rewriteResourcePath(trimmed, state);
  }

  return sanitizeGenericIdentifier(trimmed, state, 'resource');
}

function sanitizeNodeText(
  localName: string,
  textContent: string,
  state: SanitizeState,
): string {
  if (localName === 'id') {
    const trimmed = textContent.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
      const sanitizedReference = sanitizeResourceReference(trimmed, state);
      return sanitizedReference.startsWith('/')
        ? `https://${SANITIZED_HOST}${sanitizedReference}`
        : sanitizedReference;
    }
    return sanitizeGenericIdentifier(textContent, state, 'xml-id');
  }
  if (localName === 'mrid') {
    return sanitizeGenericIdentifier(textContent, state, 'mrid');
  }
  if (IDENTIFIER_FIELDS.has(localName)) {
    return sanitizeGenericIdentifier(textContent, state, localName);
  }
  if (PII_FIELDS.has(localName)) {
    return sanitizeSensitiveText(localName, textContent, state);
  }
  return textContent;
}

export function sanitizeUtilityApiLiveXml(xml: string): UtilityApiXmlSanitizeResult {
  const dom = new JSDOM(xml, { contentType: 'text/xml' });
  const { document, XMLSerializer } = dom.window;
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Failed to parse UtilityAPI live XML: ${parserError.textContent?.trim() || 'parsererror'}`);
  }

  const state: SanitizeState = {
    resourceMap: new Map(),
    genericMap: new Map(),
    piiCounters: new Map(),
  };

  const elements = Array.from(document.getElementsByTagName('*')) as Element[];
  for (const element of elements) {
    const localName = element.localName.toLowerCase();

    const attributes = Array.from(element.attributes) as Attr[];
    for (const attribute of attributes) {
      const attrName = attribute.name.toLowerCase();
      const attrValue = attribute.value;
      if (attrName === 'href') {
        element.setAttribute(attribute.name, sanitizeResourceReference(attrValue, state));
        continue;
      }
      if (attrName === 'id') {
        element.setAttribute(attribute.name, sanitizeGenericIdentifier(attrValue, state, 'attr-id'));
        continue;
      }
      if (IDENTIFIER_FIELDS.has(attrName)) {
        element.setAttribute(attribute.name, sanitizeGenericIdentifier(attrValue, state, attrName));
        continue;
      }
      if (PII_FIELDS.has(attrName)) {
        element.setAttribute(attribute.name, sanitizeSensitiveText(attrName, attrValue, state));
      }
    }

    if (element.children.length === 0 && element.textContent) {
      const nextText = sanitizeNodeText(localName, element.textContent, state);
      if (nextText !== element.textContent) {
        element.textContent = nextText;
      }
    }
  }

  const sanitizedXml = new XMLSerializer().serializeToString(document);
  return {
    sanitizedXml,
    validationErrors: validateSanitizedUtilityApiLiveXml(sanitizedXml),
  };
}

export function validateSanitizedUtilityApiLiveXml(xml: string): string[] {
  const errors: string[] = [];
  if (/utilityapi\.com/i.test(xml)) {
    errors.push('Sanitized XML still contains a utilityapi.com hostname.');
  }
  if (/https:\/\/sanitized\.utilityapi\.local\/[^<"]*\/(Subscription|UsagePoint|MeterReading|UsageSummary|LocalTimeParameters)\/(?:\d{6,}|[0-9a-f]{24,}|[0-9a-f]{8}-[0-9a-f-]{27,})/.test(xml)) {
    errors.push('Sanitized XML still appears to contain live-looking resource identifiers.');
  }
  return errors;
}

async function main(argv: string[]) {
  const inputPath = argv[2];
  const outputPath = argv[3];

  if (!inputPath || !outputPath) {
    throw new Error('Usage: tsx ops/utility-connector-bridge/scripts/sanitize-utilityapi-live-xml.ts <input-xml> <output-xml>');
  }

  const rawXml = await readFile(resolve(inputPath), 'utf8');
  const result = sanitizeUtilityApiLiveXml(rawXml);
  if (result.validationErrors.length > 0) {
    throw new Error(`Sanitized XML validation failed:\n- ${result.validationErrors.join('\n- ')}`);
  }

  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${result.sanitizedXml}\n`, 'utf8');
  console.log(`Sanitized UtilityAPI XML written to ${absoluteOutput}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main(process.argv).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
