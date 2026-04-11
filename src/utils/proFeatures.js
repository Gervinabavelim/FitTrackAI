/**
 * Pro feature gating configuration.
 *
 * FREE_LIMITS defines the restrictions for free-tier users.
 * PRO_FEATURES lists which features are locked behind the Pro paywall.
 */

// Daily workout log limit for free users
export const FREE_DAILY_WORKOUT_LIMIT = 3;

// Features that require Pro
export const PRO_FEATURES = {
  AI_COACH: 'ai_coach',
  FULL_ANALYTICS: 'full_analytics',
  DATA_EXPORT: 'data_export',
  UNLIMITED_WORKOUTS: 'unlimited_workouts',
};

// Human-readable labels for the paywall
export const PRO_FEATURE_DETAILS = [
  {
    id: PRO_FEATURES.AI_COACH,
    icon: 'sparkles',
    title: 'AI Coach',
    description: 'Get personalized 7-day workout plans powered by AI',
  },
  {
    id: PRO_FEATURES.UNLIMITED_WORKOUTS,
    icon: 'infinite-outline',
    title: 'Unlimited Workouts',
    description: 'Log unlimited workouts per day (free: 3/day)',
  },
  {
    id: PRO_FEATURES.FULL_ANALYTICS,
    icon: 'stats-chart',
    title: 'Full Analytics',
    description: '30-day trends, volume charts, weight tracking & personal bests',
  },
  {
    id: PRO_FEATURES.DATA_EXPORT,
    icon: 'download-outline',
    title: 'Data Export',
    description: 'Export your complete workout history as CSV',
  },
];

/**
 * Check how many workouts a free user has logged today
 * @param {Array} workouts - All workouts array
 * @returns {number} Count of workouts logged today
 */
export function getTodayWorkoutCount(workouts) {
  const today = new Date().toISOString().split('T')[0];
  return workouts.filter((w) => {
    try {
      return w.date && w.date.startsWith(today);
    } catch {
      return false;
    }
  }).length;
}

/**
 * Check if a free user can still log workouts today
 * @param {Array} workouts - All workouts array
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function canLogWorkout(workouts) {
  const count = getTodayWorkoutCount(workouts);
  return {
    allowed: count < FREE_DAILY_WORKOUT_LIMIT,
    remaining: Math.max(0, FREE_DAILY_WORKOUT_LIMIT - count),
  };
}
