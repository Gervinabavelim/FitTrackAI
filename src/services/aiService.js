import { chatCompletion, MAX_TOKENS } from '../config/openai';
import { format, differenceInDays } from 'date-fns';
import { sanitizeText, sanitizeInt, sanitizeFloat, sanitizeEnum } from '../utils/sanitize';
import { captureException } from '../config/sentry';

/**
 * Compute adaptation signals from a user's workout history.
 * Called inline so prompts stay stateless.
 */
function computeTrainingContext(allWorkouts, streak) {
  if (!Array.isArray(allWorkouts) || allWorkouts.length === 0) {
    return {
      streak: streak || 0,
      last14Active: 0,
      volumeThisWeekMin: 0,
      volumeLastWeekMin: 0,
      volumeTrend: 'no data',
      topExercises: [],
      underworkedSignal: null,
      weightTrend: null,
    };
  }

  const now = new Date();
  const activeDays = new Set();
  let thisWeekMin = 0;
  let lastWeekMin = 0;
  const exerciseCounts = new Map();
  const bodyWeightSamples = [];

  for (const w of allWorkouts) {
    const date = w.date ? new Date(w.date) : null;
    if (!date || isNaN(date)) continue;
    const daysAgo = differenceInDays(now, date);
    if (daysAgo >= 0 && daysAgo < 14) {
      activeDays.add(format(date, 'yyyy-MM-dd'));
    }
    const duration = Number(w.duration) || 0;
    if (daysAgo >= 0 && daysAgo < 7) thisWeekMin += duration;
    else if (daysAgo >= 7 && daysAgo < 14) lastWeekMin += duration;

    if (w.exerciseName) {
      const n = (exerciseCounts.get(w.exerciseName) || 0) + 1;
      exerciseCounts.set(w.exerciseName, n);
    }
    if (w.bodyWeight) {
      bodyWeightSamples.push({ date, weight: Number(w.bodyWeight) });
    }
  }

  let volumeTrend = 'stable';
  if (lastWeekMin === 0 && thisWeekMin > 0) volumeTrend = 'ramping up from rest';
  else if (thisWeekMin === 0 && lastWeekMin > 0) volumeTrend = 'dropped off this week';
  else if (lastWeekMin > 0) {
    const delta = (thisWeekMin - lastWeekMin) / lastWeekMin;
    if (delta > 0.25) volumeTrend = 'increasing (+' + Math.round(delta * 100) + '%)';
    else if (delta < -0.25) volumeTrend = 'decreasing (' + Math.round(delta * 100) + '%)';
  }

  const topExercises = [...exerciseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count}x)`);

  let weightTrend = null;
  if (bodyWeightSamples.length >= 2) {
    bodyWeightSamples.sort((a, b) => a.date - b.date);
    const first = bodyWeightSamples[0];
    const last = bodyWeightSamples[bodyWeightSamples.length - 1];
    const deltaKg = Math.round((last.weight - first.weight) * 10) / 10;
    const spanDays = Math.max(1, differenceInDays(last.date, first.date));
    weightTrend = { deltaKg, spanDays };
  }

  let underworkedSignal = null;
  if (activeDays.size < 3 && (streak || 0) === 0) {
    underworkedSignal = 'low consistency — ease them back in with shorter or simpler sessions';
  } else if (thisWeekMin > lastWeekMin * 1.6 && lastWeekMin > 0) {
    underworkedSignal = 'sharp volume spike — watch for overtraining, include a deload or lower-intensity day';
  }

  return {
    streak: streak || 0,
    last14Active: activeDays.size,
    volumeThisWeekMin: thisWeekMin,
    volumeLastWeekMin: lastWeekMin,
    volumeTrend,
    topExercises,
    underworkedSignal,
    weightTrend,
  };
}

/**
 * Generate a personalized 7-day workout plan using OpenAI gpt-4o-mini
 *
 * @param {Object} userProfile - User profile from Firestore
 * @param {Array} recentWorkouts - Last 10 workouts from Firestore
 * @returns {Promise<Object>} Parsed workout plan with days array
 */
export async function generateWorkoutPlan(userProfile, recentWorkouts = [], extras = {}) {
  const { allWorkouts = recentWorkouts, streak = 0 } = extras;
  const ctx = computeTrainingContext(allWorkouts, streak);
  // Sanitize user data before embedding in prompts
  const name = sanitizeText(userProfile.name, { maxLength: 100 }) || 'User';
  const age = sanitizeInt(userProfile.age, { min: 13, max: 120 });
  const heightCm = sanitizeFloat(userProfile.heightCm, { min: 50, max: 300 });
  const weightKg = sanitizeFloat(userProfile.weightKg, { min: 10, max: 500 });
  const fitnessLevel = sanitizeEnum(
    userProfile.fitnessLevel,
    ['beginner', 'intermediate', 'advanced', 'athlete'],
    'beginner'
  );
  const fitnessGoal = sanitizeEnum(
    userProfile.fitnessGoal,
    ['lose_weight', 'build_muscle', 'maintain_fitness', 'improve_endurance', 'increase_flexibility'],
    'maintain_fitness'
  );
  const targetWeightKg = sanitizeFloat(userProfile.targetWeightKg, { min: 10, max: 500 });
  const workoutDaysPerWeek = sanitizeInt(userProfile.workoutDaysPerWeek, { min: 1, max: 7 }) || 3;
  const workoutLocation = sanitizeEnum(
    userProfile.workoutLocation,
    ['home', 'gym', 'both', 'outdoor'],
    'gym'
  );
  const sessionDurationMin = sanitizeInt(userProfile.sessionDurationMin, { min: 10, max: 240 }) || 45;

  const equipmentByLocation = {
    home: 'Limited: bodyweight, dumbbells, resistance bands. Avoid barbells and heavy machines.',
    gym: 'Full gym equipment: barbells, dumbbells, machines, cables, racks.',
    both: 'Mixed: some sessions home (bodyweight/dumbbells), some gym (full equipment).',
    outdoor: 'Outdoor only: bodyweight, running, calisthenics, park equipment. No gym machines.',
  };

  let weightDelta = '';
  if (targetWeightKg && weightKg) {
    const diff = Math.round((targetWeightKg - weightKg) * 10) / 10;
    if (diff !== 0) {
      weightDelta = ` (target: ${targetWeightKg} kg, ${diff > 0 ? '+' : ''}${diff} kg from current)`;
    }
  }

  // Format recent workouts for the prompt
  const recentWorkoutsSummary =
    recentWorkouts.length > 0
      ? recentWorkouts
          .slice(0, 10)
          .map((w, i) => {
            const dateStr = w.date ? format(new Date(w.date), 'MMM d') : 'Unknown date';
            const sets = w.sets ? `${w.sets} sets` : '';
            const reps = w.reps ? `× ${w.reps} reps` : '';
            const weight = w.weight ? `@ ${w.weight}kg` : '';
            const duration = w.duration ? `${w.duration} min` : '';
            const calories = w.calories ? `${w.calories} cal` : '';
            const exerciseName = sanitizeText(w.exerciseName || 'Workout', { maxLength: 100 });
            return `${i + 1}. ${dateStr}: ${exerciseName} ${sets} ${reps} ${weight} ${duration} ${calories}`.trim();
          })
          .join('\n')
      : 'No recent workouts recorded yet.';

  // Calculate BMI for context
  const bmi =
    heightCm && weightKg
      ? Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
      : null;

  const systemPrompt = `You are FitTrack AI, an expert personal trainer and nutritionist with 15+ years of experience creating personalized workout programs. You specialize in creating safe, progressive, and effective workout plans tailored to individual needs, fitness levels, and goals.

