/**
 * Lightweight analytics service.
 * Logs events in dev mode. Swap in a real provider (Mixpanel, PostHog, etc.)
 * by replacing the implementations below — no screen-level changes needed.
 */

export function trackEvent(name, props = {}) {
  if (__DEV__) {
    console.log('[Analytics] Event:', name, props);
  }
  // TODO: Replace with real analytics provider
  // e.g., mixpanel.track(name, props);
}

export function trackScreen(name) {
  if (__DEV__) {
    console.log('[Analytics] Screen:', name);
  }
  // TODO: Replace with real analytics provider
  // e.g., mixpanel.screen(name);
}
