declare module '@sentry/react' {
  export function captureException(error: Error, contexts?: Record<string, unknown>): void;
  export function init(config: Record<string, unknown>): void;
}
