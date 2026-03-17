import { chatCompletion, MAX_TOKENS } from '../config/openai';
import { format } from 'date-fns';
import { sanitizeText, sanitizeInt, sanitizeFloat, sanitizeEnum } from '../utils/sanitize';
import { captureException } from '../config/sentry';

/**
 * Generate a personalized 7-day workout plan using OpenAI gpt-4o-mini
 *
 * @param {Object} userProfile - User profile from Firestore
 * @param {Array} recentWorkouts - Last 10 workouts from Firestore
 * @returns {Promise<Object>} Parsed workout plan with days array
 */
export async function generateWorkoutPlan(userProfile, recentWorkouts = []) {
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
    ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'strength'],
    'general_fitness'
  );

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
- Weight: ${weightKg || 'Unknown'} kg
${bmi ? `- BMI: ${bmi}` : ''}
- Fitness Level: ${fitnessLevel || 'Beginner'}
- Primary Goal: ${fitnessGoal?.replace(/_/g, ' ') || 'General Fitness'}

RECENT WORKOUT HISTORY (last 10 workouts):
${recentWorkoutsSummary}

INSTRUCTIONS:
Based on this user's profile and recent activity patterns, create an optimal 7-day workout plan.
- Account for their fitness level when prescribing sets, reps, and weights
- Build on exercises they've been doing while adding progressive overload
- Include 1-2 rest days strategically placed
- If goal is weight loss: include more cardio and HIIT
- If goal is muscle building: focus on compound lifts with progressive overload
- If goal is endurance: cardio-heavy with varied intensities
- Ensure each workout has a clear focus (e.g., Upper Body, Lower Body, Core, Cardio)

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
