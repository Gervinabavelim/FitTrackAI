/**
 * Lightweight analytics service.
 * Logs events in dev mode. Swap in a real provider (Mixpanel, PostHog, etc.)
 * by replacing the implementations below — no screen-level changes needed.
 */

export function trackEvent(name, props = {}) {
  if (__DEV__) {
    console.log(`[Analytics] Event: ${name}`, props);
  }
}

export function trackScreen(name) {
  if (__DEV__) {
    console.log(`[Analytics] Screen: ${name}`);
  }
}
