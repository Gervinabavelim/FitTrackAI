import * as Sentry from '@sentry/react-native';

// Initialize Sentry — call this once in App.js
// Replace the DSN with your project's DSN from https://sentry.io
export function initSentry() {
  Sentry.init({
    dsn: 'https://5fa4e5b93d21069fff1db5659231d15c@o4511054551973888.ingest.us.sentry.io/4511054567571456',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    enabled: !__DEV__, // Only report in production
  });
}

// Wrap your root component with this
export const withSentry = Sentry.wrap;

// Use this to manually capture exceptions
export function captureException(error) {
  Sentry.captureException(error);
}
