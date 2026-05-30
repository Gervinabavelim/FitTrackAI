// ─── Fitness Levels ────────────────────────────────────────────────────────────
export const FITNESS_LEVELS = [
  { label: 'Beginner', value: 'beginner', description: 'New to working out (0–6 months)' },
  { label: 'Intermediate', value: 'intermediate', description: 'Regular training (6 months – 2 years)' },
  { label: 'Advanced', value: 'advanced', description: 'Consistent training (2+ years)' },
];

// ─── Fitness Goals ─────────────────────────────────────────────────────────────
export const FITNESS_GOALS = [
  { label: 'Lose Weight', value: 'lose_weight', icon: 'flash-outline', description: 'Burn fat and reduce body weight' },
  { label: 'Build Muscle', value: 'build_muscle', icon: 'barbell-outline', description: 'Increase strength and muscle mass' },
  { label: 'Maintain Fitness', value: 'maintain_fitness', icon: 'walk-outline', description: 'Stay active and maintain current fitness' },
  { label: 'Improve Endurance', value: 'improve_endurance', icon: 'bicycle-outline', description: 'Boost cardiovascular fitness' },
  { label: 'Increase Flexibility', value: 'increase_flexibility', icon: 'body-outline', description: 'Improve range of motion' },
];

export const FITNESS_GOAL_VALUES = FITNESS_GOALS.map((g) => g.value);
export const FITNESS_LEVEL_VALUES = FITNESS_LEVELS.map((l) => l.value);

// ─── Workout Preferences ──────────────────────────────────────────────────────
export const WORKOUT_LOCATIONS = [
  { label: 'Home', value: 'home', icon: 'home-outline', description: 'Bodyweight, dumbbells, bands' },
  { label: 'Gym', value: 'gym', icon: 'barbell-outline', description: 'Full equipment access' },
  { label: 'Both', value: 'both', icon: 'swap-horizontal-outline', description: 'Mix of home and gym' },
  { label: 'Outdoor', value: 'outdoor', icon: 'sunny-outline', description: 'Running, calisthenics, parks' },
];

export const WORKOUT_LOCATION_VALUES = WORKOUT_LOCATIONS.map((l) => l.value);

export const SESSION_DURATIONS = [15, 30, 45, 60, 90];
export const WORKOUT_FREQUENCIES = [1, 2, 3, 4, 5, 6, 7];

// ─── Exercise Categories ───────────────────────────────────────────────────────
export const EXERCISE_CATEGORIES = {
  strength: {
    label: 'Strength Training',
    color: '#3B82F6',
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
    color: '#FBBF24',
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
    color: '#22C55E',
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
    color: '#A78BFA',
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
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#EA580C',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#3B82F6',

  dark: {
    background: '#0A0A0A',
    card: '#141414',
    cardSecondary: '#1A1A1A',
    border: '#252525',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    inputBg: '#1A1A1A',
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

  chart: ['#F97316', '#3B82F6', '#FBBF24', '#EF4444', '#A78BFA', '#22C55E'],
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
  PAYWALL: 'Paywall',
  CONTACT: 'Contact',
  SOCIAL: 'Social',
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
