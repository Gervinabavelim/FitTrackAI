// ─── Fitness Levels ────────────────────────────────────────────────────────────
export const FITNESS_LEVELS = [
  { label: 'Beginner', value: 'beginner', description: 'New to working out (0–6 months)' },
  { label: 'Intermediate', value: 'intermediate', description: 'Regular training (6 months – 2 years)' },
  { label: 'Advanced', value: 'advanced', description: 'Consistent training (2+ years)' },
];

// ─── Fitness Goals ─────────────────────────────────────────────────────────────
export const FITNESS_GOALS = [
  { label: 'Lose Weight', value: 'lose_weight', icon: '⚡', description: 'Burn fat and reduce body weight' },
  { label: 'Build Muscle', value: 'build_muscle', icon: '💪', description: 'Increase strength and muscle mass' },
  { label: 'Maintain Fitness', value: 'maintain_fitness', icon: '🏃', description: 'Stay active and maintain current fitness' },
  { label: 'Improve Endurance', value: 'improve_endurance', icon: '🚴', description: 'Boost cardiovascular fitness' },
  { label: 'Increase Flexibility', value: 'increase_flexibility', icon: '🧘', description: 'Improve range of motion' },
];

// ─── Exercise Categories ───────────────────────────────────────────────────────
export const EXERCISE_CATEGORIES = {
  strength: {
    label: 'Strength Training',
    color: '#6366F1',
    exercises: [
      'Bench Press',
      'Squat',
      'Deadlift',
      'Overhead Press',
      'Barbell Row',
      'Pull-up',
      'Chin-up',
      'Dumbbell Curl',
      'Tricep Dips',
      'Leg Press',
      'Leg Curl',
      'Leg Extension',
      'Shoulder Press',
      'Lateral Raise',
      'Front Raise',
      'Cable Row',
      'Lat Pulldown',
      'Incline Bench Press',
      'Decline Bench Press',
      'Romanian Deadlift',
      'Hip Thrust',
      'Lunge',
      'Bulgarian Split Squat',
      'Calf Raise',
      'Face Pull',
      'Chest Fly',
      'Pec Deck',
      'Hammer Curl',
      'Preacher Curl',
      'Skull Crusher',
    ],
  },
  cardio: {
    label: 'Cardio',
    color: '#F59E0B',
    exercises: [
      'Running',
      'Cycling',
      'Swimming',
      'Jump Rope',
      'Rowing',
      'Elliptical',
      'Stair Climber',
      'Treadmill Walk',
      'Treadmill Run',
      'HIIT',
      'Circuit Training',
      'Sprints',
      'Box Jumps',
    ],
  },
  bodyweight: {
    label: 'Bodyweight',
    color: '#10B981',
    exercises: [
      'Push-up',
      'Pull-up',
      'Dip',
      'Plank',
      'Mountain Climber',
      'Burpee',
      'Jumping Jack',
      'Squat (Bodyweight)',
      'Lunge (Bodyweight)',
      'Glute Bridge',
      'Superman',
      'Russian Twist',
      'Sit-up',
      'Crunch',
      'Leg Raise',
      'Flutter Kick',
      'Bird Dog',
      'Bear Crawl',
      'Pike Push-up',
      'Diamond Push-up',
    ],
  },
  flexibility: {
    label: 'Flexibility & Mobility',
    color: '#EC4899',
    exercises: [
      'Yoga',
      'Pilates',
      'Stretching',
      'Foam Rolling',
      'Hip Flexor Stretch',
      'Hamstring Stretch',
      'Chest Stretch',
      'Shoulder Stretch',
      'Pigeon Pose',
      'Downward Dog',
      'Cat-Cow Stretch',
      'Spinal Twist',
    ],
  },
};

// All exercises as flat array for search
export const ALL_EXERCISES = Object.values(EXERCISE_CATEGORIES).flatMap(
  (cat) => cat.exercises.map((name) => ({ name, category: cat.label, color: cat.color }))
);

// ─── Color Themes ──────────────────────────────────────────────────────────────
export const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  dark: {
    background: '#0F172A',
    card: '#1E293B',
    cardSecondary: '#1A2234',
    border: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    inputBg: '#334155',
    statusBar: 'light',
  },

  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardSecondary: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    inputBg: '#F1F5F9',
    statusBar: 'dark',
  },

  chart: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'],
};

// ─── MET Values for Calorie Calculation ────────────────────────────────────────
// (Metabolic Equivalent of Task)
export const MET_VALUES = {
  // Strength
  'Bench Press': 3.5,
  'Squat': 5.0,
  'Deadlift': 6.0,
  'Overhead Press': 3.5,
  'Pull-up': 4.0,
  'Chin-up': 4.0,
  // Cardio
  'Running': 9.8,
  'Cycling': 7.5,
  'Swimming': 6.0,
  'Jump Rope': 12.3,
  'Rowing': 7.0,
  'Elliptical': 5.0,
  'HIIT': 10.0,
  'Circuit Training': 8.0,
  'Sprints': 14.0,
  // Bodyweight
  'Push-up': 3.8,
  'Plank': 3.0,
  'Mountain Climber': 8.0,
  'Burpee': 10.0,
  'Jumping Jack': 7.7,
  // Flexibility
  'Yoga': 2.5,
  'Pilates': 3.0,
  'Stretching': 2.0,
  'Foam Rolling': 2.0,
  // Default
  default: 4.0,
};

// ─── Navigation ───────────────────────────────────────────────────────────────
export const ROUTES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  PROFILE_SETUP: 'ProfileSetup',

  // Main
  DASHBOARD: 'Dashboard',
  LOG_WORKOUT: 'LogWorkout',
  AI_SUGGESTIONS: 'AISuggestions',
  PROGRESS: 'Progress',
  PROFILE: 'Profile',
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  THEME: '@fittrack_theme',
  NOTIFICATIONS_ENABLED: '@fittrack_notifications',
  ONBOARDING_COMPLETE: '@fittrack_onboarding',
};

// ─── Days of Week ─────────────────────────────────────────────────────────────
export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
