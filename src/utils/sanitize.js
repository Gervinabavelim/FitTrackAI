/**
 * Input sanitization utilities for FitTrack AI
 *
 * All user inputs should be sanitized before being sent to
 * Firestore, OpenAI API, or any external service.
 */

// ─── Text Sanitization ──────────────────────────────────────────────────────

/**
 * Strip control characters (except newlines/tabs for multiline fields),
 * collapse excessive whitespace, and trim.
 */
export function sanitizeText(value, { multiline = false, maxLength = 200 } = {}) {
  if (typeof value !== 'string') return '';
  let cleaned = value;
  // Remove null bytes and non-printable control chars (keep \n \t for multiline)
  if (multiline) {
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  }
  // Collapse multiple spaces into one
  cleaned = cleaned.replace(/  +/g, ' ');
  // Trim
  cleaned = cleaned.trim();
  // Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Sanitize a name field — letters, spaces, hyphens, apostrophes only.
 */
export function sanitizeName(value, maxLength = 100) {
  if (typeof value !== 'string') return '';
  // Allow unicode letters, spaces, hyphens, apostrophes, periods
  let cleaned = value.replace(/[^\p{L}\p{M}\s'\-\.]/gu, '');
  cleaned = cleaned.replace(/  +/g, ' ').trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Sanitize an email address — lowercase, trim, basic format enforcement.
 */
export function sanitizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, 254);
}

// ─── Numeric Sanitization ────────────────────────────────────────────────────

/**
 * Parse and clamp an integer value within bounds.
 * Returns null if the value is not a valid number.
 */
export function sanitizeInt(value, { min = 0, max = 99999 } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const num = parseInt(String(value), 10);
  if (isNaN(num)) return null;
  return Math.max(min, Math.min(max, num));
}

/**
 * Parse and clamp a float value within bounds.
 * Returns null if the value is not a valid number.
 */
export function sanitizeFloat(value, { min = 0, max = 99999, decimals = 1 } = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const num = parseFloat(String(value));
  if (isNaN(num)) return null;
  const clamped = Math.max(min, Math.min(max, num));
  return parseFloat(clamped.toFixed(decimals));
}

// ─── Workout Data Sanitization ───────────────────────────────────────────────

/**
 * Sanitize a complete workout data object before sending to Firestore.
 */
export function sanitizeWorkoutData(data) {
  const sanitized = {};

  sanitized.exerciseName = sanitizeText(data.exerciseName, { maxLength: 100 });
  sanitized.date = typeof data.date === 'string' ? data.date : new Date().toISOString();

  if (data.sets != null && data.sets !== '') {
    sanitized.sets = sanitizeInt(data.sets, { min: 1, max: 999 });
  }
  if (data.reps != null && data.reps !== '') {
    sanitized.reps = sanitizeInt(data.reps, { min: 1, max: 9999 });
  }
  if (data.weight != null && data.weight !== '') {
    sanitized.weight = sanitizeFloat(data.weight, { min: 0, max: 9999 });
  }
  if (data.duration != null && data.duration !== '') {
    sanitized.duration = sanitizeInt(data.duration, { min: 1, max: 1440 });
  }
  if (data.calories != null && data.calories !== '') {
    sanitized.calories = sanitizeInt(data.calories, { min: 0, max: 99999 });
  }
  if (data.bodyWeight != null && data.bodyWeight !== '') {
    sanitized.bodyWeight = sanitizeFloat(data.bodyWeight, { min: 10, max: 500 });
  }
  if (data.notes) {
    sanitized.notes = sanitizeText(data.notes, { multiline: true, maxLength: 500 });
  }

  // Remove null values
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Sanitize profile data before sending to Firestore.
 */
export function sanitizeProfileData(data) {
  return {
    name: sanitizeName(data.name),
    age: sanitizeInt(data.age, { min: 13, max: 120 }),
    heightCm: sanitizeFloat(data.heightCm, { min: 50, max: 300 }),
    weightKg: sanitizeFloat(data.weightKg, { min: 10, max: 500 }),
    fitnessLevel: sanitizeEnum(data.fitnessLevel, ['beginner', 'intermediate', 'advanced', 'athlete']),
    fitnessGoal: sanitizeEnum(data.fitnessGoal, [
      'weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'strength',
    ]),
  };
}

// ─── Enum / Allowlist Sanitization ───────────────────────────────────────────

/**
 * Ensure value is one of the allowed options. Returns value if valid, or fallback.
 */
export function sanitizeEnum(value, allowedValues, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return allowedValues.includes(value) ? value : fallback;
}