Your workout plans are:
- Scientifically backed and follow progressive overload principles
- Tailored to the user's current fitness level
- Structured to achieve the user's specific goal
- Realistic and achievable for the user's schedule
- Include proper warm-up and cool-down guidance

ALWAYS respond with ONLY valid JSON in the exact format specified. Do not include any text before or after the JSON.`;

  const userPrompt = `Create a personalized 7-day workout plan for this user:

USER PROFILE:
- Name: ${name || 'User'}
- Age: ${age || 'Unknown'} years
- Height: ${heightCm || 'Unknown'} cm
- Weight: ${weightKg || 'Unknown'} kg${weightDelta}
${bmi ? `- BMI: ${bmi}` : ''}
- Fitness Level: ${fitnessLevel || 'Beginner'}
- Primary Goal: ${fitnessGoal?.replace(/_/g, ' ') || 'Maintain Fitness'}

TRAINING PREFERENCES:
- Training Location: ${workoutLocation} — ${equipmentByLocation[workoutLocation]}
- Target Frequency: ${workoutDaysPerWeek} workout day(s) per week
- Session Length: ~${sessionDurationMin} minutes per session

CURRENT TRAINING CONTEXT:
- Current streak: ${ctx.streak} day(s)
- Active days in last 14: ${ctx.last14Active} / 14
- Volume this week: ${ctx.volumeThisWeekMin} min (last week: ${ctx.volumeLastWeekMin} min — ${ctx.volumeTrend})
${ctx.topExercises.length ? `- Most-trained lately: ${ctx.topExercises.join(', ')}` : ''}
${ctx.weightTrend ? `- Body weight change over ${ctx.weightTrend.spanDays} day(s): ${ctx.weightTrend.deltaKg > 0 ? '+' : ''}${ctx.weightTrend.deltaKg} kg` : ''}
${ctx.underworkedSignal ? `- ⚠ Coaching flag: ${ctx.underworkedSignal}` : ''}

