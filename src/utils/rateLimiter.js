/**
 * Client-side rate limiter for FitTrack AI
 *
 * Prevents abuse of expensive operations (OpenAI API, Firestore writes)
 * by enforcing cooldown periods and max attempts within time windows.
 */

class RateLimiter {
  constructor() {
    // Track timestamps of actions by key
    this.actions = new Map();
  }

  /**
   * Check if an action is allowed and record it if so.
   *
   * @param {string} key - Unique identifier for the action (e.g., 'ai_generate', 'log_workout')
   * @param {Object} options
   * @param {number} options.maxAttempts - Max allowed attempts within the time window
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {number} options.cooldownMs - Minimum time between consecutive attempts
   * @returns {{ allowed: boolean, retryAfterMs: number, message: string }}
   */
  check(key, { maxAttempts, windowMs, cooldownMs = 0 }) {
    const now = Date.now();
    const timestamps = this.actions.get(key) || [];

    // Clean up expired timestamps
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    // Check cooldown (time since last action)
    if (cooldownMs > 0 && validTimestamps.length > 0) {
      const lastAction = validTimestamps[validTimestamps.length - 1];
      const elapsed = now - lastAction;
      if (elapsed < cooldownMs) {
        const retryAfterMs = cooldownMs - elapsed;
        const retrySeconds = Math.ceil(retryAfterMs / 1000);
        return {
          allowed: false,
          retryAfterMs,
          message: `Please wait ${retrySeconds} second${retrySeconds !== 1 ? 's' : ''} before trying again.`,
        };
      }
    }

    // Check max attempts in window
    if (validTimestamps.length >= maxAttempts) {
      const oldestInWindow = validTimestamps[0];
      const retryAfterMs = windowMs - (now - oldestInWindow);
      const retryMinutes = Math.ceil(retryAfterMs / 60000);
      return {
        allowed: false,
        retryAfterMs,
        message: `Rate limit reached. Please try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.`,
      };
    }

    // Action is allowed — record it
    validTimestamps.push(now);
    this.actions.set(key, validTimestamps);

    return { allowed: true, retryAfterMs: 0, message: '' };
  }

  /**
   * Reset a specific action's history
   */
  reset(key) {
    this.actions.delete(key);
  }

  /**
   * Clear all tracked actions
   */
  clearAll() {
    this.actions.clear();
  }
}

// Singleton instance shared across the app
const rateLimiter = new RateLimiter();

// ─── Pre-configured limit checkers ──────────────────────────────────────────

/**
 * AI plan generation: max 5 per hour, 30s cooldown between requests
 */
export function checkAIRateLimit() {
  if (__DEV__) return { allowed: true, retryAfterMs: 0, message: '' };
  return rateLimiter.check('ai_generate', {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,  // 1 hour
    cooldownMs: 30 * 1000,      // 30 seconds
  });
}

/**
 * Workout logging: max 20 per hour, 3s cooldown
 */
export function checkWorkoutLogRateLimit() {
  return rateLimiter.check('log_workout', {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,  // 1 hour
    cooldownMs: 3 * 1000,       // 3 seconds
  });
}

/**
 * Profile updates: max 10 per hour, 5s cooldown
 */
export function checkProfileUpdateRateLimit() {
  return rateLimiter.check('profile_update', {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,  // 1 hour
    cooldownMs: 5 * 1000,       // 5 seconds
  });
}

/**
 * Auth attempts (login/register): max 5 per 15 minutes, 2s cooldown
 */
export function checkAuthRateLimit() {
  return rateLimiter.check('auth_attempt', {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,  // 15 minutes
    cooldownMs: 2 * 1000,       // 2 seconds
  });
}

export default rateLimiter;
