import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE;
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE;

export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });

  return true;
}