RECENT WORKOUT HISTORY (last 10 workouts):
${recentWorkoutsSummary}

INSTRUCTIONS:
Create an optimal 7-day plan tailored to this user.
- Use the TRAINING CONTEXT above to adapt intensity: if volume is decreasing or last_14_active < 4, scale back and rebuild consistency; if volume is sharply increasing, include a lighter day to manage fatigue
- Vary the stimulus — if the user has been repeating the same top exercises, introduce complementary movements that target underworked patterns (e.g. if bench-heavy, add rows; if squat-heavy, add posterior-chain work)
- If a weight trend is shown, acknowledge progress toward their target in the planDescription or progressionNote
- Respect the equipment available at their training location — do NOT prescribe gym-only exercises for home/outdoor users
- Schedule exactly ${workoutDaysPerWeek} training day(s); the rest should be rest or active recovery days
- Keep each session's total duration close to ${sessionDurationMin} minutes (warmup + exercises + cooldown)
- Account for their fitness level when prescribing sets, reps, and weights
- Build on exercises they've been doing while adding progressive overload
- If goal is lose_weight: include more cardio and HIIT${targetWeightKg ? `; their target weight is ${targetWeightKg} kg` : ''}
- If goal is build_muscle: focus on compound lifts with progressive overload${targetWeightKg ? `; their target weight is ${targetWeightKg} kg` : ''}
- If goal is improve_endurance: cardio-heavy with varied intensities
- If goal is increase_flexibility: include yoga/mobility-focused sessions
- Ensure each workout has a clear focus (e.g., Upper Body, Lower Body, Core, Cardio, Mobility)

Respond with this EXACT JSON structure:
{
  "planTitle": "7-Day ${fitnessGoal?.replace(/_/g, ' ') || 'Fitness'} Plan",
  "planDescription": "Brief 1-2 sentence description of the plan's strategy",
  "weeklyGoal": "Specific, measurable goal for this week",
  "estimatedCaloriesPerWeek": 2500,
  "days": [
    {
      "day": 1,
      "dayName": "Monday",
      "focus": "Upper Body Strength",
      "type": "Strength",
      "duration": 45,
      "difficulty": "Moderate",
      "warmup": "5 min light cardio + dynamic stretches",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest": "90 seconds",
          "notes": "Focus on controlled eccentric phase",
          "targetMuscles": ["Chest", "Triceps", "Front Deltoids"]
        }
      ],
      "cooldown": "5 min static stretching",
      "tips": "Pro tip for this workout session",
      "estimatedCalories": 350
    }
  ],
  "nutritionTips": [
    "Eat 1.6-2.2g protein per kg of body weight daily",
    "Stay hydrated: aim for 3L of water on training days"
  ],
  "recoveryAdvice": "Sleep 7-9 hours. Consider foam rolling on rest days.",
  "progressionNote": "After 2 weeks, increase weights by 5% or add 1 rep per set"
}`;

  try {
    const content = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: MAX_TOKENS,
    });

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from the response (handle potential markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Validate plan structure
    if (!plan.days || !Array.isArray(plan.days)) {
      throw new Error('Invalid plan structure: missing days array');
    }

    return {
      ...plan,
      generatedAt: new Date().toISOString(),
      userId: userProfile.uid,
      userGoal: fitnessGoal,
      userLevel: fitnessLevel,
      userLocation: workoutLocation,
      userFrequency: workoutDaysPerWeek,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('AI service rate limit reached. Please wait a moment and try again.');
    }
    if (error.code === 'functions/unauthenticated') {
      throw new Error('You must be signed in to use AI features.');
    }
    captureException(error);
    // Sentry captures this
    throw new Error(error.message || 'Failed to generate workout plan. Please try again.');
  }
}

/**
 * Generate a quick motivational tip based on user data
 * @param {Object} userProfile
 * @param {number} streak
 * @returns {Promise<string>}
 */
export async function generateMotivationalTip(userProfile, streak = 0) {
  const prompt = `Give a single motivational tip (max 2 sentences) for a ${userProfile.fitnessLevel || 'beginner'} fitness enthusiast
  with a goal of ${userProfile.fitnessGoal?.replace(/_/g, ' ') || 'general fitness'}
  who has a current workout streak of ${streak} days. Be specific, actionable, and encouraging.`;

  try {
    const content = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a motivating fitness coach. Respond with only the tip text, no quotation marks.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 150,
    });

    return content?.trim() || 'Keep pushing — every rep counts!';
  } catch (error) {
    captureException(error);
    // Sentry captures this
    return 'Consistency is the key to transformation. Keep showing up!';
  }
}
