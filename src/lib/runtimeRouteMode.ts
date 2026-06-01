const CORE_SALES_DEMO_PATHS = new Set([
  '/',
  '/solutions',
  '/use-cases',
  '/pilot-readiness',
  '/pilot-evidence',
  '/municipal',
  '/for-municipalities',
  '/utility-demand-forecast',
  '/utility-forecast',
  '/regulatory-filing',
  '/regulatory',
  '/rule-005',
  '/oeb-filing',
  '/utility-security',
  '/forecast-benchmarking',
  '/forecast-evaluation',
  '/forecasts',
  '/utilityapi-demo',
  '/asset-health',
  '/asset-scoring',
  '/cbrm',
  '/api-docs',
  '/ai-datacentres',
  '/roi-calculator',
  '/industrial',
  '/tier-savings',
  '/credit-banking',
  '/tier-credit-banking',
  '/shadow-billing',
  '/bill-comparison',
]);

export function normalizeRuntimePathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';

  const withoutQuery = pathname.split('?')[0]?.trim() ?? '/';
  const withoutHash = withoutQuery.split('#')[0]?.trim() ?? '/';
  const normalized = withoutHash.replace(/\/+$/, '') || '/';

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function isCoreSalesDemoPath(pathname: string | null | undefined): boolean {
  return CORE_SALES_DEMO_PATHS.has(normalizeRuntimePathname(pathname));
}

export function shouldBootstrapWhopSession(pathname: string | null | undefined): boolean {
  return !isCoreSalesDemoPath(pathname);
}

export function shouldInitializePaddleForPath(pathname: string | null | undefined): boolean {
  return !isCoreSalesDemoPath(pathname);
}
