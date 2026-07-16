import * as Sentry from '@sentry/react';

interface SentryRequest {
  url?: string;
  headers?: Record<string, string>;
}

interface SentryErrorEvent {
  request?: SentryRequest;
  extra?: Record<string, unknown>;
}

interface SentryBreadcrumb {
  category?: string;
  message?: string;
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE;
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE;

const PII_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: '[email]' },
  { regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[phone]' },
];

const IGNORED_ERRORS: string[] = [
  'Non-Error promise rejection captured',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Loading chunk',
];

function scrubPII(str: string): string {
  let result = str;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.05 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    ignoreErrors: IGNORED_ERRORS,
    beforeSend(event: SentryErrorEvent) {
      if (event.request?.url) {
        event.request.url = scrubPII(event.request.url);
      }
      if (event.request?.headers) {
        for (const [key, value] of Object.entries(event.request.headers)) {
          if (typeof value === 'string') {
            event.request.headers[key] = scrubPII(value);
          }
        }
      }
      if (event.extra) {
        for (const [key, value] of Object.entries(event.extra)) {
          if (typeof value === 'string') {
            event.extra[key] = scrubPII(value);
          }
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb: SentryBreadcrumb) {
      if (breadcrumb.category === 'ui.click' || breadcrumb.category === 'ui.input') {
        if (typeof breadcrumb.message === 'string') {
          breadcrumb.message = scrubPII(breadcrumb.message);
        }
      }
      return breadcrumb;
    },
  });

  return true;
}
