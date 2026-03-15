import { MET_VALUES } from './constants';
import { subDays, isSameDay, parseISO, startOfDay } from 'date-fns';

// ─── BMI Calculator ────────────────────────────────────────────────────────────
/**
 * Calculate Body Mass Index
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {{ bmi: number, category: string, color: string }}
 */
export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm === 0) {
    return { bmi: 0, category: 'Unknown', color: '#94A3B8' };
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBMI = Math.round(bmi * 10) / 10;

  let category, color;
  if (bmi < 18.5) {
    category = 'Underweight';
    color = '#3B82F6';
  } else if (bmi < 25) {
    category = 'Normal Weight';
    color = '#10B981';
  } else if (bmi < 30) {
    category = 'Overweight';
    color = '#F59E0B';
  } else {
    category = 'Obese';
    color = '#EF4444';
  }

  return { bmi: roundedBMI, category, color };
}

// ─── Calorie Estimator ─────────────────────────────────────────────────────────
/**
 * Estimate calories burned during exercise
 * Uses the MET formula: Calories = MET × weight(kg) × time(hours)
 * @param {string} exerciseName - Name of the exercise
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} weightKg - User weight in kilograms
 * @returns {number} Estimated calories burned
 */
export function estimateCalories(exerciseName, durationMinutes, weightKg = 70) {
  if (!durationMinutes || durationMinutes <= 0) return 0;

  const met = MET_VALUES[exerciseName] || MET_VALUES.default;
  const durationHours = durationMinutes / 60;
  const calories = met * weightKg * durationHours;

  return Math.round(calories);
}

// ─── Streak Calculator ─────────────────────────────────────────────────────────
/**
 * Calculate the current workout streak (consecutive days)
 * @param {Array} workouts - Array of workout objects with a `date` field (ISO string)
 * @returns {number} Current streak in days
 */
export function calculateStreak(workouts) {
  if (!workouts || workouts.length === 0) return 0;

  // Get unique workout dates sorted descending
  const uniqueDates = [
    ...new Set(
      workouts
        .map((w) => {
          try {
            return startOfDay(typeof w.date === 'string' ? parseISO(w.date) : new Date(w.date))
              .toISOString()
              .split('T')[0];
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    ),
  ].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length === 0) return 0;

  const today = startOfDay(new Date()).toISOString().split('T')[0];
  const yesterday = startOfDay(subDays(new Date(), 1)).toISOString().split('T')[0];

  // Streak only counts if worked out today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const current = new Date(uniqueDates[i - 1]);
    const previous = new Date(uniqueDates[i]);
    const diffDays = (current - previous) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ─── Weekly Volume ─────────────────────────────────────────────────────────────
/**
 * Calculate total workout volume for the past N weeks grouped by week
 * @param {Array} workouts - Array of workout objects
 * @param {number} weeks - Number of weeks to look back (default 4)
 * @returns {Array} Array of { week: string, count: number, calories: number }
 */
export function calculateWeeklyVolume(workouts, weeks = 4) {
  const result = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subDays(new Date(), (i + 1) * 7);
    const weekEnd = subDays(new Date(), i * 7);
    const weekLabel = `W${weeks - i}`;

    const weekWorkouts = workouts.filter((w) => {
      try {
        const date = typeof w.date === 'string' ? parseISO(w.date) : new Date(w.date);
        return date >= weekStart && date < weekEnd;
      } catch {
        return false;
      }
    });

    result.push({
      week: weekLabel,
      count: weekWorkouts.length,
      calories: weekWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0),
    });
  }

  return result;
}

// ─── Daily Calorie Data ────────────────────────────────────────────────────────
/**
 * Get daily calorie data for the last N days
 * @param {Array} workouts - Array of workout objects
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Array} Array of numbers representing calories per day
 */
export function getDailyCalories(workouts, days = 30) {
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = subDays(new Date(), i);
    const dayWorkouts = workouts.filter((w) => {
      try {
        const date = typeof w.date === 'string' ? parseISO(w.date) : new Date(w.date);
        return isSameDay(date, targetDate);
      } catch {
        return false;
      }
    });

    result.push(dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0));
  }

  return result;
}

// ─── Weight Trend ─────────────────────────────────────────────────────────────
/**
 * Get weight entries over the last N days
 * @param {Array} workouts - Array of workout objects (with optional `weight` field)
 * @param {number} days - Number of days (default 30)
 * @returns {Array} Array of weight values
 */
export function getWeightTrend(workouts, days = 30) {
  const result = [];
  let lastKnownWeight = null;

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = subDays(new Date(), i);
    const dayWorkout = workouts.find((w) => {
      try {
        const date = typeof w.date === 'string' ? parseISO(w.date) : new Date(w.date);
        return isSameDay(date, targetDate) && w.bodyWeight;
      } catch {
        return false;
      }
    });

    if (dayWorkout?.bodyWeight) {
      lastKnownWeight = dayWorkout.bodyWeight;
    }

    result.push(lastKnownWeight || 0);
  }

  return result;
}

// ─── Format Duration ──────────────────────────────────────────────────────────
/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted string like "1h 30m"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ─── Average ──────────────────────────────────────────────────────────────────
/**
 * Calculate average of an array of numbers
 */
export function average(arr) {
  if (!arr || arr.length === 0) return 0;
  const nonZero = arr.filter((n) => n > 0);
  if (nonZero.length === 0) return 0;
  return Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);
}

// ─── Ideal Weight ─────────────────────────────────────────────────────────────
/**
 * Estimate ideal weight range using BMI 18.5–24.9
 * @param {number} heightCm - Height in centimeters
 * @returns {{ min: number, max: number }}
 */
export function idealWeightRange(heightCm) {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(24.9 * heightM * heightM),
  };
}

// ─── Personal Bests ──────────────────────────────────────────────────────────
/**
 * Calculate personal bests from workout history
 * @param {Array} workouts - Array of workout objects
 * @returns {{ heaviestLifts: Array, longestDuration: Object|null, highestCalories: Object|null }}
 */
export function calculatePersonalBests(workouts) {
  if (!workouts || workouts.length === 0) {
    return { heaviestLifts: [], longestDuration: null, highestCalories: null };
  }

  // Heaviest lift per exercise (top 3)
  const liftMap = {};
  workouts.forEach((w) => {
    if (w.weight && w.exerciseName) {
      if (!liftMap[w.exerciseName] || w.weight > liftMap[w.exerciseName].weight) {
        liftMap[w.exerciseName] = { exerciseName: w.exerciseName, weight: w.weight, sets: w.sets, reps: w.reps };
      }
    }
  });
  const heaviestLifts = Object.values(liftMap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  // Longest duration
  const longestDuration = workouts.reduce((best, w) => {
    if (w.duration && (!best || w.duration > best.duration)) {
      return { exerciseName: w.exerciseName, duration: w.duration };
    }
    return best;
  }, null);

  // Highest calorie burn
  const highestCalories = workouts.reduce((best, w) => {
    if (w.calories && (!best || w.calories > best.calories)) {
      return { exerciseName: w.exerciseName, calories: w.calories };
    }
    return best;
  }, null);

  return { heaviestLifts, longestDuration, highestCalories };
}
