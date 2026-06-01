import { describe, expect, it } from 'vitest';
import {
  isCoreSalesDemoPath,
  normalizeRuntimePathname,
  shouldBootstrapWhopSession,
  shouldInitializePaddleForPath,
} from '../../src/lib/runtimeRouteMode';

describe('runtimeRouteMode', () => {
  it('normalizes empty, trailing-slash, and query-string paths', () => {
    expect(normalizeRuntimePathname(undefined)).toBe('/');
    expect(normalizeRuntimePathname('/utilityapi-demo/')).toBe('/utilityapi-demo');
    expect(normalizeRuntimePathname('/utility-demand-forecast?demo=true#top')).toBe('/utility-demand-forecast');
  });

  it('marks the proof-led MVP routes as core sales demo paths', () => {
    expect(isCoreSalesDemoPath('/')).toBe(true);
    expect(isCoreSalesDemoPath('/utilityapi-demo')).toBe(true);
    expect(isCoreSalesDemoPath('/utility-demand-forecast')).toBe(true);
    expect(isCoreSalesDemoPath('/regulatory-filing')).toBe(true);
    expect(isCoreSalesDemoPath('/utility-security')).toBe(true);
    expect(isCoreSalesDemoPath('/forecast-benchmarking')).toBe(true);
    expect(isCoreSalesDemoPath('/credit-banking')).toBe(true);
    expect(isCoreSalesDemoPath('/pilot-readiness')).toBe(true);
  });

  it('suppresses Whop and Paddle bootstrap on core sales demo paths only', () => {
    expect(shouldBootstrapWhopSession('/utilityapi-demo')).toBe(false);
    expect(shouldInitializePaddleForPath('/utilityapi-demo')).toBe(false);
    expect(shouldBootstrapWhopSession('/credit-banking')).toBe(false);
    expect(shouldInitializePaddleForPath('/credit-banking')).toBe(false);
    expect(shouldBootstrapWhopSession('/pilot-readiness')).toBe(false);
    expect(shouldInitializePaddleForPath('/pilot-readiness')).toBe(false);
    expect(shouldBootstrapWhopSession('/pricing')).toBe(true);
    expect(shouldInitializePaddleForPath('/pricing')).toBe(true);
    expect(shouldBootstrapWhopSession('/whop/watchdog')).toBe(true);
    expect(shouldInitializePaddleForPath('/whop/watchdog')).toBe(true);
  });
});
